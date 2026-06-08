(function(worker) {
'use strict';

var doc = document;

var $id = function(id) {
	return doc.getElementById(id);
};

var $C = function(classname) {
	return doc.getElementsByClassName(classname);
};

var $q = function(selector) {
	return doc.querySelector(selector);
};

var isMobile = !!$id('main_page');

var doTextareaResize = function(target) {
	var rows = target.value.match(/\n/g);
	if (rows) {
		target.setAttribute('rows', rows.length + (target.scrollWidth === target.clientWidth ? 1 : 2));
	}
};

var setTextareaResize = function(id, inner_func) {
	var ta = $id(id),
		// changing the number of rows in a textarea is extremely slow
		resize = GUIp.common.isAndroid ? GUIp.common.debounce(750, doTextareaResize) : doTextareaResize,
		handler = function() {
			resize(ta);
			if (inner_func) inner_func();
		};
	GUIp.common.addListener(ta, 'change', handler);
	GUIp.common.addListener(ta, 'cut', handler);
	GUIp.common.addListener(ta, 'focus', handler);
	GUIp.common.addListener(ta, 'input', handler);
	GUIp.common.addListener(ta, 'paste', handler);
};

var storage = {
	_get_key: function(key) {
		return 'eGUI_' + god_name + ':' + key;
	},
	set: function(id, value) {
		localStorage.setItem(this._get_key(id), value);
		return value;
	},
	get: function(id) {
		return localStorage.getItem(this._get_key(id));
	},
	getFlag: function(id) {
		return this.get(id) === 'true';
	},
	getList: function(id) {
		var s = this.get(id);
		return s ? s.split(',') : [];
	},
	remove: function(id) {
		localStorage.removeItem(this._get_key(id));
	},
	importSettings: function(options_string,global_import) {
		if (global_import && !worker.confirm(worker.GUIp_i18n.import_all_warning)) {
			return;
		}
		try {
			if (typeof options_string !== 'string' || options_string.length > 256 * 1024) {
				throw('');
			}
			var pf = null, options = JSON.parse(options_string);
			if (!options || Array.isArray(options) || typeof options !== 'object' || Object.keys(options).length > 500) {
				throw('');
			}
			for (var key in options) {
				if (
					!Object.prototype.hasOwnProperty.call(options, key) ||
					typeof options[key] !== 'string' ||
					key.length > 256 ||
					options[key].length > 64 * 1024
				) {
					throw('');
				}
				var keyIsGlobal = key.startsWith('eGUI_');
				if (pf === null) {
					pf = keyIsGlobal;
				} else if (pf !== keyIsGlobal) {
					throw('');
				}
			}
			if (global_import === pf) {
				for (var key in options) {
					if (global_import) {
						localStorage.setItem(key, options[key]);
					} else {
						this.set(key, options[key]);
					}
				}
			} else {
				throw('');
			}
			worker.alert(worker.GUIp_i18n.import_success);
			location.reload();
		} catch (e) {
			worker.alert(worker.GUIp_i18n.import_fail);
		}
	},
	exportSettings: function(global_export) {
		if (global_export && !worker.confirm(worker.GUIp_i18n.export_all_warning)) {
			return '';
		}
		var options = {};
		for (var key in localStorage) {
			if (/useBackground|informerCustomSound|forumInformerCustomSound/.test(key) && localStorage.getItem(key).length > 1000) {
				continue;
			}
			if ((global_export || key.startsWith(this._get_key(''))) && !/^(?:fr_h|fr_arr|d_i|p__upd|p__grp|LogDB:|eGUI_.*?:(?:Log(?:ger)?|LEMRestrictions|Newspaper):)/.test(key)) {
				options[!global_export ? key.replace(this._get_key(''), '') : key] = localStorage.getItem(key);
			}
		}
		return JSON.stringify(options);
	}
};

function addMenu() {
	if (!$id('ui_settings')) {
		var newNode, node;
		if (!isMobile) {
			node = $q('#profile_main p');
			newNode = doc.createTextNode(' | ');
			node.appendChild(newNode);
		}
		newNode = doc.createElement('a');
		newNode.id = 'ui_settings';
		newNode.href = '/user/profile/settings#ui_settings';
		newNode.textContent = worker.GUIp_i18n.ui_settings;
		if (!isMobile) {
			node.appendChild(newNode);
		} else {
			newNode.classList.add('ui-btn');
			newNode.classList.add('ui-corner-all');
			node = $q('#main_page p');
			node.parentNode.insertBefore(doc.createElement('p').appendChild(newNode).parentNode, node);
		}
		if (isMobile ? $id('pwd_form') : !$q('#opt_change_profile div div')) {
			GUIp.common.addListener($id('ui_settings'), 'click', function() {
				loadOptions();
				improve_blocks();
			});
		}
	}
};

function checkThirdEye() {
	var cinput, cfn = function(element, text) {
		if (!element.checked) {
			element.parentNode.classList.add('e_missing_tes');
			element.parentNode.title = text;
			GUIp.common.tooltips.watchSubtree(element.parentNode);
		} else {
			element.parentNode.classList.remove('e_missing_tes');
			element.parentNode.title = '';
		}
	};
	if ((cinput = $id('tmpl_profit'))) {
		GUIp.common.addListener(cinput, 'click', function() { cfn(this,worker.GUIp_i18n.tes_tmpl_profit); });
		cfn(cinput,worker.GUIp_i18n.tes_tmpl_profit);
	}
	if ((cinput = $id('dgn_res'))) {
		GUIp.common.addListener(cinput, 'click', function() { cfn(this,worker.GUIp_i18n.tes_dgn_res); });
		cfn(cinput,worker.GUIp_i18n.tes_dgn_res);
	}
	if ((cinput = $id('r_res'))) {
		GUIp.common.addListener(cinput, 'click', function() { cfn(this,worker.GUIp_i18n.tes_r_res); });
		cfn(cinput,worker.GUIp_i18n.tes_r_res);
	}
	if ((cinput = $id('chf_res'))) {
		GUIp.common.addListener(cinput, 'click', function() { cfn(this,worker.GUIp_i18n.tes_chf_res); });
		cfn(cinput,worker.GUIp_i18n.tes_chf_res);
	}
};

var setAllCheckboxesToState = function(classname, state) {
	var checkboxes = $C(classname);
	for (var i = 0, len = checkboxes.length; i < len; i++) {
		checkboxes[i].checked = state;
	}
};

var setAllCheckboxesDisabled = function(classname, state) {
	var checkboxes = $C(classname);
	for (var i = 0, len = checkboxes.length; i < len; i++) {
		checkboxes[i].disabled = state;
	}
};

var modifyTextsForHeroines = function(selector) {
	var content = doc.querySelectorAll(selector);
	for (var i = 0, len = content.length; i < len; i++) {
		// max depth assumed to be just 1, so no need for recursions
		if (content[i].children.length === 0) {
			content[i].textContent = content[i].textContent.replace('героя','героини').replace('герою','героине');
			continue;
		}
		// make same replacements in child label elements if applicable
		var labels = content[i].getElementsByTagName('label');
		for (var j = 0, len2 = labels.length; j < len2; j++) {
			if (labels[j].children.length === 0) {
				labels[j].textContent = labels[j].textContent.replace('героя','героини').replace('герою','героине');
			}
		}
	}
};

var getOptionName = function(id) {
	var parts = id.split('_');
	for (var k = 1; k < parts.length; k++) {
		parts[k] = parts[k][0].toUpperCase() + parts[k].slice(1);
	}
	return parts.join('');
};

var restoreOptionValues = function() {
	var checkboxes = document.querySelectorAll('.option-checkbox, .menu-checkbox');
	for (var optval, i = 0, len = checkboxes.length; i < len; i++) {
		if (!checkboxes[i].id) {
			continue;
		}
		var optType = checkboxes[i].dataset.optionType;
		if ((optval = storage.get('Option:' + getOptionName(checkboxes[i].id))) && optval !== 'false') {
			checkboxes[i].checked = true;
			if ($id(checkboxes[i].id + '_desc')) {
				$id(checkboxes[i].id + '_desc').style.display = 'none';
			}
			if (optType === 'cbgroup' || optType === 'islands-cbgroup' || optType === 'dungeon-cbgroup' || optType === 'range-cbgroup') {
				var inputs = document.querySelectorAll('#' + checkboxes[i].id + '_choice input, #' + checkboxes[i].id + '_cbs input');
				for (var j = 0, len2 = inputs.length; j < len2; j++) {
					if (!optval.match(inputs[j].dataset.valueName) !== !checkboxes[i].dataset.optionInversed) {
						inputs[j].checked = true;
					} else {
						inputs[j].checked = false;
					}
				}
				if (optType === 'islands-cbgroup') {
					if (optval.includes('shh')) {
						$id('islands_map_hints_polylinear').checked = true;
					} else if (optval.includes('newhints')) {
						$id('islands_map_hints_tile_marking').checked = true;
					} else {
						$id('islands_map_hints_tile_marking_old').checked = true;
					}
				}
			} else if (optType === 'number' || optType === 'text') {
				var input = document.querySelector('#' + checkboxes[i].id + '_choice input');
				input.value = optval;
			} else if (optType === 'background') {
				if (optval !== 'cloud') {
					$id('custom_background').checked = true;
				}
			} else if (optType === 'infosound' || optType === 'forumsound') {
				if (optval === 'arena' || optval === 'spar' || optval === 'msg') {
					$id(optType + '_' + optval).checked = true;
				} else if (optval.startsWith('data:')) {
					$id(optType + '_custom').checked = true;
				} else {
					$id(optType + '_custom_lnk').checked = true;
					$id(optType + '_lnk').value = optval;
				}
				optval = storage.get('Option:' + getOptionName((optType === 'forumsound' ? 'forum_' : '') + 'informer_custom_sound_volume'));
				$id(optType + '_volume').value = parseInt(optval) || 100;
			}
		} else {
			if ($id(checkboxes[i].id + '_choice')) {
				$id(checkboxes[i].id + '_choice').style.display = 'none';
			}
			if (optType === 'number' || optType === 'text') {
				var input = document.querySelector('#' + checkboxes[i].id + '_choice input');
				input.value = checkboxes[i].dataset.defaultValue || '';
			}
		}
	}
	if ($id('disable_godville_clock').checked) {
		$id('localtime_godville_clock_h').style.display = 'none';
		$id('localtime_godville_clock_desc').style.display = 'none';
	}
	if ($id('disable_logger').checked) {
		$id('sum_allies_hp_h').style.display = 'none';
		$id('sum_allies_hp_desc').style.display = 'none';
	}
	var activeInformers = storage.get('Option:activeInformers');
	if (activeInformers) {
		activeInformers = JSON.parse(activeInformers);
		var aiCheckboxes = $C('informer-checkbox');
		for (var i = 0, len = aiCheckboxes.length; i < len; i++) {
			if (activeInformers[aiCheckboxes[i].dataset.id] && (activeInformers[aiCheckboxes[i].dataset.id] & aiCheckboxes[i].dataset.type) == aiCheckboxes[i].dataset.type) {
				aiCheckboxes[i].checked = true;
			}
		}
	}
	if ($id('disable_voice_generators').checked) {
		$id('voice_menu').style.display = 'none';
		$id('words').style.display = 'none';
	}
	$id('user_css').value = storage.get('UserCss') || '';
	doTextareaResize($id('user_css'));
};

var processOptionValues = function(id) {
	var result = null, optionbox = $id(id), optType = optionbox.dataset.optionType;
	if (!optionbox.checked) {
		result = '';
	} else if (optType === 'cbgroup' || optType === 'dungeon-cbgroup' || optType === 'range-cbgroup') {
		var values = [], inputs = document.querySelectorAll('#' + id + '_choice input, #' + id + '_cbs input');
		for (var i = 0, len = inputs.length; i < len; i++) {
			if (!inputs[i].checked !== !optionbox.dataset.optionInversed) {
				values.push(inputs[i].dataset.valueName);
			}
		}
		result = values.join();
	} else if (optType === 'islands-cbgroup') {
		var values = [], inputs = document.querySelectorAll('#' + id + '_cbs input[type=checkbox]'),
			ignoredValues = ['mbc','mfc'],
			currentValues = storage.getList('Option:islandsMapSettings'),
			newHints = currentValues.includes('newhints');
		for (var i = 0, len = ignoredValues.length; i < len; i++) {
			if (currentValues.includes(ignoredValues[i])) {
				values.push(ignoredValues[i]);
			}
		}
		for (var i = 0, len = inputs.length; i < len; i++) {
			if (inputs[i].checked) {
				values.push(inputs[i].dataset.valueName);
			}
		}
		if ($id('islands_map_hints_tile_marking').checked) {
			newHints = true;
		} else if ($id('islands_map_hints_tile_marking_old').checked) {
			newHints = false;
		} else if ($id('islands_map_hints_polylinear').checked) {
			values.push('shh'); // preserving newhints
		}
		if (newHints) {
			values.push('newhints');
		}
		result = values.join();
	} else if (optType === 'number') {
		var input = document.querySelector('#' + id + '_choice input');
		result = parseInt(input.value);
		if (isNaN(parseInt(input.value)) || ((typeof optionbox.dataset.minValue !== 'undefined') && result < optionbox.dataset.minValue)) {
			result = optionbox.dataset.defaultValue || '';
			input.value = optionbox.dataset.defaultValue || '';
		}
	} else if (optType === 'text') {
		var input = document.querySelector('#' + id + '_choice input');
		result = input.value.trim();
		if ((typeof optionbox.dataset.minLength !== 'undefined') && result.length < optionbox.dataset.minLength) {
			result = optionbox.dataset.defaultValue || '';
			input.value = optionbox.dataset.defaultValue || '';
		}
	} else if (optType === 'background') {
		if ($id('custom_background').checked) {
			var custom_file = $id('custom_file').files[0],
				custom_link = $id('custom_link').value.match(/https?:\/\/.*/),
				cb_status = $id('cb_status');
			if (custom_file && custom_file.type.match(/^image\/(bmp|cis\-cod|gif|ief|jpeg|jpg|pipeg|png|svg\+xml|tiff|x\-cmu\-raster|x\-cmx|x\-icon|x\-portable\-anymap|x\-portable\-bitmap|x\-portable\-graymap|x\-portable\-pixmap|x\-rgb|x\-xbitmap|x\-xpixmap|x\-xwindowdump)$/i)) {
				var reader = new FileReader();
				GUIp.common.addListener(reader, 'load', function(e) {
					storage.set('Option:useBackground', e.target.result);
					set_theme_and_background();
					displaySaveTime();
				});
				reader.readAsDataURL(custom_file);
				cb_status.textContent = worker.GUIp_i18n.bg_status_file;
				cb_status.style.color = 'green';
			} else if (custom_link) {
				cb_status.textContent = worker.GUIp_i18n.bg_status_link;
				cb_status.style.color = 'green';
				result = custom_link;
			} else if (storage.get('Option:useBackground') && storage.get('Option:useBackground') !== 'cloud') {
				cb_status.textContent = worker.GUIp_i18n.bg_status_same;
				cb_status.style.color = 'blue';
			} else {
				cb_status.textContent = worker.GUIp_i18n.bg_status_error;
				cb_status.style.color = 'red';
				GUIp.common.setTimeout(function() {
					$id('cloud_background').click();
				}, 150);
				result = 'cloud';
			}
			//jQuery('#cb_status').fadeIn();
			$id('cb_status').style.display = 'block';
			GUIp.common.setTimeout(function() {
				//jQuery('#cb_status').fadeOut();
				$id('cb_status').style.display = 'none';
			}, 3000);
		} else if ($id('cloud_background').checked) {
			result = 'cloud';
		}
	} else if (optType === 'infosound' || optType === 'forumsound') {
		if ($id(optType + '_custom').checked) {
			var custom_file = $id(optType + '_file').files[0],
				cb_status = $id(optType + '_status');
			if (custom_file) {
				if (!custom_file.type.match(/^(audio|video)\/(mpeg|mp3|ogg|wav)$/i)) {
					cb_status.textContent = worker.GUIp_i18n.informer_custom_sound_error_type;
					cb_status.style.color = 'red';
				} else if (custom_file.size > 100*1024) {
					cb_status.textContent = worker.GUIp_i18n.informer_custom_sound_error_size + '100KB';
					cb_status.style.color = 'red';
				} else {
					var reader = new FileReader;
					GUIp.common.addListener(reader, 'load', function(e) {
						storage.set(
							optType === 'infosound' ? 'Option:informerCustomSound' : 'Option:forumInformerCustomSound',
							e.target.result
						);
						displaySaveTime();
					});
					reader.readAsDataURL(custom_file);
					cb_status.textContent = worker.GUIp_i18n.bg_status_file + ' ok';
					cb_status.style.color = 'green';
				}
			} else {
				cb_status.textContent = worker.GUIp_i18n.bg_status_error;
				cb_status.style.color = 'red';
			}
			if (cb_status.style.color === 'red') {
				GUIp.common.setTimeout(function() {
					$id(optType === 'infosound' ? 'infosound_arena' : 'forumsound_msg').checked = true;
				}, 150);
				result = optType === 'infosound' ? 'arena' : 'msg';
			}
			cb_status.style.display = 'inline';
			GUIp.common.setTimeout(function() {
				cb_status.style.display = 'none';
			}, 3000);
		} else if ($id(optType + '_custom_lnk').checked) {
			result = $id(optType + '_lnk').value;
		} else if ($id(optType + '_arena').checked) {
			result = 'arena';
		} else if ($id(optType + '_spar').checked) {
			result = 'spar';
		} else if ($id(optType + '_msg').checked) {
			result = 'msg';
		}
	}
	if (id.endsWith('_volume')) {
		result = parseInt(optionbox.value) || 100;
		id = (id.startsWith('forumsound') ? 'forum_' : '') + 'informer_custom_sound_volume';
	}
	if (result !== null) {
		storage.set('Option:' + getOptionName(id), result);
		if (optType === 'background') {
			set_theme_and_background();
		}
		displaySaveTime();
	}
};

var processInformersValues = function() {
	var activeInformers = {},
		aiCheckboxes = $C('informer-checkbox');
	for (var i = 0, len = aiCheckboxes.length; i < len; i++) {
		if (aiCheckboxes[i].checked) {
			if (!activeInformers[aiCheckboxes[i].dataset.id]) {
				activeInformers[aiCheckboxes[i].dataset.id] = 0;
			}
			activeInformers[aiCheckboxes[i].dataset.id] += parseInt(aiCheckboxes[i].dataset.type);
		}
	}
	if (activeInformers['smelter']) {
		activeInformers['smelt!'] = activeInformers['smelter'];
	}
	if (activeInformers['transformer']) {
		activeInformers['transform!'] = activeInformers['transformer'];
	}
	storage.set('Option:activeInformers', JSON.stringify(activeInformers));
	displaySaveTime();
};

var displaySaveTime = function() {
	$id('options_saved').textContent = '(' + worker.GUIp_i18n.options_saved + GUIp.common.formatTime(new Date(),'fulltime') + ')';
};

var loadOptions = function() {
	if (!(god_name !== '_unknown_' && (isMobile ? $id('pwd_form') : $id('profile_main')))) {
		GUIp.common.setTimeout(loadOptions, 100);
		return;
	} else if (god_name === '_unknown_') {
		// trying to set anything without a proper godname is meaningless
		return;
	}
	var node;
	if (isMobile) {
		// get rid of extra stuff on default options page
		Array.prototype.slice.call($id('main_page').children, 2).map(function(el) { el.parentNode.removeChild(el); });
		document.body.classList.add('mobile');
		node = $q('#main_page div.wrapped');
	} else {
		node = $id('profile_main');
	}
	node.innerHTML = worker.getOptionsPage(def, isMobile, storage.getFlag('charHasShop'));
	if (isMobile) {
		Array.prototype.forEach.call(node.querySelectorAll('input[title]'), function(a) {
			GUIp.common.tooltips.watchSubtree(a);
		});
	}
	setForm();

	// textareas
	setTextareaResize('ta_edit', setSaveWordsButtonState);
	setTextareaResize('user_css', setUserCSSSaveButtonState);

	restoreOptionValues();

	var checkboxes, callback;
	// toggle option checkboxes
	checkboxes = $C('option-checkbox');
	for (var i = 0, len = checkboxes.length; i < len; i++) {
		GUIp.common.addListener(checkboxes[i], 'click', function() {
			storage.set('Option:' + getOptionName(this.id), this.checked);
			displaySaveTime();
		});
	}
	// toggle menu checkboxes
	checkboxes = $C('menu-checkbox');
	for (var i = 0, len = checkboxes.length; i < len; i++) {
		var optType = checkboxes[i].dataset.optionType;
		GUIp.common.addListener(checkboxes[i], 'click', function() {
			if ($id(this.id + '_desc')) {
				$id(this.id + '_desc').style.display = this.checked ? 'none' : 'block';
			}
			if ($id(this.id + '_choice')) {
				$id(this.id + '_choice').style.display = this.checked ? 'block' : 'none';
			}
			processOptionValues(this.id);
		});
		if (optType === 'cbgroup') {
			var inputs = document.querySelectorAll('#' + checkboxes[i].id + '_choice input');
			callback = processOptionValues.bind(null, checkboxes[i].id);
			for (var j = 0, len2 = inputs.length; j < len2; j++) {
				GUIp.common.addListener(inputs[j], 'click', callback);
			}
		} else if (optType === 'islands-cbgroup' || optType === 'dungeon-cbgroup' || optType === 'range-cbgroup') {
			var inputs = document.querySelectorAll('#' + checkboxes[i].id + '_cbs input');
			callback = processOptionValues.bind(null, checkboxes[i].id);
			for (var j = 0, len2 = inputs.length; j < len2; j++) {
				GUIp.common.addListener(inputs[j], 'click', callback);
			}
		} else if (optType === 'number' || optType === 'text') {
			var input = document.querySelector('#' + checkboxes[i].id + '_choice input'),
				button = document.querySelector('#' + checkboxes[i].id + '_choice button');
			GUIp.common.addListener(input, 'keyup', function() {
				this.style.backgroundColor = '#F4F999';
			});
			button.title = worker.GUIp_i18n.apply;
			GUIp.common.addListener(button, 'click', function(input,id) {
				input.style.backgroundColor = '';
				processOptionValues(id);
			}.bind(null, input, checkboxes[i].id));
		} else if (optType === 'background') {
			var button = document.querySelector('#' + checkboxes[i].id + '_choice button');
			button.title = worker.GUIp_i18n.apply;
			GUIp.common.addListener(button, 'click', function() {
				$id('custom_link').style.backgroundColor = '';
				$id('custom_background').checked = true;
				processOptionValues('use_background');
			});
			GUIp.common.addListener($id('cloud_background'), 'click', function() {
				processOptionValues('use_background');
			});
			GUIp.common.addListener($id('custom_file'), 'change', function() {
				$id('custom_background').checked = true;
				processOptionValues('use_background');
			});
			GUIp.common.addListener($id('custom_link'), 'keyup', function() {
				this.style.backgroundColor = '#F4F999';
			});
		} else if (optType === 'infosound' || optType === 'forumsound') {
			var button = document.querySelector('#' + checkboxes[i].id + '_choice button');
			GUIp.common.addListener(button, 'click', optType === 'infosound' ? function() {
				GUIp.common.playSound(storage.get('Option:informerCustomSound') || 'arena', storage.get('Option:informerCustomSoundVolume'));
			} : function() {
				GUIp.common.playSound(storage.get('Option:forumInformerCustomSound') || 'msg', storage.get('Option:forumInformerCustomSoundVolume'));
			});
			callback = function(optType, t1, t2) {
				if ($id(optType + t1).value) {
					$id(optType + t2).checked = true;
				} else {
					$id(optType + (optType === 'infosound' ? '_arena' : '_msg')).checked = true;
				}
				processOptionValues(optType === 'infosound' ? 'informer_custom_sound' : 'forum_informer_custom_sound');
			};
			GUIp.common.addListener($id(optType + '_custom'), 'click', callback.bind(null, optType, '_file', '_custom'));
			GUIp.common.addListener($id(optType + '_file'), 'change', callback.bind(null, optType, '_file', '_custom'));
			GUIp.common.addListener($id(optType + '_custom_lnk'), 'click', callback.bind(null, optType, '_lnk', '_custom_lnk'));
			GUIp.common.addListener($id(optType + '_lnk'), 'change', callback.bind(null, optType, '_lnk', '_custom_lnk'));
			callback = function(optType) {
				processOptionValues(optType === 'infosound' ? 'informer_custom_sound' : 'forum_informer_custom_sound');
			}.bind(null, optType);
			GUIp.common.addListener($id(optType + '_arena'), 'click', callback);
			GUIp.common.addListener($id(optType + '_spar'), 'click', callback);
			GUIp.common.addListener($id(optType + '_msg'), 'click', callback);
			GUIp.common.addListener($id(optType + '_volume'), 'change', function(optType) {
				processOptionValues(optType + '_volume');
			}.bind(null, optType));
		}
	}
	// toggle informers checkboxes
	checkboxes = $C('informer-checkbox');
	for (var i = 0, len = checkboxes.length; i < len; i++) {
		GUIp.common.addListener(checkboxes[i], 'click', processInformersValues);
	}
	if (!$id('enable_informer_alerts').checked || !GUIp.common.notif.supported) {
		for (var i = 0, len = checkboxes.length; i < len; i++) {
			if (checkboxes[i].dataset.type === '32') {
				checkboxes[i].disabled = true;
			}
		}
	}
	GUIp.common.addListener($id('enable_informer_alerts'), 'click', function() {
		for (var i = 0, len = checkboxes.length; i < len; i++) {
			if (checkboxes[i].dataset.type === '32') {
				checkboxes[i].disabled = !$id('enable_informer_alerts').checked;
			}
		}
	});
	if (!GUIp.common.notif.supported) {
		$id('enable_informer_alerts').disabled = true;
		$id('enable_pm_alerts').disabled = true;
	}
	// reset gp threshold when disabling dischange button improvement
	GUIp.common.addListener($id('improve_discharge_button'), 'click', function() {
		if (!$id('improve_discharge_button').checked) {
			localStorage.removeItem('gp_thre');
		}
	});
	// hide some options depending on the state of some other options
	GUIp.common.addListener($id('disable_godville_clock'), 'click', function() {
		$id('localtime_godville_clock_h').style.display = $id('disable_godville_clock').checked ? 'none' : 'block';
		$id('localtime_godville_clock_desc').style.display = $id('disable_godville_clock').checked ? 'none' : 'block';
	});
	GUIp.common.addListener($id('disable_logger'), 'click', function() {
		$id('sum_allies_hp_h').style.display = $id('disable_logger').checked ? 'none' : 'block';
		$id('sum_allies_hp_desc').style.display = $id('disable_logger').checked ? 'none' : 'block';
	});
	GUIp.common.addListener($id('disable_voice_generators'), 'click', function() {
		//jQuery('#voice_menu').slideToggle("slow");
		$id('voice_menu').style.display = $id('voice_menu').style.display === 'none' ? 'block' : 'none';
		//jQuery('#words').slideToggle("slow");
		$id('words').style.display = $id('words').style.display === 'none' ? 'block' : 'none';
	});
	// change some labels for heroines
	if (!storage.getFlag('charIsMale')) {
		modifyTextsForHeroines('.g_desc');
		modifyTextsForHeroines('.l_capt');
	}
	// import/export
	GUIp.common.addListener($id('settings_import'), 'click', function() {
		storage.importSettings($id('guip_settings').value,$id('settings_everything').checked);
	});
	GUIp.common.addListener($id('settings_export'), 'click', function() {
		$id('guip_settings').value = storage.exportSettings($id('settings_everything').checked);
	});
	if (worker.__godvillePlusAndroid) {
		$id('settings_download').style.display = 'none';
		$id('settings_upload').style.display = 'none';
	}
	GUIp.common.addListener($id('settings_download'), 'click', function() {
		if (worker.__godvillePlusAndroid) return;
		var keyword;
		if (keyword = worker.prompt(worker.GUIp_i18n.settings_cloud_download_warning)) {
			var path = GUIp.common.erinome_url + '/cloud/?act=download&gn=' + worker.encodeURIComponent(god_name) + '&kw=' + worker.encodeURIComponent(keyword) + (worker.GUIp_locale === 'en' ? '&l=1' : '');
			GUIp.common.getXHR(path, function(xhr) {
				switch (xhr.responseText.slice(0,3)) {
				case 'ok#':
					$id('guip_settings').value = xhr.responseText.slice(3);
					worker.alert(worker.GUIp_i18n.settings_cloud_download_ok);
					break;
				case 'wk#':
					worker.alert(worker.GUIp_i18n.settings_cloud_wrong_keyword);
					break;
				case 'nd#':
					worker.alert(worker.GUIp_i18n.settings_cloud_missing);
					break;
				default:
					worker.alert(worker.GUIp_i18n.settings_cloud_error);
				}
			}, function() {
				worker.alert(worker.GUIp_i18n.settings_cloud_error);
			});
		}
	});
	GUIp.common.addListener($id('settings_upload'), 'click', function() {
		if (worker.__godvillePlusAndroid) return;
		var keyword;
		if (keyword = worker.prompt(worker.GUIp_i18n.settings_cloud_upload_warning)) {
			var path = GUIp.common.erinome_url + '/cloud/?act=upload&gn=' + worker.encodeURIComponent(god_name) + '&kw=' + worker.encodeURIComponent(keyword) + (worker.GUIp_locale === 'en' ? '&l=1' : ''),
				postdata = 'data='+worker.encodeURIComponent(storage.exportSettings());
			GUIp.common.postXHR(path, postdata, 'url', function(xhr) {
				if (xhr.responseText.slice(0,3) === 'ok#') {
					worker.alert(worker.GUIp_i18n.settings_cloud_upload_ok);
				} else if (xhr.responseText.slice(0,3) === 'wk#') {
					worker.alert(worker.GUIp_i18n.settings_cloud_wrong_keyword);
				} else {
					worker.alert(worker.GUIp_i18n.settings_cloud_error);
				}
			}, function() {
				worker.alert(worker.GUIp_i18n.settings_cloud_error);
			});
		}
	});
	GUIp.common.addListener($id('settings_everything'), 'click', function() {
		$id('settings_download').disabled = $id('settings_everything').checked;
		$id('settings_upload').disabled = $id('settings_everything').checked;
	});
	// bind popup windows to their buttons
	GUIp.common.addListener($id('span_chosen'), 'click', GUIp.common.createLightbox.bind(null,'chosen_monsters',storage,def,null));
	GUIp.common.addListener($id('span_special'), 'click', GUIp.common.createLightbox.bind(null,'special_monsters',storage,def,null));
	GUIp.common.addListener($id('span_ccraft'), 'click', GUIp.common.createLightbox.bind(null,'custom_craft',storage,def,null));
	GUIp.common.addListener($id('span_informers'), 'click', GUIp.common.createLightbox.bind(null,'custom_informers',storage,def,null));
	GUIp.common.addListener($id('span_ally_blacklist'), 'click', GUIp.common.createLightbox.bind(null,'ally_blacklist',storage,def,null));
};

function setForm() {
	for (var sect in def.phrases) {
		addOnClick(sect);
	}
	GUIp.common.addListener($id('save_words'), 'click', function(ev) {
		ev.preventDefault();
		saveWords();
	});
	GUIp.common.addListener($id('set_default'), 'click', function(ev) {
		ev.preventDefault();
		delete_custom_words();
	});
	GUIp.common.addListener($id('save_user_css'), 'click', function(ev) {
		ev.preventDefault();
		saveUserCSS();
	});
}

function addOnClick(sect) {
	GUIp.common.addListener($id('l_' + sect), 'click', function(ev) {
		ev.preventDefault();
		setText(sect);
	});
}

function delete_custom_words() {
	var ta = $id('ta_edit'),
		text = def.phrases[curr_sect];
	ta.value = text.join('\n');
	doTextareaResize(ta);
	storage.remove('CustomPhrases:' + curr_sect);
	storage.set('phrasesChanged', 'true');
	setSaveWordsButtonState();
	setDefaultWordsButtonState(false);
}

function saveWords() {
	var text = $id('ta_edit').value;
	if (text === "") { return; }
	var t_list = text.split("\n"),
		t_out = [];
	for (var i = 0; i < t_list.length; i++) {
		if (t_list[i] !== '') {
			t_out.push(t_list[i]);
		}
	}
	storage.set('CustomPhrases:' + curr_sect, t_out.join('||'));
	storage.set('phrasesChanged', 'true');
	setSaveWordsButtonState();
	setDefaultWordsButtonState(true);
}

function setSaveWordsButtonState() {
	var save_words = $id('save_words');
	if ($id('ta_edit').value.replace(/\n/g, '||') !== (storage.get('CustomPhrases:' + curr_sect) || def.phrases[curr_sect].join('||'))) {
		save_words.removeAttribute('disabled');
	} else {
		save_words.setAttribute('disabled', 'disabled');
	}
}

function setDefaultWordsButtonState(condition) {
	var set_default = $id('set_default');
	if (condition) {
		set_default.removeAttribute('disabled');
	} else {
		set_default.setAttribute('disabled', 'disabled');
	}
}

function setText(sect) {
	curr_sect = sect;
	if ($q('#words a.selected')) { $q('#words a.selected').classList.remove('selected'); }
	$q('#words a#l_' + curr_sect).classList.add('selected');
	var text_list = storage.get('CustomPhrases:' + curr_sect),
		text = text_list ? text_list.split('||') : def.phrases[curr_sect],
		textarea = $id('ta_edit');
	textarea.removeAttribute('disabled');
	textarea.value = text.join('\n');
	doTextareaResize(textarea);
	setSaveWordsButtonState();
	setDefaultWordsButtonState(text_list);
}

function saveUserCSS() {
	storage.set('UserCss', $id('user_css').value);
	setUserCSSSaveButtonState();
}

function setUserCSSSaveButtonState() {
	var save_user_css = $id('save_user_css');
	if ($id('user_css').value !== storage.get('UserCss')) {
		save_user_css.removeAttribute('disabled');
	} else {
		save_user_css.setAttribute('disabled', 'disabled');
	}
}

function improve_blocks() {
	var blocks = document.querySelectorAll('.bl_cell:not(.block), #pant_tbl:not(.block)');
	for (var i = 0, len = blocks.length; i < len; i++) {
		blocks[i].classList.add('block');
	}
}

function set_theme_and_background() {
	var ui_s_css = document.getElementById('ui_s_css');
	if (ui_s_css) {
		ui_s_css.parentNode.removeChild(ui_s_css);
	}
	GUIp.common.addCSSFromURL('/stylesheets/' + storage.get('ui_s') + '.css', 'ui_s_css');
	GUIp.common.setPageBackground(storage.get('Option:useBackground'));
}

var def, curr_sect, god_name;

/**
 * @param {string} name
 * @param {function(function())} initializer
 * @param {*} [thisArg]
 */
var registerModuleAsync = function(name, initializer, thisArg) {
	worker.addEventListener('message', function onMessage(ev) {
		if (ev.source !== worker || ev.origin !== worker.location.origin) { return; }
		if (!ev.data || typeof ev.data !== 'object') { return; }
		var msg = ev.data.erinomeMessage;
		if (msg && msg.type === 'initModule' && msg.which === name) {
			worker.removeEventListener('message', onMessage);
			msg.type = 'moduleInitialized';
			try {
				initializer.call(thisArg, worker.postMessage.bind(null, ev.data, ev.origin));
			} catch (e) {
				worker.console.error('[eGUI+] error:', e);
			}
		}
	});
};

/**
 * @param {string} name
 * @param {function()} initializer
 * @param {*} [thisArg]
 */
var registerModule = function(name, initializer, thisArg) {
	registerModuleAsync(name, function(callback) {
		initializer.call(this); // note: throwing aborts loading dependent modules
		callback();
	}, thisArg);
};

registerModule('options', function() {
	// mobile version doesn't show godname anywhere in profile page
	god_name = !isMobile && $q('#opt_change_profile div div').textContent;
	if (god_name) {
		GUIp.common.setCurrentGodname(god_name);
	} else {
		god_name = GUIp.common.getCurrentGodname();
	}
	def = worker.GUIp_words();
	if (!(isMobile ? $id('settings_form') : $q('#opt_change_profile div div'))) {
		addMenu();
		if (location.href.endsWith('/third_eye')) {
			checkThirdEye();
		}
		return;
	}
	if (location.hash === "#ui_settings") {
		loadOptions();
	} else {
		addMenu();
	}
	set_theme_and_background();
	improve_blocks();
	if (worker.GUIp_browser !== 'Opera') {
		var observer = GUIp.common.newMutationObserver(function(mutations) {
			for (var i = 0, len = mutations.length; i < len; i++) {
				for (var j = 0, len2 = mutations[i].addedNodes.length; j < len2; j++) {
					if (mutations[i].addedNodes[j].querySelector && mutations[i].addedNodes[j].querySelector('.bl_cell')) {
						mutations[i].addedNodes[j].querySelector('.bl_cell').classList.add('block');
					}
				}
			}
		});
		if (document.getElementById('profile_main')) {
			observer.observe(document.getElementById('profile_main'), {childList: true, subtree: true});
		}
	}

	GUIp.common.expr.init(jsep.noConflict());
});

})(this);
