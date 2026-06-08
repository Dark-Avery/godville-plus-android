(function(window) {
'use strict';

/** @namespace */
var utils = {};

/**
 * @param {string} targetOrigin
 * @param {{type: string}} msg
 */
utils.postErinomeMessageTo = function(targetOrigin, msg) {
	window.postMessage({erinomeMessage: msg}, targetOrigin);
};
/** @namespace */
var xhrs = {};

xhrs.processXHR = function() {
	/**
	 * @param {string} path
	 * @param {string} method
	 * @param {?(string|Object)} data
	 * @param {string} encoding
	 * @param {?function(!XMLHttpRequest)} [onsuccess]
	 * @param {?function(!XMLHttpRequest)} [onfailure]
	 */
	var processXHR = function(path, method, data, encoding, onSuccess, onFailure) {
		var xhr = new XMLHttpRequest, f, key, value, i, len;

		xhr.open(method, path, true);
		xhr.onreadystatechange = function() {
			if (xhr.readyState < 4) {
				return;
			} else if (xhr.status >= 200 && xhr.status < 300) {
				if (onSuccess) {
					onSuccess(xhr);
				}
			} else if (onFailure) {
				onFailure(xhr);
			}
		};

		if (data == null) {
			xhr.send();
			return;
		}

		switch (encoding) {
			case 'url':
				xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
				break;

			case 'form-data':
				f = new FormData;
				for (key in data) {
					value = data[key];
					if (Array.isArray(value)) {
						for (i = 0, len = value.length; i < len; i++) {
							f.append(key, value[i]);
						}
					} else {
						f.append(key, value);
					}
				}
				data = f;
				break;

			default:
				throw new Error("unknown POST XHR encoding '" + encoding + "'");
		}

		xhr.send(data);
	};

	return processXHR;
}();

/**
 * @param {!Object} msg
 * @param {function(!Object)} callback
 */
xhrs.processWebXHR = function(msg, callback) {
	var handler = function(cid, xhr) {
		callback({
			type: 'webxhrResponse',
			cid: cid,
			scid: this.scid,
			fcid: this.fcid,
			xhr: {
				status: xhr.status,
				responseText: xhr.responseText,
				lastModified: xhr.getResponseHeader('Last-Modified')
			}
		});
	};
	xhrs.processXHR(
		msg.url,
		msg.method || 'GET',
		msg.data,
		msg.encoding,
		handler.bind(msg, msg.scid),
		handler.bind(msg, msg.fcid)
	);
};
/** @namespace */
var modules = {};

/**
 * @typedef {Object} GUIpModule
 * @property {(string|undefined)} name
 * @property {string} src
 * @property {(boolean|undefined)} initialized
 * @property {(!Array<string>|undefined)} deps
 * @property {(number|undefined)} unsatisfied
 * @property {(!Array<!GUIpModule>|undefined)} pending
 */

/** @type {!Object<string, !GUIpModule>} */
modules.MODULES = {
	// 3rd-party libraries:
	base64: {src: 'base64.min.js'},
	jsep: {src: 'jsep.min.js'},
	pako: {src: 'pako_deflate.min.js'},

	common: {src: 'common.js'},
	phrasesRu: {
		src: 'phrases_ru.js',
		deps: ['browser', 'common']
	},
	phrasesEn: {
		src: 'phrases_en.js',
		deps: ['browser', 'common']
	},
	omap: {src: 'omap.js'},
	superhero: {
		src: 'superhero.js',
		deps: ['browser', 'common', 'i18n', 'base64', 'jsep', 'pako']
	},
	optionsPage: {src: 'options_page.js'},
	options: {
		src: 'options.js',
		deps: ['browser', 'common', 'i18n', 'optionsPage', 'jsep']
	},
	forum: {
		src: 'forum.js',
		deps: ['browser', 'common', 'i18n', 'omap']
	},
	log: {
		src: 'log.js',
		deps: ['browser', 'common', 'i18n', 'omap']
	}
};

modules.init = function() {
	utils.postErinomeMessageTo(window.location.origin, {type: 'initModule', which: this.name});
	// we expect to receive a message in response
};

modules.onInit = function() {
	this.initialized = true;
	if (!this.pending) { return; }
	// notify other modules that we are ready
	for (var i = 0, len = this.pending.length; i < len; i++) {
		if (!--this.pending[i].unsatisfied) {
			modules.init.call(this.pending[i]);
		}
	}
	delete this.pending;
};

modules.onLoad = function() {
	if (!this.deps) {
		// no dependencies - no need for complex initialization logic in the module
		modules.onInit.call(this);
		return;
	}
	this.unsatisfied = this.deps.reduce(function(count, name) {
		var dep = modules.MODULES[name];
		if (dep.initialized) {
			// fine, do nothing
			return count;
		}
		// subscribe for this dependency's initialization event
		if (dep.pending) {
			dep.pending.push(this);
		} else {
			dep.pending = [this];
		}
		return count + 1;
	}.bind(this), 0);
	if (!this.unsatisfied) {
		modules.init.call(this);
	} // otherwise, wait until all the dependencies get initialized
};

/**
 * @param {!Array<string>} moduleNames
 * @param {function(string, function())} loadModule
 */
modules.load = function(moduleNames, loadModule) {
	var requested = {}, initialLength = moduleNames.length;
	for (var i = 0, len = initialLength; i < len; i++) {
		var name = moduleNames[i];
		if (name in requested) { continue; }
		requested[name] = true;

		var mod = modules.MODULES[name];
		mod.name = name;
		loadModule(mod.src, modules.onLoad.bind(mod));
		if (mod.deps) {
			for (var j = 0, jlen = mod.deps.length; j < jlen; j++) {
				if (!(mod.deps[j] in requested)) {
					moduleNames[len++] = mod.deps[j];
				}
			}
		}
	}
	moduleNames.length = initialLength;
};
/** @namespace */
var initializer = {};

initializer.ROOT_MODULES = [['superhero'], ['options'], ['forum'], ['log']];

initializer.STYLE_SHEETS = [
	['common.css', 'superhero.css'],
	['common.css', 'options.css'],
	['common.css', 'forum.css'],
	['common.css', 'superhero.css']
];

/**
 * @param {string} pathname
 * @returns {number}
 */
initializer.detectPageType = function(pathname) {
	if (/^\/+superhero/.test(pathname)) {
		return 0;
	} else if (/^\/+user\/+(?:profile|rk_success)/.test(pathname)) {
		return 1;
	} else if (/^\/+(?:forums\/+(?:show(?:_topic)?\/+\d+|subs|last_posts|last_subs|posts_by_god)|forums$|news$|gods\/+(?!api\/)|hero\/+last_fight)/.test(pathname)) {
		return 2;
	} else if (/^(?:\/+reporter)?\/+duels\/+log\//.test(pathname)) {
		return 3;
	}
	return -1;
};

/**
 * @param {function(string, function())} moduleLoader
 * @param {function(string)} styleSheetLoader
 * @param {function(string, string)} fontLoader
 */
initializer.init = function(moduleLoader, styleSheetLoader, fontLoader) {
	var host = window.location.hostname;
	if (host === 'godville.net' || host === 'b.godville.net' || host === 'gdvl.tk' || host === 'gv.erinome.net') {
		modules.MODULES.i18n = modules.MODULES.phrasesRu;
	} else if (host === 'godvillegame.com' || host === 'gvg.erinome.net') {
		modules.MODULES.i18n = modules.MODULES.phrasesEn;
	} else {
		return;
	}
	var page = initializer.detectPageType(window.location.pathname);
	if (page === -1) return;
	fontLoader('eGUIp', 'eGUIp.otf');
	initializer.STYLE_SHEETS[page].forEach(styleSheetLoader);
	modules.load(initializer.ROOT_MODULES[page], moduleLoader);
};

/**
 * @param {function(!Object, string)} listener
 */
initializer.registerErinomeListener = function(listener) {
	window.addEventListener('message', function onMessage(ev) {
		if (ev.source !== window || ev.origin !== window.location.origin) {
			return;
		}
		var msg = ev.data;
		if (msg && (msg = msg.erinomeMessage)) {
			try {
				listener(msg, ev.origin);
			} catch (e) {
				console.error('[eGUI+] error:', e);
			}
		}
	});
};

/**
 * @param {!Object<string, function(!Object, function(!Object))>} callbacks
 * @returns {function(!Object, string)}
 */
initializer.createErinomeListener = function(callbacks) {
	return function(msg, origin) {
		var type = msg.type, callback;
		if (type === 'moduleInitialized') {
			modules.onInit.call(modules.MODULES[msg.which]);
		} else if ((callback = callbacks[type])) {
			callback(msg, utils.postErinomeMessageTo.bind(null, origin));
		}
	};
};
/** @namespace */
var dom = {};

/**
 * @param {string} type
 * @param {string} id
 * @returns {!Element}
 */
dom.createElement = function(type, id) {
	var elem = document.createElement(type);
	elem.id = 'godville-ui-plus-' + id;
	elem.charset = 'UTF-8';
	return elem;
};

/**
 * @param {string} id
 * @param {string} src
 * @returns {!HTMLScriptElement}
 */
dom.createScript = function(id, src) {
	var script = dom.createElement('script', id);
	script.type = 'text/javascript';
	script.src = src;
	return script;
};

/**
 * @param {string} id
 * @param {string} href
 * @returns {!HTMLLinkElement}
 */
dom.createCSSLink = function(id, href) {
	var link = dom.createElement('link', id);
	link.rel = 'stylesheet';
	link.type = 'text/css';
	link.href = href;
	return link;
};

/**
 * @param {string} id
 * @param {string} fontFamily
 * @param {string} src
 * @returns {!HTMLStyleElement}
 */
dom.createFontFaceStyle = function(id, fontFamily, src) {
	var style = dom.createElement('style', id);
	style.type = 'text/css';
	// `font-display` is used to silence Chrome's warning: https://www.chromestatus.com/feature/5636954674692096
	// this warning makes no sense since our font is effectively local.
	style.textContent =
		'@font-face { font-family: "' + fontFamily + '"; src: url("' + src + '"); font-display: swap; }';
	return style;
};

/**
 * @param {string} prefix
 * @returns {function(string, function())}
 */
dom.createModuleLoader = function(prefix) {
	var callbacks = Object.create(null);
	window.__godvillePlusModuleLoaded = function(src, success) {
		var callback = callbacks[src];
		delete callbacks[src];
		if (!success) {
			console.error('[eGUI+] failed to load module:', src);
			return;
		}
		if (callback) callback();
	};
	return function(src, onload) {
		callbacks[src] = onload;
		GodvillePlus.postMessage(JSON.stringify({type: 'loadModule', source: src}));
	};
};

/**
 * @param {string} prefix
 * @returns {function(string)}
 */
dom.createStyleSheetLoader = function(prefix) {
	var serial = 0;
	return function(href) {
		var style = dom.createElement('style', 'css-' + serial++);
		style.type = 'text/css';
		style.textContent = window.__godvillePlusAssets[href];
		document.head.appendChild(style);
	};
};

/**
 * @param {string} prefix
 * @returns {function(string, string)}
 */
dom.createFontLoader = function(prefix) {
	var serial = 0;
	return function(fontFamily, src) {
		document.head.appendChild(dom.createFontFaceStyle(
			'font-' + serial++,
			fontFamily,
			window.__godvillePlusAssetUrls[src]
		));
	};
};

var prefix = localStorage.eGUI_prefix = (chrome.extension.getURL || chrome.runtime.getURL)('');

modules.MODULES.browser = {src: 'guip_chrome.js'};

// Chrome 49 (the last available for XP) doesn't natively support Object.values
if (!Object.values) {
	modules.MODULES.object = {src: 'Object.js'};
	modules.MODULES.phrasesRu.deps.push('object');
	modules.MODULES.phrasesEn.deps.push('object');
}

var port = null;
var mv3 = chrome.runtime.getManifest().manifest_version === 3;

var sendMessage = function(msg) {
	// with mv3 we can't properly use ports as of chrome 126,
	// they get disconnected without triggering onDisconnect most of the time
	if (mv3) {
		// send an one-time message instead
		chrome.runtime.sendMessage(msg);
		return;
	}
	if (!port) {
		port = chrome.runtime.connect();
		port.onMessage.addListener(utils.postErinomeMessageTo.bind(null, window.location.origin));
	}
	port.postMessage(msg);
};

// accept one-time messages sent back from the mv3 service worker
if (mv3) {
	chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
		// internal messages don't have tab property in sender object
		if (!sender.tab) {
			utils.postErinomeMessageTo(window.location.origin,msg);
		}
	});
}

initializer.registerErinomeListener(initializer.createErinomeListener({
	webxhr: function(msg) {
		window.__godvillePlusForwardWebRequest(msg);
	},
	playsound: sendMessage,
	makefocus: sendMessage,
	notify: sendMessage,
	notifyHide: sendMessage
}));
initializer.init(dom.createModuleLoader(prefix), dom.createStyleSheetLoader(prefix), dom.createFontLoader(prefix));

})(this);
