(function(worker) {
'use strict';

worker.GUIp = worker.GUIp || {};
GUIp.common = {};

GUIp.common.debug = worker.console.log.bind(worker.console, '[eGUI+] debug:');
GUIp.common.info  = worker.console.info.bind(worker.console, '[eGUI+] info:');
GUIp.common.warn  = worker.console.warn.bind(worker.console, '[eGUI+] warning:');
GUIp.common.error = worker.console.error.bind(worker.console, '[eGUI+] error:');
// include './heap.js';
/**
 * @readonly
 * @type {boolean}
 */
GUIp.common.isAndroid = worker.navigator.userAgent.toLowerCase().indexOf('android') >= 0; // cannot use .includes here

/**
 * true if the last recently used input device was a touch screen.
 * Supposed to be used in mouse event handlers.
 *
 * @readonly
 * @type {boolean}
 */
GUIp.common.isTouching = false;

(function() {
	var moves = 0;

	var onMouseMove = function() {
		// on touch devices, mousemove is not fired when dragging
		// therefore, if we have two successive moves (without intervening touchend), then it's a real mouse
		if (++moves >= 2) {
			GUIp.common.isTouching = false;
			worker.removeEventListener('mousemove', onMouseMove, true);
		}
	};

	worker.addEventListener('mousemove', onMouseMove, true);
	worker.addEventListener('touchend', function onTouchEnd() {
		GUIp.common.isTouching = true;
		if (moves >= 2) {
			worker.addEventListener('mousemove', onMouseMove, true);
		}
		moves = 0;
	}, true);
})();

/**
 * @param {string} url
 * @returns {string}
 */
GUIp.common.resolveURL = function(url) {
	if (/^\w*:/.test(url)) {
		return url;
	} else if (url[0] !== '/') {
		if (worker.location.pathname.slice(-1) !== '/') {
			url = '/' + url;
		}
		return worker.location.protocol + '//' + worker.location.host + worker.location.pathname + url;
	} else if (url[1] !== '/') {
		return worker.location.protocol + '//' + worker.location.host + url;
	} else {
		return worker.location.protocol + url;
	}
};

GUIp.common.addCSSFromURL = function(href, id) {
	if (!href) {
		return;
	}
	document.head.insertAdjacentHTML('beforeend', '<link id="' + id + '" type="text/css" href="' + href + '" rel="stylesheet" media="screen" />');
};

GUIp.common.addCSSFromString = function(text, id) {
	if (!id) {
		id = 'guip_user_css';
	}
	if (!document.getElementById(id)) {
		document.head.insertAdjacentHTML('beforeend', '<style id="' + id + '"></style>');
	}
	document.getElementById(id).textContent = text;
};

/**
 * @param {string} text
 * @returns {*}
 */
GUIp.common.parseJSON = function(text) {
	try {
		return JSON.parse(text);
	} catch (e) {
		return null;
	}
};

/**
 * Shuffle the array in place.
 *
 * @param {!Array} arr
 * @returns {!Array}
 */
GUIp.common.shuffleArray = function(arr) {
	// walk forward for a bit better cache locality
	for (var i = 0, n = arr.length; n > 1; i++, n--) {
		var j = i + Math.floor(Math.random() * n), x = arr[j];
		arr[j] = arr[i];
		arr[i] = x;
	}
	return arr;
};

/**
 * Rearrange elements in the array such that all elements x for which pred(x) is true
 * come before all elements y for which pred(y) is false.
 *
 * @param {!Array<*>} arr
 * @param {function(*): boolean} pred
 * @param {*} [thisArg]
 * @returns {number} Number of elements for which pred(x) is true.
 */
GUIp.common.partitionArray = function(arr, pred, thisArg) {
	var l = 0, r = arr.length - 1;
	while (true) {
		while (l <= r && pred.call(thisArg, arr[l])) {
			l++;
		}
		while (l < r && !pred.call(thisArg, arr[r])) {
			r--;
		}
		if (l >= r) {
			return l;
		}
		var t = arr[l];
		arr[l++] = arr[r];
		arr[r--] = t;
	}
};

/**
 * @param {!Array<*>} arr
 * @param {function(*, number, !Array<*>): boolean} pred
 * @param {*} [thisArg]
 * @returns {!Array<*>}
 */
GUIp.common.filterInPlace = function(arr, pred, thisArg) {
	var i, len = arr.length;
	for (i = 0; i < len && pred.call(thisArg, arr[i], i, arr); i++) { }
	var j = i;
	while (++i < len) {
		var x = arr[i];
		if (pred.call(thisArg, x, i, arr)) {
			arr[j++] = x;
		}
	}
	arr.length = j;
	return arr;
};

/**
 * dest[pos:] = src
 *
 * @param {!Array} dest
 * @param {number} pos
 * @param {!Array} src
 */
GUIp.common.replaceArrayTail = function(dest, pos, src) {
	for (var i = 0, len = src.length; i < len; i++) {
		dest[pos++] = src[i];
	}
	dest.length = pos;
};

/**
 * Search for a first occurence of an element in the array and, if found, remove it. Complexity is O(n).
 * Relative order of the remaining elements is unspecified.
 *
 * @param {!Array<*>} arr
 * @param {*} x
 * @returns {boolean} true iff existed.
 */
GUIp.common.linearRemove = function(arr, x) {
	var i = arr.indexOf(x);
	if (i < 0) return false;
	var last = arr.length - 1;
	arr[i] = arr[last];
	arr.length = last;
	return true;
};

/**
 * Search for a first occurence of an element in the array and, if found, remove it. Complexity is O(n).
 *
 * @param {!Array<*>} arr
 * @param {*} x
 * @returns {boolean} true iff existed.
 */
GUIp.common.linearRemoveStable = function(arr, x) {
	var i = arr.indexOf(x);
	if (i < 0) return false;
	arr.copyWithin(i, i + 1);
	arr.length--;
	return true;
};

/**
 * @param {*} smth
 * @returns {boolean}
 */
GUIp.common.isIntegralArray = function(smth) {
	return Array.isArray(smth) && smth.every(Number.isSafeInteger); // assume smth.every === Array.prototype.every
};

/**
 * @param {!Array} a
 * @param {!Array} b
 * @returns {boolean}
 */
GUIp.common.areArraysEqual = function(a, b) {
	var len = a.length;
	if (len !== b.length) return false;
	for (var i = 0; i < len; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
};

/**
 * Essentially the reverse of Object.keys.
 *
 * @param {!Array<*>} items
 * @param {?Object} [result]
 * @returns {!Object<*, boolean>}
 */
GUIp.common.makeHashSet = function(items, result) {
	result = result || Object.create(null);
	for (var i = 0, len = items.length; i < len; i++) {
		result[items[i]] = true;
	}
	return result;
};

/**
 * Kuhn's (a.k.a. Hungarian) algorithm.
 *
 * @param {!Array<!Array<number>>} g - The first part of the graph represented as an adjacency list.
 * @param {number} k - Size of the second part of the graph.
 * @returns {number}
 */
GUIp.common.findBipartiteMatching = function(g, k) {
	var n = g.length;
	if (!n) return 0;
	if (n > 0xFFFF) {
		throw new Error('too large graph for bipartite matching: n = ' + n + ', k = ' + k);
	}
	var match = new Uint16Array(k),
		used = new Uint8Array(n);
	match.fill(0xFFFF);

	var runKuhn = function(cur) {
		used[cur] = 1;
		var adj = g[cur];
		for (var i = 0, len = adj.length; i < len; i++) {
			var next = adj[i],
				next2 = match[next];
			if (next2 === 0xFFFF || (!used[next2] && runKuhn(next2))) {
				match[next] = cur;
				return 1;
			}
		}
		return 0;
	};

	var naivelyUsed = new Uint8Array(n),
		resultSize = 0,
		cur, i, len;
	// find a suboptimal matching using simple greedy algorithm
	for (cur = 0; cur < n; cur++) {
		var adj = g[cur];
		for (i = 0, len = adj.length; i < len; i++) {
			var next = adj[i];
			if (match[next] === 0xFFFF) {
				match[next] = cur;
				naivelyUsed[cur] = 1;
				resultSize++;
				break;
			}
		}
	}
	// improve it
	for (cur = 0; cur < n; cur++) {
		if (!naivelyUsed[cur]) {
			used.fill(0);
			resultSize += runKuhn(cur);
		}
	}
	return resultSize;
};

/**
 * Attempt to change (internal) name of the function. The new name is respected by Chrome's stacktraces,
 * however in other browsers it is not. This is a no-op in Opera since it is impossible to rename a function there.
 *
 * @param {string} newName
 * @param {!Function} func
 * @returns {!Function}
 */
GUIp.common.namedFunction = function(newName, func) {
	try {
		Object.defineProperty(func, 'name', {configurable: true, value: newName});
	} catch (e) { /* Function::name is non-configurable in Opera */ }
	return func;
};

/**
 * @param {!Object} obj
 * @param {string} prop
 * @param {function(): *} calc
 * @returns {!Object}
 */
GUIp.common.defineCachedProperty = function(obj, prop, calc) {
	return Object.defineProperty(obj, prop, {configurable: true, enumerable: true, get: function() {
		var value = calc.call(this);
		Object.defineProperty(this, prop, {configurable: true, enumerable: true, value: value});
		return value;
	}});
};

/**
 * @param {string} text
 * @returns {string}
 */
GUIp.common.escapeHTML = function(text) {
	return (
		text
		.replace(/&/g, '&amp;') // this one must be called first
		.replace(/"/g, '&#34;') // shorter than &quot;
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
	);
};

GUIp.common.escapeRegExp = function(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * @param {string} text
 * @returns {string}
 */
GUIp.common.escapeRegex = function(text) {
	return text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
};

/**
 * @param {!RegExp} regex
 * @param {string} text
 * @param {*} [fallback]
 * @returns {(string|*)}
 */
GUIp.common.matchRegex = function(regex, text, fallback) {
	var m = regex.exec(text);
	return m ? m[1] : fallback;
};

/**
 * @param {?Array<(string|undefined)>} m
 * @returns {?string}
 */
GUIp.common.findNonEmptyCapture = function(m) {
	var s;
	if (m) {
		for (var i = 1, len = m.length; i < len; i++) {
			if ((s = m[i])) return s;
		}
	}
	return null;
};

/**
 * @class
 * @template T
 * @param {function(): T} f
 */
GUIp.common.FuncCache = function(f) {
	this._f = f;
	this._cached = undefined;
};

GUIp.common.FuncCache.prototype = {
	constructor: GUIp.common.FuncCache,

	/**
	 * @returns {T}
	 */
	get: function() {
		return this._cached !== undefined ? this._cached : (this._cached = this._f());
	},

	invalidate: function() {
		this._cached = undefined;
	}
};

/**
 * @template T
 * @param {number} delay
 * @param {function(T)} f
 * @returns {function(T)}
 */
GUIp.common.debounce = function(delay, f) {
	var timer = 0, execute = function(arg) {
		timer = 0;
		f(arg);
	};
	return function(arg) {
		if (timer) clearTimeout(timer);
		timer = GUIp.common.setTimeout(execute, delay, arg);
	};
};

/**
 * @template T
 * @param {number} delay
 * @param {function(T)} f
 * @returns {function(T)}
 */
GUIp.common.throttle = function(delay, f) {
	var timer = 0,
		execute = function() {
			var arg = savedArg;
			timer = 0;
			savedArg = execute;
			if (arg !== execute) f(arg);
		},
		savedArg = execute; // it is impossible to pass this reference as an argument from the outside
	return function(arg) {
		if (timer) {
			savedArg = arg;
		} else {
			timer = GUIp.common.setTimeout(execute, delay);
			f(arg);
		}
	};
};

/**
 * @function
 * @param {!Error} e
 */
// log by default. may be overridden
GUIp.common.onUnhandledException = GUIp.common.error;

/**
 * @param {!Function} func
 * @param {...*} [args]
 * @returns {*}
 */
GUIp.common.try = function(func) {
	try {
		return func.apply(this, Array.prototype.slice.call(arguments, 1));
	} catch (e) {
		GUIp.common.onUnhandledException(e);
	}
};

/**
 * @param {function(*, *): *} func
 * @param {*} [arg1]
 * @param {*} [arg2]
 * @returns {*}
 */
// special-cased for speed
GUIp.common.try2 = function(func, arg1, arg2) {
	try {
		return func.call(this, arg1, arg2);
	} catch (e) {
		GUIp.common.onUnhandledException(e);
	}
};

/**
 * @param {!Function} callback
 * @param {number} delay
 * @param {...*} [args]
 * @returns {number}
 */
GUIp.common.setTimeout = function(callback, delay, arg1, arg2) {
	var len = arguments.length;
	if (len <= 4) {
		return worker.setTimeout(GUIp.common.try2, delay, callback, arg1, arg2);
	}
	var args = [GUIp.common.try, delay, callback, arg1, arg2];
	for (var i = 4; i < len; i++) {
		args[i + 1] = arguments[i];
	}
	return worker.setTimeout.apply(null, args);
};

/**
 * @param {!Function} callback
 * @param {number} period
 * @param {...*} [args]
 * @returns {number}
 */
GUIp.common.setInterval = function(callback, period, arg1, arg2) {
	var len = arguments.length;
	if (len <= 4) {
		return worker.setInterval(GUIp.common.try2, period, callback, arg1, arg2);
	}
	var args = [GUIp.common.try, period, callback, arg1, arg2];
	for (var i = 4; i < len; i++) {
		args[i + 1] = arguments[i];
	}
	return worker.setInterval.apply(null, args);
};

/**
 * @param {function(!Array<!MutationRecord>, !MutationObserver)} callback
 * @returns {!MutationObserver}
 */
GUIp.common.newMutationObserver = function(callback) {
	return new MutationObserver(GUIp.common.try2.bind(null, callback));
};

/**
 * @param {!EventTarget} target
 * @param {string} type
 * @param {function(!Event)} listener
 * @param {(boolean|!Object)} [options]
 */
GUIp.common.addListener = function(target, type, listener, options) {
	target.addEventListener(type, GUIp.common.namedFunction('on' + type, function(ev) {
		GUIp.common.try2.call(this, listener, ev);
	}), options);
};

/**
 * @param {string} s
 * @returns {!GUIp.OMultiMap}
 */
GUIp.common.parseQueryString = function(s) {
	var q = new GUIp.OMultiMap,
		kv = '',
		eqPos = 0,
		kvPairs;
	if (!s || s === '?') return q;
	if (s[0] !== '?') {
		throw new Error('invalid query string: "' + s + '"');
	}
	kvPairs = s.split('&');
	for (var i = 0, len = kvPairs.length; i < len; i++) {
		kv = kvPairs[i];
		eqPos = kv.indexOf('=');
		if (eqPos >= 0) {
			q.add(decodeURIComponent(kv.slice(!i, eqPos)), decodeURIComponent(kv.slice(eqPos + 1)));
		} else {
			q.add(decodeURIComponent(i ? kv : kv.slice(1)), '');
		}
	}
	return q;
};

/**
 * @private
 * @this {!Array<string>}
 * @param {!Array<string>} values
 * @param {string} key
 */
GUIp.common._stringifyQueryString = function(values, key) {
	key = encodeURIComponent(key) + '=';
	for (var i = 0, len = values.length; i < len; i++) {
		this.push(key + encodeURIComponent(values[i]));
	}
};

/**
 * @param {!GUIp.OMultiMap} q
 * @returns {string}
 */
GUIp.common.stringifyQueryString = function(q) {
	var result = [];
	q.forEach(GUIp.common._stringifyQueryString, result);
	return result.length ? '?' + result.join('&') : '';
};

GUIp.common.setCurrentGodname = function(gn) {
	var a, names = localStorage.getItem('eGUI_CurrentUser');
	names = names ? names.split('|') : [];
	if (names[0] === gn) {
		return;
	}
	if ((a = names.indexOf(gn)) > -1) {
		names.splice(a,1);
	}
	names.unshift(gn);
	localStorage.setItem('eGUI_CurrentUser',names.slice(0,5).join('|'));
};

GUIp.common.getCurrentGodname = function(customDomain) {
	var a, b, sorted, names = (localStorage.getItem('eGUI_CurrentUser') || '').split('|');
	if (a = (document.getElementById('menu_top') || '').textContent) {
		sorted = names.slice().sort(function(a,b) { return b.length - a.length });
		if ((b = new RegExp(sorted.join('|')).exec(a))) {
			return b[0];
		}
	}
	return names[0] || GUIp.common.getGodnameFromCookies() || (!customDomain && GUIp.common.warn('username cannot be detected!'), '_unknown_');
};

GUIp.common.getGodnameFromCookies = function() {
	var result = '',
		ca = worker.document.cookie.split(';');
	for (var i = 0, len = ca.length; i < len; i++) {
		var c = ca[i];
		while (c.charAt(0) === ' ') {
			c = c.slice(1);
		}
		if (c.startsWith('gn=')) {
			result = c.slice('gn='.length);
			try {
				result = JSON.parse(decodeURIComponent(result)).replace(/\+/g,' ');
				if (localStorage.getItem('eGUI_' + result + ':ForumSubscriptions') === null) {
					result = '';
				}
			} catch (e) {
				result = '';
			}
			break;
		}
	}
	return result;
};

/**
 * @param {string} path
 * @param {?function(): boolean} [guard]
 * @param {?function()} [onload]
 * @param {?function()} [onerror]
 */
GUIp.common.loadDomainScript = function(path, guard, onload, onerror) {
	if (guard && guard()) {
		// already satisfied
		if (onload) onload();
	} else {
		var s = document.createElement('script');
		s.src = '/javascripts/' + path;
		if (onload || onerror) {
			GUIp.common.addListener(s, 'load', function() {
				(!guard || guard() ? onload : onerror)();
			});
			GUIp.common.addListener(s, 'error', onerror);
		}
		document.head.appendChild(s);
	}
};

/**
 * @param {{type: string}} msg
 */
GUIp.common.postErinomeMessage = function(msg) {
	worker.postMessage({erinomeMessage: msg}, worker.location.origin);
};

GUIp.common.getXHR = function(path, success_callback, fail_callback) {
	if (worker.GUIp_browser !== 'Opera') {
		GUIp.common.extensionXHR(path, 'GET', null, null, success_callback, fail_callback);
	} else {
		GUIp.common.processXHR(path, 'GET', null, null, success_callback, fail_callback);
	}
};
GUIp.common.postXHR = function(path, postdata, encoding, success_callback, fail_callback) {
	if (worker.GUIp_browser !== 'Opera') {
		GUIp.common.extensionXHR(path, 'POST', postdata, encoding, success_callback, fail_callback);
	} else {
		GUIp.common.processXHR(path, 'POST', postdata, encoding, success_callback, fail_callback);
	}
};
GUIp.common.processXHR = function() {
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

	// this: function(!Object)
	var handler = function(xhr) {
		xhr.lastModified = xhr.getResponseHeader('Last-Modified');
		GUIp.common.try2(this, xhr);
	};

	return function(path, method, data, encoding, onSuccess, onFailure) {
		processXHR(path, method, data, encoding, onSuccess && handler.bind(onSuccess), onFailure && handler.bind(onFailure));
	};
}();
GUIp.common.extensionXHRCallbacks = {};
GUIp.common.extensionXHR = function(path, method, data, encoding, success_callback, fail_callback) {
	var scid, fcid;
	if (success_callback) {
		scid = Math.random().toString();
		GUIp.common.extensionXHRCallbacks[scid] = success_callback;
	}
	if (fail_callback) {
		fcid = Math.random().toString();
		GUIp.common.extensionXHRCallbacks[fcid] = fail_callback;
	}
	GUIp.common.postErinomeMessage({type:'webxhr',url:path,method:method,data:data,encoding:encoding,scid:scid,fcid:fcid});
};
GUIp.common.addListener(worker, 'message', function onWebXHRResponse(event) {
	if (event.source !== worker || event.origin !== worker.location.origin) {
		return;
	}
	var msg = event.data;
	if (!msg || !(msg = msg.erinomeMessage) || msg.type !== 'webxhrResponse') {
		return;
	}
	var callback = GUIp.common.extensionXHRCallbacks[msg.cid];
	delete GUIp.common.extensionXHRCallbacks[msg.scid];
	delete GUIp.common.extensionXHRCallbacks[msg.fcid];
	if (callback) callback(msg.xhr);
});

/**
 * @param {string} path
 * @param {?function(!Object)} [onsuccess]
 * @param {?function(!Object)} [onfailure]
 */
GUIp.common.getDomainXHR = function(path, onsuccess, onfailure) {
	GUIp.common.getXHR(worker.location.protocol + '//' + worker.location.host + path, onsuccess, onfailure);
};

/**
 * @param {string} logID
 * @param {?function(!Object)} [onsuccess]
 * @param {?function(!Object)} [onfailure]
 */
GUIp.common.requestLog = function(logID, onsuccess, onfailure) {
	GUIp.common.getDomainXHR('/duels/log/' + logID, onsuccess, onfailure);
};

/**
 * @param {string} sound
 */
GUIp.common.playSound = function(sound, volume) {
	volume = parseInt(volume) || 100;
	if (worker.GUIp_browser === 'Opera') {
		try {
			var res;
			switch (sound) {
				case 'msg':   sound = '/sounds/msg.wav';       break;
				case 'spar':  sound = '/sounds/challenge.wav'; break;
				case 'arena': sound = '/sounds/arena.wav';     break;
			}
			res = new Audio(sound);
			if (volume !== 100) {
				res.volume = volume / 100;
			}
			res = res.play();
			if (res) {
				res.catch(GUIp.common.warn);
			}
		} catch (e) { GUIp.common.error(e); }
	} else {
		switch (sound) {
			case 'msg':   sound = worker.location.protocol + '//' + worker.location.host + '/sounds/msg.mp3';       break;
			case 'spar':  sound = worker.location.protocol + '//' + worker.location.host + '/sounds/challenge.mp3'; break;
			case 'arena': sound = worker.location.protocol + '//' + worker.location.host + '/sounds/arena.mp3';     break;
		}
		GUIp.common.postErinomeMessage({type: 'playsound', content: sound, volume: volume});
	}
};

/**
 * @param {string} theme
 */
GUIp.common.exposeThemeName = function(theme) {
	document.body.className = document.body.className.replace(/\bth_\w+/g, '').trim() + ' ' + theme;
};

/**
 * @param {number} date
 * @returns {number}
 */
GUIp.common.getDungeonVersion = function(date) {
	return GUIp_locale === 'ru' && date >= 1608296400e3 ||		// 18 Dec 2020, 13:00 UTC
		GUIp_locale === 'en' && date >= 1617508800e3 ? 2 : 1;	// 04 Apr 2021, 04:00 UTC
};

/**
 * @param {number} arrowCode
 * @param {number} dy
 * @param {number} dx
 * @param {number} version
 * @returns {boolean}
 */
GUIp.common.checkDungeonArrow = function(arrowCode, dy, dx, version) {
	var diag = true,
		step = 0;
	// mirror coordinates so that we have to deal only with E and SE arrows
	switch (arrowCode) {
		case 0x2197: /*↗*/ dy = -dy; break;
		case 0x2196: /*↖*/ dy = -dy; // break;
		case 0x2199: /*↙*/ dx = -dx; break;
		case 0x2190: /*←*/ dx = -dx; // break;
		case 0x2192: /*→*/ diag = false; break;
		case 0x2191: /*↑*/ step = -dy; dy = dx; dx = step; diag = false; break;
		case 0x2193: /*↓*/ step =  dy; dy = dx; dx = step; diag = false; break;
		case 0x2560: /*╠*/ return dx > 0;
		case 0x2563: /*╣*/ return dx < 0;
		case 0x2566: /*╦*/ return dy > 0;
		case 0x2569: /*╩*/ return dy < 0;
	}
	if (dx <= 0) return false;
	step = version === 2 ? 2.414 : 5;
	return dx <= (dy >= 0 ? dy : -dy) * step ? diag && dy >= 0 && dy <= dx * step : !diag;
};

GUIp.common.improveMap = function(isCGM, version, maxStep) {
	var i, j, ik, jk, len,
		$boxML = document.getElementsByClassName('dml'),
		$boxMC = document.getElementsByClassName('dmc'),
		kRow = $boxML.length,
		kColumn = $boxML[0] && $boxML[0].children.length,
		MaxMap = 0,       // count of pointers of any type
		MaxMapThermo = 0, // count of thermo pointers
		MapData = {
			cells: {},
			kColumn: kColumn,
			kRow: kRow
		};
	if (!$boxML.length) {
		return;
	}
	if (!version) version = 2;
	var chamber = '✖',
		staircase = '◿';
	for (i = 1, len = maxStep || +Object.keys(this.chronicles).pop(); i < len; i++) {
		if (this.chronicles[i].chamber) {
			chamber = '';
		} else if (this.chronicles[i].staircase) {
			staircase = '';
		}
		if (!chamber && !staircase) break;
	}
	// build map info
	for (ik = -1; ik <= kRow; ik++) {
		MapData.cells[ik] = {};
		for (jk = -1; jk <= kColumn; jk++) {
			if (ik < 0 || jk < 0 || ik === kRow || jk === kColumn) {
				MapData.cells[ik][jk] = {
					explored: false,
					wall: false,
					unknown: true,
					ptl: -1
				};
			} else {
				MapData.cells[ik][jk] = {
					explored: !((new worker.RegExp('[#?!⚠' + chamber + staircase + ']')).test($boxMC[ik * kColumn + jk].textContent)) && !$boxMC[ik * kColumn + jk].classList.contains('demolishedWallNotExplored'),
					wall: $boxMC[ik * kColumn + jk].textContent.includes('#'),
					unknown: $boxMC[ik * kColumn + jk].textContent.includes('?') && !$boxMC[ik * kColumn + jk].classList.contains('seenExcl'),
					ptl: /[?!@⚠]/.test($boxMC[ik * kColumn + jk].textContent) ? 0 : -1
				};
			}
		}
	}
	// remove unknown marks from cells located near explored ones
	for (ik = 0; ik < kRow; ik++) {
		for (jk = 0; jk < kColumn; jk++) {
			if (MapData.cells[ik][jk].explored) {
				for (i = -1; i <= 1; i++) {
					for (j = -1; j <= 1; j++) {
						if (MapData.cells[ik+i][jk+j] && (!isCGM || !i || !j)) { MapData.cells[ik+i][jk+j].unknown = false; }
					}
				}
			}
		}
	}
	for (var si = 0; si < kRow; si++) {
		for (var sj = 0; sj < kColumn; sj++) {
			var ij, ttl = '',
				code = 0,
				cell = $boxMC[si * kColumn + sj],
				pointer = cell.textContent.trim(),
				chronopointers = cell.dataset.pointers;
			if (pointer === '🚪') {
				// replace exit sign. probably it should be done somewhere else
				cell.classList.add('map_exit_pos_' + worker.GUIp_locale);
			} else if (pointer === '?') {
				// assign different classes to differently unexplored cells
				cell.classList.add(MapData.cells[si][sj].unknown ? 'absolutelyUnknown' : 'notAWall');
			} else if (pointer === '@') {
				// check if current position has some directions in chronicle
				cell.classList.add('map_pos');
				if (chronopointers) {
					chronopointers = chronopointers.split(' ');
					for (i = 0, len = chronopointers.length; i < len; i++) {
						switch (chronopointers[i]) {
							case 'north_side': ttl += '╩'; break;
							case 'east_side':  ttl += '╠'; break;
							case 'south_side': ttl += '╦'; break;
							case 'west_side':  ttl += '╣'; break;
							case 'north_east': ttl += '↗'; break;
							case 'north_west': ttl += '↖'; break;
							case 'south_east': ttl += '↘'; break;
							case 'south_west': ttl += '↙'; break;
							case 'north':      ttl += '↑'; break;
							case 'east':       ttl += '→'; break;
							case 'south':      ttl += '↓'; break;
							case 'west':       ttl += '←'; break;
							case 'freezing': ttl += '✵'; break;
							case 'cold':     ttl += '❄'; break;
							case 'mild':     ttl += '☁'; break;
							case 'warm':     ttl += '♨'; break;
							case 'hot':      ttl += '☀'; break;
							case 'burning':  ttl += '✺'; break;
						}
					}
					GUIp.common.debug('current position has pointers:', ttl);
				}
			}
			if (/[←→↓↑↙↘↖↗⌊⌋⌈⌉∨<∧>╠╣╦╩]/.test(pointer + ttl)) {
				cell.classList.add('pointerMarker');
				if (cell.classList.contains('disabledPointer')) {
					continue;
				}
				MaxMap++;
				// get directions from the arrows themselves, not relying on parsed chronicles
				if (!ttl.length) {
					switch (pointer) {
						case '⌊': ttl = '↑→'; break;
						case '⌋': ttl = '↑←'; break;
						case '⌈': ttl = '↓→'; break;
						case '⌉': ttl = '↓←'; break;
						case '∨': ttl = '↖↗'; break;
						case '<': ttl = '↗↘'; break;
						case '∧': ttl = '↙↘'; break;
						case '>': ttl = '↖↙'; break;
						default: ttl = pointer; break;
					}
				}
				for (ij = 0, len = ttl.length; ij < len; ij++) {
					if ('→←↓↑↘↙↖↗╠╣╦╩'.includes(ttl[ij])) {
						code = ttl.charCodeAt(ij);
						for (ik = 0; ik < kRow; ik++) {
							for (jk = 0; jk < kColumn; jk++) {
								if (GUIp.common.checkDungeonArrow(code, ik - si, jk - sj, version) &&
									MapData.cells[ik][jk].ptl >= 0
								) {
									MapData.cells[ik][jk].ptl += 1024;
								}
							}
						}
					}
				}
			}
			if (/[✺☀♨☁❄✵]/.test(pointer + ttl)) {
				cell.classList.add('pointerMarker');
				if (cell.classList.contains('disabledPointer')) {
					continue;
				}
				MaxMapThermo++;
				// if we're standing on the pointer - use parsed value from chronicle
				if (ttl.length) {
					pointer = ttl;
				}
				var ThermoMinStep = 0; // minimum steps to the treasury
				var ThermoMaxStep = 0; // maximum steps to the treasury
				switch (pointer) {
					case '✺': ThermoMinStep = 1; ThermoMaxStep = 2; break;    // ✺ - очень горячо(1-2)
					case '☀': ThermoMinStep = 3; ThermoMaxStep = 5; break;    // ☀ - горячо(3-5)
					case '♨': ThermoMinStep = 6; ThermoMaxStep = 9; break;    // ♨ - тепло(6-9)
					case '☁': ThermoMinStep = 10; ThermoMaxStep = 13; break;  // ☁ - свежо(10-13)
					case '❄': ThermoMinStep = 14; ThermoMaxStep = 18; break;  // ❄ - холодно(14-18)
					case '✵': ThermoMinStep = 19; ThermoMaxStep = 100; break; // ✵ - очень холодно(19)
				}
				MapData.scanList = [];
				MapData.minStep = ThermoMinStep;
				MapData.maxStep = ThermoMaxStep;
				for (ik in MapData.cells) {
					for (jk in MapData.cells[ik]) {
						MapData.cells[ik][jk].step = NaN;
						MapData.cells[ik][jk].realstep = NaN;
					}
				}
				GUIp.common.mapIteration(MapData, si, sj, 0, false);
				for (ik = ((si - ThermoMaxStep) > 0 ? si - ThermoMaxStep : 0); ik <= ((si + ThermoMaxStep) < kRow ? si + ThermoMaxStep : kRow - 1); ik++) {
					for (jk = ((sj - ThermoMaxStep) > 0 ? sj - ThermoMaxStep : 0); jk <= ((sj + ThermoMaxStep) < kColumn ? sj + ThermoMaxStep : kColumn - 1); jk++) {
						if (MapData.cells[ik][jk].step >= ThermoMinStep && MapData.cells[ik][jk].step <= ThermoMaxStep) {
							if (MapData.cells[ik][jk].ptl >= 0) {
								MapData.cells[ik][jk].ptl+=128;
							}
						} else if (MapData.cells[ik][jk].step < ThermoMinStep && (!MapData.cells[ik][jk].realstep || MapData.cells[ik][jk].realstep >= ThermoMinStep)) {
							if (MapData.cells[ik][jk].ptl >= 0) {
								MapData.cells[ik][jk].ptl++;
							}
						}
					}
				}
			}
		}
	}
	if (MaxMap !== 0 || MaxMapThermo !== 0) {
		for (i = 0; i < kRow; i++) {
			for (j = 0; j < kColumn; j++) {
				if (MapData.cells[i][j].ptl === 1024*MaxMap + 128*MaxMapThermo) {
					$boxMC[i * kColumn + j].classList.add('pointerMatched');
				} else {
					for (ik = 0; ik < MaxMapThermo; ik++) {
						if (MapData.cells[i][j].ptl === 1024*MaxMap + 128*ik + (MaxMapThermo - ik)) {
							$boxMC[i * kColumn + j].classList.add('pointerMatchedThermo');
						}
					}
				}
			}
		}
	}
};

GUIp.common.mapIteration = function(MapData, iPointer, jPointer, step, specway) {
	if (++step > MapData.maxStep) {
		return;
	}
	if (MapData.cells[iPointer][jPointer].unknown) {
		specway = true;
	}
	for (var iStep = -1; iStep <= 1; iStep++) {
		for (var jStep = -1; jStep <= 1; jStep++) {
			if (iStep !== jStep && (iStep === 0 || jStep === 0)) {
				var iNext = iPointer + iStep,
					jNext = jPointer + jStep;
				if (iNext >= -1 && iNext <= MapData.kRow && jNext >= -1 && jNext <= MapData.kColumn) {
					if (MapData.cells[iNext][jNext] && !MapData.cells[iNext][jNext].wall) {
						var proceed = false;
						if (!specway && (!MapData.cells[iNext][jNext].realstep || MapData.cells[iNext][jNext].realstep > step)) {
							proceed = true;
							MapData.cells[iNext][jNext].realstep = step;
						}
						if (!MapData.cells[iNext][jNext].step || MapData.cells[iNext][jNext].step > step) {
							proceed = true;
							MapData.cells[iNext][jNext].step = step;
						}
						if (proceed) {
							GUIp.common.mapIteration(MapData, iNext, jNext, step, specway);
						}
					}
				}
			}
		}
	}
};

GUIp.common.describeCell = function(currentCell, stepNum, stepMax, stepData, trapMoveLossCount, wormholeSource) {
	var mark_no, marks_length, steptext, lasttext, titlemod, titletext;
	if (!wormholeSource) {
		for (mark_no = 0, marks_length = stepData.marks.length; mark_no < marks_length; mark_no++) {
			currentCell.classList.add(stepData.marks[mark_no]);
		}
	} else {
		currentCell.classList.remove('trapUnknown');
		currentCell.classList.add('wormhole');
	}
	if (stepData.pointers.length && !currentCell.title.startsWith('[' + worker.GUIp_i18n.map_pointer)) {
		titletext = currentCell.title.replace(/treasure is (on .*? side|in .*? directions?|within .*? steps!?|quite far)|сокровище (в .*? половине|в .*? направлени.|в двух шагах!|не дальше .*? шагов|где-то далеко)\n?/i,'');
		currentCell.title = '[' + worker.GUIp_i18n.map_pointer + ': ' + worker.GUIp_i18n[stepData.pointers[0]] + (stepData.pointers[1] ? worker.GUIp_i18n.or + worker.GUIp_i18n[stepData.pointers[1]] : '') + ']' + (titletext ? (titletext.startsWith(', ') ? '' : '\n') + titletext : '');
	}
	steptext = GUIp.common.splitSentences(stepData.text);
	if (stepNum === 1) {
		steptext = stepData.text.split('\n');
		if (steptext.length > 2) {
			steptext = [steptext.slice(1,-1).join('\n')];
		} else {
			steptext = [steptext[0]];
		}
	} else if (stepNum === stepMax) {
		steptext = steptext.slice(1);
	} else if (stepData.marks.includes('boss')) {
		steptext = steptext.slice(1, -2);
	} else if (stepData.marks.includes('trapMoveLoss') || trapMoveLossCount) {
		if (!trapMoveLossCount) {
			steptext = steptext.slice(1);
			trapMoveLossCount++;
		} else {
			steptext = steptext.slice(0, -1);
			trapMoveLossCount = 0;
		}
	} else if (stepData.marks.includes('staircase')) {
		steptext = steptext.slice(0, 1);
	} else {
		steptext = steptext.length > 2 ? steptext.slice(1, -1) : (steptext = GUIp.common.splitSentences(stepData.text,3), steptext.length > 2 ? steptext.slice(1, -1) : steptext.slice(0, -1));
	}
	steptext = steptext.join('').trim();
	if (currentCell.title.length) {
		titlemod = false;
		titletext = currentCell.title.split('\n');
		for (var i = 0, len = titletext.length; i < len; i++) {
			lasttext = /^(.*?) : (.*?)$/.exec(titletext[i]);
			if (lasttext && lasttext[2] === steptext) {
				if (lasttext[1] !== '#'+stepNum) {
					titletext[i] = lasttext[1] + ', #' + stepNum + ' : ' + steptext;
				}
				titlemod = true;
				break;
			}
		}
		if (!titlemod) {
			titletext.push('#' + stepNum + ' : ' + steptext);
		}
		currentCell.title = titletext.join('\n');
	} else {
		currentCell.title = '#' + stepNum + ' : ' + steptext;
	}
	return trapMoveLossCount;
};

// parsing dungeons!
GUIp.common.dungeonPhrases = [
	'bossHint','boss','bonusGodpower','bonusHealth','trapUnknown','trapTrophy','trapGold','trapLowDamage',
	'trapModerateDamage','trapMoveLoss','jumpingDungeon','treasureChest','pointerMarker','sideMarker','longJump',
	'deadEnd','directionless','vault','staircaseHint','staircase',
	'custom','discard' // these must be the last
];
// regexes here are case-sensitive to reduce false positives
GUIp.common.pointerRegExp = /[^\wА-ЯЁа-яё]((?:север|юг)о-(?:восток|запад)|север|восток|юг|запад|(?:очень )?(?:холодно|горячо)|свежо|тепло|(?:nor|sou)th-(?:ea|we)st|north|east|south|west|(?:very )?(?:cold|hot)|freezing|mild|warm|burning)/g;
GUIp.common.sideRegExp = /[^\wА-ЯЁа-яё](северн|восточн|южн|западн|north|east|south|west)/g;
GUIp.common.extraDiscardRegExp = /[]/g;

GUIp.common.parseDungeonPhrases = function(callback_success,callback_failure,timeout) {
	var i, j, len, category, phrases;
	if (timeout === null) {
		return;
	} else if (timeout) {
		worker.clearTimeout(timeout);
	}
	// prepare regular expressions
	for (i = 0, j = 0, len = GUIp.common.dungeonPhrases.length; i < len; i++) {
		category = GUIp.common.dungeonPhrases[i];
		if ((phrases = localStorage.getItem('LogDB:' + category + 'Phrases'))) {
			GUIp.common[category + 'RegExp'] = new RegExp(phrases, category === 'discard' ? 'g' : '');
			j++;
		}
	}
	if (j === len) {
		if (callback_success) {
			callback_success();
		}
	} else {
		// reschedule database update in 10 seconds
		if (+localStorage.getItem('LogDB:lastSerial') !== 0) {
			localStorage.setItem('LogDB:lastUpdate', Date.now() - 6*60*60*1000 + 10*1000);
			localStorage.setItem('LogDB:lastSerial', 0);
			GUIp.common.warn('not enough categories detected in phrases database, please retry in 10 seconds.');
		} else {
			GUIp.common.warn('not enough categories detected in phrases database.');
		}
		// clean partially loaded regexps
		for (i = 0, len = GUIp.common.dungeonPhrases.length; i < len; i++) {
			delete GUIp.common[GUIp.common.dungeonPhrases[i] + 'RegExp'];
		}
		if (callback_failure) {
			callback_failure();
		}
	}
};
GUIp.common.getDungeonPhrases = function(callback_success,callback_failure) {
	if (+localStorage.getItem('LogDB:lastUpdate') < (Date.now() - 6*60*60*1000)) {
		var timeout, customChronicler = localStorage.getItem('LogDB:dungeonPhrasesURL') || '';
		timeout = GUIp.common.setTimeout(function() { GUIp.common.parseDungeonPhrases(callback_success,callback_failure); timeout = null; },2e3);
		GUIp.common.getXHR(customChronicler.length >= 3 ? customChronicler : 'https://eximido.github.io/gvdb/dungeondb2_' + worker.GUIp_locale + '.json', function(xhr) {
			var i, j, len, response, category;
			try {
				if (xhr.lastModified && localStorage.getItem('LogDB:lastSerial') === xhr.lastModified) {
					localStorage.setItem('LogDB:lastUpdate', Date.now());
					GUIp.common.info('dungeon phrases DB is up to date');
					GUIp.common.parseDungeonPhrases(callback_success,callback_failure,timeout);
					return;
				}
				response = JSON.parse(xhr.responseText);
				if (response.status !== 'success') {
					throw 'request was unsuccessful';
				}
				for (i = 0, j = 0, len = GUIp.common.dungeonPhrases.length; i < len; i++) {
					category = GUIp.common.dungeonPhrases[i];
					if (response[category]) {
						localStorage.setItem('LogDB:' + category + 'Phrases', response[category]);
						j++;
					}
				}
			} catch (e) {
				GUIp.common.error('unexpected response to dungeon phrases update request:', e);
			}
			if (j === GUIp.common.dungeonPhrases.length) {
				localStorage.setItem('LogDB:lastUpdate', Date.now());
				localStorage.setItem('LogDB:lastSerial', xhr.lastModified);
			} else {
				GUIp.common.error(
					'not enough data to update phrases database (parsed', j, 'of', GUIp.common.dungeonPhrases.length, 'sections)');
			}
			GUIp.common.parseDungeonPhrases(callback_success,callback_failure,timeout);
		}, function() {
			GUIp.common.parseDungeonPhrases(callback_success,callback_failure,timeout);
		});
		return;
	}
	GUIp.common.parseDungeonPhrases(callback_success,callback_failure);
};

GUIp.common.setExtraDiscardData = function(texts) {
	GUIp.common.extraDiscardRegExp = texts.length ? (
		new RegExp('(^|[^\\wА-ЯЁа-яё])(?:' +
			texts.map(GUIp.common.escapeRegex).sort(function(a, b) { return b.length - a.length; }).join('|') +
		')(?![\\wА-ЯЁа-яё])', 'g')
	) : /[]/g;
};

GUIp.common.sanitizeChronicleText = function(text) {
	// we replace these fragments with underscores since some patterns in the Phrases DB rely on the fact
	// that heroes' names cannot be empty
	return text.replace(GUIp.common.discardRegExp, '_').replace(GUIp.common.extraDiscardRegExp, '$1_');
};

GUIp.common.bossAbilitiesList = {
	'золотоносный':'auriferous','глушащий':'deafening','лучезарный':'enlightened','взрывной':'explosive','неверующий':'faithless',
	'мощный':'hulking','паразитирующий':'leeching','бойкий':'nimble','ушастый':'overhearing','тащащий':'pickpocketing',
	'спешащий':'scurrying','творящий':'skilled','драпающий':'sneaky','транжирящий':'squandering','зовущий':'summoning',
	'пробивающий':'sweeping','мутирующий':'mutating','ломающий':'chipping','мнимый':'illusive','крепчающий':'escalating'
};

/**
 * @param {string} msg
 * @returns {number}
 */
GUIp.common.parseGatheredSoul = function(text) {
	var result, regex;
	regex = new RegExp('(' + worker.GUIp_i18n.gathered_soul_types.join('|') + ')' + (worker.GUIp_locale === 'en' ? ' soul' : 'ую душ(онк)?у'));
	if (result = regex.exec(text)) {
		return worker.GUIp_i18n.gathered_soul_types.indexOf(result[1]) + 1;
	}
	return 0;
};

GUIp.common.updateGatheredSouls = function(storage, date, origin, kind) {
	var list = JSON.parse(storage.get('LastGatheredSouls')) || [];
	for (var i = 0, len = list.length; i < len; i++) {
		if (Math.abs(date - list[i].date) < 180e3 && list[i].origin === origin && list[i].kind === kind) {
			// if we're trying to insert a same originated soul of the same kind within the 3 minute window,
			// then most likely it is a dupe
			return;
		}
	}
	list.unshift({date: date, origin: origin, kind: kind});
	list.sort(function(a, b) {
		return b.date - a.date;
	}).splice(5);
	storage.set('LastGatheredSouls', JSON.stringify(list));
};

/**
 * @param {string} msg
 * @param {string} heroName
 * @param {!Array<string>} otherNames
 * @param {function(string): number} check
 * @returns {number}
 */
GUIp.common.parseDungeonResultFromStep = function(msg, heroName, otherNames, check) {
	var res, pos, endPos = 0;
	// we need to replace character names in msg with something neutral, so in case we have
	// one name being a substring of another one the processing won't get confused
	// and we have to do it starting with the longest one due to the same reason
	otherNames.sort(function(a, b) { return b.length - a.length; });
	for (var i = 0, len = otherNames.length; i < len; i++) {
		pos = '%' + i + '%';
		if (otherNames[i] === heroName) {
			heroName = pos;
		}
		msg = msg.replace(new RegExp(GUIp.common.escapeRegex(otherNames[i]),'g'),pos);
		otherNames[i] = pos;
	}
	while ((pos = msg.indexOf(heroName, endPos)) >= 0) {
		pos += heroName.length;
		endPos = Math.min.apply(null, otherNames.map(function(name) {
			var i = msg.indexOf(name, pos);
			return i >= 0 ? i : msg.length;
		}));
		if ((res = check(msg.slice(pos, endPos)))) {
			return res;
		}
	}
	return 0;
};

GUIp.common.parseChronicles = function(page, steps, options) {
	var i, len, lastNotParsed, ch, line, masterName, step = 1, time = '', texts = [], infls = [],
		chronicles = Array.from(page.querySelectorAll(options.isMobile ? '.li_capt ~ div.new_line:not(#no_msgs_stub) .text_content' : '#last_items_arena .new_line .text_content')),
		n_down = options.isMobile ? true : (page.querySelector('#last_items_arena .block_h a, #last_items_arena .afl a:not(#fight_log_capt)') || {}).textContent === '▲'; // mobile version is always reversed
	if (n_down) {
		chronicles.reverse();
	}
	for (i = 0, len = chronicles.length; i < len; i++) {
		lastNotParsed = true;
		ch = chronicles[i];
		line = ch.textContent.trim();
		if (ch.className.includes('infl')) {
			infls.push(line.replace(/[\t\n\ ]+/g,' '));
		} else {
			texts.push(line);
		}
		if (ch.previousElementSibling && chronicles[i].previousElementSibling.className.includes('d_capt')) {
			time = chronicles[i].previousElementSibling.firstChild.textContent.trim() || time; // timestamp is in the first text node of `d_capt`
		}
		if ((i || options.compat) &&
			(n_down ? (
				chronicles[i + 1] && chronicles[i + 1].parentNode.style.borderBottomWidth
			) : ch.parentNode.style.borderBottomWidth) === '1px'
		) {
			GUIp.common.parseSingleChronicle.call(this, texts, infls, time, step, true);
			lastNotParsed = false;
			time = '';
			texts = [];
			infls = [];
			step++;
		}
		if (!ch.className.includes('infl')) {
			if (/voice from above announced that all bosses in|голос откуда-то сверху сообщил, что ни единого живого босса/.test(line)) {
				ch.innerHTML = ch.innerHTML.replace(/A pleasant voice from above announced that all bosses in this dungeon have perished and wished the intruders to burn in hell\.|Приятный голос откуда-то сверху сообщил, что ни единого живого босса (?:в этом подземелье|здесь) не осталось, и пожелал виновникам гореть в аду\./, '<strong>$&</strong>');
			} else if (options.putDMLink &&
				ch.parentNode.classList.contains('d_imp') &&
				!ch.getElementsByTagName('a')[0] &&
				(masterName = GUIp.common.findNonEmptyCapture(GUIp.common.customRegExp.exec(line)))
			) {
				ch.innerHTML = ch.innerHTML.replace(masterName,
					'<a href="' + (options.gvURL || '') + '/gods/' + encodeURIComponent(masterName) +
					'" target="_blank">' + masterName + '</a>'
				);
				GUIp.common.addListener(ch.getElementsByTagName('a')[0], 'click', function(ev) {
					// do not select this step in the replay when we click on the link
					if (!ev.button) ev.stopPropagation();
				});
			}
			if (line.includes('🎄')) {
				ch.innerHTML = ch.innerHTML.replace(/🎄(?!<)/g,
					'<span class="e_emoji e_emoji_xmas_tree' +
						(GUIp.common.renderTester.testChar('🎄') ? '' : ' eguip_font') +
					'">🎄</span>'
				);
			}
		}
	}
	if (lastNotParsed) {
		GUIp.common.parseSingleChronicle.call(this, texts, infls, time, step, true);
	}
	if (steps !== Object.keys(this.chronicles).length) {
		GUIp.common.warn('invalid number of steps detected! (have ' + Object.keys(this.chronicles).length + ' of ' + steps + ')');
	}
};

GUIp.common.parseSingleChronicle = function(texts, infls, time, step, trusted) {
	// keep the old time field since trusted data from chronicle log has time at the start of a step and we need to know it at the end
	if (this.chronicles[step] && trusted && this.chronicles[step].time) {
		time = this.chronicles[step].time;
	}
	if (!this.chronicles[step] || trusted) {
		// we may have step numbers messed up in live chronicles right after finishing the boss fight,
		// so we can only rely on trusted data from the chronicle log, thus allow it to completely overwrite any step
		this.chronicles[step] = { direction: null, marks: [], pointers: [], jumping: false, directionless: false, wormhole: false, wormholedst: null, text: texts.join('\n').replace('&nbsp;',' '), infls: infls, time: time };
	} else {
		// and we are not interested in rescanning fully processed entries multiple times
		return;
	}
	if (step <= 1) {
		return;
	}
	var i, len, j, len2, directionRegExp = /[^\wА-ЯЁа-яё-](север|восток|юг|запад|north|east|south|west)(?:[аеу]|wards?|ern|bound)?(?![\wА-ЯЁа-яё-])/,
		chronicle = this.chronicles[step],
		category, rx, direction;
	for (j = 0, len2 = texts.length; j < len2; j++) {
		texts[j] = GUIp.common.sanitizeChronicleText(texts[j]);
		// (-2) because of `custom` and `discard`
		for (i = 0, len = GUIp.common.dungeonPhrases.length - 2; i < len; i++) {
			category = GUIp.common.dungeonPhrases[i];
			rx = GUIp.common[category + 'RegExp'];
			if (rx && rx.test(texts[j]) && !chronicle.marks.includes(category)) {
				chronicle.marks.push(category);
			}
		}
		var stepSentences = GUIp.common.splitSentences(texts[j],3);
		if (!chronicle.marks.includes('staircase') && (direction = directionRegExp.exec(stepSentences[0]))) {
			chronicle.direction = direction[1];
		}
		chronicle.wormhole = chronicle.wormhole || GUIp.common.longJumpRegExp.test(texts[j]);
		chronicle.directionless = chronicle.directionless || (!chronicle.direction && GUIp.common.directionlessRegExp.test(stepSentences[0]));
		chronicle.jumping = chronicle.jumping || GUIp.common.jumpingDungeonRegExp.test(stepSentences[0]);
		if (chronicle.jumping && this.dungeonExtras.type === 'mystery' && step > this.dungeonExtras.typeStep) {
			this.parseDungeonExtras([], 'jumping', step);
		}
		var sideMarkersMatched = false;
		if (GUIp.common.pointerMarkerRegExp.test(texts[j]) || (sideMarkersMatched = GUIp.common.sideMarkerRegExp.test(texts[j]))) {
			var middle = stepSentences.length > 2 ? stepSentences.slice(1,-1).join(' ') : stepSentences[1];
			var pointer, pointers = middle.match(sideMarkersMatched ? GUIp.common.sideRegExp : GUIp.common.pointerRegExp);
			if (pointers && sideMarkersMatched) {
				switch (pointers[0].slice(1)) {
				case 'северн':
				case 'north': pointer = 'north_side'; break;
				case 'восточн':
				case 'east': pointer = 'east_side'; break;
				case 'южн':
				case 'south': pointer = 'south_side'; break;
				case 'западн':
				case 'west': pointer = 'west_side'; break;
				}
				if (pointer && !chronicle.pointers.includes(pointer)) {
					chronicle.pointers.push(pointer);
				}
			} else if (pointers && !sideMarkersMatched) {
				// check for arrow(s) first
				for (i = 0, len = pointers.length; i < len; i++) {
					pointer = null;
					switch (pointers[i].slice(1)) {
					case 'северо-восток':
					case 'north-east': pointer = 'north_east'; break;
					case 'северо-запад':
					case 'north-west': pointer = 'north_west'; break;
					case 'юго-восток':
					case 'south-east': pointer = 'south_east'; break;
					case 'юго-запад':
					case 'south-west': pointer = 'south_west'; break;
					case 'север':
					case 'north': pointer = 'north'; break;
					case 'восток':
					case 'east': pointer = 'east'; break;
					case 'юг':
					case 'south': pointer = 'south'; break;
					case 'запад':
					case 'west': pointer = 'west'; break;
					}
					if (pointer && !chronicle.pointers.includes(pointer)) {
						chronicle.pointers.push(pointer);
					}
				}
				// if nothing was found, check for thermo-hints
				if (!chronicle.pointers.length)
				for (i = 0, len = pointers.length; i < len; i++) {
					pointer = null;
					switch (pointers[i].slice(1)) {
					case 'очень холодно':
					case 'very cold':
					case 'freezing': pointer = 'freezing'; break;
					case 'холодно':
					case 'cold': pointer = 'cold'; break;
					case 'свежо':
					case 'mild': pointer = 'mild'; break;
					case 'тепло':
					case 'warm': pointer = 'warm'; break;
					case 'горячо':
					case 'hot': pointer = 'hot'; break;
					case 'очень горячо':
					case 'very hot':
					case 'burning': pointer = 'burning'; break;
					}
					if (pointer && !chronicle.pointers.includes(pointer)) {
						chronicle.pointers.push(pointer);
						// if there's anything left in pointers here then we most likely captured some superfluous word(s)
						// in this case we can only hope that the already captured word was the correct one (or rewrite phrases database at some point)
						break;
					}
				}
			}
		}
	}
};

GUIp.common.calculateDirectionlessMove = function(initCoords, initStep) {
	var i, len, j, coords = { x: initCoords.x, y: initCoords.y },
		dmap = document.getElementsByClassName('dml'),
		heroesCoords = GUIp.common.calculateXY(GUIp.common.getOwnCell()),
		steps = this.dmapMaxStep ? this.dmapMaxStep() : Object.keys(this.chronicles).length,
		directionless = 0,
		directionlessSteps = [],
		whstep = -1,
		ststep = -1,
		transitions = null;
	GUIp.common.debug(
		'going to calculate directionless moves from step #' + initStep + ' at [' + coords.y + ',' + coords.x + ']');
	for (i = initStep; i <= steps; i++) {
		if (this.chronicles[i].directionless) {
			directionlessSteps.push(i);
		}
		if (this.chronicles[i].wormhole && this.chronicles[i].wormholedst === null) {
			whstep = i;
			break;
		}
		if (this.chronicles[i].marks.includes('staircase')) {
			ststep = i;
			transitions = false;
			for (j = i + 1; j <= steps; j++) {
				if (this.chronicles[j].marks.includes('staircase')) {
					transitions = !transitions; // if this is true in the end, then we have returned to the same map again where we were at the initStep
				}
			}
			break;
		}
		GUIp.common.moveCoords(coords, this.chronicles[i]);
	}
	// we've moved to another floor and never returned, no reason for guessing directions here (this actually should be skipped already)
	if (transitions === false) {
		GUIp.common.warn('directionless combo is requested for wrong floor!',initStep);
		return {};
	}
	var variations = GUIp.common.getAllRPerms('nesw'.split(''),directionlessSteps.length),
		formatResult = function(combo) {
			var result = {};
			for (i = 0, len = combo.length; i < len; i++) {
				result[directionlessSteps[i]] = combo[i];
			}
			return result;
		};
	for (i = 0, len = variations.length; i < len; i++) {
		coords = { x: initCoords.x, y: initCoords.y };
		directionless = 0;
		for (j = initStep; j <= steps; j++) {
			if (this.chronicles[j].directionless) {
				GUIp.common.moveCoords(coords, { direction: this.corrections[variations[i][directionless]] });
				directionless++;
			} else {
				GUIp.common.moveCoords(coords, this.chronicles[j]);
			}
			if (!dmap[coords.y] || !dmap[coords.y].children[coords.x] || /[#!?]/.test(dmap[coords.y].children[coords.x].textContent)) {
				break;
			}
			if (whstep === j && (/[~@]/.test(dmap[coords.y].children[coords.x].textContent) || dmap[coords.y].children[coords.x].classList.contains('wormhole'))) {
				GUIp.common.debug('found result + wh:', variations[i].join());
				return formatResult(variations[i]);
			}
			if (ststep === j && /[◿@]/.test(dmap[coords.y].children[coords.x].textContent)) {
				GUIp.common.debug('found result + st:', variations[i].join());
				return formatResult(variations[i]);
			}
		}
		if (heroesCoords.x - coords.x === 0 && heroesCoords.y - coords.y === 0) {
			GUIp.common.debug('found result:', variations[i].join());
			return formatResult(variations[i]);
		}
	}
	GUIp.common.error('directionless combo not found!');
	return {};
};

GUIp.common.calculateWormholeMove = function(initCoords, initStep) {
	var result = GUIp.common.calculateWormholeMoveSub.call(this, initCoords, initStep, true);
	if (!result.wm) {
		GUIp.common.debug('retrying with wcheck disabled');
		result = GUIp.common.calculateWormholeMoveSub.call(this, initCoords, initStep, false);
	}
	if (result.wm) {
		GUIp.common.debug('found possible targets: ' + JSON.stringify(result));
	} else {
		GUIp.common.error('wormhole destination not found!');
	}
	return result;
};

GUIp.common.calculateWormholeMoveSub = function(initCoords, initStep, checkWalls, jumpList) {
	var i, j, m, n, noTML, result, subresult, corrections = {}, coords = { x: initCoords.x, y: initCoords.y },
		dmap = document.getElementsByClassName('dml'),
		heroesCoords = GUIp.common.calculateXY(GUIp.common.getOwnCell()),
		steps = this.dmapMaxStep ? this.dmapMaxStep() : Object.keys(this.chronicles).length,
		transitions = null;
	jumpList = jumpList ? jumpList.split(',') : [];
	jumpList.push(coords.x+':'+coords.y);
	GUIp.common.debug(
		'going to calculate wormhole jump target from step #' + initStep + ' at [' + initCoords.y + ',' + initCoords.x + ']');
	for (i = initStep+1; i <= steps; i++) {
		if (this.chronicles[i].marks.includes('staircase')) {
			transitions = false;
			for (j = i + 1; j <= steps; j++) {
				if (this.chronicles[j].marks.includes('staircase')) {
					transitions = !transitions; // if this is true in the end, then we have returned to the same map again where we were at the initStep
				}
			}
			break;
		}
	}
	// we've moved to another floor and never returned, no reason for guessing destinations here
	if (transitions === false) {
		return {};
	}
	for (m = -8; m <= 8; m++) {
		loopX:
		for (n = -8; n <= 8; n++) {
			corrections = {};
			if (Math.abs(m) + Math.abs(n) < 2 || Math.abs(m) + Math.abs(n) > 10) {
				continue loopX;
			}
			coords.x = initCoords.x + n;
			coords.y = initCoords.y + m;
			if (initStep === steps && coords.y === heroesCoords.y && coords.x === heroesCoords.x) {
				result = {wm: {}, dm: corrections};
				result.wm[initStep] = [m,n];
				return result;
			}
			if (!dmap[coords.y] || !dmap[coords.y].children[coords.x] || /[#!?]/.test(dmap[coords.y].children[coords.x].textContent)) {
				continue loopX;
			}
			if (checkWalls && !GUIp.common.checkWalls(dmap, coords, this.chronicles, initStep)) {
				continue loopX;
			}
			noTML = 1;
			for (i = initStep+1; i <= steps; i++) {
				if (!this.chronicles[i].directionless) {
					GUIp.common.moveCoords(coords, this.chronicles[i]);
				} else {
					if (!corrections[i]) {
						Object.assign(corrections, GUIp.common.calculateDirectionlessMove.call(this, coords, i));
						if (!corrections[i]) {
							continue loopX;
						}
					}
					GUIp.common.moveCoords(coords, {direction: this.corrections[corrections[i]]});
				}
				if (i === steps && coords.y === heroesCoords.y && coords.x === heroesCoords.x) {
					result = {wm: {}, dm: corrections};
					result.wm[initStep] = [m,n];
					return result;
				}
				if (!dmap[coords.y] || !dmap[coords.y].children[coords.x] || /[#!?]/.test(dmap[coords.y].children[coords.x].textContent)) {
					continue loopX;
				}
				if (this.chronicles[i].marks.includes('boss') && !(/[💀@]/.test(dmap[coords.y].children[coords.x].textContent) || dmap[coords.y].children[coords.x].classList.contains('boss'))) {
					continue loopX;
				}
				if (this.chronicles[i].marks.includes('staircase') && /[◿@]/.test(dmap[coords.y].children[coords.x].textContent)) {
					result = {wm: {}, dm: corrections};
					result.wm[initStep] = [m,n];
					return result;
				}
				if (this.chronicles[i].wormhole) {
					if (!(/[~@]/.test(dmap[coords.y].children[coords.x].textContent) || dmap[coords.y].children[coords.x].classList.contains('wormhole')) || jumpList.includes(coords.x+':'+coords.y)) {
						continue loopX;
					}
					subresult = GUIp.common.calculateWormholeMoveSub.call(this, {y: coords.y, x: coords.x}, i, checkWalls, jumpList.join(','));
					if (subresult.wm) {
						result = {wm: {}, dm: corrections};
						result.wm[initStep] = [m,n];
						Object.assign(result.wm,subresult.wm);
						Object.assign(result.dm,subresult.dm);
						return result;
					} else {
						continue loopX;
					}
				}
				if (this.chronicles[i].marks.includes('trapMoveLoss')) {
					noTML^=1;
				}
				if (checkWalls && noTML && !GUIp.common.checkWalls(dmap, coords, this.chronicles, i)) {
					continue loopX;
				}
			}
		}
	}
	return {};
};

GUIp.common.calcBlocked = function(chronicles, step) {
	var lastSentence, steptext = GUIp.common.sanitizeChronicleText(chronicles[step].text);
	lastSentence = (GUIp.common.splitSentences(steptext,3).slice(-1))[0];
	if (!lastSentence) {
		return 0;
	}
	if (GUIp.common.deadEndRegExp.test(lastSentence)) {
		lastSentence = ' ';
		if (chronicles[step+1] && chronicles[step+1].direction && !chronicles[step+1].jumping) {
			lastSentence += chronicles[step+1].direction;
		} else if (chronicles[step].direction && !chronicles[step].jumping) {
			switch (chronicles[step].direction) {
				case 'север':
				case 'north': lastSentence += 'south'; break;
				case 'восток':
				case 'east': lastSentence += 'west'; break;
				case 'юг':
				case 'south': lastSentence += 'north'; break;
				case 'запад':
				case 'west': lastSentence += 'east'; break;
			}
		}
	}
	var blocked = 0;
	if (/[^\wА-ЯЁа-яё-](?:север|восток|юг|запад|north|east|south|west)/.test(lastSentence) || lastSentence.includes('первый взгляд идти совершенно некуда.')) {
		blocked = 15;
		if (/[^\wА-ЯЁа-яё-](?:север|north)/.test(lastSentence)) {
			blocked -= 1;
		}
		if (/[^\wА-ЯЁа-яё-](?:юг|south)/.test(lastSentence)) {
			blocked -= 2;
		}
		if (/[^\wА-ЯЁа-яё-](?:запад|west)/.test(lastSentence)) {
			blocked -= 4;
		}
		if (/[^\wА-ЯЁа-яё-](?:восток|east)/.test(lastSentence)) {
			blocked -= 8;
		}
	}
	return blocked;
};

GUIp.common.checkWalls = function(dmap, initCoords, chronicles, step) {
	if (!dmap[initCoords.y - 1] || !dmap[initCoords.y + 1] || !dmap[initCoords.y - 1].children[initCoords.x] || !dmap[initCoords.y + 1].children[initCoords.x] || !dmap[initCoords.y].children[initCoords.x - 1] || !dmap[initCoords.y].children[initCoords.x + 1]) {
		return false;
	}
	var blocked = GUIp.common.calcBlocked(chronicles, step);
	if (!(blocked & 0x01) === dmap[initCoords.y - 1].children[initCoords.x].textContent.includes('#') ||
		!(blocked & 0x02) === dmap[initCoords.y + 1].children[initCoords.x].textContent.includes('#') ||
		!(blocked & 0x04) === dmap[initCoords.y].children[initCoords.x - 1].textContent.includes('#') ||
		!(blocked & 0x08) === dmap[initCoords.y].children[initCoords.x + 1].textContent.includes('#')) {
		return false;
	}
	return true;
};

GUIp.common.effectiveGodvoiceDirection = function(chronicles,step,isDetector) {
	if (!chronicles[step]) {
		return null;
	}
	var max, voice, key, keys, direction, directions = [0,0,0,0,0,0],
		vRegExp = worker.GUIp_locale === 'ru' ? /«(.*(?:север|юг|запад|восток|вниз|спуск|вверх|наверх|подним|лестниц).*)»/i : /“(.*(?:north|south|west|east|down|up).*)”/i,
		dRegExp = /север|юг|запад|восток|вниз|спуск|вверх|наверх|подним|лестниц|north|south|west|east|down|up/gi;
	var caser = function(str) {
		switch (str) {
			case 'север' :
			case 'north' : return 0;
			case 'юг'    :
			case 'south' : return 1;
			case 'запад' :
			case 'west'  : return 2;
			case 'восток':
			case 'east'  : return 3;
			case 'вниз'  :
			case 'спуск' :
			case 'down'  : return 4;
			case 'подним':
			case 'вверх' :
			case 'наверх':
			case 'лестниц':
			case 'up'    : return 5;
		}
		return null;
	};
	var replaceSpecDirs = function(str) {
		var dict = {
			север:  'норд',
			восток: 'ост',
			юг:    'зюйд',
			запад: 'вест'
		};
		// these "special" directions can be used only as distinct words,
		// but \b metacharacter doesn't work with non-latin, thus... we have this:
		Object.keys(dict).forEach(function(dir) {
			str = str.replace(new RegExp('(^|[!"#$%&\'()*+,-./:;<=>?@\\[\\\\\\]^_`{|}~ ])' + dict[dir] + 'у?($|[!"#$%&\'()*+,-./:;<=>?@\\[\\\\\\]^_`{|}~ ])','i'), '$1' + dir + '$2');
		});
		return str;
	};
	for (var i = 0, len = chronicles[step].infls.length; i < len; i++) {
		voice = replaceSpecDirs(chronicles[step].infls[i]);
		direction = vRegExp.exec(voice);
		// this is an arbitrary godvoice without any special words - skipping
		if (!direction) {
			continue;
		}
		// this is a directional godvoice, but we're interested only in cases where exactly one direction is specified
		if ((direction = direction[1].match(dRegExp)).length > 1 && (keys = Object.keys(GUIp.common.makeHashSet(direction))).length > 1) {
			// and there are several non-contradictory cellar-related special words that are allowed to be used simultaneously, in this case we shouldn't skip them
			if (![['вниз','спуск'],['вверх','наверх','подним','лестниц']].some(function(a) {
				return keys.every(function(b) {
					return a.includes(b);
				});
			})) {
				continue;
			}
		}
		if (isDetector) return true;
		if ((key = caser(direction[0])) !== null) {
			directions[key]++;
		}
	};
	if (isDetector) return false;
	max = Math.max.apply(null, directions);
	if (max < 1) {
		return null;
	}
	if (directions.filter(function(count) { return count === max; }).length > 1 && chronicles[step-1]) {
		if ((key = caser(chronicles[step-1].direction)) !== null) {
			directions[key]++;
		}
		max = Math.max.apply(null, directions);
	}
	if (directions.filter(function(count) { return count === max; }).length === 1) {
		switch (directions.findIndex(function(count) { return count === max; })) {
			case 0: return 'north';
			case 1: return 'south';
			case 2: return 'west';
			case 3: return 'east';
		}
	}
	return null;
};

GUIp.common.markGuidedSteps = function(step,isJumping,mapCells,coords) {
	if (this.chronicles[step] && (!this.chronicles[step].dGV || this.dungeonGuidedSteps[step] === 1 && isJumping && coords)) {
		// mark this step as visited so we won't be checking the same step again and again
		this.chronicles[step].dGV = true;
		// check whether there was a navigational godvoice at all
		if (!!GUIp.common.effectiveGodvoiceDirection(this.chronicles,step,true)) {
			// if it was, jumping dungeons may require additional checks
			if (isJumping && !this.chronicles[step].jumping) {
				if (!coords) {
					this.dungeonGuidedSteps[step] = 1; // this may be considered wrong for jumping dungeons in some cases, so we'd better recheck if we had a chance
				} else {
					var ncoords = {};
					switch (GUIp.common.effectiveGodvoiceDirection(this.chronicles,step)) {
						case 'north': ncoords = {y:coords.y-1, x:coords.x}; break;
						case 'south': ncoords = {y:coords.y+1, x:coords.x}; break;
						case 'west':  ncoords = {y:coords.y, x:coords.x-1}; break;
						case 'east':  ncoords = {y:coords.y, x:coords.x+1}; break;
					}
					// todo: if there were godvoices, but effective result was completely undefined or lead into a wall by some other indirect way, and the party didn't jump, should that count for guided steps or not?
					// in this code it would count step as a guided if certain direction was unknown, and won't count as a guided if direction was known and defined by the motion vector. probably it's wrong
					if (!(mapCells[ncoords.y] && mapCells[ncoords.y].children[ncoords.x] && mapCells[ncoords.y].children[ncoords.x].textContent.trim() === '#')) {
						this.dungeonGuidedSteps[step] = 2; // generally the evidence says that asking the party to jump over a wall won't count as a guided step if the attempt was unsuccessful. that's weird, but that's just it.
					}
				}
			} else {
				this.dungeonGuidedSteps[step] = 2;
			}
		}
	}
};

GUIp.common.moveCoords = function(coords, chronicle, direction) {
	direction = direction || 1;
	if (chronicle.direction) {
		var step = chronicle.jumping ? 2 : 1;
		step *= direction;
		switch (chronicle.direction) {
		case 'север':
		case 'north': coords.y -= step; break;
		case 'восток':
		case 'east': coords.x += step; break;
		case 'юг':
		case 'south': coords.y += step; break;
		case 'запад':
		case 'west': coords.x -= step; break;
		}
	}
};

GUIp.common.getOwnCell = function() {
	var cells = document.getElementsByClassName('dmc');
	for (var i = 0, len = cells.length; i < len; i++) {
		if (cells[i].textContent.trim() === '@') {
			return cells[i];
		}
	}
	return null;
}

GUIp.common._isDungeonCellar = {
	state: null,
	step: -1,
	parse: function(step) {
		this.step = step;
		var fname = document.querySelector('#map .block_content > div > div, #ar_name, #hero2 .block div + div, .e_m_dmap > div');
		// simplest case: check that header of the map includes a text basement mark
		if (fname && fname.textContent.includes(worker.GUIp_i18n.map_cellar_substr)) {
			this.state = true;
			return;
		}
		/**
		 * in case of mobile layout, it is possible that we might not have .e_m_dmap marked upon coming here yet (shouldn't happen but still),
		 * so we have to check the parsed chronicles (if they're ready) to get cellar state by counting the number of staircase uses.
		 * also, there was a bug (?) in custom dungeons where a custom basement map didn't have a label marking it being a basement
		 * and this broke everything to hell too. not quite sure if it was fixed ever since.
		*/
		// first, let's quickly see if we have an exit mark on the map
		var cells = document.getElementsByClassName('dmc');
		for (var i = 0, len = cells.length; i < len; i++) {
			if (/[ВE]|🚪/.test(cells[i].textContent)) {
				// if we do then it isn't a basement, obviously
				this.state = false;
				return;
			}
		}
		// second, check if we have dungeon title at all, or whether this dungeon is custom (by parsing text from its 1st step)
		var chronicles = (GUIp.improver || GUIp.log || '').chronicles;
		if (chronicles && (!fname || chronicles[1] && GUIp.common.customRegExp.exec(chronicles[1].text))) {
			// then iterate through all steps up to current and count the number of traversions
			var j = 0;
			for (var i = 1; i <= step; i++) {
				if (chronicles[i] && chronicles[i].marks.includes('staircase')) {
					j++;
				}
			}
			// if it is odd, we're in a basement
			this.state = !!(j % 2);
			return;
		}
		// and if we're here, it's either the first floor or our chronicle parsing has failed badly
		this.state = false;
	}
};

GUIp.common.isDungeonCellar = function() {
	// use cache to reparse chronicles only once per step
	var step = (GUIp.log && GUIp.log.dmapMaxStep()) || (GUIp.stats && GUIp.stats.currentStep()) || 0;
	if (GUIp.common._isDungeonCellar.step !== step) {
		GUIp.common._isDungeonCellar.parse(step);
	}
	return GUIp.common._isDungeonCellar.state;
}

GUIp.common.calculateXY = function(cell) {
	var coords = {};
	if (cell) {
		coords.x = GUIp.common.getNodeIndex(cell);
		coords.y = GUIp.common.getNodeIndex(cell.parentNode);
	}
	return coords;
};

GUIp.common.calculateExitXY = function(downstairs) {
	var exit_coords = { x: null, y: null },
		cells = document.getElementsByClassName('dmc'),
		exit_mark = downstairs || GUIp.common.isDungeonCellar() ? /◿/ :/[ВE]|🚪/;
	for (var i = 0, len = cells.length; i < len; i++) {
		if (exit_mark.test(cells[i].textContent)) {
			exit_coords = GUIp.common.calculateXY(cells[i]);
			break;
		}
	}
	if (exit_coords.x === null) {
		if (GUIp.common.getOwnCell()) {
			exit_coords = GUIp.common.calculateXY(GUIp.common.getOwnCell());
		}
	}
	return exit_coords;
};

GUIp.common.calculateSpecOffset = function(type) {
	var sign,
		exit_coords = GUIp.common.calculateExitXY(),
		spec_coords = { x: null, y: null },
		spec_offset = { x: null, y: null },
		cells = document.getElementsByClassName('dmc');
	switch (type) {
		case 'nook':
			sign = '✖';
			break;
		case 'stairs':
			sign = '◿';
			break;
	}
	if (!sign) {
		return spec_offset;
	}
	for (var i = 0, len = cells.length; i < len; i++) {
		if (cells[i].textContent.trim().includes(sign)) {
			spec_coords = GUIp.common.calculateXY(cells[i]);
			break;
		}
	}
	if (spec_coords.x !== null && spec_coords.x !== null) {
		spec_offset = { x: spec_coords.x - exit_coords.x, y: spec_coords.y - exit_coords.y };
	}
	return spec_offset;
};

GUIp.common.getNodeIndex = function(node) {
	var i = 0;
	while ((node = node.previousElementSibling)) {
		i++;
	}
	return i;
};

GUIp.common.getRPerms = function(array, size, initialStuff, output) {
	if (initialStuff.length >= size) {
		output.push(initialStuff);
	} else {
		for (var i = 0; i < array.length; ++i) {
			GUIp.common.getRPerms(array, size, initialStuff.concat(array[i]), output);
		}
	}
};

GUIp.common.getAllRPerms = function(array, size) {
	var output = [];
	GUIp.common.getRPerms(array, size, [], output);
	return output;
};

GUIp.common.splitSentences = function(text, expectedMinimalLength) {
	var result = GUIp.common.splitSentencesInt(text);
	if (expectedMinimalLength && result.length < expectedMinimalLength) {
		return GUIp.common.splitSentencesInt(text,true)
	}
	return result;
}

GUIp.common.splitSentencesInt = function(text, splitQuoted) {
	var letter, buffer = '',
		end = false,
		nested = false,
		colond = false,
		result = [];
	for (var i = 0, len = text.length; i < len; i++) {
		letter = text[i];
		switch (letter) {
			case '“':
			case '«':
				nested = true;
				buffer += letter;
				break;
			case '”':
			case '»':
				if (colond || (splitQuoted && result.length > 0)) {
					end = true;
				}
				nested = false;
				buffer += letter;
				break;
			case '.':
			case '!':
			case '?':
				if (!nested) {
					end = true;
				}
				buffer += letter;
				break;
			case ':':
				colond = true;
				buffer += letter;
				break;
			case '\n':
			case ' ':
				if (end && buffer.slice(-3) === '...') {
					end = false;
				}
				if (end) {
					result.push(buffer + letter);
					buffer = '';
					end = false;
					nested = false;
					colond = false;
				} else if (buffer.length > 0) {
					buffer += letter;
				}
				break;
			default:
				buffer += letter;
		}
	}
	if (buffer.length) {
		result.push(buffer);
	}
	if (!result.length) {
		result.push(text);
	}
	return result;
};

/**
 * @param {!Date} date - Date to be modified.
 * @param {number} hours
 * @param {number} minutes
 * @param {?string} [ampm]
 * @returns {number} Numeric representation of the updated date.
 */
GUIp.common.setTime = function(date, hours, minutes, ampm) {
	if (hours === 12) {
		if (ampm === 'AM') {
			hours = 0;
		}
	} else if (ampm === 'PM') {
		hours += 12;
	}
	return date.setHours(hours, minutes, 0, 0);
};

/**
 * @param {string} s
 * @returns {!Date}
 */
GUIp.common.parseDateTime = function(s) {
	var tz = 0,
		year = 0,
		m, date;
	if ((m = /(\d+)\.(\d+)\.(\d+)\.?\s+(\d+):(\d+)\s*(?:([+-])(\d+):(\d+))?/.exec(s))) {
		if (m[6]) {
			tz = +m[7] * 60 + +m[8];
			if (m[6] === '+') tz = -tz;
			tz -= new Date().getTimezoneOffset();
		}
		year = +m[3];
		return new Date(year >= 1000 ? year : year + 2000, +m[2] - 1, +m[1], +m[4], +m[5] + tz);
	}
	if ((m = /(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+)\s*(?:([AP]M)\s*)?(?:([+-])(\d+):(\d+))?/i.exec(s))) {
		if (m[7]) {
			tz = +m[8] * 60 + +m[9];
			if (m[7] === '+') tz = -tz;
			tz -= new Date().getTimezoneOffset();
		}
		year = +m[3];
		date = new Date(year >= 1000 ? year : year + 2000, +m[1] - 1, +m[2]);
		GUIp.common.setTime(date, +m[4], +m[5] + tz, (m[6] || '').toUpperCase());
		return date;
	}
	if ((m = /(\d+) (.+?) (?:назад|ago)/i.exec(s))) {
		date = Date.now();
		switch (m[2]) {
			case 'мин.':
			case 'minute':
			case 'minutes':
				date -= +m[1] * 60e3;
				break;
			case 'ч.':
			case 'час':
			case 'hour':
			case 'hours':
				date -= +m[1] * 60 * 60e3;
				break;
			case 'дн.':
			case 'day':
			case 'days':
				date -= +m[1] * 60 * 24 * 60e3;
				break;
			default:
				date = NaN;
		}
		return new Date(date);
	}
	if (/вчера/i.test(s)) {
		return new Date(Date.now() - 60 * 24 * 60e3);
	}
	return new Date(NaN);
};

GUIp.common.formatTime = function(date, dtype) {
	var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
	if (dtype === 'fakejson') {
		return ((new Date(date - date.getTimezoneOffset() * 60000)).toJSON() || '-').slice(0,19) +
			(date.getTimezoneOffset() < 0 ? '+' : '-') +
			('0' + Math.floor(Math.abs(date.getTimezoneOffset()) / 60)).slice(-2) + ':' +
			('0' + Math.floor(Math.abs(date.getTimezoneOffset()) % 60)).slice(-2);
	} else if (dtype === 'forum') {
		var offset = (Date.now() - date) / 60000;
		if (offset < 60) {
			if (offset < 1) {
				offset++;
			}
			return Math.ceil(offset) + ' ' + (offset > 1 ? worker.GUIp_i18n.format_time_minutes : worker.GUIp_i18n.format_time_minute) + ' ' + worker.GUIp_i18n.format_time_ago;
		} else if (offset < 1440) {
			return Math.ceil(offset / 60) + ' ' + (offset / 60 > 1 ? worker.GUIp_i18n.format_time_hours : worker.GUIp_i18n.format_time_hour) + ' ' + worker.GUIp_i18n.format_time_ago;
		} else {
			if (worker.GUIp_locale === 'ru') {
				if (offset < 2880) {
					return 'вчера';
				} else if (offset < 4320) {
					return '2 дня назад';
				} else {
					return ('0' + date.getDate()).slice(-2) + '.' + ('0' + (date.getMonth() + 1)).slice(-2) + '.' + date.getFullYear();
				}
			} else {
				if (offset < 2880) {
					return '1 day ago';
				} else if (offset < 4320) {
					return '2 days ago';
				} else {
					var hpost = false,
						hours = date.getHours();
					if (hours > 11) {
						hours -= 12;
						hpost = true;
					}
					if (hours < 1) {
						hours = 12;
					}
					return months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear() + ' ' + hours + ':' + date.getMinutes() + (hpost ? 'pm' : 'am');
				}
			}
		}
	} else if (dtype === 'logger') {
		if (worker.GUIp_locale === 'ru') {
			return GUIp.common.formatTime(date,'simpledate');
		} else {
			return months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear()
		}
	} else if (dtype === 'westerndate') {
		return ('0' + (date.getMonth() + 1)).slice(-2) + '/' + ('0' + date.getDate()).slice(-2) + '/' + ('' + date.getFullYear()).slice(-2);
	} else if (dtype === 'simpledate') {
		return ('0' + date.getDate()).slice(-2) + '.' + ('0' + (date.getMonth() + 1)).slice(-2) + '.' + date.getFullYear();
	} else if (dtype === 'simpletime') {
		return ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2);
	} else if (dtype === 'simpledatetime') {
		return GUIp.common.formatTime(date,'simpletime') + (+date - Date.now() > 82800e3 /* 1 day minus 1 hour */ ? ', ' + GUIp.common.formatTime(date,'simpledate') : '');
	} else if (dtype === 'fulltime') {
		return ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2);
	} else if (dtype === 'remaining') {
		if (date < 0) date = 0;
		var hrem = Math.floor(date/60), mrem = Math.floor(date%60);
		return (hrem < 10 ? '0' : '') + hrem + ':' + (mrem < 10 ? '0' : '') + mrem;
	} else {
		return ('0' + date.getDate()).slice(-2) + '.' + ('0' + (date.getMonth() + 1)).slice(-2) + '.' + date.getFullYear() + ', ' + ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2);
	}
};

GUIp.common.setPageBackground = function(background) {
	if (background === 'cloud') {
		if (worker.GUIp_browser !== 'Opera') {
			document.body.style.backgroundImage = 'url(' + worker.GUIp_getResource('images/background.jpg') + ')';
		} else {
			worker.GUIp_getResource('images/background.jpg',document.body);
		}
	} else {
		document.body.style.backgroundImage = background ? 'url(' + background + ')' : '';
	}
};

GUIp.common.cleanComboData = function(str) {
	return str.toLowerCase().replace(/[^a-zа-яё]+/g, '');
};

GUIp.common.checkExprData = function(str) {
	try {
		GUIp.common.expr.parse(str, true);
	} catch (e) {
		worker.alert(worker.GUIp_i18n.custom_informers_error + ':\n' + str + '\n\n' + e);
		return false;
	}
	return true;
};

GUIp.common.checkExprTitle = function(str) {
	try {
		GUIp.common.expr.parseEmbedded(str);
	} catch (e) {
		worker.alert(worker.GUIp_i18n.custom_informers_error + ':\n' + str + '\n\n' + e + (
			str.includes('{') ? GUIp_i18n.custom_informers_braces_note : ''
		));
		return false;
	}
	return true;
};

/**
 * @param {string} type
 * @returns {number}
 */
GUIp.common.parseInformerType = function(type) {
	var mask = 0x0,
		bit = 0x0;
	for (var i = 0, len = type.length; i < len; i++) {
		switch (type.charCodeAt(i) | 0x20) {
			case 115: /*s*/ bit = 0x1; break;
			case 108: /*l*/ bit = 0x10; break;
			case 100: /*d*/ bit = 0x20; break;
			case 97:  /*a*/ bit = 0x40; break;
			case 114: /*r*/ bit = 0x80; break;
			// codes above once were part of public API; should not change them
			case 113: /*q*/ bit = 0x100; break;
			case 119: /*w*/ bit = 0x200; break;
			case 110: /*n*/ bit = 0x400; break;
			// 0x800 is reserved for disabling informers in the shop
			case 105: /*i*/ bit = 0x1000; break;
			case 122: /*z*/ bit = 0x2000; break;
			default: mask |= 0x80000000; continue;
		}
		mask |= mask & bit ? 0x80000000 : bit;
	}
	return mask;
};

/**
 * @param {string} type
 * @returns {(string|number)}
 */
GUIp.common.sanitizeInformerType = function(type) {
	var oldMask = 0x0,
		mask = 0x0;
	if (!type) return 0;
	oldMask = +type || GUIp.common.parseInformerType(type);
	mask = oldMask & 0x3FF1; // drop unused bits
	// correct meaningless type values to something working
	if (mask & 0x481) { // R|N|S
		mask |= 0x10; // L
	} else if (mask & 0x300 && !(mask & 0xF0)) { // (Q|W) & !(L|D|A|R)
		mask |= 0x30; // LD
	}
	if ((mask & 0xC0) === 0xC0) { // AR
		mask ^= 0x40; // !A
	}
	if ((mask & 0x300) === 0x300) { // QW
		mask ^= 0x100; // !Q
	}
	if (!mask || mask & 0x800) return mask; // unrepresentable as an alphabetic sequence
	if (mask === oldMask && +type) return +type;
	type = mask & 0x10 ? 'L' : '';
	if (mask & 0x20)  type += 'D';
	if (mask & 0x40)  type += 'A';
	if (mask & 0x80)  type += 'R';
	if (mask & 0x400) type += 'N';
	if (mask & 0x1)   type += 'S';
	if (mask & 0x100) type += 'Q';
	if (mask & 0x200) type += 'W';
	if (mask & 0x1000) type += 'I';
	if (mask & 0x2000) type += 'Z';
	return type;
};

GUIp.common.createLightbox = function(lbType,storage,def,callback,ev) {
	var inheight, inwidth, sortable,
		lightbox = document.createElement("div"),
		dimmer = document.createElement("div");

	if (ev) ev.preventDefault();
	lightbox.id = 'optlightbox';
	lightbox.className = 'e_bl_cell block';
	dimmer.id = 'optdimmer';

	lightbox.innerHTML = '		<div id="lightbox_title" style="font-weight: bold;"></div>' +
'		<div class="bl_content" style="text-align: center;">' +
'			<div id="lightbox_desc" class="e_new_line"></div>' +
'			<div id="lightbox_table" class="e_new_line" >' +
'			</div><div id="lightbox_buttons">' +
'			<input id="lightbox_add" class="input_btn" type="button" value="' + worker.GUIp_i18n.lb_add + '">' +
'			<input id="lightbox_save" class="input_btn" type="submit" value="' + worker.GUIp_i18n.lb_save + '" disabled>' +
'			<input id="lightbox_reset" class="input_btn" type="button" value="' + worker.GUIp_i18n.lb_reset + '" disabled>' +
'			<input id="lightbox_import" class="input_btn" type="button" value="' + worker.GUIp_i18n.import + '">' +
'			<input id="lightbox_export" class="input_btn" type="button" value="' + worker.GUIp_i18n.export + '" disabled>' +
'			<input id="lightbox_close" class="input_btn" type="button" value="' + worker.GUIp_i18n.lb_close + '">' +
'			</div><div id="lightbox_ieblock" class="hidden"><span id="lightbox_iedesc"></span> <input id="lightbox_iefield" type="text" size="30" value=""> <input id="lightbox_iebutton" type="button" value="OK"></div>' +
'		</div>';

	document.body.appendChild(lightbox);
	document.body.appendChild(dimmer);

	var reloadSortables = function() {
		if (sortable) {
			sortable.destroy();
		}
		sortable = GUIp.common.sortable({els: '.lightbox_row', onDrop: function() { document.getElementById('lightbox_save').disabled = false; }});
	};

	var prepareLightboxInputValue = function(value) {
		return value ? ('' + value).replace(/&/g, '&amp;').replace(/'/g, '&apos;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
	};

	var addLightboxRow = function(lbType, lbData, wantedPositioning) {
		var i, len, inputs, handler, lbRow, lbTable = document.getElementById('lightbox_table');
		lbRow = '<div class="lightbox_row"><span class="e_dragging" draggable="true">☰</span>';
		switch (lbType) {
			case 'ally_blacklist':
				lbRow += '<input type="checkbox"' + (lbData.q ? '' : ' checked') + ' title="' + worker.GUIp_i18n.lb_enable + '"> <input type="text" style="width: 22%;" value="' + prepareLightboxInputValue(lbData.n) + '"> <input type="text" style="width: 32%;" value="' + prepareLightboxInputValue(lbData.r) + '"> <input type="text" style="width: 17%;" value="' + prepareLightboxInputValue(lbData.s) + '">';
				break;
			case 'custom_craft':
				lbRow += '<input type="checkbox"' + (lbData.q ? '' : ' checked') + ' title="' + worker.GUIp_i18n.lb_enable + '"> <input type="text" style="width: 13%;" value="' + prepareLightboxInputValue(lbData.t) + '"> <input type="text" style="width: 28%;" value="' + prepareLightboxInputValue(lbData.d) + '"> <input type="text" style="width: 13%;" value="' + prepareLightboxInputValue(lbData.l) + '"> <input type="text" style="width: 13%;" value="' + prepareLightboxInputValue(lbData.g) + '">';
				break;
			case 'custom_informers':
				lbRow += '<input type="checkbox"' + (lbData.q ? '' : ' checked') + ' title="' + worker.GUIp_i18n.lb_enable + '"> <input type="text" style="width: 14%;" value="' + prepareLightboxInputValue(lbData.title) + '"> <textarea rows="1" class="taci" style="width: 50%;">' + prepareLightboxInputValue(lbData.expr) + '</textarea> <input type="text" style="width: 7%;" value="' + prepareLightboxInputValue(lbData.type) + '">';
				break;
			default:
				lbRow += '<input type="text" size="30" value="' + (typeof lbData === 'object' ? '' : prepareLightboxInputValue(lbData)) + '">';
				break;
		}
		lbRow += ' <input type="button" value="[x]"></div>';
		lbTable.insertAdjacentHTML('beforeend',lbRow);
		handler = function() {
			removeLightboxRow(this);
			changedLightbox();
		};
		inputs = lbTable.querySelectorAll('input[type="button"]:not(.improved)');
		for (i = 0, len = inputs.length; i < len; i++) {
			GUIp.common.addListener(inputs[i], 'click', handler);
			inputs[i].classList.add('improved');
		}
		inputs = lbTable.querySelectorAll('input:not(.improved), textarea:not(.improved)');
		for (i = 0, len = inputs.length; i < len; i++) {
			GUIp.common.addListener(inputs[i], 'change', changedLightbox);
			GUIp.common.addListener(inputs[i], 'input', changedLightbox);
			if (inputs[i].classList.contains('taci')) {
				GUIp.common.addListener(inputs[i], 'input', function(e) { autoresizeTextarea(e.target); });
			}
			inputs[i].classList.add('improved');
		}
	};

	var removeLightboxRow = function(input) {
		var lbTable = document.getElementById('lightbox_table');
		lbTable.removeChild(input.parentNode);
		reloadSortables();
	};

	var setLightboxTA = function(lbType, lbData) {
		var i, len, last, lbTable = document.getElementById('lightbox_table');
		while (last = lbTable.lastChild) {
			lbTable.removeChild(last);
		}
		for (i = 0, len = lbData.length; i < len; i++) {
			addLightboxRow(lbType, lbData[i]);
		}
		if (len === 0) {
			addLightboxRow(lbType, {});
		}
		reloadSortables();
		// resizing should be deferred until setting the dimensions for the lightbox table itself are done
		GUIp.common.setTimeout(function() {
			Array.prototype.forEach.call(lbTable.getElementsByClassName('taci'), function (e) {
				autoresizeTextarea(e);
			});
		}, 0);
	};

	var loadLightbox = function(lbType) {
		var lbData = storage.get('CustomWords:' + lbType);
		if (lbData) {
			try {
				lbData = JSON.parse(lbData);
			} catch (e) {
				lbData = [];
			}
			setLightboxTA(lbType,lbData);
			document.getElementById('lightbox_reset').disabled = false;
			document.getElementById('lightbox_export').disabled = false;
		} else {
			setLightboxTA(lbType,def[lbType] || []);
		}
	};

	var checkForDupes = function(parsed,key,val) {
		if (parsed.some(function(a) { return (key ? a[key] : a) === val})) {
			worker.alert(GUIp_i18n.fmt('lb_save_duplicate',val))
			return 1;
		}
		return 0;
	};

	var saveLightbox = function(lbType) {
		var i, len, items, parsed = [], lbItems, lbTable = document.getElementById('lightbox_table');
		lbItems = lbTable.querySelectorAll('input[type="checkbox"],input[type="text"],textarea');
		for (i = 0, len = lbItems.length; i < len; i++) {
			switch (lbType) {
				case 'ally_blacklist':
					items = [lbItems[i+1].value,lbItems[i+2].value,lbItems[i+3].value].map(function(s) { return s.trim(); });
					if (items[0].length) {
						if (checkForDupes(parsed,'n',items[0])) {
							return;
						}
						parsed.push({q: !lbItems[i].checked, n: items[0], r: (items[1] || ''), s: (items[2] || '')});
					}
					i += 3;
					break;
				case 'custom_craft':
					items = [lbItems[i+1].value,lbItems[i+2].value,lbItems[i+3].value,lbItems[i+4].value].map(function(s) { return s.toLowerCase().trim(); });
					if (items[0].length && items[1].length && GUIp.common.cleanComboData(items[2]) && GUIp.common.cleanComboData(items[3])) {
						parsed.push({q: !lbItems[i].checked, i: i, t: items[0], d: items[1], l: GUIp.common.cleanComboData(items[2]), g: GUIp.common.cleanComboData(items[3])});
					}
					i += 4;
					break;
				case 'custom_informers':
					items = [lbItems[i+1].value,lbItems[i+2].value,lbItems[i+3].value].map(function(s) { return s.trim(); });
					if (items[0].length && items[1].length) {
						if (lbItems[i].checked && !(GUIp.common.checkExprData(items[1]) && GUIp.common.checkExprTitle(items[0]))) {
							return;
						}
						if (checkForDupes(parsed,'title',items[0])) {
							return;
						}
						parsed.push({
							q: !lbItems[i].checked,
							title: items[0],
							expr: items[1],
							type: GUIp.common.sanitizeInformerType(items[2])
						});
					}
					i += 3;
					break;
				default:
					if ((items = lbItems[i].value.trim())) {
						if (checkForDupes(parsed,null,items)) {
							return;
						}
						parsed.push(items);
					}
			}
		}
		if (parsed.length) {
			storage.set('CustomWords:' + lbType, JSON.stringify(parsed));
			setLightboxTA(lbType,parsed);
			document.getElementById('lightbox_save').disabled = true;
			document.getElementById('lightbox_export').disabled = false;
			if (callback) { callback(); }
		} else {
			resetLightbox(lbType,true); // TODO: show error of some kind instead of silently resetting
		}
	};

	var resetLightbox = function(lbType,forced) {
		if (!forced && !worker.confirm(worker.GUIp_i18n.lb_reset_confirm)) {
			return;
		}
		setLightboxTA(lbType,def[lbType] || []);
		storage.remove('CustomWords:' + lbType);
		document.getElementById('lightbox_save').disabled = true;
		document.getElementById('lightbox_reset').disabled = true;
		document.getElementById('lightbox_export').disabled = true;
		if (callback) { callback(); }
	};

	var importLightboxData = function(lbType) {
		document.getElementById('lightbox_iefield').value = '';
		document.getElementById('lightbox_iedesc').textContent = worker.GUIp_i18n.import_prompt;
		document.getElementById('lightbox_iebutton').classList.remove('hidden');
		document.getElementById('lightbox_ieblock').classList.remove('hidden');
		lightbox.classList.add('expanded');
	};

	var importLightboxDataProcess = function(lbType) {
		var line = document.getElementById('lightbox_iefield').value;
		try {
			if (!line || !JSON.parse(line)) {
				throw '';
			}
			storage.set('CustomWords:' + lbType, line);
			setLightboxTA(lbType,JSON.parse(line));
			document.getElementById('lightbox_save').disabled = false;
			worker.alert(worker.GUIp_i18n.import_success);
			document.getElementById('lightbox_ieblock').classList.add('hidden');
			lightbox.classList.remove('expanded');
		} catch (e) {
			worker.alert(worker.GUIp_i18n.import_fail);
		}
	};

	var exportLightboxData = function(lbType) {
		var line = storage.get('CustomWords:' + lbType);
		if (line && JSON.parse(line)) {
			document.getElementById('lightbox_iefield').value = line;
			document.getElementById('lightbox_iedesc').textContent = worker.GUIp_i18n.export_prompt;
			document.getElementById('lightbox_iebutton').classList.add('hidden');
			document.getElementById('lightbox_ieblock').classList.remove('hidden');
			lightbox.classList.add('expanded');
		}
	};

	var changedLightbox = function() {
		var node;
		// in Chrome, it is possible to change <input>'s text via Ctrl+Z even if it is detached from the DOM root,
		// so we don't know if the lightbox is still opened
		if ((node = document.getElementById('lightbox_save'))) {
			node.disabled = false;
		}
		if ((node = document.getElementById('lightbox_reset'))) {
			node.disabled = false;
		}
	};

	var autoresizeTextarea = function(e) {
		e.style.height = 'auto';
		e.style.height = (e.scrollHeight + (e.offsetHeight - e.clientHeight)) + 'px';
	}

	document.getElementById('lightbox_title').textContent = worker.GUIp_i18n['lb_' + lbType + '_title'];
	document.getElementById('lightbox_desc').innerHTML = worker.GUIp_i18n['lb_' + lbType + '_desc'];
	GUIp.common.tooltips.watchSubtree(document.getElementById('lightbox_desc'));

	loadLightbox(lbType);

	var resizeLightbox = function() {
		inheight = Math.min(worker.innerHeight * 0.95, Math.max(worker.innerHeight * 0.7, 400));	// v v v
		inwidth = Math.min(worker.innerWidth * 0.95, (lbType === 'custom_informers' ? 800 : 600)); 	// fixme: do something better for extremely low width mobile screens!

		lightbox.style.width = inwidth + 'px';

		lightbox.style.visibility = 'visible';
		lightbox.style.left = worker.innerWidth/2 - (inwidth / 2) + 'px';
		lightbox.style.top = worker.innerHeight/2 - (inheight / 2) + worker.scrollY + 'px';

		document.getElementById('lightbox_table').style.overflowY = 'scroll';
		document.getElementById('lightbox_table').style.height = (inheight
			- document.getElementById('lightbox_title').getBoundingClientRect().height
			- document.getElementById('lightbox_desc').getBoundingClientRect().height
			- document.getElementById('lightbox_buttons').getBoundingClientRect().height
			- 60
		) + 'px';
	}
	worker.addEventListener('resize', resizeLightbox);
	resizeLightbox();

	var scrollLightbox = GUIp.common.try2.bind(null, function() {
		lightbox.style.left = worker.innerWidth/2 - (inwidth / 2) + 'px';
		lightbox.style.top = worker.innerHeight/2 - (inheight / 2) + worker.scrollY + 'px';
	});
	var destroyLightbox = function() {
		document.body.removeChild(dimmer);
		document.body.removeChild(lightbox);
		document.removeEventListener('scroll', scrollLightbox);
		worker.removeEventListener('resize', resizeLightbox);
	};
	document.addEventListener('scroll', scrollLightbox);
	GUIp.common.addListener(document.getElementById('lightbox_iebutton'), 'click', importLightboxDataProcess.bind(null, lbType));
	GUIp.common.addListener(document.getElementById('lightbox_add'), 'click', function() {
		addLightboxRow(lbType,{},true);
		reloadSortables();
	});
	GUIp.common.addListener(document.getElementById('lightbox_save'), 'click', saveLightbox.bind(null,lbType));
	GUIp.common.addListener(document.getElementById('lightbox_reset'), 'click', resetLightbox.bind(null,lbType,false));
	GUIp.common.addListener(document.getElementById('lightbox_import'), 'click', importLightboxData.bind(null,lbType));
	GUIp.common.addListener(document.getElementById('lightbox_export'), 'click', exportLightboxData.bind(null,lbType));
	GUIp.common.addListener(document.getElementById('lightbox_close'), 'click', destroyLightbox);
	GUIp.common.addListener(dimmer, 'click', destroyLightbox);
};

GUIp.common.sortable = function(options) {
	var dragEl, type, sortables, overClass, movingClass;
	function handleDragStart(e) {
		e.dataTransfer.effectAllowed = 'move';
		dragEl = this;
		// this/e.target is the source node.
		this.classList.add(movingClass);
		e.dataTransfer.setDragImage(this, 0, 0);
		e.dataTransfer.setData('text/html', this.innerHTML);
		options.onDragStart && options.onDragStart(e);
	}
	function handleDragOver(e) {
		if (e.preventDefault) {
			e.preventDefault(); // Allows us to drop.
		}
		e.dataTransfer.dropEffect = 'move';
		options.onDragOver && options.onDragOver(e);
		return false;
	}
	function handleDragEnter() {
		this.classList.add(overClass);
		options.onDragEnter && options.onDragEnter(e);
	}
	function handleDragLeave() {
		// this/e.target is previous target element.
		this.classList.remove(overClass);
		options.onDragLeave && options.onDragLeave(e);
	}
	function handleDrop(e) {
		var dropParent, dropIndex, dragIndex;
		// this/e.target is current target element.
		if (e.stopPropagation) {
			e.stopPropagation(); // stops the browser from redirecting.
		}
		if (dragEl !== this) {
			dragEl.innerHTML = this.innerHTML;
			this.innerHTML = e.dataTransfer.getData('text/html');
			options.onDrop && options.onDrop(e);
		}
		dragEl = null;
		return false;
	}
	function handleDragEnd() {
		for (var i = 0, len = sortables.length; i < len; i++) {
			sortables[i].classList.remove(overClass, movingClass);
		}
		options.onDragEnd && options.onDragEnd(e);
	}
	function destroy() {
		for (var i = 0, len = sortables.length; i < len; i++) {
			modifyListeners(sortables[i], false, true);
		}
		sortables = null;
		dragEl = null;
	}
	function modifyListeners(el, isAdd, flag) {
		var addOrRemove = isAdd ? 'add' : 'remove';
		el[addOrRemove + 'EventListener']('dragstart', handleDragStart);
		el[addOrRemove + 'EventListener']('dragenter', handleDragEnter);
		el[addOrRemove + 'EventListener']('dragover', handleDragOver);
		el[addOrRemove + 'EventListener']('dragleave', handleDragLeave);
		if (flag) {
			el[addOrRemove + 'EventListener']('drop', handleDrop);
			el[addOrRemove + 'EventListener']('dragend', handleDragEnd);
		}
	}
	function init() {
		sortables = Array.from(document.querySelectorAll(options.els));
		type = options.type || 'insert'; // insert or swap
		overClass = options.overClass || 'sortable-over';
		movingClass = options.movingClass || 'sortable-moving';
		for (var i = 0, len = sortables.length; i < len; i++) {
			modifyListeners(sortables[i], true, true);
		}
	}
	init();
	return {
		destroy: destroy
	};
};

GUIp.common.extrapolate = function(evidence,sample) {
	if (evidence[sample] !== undefined) { return evidence[sample]; }
	var closeMin = -Infinity, closeMax = Infinity, max = -Infinity, preMax = -Infinity, min = Infinity, preMin = Infinity, key;
	// find min and max
	for (key in evidence) {
		if (key < sample && key > closeMin) { closeMin = key; }
		if (key > sample && key < closeMax) { closeMax = key; }
		if (key > max) { preMax = max; max = key; }
		if (key < min) { preMin = min; min = key; }
		if (key < preMin && key > min) { preMin = key; }
	}
	// this is redefined if we want to extrapolate near the ends of the evidence set
	var baseValueIndex = closeMin;
	if (closeMax === Infinity) { closeMax = max; closeMin = preMax; baseValueIndex = max; }
	if (closeMin === -Infinity) { closeMax = preMin; closeMin = min; baseValueIndex = min; }
	var delta = closeMax - closeMin;
	var valDelta = evidence[closeMax] - evidence[closeMin];
	var deltaLength = (sample - baseValueIndex);
	return evidence[baseValueIndex] + (deltaLength * (valDelta / delta));
};

GUIp.common.forecastRegexes = {
	accu70: /распаковывается в 70% праны|accumulator charge restores 70%/,
	gvroads: /все дороги ведут в Годвилль|all roads lead to Godville/,
	hearing: /улучшат слышимость гласов героями|внимательно прислушиваются к гласам|с большим успехом общаться с героями|гласы с небес слышны лучше|с большей охотой реагируют на божьи гласы|heroes are a little more likely to hear and react|voices more likely to be heard|able to hear their deities|more likely to listen to their deities/,
	unhearing: /причиной искажения некоторых гласов|decrease godvoice hearing/,
	epic: /получить незапланированное эпическое|an unexpected epic quest/,
	fame: /произвести хорошее впечатление на горожан|добавить известности гильдиям|increase guild fame in towns/,
	melting: /Переплавить монеты в золотые кирпичи|выплавка кирпичей божественными влияниями|melting a golden brick with a god influence|melting gold coins into bricks/,
	retirement: /храмовладельцев хотя бы сегодня отказаться от пьянок|put more money in savings/,
	noconversion: /отрицательно влияют на свойства храмов|atmosphere is negatively affecting temples/,
	notraining: /услуги по прокачиванию умений сегодня не предоставляются|coaches went into the astral plane/,
	nopotions: /отказываются продавать лечебные снадобья|decided to stop selling healing potions|(clear|empty) their shelves of potions/,
	noequip: /магазинах снаряжения сегодня пусто|торговые лавки без нового снаряжения|left all equipment shops|without new equipment/,
	noguildhealing: /лекари не оказывают премиальных услуг за статус|No special treatment is provided to guild/,
	norstraders: /героям никто не облегчит их ношу|No one can ease the heroes. burden in the fields today|roadside traders are closed/,
	prayer: /эффективность молитв в храмах сегодня резко возрастет|increase the efficiency of all temple prayer/,
	longquests: /усложняет выполнение взятых сегодня заданий|complications in progressing with quests/,
	longauras: /ауры действуют на них гораздо дольше|increase duration of all auras|auras to stick onto the skin for longer/,
	shortauras: /ауры будут сдуваться|all auras to be half as long/,
	undead: /монстров возможно их воскрешение|monsters could self-resurrect/,
	corovans: /предрекает героям более частые встречи с вооруж.нными бандами|повышенной активности разбойничьих группировок/,
	goldmonsters: /монстра хоть что-нибудь да найдется|monsters should have something valuable/,
	goldbosses: /боссы сегодня носят заметно больше наличности|bosses to carry more gold/,
	easybosses: /Выкопать босса сегодня куда легче|underground monster lair today|likely to meet underground boss|left underground bosses sleep-deprived/,
	badtraders: /риск быть обманутым при продаже|likely to be fooled during a sale/,
	skills: /Умения сегодня используются заметно чаще|favors all skilled heroes|practicing their special skills/,
	arena: /уменьшает стоимость отправки на дуэль|magnetic cloud above the arena/,
	personality: /влияния богов сильнее склоняют чашу характера|влияния бога меняют характер героя сильнее|deeper personality changes/,
	itemloss: /массовой потере зрения и трофеев|sun could cause mass loss of|temporary loss of artifacts/,
	easyitems: /активируемые трофеи могут обходиться вдвое дешевле|half as much godpower for activation|half the normal amount of godpower/,
	cheapitems: /продать их можно лишь за сущие|artifacts, greatly decreasing/,
	pricyitems: /трофеи сегодня можно продать в..ое дороже|activatable artifacts are worth twice/,
	bingo: /награда за бинго сегодня в разы больше обычной|бинго. Награда за него сегодня куда щедрее|Bingo game today is much higher/,
	fishing: /героев садиться с удочкой почаще|are more likely to fish today|excellent fishing conditions/,
	resting: /отлеживания под деревом резко возросла|under a tree will be much more/,
	sidejobs: /(?:шанс получить|могут дать) незапланированный подряд|Unplanned side.jobs are possible|provide unscheduled side jobs/,
	tribbles: /наткнуться на триббла сегодня выше|пушисты и зубасты|Meeting a tribble is more likely/,
	sleeping: /герои с удовольствием спят чаще|heroes will happily sleep a bit more/,
	fastsell: /распродают трофеи гораздо быстрее|sell items much faster/,
	pointfall: /точки на картах возникают ближе и чаще|close and frequent spread of POIs/,
	lazypets: /не будут использовать свои способности|pets a day off, so they won.t use/,
	signs: /возможностей подать знак сегодня будет больше|increase in godly signs|more opportunities for sending god signs|heroes searching for divine signs/,
	specbosses: /боссы будут иметь эту способность|calls for mild weather with a storm of|so many bosses are wielding/,
	spoilers: /задания сегодня выдаются с (заранее проспойлеренной|уже известной) наградой|quests today come with rewards already exposed/,
	hidden: /можно только гадать, в чем именно он|в каждом прогнозе должна быть загадка|уточнять его содержимое астрологи отказываются|прогноз написан невидимыми|поля этой газеты слишком малы|astrologers refused to disclose it|can only guess about/
};

GUIp.common.parseForecasts = function(input) {
	var pos, forecast = [];
	for (var key in GUIp.common.forecastRegexes) {
		if ((pos = input.search(GUIp.common.forecastRegexes[key])) >= 0) {
			forecast.push({pos: pos, key: key});
		}
	}
	return forecast.sort(function(a, b) { return a.pos - b.pos; }).map(function(a) { return a.key; });
};

GUIp.common.parseDungeonExtras = function(xtras, impNodes, dungeonType, step) {
	var normalizedType, soffset, tmp, tmp2, changed = false,
		types = xtras.types || [],
		localizedTypesList = GUIp_words()['std_dungeon_types'],
		challenges = {
			nook:      /специальной комнате|тайной комнаты|тайной ложи|запретное место| a nook |the nook's/i,
			silence:   /подрулившим гласами не более 8 раз|finding the treasure with 8 direction voices/i,
			agility:   /дошедшим до сокровища за 40 шагов|find the reward in 40 steps/i,
			ecology:   /не тронувшим ни одного босса|prize for avoiding all bosses/i,
			genocide:  /убившим всех боссов( на любом этаже)? здесь полагается награда|prize for hunting down all bosses/i,
			survivors: /до сокровища дойдут все. Либо только двое|whole team or exactly two of the members find/i
		},
		rewards = {
			resurrection: /павшие герои будут оживлены|reviving of knocked out heroes/i,
			key:          /найти ключ, открывающий сокровищницу|key to open the treasury/i,
			hints:        /указатели на сокровище можно включить только там|switch to turn on treasure clues/i,
			dice:         /все ловушки подземелья превратятся в тайники. Или наоборот|traps will turn into secret stashes... or vice versa/i,
			gold:         /найдется бонусная порция золота|extra gold in the treasury/i,
			artifacts:    /будет больше трофеев|more artifacts in the treasury/i,
			notraps:      /ловушки в подземелье отключатся|dungeon trap disabling switch/i,
			noboss:       /охраняющий сокровищницу босс уйдет со своего поста|ousting of the treasure boss/i,
			double:       /появится двойная порция бревен|find an extra log of gopher/i,
			clarity:      /отметятся все интересные места|location of all points of interest/i,
			transformation: /подземелье изменит свой тип|dungeon will change its type/i,
			unknown:      /не доставившего горному королю письмо|без каких-либо намеков на её смысл|nobody knows what the reward/i
		},
		dungeonTypesTexts = {
			abundance:     /Almost every room here has something — either loot or a trap|Пустых комнат здесь почти нет, сплошь тайники да ловушки/i,
			antiInfluence: /Magic and influences don't work in this place because of a spell|Антибожественное покрытие туннелей экранирует влияния/i,
			clarity:       /Bright light illuminates interesting places on the map|Хорошее освещение позволяет издалека замечать интересные места/i,
			demolition:    /Miracles might destroy nearby walls|Здесь чудеса часто сносят прилегающие стены/i,
			emptiness:     /No traps, healing rooms or secret stashes here|Здесь нет ни мощных ловушек, ни серьезных лечилок, ни богатых тайников/i,
			grace:         /Almost every room in here gives a drop of godpower|Здесь почти каждая комната даёт по капле праны/i,
			halfTruth:     /Половина указателей на сокровищницу здесь врёт/i,
			highStakes:    /Winners get extra gold from the treasury, while those who are knocked out get nothing|Выжившие герои заберут все золото/i,
			hoarding:      /Most of the gold from the treasury is in the pockets of greedy bosses|Золото из сокровищницы боссы здесь носят с собой/i,
			hotness:       /All treasure hints in this dungeon play “Hot and Cold”|Указатели здесь работают по принципу «горячо-холодно»/i,
			hurry:         /In this dungeon heroes have 50 steps until evacuation instead of 100|Эвакуация здесь происходит через 50 ходов вместо 100/i,
			jumping:       /Anomalous gravity sometimes makes heroes jump over the squares|Постарайтесь не удариться головой при полетах через клетки/i,
			migration:     /Stronger bosses are not always near the treasure|Сила боссов здесь никак не связана с близостью сокровища/i,
			mystery:       /This dungeon is special, but nobody knows how|У подземелья есть особое свойство, но какое — непонятно/i,
			pledge:        /Everyone pledged one log of wood for a promise to leave the dungeon through the treasury|Здесь на входе у каждого берут в залог одно бревно/i,
			rejuvenation:  /The air here is alive and all healing|Здесь лечит сам воздух/i,
			robbery:       /to the treasury's fund to be shared among the surviving heroes|изъято в призовой фонд сокровищницы, где и будет поделено/i,
			savings:       /After finding the treasure all heroes' gold will be automatically deposited|В сокровищнице вся наличность героев автоматически перейдёт в их сбережения/i,
			solitude:      /All bosses have left, leaving traps instead|Боссы ушли, расставив вместо себя ловушки/i,
			surprise:      /Quiet, but weak bosses tend to appear out of nowhere and attack all of a sudden|Боссы здесь тихие и ослабленные/i,
			toxicity:      /Toxic gas in the passages worsens the health of explorers|Ядовитый газ в коридорах подрывает здоровье исследователей/i,
			uncertainty:   /All direction arrows here are double-minded|Указатели на сокровищницу здесь никак не могут определиться/i,
			wealth:        /Gold seems to be scattered all over the place|Деньги тут валяются прямо под ногами/i,
			woodness:      /This dungeon has double the amount of wood in the treasury|В сокровищнице двойная порция бревен/i
		};
	if (!xtras.nookOffset) {
		xtras.nookOffset = GUIp.common.calculateSpecOffset('nook');
		changed = true;
	}
	if (!xtras.stairsOffset && !GUIp.common.isDungeonCellar() && (soffset = GUIp.common.calculateSpecOffset('stairs')).x !== null) {
		xtras.stairsOffset = soffset;
		changed = true;
	}
	if (impNodes.length) {
		Array.prototype.map.call(impNodes, function(a) { return a.textContent; }).forEach(function(text) {
			for (var key in challenges) {
				if (challenges[key].test(text) && key !== xtras.challenge) {
					xtras.challenge = key;
					for (var key in rewards) {
						if (rewards[key].test(text)) {
							xtras.reward = key;
							break;
						}
					}
					if (!xtras.reward) xtras.reward = 'unknown';
					changed = true;
					break;
				}
			}
			for (var key in dungeonTypesTexts) {
				if (!types.includes(key) && (tmp = text.match(dungeonTypesTexts[key]))) {
					// we want the types exactly in the order they were mentioned in the text
					if (tmp2 < tmp.index) {
						types.push(key);
					} else {
						types.unshift(key);
					}
					tmp2 = tmp.index;
					xtras.types = types;
					changed = true;
				}
			}
		});
		if (xtras.types) {
			xtras.typesLoc = xtras.types.map(function(type) { return localizedTypesList[type] || type; });
		}
	}
	if (dungeonType) {
		if (dungeonType.textContent) {
			normalizedType = Object.keys(localizedTypesList).find(function(key) { return dungeonType.textContent.includes(localizedTypesList[key]); }) || 'multi';
		} else {
			normalizedType = dungeonType;
		}
		if (normalizedType !== xtras.initialType) {
			xtras.type = xtras.initialType = normalizedType; // transformation challenge reward could change the dungeon type, so we need to store both declared dungeon type and possibly detected one
			xtras.typeLoc = localizedTypesList[xtras.type] || xtras.type;
			xtras.typeStep = step;
			if (xtras.transformationPending) {
				xtras.transformationComplete = true;
				delete xtras.transformationPending;
			}
			changed = true;
		}
		// explain combined dungeon type using a tooltip
		if (dungeonType.textContent) {
			dungeonType.classList.add('e_dtype');
			GUIp.common.explainDungeonType(xtras, dungeonType);
		}
	}
	return changed;
};

GUIp.common.explainDungeonType = function(xtras, node) {
	node = node || document.getElementsByClassName('e_dtype')[0];
	if (node.textContent && xtras.type === 'multi' && xtras.types && xtras.types.length > 1 && !document.getElementsByClassName('e_dtype_explained').length) {
		var tmp;
		// let's try to attach a tooltip exactly on the word we want to explain
		// but if it won't succeed, just put the tooltip on the whole line
		if (node.textContent && (tmp = node.textContent.match(new RegExp(' (' + xtras.typesLoc[0].slice(0,2) + '.+?)($|,| )')))) {
			// putting the word into a span; looks ugly, but i don't care.
			node.innerHTML = node.innerHTML.replace(tmp[1],'<span class="e_dtype_explained">' + tmp[1] + '</span>');
			node = node.firstElementChild;
		}
		node.title = xtras.typesLoc.join(' + ');
		GUIp.common.tooltips.watchSubtree(node);
	}
};

GUIp.common.checkParsedDungeonType = function(extras, type) {
	return extras.type === type || extras.type === 'multi' && extras.types && extras.types.includes(type);
};

/**
 * dmapAuxCache[i][j] contains data about dungeon map cells (with coordinates relative to exit/staircase, shifted +100 in the basement):
 * 0x01 - visited cell
 * 0x02 - exclamation mark
 * 0x04 - wall
*/
GUIp.common.dmapAuxCache = {};
/**
 * GUIp.common.dmapAuxProc(options): option
 * shown              - display restored exclamations or walls on the map
 * processExclamations - write exclamations data
 * processWalls        - write walls data
*/
GUIp.common.dmapAuxProc = function(options) {
	if (!options.processExclamations && !options.processWalls) {
		return;
	}
	var isMapInCellar = GUIp.common.isDungeonCellar(),
		cellarShift = isMapInCellar ? 100 : 0,
		exitPos = GUIp.common.calculateExitXY(isMapInCellar),
		mapCells = document.getElementsByClassName('dml'),
		mapCache = GUIp.common.dmapAuxCache;
	var ki, kj, kcontent;
	for (var i = 0, len = mapCells.length; i < len; i++) {
		for (var j = 0, len2 = mapCells[i].children.length; j < len2; j++) {
			// pos relative to exit
			ki = i - exitPos.y + cellarShift;
			kj = j - exitPos.x + cellarShift;
			// current cell content
			kcontent = mapCells[i].children[j].textContent.trim();
			switch (kcontent) {
			case '@':
				// for now keeping track of cells we've visited is only useful for demolition dungeons (see below)
				if (options.processWalls) {
					if (!mapCache[ki]) mapCache[ki] = {};
					mapCache[ki][kj] |= 0x01;
				}
				break; // in this case we may also need to check if we're already standind on a cell with a demolished wall
			case '!':
				if (options.processExclamations) {
					if (!mapCache[ki]) mapCache[ki] = {};
					mapCache[ki][kj] |= 0x02;
				}
				continue; // and in this case no need for other checks, just skip to the next cell in a loop immediately
			case '#':
				if (options.processWalls) {
					if (!mapCache[ki]) mapCache[ki] = {};
					mapCache[ki][kj] |= 0x04;
				}
				continue; // same here
			}
			if (mapCache[ki] && mapCache[ki][kj]) {
				if (options.processExclamations && (mapCache[ki][kj] & 0x02) && kcontent === '?') {
					// we have 0x02 in cache but cell contains '?', so probably earlier here was the exclamation in a clarity dungeon
					if (options.shown) {
						mapCells[i].children[j].textContent = '!';
						mapCells[i].children[j].classList.remove('notAWall');
						mapCells[i].children[j].classList.add('restoredExcl');
					} else {
						mapCells[i].children[j].classList.add('seenExcl');
					}
				}
				if (options.processWalls && (mapCache[ki][kj] & 0x04) && kcontent !== '#') {
					// we have 0x04 in cache but cell doesn't contain '#', so probably earlier here was a wall that was demolished
					if (options.shown) {
						mapCells[i].children[j].classList.add('demolishedWall');
					}
					// also if we haven't stepped onto this cell earlier, we should use an additional class to mark it
					// (so basically this cell should be treated as '?' in GUIp.common.improveMap no matter it is empty)
					if (!(mapCache[ki][kj] & 0x01)) {
						mapCells[i].children[j].classList.add('demolishedWallNotExplored');
					}
				}
			}
		}
	}
};

GUIp.common.dmapDisabledPointersCache = [];
GUIp.common.dmapDisabledPointersMark = function() {
	var x, y, isMapInCellar = GUIp.common.isDungeonCellar(),
		cellarShift = isMapInCellar ? 100 : 0,
		exitPos = GUIp.common.calculateExitXY(isMapInCellar),
		mapCells = document.getElementsByClassName('dml'),
		mapCache = GUIp.common.dmapDisabledPointersCache;
	// remove every existing .disabledPointer and its cell title additions, if any
	Array.prototype.forEach.call(document.querySelectorAll('.dml .disabledPointer'), function(cell) {
		cell.classList.remove('disabledPointer');
		cell.title = cell.title.replace(new RegExp('(\\[' + worker.GUIp_i18n.map_pointer + ': .*?\\]) \\(' + worker.GUIp_i18n.map_pointer_disabled + '\\)'),'$1');
	});
	// mark everything again, basically after map was rebuilt or when a pointer was switched
	mapCache.forEach(function(pair) {
		x = pair[0] + exitPos.x - cellarShift;
		y = pair[1] + exitPos.y - cellarShift;
		if (mapCells[y] && mapCells[y].children[x]) {
			mapCells[y].children[x].classList.add('disabledPointer');
			// for now add disablance notices only for pointers that are already properly titled
			if (mapCells[y].children[x].title.includes('[' + worker.GUIp_i18n.map_pointer + ':')) {
				mapCells[y].children[x].title = mapCells[y].children[x].title.replace(new RegExp('(\\[' + worker.GUIp_i18n.map_pointer + ': .*?\\])'),'$1 (' + worker.GUIp_i18n.map_pointer_disabled + ')');
			}
		}
	});
};

GUIp.common.dmapDisabledPointersSwitch = function(cell, saveCallback, highlightCallback) {
	var idx, isMapInCellar = GUIp.common.isDungeonCellar(),
		cellarShift = isMapInCellar ? 100 : 0,
		coords = GUIp.common.calculateXY(cell),
		exit_coords = GUIp.common.calculateExitXY(isMapInCellar),
		mapDistinctCells = document.getElementsByClassName('dmc'),
		mapCache = GUIp.common.dmapDisabledPointersCache;
	// we need relative coords
	coords.x = coords.x - exit_coords.x + cellarShift;
	coords.y = coords.y - exit_coords.y + cellarShift;
	// basically this we want to "toggle" this pointer
	if ((idx = mapCache.findIndex(function(pair) {
			if (pair[0] === coords.x && pair[1] === coords.y) {
				return true;
			}
			return false;
	})) >= 0) {
		mapCache.splice(idx, 1);
	} else {
		mapCache.push([coords.x, coords.y]);
	}
	// save whatever the result was
	saveCallback();
	// then apply updated .disabledPointer classes
	GUIp.common.dmapDisabledPointersMark();
	// and finally redraw matched cells again
	Array.prototype.forEach.call(mapDistinctCells, function(cell) {
		cell.classList.remove('pointerMatched');
		cell.classList.remove('pointerMatchedThermo');
	});
	highlightCallback();
};

GUIp.common.dmapDisabledPointersBind = function(saveCallback, highlightCallback) {
	if (GUIp.common.dmapDisabledPointersCache.length) {
		GUIp.common.dmapDisabledPointersMark();
	}
	// we want to bind this to the whole dungeon map container as this way we will be able to prevent events to propagate in all browsers,
	// while per-cell bindings seems to allow preventing propagation in chrome only
	var node = document.getElementsByClassName('dml')[0];
	if (node && (node = node.parentNode) && !node.dataset.ePointerSwitcher) {
		node.dataset.ePointerSwitcher = true;
		var tmout, target, switched = false,
			process = function(e) {
				// fixup for new nested cells in dungeon map - we need to support both new and old markup
				target = e.target.classList.contains('dmc') ? e.target : e.target.parentNode;
				// we're obviously interested in those cells that are pointer markers only
				if (target.classList.contains('pointerMarker') || /[←→↓↑↙↘↖↗⌊⌋⌈⌉∨<∧>╠╣╦╩✺☀♨☁❄✵]/.test(target.textContent)) {
					tmout = GUIp.common.setTimeout(function() {
						switched = true;
						GUIp.common.dmapDisabledPointersSwitch(target, saveCallback, highlightCallback);
						// if we got here on touch devices, it means we should also have a tooltip already popped up
						// so politely ask it to remove itself
						GUIp.common.tooltips.hide();
					},12e2);
				}
			},
			cancel = function() {
				worker.clearTimeout(tmout);
			};
		GUIp.common.addListener(node, 'mousedown', function(e) {
			// we're interested only in left mouse button,
			// and touch devices doesn't seem to be able to produce prolonged "click" emulation
			if (e.button !== 0 || GUIp.common.isTouching) { return; }
			process(e);
		}, true);
		GUIp.common.addListener(node, 'click', function(e) {
			// we don't want to process other click handlers when switching pointers,
			// but we do want them to act normally in all other cases
			if (switched) {
				switched = false;
				e.stopPropagation();
			}
			cancel();
		}, true);
		GUIp.common.addListener(node, 'touchstart', process, true);
		GUIp.common.addListener(node, 'touchend', cancel);
		GUIp.common.addListener(node, 'touchmove', cancel);
	}
};

// fixme: for now this simply moves cell titles from sub elements to their parents to restore the old markup the UI dungeon code historically relies on
GUIp.common.dmapTitlesFixup = function(mapCells) {
	Array.prototype.forEach.call(mapCells, function(row) {
		Array.prototype.forEach.call(row.children, function(cell) {
			if (cell.firstElementChild && cell.firstElementChild.title) {
				if (!cell.title) {
					cell.title = cell.firstElementChild.title;
				}
				cell.firstElementChild.removeAttribute('title');
			}
		});
	});
};

GUIp.common.dmapCoords = function() {
	var exitPos = GUIp.common.calculateExitXY(),
		mapCells = document.getElementsByClassName('dml');
	var ki, kj, kcontent;
	for (var i = 0, len = mapCells.length; i < len; i++) {
		for (var j = 0, len2 = mapCells[i].children.length; j < len2; j++) {
			// pos relative to exit
			ki = i - exitPos.y;
			kj = j - exitPos.x;
			// write coords to title
			kcontent = kj+';\xA0'+(-ki); // nbsp
			if (!mapCells[i].children[j].title.includes('[' + kcontent + ']')) {
				mapCells[i].children[j].title = '[' + kcontent + '] ' + (mapCells[i].children[j].title[0] === '#' ? '\n' : '') + mapCells[i].children[j].title;
			}
		}
	}
};

GUIp.common.dmapDimensions = function() {
	var rows, cols, mapCells = document.getElementsByClassName('dml');
	if (!mapCells.length) return '[0×0]';
	var checkForEdge = function(cells) {
		return Array.prototype.some.call(cells, function(a) { return !(a.classList.contains('dmw') || a.classList.contains('absolutelyUnknown')) });
	};
	rows = mapCells.length;
	cols = mapCells[0].children.length;
	if (checkForEdge(mapCells[0].children)) rows++;
	if (checkForEdge(mapCells[mapCells.length-1].children)) rows++;
	if (checkForEdge(Array.prototype.map.call(mapCells, function(a) { return a.children[0]; }))) cols++;
	if (checkForEdge(Array.prototype.map.call(mapCells, function(a) { return a.children[a.children.length - 1]; }))) cols++;
	return '['+cols+'×'+rows+']';
};

/**
 * @param {!Array<{q: boolean, n: string}>} marks
 * @returns {!Object<string, {q: boolean, n: string}>}
 */
GUIp.common.preprocessPlayerBlacklist = function(marks) {
	var result = Object.create(null),
		mark;
	for (var i = 0, len = marks.length; i < len; i++) {
		mark = marks[i];
		if (!mark.q) {
			result[mark.n] = mark;
		}
	}
	return result;
};

/**
 * @param {!NodeList} players
 * @param {!Object<string, {r: string, s: string}>} marks
 */
GUIp.common.markBlacklistedPlayers = function(players, marks) {
	var playerName = '',
		player, mark;
	for (var i = 0, len = players.length; i < len; i++) {
		player = players[i];
		playerName = player.textContent;
		if (player.tagName !== 'A') {
			playerName = (/\((.*)\)/.exec(playerName) || [, playerName])[1];
		}
		if ((mark = marks[playerName])) {
			if (!player.classList.contains('e_player_marked')) {
				player.classList.add('e_player_marked');
				// save old title and style
				player.dataset.etitle = player.title;
				player.dataset.ecss = player.style.cssText;
			}
			player.title = GUIp_i18n.player_marked + (mark.r ? ':\n' + mark.r : '');
			player.style.cssText = player.dataset.ecss + (mark.s ? ' ' + mark.s : '');
		} else if (player.classList.contains('e_player_marked')) {
			player.classList.remove('e_player_marked');
			player.title = player.dataset.etitle || '';
			player.style.cssText = player.dataset.ecss || '';
		}
	}
};

GUIp.common.cleanupLogStorage = function() {
	if (localStorage.getItem('LogDB:cleanupDate') === GUIp.common.formatTime(new Date(),'logger')) {
		return;
	}
	// make a list of logs marked as a current one for whatever account
	var logID, i = 0, exemptLogs = [],
		patternCurrent = /eGUI_[^:]+:Log:current$/,
		patternLogs = /eGUI_[^:]+:Log:([^:]+):/;
	for (var key in localStorage) {
		if (patternCurrent.test(key)) {
			exemptLogs.push(localStorage.getItem(key));
		}
	}
	for (var key in localStorage) {
		if ((logID = key.match(patternLogs)) && !exemptLogs.includes(logID[1])) {
			i++;
			localStorage.removeItem(key);
		}
	}
	localStorage.setItem('LogDB:cleanupDate',GUIp.common.formatTime(new Date(),'logger'));
	GUIp.common.debug('old log keys cleaned up:', i);
};

GUIp.common.erinome_url = 'https://gv.erinome.net';
GUIp.common.erinome_url_en = 'https://gvg.erinome.net';
/**
 * @alias GUIp.common.activities
 * @namespace
 */
var ui_cact = GUIp.common.activities = {};

/**
 * @typedef {Object} GUIp.common.activities.DiaryEntry
 * @property {number} date
 * @property {string} type - 'influence', 'foreignVoice', or 'regular'
 * @property {string} msg
 * @property {string} logID
 */

/**
 * @typedef {Object} GUIp.common.activities.LastFightsEntry
 * @property {number} date
 * @property {string} type
 * @property {string} logID
 * @property {boolean} success
 */

/**
 * @typedef {Object} GUIp.common.activities.Activity
 * @property {string} type
 * @property {number} date
 * @property {number} result - (-1) if unknown
 * @property {string} logID
 */

/**
 * @private
 * @typedef {Object} GUIp.common.activities.ActivityStatus
 * @property {boolean} reliable
 * @property {number} lastRevised
 */

/** @const */
ui_cact.storageTime = 2678400e3; // 31 days

/** @const */
ui_cact.guaranteeArr = [
	{
		type: 'spar',
		number: 1,
		timeout: 86400e3 // 24h
	}, {
		type: 'dungeon',
		number: 2,
		timeout: 86400e3 // 24h
	}, {
		type: 'mining',
		number: 3,
		timeout: 86400e3 // 24h
	}, {
		type: 'conversion',
		number: 1,
		timeout: 129600e3 // 36h
	}, {
		type: 'souls',
		number: 3,
		timeout: 86400e3 // 24h
	}
];

/** @const */
ui_cact.maxTimeout = 129600e3; // 36h

/** @const */
ui_cact.guarantee = {
	spar:       ui_cact.guaranteeArr[0],
	dungeon:    ui_cact.guaranteeArr[1],
	mining:     ui_cact.guaranteeArr[2],
	conversion: ui_cact.guaranteeArr[3],
	souls:      ui_cact.guaranteeArr[4]
};

ui_cact._dateGE = function(act) { return act.date >= this; };

/**
 * @param {{get: function(string): ?string}} storage
 * @returns {!Array<!GUIp.common.activities.Activity>}
 */
ui_cact.load = function(storage) {
	return GUIp.common.filterInPlace(
		GUIp.common.parseJSON(storage.get('ThirdEye:Activities')) || [],
		ui_cact._dateGE,
		Date.now() - ui_cact.storageTime
	);
};

/**
 * @param {{set: function(string, string)}} storage
 * @param {!Array<!GUIp.common.activities.Activity>} activities
 */
ui_cact.save = function(storage, activities) {
	storage.set('ThirdEye:Activities', JSON.stringify(activities));
};

/**
 * @param {!Array<!GUIp.common.activities.Activity>} activities
 * @returns {!Object<string, !GUIp.common.activities.Activity>}
 */
ui_cact.createActivitiesDict = function(activities) {
	var result = Object.create(null), act;
	for (var i = 0, len = activities.length; i < len; i++) {
		act = activities[i];
		// the only truly unique and reliable key is log's ID. dates are neither unique (spar followed by conversion can
		// happen within a minute) nor reliable (wrong date might be shown on log pages). unfortunately, conversion
		// events do not have an ID
		result[act.type+(act.logID || act.date)] = act;
	}
	return result;
};

/**
 * @param {{get: function(string): ?string}} storage
 * @returns {!Object<string, !GUIp.common.activities.ActivityStatus>}
 */
ui_cact.loadStatuses = function(storage) {
	var statuses = GUIp.common.parseJSON(storage.get('ThirdEye:ActivityStatuses')),
		template = {
		// presumption of innocence
		spar:       {reliable: true, lastRevised: 0},
		dungeon:    {reliable: true, lastRevised: 0},
		mining:     {reliable: true, lastRevised: 0},
		souls:      {reliable: true, lastRevised: 0},
		conversion: {reliable: true, lastRevised: 0}
	};
	return statuses ? Object.assign(template, statuses) : template;
};

/**
 * @param {{set: function(string, string)}} storage
 * @param {!Object<string, !GUIp.common.activities.ActivityStatus>} statuses
 */
ui_cact.saveStatuses = function(storage, statuses) {
	storage.set('ThirdEye:ActivityStatuses', JSON.stringify(statuses));
};

/**
 * @param {!GUIp.common.activities.ActivityStatus} status
 * @param {boolean} reliable
 * @param {number} date
 */
ui_cact.updateStatus = function(status, reliable, date) {
	if (date >= status.lastRevised) { // overwrite if dates are equal
		status.reliable = reliable;
		status.lastRevised = date;
	}
};

ui_cact._byDate = function(a, b) { return a.date - b.date; };

/**
 * @param {string} godName
 * @returns {!Array<!GUIp.common.activities.DiaryEntry>}
 */
ui_cact.readThirdEyeFromLS = function(godName) {
	var obj = GUIp.common.parseJSON(localStorage['d_i_' + godName]),
		result = [],
		entries, entry;
	if (!obj) return result;
	entries = Object.values(obj);
	for (var i = 0, len = entries.length; i < len; i++) {
		entry = entries[i];
		if (!entry || entry.s === 'del' || !entry.time || !entry.msg) {
			continue;
		}
		result.push({
			date: Date.parse(entry.time),
			type: entry.infl ? 'influence' : 'regular',
			msg: entry.msg,
			logID: entry.f_id || ''
		});
	}
	return result.sort(ui_cact._byDate);
};

/**
 * @param {!Array<number>} gaps
 * @param {number} moment
 * @returns {boolean}
 */
ui_cact.gapsInclude = function(gaps, moment) {
	for (var i = 1, len = gaps.length; i < len; i += 2) {
		if (moment < gaps[i] && moment > gaps[i - 1]) {
			return true;
		}
	}
	return false;
};

/**
 * @param {{set: function(string, string)}} storage
 * @param {!Array<!GUIp.common.activities.DiaryEntry>} te
 * @param {!Array<number>} gaps
 * @param {!Array<!GUIp.common.activities.Activity>} activities
 * @param {!Array<!GUIp.common.activities.ActivityStatus>} statuses
 * @param {!Array<!GUIp.common.activities.LastFightsEntry>} fights
 * @returns {boolean} true iff we've learned something from the fight list.
 */
ui_cact.updateLastFights = function(storage, te, gaps, activities, statuses, fights) {
	var dict = ui_cact.createActivitiesDict(activities),
		len = te.length,
		earliestTEDate = len ? te[0].date : Infinity,
		seenInTE = Object.create(null),
		now = Date.now(),
		threshold = now - ui_cact.storageTime,
		changed = false,
		changedStatuses = false,
		i, f, act;
	for (i = 0; i < len; i++) {
		seenInTE[te[i].logID] = true;
	}
	for (i = 0, len = fights.length; i < len; i++) {
		f = fights[i];
		if (!(f.type in ui_cact.guarantee) || f.date < threshold) {
			continue; // not interested
		} else if ((act = dict[f.type+f.logID])) {
			if (act.date !== f.date) {
				// if we discovered that activity from its log page, it might have wrong date (off by a minute)
				act.date = f.date;
				changed = true;
			}
			if (f.date > earliestTEDate && !(f.logID in seenInTE)) {
				// we discovered that activity from its log page, but can't see it in the Third Eye.
				// seems that this type of activities is disabled in the Third Eye's settings
				ui_cact.updateStatus(statuses[f.type], false, f.date);
				changedStatuses = true;
			}
			continue;
		}
		activities.push({type: f.type, date: f.date, result: -f.success, logID: f.logID});
		changed = true;
		if (!ui_cact.gapsInclude(gaps, f.date)) {
			// we should have seen this in the Third Eye, but we haven't
			ui_cact.updateStatus(statuses[f.type], false, f.date);
			changedStatuses = true;
		}
	}
	if ((len = gaps.length) && now - (i = gaps[len - 1]) < ui_cact.guarantee.conversion.timeout) {
		// we had a gap in the Third Eye during which hero could convert gold into experience,
		// and we will never know whether he/she actually did it
		activities.push({type: 'conversion', date: i, result: -1, logID: ''});
		changed = true;
	}
	if (changed) {
		ui_cact.save(storage, activities.sort(ui_cact._byDate));
	}
	if (changedStatuses) {
		ui_cact.saveStatuses(storage, statuses);
	}
	if (len) {
		storage.set('ThirdEye:Gaps', '[]');
	}
	return changed || changedStatuses || !!len;
};

/**
 * @param {string} name
 * @returns {string}
 */
ui_cact.parseFightType = function(name) {
	if (/Подземелье|Dungeon/.test(name)) {
		return 'dungeon';
	} else if (/Заплыв|Sail/.test(name)) {
		return 'sail';
	} else if (/Полигон|Datamine/.test(name)) {
		return 'mining';
	} else if (/Тренировка|Challenge/.test(name)) {
		return 'spar';
	} else if (/Арена|Arena/.test(name)) {
		return 'arena';
	} else if (/Отряд|Group/.test(name)) { // there are no monster groups in English Godville
		return 'multi_monster';
	} else {
		return 'monster';
	}
};

/**
 * @param {number} len
 * @param {number} seed
 * @returns {string}
 */
ui_cact.generateBookWord = function(len, seed) {
	var result = '';
	seed = seed >>> 0 || 1;
	while (len-- > 0) {
		seed = seed * 48271 % 0x7FFFFFFF; // minstd_rand
		result += '┌┐└┘├┤┬┴┼═║╒╓╔╕╖╗╘╙╚╛╜╝╞╟╠╡╢╣╤╥╦╧╨╩╪╫╬'[seed % 38];
	}
	return result;
};

/**
 * @param {!GUIp.common.activities.Activity} act
 * @param {?Object} [desc]
 * @returns {{class: string, content: string, title: string}}
 */
ui_cact.describe = function(act, desc) {
	if (!desc) {
		desc = {class: '', content: '', title: ''};
	}
	if (act.result < 0 || act.type === 'souls' && act.src < 2) {
		switch (act.type) {
			case 'dungeon': desc.title = GUIp_i18n.open_dungeon_chronicle; break;
			case 'mining': desc.title = GUIp_i18n.mining_chronicle_unknown_result; break;
			case 'spar': desc.title = GUIp_i18n.open_spar_chronicle; break;
			case 'souls': desc.title = GUIp_i18n.open_dungeon_chronicle_souls; break;
			default: throw new Error('unexpected activity type: ' + act.type);
		}
		desc.class = 'e_fight_result_unknown e_fight_result_unknown_' + act.type;
		desc.content = '?';
	} else if (!act.result) {
		desc.class = desc.content = desc.title = '';
	} else {
		switch (act.type) {
			case 'dungeon':
				desc.class = 'e_fight_result_log';
				desc.content = '●'.repeat(act.result); // small, but it has the best support across browsers and OSes
				desc.title = act.result === 1 ? GUIp_i18n.got_log : GUIp_i18n.got_2_logs;
				break;
			case 'mining':
				desc.class = 'e_fight_result_byte';
				desc.content = ui_cact.generateBookWord(act.result, act.date * 1e-3);
				desc.title = act.result === 1 ? GUIp_i18n.got_byte : act.result === 2 ? GUIp_i18n.got_2_bytes : GUIp_i18n.got_3_bytes;
				break;
			case 'spar':
				desc.class = 'e_fight_result_exp';
				desc.content = '★';
				desc.title = GUIp_i18n.got_exp;
				break;
			case 'souls':
				desc.class = 'e_fight_result_soul';
				desc.content = act.result;
				desc.title = act.result === 1 ? GUIp_i18n.got_soul : GUIp_i18n.got_2_souls;
				break;
			default:
				throw new Error('unexpected activity type: ' + act.type);
		}
	}
	return desc;
};
/**
 * @alias GUIp.common.expr
 * @namespace
 */
var ui_cexpr = GUIp.common.expr = {};

/**
 * @readonly
 * @type {?function(string): {type: string}}
 */
ui_cexpr.jsep = null;

/**
 * @private
 * @param {!Array<{type: string}>} items
 */
ui_cexpr._transformArray = function(items) {
	for (var i = 0, len = items.length; i < len; i++) {
		items[i] = ui_cexpr._transformAST(items[i], false);
	}
};

/**
 * @private
 * @param {{type: string}} node
 * @param {boolean} detectGV
 * @returns {{type: string}}
 */
ui_cexpr._transformMember = function(node, detectGV) {
	var prop = node.property;
	if (node.computed) {
		prop = ui_cexpr._transformAST(prop, false);
	} else if (prop.type !== 'Identifier') {
		// a bug in JSEP
		prop = {type: 'Identifier', name: prop.raw || 'this'};
	}
	var staticProperty = node.computed && prop.type === 'Literal' ? prop.value : prop.name;
	if (
		staticProperty === 'constructor' ||
		staticProperty === 'prototype' ||
		staticProperty === '__proto__'
	) {
		throw new Error('unsafe property "' + staticProperty + '"');
	}

	var obj = node.object = ui_cexpr._transformAST(node.object, false),
		valueType = typeof obj.value;
	if (/*obj.type === 'Literal' &&*/ (valueType === 'object' || valueType === 'function')) {
		// check for typos in properties at compile-time
		if (!node.computed && !(obj.value && prop.name in obj.value)) {
			throw new Error('unknown variable "' + obj.raw + '.' + prop.name + '"');
		}
		if (detectGV && obj.type === 'E_GVLiteral') {
			return {
				type: 'E_GVExpression',
				property: node.computed ? prop : {
					type: 'Literal',
					value: prop.name,
					raw: '"' + prop.name + '"' // no need to escape
				}
			};
		}
	}

	node.property = prop;
	return node;
};

ui_cexpr._transformers = {
	Literal: function(node) {
		if (node.raw === 'gv') {
			node.type = 'E_GVLiteral';
		}
		return node;
	},

	Identifier: function(node) {
		// unknown identifiers are treated as (unquoted) strings
		return {
			type: 'Literal',
			value: node.name,
			raw: '"' + node.name + '"' // no need to escape
		};
	},

	ArrayExpression: function(node) {
		ui_cexpr._transformArray(node.elements);
		return node;
	},

	ConditionalExpression: function(node, inBooleanContext) {
		if (!node.test) {
			// I hope this is not assumed to be a feature by JSEP guys
			throw new Error('"ConditionalExpression" without a test');
		}
		node.test       = ui_cexpr._transformAST(node.test, true);
		node.consequent = ui_cexpr._transformAST(node.consequent, inBooleanContext);
		node.alternate  = ui_cexpr._transformAST(node.alternate, inBooleanContext);
		return node;
	},

	LogicalExpression: function(node, inBooleanContext) {
		if (!node.left) {
			// same hell as with ConditionalExpression
			throw new Error('"LogicalExpression" without left child');
		}
		node.left  = ui_cexpr._transformAST(node.left, inBooleanContext);
		node.right = ui_cexpr._transformAST(node.right, inBooleanContext);
		return node;
	},

	UnaryExpression: function(node) {
		if (!node.argument) {
			// same hell as with ConditionalExpression
			throw new Error('"UnaryExpression" without an argument');
		}
		node.argument = ui_cexpr._transformAST(node.argument, node.operator === '!' && node.prefix);
		return node;
	},

	BinaryExpression: function(node, inBooleanContext) {
		if (!node.left) {
			// same hell as with ConditionalExpression
			throw new Error('"BinaryExpression" without left child');
		}
		var op = node.operator,
			lhs = ui_cexpr._transformAST(node.left, false),
			rhs = ui_cexpr._transformAST(node.right, false),
			insensitive, negated;
		if ((negated = (insensitive = op === '!~*') || op === '!~')) {
			// a !~ b desugars to !(a ~ b)
			inBooleanContext = true;
		} else if (!(insensitive = op === '~*') && op !== '~') {
			// generic binary operator
			node.left = lhs;
			node.right = rhs;
			return node;
		}

		// regex operator
		return {
			type: 'E_MatchExpression',
			text: lhs,
			pattern: rhs,
			insensitive: insensitive,
			negated: negated,
			testOnly: inBooleanContext
		};
	},

	MemberExpression: function(node) {
		return ui_cexpr._transformMember(node, true);
	},

	CallExpression: function(node) {
		// we do not want to transform gv.inventoryHasType("coolstory-box") into
		// gvCache("inventoryHasType")("coolstory-box") since: 1. it's pointless, and 2. it loses "this"
		node.callee = (node.callee.type === 'MemberExpression' ? ui_cexpr._transformMember : ui_cexpr._transformAST)(
			node.callee, false
		);
		ui_cexpr._transformArray(node.arguments);
		return node;
	}
};

/**
 * @private
 * @param {{type: string}} node
 * @param {boolean} [inBooleanContext]
 * @returns {{type: string}}
 */
ui_cexpr._transformAST = function(node, inBooleanContext) {
	var f = ui_cexpr._transformers[node.type];
	if (!f) {
		throw new Error('"' + node.type + '" is unsupported');
	}
	return f(node, inBooleanContext);
};

/**
 * @param {string} text
 * @param {boolean} [inBooleanContext]
 * @returns {{type: string}}
 */
ui_cexpr.parse = function(text, inBooleanContext) {
	if (typeof text !== 'string' || text.length > 2048) {
		throw new Error('expression is too long');
	}
	return ui_cexpr._transformAST(ui_cexpr.jsep(text), !!inBooleanContext);
};

ui_cexpr._getFirstChar = function(m0) { return m0[0]; };

/**
 * @private
 * @param {string} fragment
 * @returns {string}
 */
ui_cexpr._processTextFragment = function(fragment) {
	var regex = /\bgv\.(\w+)/g, m;
	while ((m = regex.exec(fragment))) {
		if (!(m[1] in ui_cexpr.gvAPIObject)) {
			throw new Error('unknown variable "' + m[0] + '"');
		}
	}
	return fragment.replace(/\{\{|\}\}/g, ui_cexpr._getFirstChar);
};

/**
 * @param {string} text
 * @returns {!Array<(string|{type: string})>}
 */
ui_cexpr.parseEmbedded = function(text) {
	var result = [], processedTill = 0, searchFrom = 0, oBrace, cBrace, expr;
	while ((oBrace = text.indexOf('{', searchFrom)) >= 0) {
		if (text[oBrace + 1] === '{') {
			// doubling a brace escapes it
			searchFrom = oBrace + 2;
			continue;
		}
		// yes, we grab the first encountered brace, so one cannot have them inside the code.
		// since current version of jsep supports neither \xXX nor \uXXXX escapes,
		// String.fromCharCode(123) and String.fromCharCode(125) have to be used instead
		// if you need them for some reason
		cBrace = text.indexOf('}', oBrace + 1);
		if (cBrace < 0) break;
		oBrace = text.lastIndexOf('{', cBrace - 1); // take the closest one if there are multiple braces in a row

		// process the part we've skipped over
		if (processedTill !== oBrace) {
			result.push(ui_cexpr._processTextFragment(text.slice(processedTill, oBrace)));
		}
		processedTill = searchFrom = cBrace + 1;

		// process the braced part
		expr = text.slice(oBrace + 1, cBrace).trim();
		result.push((/^gv\.\w+$/.test(expr) ? ui_cexpr._processTextFragment : ui_cexpr.parse)(expr));
	}
	// process the rest of the string
	if (processedTill !== text.length) {
		result.push(ui_cexpr._processTextFragment(text.slice(processedTill)));
	}
	return result;
};
/**
 * @const
 * @type {!Array<string>}
 */
ui_cexpr.gvAPI = [
	'health',
	'healthMax',
	'healthPrc',
	'gold',
	'supplies',
	'suppliesMax',
	'suppliesPrc',
	'inventory',
	'inventoryMax',
	'inventoryPrc',
	'inventoryHasItem',
	'inventoryHasType',
	'inventoryCountLike',
	'inventoryHealing',
	'inventoryUnsaleable',
	'inventoryUnsellable',
	'isEquipmentBold',
	'exp',
	'expTrader',
	'expForge',
	'portDistance',
	'nearestPortDistance',
	'invites',
	'logs',
	'labF',
	'labM',
	'auraName',
	'auraDuration',
	'bingoItems',
	'bingoSlotsLeft',
	'bingoTriesLeft',
	'couponPrize',
	'godpowerCapAvailable',
	'activeAdvert',
	'activeAdvertButton',
	'enemyHealth',
	'enemyHealthMax',
	'enemyHealthPrc',
	'enemyCount',
	'enemyAliveCount',
	'enemyAbilitiesCount',
	'enemyGold',
	'enemyHasAbility',
	'enemyHasAbilityLoc',
	'enemyName',
	'alliesHealth',
	'alliesHealthMax',
	'alliesHealthPrc',
	'alliesCount',
	'alliesAliveCount',
	'alliesAliveHealthMax',
	'lowHealth',
	'godpower',
	'godpowerMax',
	'godpowerPrc',
	'charges',
	'arenaAvailable',
	'sparAvailable',
	'dungeonAvailable',
	'sailAvailable',
	'miningAvailable',
	'arenaSendDelay',
	'sparSendDelay',
	'dungeonSendDelay',
	'sailSendDelay',
	'miningSendDelay',
	'bossFightType',
	'fightMode',
	'fightType',
	'fightStep',
	'fightStepText',
	'dungeonType',
	'dungeonChallenge',
	'dungeonChallengeReward',
	'guidedStepsCount',
	'sailConditions',
	'cargo',
	'pushReadiness',
	'bits',
	'bytes',
	'bitsPerByte',
	'bookBytes',
	'bookWords',
	'forgeBytes',
	'forgeWords',
	'souls',
	'soulsCollected',
	'soulsProcessed',
	'soulsProcDelay',
	'soulsProcMin',
	'soulsProcMax',
	'soulsProcAvg',
	'relics',
	'relicsExamined',
	'inBossFight',
	'inFight',
	'inShop',
	'pendingShop',
	'inTown',
	'nearestTown',
	'currentTown',
	'locationAnomaly',
	'returningToTown',
	'mileStones',
	'poiMileStones',
	'poiMileStonesAhead',
	'poiMileStonesBehind',
	'poiDistance',
	'selTownName',
	'selTownMileStones',
	'selTownDistance',
	'mProgress',
	'sProgress',
	'lastNews',
	'lastDiary',
	'lastDiaryVoice',
	'lastDiarySign',
	'lastGuildChat',
	'hpd',
	'immortalityExpiresIn',
	'isImmortal',
	'isBlessed',
	'isGoingBack',
	'isGoingForth',
	'isGoingGodville',
	'isGoingToGodville',
	'isBattling',
	'isFishing',
	'isHealing',
	'isPartying',
	'isPraying',
	'isReturning',
	'isSleeping',
	'isTrading',
	'isWaiting',
	'isWalking',
	'isForecast',
	'dailyForecast',
	'dailyForecastSpecBoss',
	'hasTemple',
	'hasArk',
	'heroState',
	'heroStateText',
	'monstersKilled',
	'currentMonster',
	'currentMonsterGold',
	'currentMonsterTrophy',
	'chosenMonster',
	'soulMonster',
	'specialMonster',
	'strongMonster',
	'tamableMonster',
	'wantedMonster',
	'questName',
	'questNumber',
	'questPrize',
	'questProgress',
	'questReward',
	'sideJobName',
	'sideJobDuration',
	'sideJobProgress',
	'sideJobRequirements',
	'petKnockedOut',
	'expTimeout',
	'logTimeout',
	'byteTimeout',
	'byteDoubleTimeout',
	'soulTimeout',
	'soulDoubleTimeout',
	'sparTimeout',
	'getSeconds',
	'getMinutes',
	'getHours',
	'getHoursUTC',
	'getHoursMSK',
	'getDay',
	'getDayUTC',
	'getDayMSK',
	'getDate',
	'getDateUTC',
	'getDateMSK',
	'getMonth',
	'getMonthUTC',
	'getMonthMSK',
	'voiceCooldown',
	'windowFocused'
].sort();

/**
 * @const
 * @type {!Object<string, boolean>}
 */
// we pass in an object literal here to allow calling methods inherited from Object.prototype
ui_cexpr.gvAPIObject = GUIp.common.makeHashSet(ui_cexpr.gvAPI, {});

/**
 * @param {function(string): {type: string}} jsep
 */
ui_cexpr.init = function(jsep) {
	ui_cexpr.jsep = jsep;
	jsep.addBinaryOp('~', 7);
	jsep.addBinaryOp('~*', 7);
	jsep.addBinaryOp('!~', 7);
	jsep.addBinaryOp('!~*', 7);
	jsep.addLiteral('gv', ui_cexpr.gvAPIObject);
	jsep.addLiteral('Infinity', Infinity);
	jsep.addLiteral('Math', Math);
	jsep.addLiteral('RegExp', RegExp);
	jsep.addLiteral('String', String);
	jsep.addLiteral('Array', Array);
};
GUIp.common.renderTester = (function() {
var renderTester = {};

renderTester._ctx = null;
renderTester._hashes = {};

var _calcHash = function(text) {
	var ctx = renderTester._ctx,
		hash = 1,
		data;
	if (!ctx) {
		ctx = renderTester._ctx = document.createElement('canvas').getContext('2d');
		ctx.textBaseline = 'top';
		ctx.font = '32px sans-serif';
		if (!('\uFFFF' in renderTester._hashes))
			_calcHash('\uFFFF'); // we've just created _ctx so this should not lead to infinite recursion
	}
	ctx.clearRect(0, 0, 32, 32);
	ctx.fillText(text, 0, 0);
	data = ctx.getImageData(0, 0, 32, 32).data;
	for (var i = 0, len = data.length; i < len; i++) {
		hash = (hash * 257 + data[i]) % 0x1FE01FE01FDF; // (0x1FE01FE01FDF - 1) * 257 + 255 < 1 << 53
	}
	return (renderTester._hashes[text] = hash);
};

/**
 * @param {string} c
 * @returns {boolean}
 */
renderTester.testChar = function(c) {
	// _calcHash must be called prior to accessing _hashes['\uFFFF']
	return (renderTester._hashes[c] || _calcHash(c)) !== renderTester._hashes['\uFFFF'];
};

renderTester.deinit = function() {
	renderTester._ctx = null;
};

return renderTester;
})(); // GUIp.common.renderTester
/**
 * @alias GUIp.common.tooltips
 * @namespace
 */
var ui_cttips = GUIp.common.tooltips = {};

ui_cttips._timer = 0;
ui_cttips._node = document.createElement('div');
ui_cttips._node.className = 'e_tooltip';
GUIp.common.addListener(ui_cttips._node, 'click', function onClick(ev) {
	ev.stopPropagation();
	ui_cttips.hide();
});

/**
 * @private
 * @param {!Element} target
 * @param {?Element} [titleNode]
 */
ui_cttips._onTimer = function(event, target, titleNode) {
	var title = titleNode ? titleNode.textContent : target.title,
		pos, left;
	ui_cttips._timer = 0;
	if (!title || !(pos = target.getBoundingClientRect()).width) {
		return; // the element lost its title or has been detached from the DOM
	}
	ui_cttips._node.textContent = title;
	// most targets has low height, so bounding tooltip vertical position directly to the target is ok
	ui_cttips._node.style.top = (pos.top + worker.pageYOffset + 10) + 'px';
	// however tooltip horizontal position for wide targets should depend on where exactly user touched them
	if (pos.width < 40 || event.targetTouches.length !== 1) {
		// if target is relatively small (or when there are several touches), use old base positioning for now
		left = pos.left + worker.pageXOffset + 10;
	} else {
		// otherwise try to use clientX of touch event
		left = event.targetTouches[0].clientX + worker.pageXOffset + 5;
	}
	// finally check that tooltip isn't too close to the right edge of the screen. is 100px enough?
	left = Math.min(left, Math.max(0, (document.documentElement.clientWidth + worker.pageXOffset) - 100));
	ui_cttips._node.style.left = left + 'px';
	document.body.appendChild(ui_cttips._node);
	worker.getSelection().removeAllRanges();
};

ui_cttips._onTouchStart = GUIp.common.try2.bind(null, function _onTouchStart(ev) {
	var guard, target;
	if (ui_cttips._timer) return;
	guard = ev.currentTarget;
	for (target = ev.target; !target.title; target = target.parentNode) {
		if (target === guard) return;
	}
	if (!target.dataset.immediate) {
		ui_cttips._timer = GUIp.common.setTimeout(ui_cttips._onTimer, 900, ev, target);
	} else {
		ui_cttips._onTimer(ev, target);
		ev.preventDefault();
	}
});

ui_cttips._onTouchStartSVG = GUIp.common.try2.bind(null, function _onTouchStartSVG(ev) {
	var guard, target;
	if (ui_cttips._timer) return;
	guard = ev.currentTarget;
	for (target = ev.target; target.tagName !== 'g'; target = target.parentNode) {
		if (target === guard) return;
	}
	if ((guard = target.getElementsByTagName('title')[0]) && guard.hasChildNodes()) {
		ui_cttips._timer = GUIp.common.setTimeout(ui_cttips._onTimer, 900, ev, target, guard);
	}
});

ui_cttips._onTouchEnd = GUIp.common.try2.bind(null, function _onTouchEnd() {
	if (ui_cttips._timer) {
		clearTimeout(ui_cttips._timer);
		ui_cttips._timer = 0;
	}
});

/**
 * @param {?Element} root
 */
ui_cttips.watchSubtree = function(root) {
	if (root) {
		// safe against multiple assignments
		root.addEventListener('touchstart', ui_cttips._onTouchStart);
		root.addEventListener('touchend', ui_cttips._onTouchEnd);
	}
};

/**
 * @param {?Element} root
 */
ui_cttips.watchSubtreeSVG = function(root) {
	if (root) {
		// safe against multiple assignments
		root.addEventListener('touchstart', ui_cttips._onTouchStartSVG);
		root.addEventListener('touchend', ui_cttips._onTouchEnd);
	}
};

ui_cttips.hide = function() {
	if (ui_cttips._node.parentNode) {
		ui_cttips._node.parentNode.removeChild(ui_cttips._node);
	}
};
/**
 * @alias GUIp.common.islandsMap
 * @namespace
 */
var ui_imap = worker.GUIp.common.islandsMap = {};

/**
 * A vector on a hexagonal grid, packed into a 16-bit integral number: 0x0000RRQQ.
 *
 * @typedef {number} GUIp.common.islandsMap.Vec
 */

// look, I have a picture for you!
/*
	 |
	-0------>  X
	 |------->  Q
	 | \
	 |  \
	 |   \
	 |    ┘
	 v     R

	 Y
*/

/** @namespace */
ui_imap.vec = {
	/**
	 * @param {number} q
	 * @param {number} r
	 * @returns {GUIp.common.islandsMap.Vec}
	 */
	make: function(q, r) {
		return (q & 0xFF) | (r & 0xFF) << 8;
	},

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} scale
	 * @returns {GUIp.common.islandsMap.Vec}
	 */
	fromCartesian: function(x, y, scale) {
		var t = y / (3 * scale);
		return this.make(Math.round(x / (Math.sqrt(3) * scale) - t), Math.round(t * 2));
	},

	/**
	 * @param {GUIp.common.islandsMap.Vec} vec
	 * @param {number} scale
	 * @returns {!Array<number>} A 2-element array, namely, [x, y].
	 */
	toCartesian: function(vec, scale) {
		// make use of sign-propagating right shift
		var q = vec << 24 >> 24,
			r = vec << 16 >> 24;
		return [(q + r * 0.5) * Math.sqrt(3) * scale, r * 1.5 * scale];
	},

	/**
	 * @param {GUIp.common.islandsMap.Vec} a
	 * @param {GUIp.common.islandsMap.Vec} b
	 * @returns {GUIp.common.islandsMap.Vec}
	 */
	add: function(a, b) {
		return ((a + b) & 0xFF) | ((a + (b & 0xFF00)) & 0xFF00);
	},

	/**
	 * @param {GUIp.common.islandsMap.Vec} a
	 * @param {GUIp.common.islandsMap.Vec} b
	 * @returns {GUIp.common.islandsMap.Vec}
	 */
	sub: function(a, b) {
		return ((a - b) & 0xFF) | ((a - (b & 0xFF00)) & 0xFF00);
	},

	/**
	 * @param {GUIp.common.islandsMap.Vec} vec
	 * @param {number} n
	 * @returns {GUIp.common.islandsMap.Vec}
	 */
	mul: function(vec, n) {
		return (vec << 24) * n >>> 24 | ((vec & 0xFF00) << 16) * n >>> 16;
	},

	/**
	 * Compare two vectors as (r, q) pairs.
	 *
	 * @param {GUIp.common.islandsMap.Vec} a
	 * @param {GUIp.common.islandsMap.Vec} b
	 * @returns {number}
	 */
	cmp: function(a, b) {
		return (
			((a + 0x80) & 0xFF) | ((a + 0x8000) & 0xFF00)
		) - (
			((b + 0x80) & 0xFF) | ((b + 0x8000) & 0xFF00)
		);
	},

	/**
	 * @param {GUIp.common.islandsMap.Vec} vec
	 * @returns {number}
	 */
	len: function(vec) {
		var q = vec << 24 >> 24,
			r = vec << 16 >> 24,
			result = Math.abs(q + r);
		if ((q ^ r) < 0) { // if their signs are opposite
			return result + Math.min(Math.abs(q), Math.abs(r));
		}
		return result;
	},

	/**
	 * @param {GUIp.common.islandsMap.Vec} a
	 * @param {GUIp.common.islandsMap.Vec} b
	 * @returns {number}
	 */
	dist: function(a, b) {
		return this.len(this.sub(a, b));
	},

	/**
	 * @param {GUIp.common.islandsMap.Vec} arrow
	 * @param {GUIp.common.islandsMap.Vec} pos
	 * @returns {boolean}
	 */
	inArrowSector: function(arrow, pos) {
		if (!pos) return false;
		var q = pos << 24 >> 24,
			r = pos << 16 >> 24;
		switch (arrow) {
			case 0x0001: /*E*/   return r <= q && r << 1 >= -q;
			case 0x00FF: /*W*/   return r >= q && r << 1 <= -q;
			case 0x0100: /*SSE*/ return r >= q && r >= -q << 1;
			case 0xFF00: /*NNW*/ return r <= q && r <= -q << 1;
			case 0xFF01: /*NNE*/ return r >= -q << 1 && r << 1 <= -q;
			case 0x01FF: /*SSW*/ return r <= -q << 1 && r << 1 >= -q;
			case 0xFE01: /*N*/   return r < 0 && r === -q << 1;
			case 0x02FF: /*S*/   return r > 0 && r === -q << 1;
			default:             return false;
		}
	},

	/**
	 * @param {GUIp.common.islandsMap.Vec} arrow
	 * @param {GUIp.common.islandsMap.Vec} pos
	 * @returns {boolean}
	 */
	inLeviathanSector: function(dir, pos) {
		if (!pos) return false;
		var q = pos << 24 >> 24,
			r = pos << 16 >> 24;
		switch (dir) {
			case 'NE': return r <= 0 && r > -q << 1;
			case 'NW': return r < 0 && r <= -q << 1;
			case 'SE': return r > 0 && r >= -q << 1;
			case 'SW': return r >= 0 && r < -q << 1;
			default:   return false;
		}
	},

	/**
	 * @private
	 * @type {!Array<?Array<GUIp.common.islandsMap.Vec>>}
	 */
	_cache: [[0x0]],

	/**
	 * Generate an array of all vectors whose length is exactly n. The array is sorted according to cmp.
	 * These arrays are cached, so do not mutate them.
	 *
	 * @param {number} n
	 * @returns {!Array<GUIp.common.islandsMap.Vec>}
	 */
	ofLen: function(n) {
		var result = this._cache[n],
			i = 0;
		if (result) return result;
		for (i = this._cache.length; i < n; i++) {
			this._cache[i] = null;
		}
		result = [
			this.make(0, -n),
			this.make(0, n),
			this.make(-n, 0),
			this.make(n, 0),
			this.make(-n, n),
			this.make(n, -n)
		];
		for (i = 1; i < n; i++) {
			result.push(
				this.make(-i, i - n),
				this.make(-i, n),
				this.make(i, -n),
				this.make(i, n - i),
				this.make(-n, i),
				this.make(n, -i)
			);
		}
		return (this._cache[n] = result.sort(this.cmp));
	}
};
/**
 * @typedef {Object} GUIp.common.islandsMap.Arrow
 * @property {GUIp.common.islandsMap.Vec} pos
 * @property {GUIp.common.islandsMap.Vec} dir - A vector of minimal length to accurately represent that direction.
 */

/**
 * @class
 * @param {GUIp.common.islandsMap.Vec} pos
 * @param {number}  no   - There are no treasures up to (and including) this distance.
 * @param {number} [yes] - There is at least one treasure up to (and including) this distance.
 */
ui_imap.Thermo = function(pos, no, yes) {
	/** @type {GUIp.common.islandsMap.Vec} */
	this.pos = pos;
	/** @type {number} */
	this.no = no;
	/** @type {?number} */
	this.yes = yes || null;
};

ui_imap.Thermo.prototype = {
	constructor: ui_imap.Thermo,

	/**
	 * @param {GUIp.common.islandsMap.Vec} pos
	 * @returns {boolean} Whether a treasure can be in the given point, according to this hint.
	 */
	allows: function(pos) {
		return ui_imap.vec.dist(this.pos, pos) > this.no;
	},

	/**
	 * @param {!GUIp.common.islandsMap.Thermo} another
	 * @returns {boolean} Whether the hints cross (but not when one is contained inside another).
	 */
	crosses: function(another) {
		var d = ui_imap.vec.dist(this.pos, another.pos),
			r0 = this.yes || this.no,
			r1 = another.yes || another.no;
		if (d >= r0 && d >= r1) {
			return d <= r0 + r1;
		} else {
			// one circle lays inside another one
			return d >= Math.abs(r0 - r1) - !!(this.yes && another.yes);
		}
	}
};

/**
 * @typedef {Object} GUIp.common.islandsMap.LeviathanHint
 * @property {GUIp.common.islandsMap.Vec} pos
 * @property {string} [dir] - code of hint direction (NW,NE,SE,SW), if null then there are no Liviathans around this hint
 */

/**
 * @class
 * @classdesc Contains all essential information about the map and objects on it.
 * @param {number} step - 1-based step number.
 */
ui_imap.Model = function(step) {
	/** @type {number} */
	this.step = step;
	/**
	 * Don't iterate through this dictionary. If you'd like to, then you probably should define an extra property here.
	 *
	 * @type {!Object<GUIp.common.islandsMap.Vec, number>}
	 */
	this.tiles = {};
	/** @type {number} */
	this.radius = 0;
	/** @type {number} */
	this.borderRadius = 0;
	/** @type {number} */
	this.nonBorderRadius = 0;
	/** @type {!Array<GUIp.common.islandsMap.Vec>} */
	this.arks = [0x8080, 0x8080, 0x8080, 0x8080];
	/** @type {!Array<GUIp.common.islandsMap.Vec>} */
	this.arkDirections = [0x0, 0x0, 0x0, 0x0];
	/** @type {GUIp.common.islandsMap.Vec} */
	this.port = 0x8080;
	/** @type {!Array<GUIp.common.islandsMap.Vec>} */
	this.otherPorts = [];
	/** @type {!Array<GUIp.common.islandsMap.Vec>} */
	this.visited = [];
	/** @type {!Array<GUIp.common.islandsMap.Vec>} */
	this.emerged = [];
	/** @type {!Array<GUIp.common.islandsMap.Vec>} */
	this.whirlpools = [];
	/** @type {!Array<GUIp.common.islandsMap.Vec>} */
	this.treasures = [];
	/** @type {!Array<GUIp.common.islandsMap.Vec>} */
	this.beasties = [];
	/** @type {!Array<GUIp.common.islandsMap.Vec>} */
	this.roamingBeasties = [];
	/** @type {!Array<GUIp.common.islandsMap.Vec>} */
	this.halloweenBeasties = [];
	/** @type {!Array<GUIp.common.islandsMap.Vec>} */
	this.leviathanBeasties = [];
	/** @type {!Array<GUIp.common.islandsMap.Vec>} */
	this.reefs = [];
	/** @type {!Array<GUIp.common.islandsMap.Vec>} */
	this.rifts = [];
	/** @type {!Array<!GUIp.common.islandsMap.Arrow>} */
	this.arrows = [];
	/** @type {!Array<!GUIp.common.islandsMap.Thermo>} */
	this.thermos = [];
	/** @type {!Array<!GUIp.common.islandsMap.LeviathanHint>} */
	this.leviathanHints = [];
	/** @type {!Array<!Array<GUIp.common.islandsMap.Vec>>} */
	this.poiGroups = []; // points of interest
	/** @type {!Object<GUIp.common.islandsMap.Vec, number>} */
	this.poiGroupIndexAt = {};
};

ui_imap.Model.prototype._foggedCodes = {
	0x3F: true, 0x21: true, 0x60: true, 0x7E: true, 0x5E: true, 0x26: true, 0x28: true, 0x29: true
};

ui_imap.Model.prototype._thermoCodes = {0x74: true, 0x79: true, 0x75: true, 0x6F: true, 0x5B: true, 0x5D: true};
ui_imap.Model.prototype._leviathanHintCodes = {0x50: true, 0x51: true, 0x52: true, 0x53: true, 0x72: true};

/**
 * @param {GUIp.common.islandsMap.Vec} pos
 * @returns {boolean}
 */
ui_imap.Model.prototype.isFoggedAt = function(pos) {
	return this.tiles[pos] in this._foggedCodes;
};

/**
 * @param {GUIp.common.islandsMap.Vec} pos
 * @returns {boolean}
 */
ui_imap.Model.prototype.isNonBorderAt = function(pos) {
	var code = this.tiles[pos];
	return !!code && code !== 0x23 && code !== 0x24; // #$
};

/**
 * @param {GUIp.common.islandsMap.Vec} pos
 * @returns {boolean}
 */
ui_imap.Model.prototype.isRiftAt = function(pos) {
	return this.tiles[pos] === 0x4C; // L
};

/**
 * @param {GUIp.common.islandsMap.Vec} pos
 * @returns {boolean}
 */
ui_imap.Model.prototype.isThermoAt = function(pos) {
	return this.tiles[pos] in this._thermoCodes;
};

/**
 * @param {GUIp.common.islandsMap.Vec} pos
 * @returns {boolean}
 */
ui_imap.Model.prototype.isLeviathanHintAt = function(pos) {
	return this.tiles[pos] in this._leviathanHintCodes;
};

/**
 * Event handler that gets passed the position of the tile that caused the event.
 * May return `true` to prevent other handlers from being executed.
 *
 * @typedef {function(GUIp.common.islandsMap.Vec, !Event): (boolean|undefined)} GUIp.common.islandsMap.ViewCallback
 */

/**
 * @class
 * @classdesc Represents an <svg> and maps DOM nodes to their positions and vice versa.
 * @param {!SVGElement} svg
 * @param {number} scale
 */
ui_imap.View = function(svg, scale) {
	/** @type {!SVGElement} */
	this.svg = svg;
	/** @type {?SVGElement} */
	this.root = null;
	/** @type {number} */
	this.scale = scale;
	/**
	 * Event listeners registered on the SVG node.
	 *
	 * @type {!Object<string, {
	 *     listener: function(!Event),
	 *     keys: !Array<string>,
	 *     callbacks: !Array<GUIp.common.islandsMap.ViewCallback>
	 * }>}
	 */
	this.handlers = Object.create(null);
	/** @type {!Object<GUIp.common.islandsMap.Vec, !SVGElement>} */
	this.nodes = {};
	/** @type {!WeakMap<!SVGElement, GUIp.common.islandsMap.Vec>} */
	this.positions = new WeakMap;
};

ui_imap.View.prototype = {
	constructor: ui_imap.View,

	/**
	 * @param {GUIp.common.islandsMap.Vec} pos
	 * @param {!SVGElement} node
	 */
	addNode: function(pos, node) {
		this.nodes[pos] = node;
		this.positions.set(node, pos);
	},

	/**
	 * @private
	 * @param {!Array<GUIp.common.islandsMap.ViewCallback>} callbacks
	 * @param {!Event} ev
	 */
	_dispatchEvent: function(callbacks, ev) {
		for (var node = ev.target; node && node !== this.svg; node = node.parentNode) {
			var pos = this.positions.get(node);
			if (pos != null) {
				for (var i = 0, len = callbacks.length; i < len; i++) {
					if (GUIp.common.try2(callbacks[i], pos, ev)) {
						break;
					}
				}
				return;
			}
		}
	},

	/**
	 * @param {string} key
	 * @param {string} eventType
	 * @param {GUIp.common.islandsMap.ViewCallback} callback
	 * @param {boolean} [priority]
	 */
	register: function(key, eventType, callback, priority) {
		var h = this.handlers[eventType],
			callbacks, listener;
		if (h) {
			if (priority) {
				h.keys.unshift(key); // we have only a few listeners for each event so linear-time `unshift` is feasible
				h.callbacks.unshift(callback);
			} else {
				h.keys.push(key);
				h.callbacks.push(callback);
			}
		} else {
			callbacks = [callback];
			listener = this._dispatchEvent.bind(this, callbacks);
			this.handlers[eventType] = {listener: listener, keys: [key], callbacks: callbacks};
			this.svg.addEventListener(eventType, listener, true);
		}
	},

	/**
	 * @param {string} key
	 * @param {string} eventType
	 */
	unregister: function(key, eventType) {
		var h = this.handlers[eventType],
			i = 0;
		if (h && (i = h.keys.indexOf(key)) !== -1) {
			h.keys.copyWithin(i, i + 1);
			h.callbacks.copyWithin(i, i + 1);
			h.keys.length = --h.callbacks.length;
		}
	},

	unregisterAll: function() {
		var types = Object.keys(this.handlers),
			type = '';
		for (var i = 0, len = types.length; i < len; i++) {
			type = types[i];
			this.svg.removeEventListener(type, this.handlers[type].listener, true);
		}
		this.handlers = Object.create(null);
	}
};
/**
 * Model transformers.
 *
 * @alias GUIp.common.islandsMap.mtrans
 * @namespace
 */
ui_imap.mtrans = {};

/**
 * @param {!GUIp.common.islandsMap.Model} model
 */
ui_imap.mtrans.guessPort = function(model) {
	model.port = 0x0 in model.tiles ? 0x0 : 0x8080;
};

ui_imap.mtrans._processTile = function(model, pos, code) {
	var dist = 0;
	switch (code) {
		// ordered by popularity
		case 0x20: /* */ break;
		case 0x2C: case 0x3B: /*,;*/ model.reefs.push(pos); break;
		case 0x4B: case 0x4C: /*KL*/ model.rifts.push(pos); break;
		case 0x49: /*I*/ model.visited.push(pos); break;
		case 0x23: case 0x24: /*#$*/
			dist = ui_imap.vec.len(pos);
			if (!model.borderRadius || dist < model.borderRadius) {
				model.borderRadius = dist;
			}
			break;
		case 0x42: /*B*/ model.roamingBeasties.push(pos); break;
		case 0x62: /*b*/ model.beasties.push(pos); break;
		case 0x40: /*@*/ model.whirlpools.push(pos); break;
		case 0x4D: case 0x66: case 0x46: case 0x47: case 0x67: /*MfFGg*/ model.treasures.push(pos); break;
		case 0x73: /*s*/ model.treasures.push(pos); break; // for relic, maybe it should be processed differently?
		case 0x74: /*t*/ model.thermos.push(new ui_imap.Thermo(pos, 0, 3)); break;
		case 0x79: /*y*/ model.thermos.push(new ui_imap.Thermo(pos, 3, 5)); break;
		case 0x75: /*u*/ model.thermos.push(new ui_imap.Thermo(pos, 5, 7)); break;
		case 0x6F: /*o*/ model.thermos.push(new ui_imap.Thermo(pos, 7, 9)); break;
		case 0x5B: /*[*/ model.thermos.push(new ui_imap.Thermo(pos, 9, 11)); break;
		case 0x5D: /*]*/ model.thermos.push(new ui_imap.Thermo(pos, 11)); break;
		case 0x71: /*q*/ model.arrows.push({pos: pos, dir: 0xFF00}); break;
		case 0x61: /*a*/ model.arrows.push({pos: pos, dir: 0x00FF}); break;
		case 0x7A: /*z*/ model.arrows.push({pos: pos, dir: 0x01FF}); break;
		case 0x65: /*e*/ model.arrows.push({pos: pos, dir: 0xFF01}); break;
		case 0x64: /*d*/ model.arrows.push({pos: pos, dir: 0x0001}); break;
		case 0x63: /*c*/ model.arrows.push({pos: pos, dir: 0x0100}); break;
		case 0x50: /*P*/ model.leviathanHints.push({pos: pos, dir: 'NW'}); break; // ◰
		case 0x51: /*Q*/ model.leviathanHints.push({pos: pos, dir: 'NE'}); break; // ◳
		case 0x52: /*R*/ model.leviathanHints.push({pos: pos, dir: 'SW'}); break; // ◱
		case 0x53: /*S*/ model.leviathanHints.push({pos: pos, dir: 'SE'}); break; // ◲
		case 0x72: /*r*/ model.leviathanHints.push({pos: pos, dir: null}); break; // ⊠
		case 0x54: /*T*/ model.leviathanBeasties.push(pos); break;
		case 0x43: /*C*/ model.halloweenBeasties.push(pos); break;
		case 0x70: /*p*/ pos === 0x0 ? (model.port = pos) : model.otherPorts.push(pos); break;
	}
};

/**
 * @param {!GUIp.common.islandsMap.Model} model
 * @param {GUIp.common.islandsMap.Vec} pos
 * @param {number} code
 */
ui_imap.mtrans.addTile = function(model, pos, code) {
	model.tiles[pos] = code;
	// update map radius
	var dist = ui_imap.vec.len(pos);
	if (dist > model.radius) {
		model.radius = dist;
	}
	// update `nonBorderRadius`
	if (!model.isFoggedAt(pos) && model.isNonBorderAt(pos) && dist > model.nonBorderRadius) {
		model.nonBorderRadius = dist;
	}
	// add the tile to a group of points of interest if it is one of those
	var groupIndex = (model.poiGroupIndexAt[pos] + 1) | 0; // for type stability
	if (groupIndex) {
		for (var i = model.poiGroups.length; i < groupIndex; i++) {
			model.poiGroups[i] = [];
		}
		model.poiGroups[groupIndex - 1].push(pos);
	}
	// do various processing depending on its type
	this._processTile(model, pos, code);
};

/**
 * Migrate some special tiles.
 *
 * @private
 * @param {!Array<GUIp.common.islandsMap.Vec>} oldArr
 * @param {!Array<GUIp.common.islandsMap.Vec>} newArr
 * @param {!Object<GUIp.common.islandsMap.Vec, number>} newTiles
 */
ui_imap.mtrans._migrateTiles = function(oldArr, newArr, newTiles) {
	var newPositions = GUIp.common.makeHashSet(newArr),
		pos = 0x0;
	for (var i = 0, len = oldArr.length; i < len; i++) {
		pos = oldArr[i];
		if (!(pos in newPositions) && pos in newTiles) {
			newArr.push(pos);
		}
	}
};

/**
 * @private
 * @param {!Array<{pos: GUIp.common.islandsMap.Vec}>} oldArr
 * @param {!Array<{pos: GUIp.common.islandsMap.Vec}>} newArr
 * @param {!Object<GUIp.common.islandsMap.Vec, number>} newTiles
 */
ui_imap.mtrans._migrateObjs = function(oldArr, newArr, newTiles) {
	var newPositions = GUIp.common.makeHashSet(newArr.map(function(o) { return o.pos; })),
		pos = 0x0,
		o;
	for (var i = 0, len = oldArr.length; i < len; i++) {
		o = oldArr[i];
		pos = o.pos;
		if (!(pos in newPositions) && pos in newTiles) {
			newArr.push(o); // these objects are immutable and thus can be shared
		}
	}
};

/**
 * Migrate objects shadowed by arks.
 *
 * @private
 * @param {!GUIp.common.islandsMap.Model} oldModel
 * @param {!GUIp.common.islandsMap.Model} newModel
 */
ui_imap.mtrans._migrateShadowed = function(oldModel, newModel) {
	var arkPos = 0x0,
		code = 0x0;
	for (var i = 0, len = newModel.arks.length; i < len; i++) {
		arkPos = newModel.arks[i];
		if (newModel.tiles[arkPos] === 0x20 && // 0x20 means we have nothing below this ark at the moment
			(code = oldModel.tiles[arkPos]) && (code | 0x20) !== 0x62 /*Bb*/ && !oldModel.isFoggedAt(arkPos)
		) {
			newModel.tiles[arkPos] = code;
			this._processTile(newModel, arkPos, code);
		}
	}
};

/**
 * @private
 * @param {!GUIp.common.islandsMap.Model} from
 * @param {!GUIp.common.islandsMap.Model} to
 */
ui_imap.mtrans._migratePOIs = function(from, to) {
	var poiGroups = [], i, j, len, jlen, group, pos, target;
	for (i = 0, len = from.poiGroups.length; i < len; i++) {
		group = from.poiGroups[i];
		var newGroup = poiGroups[i] = [];
		for (j = 0, jlen = group.length; j < jlen; j++) {
			pos = group[j];
			if (pos in to.tiles) {
				to.poiGroupIndexAt[pos] = i; // unmerge POIs of the same color but possibly different groups
				newGroup.push(pos);
			}
		}
	}
	// move newly created points of interest to new groups, even if they have an already known color
	for (i = 0, len = to.poiGroups.length; i < len; i++) {
		group = to.poiGroups[i];
		target = null;
		var targetIndex = poiGroups.length;
		for (j = 0, jlen = group.length; j < jlen; j++) {
			pos = group[j];
			if (pos in from.poiGroupIndexAt) continue;
			// that point has just been created
			to.poiGroupIndexAt[pos] = targetIndex;
			if (target) {
				target.push(pos);
			} else {
				poiGroups[targetIndex] = target = [pos];
			}
		}
	}
	to.poiGroups = poiGroups;
};

/**
 * Migrate rifts and detect newly emerged islands/reefs
 *
 * @private
 * @param {!GUIp.common.islandsMap.Model} from
 * @param {!GUIp.common.islandsMap.Model} to
 */
ui_imap.mtrans._processRifts = function(from, to) {
	var i, j, k, ilen, jlen, klen, pos, npos, code, delta,
		deltas = ui_imap.vec.ofLen(1),
		islandCodes = [0x69, 0x76, 0x6E, 0x3C, 0x3E, 0x40, 0x4F]; /*ivn<>@O*/
	// migrate previously detected emerged obstacles
	ui_imap.mtrans._migrateTiles(from.emerged, to.emerged, to.tiles);
	// and detect the newly appeared ones around the arks
	for (i = 0, ilen = from.arks.length; i < ilen; i++) {
		pos = from.arks[i];
		code = from.tiles[pos];
		// if an ark stayed at the same position above the rift for a turn, it could have been activated
		if ((code === 0x4B /*K*/ || code === 0x4C /*L*/) && from.arks[i] === to.arks[i]) {
			// check its surroundings for newly found reefs or islands
			for (j = 0; j < 6; j++) {
				delta = deltas[j];
				npos = ui_imap.vec.add(pos, delta);
				// tile codes should be different, and the new code should be either an island or a new reef.
				// note that new islands can be placed onto the old reefs, and if we had a roaming beastie
				// then we can't tell for sure whether there was an old or new reef underneath it
				if (from.tiles[npos] !== to.tiles[npos] && (islandCodes.includes(to.tiles[npos]) || !from.reefs.includes(npos) && to.reefs.includes(npos) && from.tiles[npos] !== 0x42 /*B*/)) {
					to.emerged.push(npos);
				}
			}
		}
	}
	// also migrate the rifts as usual
	ui_imap.mtrans._migrateTiles(from.rifts, to.rifts, to.tiles);
};

/**
 * @private
 * @param {!GUIp.common.islandsMap.Model} model
 * @param {GUIp.common.islandsMap.Vec} pos
 * @returns {GUIp.common.islandsMap.Vec} Vector from `pos` to the enemy.
 */
ui_imap.mtrans._findSingleEnemyNearby = function(model, pos) {
	var result = 0x0,
		deltas = ui_imap.vec.ofLen(1),
		delta = 0x0,
		i = 0,
		len = 0;
	// check for beasties
	for (i = 0; i < 6; i++) {
		delta = deltas[i];
		if ((model.tiles[ui_imap.vec.add(pos, delta)] | 0x20) === 0x62 /*Bb*/) {
			if (result) return 0x8080;
			result = delta;
		}
	}
	// check for other arks
	for (i = 0, len = model.arks.length; i < len; i++) {
		delta = model.arks[i];
		if (delta !== 0x8080 && ui_imap.vec.len((delta = ui_imap.vec.sub(delta, pos))) === 1) {
			if (result) return 0x8080;
			result = delta;
		}
	}
	return result;
};

/**
 * @private
 * @param {!GUIp.common.islandsMap.Model} from
 * @param {!GUIp.common.islandsMap.Model} to
 * @param {GUIp.common.islandsMap.Vec} pos
 * @returns {boolean}
 */
ui_imap.mtrans._hasJustExploredIslandNearby = function(from, to, pos) {
	var deltas = ui_imap.vec.ofLen(1),
		adj = 0x0,
		newCode = 0x0;
	for (var i = 0; i < 6; i++) {
		adj = ui_imap.vec.add(pos, deltas[i]);
		newCode = to.tiles[adj];
		if (newCode !== from.tiles[adj]) {
			switch (newCode) {
				// I][ouytMGPQRSr
				case 0x49: case 0x5D: case 0x5B: case 0x6F: case 0x75: case 0x79: case 0x74: case 0x4D: case 0x47: case 0x50: case 0x51: case 0x52: case 0x53: case 0x72:
					return true;
			}
		}
	}
	return false;
};

/**
 * @private
 * @param {!Array<GUIp.common.islandsMap.Vec>} whirlpools
 * @param {GUIp.common.islandsMap.Vec} pos
 * @returns {GUIp.common.islandsMap.Vec} Vector from the whirlpool to `pos`.
 */
ui_imap.mtrans._findWhirlpoolNearby = function(whirlpools, pos) {
	var delta = 0x0;
	for (var i = 0, len = whirlpools.length; i < len; i++) {
		if (ui_imap.vec.len((delta = ui_imap.vec.sub(pos, whirlpools[i]))) === 1) {
			return delta;
		}
	}
	return 0x0;
};

/**
 * @private
 * @param {!GUIp.common.islandsMap.Model} from
 * @param {!GUIp.common.islandsMap.Model} to
 * @param {GUIp.common.islandsMap.Vec} oldPos
 * @param {GUIp.common.islandsMap.Vec} newPos
 * @returns {GUIp.common.islandsMap.Vec}
 */
ui_imap.mtrans._guessArkDirection = function(from, to, oldPos, newPos) {
	var delta = 0x0;
	if (oldPos === newPos) {
		// the ark stayed at the same place
		if ((delta = this._findSingleEnemyNearby(from, oldPos)) &&
			delta !== 0x8080 &&
			!this._findSingleEnemyNearby(to, oldPos) &&
			!this._hasJustExploredIslandNearby(from, to, oldPos)
		) {
			switch (to.tiles[ui_imap.vec.add(oldPos, delta)]) {
				// check if the beastie dropped an arrow
				case 0x71: /*q*/ return 0xFF00;
				case 0x61: /*a*/ return 0x00FF;
				case 0x7A: /*z*/ return 0x01FF;
				case 0x65: /*e*/ return 0xFF01;
				case 0x64: /*d*/ return 0x0001;
				case 0x63: /*c*/ return 0x0100;
			}
			return delta;
		}
	} else if (ui_imap.vec.len((delta = ui_imap.vec.sub(newPos, oldPos))) === 1) {
		// the ark moved normally
		return delta;
	} else if (this._findWhirlpoolNearby(from.whirlpools, oldPos)) {
		// the ark went through a pair of whirlpools
		return this._findWhirlpoolNearby(to.whirlpools, newPos);
	}
	return 0x0;
};

/**
 * @private
 * @param {!GUIp.common.islandsMap.Model} from
 * @param {!GUIp.common.islandsMap.Model} to
 */
ui_imap.mtrans._guessArkDirections = function(from, to) {
	var forward = from.step <= to.step,
		oldArk = 0x0,
		newArk = 0x0;
	for (var i = 0, len = to.arks.length; i < len; i++) {
		if ((oldArk = from.arks[i]) !== 0x8080 && (newArk = to.arks[i]) !== 0x8080) {
			to.arkDirections[i] = forward ? (
				this._guessArkDirection(from, to, oldArk, newArk)
			) : this._guessArkDirection(to, from, newArk, oldArk);
		}
	}
};

/**
 * @param {!GUIp.common.islandsMap.Model} from
 * @param {!GUIp.common.islandsMap.Model} to
 */
ui_imap.mtrans.migrate = function(from, to) {
	this._migrateTiles(from.visited, to.visited, to.tiles); // necessary for multipass seas
	this._migrateShadowed(from, to); // must be called prior to migrating treasures and arrows
	this._migrateTiles(from.treasures, to.treasures, to.tiles);
	this._migrateObjs(from.arrows, to.arrows, to.tiles);
	this._migratePOIs(from, to);
	this._processRifts(from, to);
	this._migrateTiles(from.reefs, to.reefs, to.tiles);
	this._migrateTiles(from.otherPorts, to.otherPorts, to.tiles);
	// we do not attempt to migrate thermo hints.
	// the only way we can lose a hint is when new one is placed right onto the old one (yeah, multipass seas
	// can be surprising sometimes), in which case we don't care about the old one anyway.
	this._guessArkDirections(from, to);
	if (to.thermos.length) {
		// exclude thermo hints from visited so that they are not rendered semi-transparent
		var thPositions = GUIp.common.makeHashSet(to.thermos.map(function(th) { return th.pos; }));
		GUIp.common.filterInPlace(to.visited, function(pos) { return !(pos in thPositions); });
	}
};

/**
 * @param {!GUIp.common.islandsMap.Model} model
 * @param {number} radius
 * @param {boolean} fill
 * @param {?{oldRadius: number, added: !Array<GUIp.common.islandsMap.Vec>}} rollbackInfo
 * @returns {{oldRadius: number, added: !Array<GUIp.common.islandsMap.Vec>}}
 */
ui_imap.mtrans.expand = function(model, radius, fill, rollbackInfo) {
	var i = 0,
		j = 0,
		len = 0,
		to = 0,
		pos = 0x0,
		added, vectors;
	if (rollbackInfo) {
		added = rollbackInfo.added;
	} else {
		rollbackInfo = {oldRadius: model.radius, added: (added = [])};
	}
	if (fill) {
		for (i = -radius; i <= radius; i++) {
			for (j = -radius - Math.min(i, 0), to = radius - Math.max(i, 0); j <= to; j++) {
				pos = ui_imap.vec.make(i, j);
				if (!(pos in model.tiles)) {
					// we bypass `addTile` here because it will not do anything else
					model.tiles[pos] = 0x3F; // ?
					added.push(pos);
				}
			}
		}
	} else {
		vectors = ui_imap.vec.ofLen(radius);
		for (i = 0, len = vectors.length; i < len; i++) {
			pos = vectors[i];
			if (!(pos in model.tiles)) {
				// we bypass `addTile` here because it will not do anything else
				model.tiles[pos] = 0x3F; // ?
				added.push(pos);
			}
		}
	}

	if (radius > model.radius) {
		model.radius = radius;
	}
	if (model.port === 0x8080) {
		this.guessPort(model);
	}
	return rollbackInfo;
};

/**
 * @param {!GUIp.common.islandsMap.Model} model
 * @param {{oldRadius: number, added: !Array<GUIp.common.islandsMap.Vec>}} rollbackInfo
 */
ui_imap.mtrans.unexpand = function(model, rollbackInfo) {
	for (var i = 0, len = rollbackInfo.added.length; i < len; i++) {
		delete model.tiles[rollbackInfo.added[i]];
	}
	model.radius = rollbackInfo.oldRadius;
	if (model.port !== 0x8080 && !(model.port in model.tiles)) {
		this.guessPort(model);
	}
};
/**
 * View transformers.
 *
 * Many objects here have bind(model, view) and unbind(model, view) methods. bind changes the map currently used by a
 * transformer. It must not be called with the same map twice. The previously used map is left in a "dirty" state -
 * usually, we don't care about that and let the GC do its work. unbind undoes any changes introduced by a transformer.
 * It must be called with the same model and view that were passed to bind the last time. Moreover, relevant model
 * fields must stay immutable between bind and unbind. Calling unbind multiple times in a row is a no-op.
 *
 * @alias GUIp.common.islandsMap.vtrans
 * @namespace
 */
ui_imap.vtrans = {};

/**
 * @class
 * @param {string} className
 * @param {function(!GUIp.common.islandsMap.Model): !Array<!Array<GUIp.common.islandsMap.Vec>>} getGroups
 */
ui_imap.vtrans.TileGroupHighlighter = function(className, getGroups) {
	this._cls = className;
	this._getGroups = getGroups;
	this._uniqueID = 'highlighter' + Math.random();
	/**
	 * @private
	 * @type {!Object<GUIp.common.islandsMap.Vec, number>}
	 */
	this._indexOf = {};
	/**
	 * @private
	 * @type {!Array<!Array<!DOMTokenList>>}
	 */
	this._clsGroups = [];
	this._hovered = -1;
	this._onOver = this._onOver.bind(this);
	this._onOut  = this._onOut.bind(this);
};

ui_imap.vtrans.TileGroupHighlighter.prototype = {
	constructor: ui_imap.vtrans.TileGroupHighlighter,

	_toggle: function(enable) {
		var group = this._clsGroups[this._hovered];
		for (var i = 0, len = group.length; i < len; i++) {
			group[i].toggle(this._cls, enable);
		}
	},

	_onOver: function(pos) {
		this._onOut(); // we might skip a mouseout event in case the SVG gets replaced
		var index = this._indexOf[pos];
		if (index != null) {
			this._hovered = index;
			this._toggle(true);
		}
	},

	_onOut: function() {
		if (this._hovered !== -1) {
			this._toggle(false);
			this._hovered = -1;
		}
	},

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 */
	bind: function(model, view) {
		// precalc _indexOf and _clsGroups
		this._indexOf = {};
		var groups = this._getGroups(model);
		for (var groupIndex = 0, glen = this._clsGroups.length = groups.length; groupIndex < glen; groupIndex++) {
			var classes = [], group = groups[groupIndex];
			for (var i = 0, len = group.length; i < len; i++) {
				var pos = group[i];
				this._indexOf[pos] = groupIndex;
				classes[i] = view.nodes[pos].classList;
			}
			this._clsGroups[groupIndex] = classes;
		}

		if (this._hovered !== -1) {
			if (this._hovered < this._clsGroups.length) {
				this._toggle(true);
			} else {
				this._hovered = -1;
			}
		}
		view.register(this._uniqueID, 'mouseover', this._onOver);
		view.register(this._uniqueID, 'mouseout', this._onOut);
	},

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 */
	unbind: function(model, view) {
		view.unregister(this._uniqueID, 'mouseover');
		view.unregister(this._uniqueID, 'mouseout');
		if (this._hovered !== -1 && this._clsGroups.length) {
			this._toggle(false);
		}
		// this._indexOf = {};
		this._clsGroups.length = 0;
	}
};
/**
 * @class
 * @param {string} cls
 * @param {function(!GUIp.common.islandsMap.Model): !Array<GUIp.common.islandsMap.Vec>} getPositions
 */
ui_imap.vtrans.ClassAssigner = function(cls, getPositions) {
	this._cls = cls;
	this._getPositions = getPositions;
};

ui_imap.vtrans.ClassAssigner.prototype = {
	constructor: ui_imap.vtrans.ClassAssigner,

	_apply: function(model, nodes, conditions, newState) {
		var positions = this._getPositions(model, conditions);
		for (var i = 0, len = positions.length; i < len; i++) {
			nodes[positions[i]].classList.toggle(this._cls, newState);
		}
	},

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 */
	bind: function(model, view, conditions) {
		this._apply(model, view.nodes, conditions, true);
	},

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 */
	unbind: function(model, view, conditions) {
		this._apply(model, view.nodes, conditions, false);
	}
};
/**
 * @interface GUIp.common.islandsMap.vtrans.IHintDrawer
 */
/**
 * Positions of hints that can be drawn by this object.
 * Passing arbitrary positions, not included in this array, to draw and undraw is forbidden.
 *
 * @readonly
 * @member {!Array<GUIp.common.islandsMap.Vec>} GUIp.common.islandsMap.vtrans.IHintDrawer#processable
 */
/**
 * @function GUIp.common.islandsMap.vtrans.IHintDrawer#draw
 * @param {GUIp.common.islandsMap.Vec} pos
 */
/**
 * @function GUIp.common.islandsMap.vtrans.IHintDrawer#undraw
 * @param {GUIp.common.islandsMap.Vec} pos
 */
/**
 * Undraw everything and remove utility elements from the SVG (if any).
 * It is forbidden to use a drawer after the disposal.
 *
 * @function GUIp.common.islandsMap.vtrans.IHintDrawer#dispose
 */

/**
 * @private
 * @param {GUIp.common.islandsMap.Vec} pos
 * @param {!Array<GUIp.common.islandsMap.Vec>} redThermoPositions
 * @param {!Array<number>} redThermoRadiuses
 * @returns {boolean}
 */
ui_imap.vtrans._shouldMarkTileWithRed = function(pos, redThermoPositions, redThermoRadiuses) {
	var deltas = ui_imap.vec.ofLen(1),
		redThermosLen = redThermoPositions.length,
		adjPos = 0x0;
adjLoop:
	for (var i = 0; i < 6; i++) {
		adjPos = ui_imap.vec.add(pos, deltas[i]);
		for (var j = 0; j < redThermosLen; j++) {
			if (ui_imap.vec.dist(adjPos, redThermoPositions[j]) <= redThermoRadiuses[j]) {
				continue adjLoop;
			}
		}
		return true; // there is an adjacent tile not covered by any red hint
	}
	return false;
};

/**
 * @class
 * @implements {GUIp.common.islandsMap.vtrans.IHintDrawer}
 * @classdesc Draws hints by adding a CSS class to their tiles.
 * @param {!GUIp.common.islandsMap.Model} model
 * @param {!GUIp.common.islandsMap.View} view
 * @param {{leviathanPortDistance: number}} options
 */
ui_imap.vtrans.TileMarkingHintDrawer = function(model, view, options) {
	this.processable = [];
	this._nodes = view.nodes;
	this._associated = {}; // !Object<GUIp.common.islandsMap.Vec, [string, !Array<GUIp.common.islandsMap.Vec>]>
	/**
	 * @private
	 * @type {!Object<string, !Object<GUIp.common.islandsMap.Vec, number>>}
	 */
	this._refs = {e_hint: {}, e_hint_r: {}, e_hint_l: {}};
	this._processThermos(model);
	this._processArrows(model);
	if (!options.disableLeviathanHints) {
		this._processLeviathanHints(model, options.leviathanPortDistance);
	}
};

ui_imap.vtrans.TileMarkingHintDrawer.prototype = {
	constructor: ui_imap.vtrans.TileMarkingHintDrawer,

	// this: GUIp.common.islandsMap.Vec
	_allows: function(thermo) { return thermo.allows(this); },

	_isAppropriate: function(model, pos, thermos) {
		return model.isNonBorderAt(pos) && thermos.every(this._allows, pos);
	},

	/**
	 * @private
	 * @param {!Array<GUIp.common.islandsMap.Vec>} positions
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.Thermo} thermo
	 * @param {number} radius
	 * @param {!Array<!GUIp.common.islandsMap.Thermo>} overlapping
	 */
	_addGreenThermoPositions: function(positions, model, thermo, radius, overlapping) {
		var vectors = ui_imap.vec.ofLen(radius),
			base = thermo.pos,
			pos = 0x0;
		for (var i = 0, len = vectors.length; i < len; i++) {
			pos = ui_imap.vec.add(base, vectors[i]);
			if (this._isAppropriate(model, pos, overlapping)) {
				positions.push(pos);
			}
		}
	},

	/**
	 * @private
	 * @param {!Array<GUIp.common.islandsMap.Vec>} positions
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.Thermo} thermo
	 * @param {!Array<GUIp.common.islandsMap.Vec>} redThermoPositions
	 * @param {!Array<number>} redThermoRadiuses
	 */
	_addRedThermoPositions: function(positions, model, thermo, redThermoPositions, redThermoRadiuses) {
		var vectors = ui_imap.vec.ofLen(thermo.no),
			base = thermo.pos,
			pos = 0x0;
		for (var i = 0, len = vectors.length; i < len; i++) {
			pos = ui_imap.vec.add(base, vectors[i]);
			if (model.isNonBorderAt(pos) &&
				ui_imap.vtrans._shouldMarkTileWithRed(pos, redThermoPositions, redThermoRadiuses)
			) {
				positions.push(pos);
			}
		}
	},

	_processThermos: function(model) {
		var overlapping = [],
			olen = 0,
			j = 0,
			thermo, positions, another, redThermoPositions, redThermoRadiuses;
		for (var i = 0, len = model.thermos.length; i < len; i++) {
			thermo = model.thermos[i];
			this.processable.push(thermo.pos);
			this._associated[thermo.pos] = [thermo.yes ? 'e_hint' : 'e_hint_r', (positions = [])];

			if (thermo.yes) {
				olen = 0;
				for (j = 0; j < len; j++) {
					another = model.thermos[j];
					if (thermo.crosses(another)) {
						overlapping[olen++] = another;
					}
				}
				overlapping.length = olen;
				for (olen = thermo.yes; olen > thermo.no; olen--) {
					this._addGreenThermoPositions(positions, model, thermo, olen, overlapping);
				}
			} else {
				if (!redThermoPositions) {
					redThermoPositions = [];
					redThermoRadiuses = [];
					for (j = 0; j < len; j++) {
						another = model.thermos[j];
						if (!another.yes) {
							redThermoPositions.push(another.pos);
							redThermoRadiuses.push(another.no);
						}
					}
				}
				this._addRedThermoPositions(positions, model, thermo, redThermoPositions, redThermoRadiuses);
			}
		}
	},

	_processArrows: function(model) {
		var thermosLen = model.thermos.length,
			deltas = ui_imap.vec.ofLen(1),
			tile, pos, j, k, klen;
		for (var i = 0, len = model.arrows.length; i < len; i++) {
			var positions = [], used = {}, arrow = model.arrows[i];
			this.processable.push(arrow.pos);
			this._associated[arrow.pos] = ['e_hint', positions];

			var initial = ui_imap.vec.add(arrow.pos, arrow.dir);
			if (this._isAppropriate(model, initial, model.thermos)) {
				positions[0] = initial;
				used[initial] = true;
			}
			for (j = 0; j < 6; j++) {
				var adj = deltas[j];
				// check if this is adjacent to arrow's direction
				if (ui_imap.vec.dist(arrow.dir, adj) !== 1) {
					continue;
				}
				pos = initial;
				// diameter (doubled radius) is the longest chord, so use it as an upper bound
				for (k = model.radius * 2 + 1; k; k--) {
					// (k & 0x1) === 1 during the first iteration
					pos = ui_imap.vec.add(pos, k & 0x1 ? adj : arrow.dir);
					if (this._isAppropriate(model, pos, model.thermos)) {
						positions.push(pos);
						used[pos] = true;
					}
				}
			}
			// mark tiles around thermo hints
			for (j = 0; j < thermosLen; j++) {
				var vectors = ui_imap.vec.ofLen(model.thermos[j].no + 1);
				initial = model.thermos[j].pos;
				for (k = 0, klen = vectors.length; k < klen; k++) {
					pos = ui_imap.vec.add(initial, vectors[k]);
					if (ui_imap.vec.inArrowSector(arrow.dir, ui_imap.vec.sub(pos, arrow.pos)) &&
						!(pos in used) && this._isAppropriate(model, pos, model.thermos)
					) {
						positions.push(pos);
						used[pos] = true;
					}
				}
			}
		}
	},

	_processLeviathanHints: function(model, allowedPortDistance) {
		var overlapping = [], vectors = [],
			d = 11, // all hints have the same static size
			i, ilen, j, jlen, hint, another, pos, positions, radius;
		for (i = 0, ilen = model.leviathanHints.length; i < ilen; i++) {
			hint = model.leviathanHints[i];
			// we only work with directional hints here
			if (!hint.dir) {
				continue;
			}
			this.processable.push(hint.pos);
			this._associated[hint.pos] = ['e_hint_l', (positions = [])];

			// iterating over the same hints again
			for (j = 0; j < ilen; j++) {
				another = model.leviathanHints[j];
				// here we're interested only in blocking hints that are not too far away
				if (!another.dir && ui_imap.vec.dist(hint.pos, another.pos) <= d*2) {
					overlapping.push(another);
				}
			}

			for (radius = d; radius > 0; radius--) {
				vectors = ui_imap.vec.ofLen(radius);
				for (j = 0, jlen = vectors.length; j < jlen; j++) {
					// check for proper quadrant
					if (!ui_imap.vec.inLeviathanSector(hint.dir, vectors[j])) {
						continue;
					}
					pos = ui_imap.vec.add(hint.pos, vectors[j]);
					// check if this cell is too close to the port
					if (ui_imap.vec.dist(0x0, pos) < allowedPortDistance) {
						continue;
					}
					// we want to mark only rifts that are far from blocking hints
					// basically this is a simplified version of this._isAppropriate()
					if (model.isRiftAt(pos) && overlapping.every(function(another) { return ui_imap.vec.dist(another.pos, pos) > d; })) {
						positions.push(pos);
					}
				}
			}
		}
	},

	draw: function(pos) {
		var pair = this._associated[pos],
			cls = pair[0],
			positions = pair[1],
			refs = this._refs[cls];
		for (var i = 0, len = positions.length; i < len; i++) {
			pos = positions[i];
			if ((refs[pos] = refs[pos] + 1 || 1) === 1) {
				this._nodes[pos].classList.add(cls);
			}
		}
	},

	undraw: function(pos) {
		var pair = this._associated[pos],
			cls = pair[0],
			positions = pair[1],
			refs = this._refs[cls];
		for (var i = 0, len = positions.length; i < len; i++) {
			pos = positions[i];
			if (!--refs[pos]) {
				this._nodes[pos].classList.remove(cls);
			}
		}
	},

	dispose: function() {
		var pairs = Object.values(this._associated),
			cls = '',
			pair, positions;
		for (var i = 0, len = pairs.length; i < len; i++) {
			pair = pairs[i];
			cls = pair[0];
			positions = pair[1];
			for (var j = 0, jlen = positions.length; j < jlen; j++) {
				this._nodes[positions[j]].classList.remove(cls);
			}
		}
	}
};

/**
 * @class
 * @implements {GUIp.common.islandsMap.vtrans.IHintDrawer}
 * @classdesc Draws hints by adding a CSS class to their tiles. Hints' forms depend on which other hints are activated.
 * @param {!GUIp.common.islandsMap.Model} model
 * @param {!GUIp.common.islandsMap.View} view
 * @param {{leviathanPortDistance: number}} options
 */
ui_imap.vtrans.TileMarkingOldHintDrawer = function(model, view, options) {
	this.processable = [];
	this._nodes = view.nodes;
	/**
	 * @private
	 * @type {!Object<GUIp.common.islandsMap.Vec, {type: number, radius: number, positions: !Array<GUIp.common.islandsMap.Vec>}>}
	 */
	this._associated = {};
	/**
	 * @private
	 * @type {!Array<GUIp.common.islandsMap.Vec>}
	 */
	this._active = [];
	/**
	 * @private
	 * @type {!Array<GUIp.common.islandsMap.Vec>}
	 */
	this._activeRed = [];
	/**
	 * A dictionary of masks. Multiple bits can be set while _redraw is in progress.
	 *
	 * 0x1 - a tile is green.
	 * 0x2 - a tile is red.
	 * 0x4 - a tile is purple.
	 *
	 * @private
	 * @type {!Object<GUIp.common.islandsMap.Vec, number>}
	 */
	this._tileState = {};
	this._processThermos(model);
	this._processArrows(model);
	if (!options.disableLeviathanHints) {
		this._processLeviathanHints(model, options.leviathanPortDistance);
	}
};

ui_imap.vtrans.TileMarkingOldHintDrawer.prototype = {
	constructor: ui_imap.vtrans.TileMarkingOldHintDrawer,

	_processThermos: function(model) {
		var pos, radius, to;
		for (var i = 0, len = model.thermos.length; i < len; i++) {
			var positions = [], thermo = model.thermos[i];
			this.processable.push(thermo.pos);
			this._associated[thermo.pos] = {type: thermo.yes ? 1 : 2, radius: thermo.no, positions: positions};

			if (thermo.yes) {
				radius = thermo.no + 1;
				to = thermo.yes;
			} else {
				radius = to = thermo.no;
			}
			for (; radius <= to; radius++) {
				var vectors = ui_imap.vec.ofLen(radius);
				for (var j = 0, jlen = vectors.length; j < jlen; j++) {
					pos = ui_imap.vec.add(thermo.pos, vectors[j]);
					if (model.isNonBorderAt(pos)) {
						positions.push(pos);
					}
				}
			}
		}
	},

	_processArrows: function(model) {
		var deltas = ui_imap.vec.ofLen(1), pos, j, k;
		for (var i = 0, len = model.arrows.length; i < len; i++) {
			var positions = [], arrow = model.arrows[i];
			this.processable.push(arrow.pos);
			this._associated[arrow.pos] = {type: 3, radius: -1, positions: positions};

			var initial = ui_imap.vec.add(arrow.pos, arrow.dir);
			if (initial in model.tiles) { // definitely not a border
				positions[0] = initial;
			}
			for (j = 0; j < 6; j++) {
				var adj = deltas[j];
				// check if this is adjacent to arrow's direction
				if (ui_imap.vec.dist(arrow.dir, adj) !== 1) {
					continue;
				}
				pos = initial;
				// diameter (doubled radius) is the longest chord, so use it as an upper bound
				for (k = model.radius * 2 + 1; k; k--) {
					// (k & 0x1) === 1 during the first iteration
					pos = ui_imap.vec.add(pos, k & 0x1 ? adj : arrow.dir);
					if (model.isNonBorderAt(pos)) {
						positions.push(pos);
					}
				}
			}
		}
	},

	_processLeviathanHints: function(model, allowedPortDistance) {
		var pos, i, j, len, jlen, radius, d = 11;
		for (i = 0, len = model.leviathanHints.length; i < len; i++) {
			var positions = [], hint = model.leviathanHints[i];
			this.processable.push(hint.pos);
			this._associated[hint.pos] = {type: !hint.dir ? 5 : 4, radius: !hint.dir ? d : 0, positions: positions};

			// we're interested only in directional hints for tile markings, leaving blocking hints with positions set to an empty array
			if (hint.dir)
			for (radius = d; radius > 0; radius--) {
				var vectors = ui_imap.vec.ofLen(radius);
				for (j = 0, jlen = vectors.length; j < jlen; j++) {
					if (!ui_imap.vec.inLeviathanSector(hint.dir, vectors[j])) {
						continue;
					}
					pos = ui_imap.vec.add(hint.pos, vectors[j]);
					// no leviathans near the port
					if (ui_imap.vec.dist(0x0, pos) < allowedPortDistance) {
						continue;
					}
					// marking only rifts not to overload the map with colorful tiles
					if (model.isRiftAt(pos)) {
						positions.push(pos);
					}
				}
			}
		}
	},

	/**
	 * @private
	 * @param {!GUIp.common.islandsMap.vtrans.TileMarkingOldHintDrawer} self
	 * @param {GUIp.common.islandsMap.Vec} pos
	 * @returns {number}
	 */
	_getMaskForGreen: function(self, pos, mask) {
		var active = self._active,
			associated = self._associated,
			hintPos = 0x0;
		for (var i = 0, len = active.length; i < len; i++) {
			hintPos = active[i];
			if (ui_imap.vec.dist(pos, hintPos) <= associated[hintPos].radius && (mask === 0x1 && associated[hintPos].type < 4 || mask === 0x4 && associated[hintPos].type === 5)) {
				return 0x0;
			}
		}
		return mask;
	},

	/**
	 * @private
	 * @param {!GUIp.common.islandsMap.vtrans.TileMarkingOldHintDrawer} self
	 * @param {GUIp.common.islandsMap.Vec} pos
	 * @param {!Array<number>} activeRedThermoRadiuses
	 * @returns {number}
	 */
	_getMaskForRed: function(self, pos, mask, activeRedThermoRadiuses) {
		return +ui_imap.vtrans._shouldMarkTileWithRed(pos, self._activeRed, activeRedThermoRadiuses) && mask;
	},

	/**
	 * @private
	 * @this {!Object<GUIp.common.islandsMap.Vec, {radius: number}>}
	 * @param {GUIp.common.islandsMap.Vec} pos
	 * @returns {number}
	 */
	_getRadiusAt: function(pos) { return this[pos].radius; },

	_redraw: function() {
		var mask = 0x0,
			cls = '',
			pos = 0x0,
			hint, getMask, activeRedThermoRadiuses, positions;

		for (var i = 0, len = this._active.length; i < len; i++) {
			hint = this._associated[this._active[i]];
			if (hint.type === 4) {
				// leviathan hint
				mask = 0x4;
				getMask = this._getMaskForGreen;
				cls = 'e_hint_l';
			} else if (hint.type === 2) {
				// red thermo
				mask = 0x2;
				getMask = this._getMaskForRed;
				cls = 'e_hint_r';
				if (!activeRedThermoRadiuses) {
					activeRedThermoRadiuses = this._activeRed.map(this._getRadiusAt, this._associated);
				}
			} else {
				// green thermo or arrow
				mask = 0x1;
				getMask = this._getMaskForGreen;
				cls = 'e_hint';
			}

			// iterate through every tile of every active hint
			positions = hint.positions;
			for (var j = 0, jlen = positions.length; j < jlen; j++) {
				pos = positions[j];
				// mark the tile unless it is inside some other active thermo
				if ((this._tileState[pos] & mask) !== getMask(this, pos, mask, activeRedThermoRadiuses)) {
					this._nodes[pos].classList.toggle(cls);
					this._tileState[pos] ^= mask;
				}
			}
		}
	},

	/**
	 * @private
	 * @param {function(this: DOMTokenList, string)} f
	 * @param {string} cls
	 * @param {!Array<GUIp.common.islandsMap.Vec>} positions
	 */
	_modifyNodes: function(f, cls, positions) {
		for (var i = 0, len = positions.length; i < len; i++) {
			f.call(this._nodes[positions[i]].classList, cls);
		}
	},

	draw: function(pos) {
		var hint = this._associated[pos];
		// thermo or arrow
		if (this._active.includes(pos)) {
			return; // already drawn
		}
		this._active.push(pos);
		if (hint.type === 2) {
			// red thermo
			this._activeRed.push(pos);
		}
		this._redraw();
	},

	undraw: function(pos) {
		var hint = this._associated[pos];
		// thermo or arrow
		if (!GUIp.common.linearRemove(this._active, pos)) {
			return; // not drawn
		}
		var mask = 0x1, cls = 'e_hint';
		if (hint.type === 4) {
			// leviathan hint
			mask = 0x4;
			cls = 'e_hint_l';
		} else if (hint.type === 2) {
			// red thermo
			mask = 0x2;
			cls = 'e_hint_r';
			GUIp.common.linearRemove(this._activeRed, pos);
		}
		for (var i = 0, len = hint.positions.length; i < len; i++) {
			pos = hint.positions[i];
			if (this._tileState[pos] & mask) {
				this._nodes[pos].classList.remove(cls);
				this._tileState[pos] ^= mask;
			}
		}
		this._redraw();
	},

	dispose: function() {
		var positions = Object.keys(this._tileState);
		for (var i = 0, len = positions.length; i < len; i++) {
			var pos = positions[i], mask = this._tileState[pos];
			if (mask & 0x1) {
				this._nodes[pos].classList.remove('e_hint');
			}
			if (mask & 0x4) {
				this._nodes[pos].classList.remove('e_hint_l');
			}
			if (mask & 0x2) {
				this._nodes[pos].classList.remove('e_hint_r');
			}
		}
	}
};

/**
 * @class
 * @implements {GUIp.common.islandsMap.vtrans.IHintDrawer}
 * @classdesc Draws hints by creating <line>s, <polyline>s, or <polygon>s.
 * @param {!GUIp.common.islandsMap.Model} model
 * @param {!GUIp.common.islandsMap.View} view
 * @param {{whirlpoolZoneRadius: number}} options
 */
ui_imap.vtrans.PolylinearHintDrawer = function(model, view, options) {
	var i, len;
	this.processable = [];
	/**
	 * @private
	 * @type {!Object<GUIp.common.islandsMap.Vec, !SVGElement>}
	 */
	this._associated = {};
	if (!view.root) {
		GUIp.common.error('polylinear hints are disabled: cannot find the root <g>');
		return;
	}
	if (model.port !== 0x8080) {
		this._associate(view, model.port, 'e_hint_t5', this._create6Cross(model, view, model.port));
	}
	if (!options.limitedMode) {
		for (i = 0, len = model.thermos.length; i < len; i++) {
			var thermo = model.thermos[i], contour, cls;
			if (thermo.yes) {
				contour = this._createOuterContour(view, thermo.pos, thermo.yes);
				cls = 'e_hint_t1';
			} else {
				contour = this._createInnerContour(view, thermo.pos, thermo.no)
				cls = 'e_hint_t3';
			}
			this._associate(view, thermo.pos, cls, contour);
		}
		for (i = 0, len = model.arrows.length; i < len; i++) {
			var arrow = model.arrows[i];
			this._associate(view, arrow.pos, 'e_hint_t4', this._createSector(model, view, arrow.pos, arrow.dir));
		}
	}
	for (i = 0, len = model.whirlpools.length; i < len; i++) {
		var whp = model.whirlpools[i];
		this._associate(view, whp, 'e_hint_t2',
			this._createInnerContour(view, whp, options.whirlpoolZoneRadius));
	}
	if (!options.disableLeviathanHints) {
		for (i = 0, len = model.leviathanHints.length; i < len; i++) {
			var hint = model.leviathanHints[i];
			if (hint.dir) {
				this._associate(view, hint.pos, 'e_hint_t6', this._createQuadrant(model, view, hint.pos, hint.dir));
			} else {
				this._associate(view, hint.pos, 'e_hint_t7', this._createInnerContour(view, hint.pos, 11)); // size is static
			}
		}
	}
};

ui_imap.vtrans.PolylinearHintDrawer.prototype = {
	constructor: ui_imap.vtrans.PolylinearHintDrawer,

	// %.1f,%.1f
	_formatXY: function(x, y) {
		return x.toFixed(1) + ',' + y.toFixed(1);
	},

	_pFormatXY: function(xy) {
		return this._formatXY(xy[0], xy[1]);
	},

	_createElement: function(tagName) {
		return document.createElementNS('http://www.w3.org/2000/svg', tagName);
	},

	_createContainer: function(view, pos) {
		var g = this._createElement('g');
		g.setAttribute('transform', 'translate(' + this._pFormatXY(ui_imap.vec.toCartesian(pos, view.scale)) + ')');
		return g;
	},

	_create6Cross: function(model, view, pos) {
		var g = this._createContainer(view, pos),
			deltas = ui_imap.vec.ofLen(1),
			radius = Math.max(model.radius + 1, 25) * view.scale,
			xy;

		for (var i = 0; i < 3; i++) {
			var line = this._createElement('line');

			xy = ui_imap.vec.toCartesian(deltas[i], radius);
			line.setAttribute('x1', xy[0].toFixed(1));
			line.setAttribute('y1', xy[1].toFixed(1));

			xy = ui_imap.vec.toCartesian(deltas[5 - i], radius);
			line.setAttribute('x2', xy[0].toFixed(1));
			line.setAttribute('y2', xy[1].toFixed(1));

			g.appendChild(line);
		}

		return g;
	},

	_vecOrder: [0, 1, 3, 5, 4, 2],

	/**
	 * @private
	 * @param {!GUIp.common.islandsMap.View} view
	 * @param {string} type
	 * @param {GUIp.common.islandsMap.Vec} pos
	 * @param {function(!Array<GUIp.common.islandsMap.Vec>, !Array<string>)} builder
	 * @returns {!SVGElement}
	 */
	_createContour: function(view, type, pos, builder) {
		var deltas = ui_imap.vec.ofLen(1),
			points = [];
		builder.call(this, deltas, points);

		var g = this._createContainer(view, pos),
			poly = this._createElement(type);
		// poly.setAttribute('fill', 'none'); // used to flicker without that for some reason, but does not now
		poly.setAttribute('points', points.join(' '));
		g.appendChild(poly);
		return g;
	},

	_createInnerContour: function(view, pos, radius) {
		radius = (radius + 1 / 3) * view.scale;
		return this._createContour(view, 'polygon', pos, function(deltas, points) {
			for (var i = 0; i < 6; i++) {
				points.push(this._pFormatXY(ui_imap.vec.toCartesian(deltas[this._vecOrder[i]], radius)));
			}
		});
	},

	_createOuterContour: function(view, pos, radius) {
		return this._createContour(view, 'polygon', pos, function(deltas, points) {
			var prev = deltas[this._vecOrder[4]],
				cur  = deltas[this._vecOrder[5]],
				prevCornerXY = ui_imap.vec.toCartesian(ui_imap.vec.add(prev, cur), view.scale / 3);

			for (var i = 0; i < 6; i++) {
				var next = deltas[this._vecOrder[i]],
					xy       = ui_imap.vec.toCartesian(cur, radius * view.scale),
					cornerXY = ui_imap.vec.toCartesian(ui_imap.vec.add(cur, next), view.scale / 3);
				points.push(
					this._formatXY(xy[0] + prevCornerXY[0], xy[1] + prevCornerXY[1]),
					this._formatXY(xy[0] + cornerXY[0],     xy[1] + cornerXY[1])
				);

				prev = cur;
				cur = next;
				prevCornerXY = cornerXY;
			}
		});
	},

	_createSector: function(model, view, pos, dir) {
		return this._createContour(view, 'polyline', pos, function(deltas, points) {
			var coeff = Math.max(model.radius, 24) * 3;
			for (var i = 0; i < 6; i++) {
				var delta = deltas[i];
				// check whether this is adjacent to arrow's direction
				if (ui_imap.vec.dist(dir, delta) !== 1) {
					continue;
				}
				var xy = ui_imap.vec.toCartesian(ui_imap.vec.add(dir, delta), view.scale / 3),
					near = this._pFormatXY(xy),
					far = this._formatXY(xy[0] * coeff, xy[1] * coeff);
				if (!points.length) {
					points.push(far, near);
				} else {
					points.push(near, far);
					break;
				}
			}
		});
	},

	_createQuadrant: function(model, view, pos, dir) {
		return this._createContour(view, 'polyline', pos, function(deltas, points) {
			var values, mirrored = false,
				addPoint = function(x, y, deltaIndices) {
				points.push(ui_imap.vec.toCartesian(
					ui_imap.vec.add(
						ui_imap.vec.make((mirrored ? -1 : 1) * x * 3, (mirrored ? -1 : 1) * y * 3),
						ui_imap.vec.add(deltas[this._vecOrder[(deltaIndices[0] + (mirrored ? 3 : 0)) % 6]], deltas[this._vecOrder[(deltaIndices[1] + (mirrored ? 3 : 0)) % 6]])
					), view.scale / 3)
				);
			}.bind(this);
			// and here goes drawing by dots
			// note that NW&SE and NE&SW are mirrored versions of each other
			switch (dir) {
			case 'SE': // south-east
				mirrored = true;
			case 'NW': // north-west
				values = [
					[1, -1, [5, 4]],
					[1, -1, [1, 0]],
					[5, -10, [2, 1]],
					[5, -11, [2, 1]],
					[5, -11, [1, 0]],
					[0, -11, [1, 0]],
					[0, -11, [0, 5]],
					[-10, -1, [5, 0]],
					[-10, -1, [4, 5]],
					[-10, -1, [3, 4]],
					[0, 0, [0, 5]]
				];
				break;
			case 'SW': // south-west
				mirrored = true;
			case 'NE': // north-east
				values = [
					[0, 0, [1, 0]],
					[6, -11, [0, 5]],
					[6, -11, [1, 0]],
					[11, -11, [1, 0]],
					[11, -11, [2, 1]],
					[11, 0, [2, 1]],
					[11, 0, [3, 2]],
					[11, 0, [4, 3]],
					[1, 0, [4, 3]],
					[1, 0, [5, 4]]
				];
				break;
			}
			values.forEach(function(value) { addPoint.apply(null, value); });
		});
	},

	/**
	 * @private
	 * @param {GUIp.common.islandsMap.View} view
	 * @param {GUIp.common.islandsMap.Vec} pos
	 * @param {string} cls
	 * @param {!SVGElement} node
	 */
	_associate: function(view, pos, cls, node) {
		node.setAttribute('class', cls + ' epl e_hint hidden');
		view.root.appendChild(node);
		this.processable.push(pos);
		this._associated[pos] = node;
	},

	draw: function(pos) {
		this._associated[pos].classList.remove('hidden');
	},

	undraw: function(pos) {
		this._associated[pos].classList.add('hidden');
	},

	dispose: function() {
		var nodes = Object.values(this._associated),
			g, parent;
		for (var i = 0, len = nodes.length; i < len; i++) {
			g = nodes[i];
			if ((parent = g.parentNode)) {
				parent.removeChild(g);
			}
		}
	}
};

/**
 * @class
 * @implements {GUIp.common.islandsMap.vtrans.IHintDrawer}
 * @classdesc Metadrawer for using TileMarking drawers as a base for classic hints, and Polylinear drawer for leviathan hints and whirlpools
 * @param {!GUIp.common.islandsMap.vtrans.HintDrawer} baseDrawer
 * @param {!GUIp.common.islandsMap.Model} model
 * @param {!GUIp.common.islandsMap.View} view
 * @param {{whirlpoolZoneRadius: number}} options
 */
ui_imap.vtrans.MetaHintDrawer = function(baseDrawer, model, view, options) {
	options.limitedMode = true;
	this._baseDrawer = baseDrawer;
	this._polylinearDrawer = new ui_imap.vtrans.PolylinearHintDrawer(model, view, options);

	// we need to provide unique processables from both drawers
	this.processable = this._baseDrawer.processable.concat(this._polylinearDrawer.processable).filter(function(elem, pos, arr) { return arr.indexOf(elem) === pos; });
}

ui_imap.vtrans.MetaHintDrawer.prototype = {
	constructor: ui_imap.vtrans.MetaHintDrawer,

	draw: function(pos) {
		if (this._baseDrawer.processable.includes(pos)) {
			this._baseDrawer.draw.call(this._baseDrawer, pos);
		} 
		if (this._polylinearDrawer.processable.includes(pos)) {
			this._polylinearDrawer.draw.call(this._polylinearDrawer, pos);
		}
	},

	undraw: function(pos) {
		if (this._baseDrawer.processable.includes(pos)) {
			this._baseDrawer.undraw.call(this._baseDrawer, pos);
		}
		if (this._polylinearDrawer.processable.includes(pos)) {
			this._polylinearDrawer.undraw.call(this._polylinearDrawer, pos);
		}
	},

	dispose: function() {
		this._baseDrawer.dispose();
		this._polylinearDrawer.dispose();
	}
};

/**
 * @param {!GUIp.common.islandsMap.Model} model
 * @param {!GUIp.common.islandsMap.View} view
 * @param {string} type
 * @param {!Object} [options]
 * @returns {!GUIp.common.islandsMap.vtrans.IHintDrawer}
 */
ui_imap.vtrans.createHintDrawer = function(model, view, type, options) {
	switch (type) {
		case 'tileMarking':    return new this.MetaHintDrawer(new this.TileMarkingHintDrawer(model, view, options), model, view, options);
		case 'tileMarkingOld': return new this.MetaHintDrawer(new this.TileMarkingOldHintDrawer(model, view, options), model, view, options);
		case 'polylinear':     return new this.PolylinearHintDrawer(model, view, options);

		default: throw new Error("unknown drawer type '" + type + "'");
	}
};
/**
 * @class
 */
ui_imap.vtrans.Ruler = function() {
	/**
	 * @readonly
	 * @type {boolean}
	 */
	this.active = false;
	/** @type {!Array<function(boolean)>} */
	this.onstatechange = [];
	this._uniqueID = 'ruler' + Math.random();
	this._model = null;
	this._view = null;
	this._initialized = false; // for lazy initialization
	this._preventClick = false;
	/**
	 * @private
	 * @type {GUIp.common.islandsMap.Vec}
	 */
	this._anchor = 0x8080;
	/**
	 * @private
	 * @type {GUIp.common.islandsMap.Vec}
	 */
	this._hovered = 0x8080;
	/**
	 * @private
	 * @type {!Array<GUIp.common.islandsMap.Vec>}
	 */
	this._watched = [];
	/**
	 * @private
	 * @type {?SVGElement}
	 */
	this._line = null;
	/**
	 * @private
	 * @type {!Array<!SVGElement>}
	 */
	this._tooltips = [];

	this._onOver  = this._onOver.bind(this);
	this._onDown  = this._onDown.bind(this);
	this._onClick = this._onClick.bind(this);
	this._onLeave = GUIp.common.try2.bind(this, this._onLeave);
};

ui_imap.vtrans.Ruler.prototype = {
	constructor: ui_imap.vtrans.Ruler,

	/**
	 * @private
	 * @param {string} tagName
	 * @param {!Object<string, string>} attrs
	 * @param {?Array<!SVGElement>} [children]
	 * @returns {!SVGElement}
	 */
	_create: function(tagName, attrs, children) {
		var node = document.createElementNS('http://www.w3.org/2000/svg', tagName),
			keys = Object.keys(attrs),
			i = 0,
			len = 0,
			key = '';
		for (i = 0, len = keys.length; i < len; i++) {
			key = keys[i];
			node.setAttribute(key, attrs[key]);
		}
		if (children) {
			for (i = 0, len = children.length; i < len; i++) {
				node.appendChild(children[i]);
			}
		}
		return node;
	},

	_createElements: function() {
		var fragment = document.createDocumentFragment();

		// in SVG, order of declaration matters: the latter elements are rendered
		// above the former ones, so inject our code at the very end
		fragment.appendChild(this._create('defs', {class: 'e_ruler_defs'}, [
			this._create('marker', {
				id: 'e_ruler_arrow',
				markerWidth:  '10',
				markerHeight: '10',
				refX: '5',
				refY: '3',
				orient: 'auto',
				markerUnits: 'strokeWidth'
			}, [
				this._create('path', {d: 'M0,0 L0,6 L9,3 z'})
			])
		]));

		fragment.appendChild((this._line = this._create('line', {
			id: 'e_ruler',
			class: 'hidden',
			'marker-end': 'url(#e_ruler_arrow)'
		})));

		var len = this._watched.length + 1;
		for (var i = 0; i < len; i++) {
			fragment.appendChild((this._tooltips[i] = this._create('g', {class: 'e_ruler_tooltip hidden'}, [
				this._create('ellipse', {cx: '7', cy: '-4', rx: '9', ry: '7'}),
				this._create('text', {x: '7'})
			])));
		}
		this._tooltips.length = len;
		this._tooltips[0].classList.add('primary'); // for styling customization

		this._view.root.appendChild(fragment);
	},

	/**
	 * @private
	 * @param {?Element} node
	 */
	_remove: function(node) {
		var parent;
		if (node && (parent = node.parentNode)) {
			parent.removeChild(node);
		}
	},

	_removeElements: function() {
		var marker = document.getElementById('e_ruler_arrow'); // faster than looking for .e_ruler_defs
		if (marker) {
			this._remove(marker.parentNode);
		}
		this._remove(this._line);
		this._line = null;
		this._tooltips.forEach(this._remove);
		this._tooltips.length = 0;
	},

	/**
	 * @private
	 * @param {number} which
	 * @param {GUIp.common.islandsMap.Vec} where
	 */
	_raiseTooltip: function(which, where) {
		var tooltip = this._tooltips[which],
			text = tooltip.lastChild,
			scale = this._view.scale,
			xy = ui_imap.vec.toCartesian(where, scale);
		if (text) {
			text.textContent = ui_imap.vec.dist(this._anchor, where);
		}
		tooltip.setAttribute('transform', 'translate(' + (xy[0] + 0.4 * scale) + ',' + (xy[1] - 0.4 * scale) + ')');
		tooltip.classList.remove('hidden');
	},

	_raiseSecondaryTooltips: function() {
		for (var i = 0, len = this._watched.length; i < len; i++) {
			if (this._watched[i] === this._anchor) {
				this._tooltips[i + 1].classList.add('hidden');
			} else {
				this._raiseTooltip(i + 1, this._watched[i]);
			}
		}
	},

	_registerAnchor: function() {
		var xy = ui_imap.vec.toCartesian(this._anchor, this._view.scale);
		this._view.nodes[this._anchor].classList.add('e_ruler_anchor');
		this._line.setAttribute('x1', xy[0]);
		this._line.setAttribute('y1', xy[1]);
	},

	_unregisterAnchor: function() {
		this._view.nodes[this._anchor].classList.remove('e_ruler_anchor');
	},

	/**
	 * @private
	 * @param {GUIp.common.islandsMap.Vec} where
	 */
	_setAnchor: function(where) {
		this._anchor = where;
		this._registerAnchor();
		this._raiseSecondaryTooltips();
	},

	_unsetAnchor: function() {
		this._unregisterAnchor();
		this._anchor = 0x8080;
		// hide secondary tooltips
		for (var i = 1, len = this._tooltips.length; i < len; i++) {
			this._tooltips[i].classList.add('hidden');
		}
	},

	_showHoverEmulation: function() {
		this._view.nodes[this._hovered].classList.add('hovered');
	},

	_hideHoverEmulation: function() {
		this._view.nodes[this._hovered].classList.remove('hovered');
	},

	/**
	 * @private
	 * @param {GUIp.common.islandsMap.Vec} where
	 */
	_setHovered: function(where) {
		if (this._hovered !== 0x8080) {
			this._hideHoverEmulation();
		}
		this._hovered = where;
	},

	_hideArrow: function() {
		this._line.classList.add('hidden');
		this._tooltips[0].classList.add('hidden');
		if (this._hovered !== 0x8080) {
			this._hideHoverEmulation();
		}
	},

	_updateArrow: function() {
		if (this._hovered === this._anchor) {
			this._hideArrow();
			return;
		}
		var xy = ui_imap.vec.toCartesian(this._hovered, this._view.scale);
		this._line.setAttribute('x2', xy[0]);
		this._line.setAttribute('y2', xy[1]);
		this._line.classList.remove('hidden');
		// show the primary tooltip unless there is a secondary one above that tile
		if (this._watched.includes(this._hovered)) {
			this._tooltips[0].classList.add('hidden');
		} else {
			this._raiseTooltip(0, this._hovered);
		}
	},

	/**
	 * @private
	 * @param {GUIp.common.islandsMap.Vec} pos
	 */
	_onOver: function(pos) {
		// on touch devices mouseover event happens simultaneously with mousedown
		if (GUIp.common.isTouching) return;
		this._setHovered(pos);
		if (this.active && this._anchor !== 0x8080) {
			this._updateArrow();
		}
	},

	/**
	 * @private
	 * @param {GUIp.common.islandsMap.Vec} pos
	 * @param {!Event} ev
	 */
	_onDown: function(pos, ev) {
		if (ev.button) return; // ignore everything but left (primary) button
		this._preventClick = this.active;
		if (!this.active) return;

		if (this._anchor === 0x8080) {
			this._setAnchor(pos);
			this._hovered = pos;
		} else if (pos === this._anchor) {
			// disable ruler mode when clicking on the anchor
			this._unsetAnchor();
			this.toggle();
		} else if (GUIp.common.isTouching) {
			// touch devices will require two clicks to show the ruler between the two selected tiles
			if (pos !== this._hovered) {
				this._setHovered(pos);
				this._updateArrow();
				this._showHoverEmulation();
			} else {
				this._hideArrow();
				this._unregisterAnchor();
				this._setAnchor(pos);
			}
		} else {
			this._hideArrow();
			this._unsetAnchor();
		}
	},

	/**
	 * @private
	 * @param {GUIp.common.islandsMap.Vec} pos
	 * @param {!Event} ev
	 * @returns {boolean}
	 */
	_onClick: function(pos, ev) {
		if (!this._preventClick) return false;
		this._preventClick = false;
		ev.stopPropagation();
		return true; // stop immediate propagation
	},

	_onLeave: function() {
		// on touch devices we will not hide the ruler when clicking outside the map
		if (!GUIp.common.isTouching) {
			this._hideArrow();
			this._hovered = 0x8080;
		}
	},

	_init: function() {
		if (this._initialized || (!this.active && this._anchor === 0x8080)) {
			return;
		}

		this._view.register(this._uniqueID, 'mouseover', this._onOver);
		this._view.register(this._uniqueID, 'mousedown', this._onDown);
		this._view.register(this._uniqueID, 'click', this._onClick, true);
		this._view.svg.addEventListener('mouseleave', this._onLeave);

		this._watched = this._model.arks.filter(function(ark) { return ark !== 0x8080; });
		this._createElements();
		if (this._anchor !== 0x8080) {
			if (this._anchor in this._model.tiles) {
				this._registerAnchor();
				this._raiseSecondaryTooltips();
			} else {
				this._anchor = 0x8080;
			}
		}
		if (!(this._hovered in this._model.tiles)) {
			this._hovered = 0x8080;
		}

		this._initialized = true;
	},

	_onActivate: function() {
		this._view.svg.classList.add('e_no_double_tap');
		if (this._anchor !== 0x8080 && this._hovered !== 0x8080) {
			this._updateArrow();
			if (this._hovered !== this._anchor && GUIp.common.isTouching) {
				this._showHoverEmulation();
			}
		}
	},

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 */
	bind: function(model, view) {
		if (!view.root) {
			GUIp.common.error('ruler is disabled: cannot find the root <g>');
			this._model = this._view = null;
			return;
		}
		this._model = model;
		this._view = view;
		this._initialized = false;
		this._init();
		if (this.active) {
			this._onActivate();
		}
	},

	unbind: function() {
		if (!this._model) return;

		this._view.unregister(this._uniqueID, 'mouseover');
		this._view.unregister(this._uniqueID, 'mousedown');
		this._view.unregister(this._uniqueID, 'click');
		this._view.svg.removeEventListener('mouseleave', this._onLeave);
		this._view.svg.classList.remove('e_no_double_tap');

		if (this._anchor !== 0x8080) {
			this._unregisterAnchor();
		}
		this._removeElements();
		this._model = this._view = null;
	},

	toggle: function() {
		if (!this._model) return;

		this.active = !this.active;
		this._init();
		if (this.active) {
			this._onActivate();
		} else {
			this._hideArrow();
			this._view.svg.classList.remove('e_no_double_tap');
		}

		for (var i = 0, len = this.onstatechange.length; i < len; i++) {
			this.onstatechange[i](this.active);
		}
	}
};

/**
 * This function might be called multiple times for the same SVG.
 *
 * @param {!GUIp.common.islandsMap.Model} model
 * @param {!GUIp.common.islandsMap.View} view
 */
ui_imap.vtrans.doIrreversibleChanges = function(model, view) {
	var g;
	// make arks to be redrawn above all other cells so dir_arrow won't get clipped
	for (var i = 0, len = model.arks.length; i < len; i++) {
		if ((g = view.nodes[model.arks[i]])) {
			g.parentNode.appendChild(g);
		}
	}
};

/**
 * Orchestrates an IHintDrawer to mark thermo hints, the port, and, optionally, whirlpools.
 */
ui_imap.vtrans.hintManager = {
	/**
	 * If true, hints won't be drawn until a tile is clicked. Changes to this property take effect immediately.
	 *
	 * @type {boolean}
	 */
	requiresClick: false,

	/**
	 * 0 - hidden; 1 - shown; 2 - pinned. Be careful to treat undefined elements differently than 0.
	 *
	 * @private
	 * @type {!Object<GUIp.common.islandsMap.Vec, number>}
	 */
	_hintStates: {},

	/**
	 * @private
	 * @type {?Object<GUIp.common.islandsMap.Vec, !SVGElement>}
	 */
	_nodes: null,

	_model: null,
	_drawer: null,

	_setDrawer: function(drawer) {
		if ((this._drawer = drawer)) {
			var newStates = {};
			for (var i = 0, len = drawer.processable.length; i < len; i++) {
				var pos = drawer.processable[i];
				this._nodes[pos].classList.add('e_clickable');
				if ((newStates[pos] = this._hintStates[pos] || 0)) {
					drawer.draw(pos);
				}
			}
			this._hintStates = newStates;
		}
	},

	_unsetDrawer: function() {
		if (this._drawer) {
			for (var i = 0, len = this._drawer.processable.length; i < len; i++) {
				this._nodes[this._drawer.processable[i]].classList.remove('e_clickable');
			}
			this._drawer.dispose();
			this._drawer = null;
		}
	},

	/** @type {?GUIp.common.islandsMap.vtrans.IHintDrawer} */
	get drawer() { return this._drawer; },

	set drawer(value) {
		if (!this._nodes) {
			throw new Error('attempting to set a drawer on an unbound hintManager');
		}
		this._unsetDrawer();
		this._setDrawer(value);
	},

	_onOver: function(pos) {
		if (!this.requiresClick && this._hintStates[pos] === 0) {
			if (this._drawer) {
				this._drawer.draw(pos);
			}
			this._hintStates[pos] = 1;
		}
	},

	_onOut: function(pos) {
		if (this._hintStates[pos] === 1) {
			if (this._drawer) {
				this._drawer.undraw(pos);
			}
			this._hintStates[pos] = 0;
		}
	},

	_onClick: function(pos, ev) {
		var state = this._hintStates[pos];
		if (state === 2) {
			if (this._drawer) {
				this._drawer.undraw(pos);
			}
			this._hintStates[pos] = 0;
		} else if (state != null) {
			if (state === 0 && this._drawer) {
				this._drawer.draw(pos);
			}
			this._hintStates[pos] = 2;
		} else {
			return;
		}
		if (this._model.isThermoAt(pos)) {
			ev.stopPropagation(); // prevent Godville from drawing its own hint markers
		}
		if (this._model.isLeviathanHintAt(pos)) {
			ev.stopPropagation(); // prevent Godville from drawing its own hint markers for Leviathans
		}
	},

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 * @param {?GUIp.common.islandsMap.vtrans.IHintDrawer} drawer
	 */
	bind: function(model, view, drawer) {
		// note: new drawer already has its constructor run. this doesn't cause any problems
		// with current drawers' implementation, but it's worth keeping that in mind
		this._model = model;
		this._nodes = view.nodes;
		this._setDrawer(drawer);
		view.register('hintManager', 'mouseover', this._onOver.bind(this));
		view.register('hintManager', 'mouseout', this._onOut.bind(this));
		view.register('hintManager', 'click', this._onClick.bind(this));
	},

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 */
	unbind: function(model, view) {
		view.unregister('hintManager', 'mouseover');
		view.unregister('hintManager', 'mouseout');
		view.unregister('hintManager', 'click');
		this._unsetDrawer();
		this._model = this._nodes = null;
	}
};

/**
 * Forwards bind and unbind calls to the ruler object it holds.
 */
ui_imap.vtrans.rulerManager = {
	_ruler: null,

	/**
	 * A shortcut function that creates a ruler, binds it to a button and registers keyboard shortcuts.
	 *
	 * @param {!Element} button
	 */
	init: function(button) {
		if (this._ruler) {
			GUIp.common.error('attempting to create more than one ruler');
			return;
		}
		var ruler = this._ruler = new ui_imap.vtrans.Ruler;
		ruler.onstatechange.push(button.classList.toggle.bind(button.classList, 'active'));
		GUIp.common.addListener(button, 'click', ruler.toggle.bind(ruler));
		GUIp.common.addListener(worker, 'keydown', function(ev) {
			if ((ev.altKey && ev.keyCode === 0x52 /*R*/) || (ev.keyCode === 0x1B /*Esc*/ && ruler.active)) {
				ruler.toggle();
			}
		});
	},

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 */
	bind: function(model, view) {
		if (this._ruler) {
			this._ruler.bind(model, view);
		}
	},

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 */
	unbind: function(model, view) {
		if (this._ruler) {
			this._ruler.unbind();
		}
	}
};

/**
 * Adds some padding to the map edges.
 */
ui_imap.vtrans.mapExpander = {
	/**
	 * @private
	 * @param {!SVGElement} svg
	 * @param {?SVGElement} root
	 * @param {boolean} newState
	 */
	_expand: function(svg, root, newState) {
		// this seems to cause glitches in ancient opera browser
		if (!root || worker.GUIp_browser === 'Opera' || svg.classList.contains('e_expanded') === newState) {
			return;
		}

		// disable transitions when manipulating a map
		var oldTransition = svg.style.transition || 'unset',
			dx = newState ? 10 : -10,
			dy = newState ? 5 : -5;
		svg.style.transition = 'unset';
		svg.setAttribute('width',  (parseFloat(svg.getAttribute('width'))  + dx * 2) + 'px');
		svg.setAttribute('height', (parseFloat(svg.getAttribute('height')) + dy * 2) + 'px');
		var matrix = root.transform.baseVal.getItem(0).matrix;
		root.setAttribute('transform', 'translate(' + (matrix.e + dx) + ',' + (matrix.f + dy) + ')');
		svg.classList.toggle('e_expanded', newState);
		// restore previous transitions if someone'll ever need them
		GUIp.common.setTimeout(function() { svg.style.transition = oldTransition; }, 1);
	},

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 */
	bind: function(model, view) {
		this._expand(view.svg, view.root, true);
	},

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 */
	unbind: function(model, view) {
		this._expand(view.svg, view.root, false);
	}
};

/**
 * Assigns CSS classes to points of interest.
 */
ui_imap.vtrans.poiColorizer = {
	/** @type {!Array<number>} */
	colors: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],

	/**
	 * @private
	 * @param {function(this: DOMTokenList, string)} f
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!Object<GUIp.common.islandsMap.Vec, !SVGElement>} nodes
	 */
	_apply: function(f, model, nodes) {
		if (!this.colors.length) {
			return;
		}
		for (var i = 0, len = model.poiGroups.length; i < len; i++) {
			var group = model.poiGroups[i],
				cls = 'e_poi_c' + this.colors[i % this.colors.length];
			for (var j = 0, jlen = group.length; j < jlen; j++) {
				f.call(nodes[group[j]].classList, 'e_poi', cls);
			}
		}
	},

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 */
	bind: function(model, view) {
		this._apply(DOMTokenList.prototype.add, model, view.nodes);
	},

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 */
	unbind: function(model, view) {
		this._apply(DOMTokenList.prototype.remove, model, view.nodes);
	}
};

/**
 * Modifies titles of points of interest to include port distance.
 */
ui_imap.vtrans.poiPortDistanceInserter = {
	/**
	 * @private
	 * @type {!Array<(string|undefined)>}
	 */
	_backup: [],

	/**
	 * @private
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 * @param {function(!SVGElement, number, number)} callback
	 */
	_forEachPoiTitle: function(model, view, callback) {
		var node, pois = Array.prototype.concat.apply([], model.poiGroups),
			port = model.port !== 0x8080 ? model.port : 0x0;
		for (var i = 0, len = pois.length; i < len; i++) {
			if ((node = view.nodes[pois[i]]) && (node = node.getElementsByTagName('title')[0])) {
				callback.call(this, node, i, GUIp.common.islandsMap.vec.dist(pois[i], port));
			}
		}
	},

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 */
	bind: function(model, view) {
		this._backup.length = Array.prototype.concat.apply([], model.poiGroups).length;
		this._forEachPoiTitle(model, view, function(node, i, dist) {
			this._backup[i] = node.textContent;
			var idx = node.textContent.lastIndexOf(')'),
				text = GUIp_i18n.fmt('sail_dist_to_port', dist);
			if (idx > -1 && /клет|cell/.test(node.textContent)) {
				node.textContent = node.textContent.substring(0, idx) + text + node.textContent.substring(idx);
			}
		});
	},

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 */
	unbind: function(model, view) {
		this._forEachPoiTitle(model, view, function(node, i, dist) {
			if (this._backup[i] != null) {
				node.textContent = this._backup[i];
			}
		});
		this._backup.length = 0;
	}
};

/**
 * Highlights all treasures when any is hovered.
 */
ui_imap.vtrans.treasureHighlighter = new ui_imap.vtrans.TileGroupHighlighter('e_treasure_hover', function(model) {
	return [model.treasures];
});

/**
 * When any point of interest is hovered, highlights points of the same color.
 */
ui_imap.vtrans.poiHighlighter = new ui_imap.vtrans.TileGroupHighlighter('e_poi_hover', function(model) {
	return model.poiGroups;
});

/**
 * Assigns a CSS class to fogged tiles supposed to be a map border.
 */
ui_imap.vtrans.borderDrawer = {
	_radius: 0,
	_locked: false,

	/**
	 * @private
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!Object<GUIp.common.islandsMap.Vec, !SVGElement>} nodes
	 * @param {boolean} newState
	 */
	_apply: function(model, nodes, newState) {
		var cls = this._locked ? 'e_border_n' : 'e_border',
			anchor = model.port !== 0x8080 ? model.port : 0x0;
		for (var radius = this._radius; radius <= model.radius; radius++) {
			var deltas = ui_imap.vec.ofLen(radius);
			for (var i = 0, len = deltas.length; i < len; i++) {
				var pos = ui_imap.vec.add(anchor, deltas[i]);
				if (pos in model.tiles && model.isFoggedAt(pos)) {
					nodes[pos].classList.toggle(cls, newState);
				}
			}
		}
	},

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 * @param {number} radius
	 * @param {{locked: (boolean|undefined)}} conditions
	 */
	bind: function(model, view, radius, conditions) {
		this._radius = radius;
		this._locked = !!conditions.locked;
		this._apply(model, view.nodes, true);
	},

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 */
	unbind: function(model, view) {
		this._apply(model, view.nodes, false);
	}
};

/**
 * Replaces anything that is written on arks with their numbers.
 */
ui_imap.vtrans.arkTextRewriter = {
	/**
	 * @private
	 * @type {!Array<(string|undefined)>}
	 */
	_backup: [],

	/**
	 * @private
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 * @param {function(!SVGElement, number)} callback
	 */
	_forEachArkText: function(model, view, callback) {
		var node;
		for (var i = 0, len = model.arks.length; i < len; i++) {
			if ((node = view.nodes[model.arks[i]]) && (node = node.getElementsByTagName('text')[0])) {
				callback.call(this, node, i);
			}
		}
	},

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 */
	bind: function(model, view) {
		this._backup.length = model.arks.length;
		this._forEachArkText(model, view, function(node, i) {
			this._backup[i] = node.textContent;
			node.textContent = i + 1;
		});
	},

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 */
	unbind: function(model, view) {
		this._forEachArkText(model, view, function(node, i) {
			if (this._backup[i] != null) {
				node.textContent = this._backup[i];
			}
		});
		this._backup.length = 0;
	}
};

/**
 * Shows predicted direction in which each ark is going to move.
 */
ui_imap.vtrans.arkDirectionDrawer = {
	/**
	 * @private
	 * @type {!Array<!Element>}
	 */
	_added: [],

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 */
	bind: function(model, view) {
		var total = 0,
			dir = 0x0,
			deltas = ui_imap.vec.ofLen(1),
			scale = view.scale / 3,
			x = '',
			y = '',
			g, line, xy;
		for (var i = 0, len = model.arks.length; i < len; i++) {
			dir = model.arkDirections[i];
			// if `dir !== 0x0`, then `model.arks[i] !== 0x8080`
			if (!dir || (g = view.nodes[model.arks[i]]).getElementsByClassName('dir_arrow')[0]) {
				continue; // we failed to guess direction, or it's our own ark
			}
			line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
			line.setAttribute('class', 'dir_arrow pl' + (i + 1));
			x = 'x1'; y = 'y1';
			for (var j = 0; j < 6; j++) {
				if (ui_imap.vec.dist(dir, deltas[j]) === 1) {
					xy = ui_imap.vec.toCartesian(ui_imap.vec.add(dir, deltas[j]), scale);
					line.setAttribute(x, xy[0]);
					line.setAttribute(y, xy[1]);
					if (x === 'x2') break;
					x = 'x2'; y = 'y2';
				}
			}
			g.appendChild(line);
			this._added[total++] = line;
		}
		this._added.length = total;
	},

	/**
	 * @param {!GUIp.common.islandsMap.Model} model
	 * @param {!GUIp.common.islandsMap.View} view
	 */
	unbind: function(model, view) {
		var parent;
		for (var i = 0, len = this._added.length; i < len; i++) {
			if ((parent = this._added[i].parentNode)) {
				parent.removeChild(this._added[i]);
			}
		}
		this._added.length = 0;
	}
};

/**
 * Assigns a CSS class to islands visited by someone.
 */
ui_imap.vtrans.visitedFader = new ui_imap.vtrans.ClassAssigner('e_visited', function(model) {
	return model.visited;
});

/**
 * Assigns a CSS class to beasties.
 */
ui_imap.vtrans.beastieHighlighter = new ui_imap.vtrans.ClassAssigner('e_beastie', function(model) {
	return model.beasties;
});

/**
 * Assigns a CSS class to roaming beasties.
 */
ui_imap.vtrans.roamingBeastieHighlighter = new ui_imap.vtrans.ClassAssigner('e_rbeastie', function(model) {
	return model.roamingBeasties;
});

/**
 * Assigns a CSS class to arks and roaming beasties standing on reefs.
 */
ui_imap.vtrans.aboveReefsHighlighter = new ui_imap.vtrans.ClassAssigner('e_above_reefs', function(model) {
	return model.arks.concat(model.roamingBeasties).filter(function(a) { return model.reefs.includes(a); });
});

/**
 * Assigns CSS classes to emerged obstacles and standalone rifts.
 */
ui_imap.vtrans.emergedHighlighter = new ui_imap.vtrans.ClassAssigner('e_emerged', function(model) {
	return model.emerged.filter(function(a) { return !model.arks.includes(a) && !model.roamingBeasties.includes(a); });
});
ui_imap.vtrans.riftsHighlighter = new ui_imap.vtrans.ClassAssigner('e_lrift', function(model, conditions) {
	var i, len, npos, delta, deltas = ui_imap.vec.ofLen(1),
		checker = function(pos) {
			// we're interested only in great rifts on proper distance from the port
			if (model.isRiftAt(pos) && ui_imap.vec.dist(0x0, pos) >= (conditions.small ? 5 : 9)) {
				for (i = 0; i < 6; i++) {
					delta = deltas[i];
					npos = ui_imap.vec.add(pos, delta);
					// npos is only allowed to be empty or to contain roaming sea monsters (with no reefs underneath), but emerged obstacles don't count,
					// current or former (already activated) rifts also not allowed
					if ((![0x20, 0x42, 0x43, 0x54].includes(model.tiles[npos]) /* BCT*/ || model.reefs.includes(npos)) && !model.emerged.includes(npos) || model.rifts.includes(npos)) {
						// special case: if we have reefs condition, we don't care about reefs at all
						if (!conditions.reefs || !model.reefs.includes(npos)) {
							return false;
						}
					}
				}
				return true;
			}
			return false;
		};
	return model.rifts.filter(checker);
});
/** @namespace */
ui_imap.defaults = {};

/**
 * @param {!GUIp.common.islandsMap.Model} model
 * @param {{small: (boolean|undefined)}} conditions
 * @returns {number}
 */
ui_imap.defaults.predictBorderRadius = function(model, conditions) {
	return Math.max(model.borderRadius || (conditions.small ? 15 : 22), model.nonBorderRadius + 1);
};

/**
 * @param {!GUIp.common.islandsMap.Model} model
 * @param {{small: (boolean|undefined)}} conditions
 * @returns {number}
 */
ui_imap.defaults.predictMaxBorderRadius = function(model, conditions) {
	if (conditions.small) {
		return model.borderRadius ? Math.min(model.borderRadius + 1, 16) : 16;
	} else {
		return model.borderRadius ? Math.min(model.borderRadius + 2, 24) : 24;
	}
};

/**
 * @param {{small: (boolean|undefined), whirlpools: (boolean|undefined)}} conditions
 * @returns {number}
 */
ui_imap.defaults.getWhirlpoolZoneRadius = function(conditions) {
	return conditions.whirlpools ? 8 : conditions.small ? 12 : 18;
};

/**
 * @param {!GUIp.common.islandsMap.Model} model
 * @param {!GUIp.common.islandsMap.View} view
 * @param {!Object<string, string>} conditions
 * @param {!Array<string>} settings
 * @param {boolean} onSuperhero
 */
ui_imap.defaults.vTransBindAll = function(model, view, conditions, settings, onSuperhero) {
	var disableHighlighting = settings.includes('dhh'),
		disableTreasureHighlighter = settings.includes('dth'),
		drawerType =
			settings.includes('shh') ? 'polylinear' : settings.includes('newhints') ? 'tileMarking' : 'tileMarkingOld',
		radius = this.predictBorderRadius(model, conditions);

	ui_imap.vtrans.doIrreversibleChanges(model, view);
	ui_imap.vtrans.rulerManager.bind(model, view);
	ui_imap.vtrans.hintManager.requiresClick = disableHighlighting;
	ui_imap.vtrans.hintManager.bind(model, view, ui_imap.vtrans.createHintDrawer(model, view, drawerType, {
		whirlpoolZoneRadius: this.getWhirlpoolZoneRadius(conditions),
		leviathanPortDistance: conditions.small ? 5 : 9, // not really sure for small seas
		disableLeviathanHints: settings.includes('dlh')
	}));
	ui_imap.vtrans.mapExpander.bind(model, view);
	ui_imap.vtrans.poiColorizer.bind(model, view);
	if (onSuperhero) {
		ui_imap.vtrans.poiPortDistanceInserter.bind(model, view);
	}
	if (!disableTreasureHighlighter) {
		ui_imap.vtrans.treasureHighlighter.bind(model, view);
	}
	if (!disableHighlighting) {
		ui_imap.vtrans.poiHighlighter.bind(model, view);
	}
	ui_imap.vtrans.borderDrawer.bind(model, view, radius, conditions);
	if (settings.includes('arknum')) {
		ui_imap.vtrans.arkTextRewriter.bind(model, view);
	}
	if (!onSuperhero || (settings.includes('arkdir') && (model.step >= 3 || conditions.winds))) {
		ui_imap.vtrans.arkDirectionDrawer.bind(model, view);
	}
	if (conditions.multipass) {
		ui_imap.vtrans.visitedFader.bind(model, view);
	}
	ui_imap.vtrans.beastieHighlighter.bind(model, view);
	ui_imap.vtrans.roamingBeastieHighlighter.bind(model, view);
	ui_imap.vtrans.aboveReefsHighlighter.bind(model, view);
	ui_imap.vtrans.emergedHighlighter.bind(model, view);
	ui_imap.vtrans.riftsHighlighter.bind(model, view, conditions);
};

/**
 * @param {!GUIp.common.islandsMap.Model} model
 * @param {!GUIp.common.islandsMap.View} view
 */
ui_imap.defaults.vTransUnbindAll = function(model, view, conditions) {
	view.unregisterAll();
	// no checks required: just unbind everything
	ui_imap.vtrans.rulerManager.unbind(model, view);
	ui_imap.vtrans.hintManager.unbind(model, view);
	ui_imap.vtrans.mapExpander.unbind(model, view);
	ui_imap.vtrans.poiColorizer.unbind(model, view);
	ui_imap.vtrans.poiPortDistanceInserter.unbind(model, view);
	ui_imap.vtrans.treasureHighlighter.unbind(model, view);
	ui_imap.vtrans.poiHighlighter.unbind(model, view);
	ui_imap.vtrans.borderDrawer.unbind(model, view);
	ui_imap.vtrans.arkTextRewriter.unbind(model, view);
	ui_imap.vtrans.arkDirectionDrawer.unbind(model, view);
	ui_imap.vtrans.visitedFader.unbind(model, view);
	ui_imap.vtrans.beastieHighlighter.unbind(model, view);
	ui_imap.vtrans.roamingBeastieHighlighter.unbind(model, view);
	ui_imap.vtrans.aboveReefsHighlighter.unbind(model, view);
	ui_imap.vtrans.emergedHighlighter.unbind(model, view);
	ui_imap.vtrans.riftsHighlighter.unbind(model, view, conditions);
};
/**
 * Functions for converting data between different formats (internal and raw).
 *
 * @alias GUIp.common.islandsMap.conv
 * @namespace
 */
ui_imap.conv = {};

/**
 * @typedef {Object} GUIp.common.islandsMap.conv.RawModel
 * @property {number} step - 1-based step number.
 * @property {!Array<number>} map
 * @property {!Array<number>} arks
 * @property {!Array<GUIp.common.islandsMap.Vec>} arkDirections
 * @property {!Array<GUIp.common.islandsMap.Vec>} visited
 * @property {!Array<number>} pois - A flattened array of encoded tiles.
 */

/** @const {!Array<number>} */
ui_imap.conv.poiCodes = [0x21, 0x60, 0x7E, 0x5E, 0x26, 0x28, 0x29]; // !`~^&()

/** @const {!Object<number, number>} */
ui_imap.conv.poiCodesDict = {0x21: 0, 0x60: 1, 0x7E: 2, 0x5E: 3, 0x26: 4, 0x28: 5, 0x29: 6};

/**
 * @param {GUIp.common.islandsMap.Vec} pos
 * @param {number} code
 * @returns {number}
 */
ui_imap.conv.encodeTilePosCode = function(pos, code) {
	// [q, -(q + r), r, code]
	// yes, the second byte is redundant
	return (pos & 0xFF) | ((~(pos + (pos << 8)) + 0x0100) & 0xFF00) | (pos & 0xFF00) << 8 | code << 24;
};

/**
 * @param {number} mask
 * @returns {GUIp.common.islandsMap.Vec}
 */
ui_imap.conv.decodeTilePos = function(mask) {
	return (mask & 0xFF) | (mask >> 8 & 0xFF00);
};

/**
 * @param {number} mask
 * @returns {number}
 */
ui_imap.conv.decodeTileCode = function(mask) {
	return mask >>> 24;
};

/**
 * @param {!GUIp.common.islandsMap.Model} model
 * @returns {!Array<number>}
 */
ui_imap.conv.encodeMap = function(model) {
	var result = [],
		i = 0,
		tiles = model.tiles;
	for (var key in tiles) { // walk through the prototype chain, taking tiles from all layers of the map
		result[i++] = this.encodeTilePosCode(+key, tiles[key]);
	}
	return result;
};

/**
 * @param {!GUIp.common.islandsMap.Model} model
 * @returns {!Array<number>}
 */
ui_imap.conv.encodeArks = function(model) {
	var result = [];
	for (var i = 0, len = model.arks.length; i < len; i++) {
		if (model.arks[i] !== 0x8080) {
			result.push(this.encodeTilePosCode(model.arks[i], i + 0x31 /*1234*/));
		}
	}
	return result;
};

/**
 * @param {!GUIp.common.islandsMap.Model} model
 * @returns {!Array<number>}
 */
ui_imap.conv.encodePOIs = function(model) {
	var result = [];
	for (var i = 0, len = model.poiGroups.length; i < len; i++) {
		var group = model.poiGroups[i],
			// already revealed points of interest have their code replaced
			code = this.poiCodes[i % this.poiCodes.length];
		for (var j = 0, jlen = group.length; j < jlen; j++) {
			result.push(this.encodeTilePosCode(group[j], code));
		}
	}
	return result;
};

/**
 * @param {!GUIp.common.islandsMap.Model} model
 * @returns {!GUIp.common.islandsMap.conv.RawModel}
 */
ui_imap.conv.encode = function(model) {
	return {
		step: model.step,
		map: this.encodeMap(model),
		arks: this.encodeArks(model),
		arkDirections: model.arkDirections.slice(),
		visited: model.visited.slice(),
		emerged: model.emerged.slice(),
		rifts: model.rifts.slice(),
		pois: this.encodePOIs(model)
	};
};

/**
 * @param {!Array<number>} rawMap
 * @returns {!Array<number>}
 */
ui_imap.conv.ejectArksFromMap = function(rawMap) {
	var len = rawMap.length,
		tile = 0x0,
		arks;
	for (var i = 0; i < len; i++) {
		tile = rawMap[i];
		if (((tile - 0x01000000) & 0xFC000000) === 0x30000000) { // an ark
			rawMap[i--] = rawMap[--len];
			rawMap[len] = tile;
		}
	}
	arks = rawMap.slice(len);
	rawMap.length = len;
	return arks;
};

/**
 * @param {!Array<number>} rawMap
 * @returns {!Array<number>}
 */
ui_imap.conv.guessPOIsFromMap = function(rawMap) {
	var result = [], i, j, len;
outer:
	for (i = 0, len = rawMap.length; i < len; i++) {
		var offset = this.poiCodesDict[this.decodeTileCode(rawMap[i])] * 3;
		if (offset !== offset) continue;
		if (this.decodeTilePos(rawMap[i]) === 0x8080) {
			GUIp.common.warn('weird POI:', rawMap[i]);
			continue;
		}

		for (j = result.length; j < offset; j++) {
			result[j] = this.encodeTilePosCode(0x8080, this.poiCodes[Math.floor(j / 3)]);
		}
		// pick the first "empty" element
		for (j = 0; j < 3; j++) {
			if (result[offset + j] === undefined || this.decodeTilePos(result[offset + j]) === 0x8080) {
				result[offset + j] = rawMap[i];
				continue outer;
			}
		}
		GUIp.common.warn('too many same-colored POIs:', rawMap[i]);
	}
	// the last group may have less than 3 points of interest
	for (i = 2, len = result.length; i < len; i += 3) {
		if (this.decodeTilePos(result[i]) === 0x8080) {
			GUIp.common.warn('too few POIs of color #' + Math.floor(i / 3));
		}
	}
	return result;
};

/**
 * @param {number} step
 * @param {!Array<number>} map
 * @param {!Array<number>} arks
 * @param {!Array<number>} pois
 * @returns {!GUIp.common.islandsMap.conv.RawModel}
 */
ui_imap.conv.createRawModel = function(step, map, arks, pois) {
	return {step: step, map: map, arks: arks, arkDirections: [], visited: [], pois: pois};
};

/**
 * @param {!GUIp.common.islandsMap.Model} model
 * @param {!Array<number>} rawMap
 */
ui_imap.conv.decodeAndAddTiles = function(model, rawMap) {
	var pos = 0x0,
		code = 0x0;
	for (var i = 0, len = rawMap.length; i < len; i++) {
		code = rawMap[i];
		pos = this.decodeTilePos(code);
		code = this.decodeTileCode(code);
		// we check only own properties because a map may have different tiles at the same position on different layers
		if (model.tiles.hasOwnProperty(pos)) {
			GUIp.common.warn('duplicate tile at ' + pos + ':', model.tiles[pos], 'vs', code);
			continue;
		}
		if (code >= 0x31 && code <= 0x34 /*1234*/) {
			if (model.arks[code - 0x31] === 0x8080) {
				model.arks[code - 0x31] = pos;
			} else {
				GUIp.common.warn('duplicate ark #' + (code - 0x30) + ':', model.arks[code - 0x31], 'vs', pos);
			}
			code = 0x20; /* */
		}
		ui_imap.mtrans.addTile(model, pos, code);
	}
};

/**
 * @param {!GUIp.common.islandsMap.Model} model
 * @param {!Array<number>} rawPois - A flattened array of 3-element groups.
 */
ui_imap.conv.decodeAndAddPois = function(model, rawPois) {
	var groupIndex = model.poiGroups.length,
		pos = 0x0,
		group;
	for (var i = 0, len = Math.floor((rawPois.length + 2) / 3); i < len; i++) {
		group = [];
		for (var j = i * 3, to = Math.min(i * 3 + 3, rawPois.length); j < to; j++) {
			pos = this.decodeTilePos(rawPois[j]); // ignore tile's code
			if (!(pos in model.tiles)) {
				GUIp.common.warn('dangling POI:', rawPois[j]);
				continue;
			}
			model.poiGroupIndexAt[pos] = groupIndex;
			group.push(pos);
		}
		model.poiGroups[groupIndex++] = group;
	}
};

/**
 * @param {!GUIp.common.islandsMap.conv.RawModel} rawModel
 * @returns {!GUIp.common.islandsMap.Model}
 */
ui_imap.conv.decode = function(rawModel) {
	var model = new ui_imap.Model(rawModel.step),
		i = 0,
		len = 0,
		pos = 0x0,
		index = 0;

	this.decodeAndAddTiles(model, rawModel.map);
	if (model.port === 0x8080) {
		ui_imap.mtrans.guessPort(model);
	}

	for (i = 0, len = rawModel.arks.length; i < len; i++) {
		index = rawModel.arks[i];
		pos = this.decodeTilePos(index);
		if (!(pos in model.tiles)) {
			GUIp.common.warn('dangling ark:', index);
			continue;
		}
		if (model.arks.includes(pos)) {
			GUIp.common.warn('multiple arks at the same position:', model.tiles[pos], 'vs', index);
			continue;
		}
		index = this.decodeTileCode(index) - 0x31; // 1234
		if (index < 0 || index >= 4) {
			GUIp.common.warn('pretending', rawModel.arks[i], 'to be an ark #' + (index + 1));
			continue;
		}
		if (model.arks[index] !== 0x8080) {
			GUIp.common.warn('duplicate ark:', model.arks[index], 'vs', rawModel.arks[i]);
			continue;
		}
		model.arks[index] = pos;
	}

	for (i = 0, len = rawModel.arkDirections.length; i < len; i++) {
		pos = rawModel.arkDirections[i];
		if (ui_imap.vec.len(pos) > 1) {
			GUIp.common.warn("invalid ark's direction:", pos);
			pos = 0x0;
		}
		model.arkDirections[i] = pos;
	}

	var decodeObjs = {
		visited: 'visited island',
		emerged: 'emerged obstacle',
		rifts: 'rift'
	}
	Object.keys(decodeObjs).forEach(function(key) {
		if (rawModel[key])
		for (i = 0, len = rawModel[key].length; i < len; i++) {
			pos = rawModel[key][i];
			if (!(pos in model.tiles)) {
				GUIp.common.warn('dangling' + decodeObjs[key] + ':', rawModel[key][i]);
				continue;
			}
			model[key].push(pos);
		}
	});

	this.decodeAndAddPois(model, rawModel.pois);

	return model;
};

/**
 * @param {!GUIp.common.islandsMap.conv.RawModel} rawModel
 */
ui_imap.conv.putArksOntoMap = function(rawModel) {
	var arkByPos = {},
		i = 0,
		len = 0,
		tile = 0x0;
	for (i = 0, len = rawModel.arks.length; i < len; i++) {
		tile = rawModel.arks[i];
		arkByPos[tile & 0xFFFFFF] = tile;
	}
	for (i = 0, len = rawModel.map.length; i < len; i++) {
		if ((tile = arkByPos[rawModel.map[i] & 0xFFFFFF] | 0)) {
			rawModel.map[i] = tile;
		}
	}
};
/**
 * @alias GUIp.common.islandsMap.domParsers
 * @namespace
 */
ui_imap.domParsers = {};

/**
 * @param {!SVGElement} svg
 * @returns {number} A radius of a circle circumscribed around a tile.
 */
ui_imap.domParsers.detectMapScale = function(svg) {
	try {
		var p = svg.querySelector('g.tile polygon').getAttribute('points').split(/[\s,]+/),
			dx = +p[0] - +p[6],
			dy = +p[1] - +p[7];
		return Math.sqrt(dx * dx + dy * dy) * 0.5;
	} catch (e) {
		return 11;
	}
};

/**
 * @private
 * @param {!SVGElement} node
 * @param {number} scale
 * @returns {GUIp.common.islandsMap.Vec}
 */
ui_imap.domParsers._getNodePos = function(node, scale) {
	var matrix = node.transform.baseVal.getItem(0).matrix;
	return ui_imap.vec.fromCartesian(matrix.e, matrix.f, scale);
};

/**
 * @private
 * @const {!Object<string, number>}
 */
ui_imap.domParsers._charCodes = {
	'⁂': 0x2C, // ,
	'△': 0x3B, // ;
	'🗻': 0x3B, // ;
	'👾': 0x62, // b
	'🐠': 0x42, // B
	'?': 0x69, // i
	'🙏': 0x76, // v
	'🔧': 0x6E, // n
	'🔦': 0x6D, // m
	'🍴': 0x3C, // <
	'💡': 0x3E, // >
	'🌀': 0x40, // @
	'♂': 0x4D, // M
	'✺': 0x74, // t
	'☀': 0x79, // y
	'♨': 0x75, // u
	'☁': 0x6F, // o
	'❄': 0x5B, // [
	'✵': 0x5D, // ]
	'↗': 0x65, // e
	'→': 0x64, // d
	'↘': 0x63, // c
	'↙': 0x7A, // z
	'←': 0x61, // a
	'↖': 0x71, // q
	'⁇': 0x4F, // O
	'◰': 0x50, // P
	'◳': 0x51, // Q
	'◱': 0x52, // R
	'◲': 0x53, // S
	'⊠': 0x72, // r
	'🏺': 0x73, // s
	'⊙': 0x4B, // K
	'◎': 0x4C, // L
	'🦑': 0x54, // T
	'🐙': 0x43 // C
};

/**
 * Parse info from the tile node and update the model and view with it.
 *
 * @private
 * @param {!GUIp.common.islandsMap.Model} model
 * @param {!GUIp.common.islandsMap.View} view
 * @param {!SVGElement} node
 * @param {!Object<string, string>} conditions
 */
ui_imap.domParsers._processTileNodeMV = function(model, view, node, conditions) {
	var pos = this._getNodePos(node, view.scale),
		classes = node.classList,
		isIsland = classes.contains('island'),
		code = classes.contains('unknown') ? 0x3F : isIsland ? 0x49 : 0x20 /*?I */,
		tagName = '',
		titleNode = null,
		textNode = null,
		text = '',
		arkIndex = -1,
		poiGroupIndex = -1,
		cls = '',
		cls0 = 0x0,
		num = 0,
		isFoggedPOI = false,
		newCode = 0x0;

	// precalc children to avoid multiple calls to .getElementsByTagName
	for (var child = node.firstChild; child; child = child.nextSibling) {
		tagName = child.tagName;
		if (tagName === 'title') {
			titleNode = child;
		} else if (tagName === 'text') {
			textNode = child;
		}
	}

	if (classes.contains('port')) {
		code = 0x70; // p
	} else if (conditions.locked) {
		if (titleNode) {
			// this code is executed for almost every tile, so don't use regexes
			text = titleNode.textContent.trim().toLowerCase();
			if (text.startsWith('закрытая граница') || text.startsWith('closed edge')) {
				// note: isIsland === true && isBorder === true
				code = 0x24; // $
			}
		}
	} else if (classes.contains('border')) { // note: the port also has this class
		code = 0x23; // #
	}

	for (var i = 0, len = classes.length; i < len; i++) {
		cls = classes[i];
		cls0 = cls.charCodeAt(0);
		if (cls0 === 0x70 /*p*/ && cls.charCodeAt(1) === 0x6C /*l*/ && (num = parseInt(cls.slice(2))) > 0) {
			// ark
			if (arkIndex !== -1) {
				GUIp.common.warn('multiple arks: #' + (arkIndex + 1) + ' vs #' + num, 'at', pos);
				continue;
			}
			arkIndex = num - 1;
		} else {
			isFoggedPOI = cls0 === 0x69; // i
			if ((isFoggedPOI || (cls0 === 0x6F /*o*/ && cls.charCodeAt(1) === 0x69 /*i*/)) &&
				(num = parseInt(cls.slice(2 - isFoggedPOI))) > 0
			) {
				// point of interest
				if (poiGroupIndex !== -1) {
					GUIp.common.warn('multiple POIs: #' + (poiGroupIndex + 1) + ' vs #' + num, 'at', pos);
					continue;
				}
				poiGroupIndex = num - 1;
				if (isFoggedPOI) {
					code = ui_imap.conv.poiCodes[poiGroupIndex % ui_imap.conv.poiCodes.length];
				}
			}
		}
	}

	if (textNode) {
		text = textNode.textContent.trim();
		if (text === '♀') {
			code = isIsland ? 0x66 : 0x46; // fF (yes, fenimals are supposed to live on islands too)
		} else if (text === '💰') {
			code = isIsland ? 0x47 : 0x67; // Gg
		} else {
			// cast to int because it might be a property in the prototype chain
			newCode = this._charCodes[text] | 0;
			if (newCode) code = newCode;
		}
	}

	if (pos in model.tiles) {
		if (arkIndex !== -1 && !model.arks.includes(pos)) {
			// merge the ark with the terrain below it
			model.arks[arkIndex] = pos;
			view.addNode(pos, node);
		} else {
			GUIp.common.warn('duplicate tile at ' + pos + ':', model.tiles[pos], 'vs', node);
		}
		return;
	}

	if (arkIndex !== -1) {
		model.arks[arkIndex] = pos;
	}
	if (poiGroupIndex !== -1) {
		model.poiGroupIndexAt[pos] = poiGroupIndex;
	}
	ui_imap.mtrans.addTile(model, pos, code);
	view.addNode(pos, node);
};

/**
 * @param {!SVGElement} svg
 * @returns {!GUIp.common.islandsMap.View}
 */
ui_imap.domParsers.vFromSVG = function(svg) {
	var view = new ui_imap.View(svg, this.detectMapScale(svg)),
		tiles = svg.getElementsByClassName('tile'),
		node;
	view.root = svg.getElementsByTagName('g')[0] || null;
	for (var i = 0, len = tiles.length; i < len; i++) {
		node = tiles[i];
		// in case of duplicates, keep the latest tile since it will be rendered above former ones
		view.addNode(this._getNodePos(node, view.scale), node);
	}
	return view;
};

/**
 * @param {!SVGElement} svg
 * @param {number} step
 * @param {!Object<string, string>} conditions
 * @returns {{model: !GUIp.common.islandsMap.Model, view: !GUIp.common.islandsMap.View}}
 */
ui_imap.domParsers.mvFromSVG = function(svg, step, conditions) {
	var model = new ui_imap.Model(step),
		view = new ui_imap.View(svg, this.detectMapScale(svg)),
		tiles = svg.getElementsByClassName('tile');
	view.root = svg.getElementsByTagName('g')[0] || null;
	for (var i = 0, len = tiles.length; i < len; i++) {
		this._processTileNodeMV(model, view, tiles[i], conditions);
	}
	if (model.port === 0x8080) {
		ui_imap.mtrans.guessPort(model);
	}
	return {model: model, view: view};
};
/**
 * @interface GUIp.common.islandsMap.IMVManager
 */
/**
 * @property {?GUIp.common.islandsMap.Model} GUIp.common.islandsMap.IMVManager#model
 * @readonly
 */
/**
 * @property {?GUIp.common.islandsMap.View} GUIp.common.islandsMap.IMVManager#view
 */
/**
 * @function GUIp.common.islandsMap.IMVManager#replaceModelAndView
 * @param {!Element} svg
 * @param {number} step
 */
/**
 * @function GUIp.common.islandsMap.IMVManager#replaceView
 * @param {!Element} svg
 */
/**
 * @function GUIp.common.islandsMap.IMVManager#expandMap
 * @param {boolean} fill
 * @returns {function(function(!GUIp.common.islandsMap.conv.RawModel))}
 */
/**
 * @function GUIp.common.islandsMap.IMVManager#unexpandMap
 * @returns {function(function(!GUIp.common.islandsMap.conv.RawModel))}
 */

/**
 * @class
 * @implements {GUIp.common.islandsMap.IMVManager}
 * @param {?GUIp.common.islandsMap.Model} initialModel
 */
ui_imap.MigratingMVManager = function(initialModel) {
	this.model = initialModel;
	this.view = null;
	/** @type {!Object<string, string>} */
	this.conditions = {};
	this._expansionRollbackInfo = null;
};

ui_imap.MigratingMVManager.prototype = {
	constructor: ui_imap.MigratingMVManager,

	replaceModelAndView: function(svg, step) {
		var mv = ui_imap.domParsers.mvFromSVG(svg, step, this.conditions);
		if (this.model) {
			ui_imap.mtrans.migrate(this.model, mv.model);
		}
		this.model = mv.model;
		this.view = mv.view;
	},

	replaceView: function(svg) {
		this.view = ui_imap.domParsers.vFromSVG(svg);
	},

	_createRedrawCaller: function() {
		var model = this.model,
			rawModel;
		return function(redraw) {
			if (!rawModel) rawModel = ui_imap.conv.encode(model);
			redraw(rawModel);
		};
	},

	expandMap: function(fill) {
		this._expansionRollbackInfo = ui_imap.mtrans.expand(
			this.model,
			ui_imap.defaults.predictBorderRadius(this.model, this.conditions),
			fill,
			this._expansionRollbackInfo
		);
		return this._createRedrawCaller();
	},

	unexpandMap: function() {
		ui_imap.mtrans.unexpand(this.model, this._expansionRollbackInfo);
		this._expansionRollbackInfo = null;
		return this._createRedrawCaller();
	}
};
/** @namespace */
ui_imap.observer = {};

ui_imap.observer._isRelevantNode = function(node) {
	var classes = node.classList;
	if (classes && (classes.contains('e_hint') || classes.contains('e_ruler_tooltip') || classes.contains('e_ruler_defs'))) {
		// ignore our own hints and ruler
		return false;
	}
	// the ruler has much stuff to ignore
	return node.id !== 'e_ruler' && node.nodeName.toLowerCase() !== '#text';
};

ui_imap.observer._isRelevantMutation = function(mutation) {
	if (mutation.target.classList.contains('dir_resp')) {
		// ignore native direction notice
		return false;
	}
	return Array.prototype.some.call(mutation.addedNodes, ui_imap.observer._isRelevantNode);
};

/**
 * @param {function()} callback
 * @param {*} [thisArg]
 * @returns {!MutationObserver}
 */
ui_imap.observer.create = function(callback, thisArg) {
	return GUIp.common.newMutationObserver(function(mutations, observer) {
		if (mutations.some(ui_imap.observer._isRelevantMutation)) {
			try {
				callback.call(thisArg);
			} finally {
				observer.takeRecords();
			}
		}
	});
};
/**
 * @alias GUIp.common.sailing
 * @namespace
 */
var ui_sailing = GUIp.common.sailing = {};

/**
 * @returns {?Element}
 */
ui_sailing.tryFindMapBlock = function(isMobile) {
	// .querySelector is 40x slower
	return isMobile ? document.getElementById('map_wrap') : (document.getElementById('s_map') || document.getElementById('sail_map'));
};

/**
 * @returns {?Element}
 */
ui_sailing.tryFindChronicleBlock = function() {
	return document.getElementById('m_fight_log') || document.getElementById('fight_chronicle') || document.getElementsByClassName('e_m_fight_log')[0];
};

/**
 * @param {string} text
 * @returns {!Object<string, string>}
 */
ui_sailing.parseConditions = function(text) {
	var phrases = {
		pois:      /все подсказки в этом море окажутся метками|all (treasure|booty) hints look like .[!]. here/i,
		migration: /в этом походе не будет зависимости силы тварей от расстояния|beasties are shuffled and can be anywhere in this sea/i,
		double:    /щедрое море сделает все клады двойными|all (treasures|booties) are doubled in this generous sea/i,
		beasties:  /мешков не будет, во всех кладах твари|no gold bags here, only manimals and fenimals/i,
		winds:     /ветер разбросает ковчеги подальше от порта|wind disperses the arks all over the map/i,
		small:     /море тесное, а поход ограничен 50 ходами|this sea is small and the expedition must end in 50 turns/i,
		fires:     /в этом море огней маяков целая уйма|lots of lighthouses in this area/i,
		locked:    /граница на замке, покинуть заплыв можно только через порт|the border is closed, exit only through the port/i,
		roaming:   /в этом море все твари бродячие и пугливые|all beasties are roaming, but very shy/i,
		faststart: /на старте уже есть несколько подсказок|some (treasure|booty) hints are already known/i,
		multipass: /многие острова можно будет посещать по несколько раз|many islands can be visited more than once/i,
		noempty:   /пустых островов здесь нет, лишь загадочные|the islands here are (?:not empty and mysterious|mysterious and never empty)/i,
		reefs:     /здесь столько рифов, что кусачих тварей почти не осталось|lots of reefs make this sea (almost )?uninhabitable/i,
		farsight:  /здесь видно всё, кроме указателей на клады|everything is perfectly visible here, but nothing hints (at )?the location of booty/i,
		kindness:  /тёплая атмосфера не даст ковчегам атаковать друг друга|peaceful atmosphere of this sea prevents arks from attacking each other/i,
		extrabooty:/вместо ящиков здесь есть лишний клад|this sea has an extra booty and no crates/i,
		whirlpools:/ласковые водовороты здесь встречаются на каждом шагу|vortexes here are ubiquitous and mild/i,
		spotlights:/все маяки в этом море работают прожекторами|lighthouses emit long and narrow beams/i
	};
	var cond, conds = Object.create(null);
	for (var key in phrases) {
		if ((cond = phrases[key].exec(text))) {
			conds[key] = cond[0]; // assign both key and corresponding text to show in UI later
		}
	}
	return conds;
};

/**
 * @returns {?string}
 */
ui_sailing.tryExtractConditions = function() {
	var block = ui_sailing.tryFindChronicleBlock(),
		len, entries, node;
	if (!block) return null; // not sailing?
	if ((len = block.getElementsByClassName('line').length)) {
		// live sailing
		if (len >= 15) return null; // there are actually 20 entries in the block, but we test against 15 to be sure
		entries = block.getElementsByClassName('d_imp');
	} else {
		entries = block.getElementsByClassName('t1');
		if ((len = entries.length)) {
			// modern log
			for (var i = 0; i < len; i++) {
				node = entries[i];
				if (node.classList.contains('d_imp')) {
					return node.textContent;
				}
			}
			return '';
		}
		// we are viewing an old log in an archive
		entries = block.getElementsByClassName('d_imp');
		if (!entries.length) {
			// fallback for ancient logs, which do not use the d_imp class
			entries = block.getElementsByClassName('new_line');
		}
	}
	return Array.prototype.filter.call(entries, function(node) {
		return !/\bsaild_\d+\b/.test(node.className);
	}).map(function(node) {
		return node.textContent;
	}).join('\n');
};

/**
 * @param {string} html
 * @returns {string}
 */
ui_sailing.extractConditionsFromHTML = function(html) {
	var result = '', m,
		regex = /<div\s[^<>]*?\bclass\s*=\s*(["']?)([^"'<>]*?\bd_imp\b[^"'<>]*?)\1[^]*?<div\s[^<>]*?\bclass\s*=\s*["']?[^"'<>]*?\btext_content\b[^<>]*>([^]*?)<\/div>/ig;
	// roughly equivalent to .querySelectorAll('div.d_imp div.text_content')
	while ((m = regex.exec(html))) {
		if (!/\bsaild_\d+\b/.test(m[2])) {
			result += m[3] + '\n';
		}
	}
	return result;
};

/** @namespace */
ui_sailing.phrases = {
	/**
	 * @readonly
	 * @type {boolean}
	 */
	initialized: false,

	/**
	 * @readonly
	 * @type {number}
	 */
	beastiesCount: 0,

	/**
	 * @readonly
	 * @type {!Object<string, {name: string, hp: string, tre: ?(boolean|number|undefined)}>}
	 */
	beasties: Object.create(null),

	_beastiesRE: /[]/g,

	get _url() {
		var customChronicler = localStorage['LogDB:sailPhrasesURL'] || '';
		if (customChronicler.length >= 3) {
			return customChronicler;
		}
		return 'https://eximido.github.io/gvdb/seadb2_' + worker.GUIp_locale + '.json';
	},

	/**
	 * @private
	 * @param {*} beasties
	 */
	_assign: function(beasties) {
		this.initialized = true;
		if (!Array.isArray(beasties)) return;

		var regex = '(',
			dict = Object.create(null),
			count = 0;
		for (var i = 0, len = beasties.length; i < len; i++) {
			var beastie = beasties[i];
			if (!beastie) continue;
			var name = beastie.name;
			if (typeof name !== 'string' || typeof beastie.hp !== 'string') {
				continue;
			}

			var treType = typeof beastie.tre;
			if (treType !== 'boolean' && treType !== 'number' && beastie.tre != null) {
				beastie.tre = false;
			}
			if (count++) regex += '|';
			regex += GUIp.common.escapeRegex(name);
			dict[name] = beastie;
		}

		if (count) {
			this.beastiesCount = count;
			this.beasties = dict;
			this._beastiesRE = new RegExp(
				regex + (GUIp_locale === 'ru' ? ')(?!<)()' : ')([^\\s<]+|(?!<))') +
					'|[^>]([♂♀]|\uD83D[\uDCB0\uDCE6\uDC3E])', // ♂♀💰📦🐾
				'g'
			);
		}
	},

	_loadCached: function() {
		this._assign(GUIp.common.parseJSON(localStorage['LogDB:seaBeastiesList']));
	},

	/**
	 * @param {function()} callback
	 * @param {*} [thisArg]
	 */
	load: function(callback, thisArg) {
		if (this.initialized) {
			callback.call(thisArg);
			return;
		} else if (+localStorage['LogDB:lastSailUpdate'] >= Date.now() - 6*60*60*1000) { // take NaN into account
			this._loadCached(); // recent enough
			callback.call(thisArg);
			return;
		}

		// TODO: prevent multiple downloads
		var timeout = GUIp.common.setTimeout(function(self) {
			self._loadCached();
			callback.call(thisArg);
		}, 2e3, this);

		GUIp.common.getXHR(this._url, function(xhr) {
			worker.clearTimeout(timeout);

			if (xhr.lastModified && xhr.lastModified === localStorage['LogDB:lastSailSerial']) {
				GUIp.common.info('sail phrases DB is up to date');
				localStorage['LogDB:lastSailUpdate'] = Date.now();
				this._loadCached();
			} else {
				var response = GUIp.common.parseJSON(xhr.responseText);
				if (!response || response.status !== 'success') {
					GUIp.common.error('unexpected response to sea beasties update request:', xhr.responseText);
					this._loadCached();
				} else {
					// cache them
					localStorage['LogDB:seaBeastiesList'] = JSON.stringify(response.beasties);
					localStorage['LogDB:lastSailSerial'] = xhr.lastModified;
					localStorage['LogDB:lastSailUpdate'] = Date.now();
					this._assign(response.beasties);
				}
			}

			callback.call(thisArg);
		}.bind(this), function(xhr) {
			worker.clearTimeout(timeout);
			GUIp.common.error('cannot fetch sea beasties list (' + xhr.status + '):', xhr.responseText);
			this._loadCached();
			callback.call(thisArg);
		}.bind(this));
	}
};

/**
 * @param {string} name
 * @returns {boolean}
 */
ui_sailing.isBeastie = function(name) {
	if (!this.phrases.initialized) {
		throw new Error('using an uninitialized sailing phrases DB');
	}
	return name in this.phrases.beasties;
};

/**
 * @param {string} name
 * @param {number} hp
 * @returns {boolean}
 */
ui_sailing.checkBeastieHP = function(name, hp) {
	if (!this.phrases.initialized) {
		throw new Error('using an uninitialized sailing phrases DB');
	}
	var beastie = this.phrases.beasties[name];
	if (!beastie) {
		// let missing beastie to simply fail this check - no much sense to throw in this case
		return false;
	}
	var baseHP = beastie.hp.split('–');
	return (hp >= baseHP[0] && hp <= baseHP[1]);
};

ui_sailing._bhp = false;

/**
 * @private
 * @param {string} m0
 * @param {(string|undefined)} name
 * @param {(string|undefined)} punctuation
 * @param {(string|undefined)} emoji
 * @returns {string}
 */
ui_sailing._replaceBeastie = function(m0, name, punctuation, emoji) {
	// we've lost `this` here
	var beastie = '',
		hp = '';
	if (emoji) return (
		m0[0] +
		'<span class="e_emoji e_emoji_sailing' + (GUIp.common.renderTester.testChar(emoji) ? '' : ' eguip_font') +
		'">' + emoji + '</span>'
	);
	beastie = ui_sailing.phrases.beasties[name];
	hp = GUIp.common.escapeHTML(beastie.hp);
	return (
		'<span class="e_smonster' + (beastie.tre ? ' e_smonster_tre' : '') +
		'" title="' + worker.GUIp_i18n.sea_monster + ' [' + hp + ']">' +
			name +
		'</span>' +
		punctuation +
		'<sup' + (ui_sailing._bhp ? '><wbr />[' : ' class="hidden"><wbr />[') + hp + ']</sup>'
	);
};

/**
 * @param {string} html
 * @returns {string}
 */
ui_sailing.describeBeasties = function(html) {
	if (!this.phrases.initialized) {
		throw new Error('using an uninitialized sailing phrases DB');
	}
	return html.replace(this.phrases._beastiesRE, this._replaceBeastie);
};

/**
 * @param {string} selector
 * @param {?string} [cls]
 * @param {?boolean} [showBeastiesHP]
 */
ui_sailing.describeBeastiesOnPage = function(selector, cls, showBeastiesHP) {
	this.phrases.load(function() {
		if (!this.phrases.beastiesCount) {
			return;
		}
		var block = this.tryFindChronicleBlock();
		if (!block) return;

		this._bhp = showBeastiesHP || GUIp.common.isAndroid;
		var nodes = block.querySelectorAll(selector);
		for (var i = 0, len = nodes.length; i < len; i++) {
			var node = nodes[i],
				original = node.innerHTML,
				processed = this.describeBeasties(original);
			if (original !== processed) {
				node.innerHTML = processed;
			}
			if (cls) {
				node.classList.add(cls);
			}
		}
	}, this);
};

/**
 * @param {!Element} container
 * @param {!Object<string, string>} conditions
 */
ui_sailing.showConditionsOnMap = function(container, conditions) {
	if (!document.getElementById('e_sail_conditions') && Object.keys(conditions).length) {
		container.insertAdjacentHTML('afterbegin','<div id="e_sail_conditions"><span data-immediate="1">i</span></div>');
		var node = document.getElementById('e_sail_conditions');
		node.firstChild.title = worker.GUIp_i18n.sail_conds + ':\n' + Object.values(conditions).map(function(a) { return '• ' + a; }).join(';\n') + '.';
		GUIp.common.tooltips.watchSubtree(node);
	}
};
var ui_cmining = GUIp.common.mining = {};

/**
 * @typedef {Array<number>} GUIp.common.mining.Map
 */

/*
	map legend:

	0x0 - ( )   empty
	0x1 - (?)   unknown
	0x2 - (#)   wall
	0x3 - (#11) wall containing bits
	0x4 - (1)   bit
	0x5 - (11)  bits
	0x6 - (+)   medkit
	0x7 - (x)   thruster
	0x8 - (A)   boss
	0x9 - (B)   boss
	0xA - (C)   boss
	0xB - (D)   boss

	0x10  - (+) encouragement
	0x20  - (-) punishment
	0x30  - (=) miracle
	0x40  - (💀) dead boss
	0x080 - (⇡) trail
	0x180 - (⇢) trail
	0x280 - (⇣) trail
	0x380 - (⇠) trail
*/

ui_cmining._charCodes = {
	'#': 0x2,
	'1': 0x4,
	'+': 0x6,
	'x': 0x7,
	'A': 0x8,
	'B': 0x9,
	'C': 0xA,
	'D': 0xB,
	'💀': 0x40
};

ui_cmining._markerCharCodes = {
	'+': 0x10,
	'-': 0x20,
	'−': 0x20,
	'=': 0x30
};

ui_cmining._trailCharCodes = {
	'💀': 0x40,
	'⇡': 0x080,
	'⇢': 0x180,
	'⇣': 0x280,
	'⇠': 0x380
};

/**
 * @param {string} text
 * @returns {!Object<string, boolean>}
 */
ui_cmining.parseConditions = function(text) {
	return /все биты в хорошо видимых сейфах|all bits are visible and locked/.test(text) ? {
		clarity: true
	} : /боссы будут собирать биты даже в пол.те|bosses can pick up bits on the fly/.test(text) ? {
		snatching: true
	} : {}; // we don't need other conditions right now
};

/**
 * @this {number} Index of the own boss.
 * @param {!Element} cell
 * @returns {number}
 */
ui_cmining.parseMapCell = function(cell) {
	var classes = cell.classList,
		text = '',
		child;
	return (
		classes.contains('rmve') ? 0x1 : ( // ?
			(child = cell.firstElementChild) && (text = child.textContent) === '11' ? (
				classes.contains('dmw') ? 0x3 : 0x5 // #11 | 11
			) : ui_cmining._charCodes[text] || (
				text === '@' && 0x8 | this // ABCD
			)
		) | (
			(child = cell.getElementsByClassName('dm2')[0]) && ui_cmining._markerCharCodes[child.textContent] // +-=
		)
	) | (
		(child = cell.getElementsByClassName('dm1')[0]) && ui_cmining._trailCharCodes[child.textContent] // 💀⇡⇢⇣⇠
	);
};
/** @property {boolean} GUIp.common.notif.supported */
/** @property {boolean} GUIp.common.notif.enabled */
/**
 * @function GUIp.common.notif.initialize
 */
/**
 * @function GUIp.common.notif.show
 * @param {string} title
 * @param {string} text
 * @param {?number} [timeout]
 * @param {?function(): (boolean|undefined)} [callback] - Return `false` to prevent focusing the tab.
 * @param {?string} [id]
 */
/**
 * @function GUIp.common.notif.hide
 * @param {string} id
 */

GUIp.common._createStubNotificationImpl = function() {
	var nop = function() { };
	return {
		supported: false,
		enabled: false,
		initialize: nop,
		_show: nop,
		_hide: nop
	};
};

GUIp.common._createDefaultNotificationImpl = function() {
	var notifications = Object.create(null),
		timers = Object.create(null);
	var impl = {
		supported: true,
		get enabled() {
			return Notification.permission === 'granted';
		},
		initialize: function() {
			if (!impl.enabled) {
				Notification.requestPermission();
			}
		},
		_show: function(id, title, text, timeout, callback) {
			var n = notifications[id] = new Notification(title, {
				body: text,
				icon: GUIp_getResource('icon64.png'),
				tag: 'eGUI+ ' + id,
				requireInteraction: true
			});
			GUIp.common.addListener(n, 'click', function() {
				var focus = callback ? callback() : true;
				if ((focus === undefined || focus) && !document.hasFocus()) {
					worker.focus();
				}
				impl._hide(id);
			});
			if (timeout > 0) {
				timers[id] = GUIp.common.setTimeout(impl._hide, timeout, id);
			}
		},
		_hide: function(id) {
			var n = notifications[id],
				timer = 0;
			if (!n) return;
			if (n.close) {
				n.close();
			}
			if ((timer = +timers[id])) {
				clearTimeout(timer);
				delete timers[id];
			}
			delete notifications[id];
		}
	};
	return impl;
};

// Yandex.Browser decided it will not support Notifications API on Android so we are forced to send
// Chrome-specific notifications via our background script
GUIp.common._createChromeNotificationImpl = function() {
	var callbacks = Object.create(null);
	GUIp.common.addListener(worker, 'message', function onNotificationClose(ev) {
		var response = ev.data,
			callback, focus;
		if (!response || !(response = response.erinomeMessage) || response.type !== 'notifyClosed') {
			return;
		}
		if (response.manual) {
			callback = callbacks[response.notifId];
			focus = callback ? GUIp.common.try2(callback) : true;
			// because Vivaldi ignores `window.focus()`
			GUIp.common.postErinomeMessage({
				type: 'makefocus',
				tab: focus === undefined || !!focus,
				window: true
			});
		}
		delete callbacks[response.notifId];
	});
	return {
		supported: true,
		enabled: true, // we have got the permission as part of the installation process
		initialize: function() { },
		_show: function(id, title, text, timeout, callback) {
			callbacks[id] = callback;
			GUIp.common.postErinomeMessage({
				type: 'notify',
				notifId: id,
				title: title,
				message: text,
				timeout: timeout
			});
		},
		_hide: function(id) {
			GUIp.common.postErinomeMessage({type: 'notifyHide', notifId: id});
		}
	};
};

GUIp.common.defineCachedProperty(GUIp.common, 'notif', function notif() {
	var impl = GUIp_browser === 'Chrome' ? (
		GUIp.common._createChromeNotificationImpl()
	) : worker.Notification ? (
		GUIp.common._createDefaultNotificationImpl()
	) : GUIp.common._createStubNotificationImpl();

	// pending notifications are stored in a singly-linked list
	impl._firstPending = null;
	impl._lastPending = null;
	impl._pending = Object.create(null);
	impl._timer = 0;

	var _onTimer = function() {
		// take one notification from the queue and show it
		for (var n = impl._firstPending; n; n = n.next) {
			delete impl._pending[n.id];
			if (n.title) {
				impl._show(n.id, n.title, n.text, n.timeout, n.callback);
				if (!(impl._firstPending = n.next)) {
					impl._lastPending = null;
				}
				return;
			}
		}
		impl._firstPending = impl._lastPending = null;
		clearInterval(impl._timer);
		impl._timer = 0;
	};
	impl.show = function(title, text, timeout, callback, id) {
		var n;
		if (!title) {
			throw new Error("notification's title cannot be empty");
		}
		if (typeof timeout !== 'number' || timeout !== timeout) {
			timeout = 5e3;
		}
		if (!id) id = title;
		if (!impl._timer) {
			// first notification in a while; show it immediately
			impl._show(id, title, text, timeout, callback);
			impl._timer = GUIp.common.setInterval(_onTimer, 500);
		} else if ((n = impl._pending[id])) {
			// update pending notification
			n.title = title;
			n.text = text;
			n.timeout = timeout;
			n.callback = callback;
		} else {
			// queue that notification
			n = impl._pending[id] = {id: id, title: title, text: text, timeout: timeout, callback: callback, next: null};
			if (impl._lastPending) {
				impl._lastPending.next = n;
			} else {
				impl._firstPending = n;
			}
			impl._lastPending = n;
		}
	};
	impl.hide = function(id) {
		var n = impl._pending[id];
		if (n) n.title = '';
		impl._hide(id);
	};
	return impl;
});

})(this);
