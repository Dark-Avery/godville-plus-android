(function(worker) {
'use strict';

worker.GUIp = worker.GUIp || {};

// ui_data
var ui_data = worker.GUIp.data = {};

// base variables initialization
ui_data.init = function() {
	var onAlertToggle;
	ui_data._initVariables();
	// desktop notifications permissions
	if (ui_storage.getFlag('Option:enableInformerAlerts') || ui_storage.getFlag('Option:enablePmAlerts')) {
		GUIp.common.notif.initialize();
	}
	onAlertToggle = function(newValue) {
		if (newValue === 'true') GUIp.common.notif.initialize();
	};
	ui_storage.addListener('Option:enableInformerAlerts', onAlertToggle);
	ui_storage.addListener('Option:enablePmAlerts', onAlertToggle);
	ui_data._createNewspaperVars();
	ui_data._getNewspaper();
	GUIp.common.setInterval(ui_data._getNewspaper, 5*60*1000);
};
ui_data._initVariables = function() {
	this.currentVersion = '1.1.39.8';
	this.docTitle = document.title;
	this.isMobile = document.body.classList.contains('mbg');
	if (this.isMobile) {
		// adding meaningful classes for titlebar contents
		var statusBarScheme = [
			['hero_hp','godpower'],
			['hero_gold', 'hero_inventory'],
			['opp_hp'],
			['boss_hp','godpower'],
			['boss_bits','boss_push'],
			['ark_hp','godpower'],
			['ark_cargo','ark_supplies']
		];
		var node, statusBarContent = document.querySelectorAll('#statusbar > div');
		for (var i = 0; i < statusBarContent.length; i++) {
			if (!statusBarScheme[i]) break;
			for (var j = 0; j < statusBarScheme[i].length; j++) {
				node = statusBarContent[i].children[j];
				if (!node || !node.lastChild || !node.lastChild.lastChild) continue;
				node.lastChild.lastChild.classList.add('e_sb_' + statusBarScheme[i][j]);
				if (statusBarScheme[i][j].endsWith('_hp') && node.lastChild.lastChild.previousElementSibling) {
					node.lastChild.lastChild.previousElementSibling.classList.add('e_sb_' + statusBarScheme[i][j] + '_diff');
				}
			};
		}
		// creating a way to refer to former blocks
		var bContents = {
			alls: ['Союзники','Участники','Allies','Sailors'],
			opps: ['Противники','Rivals'],
			diary: ['Дневник','Diary'],
			equipment: ['Снаряжение','Equipment'],
			pet: ['Питомец','Pet'],
			friends: ['Друзья','Friends'],
			shop: ['Лавка','Shop'],
			fight_log: /Хроника (боя|подземелья|экспедиции)|(Fight|Dungeon|Sail) Chronicle/
		}
		var bTitles = {
			menu: ['Меню','Menu'],
			remote: ['Пульт', 'Remote'],
			diary: ['Дневник','Diary'],
			stats: ['Данные героя','Данные героини','Stats'],
			equipment: ['Снаряжение','Equipment'],
			skills: ['Умения','Skills'],
			pet: ['Питомец','Pet'],
			shop: ['Лавка','Shop'],
			fight_log: /Хроника (боя|подземелья|экспедиции)|Тренировочный бой|Вести с арены|(Fight|Dungeon|Sail) Chronicle|Sparring Chronicle|Arena Journal/
		}
		Array.from(document.querySelectorAll('.line.hline .l_header')).forEach(function(a) {
			Object.keys(bContents).forEach(function(b) {
				if (a.parentNode.nextElementSibling && Array.isArray(bContents[b]) && bContents[b].includes(a.textContent) ||
					bContents[b] instanceof RegExp && bContents[b].test(a.textContent)) {
					a.parentNode.nextElementSibling.classList.add('e_m_' + b);
				}
			});
			Object.keys(bTitles).forEach(function(b) {
				if (Array.isArray(bTitles[b]) && bTitles[b].includes(a.textContent) ||
					bTitles[b] instanceof RegExp && bTitles[b].test(a.textContent)) {
					a.parentNode.classList.add('e_mt_' + b);
				}
			});
		});
		// special hacks for mining mode (but this.isMining isn't set yet)
		if (document.getElementsByClassName('wrmap')[0]) {
			node = document.getElementsByClassName('e_m_alls')[0];
			// desktop rival #bosses are marked as allies in mobile version, so just re-mark them as opps
			// to be consistent with what we already had before
			if (node) {
				node.className = node.className.replace('e_m_alls','e_m_opps');
			}
			// also there's a header having no id nor special class name
			// nor standard structure for headers used above, so mark it manually
			if (node.nextElementSibling) {
				node.nextElementSibling.classList.add('e_mt_fight_log');
			}
		}
	}
	this.isFight = ui_stats.isFight();
	this.isDungeon = ui_stats.isDungeon();
	this.isSail = ui_stats.isSail();
	this.isMining = ui_stats.isMining();
	this.isBoss = ui_stats.fightType() === 'monster';
	this.logId = ui_stats.logId();
	this.god_name = ui_stats.godName();
	// from now on, ui_storage is fully functional
	this.char_name = ui_stats.charName();
	this.char_sex = ui_stats.isMale() ? worker.GUIp_i18n.hero : worker.GUIp_i18n.heroine;
	GUIp.common.setCurrentGodname(this.god_name);
	ui_storage.set('charName', this.char_name);
	ui_storage.set('charIsMale', ui_stats.isMale());
	if (ui_stats.checkShop()) {
		ui_storage.set('charHasShop',true);
		this.hasShop = true;
	} else {
		this.hasShop = ui_storage.getFlag('charHasShop') || false;
	}
	this.inShop = false;
	this.storedPets = JSON.parse(ui_storage.get('charStoredPets')) || [];
	if (!ui_storage.get('Option:activeInformers')) {
		// default preset of informers
		var informersPreset = {
			full_godpower:48, much_gold:48, dead:48, low_health:48, fight:48, selected_town:48, wanted_monster:48, special_monster:16, tamable_monster:112, chosen_monster:48,pet_knocked_out:48, close_to_boss:48, close_to_rival:48, guild_quest:16, custom_informers:48,
			treasure_box:48, charge_box:48, gift_box:48, good_box:48
		};
		if (!ui_stats.hasTemple()) {
			informersPreset['smelter'] = informersPreset['smelt!'] = informersPreset['transformer'] = informersPreset['transform!'] = 48;
		}
		ui_storage.set('Option:activeInformers',JSON.stringify(informersPreset));
		ui_storage.set('Option:disableDieButton',true);
		ui_storage.set('Option:useShortPhrases',true);
		ui_storage.set('Option:enableInformerAlerts',true);
		ui_storage.set('Option:enablePmAlerts',true);
	}
	if (!ui_storage.get('ForumSubscriptions')) {
		ui_storage.set('ForumSubscriptions', '{}');
		ui_storage.set('ForumInformers', '{}');
	}
	this.availableGameModes = this._getAvailableModes();
	document.body.classList.add(
		'superhero',
		this.isDungeon ? 'dungeon' : this.isSail ? 'sail' : this.isMining ? 'mining' : this.isFight ? 'fight' : 'field'
	);
	if (ui_stats.hasTemple()) {
		document.body.classList.add('has_temple');
	}
	if (this.isFight) {
		var abilities = ui_stats.Enemy_AbilitiesText().toLowerCase(),
			atarget = document.querySelector(ui_data.isMobile ? '.e_m_opps' : '#o_hk_gold_we + .line:not(#o_hk_death_count) .l_val');
		this._parseBossAbs(abilities, false);
		if (/mutating|мутирующий|escalating|крепчающий/i.test(abilities) && atarget) {
			GUIp.common.newMutationObserver(this._parseBossAbs.bind(this, null, true)).observe(atarget,{childList: true});
		}
	} else {
		this.lastFieldInit = ui_storage.set_with_diff('lastFieldInit',Date.now());
	}
	ui_utils.voiceInput = document.getElementById('god_phrase') || document.getElementById('godvoice');
};
ui_data._parseBossAbs = function(abilities, mutated) {
	abilities = abilities || ui_stats.Enemy_AbilitiesText().toLowerCase();
	var abilitiesList = GUIp.common.bossAbilitiesList,
		abilitiesVals = Object.values(abilitiesList);
	Array.from(document.body.classList).forEach(function(a) {
		if (a.startsWith('boss_')) {
			document.body.classList.remove(a);
		}
	});
	abilities.split(',').forEach(function(a) {
		a = a.trim();
		if (abilitiesList[a] || abilitiesVals.includes(a)) {
			document.body.classList.add('boss_' + (abilitiesList[a] || a));
		}
	});
	if (/mutating|мутирующий/i.test(abilities)) {
		var newAbilities = abilities.split(',').map(function(a) { return a.trim(); });
		if (mutated && ui_data._oldAbilities !== undefined) {
			var oldAbility = ui_data._oldAbilities.find(function(a) { return !newAbilities.includes(a); }),
				newAbility = newAbilities.find(function(a) { return !ui_data._oldAbilities.includes(a); });
			if (oldAbility && newAbility) {
				ui_improver.improveMutationChronicles(oldAbility, newAbility);
			}
		}
		ui_data._oldAbilities = newAbilities;
	}
};
ui_data._createNewspaperVars = function() {
	var updateNewspaperSummary = function() {
		ui_improver.showDailyForecast();
		ui_informer.updateCustomInformers();
	};
	ui_improver.wantedItems = ui_storage.createVar('Newspaper:wantedItems',
		function(text) { return text ? new RegExp('^(?:' + text + ')$', 'i') : null; },
		function(regex) { return regex ? regex.source.slice(4, -2) : ''; },
		ui_inventory.tryUpdate
	);
	ui_improver.wantedMonsterRewards = ui_storage.createVar('Newspaper:wantedMonsterRewards',
		function(text) { return JSON.parse(text || '{}'); },
		JSON.stringify
	);
	ui_improver.dailyForecast = ui_storage.createVar('Newspaper:dailyForecast', ui_utils.splitList);
	ui_improver.dailyForecastText = ui_storage.createVar('Newspaper:dailyForecastText',
		function(text) { return text || ''; },
		null,
		updateNewspaperSummary
	);
	ui_improver.dailyForecastSpecBoss = ui_storage.createVar('Newspaper:dailyForecast:specBoss', function(text) { return text || ''; });
	ui_improver.bingoTries = ui_storage.createVar('Newspaper:bingoTries',
		function(text) { return +text || 0; },
		null,
		updateNewspaperSummary
	);
	ui_improver.bingoItems = ui_storage.createVar('Newspaper:bingoItems',
		function(text) { return text ? new RegExp(text, 'i') : null; },
		function(regex) { return regex ? regex.source : ''; },
		ui_inventory.tryUpdate
	);
	ui_storage.addListener('Newspaper:couponPrize', updateNewspaperSummary);
	ui_storage.addListener('Newspaper:godpowerCap', updateNewspaperSummary);
	ui_storage.addListener('Newspaper:activeAdvert', updateNewspaperSummary);
};
ui_data._getNewspaper = function(forced) {
	var date = +ui_storage.get('Newspaper:date');
	if (forced || date !== date || ui_utils.dateToMoscowTimeZone(date) < ui_utils.dateToMoscowTimeZone(Date.now())) {
		if (!forced) {
			ui_improver.wantedItems.setTemp(null);
			ui_improver.wantedMonsterRewards.setTemp({});
			ui_improver.dailyForecast.setTemp([]);
			ui_improver.dailyForecastText.setTemp('');
			ui_improver.dailyForecastSpecBoss.setTemp('');
			ui_improver.bingoTries.setTemp(0);
			ui_improver.bingoItems.setTemp(null);
		}
		GUIp.common.getDomainXHR('/news', ui_data._parseNewspaper);
	} else {
		ui_improver.showDailyForecast();
	}
};
ui_data._parseNewspaper = function(xhr) {
	var newsDate = 0,
		mRewards = {},
		bingoItems = [],
		bingoRE = /<td><span>(.*?)<\/span><\/td>/g,
		text = '',
		temp;
	if (temp = xhr.responseText.match(/<div id="date"[^>]*>[^<]*<span>(\d+)<\/span>/)) {
		newsDate = temp[1] * 86400000 + ((worker.GUIp_locale === 'ru') ? 1195560000000 : 1273492800000);
	} else {
		newsDate = Date.now();
	}
	ui_storage.set('Newspaper:date', newsDate);
	temp = xhr.responseText.match(/(?:Куплю-продам|Buy and Sell)[^]+?\/index\.php\/[^]+?>([^<]+?)<\/a>[^]+?\/index\.php\/[^]+?>([^<]+?)<\/a>/);
	ui_improver.wantedItems.set(temp && new RegExp('^(?:' + temp[1] + '|' + temp[2] + ')$', 'i'));
	temp = xhr.responseText.match(/(?:Разыскиваются|Wanted)<\/h2>[^]+?<p>([^]+?\/index\.php\/[^]+?>([^<]+?)<\/a>[^]+?)<\/p>[^]+?<p>([^]+?\/index\.php\/[^]+?>([^<]+?)<\/a>[^]+?)<\/p>/);
	if (temp) {
		mRewards[temp[2].toLowerCase()] = temp[1].replace(/<a[^]+?<\/a>/g,temp[2]);
		mRewards[temp[4].toLowerCase()] = temp[3].replace(/<a[^]+?<\/a>/g,temp[4]);
	}
	ui_improver.wantedMonsterRewards.set(mRewards);
	temp = xhr.responseText.match(/(?:Астропрогноз|Daily Forecast)[^]+?<p>([^<]+?)<\/p>(?:[^<]+?<p>([^<]+?)<\/p>)?/);
	ui_improver.dailyForecastSpecBoss.set('');
	if (temp) {
		ui_improver.dailyForecastText.set(temp[1] ? (temp[1] + (temp[2] ? '\n' + temp[2] : '')).replace(/&#0149;/g, '•') : '');
		ui_improver.dailyForecast.set(GUIp.common.parseForecasts(ui_improver.dailyForecastText.get()));
		if (ui_improver.dailyForecast.get().includes('specbosses')) {
			var key, input = ui_improver.dailyForecastText.get().toLowerCase();
			for (var key in GUIp.common.bossAbilitiesList) {
				if (input.includes(key) || input.includes(GUIp.common.bossAbilitiesList[key])) {
					ui_improver.dailyForecastSpecBoss.set(ui_utils.capitalizeFirstLetter(worker.GUIp_locale === 'ru' ? key : GUIp.common.bossAbilitiesList[key]));
				}
			}
		}
	} else {
		ui_improver.dailyForecastText.set('');
		ui_improver.dailyForecast.set([]);
	}
	while ((temp = bingoRE.exec(xhr.responseText))) {
		if (bingoItems.length < 64 && temp[1].length <= 128) {
			bingoItems.push(GUIp.common.escapeRegExp(temp[1]));
		}
	}
	temp = /<span\s[^<>]*?\bid\s*=\s*["']?b_cnt\b[^<>]*>(.*?)<\//.exec(xhr.responseText); // span#b_cnt
	ui_improver.bingoTries.set((temp && parseInt(temp[1])) || 0);
	ui_improver.bingoItems.set(bingoItems.length ? new RegExp(bingoItems.join('|'), 'i') : null);
	if ((temp = /<br\s*\/?>([^<>]*)<br\s*\/?>\s*<input(\s[^<>]*?\bid\s*=\s*["']?coupon_b\b[^<>]*)/.exec(xhr.responseText))) { // input#coupon_b
		text = /\sdisabled\b/.test(temp[2]) ? '' : temp[1].trim().replace(/&#39;/g, "'");
		ui_storage.set('Newspaper:couponPrize:raw', text);
		ui_storage.set('Newspaper:couponPrize', text && text.replace(/^(?:an?|the|some) /, ''));
	}
	ui_storage.set('Newspaper:godpowerCap', /\bgp_cap_avail\s*=\s*true\b/.test(xhr.responseText));
	if ((temp = /<div\s[^<>]*?\bclass\s*=\s*["']?add_block\b[^<>]*>([^<>]*)\s*<div id="ad_b"><input(\s[^<>]*?\bid\s*=\s*["']?ad_b\b[^<>]*\bvalue\s*=\s*["']?([^"']*)[^<>]*)/.exec(xhr.responseText))) { // input#ad_b
		text = /\sdisabled\b/.test(temp[2]) ? '' : temp[1].trim().replace(/&#39;/g, "'");
		ui_storage.set('Newspaper:activeAdvert', text);
		ui_storage.set('Newspaper:activeAdvert:button', text && temp[3]);
	} else {
		ui_storage.set('Newspaper:activeAdvert', '');
		ui_storage.set('Newspaper:activeAdvert:button', '');
	}
	ui_improver.showDailyForecast();
	if (document.querySelector('#inventory li.improved')) {
		ui_inventory._update();
	}
};

ui_data._getAvailableModes = function() {
	var tmp, result = [];
	// dungeon and sailing aren't needed currently
	if ((ui_data.isMining || +ui_storage.get('Logger:Book_Bytes') || +ui_storage.get('Logger:Forge_Rank') || ui_stats.Book_Bytes() || ui_stats.checkDungeonForge())) {
		result.push('mining');
	}
	if ((+ui_storage.get('Logger:Souls') || +ui_storage.get('Logger:Forge_Rank') || ui_storage.get('LastGatheredSouls') || ui_stats.Souls() || ui_stats.checkDungeonForge()) ||
	 /* in case user opened a new desktop profile for the first time already in a dungeon then all the checks above will inevitably fail,
	  so let's also see if we can find any soul references in the Third Eye which would most likely mean we have access to collecting them */
	  this.isFight && !this.isMobile && (tmp = GUIp.common.parseJSON(localStorage['d_i_' + this.god_name])) && Object.values(tmp).some(function(a) { return GUIp.common.parseGatheredSoul(a.msg); })
	) {
		result.push('souls');
	}
	return result;
};
// ui_utils
var ui_utils = worker.GUIp.utils = {};

ui_utils.voiceInput = null;
ui_utils.voiceDisabled = false; // only set to true when we disable it ourselves
ui_utils.hasShownErrorMessage = false;
ui_utils.hasShownInfoMessage = false;

if (document.hasFocus) {
	Object.defineProperty(ui_utils, 'windowFocused', {get: document.hasFocus.bind(document)});
} else {
	ui_utils.windowFocused = !document.hidden; // might give false positives
	worker.addEventListener('blur',  function() { ui_utils.windowFocused = false; });
	worker.addEventListener('focus', function() { ui_utils.windowFocused = true; });
}

// base phrase say algorithm
ui_utils.setVoice = function(voice, force) {
	var postv = this.voiceInput.value.match(/\/\/\ .+$/);
	if (postv && !force) {
		this.voiceInput.value = voice + ' ' + postv[0];
	} else {
		this.voiceInput.value = voice;
	}
	ui_utils.triggerChangeOnVoiceInput();
};
ui_utils.triggerChangeOnVoiceInput = function() {
	//worker.$(this.voiceInput).change();
	worker.$(this.voiceInput).trigger(worker.$.Event( "change", { originalEvent: {} } ));
};
// finds a label with given name
ui_utils.findLabel = function($base_elem, label_name) {
	return worker.$('.l_capt', $base_elem).filter(function(index) {
		return this.textContent === label_name;
	});
};
// checks if $elem already improved
ui_utils.isAlreadyImproved = function(elem) {
	if (!elem) {
		return true; // if elem is missing we'll assume it's already improved so the code won't try to re-improve it again
	}
	// opera 12 does not implement dataset interface on svg elements
	if (elem.getAttribute('data-improved') === '1') {
		return true;
	} else {
		elem.setAttribute('data-improved','1');
		return false;
	}
};
// generic voice generator
ui_utils.getGenericVoicegenButton = function(text, section, title) {
	var voicegen = document.createElement('a');
	voicegen.title = title;
	voicegen.textContent = text;
	voicegen.className = 'voice_generator ' + (ui_data.isDungeon ? 'dungeon' : ui_data.isFight ? 'battle' : 'field') + ' ' + section;
	GUIp.common.addListener(voicegen, 'click', function(ev) {
		ev.preventDefault();
		if (ui_utils.voiceInput.getAttribute('disabled') === 'disabled') {
			return;
		}
		if (section !== 'mnemonics') {
			ui_utils.setVoice(ui_words.longPhrase(section));
		} else {
			ui_words.mnemoVoice();
		}
		ui_words.currentPhrase = "";
	});
	return voicegen;
};
ui_utils.addVoicegen = function(elem, voicegen_name, section, title) {
	elem.insertAdjacentElement('afterend', ui_utils.getGenericVoicegenButton(voicegen_name, section, title));
};
ui_utils.mapVoicegen = function(e) {
	var x, y, X, Y, K, curPos = GUIp.common.getOwnCell();

	if (!curPos || ui_utils.isHidden(document.getElementById('godvoice') || {}) || ui_storage.getFlag('Option:disableVoiceGenerators') || ui_utils.voiceInput.getAttribute('disabled') === 'disabled') {
		return;
	}

	curPos = curPos.getBoundingClientRect();
	X = e.clientX - curPos.left - curPos.width / 2;
	Y = e.clientY - curPos.top - curPos.height / 2;

	K = 1 / Math.sqrt(2);
	x = X * K - Y * K;
	y = X * K + Y * K;

	if (x > 0) {
		if (y > 0) {
			ui_utils.setVoice(ui_words.longPhrase('go_east'));
		} else {
			ui_utils.setVoice(ui_words.longPhrase('go_north'));
		}
	} else {
		if (y > 0) {
			ui_utils.setVoice(ui_words.longPhrase('go_south'));
		} else {
			ui_utils.setVoice(ui_words.longPhrase('go_west'));
		}
	}
	ui_words.currentPhrase = "";
	return;
};
ui_utils.addGPConfirmation = function($buttons, requiredGP, msg) {
	var onClick = function(target, ev) {
		if (ui_storage.getFlag('Option:confirmInfluences') && ui_stats.Godpower() < requiredGP && target.classList.contains('div_link') && !worker.confirm(msg)) {
			ev.preventDefault();
			ev.stopImmediatePropagation();
		}
	};
	$buttons.click(function(ev) { GUIp.common.try2(onClick, this, ev); });
	// prioritize
	for (var i = 0, len = $buttons.length; i < len; i++) {
		var handlers = worker.$._data($buttons[i], 'events').click;
		handlers.unshift(handlers.pop());
	}
};
// Случайный индекс в массиве
ui_utils.getRandomIndex = function(arr) {
	return Math.floor(Math.random()*arr.length);
};
// Случайный элемент массива
ui_utils.getRandomItem = function(arr) {
	return arr[ui_utils.getRandomIndex(arr)];
};
// Вытаскивает случайный элемент из массива
ui_utils.popRandomItem = function(arr) {
	var ind = ui_utils.getRandomIndex(arr);
	var res = arr[ind];
	arr.copyWithin(ind, ind + 1);
	arr.length--;
	return res;
};

ui_utils.parseDiaryDate = function(time) {
	var m, hours, date,
		ampm = worker.ampm === '12h',
		today = new Date,
		nearFuture = +today + 300e3; // 5m
	if (!time || !(m = /(\d+):(\d+)/.exec(time))) {
		return null;
	}
	if (ampm) {
		// there are no AM or PM marks. we have to guess
		hours = +m[1];
		date = today.setHours(hours >= 12 ? hours - 12 : hours, +m[2], 0, 0);
		if (date > nearFuture) {
			date -= 86400e3; // 24h
		}
		if (date + 43200e3 <= nearFuture) { // 12h
			date += 43200e3; // 12h
		}
	} else {
		date = today.setHours(+m[1], +m[2], 0, 0);
		if (date > nearFuture) {
			date -= 86400e3; // 24h
		}
	}
	return date;
};

/**
 * @param {{date: (number|!Date)}} a
 * @param {{date: (number|!Date)}} b
 * @returns {number}
 */
ui_utils.byDate = function(a, b) { return a.date - b.date; };

/**
 * @param {?string} text
 * @returns {!Array<string>}
 */
ui_utils.splitList = function(text) {
	return text ? text.split(',') : [];
};

/**
 * @template T
 * @param {!Element} node
 * @param {!MutationObserverInit} options
 * @param {function(!Array<!MutationRecord>): (T | undefined)} check
 * @returns {!Promise<T>}
 */
ui_utils.observeUntil = function(node, options, check) {
	var x = check([]);
	return x !== undefined ? Promise.resolve(x) : new Promise(function(resolve) {
		GUIp.common.newMutationObserver(function(mutations, observer) {
			var x = check(mutations);
			if (x !== undefined) {
				observer.disconnect();
				resolve(x);
			}
		}).observe(node, options);
	});
};

ui_utils._clock = {promise: null, diff: 0, failures: 0};

ui_utils._failSyncingClock = function(resolve, xhr) {
	GUIp.common.warn('could not sync with Akamai Time Server (' + xhr.status + '):', xhr.responseText);
	ui_utils._clock.promise = null;
	ui_utils._clock.failures++;
	resolve(false);
};

ui_utils._syncClock = function(resolve) {
	GUIp.common.getXHR('https://time.akamai.com', function(xhr) {
		var received = +xhr.responseText;
		if (received !== received) {
			ui_utils._failSyncingClock(resolve, xhr);
		} else {
			ui_utils._clock.promise = null;
			ui_utils._clock.diff = received * 1e3 - Date.now();
			resolve(true);
		}
	}, ui_utils._failSyncingClock.bind(null, resolve));
};

/**
 * @returns {!Promise}
 */
ui_utils.syncClock = function() {
	return ui_utils._clock.promise || (ui_utils._clock.promise = new Promise(ui_utils._syncClock));
};

/**
 * @param {number} [offset]
 * @param {boolean} [bypassSyncing]
 * @returns {!Date}
 */
ui_utils.getPreciseTime = function(offset, bypassSyncing) {
	if (!ui_utils._clock.diff && !ui_utils._clock.promise && !bypassSyncing && ui_utils._clock.failures < 5) {
		ui_utils.syncClock().catch(GUIp.common.onUnhandledException);
	}
	return new Date(Date.now() + (offset || 0) + ui_utils._clock.diff);
};

// Форматирование времени
ui_utils.formatClock = function(godvilleTime) {
	return ('0' + godvilleTime.getUTCHours()).slice(-2) + ':' + ('0' + godvilleTime.getUTCMinutes()).slice(-2) + ':' + ('0' + godvilleTime.getUTCSeconds()).slice(-2);
};

/**
 * @param {string} text
 * @returns {string}
 */
ui_utils.formatSailingDistInfoAbbr = function(text) {
	var first = text[0].toUpperCase();
	return '<abbr title="' + first + text.slice(1) + '">' + first + ':</abbr>';
};

/**
 * @param {!GUIp.common.islandsMap.Model} model
 * @param {GUIp.common.islandsMap.Vec} pos
 * @param {!Object<string, string>} conditions
 * @param {!Array<string>} mapSettings
 * @returns {!Element}
 */
ui_utils.formatSailingDistInfo = function(model, pos, conditions, mapSettings) {
	if (!mapSettings.includes('tcrd')) {
		var imap = GUIp.common.islandsMap,
			stepsLeft = (conditions.small ? 50 : 100) - ui_stats.currentStep(),
			supplies = ui_stats.Map_Supplies(),
			predictor = imap.defaults[mapSettings.includes('pdpm') ? 'predictMaxBorderRadius' : 'predictBorderRadius'],
			distToPort = imap.vec.dist(pos, model.port !== 0x8080 ? model.port : 0x0),
			distToRim = predictor(model, conditions) - distToPort;

		var formatPart = function(dist, stepsLeft, abbrText) {
			var cls = stepsLeft < dist ? 'e_low_steps' : supplies < dist ? 'e_low_supplies' : '';
			return (
				'<span' + (cls && ' class="' + cls + '"') + '>' +
					ui_utils.formatSailingDistInfoAbbr(abbrText) + dist +
				'</span>'
			);
		};
		return (
			'(' +
			formatPart(distToPort, stepsLeft, worker.GUIp_i18n.sail_port) +
			', ' +
			formatPart(distToRim, conditions.locked ? 0 : stepsLeft, worker.GUIp_i18n.sail_rim) +
			')'
		);
	} else {
		var result = '(',
			q = pos << 24 >> 24,
			r = pos << 16 >> 24,
			y = r,
			x = q + r * 0.5;
		if (y) {
			result += ui_utils.formatSailingDistInfoAbbr(worker.GUIp_i18n[y > 0 ? 'south' : 'north']);
		}
		result += Math.abs(y) + ', ';
		if (x) {
			result += ui_utils.formatSailingDistInfoAbbr(worker.GUIp_i18n[x > 0 ? 'east' : 'west']);
		}
		return result + Math.ceil(Math.abs(x)) + ')';
	}
};

ui_utils.addCSS = function () {
	if (worker.GUIp_browser === 'Opera') {
		// this should make minimap in dungeons a bit better
		if (document.getElementsByClassName('dml').length > 0) {
			document.getElementsByClassName('dml')[0].parentNode.style.paddingBottom = '21px';
		}
	}
};
ui_utils.showMessage = function(msg_no, msg) {
	var id = 'msg' + msg_no, msgElem, closeButton, onClick;
	if ((msgElem = document.getElementById(id + '_close'))) {
		msgElem.click();
		msgElem.id = document.getElementById(id).id = '';
	}
	document.getElementById('menu_bar').insertAdjacentHTML('afterend',
		'<div id="' + id + '" class="hint_bar ui_msg">'+
			'<div class="hint_bar_capt"><b>' + msg.title + '</b></div>'+
			'<div class="hint_bar_content">' + msg.content + '</div>'+
			'<div class="hint_bar_close"><a id="' + id + '_close">' + worker.GUIp_i18n.close + '</a></div>' +
		'</div>'
	);
	msgElem = document.getElementById(id);
	closeButton = document.getElementById(id + '_close');
	onClick = GUIp.common.try2.bind(null, function(ev) {
		ev.preventDefault();
		closeButton.removeEventListener('click', onClick);
		worker.$(msgElem).fadeToggle(GUIp.common.try2.bind(null, function() {
			msgElem.parentNode.removeChild(msgElem);
			if (!isNaN(msg_no)) {
				ui_storage.set('lastShownMessage', msg_no);
			}
		}));
	});
	closeButton.addEventListener('click', onClick);

	GUIp.common.setTimeout(function() {
		worker.$(msgElem).fadeToggle(500, msg.callback && GUIp.common.try2.bind(null, msg.callback));
	}, 500);
};
ui_utils.getNodeIndex = function(node) {
	var i = 0;
	while ((node = node.previousElementSibling)) {
		i++;
	}
	return i;
};
ui_utils.openChatWith = function(friend, e) {
	if (e) {
		e.preventDefault();
		e.stopPropagation();
	}
	var found = Array.from(document.querySelectorAll((ui_data.isMobile ? '.e_m_friends' : '.msgDockPopupW') + ' .frname')).find(function(a) { return a.textContent === friend; });
	if (found) {
		found.click();
	}
};
ui_utils.dateToMoscowTimeZone = function(date) {
	var temp = new Date(date);
	temp.setTime(temp.getTime() + (temp.getTimezoneOffset() + (worker.GUIp_locale === 'en' ? 115 : 175))*60*1000);
	return temp.getFullYear() + '/' +
		  (temp.getMonth() + 1 < 10 ? '0' : '') + (temp.getMonth() + 1) + '/' +
		  (temp.getDate() < 10 ? '0' : '') + temp.getDate();
};
ui_utils.updateVoiceSubmitState = function() {
	if (ui_data.isFight) return;
	var submit = document.getElementById('voice_submit');
	if (!submit) return;

	var dis = false, conds = ui_improver.freezeVoiceButton.get();
	dis = dis || (conds.includes('when_empty') && !!this.voiceInput && !this.voiceInput.value);
	dis = dis || (conds.includes('after_voice') && ui_timeout.running);
	// check not to re-enable when it was blocked by Godville
	if (dis !== submit.disabled && (dis || this.voiceDisabled)) {
		submit.disabled = this.voiceDisabled = dis;
	}
};
ui_utils.hideElem = function(elem, hide) {
	if (elem) elem.classList.toggle('hidden', !!hide);
};
ui_utils.isHidden = function(elem) {
	return !elem.offsetParent;
};
ui_utils._parseVersion = function(isNewestCallback, isNotNewestCallback, failCallback, xhr) {
	var m = /Godville UI\+ (\d+\.\d+\.\d+\.\d+)/.exec(xhr.responseText);
	if (m) {
		var cur = ui_data.currentVersion.split('.'),
			latest = m[1].split('.');
		if ((cur[0] - latest[0] || cur[1] - latest[1] || cur[2] - latest[2] || cur[3] - latest[3]) >= 0) {
			if (isNewestCallback) {
				isNewestCallback();
			}
		} else if (isNotNewestCallback) {
			isNotNewestCallback(m[1]);
		}
	} else if (failCallback) {
		failCallback();
	}
};
ui_utils.checkVersion = function(isNewestCallback, isNotNewestCallback, failCallback) {
	GUIp.common.getXHR(GUIp.common.erinome_url+'/checkversion?ver=' + ui_data.currentVersion, ui_utils._parseVersion.bind(null, isNewestCallback, isNotNewestCallback, failCallback), failCallback);
};

ui_utils.processError = function(error, isDebugMode) {
	var description = error.name + ': ' + error.message,
		htmlDescription = GUIp.common.escapeHTML(description),
		stack = error.stack
			.replace(description, '')
			.trim()
			.replace(/^\s*at\s+|\(\[arguments not available\]\)|@$/gm, '')
			.replace(/^Object\.(?=\w+\.)/gm, '')
			.replace(/<anonymous function: (.*?)>/g, '$1')
			.replace(/@https?:.*?(:[^:\n]*)?$/gm, ' (<embedded>$1)')
			.replace(/@(?:(?:\w+-extension|resource):.*\/)?(.*)/g, ' ($1)')
			.replace(/\w+-extension:.*\//g, ''),
		browserVersion = (new RegExp(worker.GUIp_browser + '/([\\d.]+)').exec(navigator.userAgent) || [, '&lt;unknown version&gt;'])[1];
	worker.console.error('Godville UI+ error log:\n' + description + '\n' + worker.GUIp_i18n.error_message_stack_trace + '\n' + stack);
	ui_utils.showMessage('error', {
		title: worker.GUIp_i18n.error_message_title,
		content:
			(isDebugMode ? '<div><strong class="debug_mode_warning">' + worker.GUIp_i18n.debug_mode_warning + '</strong></div>' : '') +
			'<div id="possible_actions" ' + (isDebugMode ? ' class="hidden"' : '') + '>' +
				'<div>' + worker.GUIp_i18n.error_message_text + ' <strong>' + htmlDescription + '</strong>.</div>' +
				'<div>' + worker.GUIp_i18n.possible_actions + '</div>' +
				'<ol>' +
					'<li>' + worker.GUIp_i18n.if_first_time + '<a id="press_here_to_reload">' + worker.GUIp_i18n.press_here_to_reload + '</a>.</li>' +
					'<li>' + worker.GUIp_i18n.if_repeats + '<a id="press_here_to_show_details">' + worker.GUIp_i18n.press_here_to_show_details + '</a>.</li>' +
				'</ol>' +
			'</div>' +
			'<div id="error_details"' + (isDebugMode ? '' : ' class="hidden"') + '>' +
				'<div>' + worker.GUIp_i18n.error_message_subtitle + '</div>' +
					'<div>' + worker.GUIp_i18n.browser + ' <strong>' + worker.GUIp_browser + ' ' + browserVersion + '</strong>.</div>' +
				'<div>' + worker.GUIp_i18n.version + ' <strong>' + ui_data.currentVersion + '</strong>.</div>' +
				'<div>' + worker.GUIp_i18n.error_message_text + ' <strong>' + htmlDescription + '</strong>.</div>' +
				'<div>' + worker.GUIp_i18n.error_message_stack_trace +
					'<div><strong>' + GUIp.common.escapeHTML(stack).replace(/\n/g, '<br />') + '</strong></div>' +
				'</div>' +
			'</div>',
		callback: function() {
			GUIp.common.addListener(document.getElementById('press_here_to_reload'), 'click', location.reload.bind(location));
			GUIp.common.addListener(document.getElementById('press_here_to_show_details'), 'click', function() {
				ui_utils.hideElem(document.getElementById('possible_actions'), true);
				ui_utils.hideElem(document.getElementById('error_details'), false);
				if (!ui_storage.getFlag('helpDialogVisible')) {
					ui_help.toggleDialog();
				}
			});
		}
	});
};

ui_utils.informAboutOldVersion = function() {
	ui_utils.showMessage('update_required', {
		title: worker.GUIp_i18n.error_message_title,
		content: '<div>' + worker.GUIp_i18n.error_message_in_old_version + '</div>'
	});
};

ui_utils.processErrorOnce = function(error) {
	try {
		if (ui_utils.hasShownErrorMessage) {
			GUIp.common.error(error);
			return;
		}
		ui_utils.hasShownErrorMessage = true;
		if (ui_storage.getFlag('Option:enableDebugMode')) {
			ui_utils.processError(error, true);
		} else {
			ui_utils.checkVersion(ui_utils.processError.bind(null, error, false), ui_utils.informAboutOldVersion);
		}
	} catch (e) {
		try {
			GUIp.common.error('got an error while processing an error:', e);
			console.error(error);
		} catch (e1) {
			try {
				console.error("[eGUI+] error: seems that you've intruded into window.GUIp;", e);
				console.error(error);
			} catch (e2) { /* wow, they tried really hard */ }
		}
	}
};

ui_utils.informNewVersionAvailable = function(newVersion) {
	ui_utils.showMessage('update_required', {
		title: worker.GUIp_i18n.new_version_available,
		content: '<div>' + worker.GUIp_i18n.fmt('is_not_last_version', newVersion) + '</div>',
		callback: function() {
			if (!ui_storage.getFlag('helpDialogVisible')) {
				ui_help.toggleDialog();
			}
		}
	});
};

ui_utils.informNoNewVersionAvailable = function() {
	ui_utils.showMessage('update_not_required', {
		title: worker.GUIp_i18n.is_last_version,
		content: '<div>' + worker.GUIp_i18n.is_last_version_desc + '</div>'
	});
};

ui_utils.informVersionCheckFailed = function() {
	ui_utils.showMessage('update_check_failed', {
		title: worker.GUIp_i18n.getting_version_failed,
		content: '<div>' + worker.GUIp_i18n.getting_version_failed_desc + '</div>'
	});
};

ui_utils.showNotification = function(title, text, callback, notid) {
	GUIp.common.notif.show(title, text, parseFloat(ui_storage.get('Option:informerAlertsTimeout')) * 1e3, callback, notid);
};

ui_utils.hideNotification = function(notid) {
	GUIp.common.notif.hide(notid);
};

ui_utils.pmNotificationInit = function() {
	GUIp.common.setTimeout(function() {
		try {
			var lastMsgs = JSON.parse(localStorage['fr_arr' + ui_data.god_name]);
			ui_utils.pmNotificationLastMsg = 0;
			// let's assume 'fr_arr' is always sorted, but we need the newest msgid, which might be put behind all pinned chats
			for (var i = 0, len = lastMsgs.length; i < len; i++) {
				if (lastMsgs[i].msg.id > ui_utils.pmNotificationLastMsg) {
					ui_utils.pmNotificationLastMsg = lastMsgs[i].msg.id;
				}
				if (!lastMsgs[i].p) {
					break;
				}
			}
		} catch (e) {
			ui_utils.pmNotificationLastMsg = 0;
		}
	},5e3);
};

ui_utils.pmNotification = function() {
	var pmSounds = ui_storage.getFlag('Option:enablePmSounds'),
		pmAlerts = ui_storage.getFlag('Option:enablePmAlerts');
	if (!this.pmNotificationLastMsg || !pmAlerts && !pmSounds) {
		return;
	}
	var contacts, maxid = 0,
		playSound = false;
	try {
		contacts = JSON.parse(localStorage['fr_arr' + ui_data.god_name]);
		for (var i = 0, j = 0, len = contacts.length; i < len; i++) {
			var contact = contacts[i].name, msg = contacts[i].msg;
			if (msg && msg.id) {
				if (msg.id > this.pmNotificationLastMsg) {
					if (contact === msg.from && j < 3) {
						if (ui_utils.getCurrentChat() !== contact || !document.hasFocus()) {
							if (pmAlerts && GUIp.common.notif.enabled) {
								var title = '[PM] ' + contact,
									text = msg.msg.slice(0,200) + (msg.msg.length > 200 ? '...' : ''),
									callback = function() {
										if (ui_utils.getCurrentChat() !== this) {
											ui_utils.openChatWith(this);
										}
									}.bind(contact);
								ui_utils.showNotification(title,text,callback,'pm_' + contact);
							}
							playSound = true;
						}
						j++;
					}
					if (msg.id > maxid) {
						maxid = msg.id;
					}
				} else if (!contacts[i].p) { // iterate up to the first old non-pinned chat
					break;
				}
			}
		}
		if (maxid) {
			this.pmNotificationLastMsg = maxid;
		}
		// the 'localStorage.sds' being set means that all sounds are disabled in global godville's settings,
		// and when 'window.isActive' is false the sound is already played
		if (playSound && !localStorage.getItem('sds') && worker.isActive) {
			GUIp.common.playSound('msg');
		}
	} catch (e) {}
};

ui_utils.getCurrentChat = function() {
	if (ui_data.isMobile) {
		return (document.querySelector('#hero_block .mpage:not(#tabbar) .ui-title') || '').textContent || null;
	}
	var docktitle = window.$('.frbutton_pressed .dockfrname_w .dockfrname').text().replace(/\.+/g,''),
		headtitle = window.$('.frbutton_pressed .frMsgBlock .fr_chat_header').text().match(/^(.*?)(?: и е| and h)/);
	if (docktitle && headtitle && headtitle[1].startsWith(docktitle)) {
		return headtitle[1];
	}
	return null;
};

ui_utils.getLastGCM = function() {
	var gc_tab = document.querySelector('.frbutton_pressed .dockfrname');
	if (!gc_tab || !gc_tab.textContent.match(/Гильдсовет|Guild Council/)) {
		return [];
	}
	var meta, message, messages = [], messageLines = gc_tab.parentNode.parentNode.getElementsByClassName('fr_msg_l');
	for (var i = 0, len = messageLines.length; i < len; i++) {
		if (!messageLines[i].firstChild) {
			continue;
		}
		message = {};
		if (messageLines[i].firstChild.nodeType === 3) {
			message.c = messageLines[i].firstChild.textContent
		}
		meta = messageLines[i].getElementsByClassName('gc_fr_el');
		for (var j = 0, len2 = meta.length; j < len2; j++) {
			if (meta[j].classList.contains('gc_fr_god')) {
				message.a = meta[j].textContent;
			} else if (meta[j].title) {
				message.t = meta[j].title;
			}
		}
		if (message.c && message.a && message.t) {
			messages.push(message);
		}
	}
	return messages;
};

ui_utils.saveMobileUnsentMessage = function(node) {
	if (!node) {
		return;
	}
	var textarea = node.getElementsByTagName('textarea'),
		name = node.getElementsByClassName('ui-title');
	// when chat page closes, textarea gets detached from the page but is still reachable via previously saved reference
	if (!textarea.length && ui_improver._openedChatContents) {
		textarea = ui_improver._openedChatContents.getElementsByTagName('textarea');
	}
	// if we have a name and a textarea, we can save typed text
	if (name[0] && name[0].textContent && textarea[0]) {
		if (textarea[0].value) {
			ui_tmpstorage.set('PM:' + name[0].textContent, textarea[0].value);
		} else {
			ui_tmpstorage.remove('PM:' + name[0].textContent);
		}
	}
};

ui_utils.switchTheme = function(theme,override) {
	var currentTheme = localStorage.ui_s,
		stylesheet;
	theme = theme || currentTheme || 'th_classic';
	GUIp.common.exposeThemeName(theme);
	if (ui_storage.get('ui_s') !== theme) {
		ui_storage.set('ui_s',theme);
	}
	if (override && currentTheme !== theme) {
		worker.jQuery.fx.off = theme === 'th_retro';
		stylesheet = document.querySelector('link[href*="' + currentTheme + '.css"]');
		GUIp.common.addCSSFromURL('/stylesheets/' + theme + '.css','guip_theme_override');
		if (stylesheet) {
			stylesheet.parentNode.insertBefore(document.getElementById('guip_theme_override'),stylesheet);
			stylesheet.parentNode.removeChild(stylesheet);
		}
		localStorage.ui_s = theme;
	}
	// the night theme on other pages seems to require a cookie called 'nt' instead of a key in localStorage,
	// however the default game code sets cookie ONLY on theme change and it lasts for 365 days... seems legit, isn't it?
	if (theme === 'th_nightly' && !/\bnt=/.test(document.cookie)) {
		// so, let's set it if it's missing
		document.cookie = 'nt=1;path=/;max-age=31536000;domain=' + document.domain;
	}
};

ui_utils.loggerWidthChanger = function() {
	var heroBlockWidth = document.getElementById('hero_block').clientWidth;
	document.getElementById('logger').style.width = (ui_data.isMobile ? Math.floor(heroBlockWidth*0.96) : Math.max(919,(heroBlockWidth - 55))) + 'px';
};

ui_utils.parseStat = function(b, type, pos) {
	var a;
	switch (type) {
		case 'text':
			return b && b.textContent || null;
		case 'title':
			return b && b.title || null;
		case 'href':
			return b && b.href || null;
		case 'num':
			return b && parseInt(b.textContent) || 0;
		case 'dec':
			return b && parseFloat(b.textContent) || 0;
		case 'numre':
			if (b && (a = b.textContent.match(/(\d+)/))) {
				return +a[0] || 0;
			}
			return 0;
		case 'slashed':
			if (b && (a = b.textContent.match(/^(.+?) ?\/ ?(.+?)$/))) {
				return a[pos];
			}
			return null;
		case 'pointed':
			if (b && (a = b.textContent.match(/^(.+?), (.+?)( .+?)?$/))) {
				return a[pos];
			}
			return null;
		case 'width':
			return b && b.style.display !== 'none' && parseInt(b.style.width) || 0;
		case 'titlenumre':
			if (b && (a = b.title.match(/(\d+)/))) {
				return +a[0] || 0;
			}
			return 0;
	}
};

ui_utils.getStat = function(selector,type,pos) {
	return ui_utils.parseStat(document.querySelector(selector), type, pos);
};

ui_utils._formatPrc = function(diff, max) {
	var pos = diff >= 0;
	return (pos ? '+' : '\u2212') + ((pos ? 100 : -100) * diff / max).toFixed(1);
};

ui_utils.loggerPrc = function(diff, max) {
	if (max === 0) {
		return '';
	}
	return ' (' + ui_utils._formatPrc(diff, max) + '%)';
};

ui_utils.hpPrc = function(diff, max, sign) {
	if (max === 0) {
		return '';
	}
	return ui_utils._formatPrc(diff, max).slice(sign ? 0 : 1) + '%';
};

ui_utils.loggerPrcMulti = function(damage,callback) {
	var max, prcs = [];
	for (var i = 0, len = damage.parts.length; i < len; i++) {
		max = callback(damage.parts[i]);
		if (max === 0) {
			continue;
		}
		prcs.push(damage.parts[i] + ':' + ui_utils._formatPrc(damage.diff, max) + '%')
	}
	if (prcs.length > 0) {
		return ' (' + prcs.join(', ') + ')';
	}
	return '';
};

ui_utils.generateLightboxSetup = function(type,target,callback) {
	var span = document.createElement('span'),
		target = document.querySelector(target);
	if (!target) return;
	span.id = 'e_' + type + '_setup';
	span.className = 'em_font e_t_icon t_icon';
	span.textContent = '⚙';
	span.title = worker.GUIp_i18n['lb_' + type + '_title'];
	GUIp.common.addListener(span, 'click', GUIp.common.createLightbox.bind(null,type,ui_storage,worker.GUIp_words(),callback));
	target.appendChild(span);
};

ui_utils.capitalizeFirstLetter = function(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
};

ui_utils.decapitalizeFirstLetter = function(str) {
	return str.charAt(0).toLowerCase() + str.slice(1);
};

ui_utils.updateBroadcastLink = function(target) {
	if (target) {
		target.href = '/duels/log/' + ui_data.logId + ui_utils.generateBroadcastLinkXtra();
	}
};

ui_utils.generateBroadcastLinkXtra = function() {
	var corrs, items, xhref = [];
	if ((corrs = JSON.parse(ui_storage.get('Log:' + ui_data.logId + ':dlMoves'))) && Object.keys(corrs).length) {
		items = [];
		Object.keys(corrs).forEach(function(a) {
			items.push(a+':'+corrs[a]);
		});
		xhref.push('edm=' + items.join(','));
	}
	if ((corrs = JSON.parse(ui_storage.get('Log:' + ui_data.logId + ':whMoves'))) && Object.keys(corrs).length) {
		items = [];
		Object.keys(corrs).forEach(function(a) {
			items.push(a+':'+corrs[a][1]+':'+-corrs[a][0]);
		});
		xhref.push('ewh=' + items.join(','));
	}
	ui_improver.dungeonExtras = Object.keys(ui_improver.dungeonExtras).length ? ui_improver.dungeonExtras: JSON.parse(ui_storage.get('Log:' + ui_data.logId + ':extras') || '{}');
	if (ui_improver.dungeonExtras.nookOffset && ui_improver.dungeonExtras.nookOffset.x !== null) {
		xhref.push('eno=' + ui_improver.dungeonExtras.nookOffset.x + ':' + -ui_improver.dungeonExtras.nookOffset.y);
	}
	if (ui_improver.dungeonExtras.stairsOffset && ui_improver.dungeonExtras.stairsOffset.x !== null) {
		xhref.push('eso=' + ui_improver.dungeonExtras.stairsOffset.x + ':' + -ui_improver.dungeonExtras.stairsOffset.y);
	}
	return xhref.length ? '?' + xhref.join('&') : '';
};

ui_utils.setTitle = function(text) {
	document.querySelector('title').childNodes[0].nodeValue = text;
};

ui_utils.jqueryExtInit = function() {
	if (!worker.jQuery) {
		return;
	}
	(function($) {
		// workaround for preventing unnecessary calls to glow() since godville devs are ignoring this issue
		if (typeof $.fn.glow === "function" && ui_storage.getFlag('Option:enableGlowfix')) {
			var shouldGlow = function() {
				// block glowing for the side job duration time
				var node;
				if (this.classList.contains('l_val') &&
					(node = document.getElementById('hk_quests_completed')) && this.parentNode === node.nextSibling) {
					return false;
				}
				var $this = $(this);
				// block extra glowing only for health labels
				if ($this.closest('.opp_h').length || this.classList.contains('hp_diff')) {
					// for hp_diff block only when text matches and step number is the same
					if ($this.data('e_text') === this.textContent && (!this.classList.contains('hp_diff') || $this.data('e_step') === ui_stats.currentStep())) {
						return false;
					}
					$this.data('e_step', ui_stats.currentStep());
					$this.data('e_text', this.textContent);
				}
				return true;
			};
			$.fn.e_glow = $.fn.glow;
			$.fn.glow = function() {
				$.fn.e_glow.apply(this.filter(shouldGlow), arguments);
			};
		}
		// workaround for issue with closing chats when selecting texts and releasing mouse button outside of chat blocks, notably in Chrome-based browsers.
		// this happens due to the fact that target of click event in Chrome is defined when button was released and godville code assumes it's defined when
		// button was pressed. thus chats can be accidentally closed way too easy. this was reported to godville devs but they ignored it as they usually do.
		if (worker.GUIp_browser === 'Chrome' && ui_storage.getFlag('Option:enableChromeChatfix')) {
			try {
				var eClickInsideChats = false;
				$(document).bind('mousedown', function(e) {
					if ($(e.target).parents('.msgDockWrapper').length || $(e.target).parents('.fr_msg_l').length) {
						eClickInsideChats = true;
					}
				});
				$(document).bind('mouseup', function(e) {
					setTimeout(function() { eClickInsideChats = false },50);
				});
				$(document).bind('click', function(e) {
					if (eClickInsideChats && !$(e.target).parents('.msgDockWrapper').length && !$(e.target).parents('.fr_msg_l').length) {
						e.stopImmediatePropagation();
					}
					eClickInsideChats = false;
				});
				if ($._data(document,'events') && $._data(document,'events').click) {
					$._data(document,'events').click.unshift($._data(document,'events').click.pop());
				}
			} catch (e) { console.log(e); }
		}
	})(worker.jQuery);
};
// ui_timeout
var ui_timeout = worker.GUIp.timeout = {};

ui_timeout.bar = null;
ui_timeout.timeout = 0;
ui_timeout.finishDate = 0;
Object.defineProperty(ui_timeout, 'running', {get: function() {
	return Date.now() < this.finishDate;
}});
ui_timeout._tickTimeout = 0;
ui_timeout._tick = function() {
	this._tickTimeout = 0;
	ui_utils.updateVoiceSubmitState();
	ui_informer.updateCustomInformers();
}.bind(ui_timeout);
// creates timeout bar element
ui_timeout.create = function() {
	this.bar = document.createElement('div');
	this.bar.id = 'timeout_bar';
	document.body.insertAdjacentElement('afterbegin', this.bar);
};
// starts timeout bar
ui_timeout.start = function() {
	var customTimeout = parseFloat(ui_storage.get('Option:voiceTimeout'));
	worker.clearTimeout(this._tickTimeout);
	this.timeout = customTimeout > 0 ? customTimeout : 20;
	this.bar.style.transitionDuration = '0s';
	this.bar.classList.remove('running');
	this._tickTimeout = GUIp.common.setTimeout(this._delayedStart, 10);
};
ui_timeout._delayedStart = function() {
	this.bar.style.transitionDuration = this.timeout + 's';
	this.bar.classList.add('running');
	this.finishDate = Date.now() + this.timeout*1000;
	this._tickTimeout = GUIp.common.setTimeout(this._tick, this.timeout*1000);
	ui_utils.updateVoiceSubmitState();
}.bind(ui_timeout);
// ui_help
var ui_help = worker.GUIp.help = {};

ui_help.init = function() {
	ui_help._createHelpDialog();
	ui_help._createButtons();
};
// creates ui dialog
ui_help._createHelpDialog = function() {
	document.getElementById('menu_bar').insertAdjacentHTML('afterend',
		'<div id="ui_help" class="hint_bar" style="padding-bottom: 0.7em; display: none;">' +
		'<div class="hint_bar_capt"><b>Erinome Godville UI+ (v' + ui_data.currentVersion + ')</b>, ' + worker.GUIp_i18n.help_dialog_capt + '</div>' +
		'<div class="hint_bar_content" style="padding: 0.5em 0.8em;">'+
			'<div style="text-align: left;">' +
				'<div>' + worker.GUIp_i18n.how_to_update + '</div>' +
				'<ol>' +
					worker.GUIp_i18n['help_update_all'] +
				'</ol>' +
				'<div>' + worker.GUIp_i18n.help_useful_links + '</div>' +
				'<div>' + worker.GUIp_i18n.help_ci_links + '</div>' +
				'<div>' + worker.GUIp_i18n.help_reset_links + '</div>' +
			'</div>' +
		'</div>' +
		'<div class="hint_bar_close"></div></div>'
	);
	GUIp.common.addListener(document.getElementById('checkUIUpdate'), 'click', function(ev) {
		ev.preventDefault();
		ui_utils.checkVersion(ui_utils.informNoNewVersionAvailable, ui_utils.informNewVersionAvailable, ui_utils.informVersionCheckFailed);
	});
	GUIp.common.addListener(document.getElementById('checkCIExpression'), 'click', function(ev) {
		ev.preventDefault();
		ui_informer.checkCustomExpression();
	});
	GUIp.common.addListener(document.getElementById('resetGVSettings'), 'click', function(ev) {
		ev.preventDefault();
		if (worker.confirm(worker.GUIp_i18n.reset_gv_settings)) {
			ui_storage.clear('Godville');
		}
	});
	GUIp.common.addListener(document.getElementById('resetUISettings'), 'click', function(ev) {
		ev.preventDefault();
		if (worker.confirm(worker.GUIp_i18n.reset_ui_settings)) {
			ui_storage.clear('eGUI');
		}
	});
	GUIp.common.addListener(document.getElementById('resetPhrasesDB'), 'click', function(ev) {
		ev.preventDefault();
		localStorage['LogDB:lastSerial'] = "";
		localStorage['LogDB:lastUpdate'] = 0;
		localStorage['LogDB:lastSailSerial'] = "";
		localStorage['LogDB:lastSailUpdate'] = 0;
		worker.alert(worker.GUIp_i18n.reset_phrases_db);
	});
	if (ui_storage.getFlag('helpDialogVisible')) {
		worker.$('#ui_help').show();
	}
};
ui_help._createButtons = function() {
	if (ui_data.isMobile) {
		document.querySelector('.e_mt_menu').insertAdjacentHTML('beforebegin',
			'<div class="line hline e_m_ui_settings"><div class="l_header">' + worker.GUIp_i18n.ui_settings + ' <span class="em_font">➠</span></div></div>' +
			'<div class="line e_m_forecast"><div class="l_text">' + worker.GUIp_i18n.daily_forecast + ': [<span id="e_forecast"></span>]</div></div>' +
			'<div class="line e_m_available_coupon hidden"><div class="l_text"></div></div>' +
			'<div class="line e_m_available_ad hidden"><div class="l_text"></div></div>' +
			'<div class="line e_m_ui_help"><div class="l_text">' + ui_utils.capitalizeFirstLetter(worker.GUIp_i18n.help_dialog_capt) + '</div></div>' +
			'<div class="line hline e_mt_forum_informers hidden"><div class="l_header">' + worker.GUIp_i18n.forum_subs + ' <span class="em_font">➠</span></div></div>'
		);
		GUIp.common.addListener(document.getElementsByClassName('e_m_ui_settings')[0], 'click', function(e) {
			location.href = '/user/profile_mob#ui_settings';
		});
		GUIp.common.addListener(document.getElementsByClassName('e_mt_forum_informers')[0], 'click', function(e) {
			location.href = '/forums/show/1/#guip_subscriptions';
		});
		GUIp.common.addListener(document.getElementsByClassName('e_m_ui_help')[0], 'click', function(e) {
			ui_help.toggleDialog();
		});
		GUIp.common.addListener(document.getElementsByClassName('e_m_forecast')[0], 'click', function(e) {
			ui_data._getNewspaper(true);
			worker.alert(worker.GUIp_i18n.daily_forecast_update_notice);
		});
		GUIp.common.addListener(document.getElementsByClassName('e_m_available_coupon')[0], 'click', function(e) {
			location.href = '/news';
		});
		GUIp.common.addListener(document.getElementsByClassName('e_m_available_ad')[0], 'click', function(e) {
			location.href = '/news';
		});
		ui_improver.showDailyForecast();
	} else {
		var lastItem = document.querySelector('#menu_bar ul > li:last-child'),
			lastSeparator = lastItem.firstChild;
		if (lastSeparator.nodeType === 3 && lastSeparator.nodeValue.trim() === '|') {
			// Godville puts the last separator in the beginning of the last menu item. move it to the end
			// of the previous one.
			lastItem.previousElementSibling.appendChild(lastSeparator);
		}
		lastItem.insertAdjacentHTML('beforebegin',
			'<li><a href="/user/profile#ui_settings" target="_blank">' + worker.GUIp_i18n.ui_settings_top_menu +
			'</a> | </li><li> | </li>'
		);
		ui_help._addToggleButton(lastItem.previousSibling, '<strong>' + worker.GUIp_i18n.ui_help + '</strong>');
	}
	if (ui_storage.getFlag('Option:enableDebugMode')) {
		ui_help._addDumpButton('<span>dump: </span>', 'all');
		ui_help._addDumpButton('<span>, </span>', 'options', 'Option');
		ui_help._addDumpButton('<span>, </span>', 'logger', 'Logger');
		ui_help._addDumpButton('<span>, </span>', 'forum', 'Forum');
		ui_help._addDumpButton('<span>, </span>', 'log', 'Log:');
	}
	ui_help._addToggleButton(document.getElementsByClassName('hint_bar_close')[0], worker.GUIp_i18n.close);
};
// gets toggle button
ui_help._addToggleButton = function(elem, text) {
	elem.insertAdjacentHTML('afterbegin', '<a class="close_button">' + text + '</a>');
	GUIp.common.addListener(elem.getElementsByClassName('close_button')[0], 'click', function(ev) {
		ev.preventDefault();
		ui_help.toggleDialog();
	});
};
// gets dump button with a given label and selector
ui_help._addDumpButton = function(text, label, selector) {
	var hint_bar_content = document.getElementsByClassName('hint_bar_content')[0];
	hint_bar_content.insertAdjacentHTML('beforeend', text + '<a class="devel_link" id="dump_' + label + '">' + label + '</a>');
	GUIp.common.addListener(document.getElementById('dump_' + label), 'click', function() {
		ui_storage.dump(selector);
	});
};
ui_help.toggleDialog = function(visible) {
	ui_storage.set('helpDialogVisible', !ui_storage.getFlag('helpDialogVisible'));
	worker.$('#ui_help').slideToggle('slow');
};
// ui_storage
var ui_storage = worker.GUIp.storage = {};

ui_storage._backend = localStorage;
ui_storage._listeners = Object.create(null);
ui_storage._fallbackListeners = [];

var ui_tmpstorage = GUIp.tmpstorage = Object.create(ui_storage);
ui_tmpstorage._backend = sessionStorage;
ui_tmpstorage._listeners = Object.create(null);
ui_tmpstorage._fallbackListeners = [];

ui_tmpstorage.wipeOut = function() {
	this._delete(/(?:)/);
};

ui_storage.init = function() {
	this.migrate();
	GUIp.common.addListener(worker, 'storage', ui_storage._processExternalChanges);
	if (ui_data.god_name !== sessionStorage.eGUI_CurrentUser) {
		// paranoid mode
		ui_tmpstorage.wipeOut();
		sessionStorage.eGUI_CurrentUser = ui_data.god_name;
	}
};

ui_storage._getKey = function(key) {
	return 'eGUI_' + ui_data.god_name + ':' + key;
};
// gets diff with a value
ui_storage.diff = function(id, value) {
	var diff = null;
	var old = this.get(id);
	if (old !== null && value !== null) {
		diff = value - old;
	}
	return diff;
};
// stores a value
ui_storage.set = function(id, value) {
	return (this._backend[this._getKey(id)] = value);
};
// reads a value
ui_storage.get = function(id) {
	return this._backend.getItem(this._getKey(id)); // .getItem returns null if the key was not found
};
ui_storage.getFlag = function(id) {
	return this.get(id) === 'true';
};
ui_storage.getList = function(id) {
	return ui_utils.splitList(this.get(id));
};
// deletes single item from storage
ui_storage.remove = function(id) {
	return this._backend.removeItem(this._getKey(id));
};
// stores value and gets diff with old
ui_storage.set_with_diff = function(id, value) {
	var diff = this.diff(id, value);
	this.set(id, value);
	return diff;
};
// list keys with specified prefix
ui_storage.list = function(prefix) {
	var lines = [],
		prefix = 'eGUI_' + ui_data.god_name + ':' + (prefix || ''),
		keys = Object.keys(this._backend),
		key = '';
	for (var i = 0, len = keys.length; i < len; i++) {
		key = keys[i];
		if (key.startsWith(prefix)) {
			lines.push(key.slice(key.indexOf(':') + 1));
		}
	}
	return lines;
};
// dumps all values related to current god_name
ui_storage.dump = function(selector) {
	var lines = [],
		prefix = 'eGUI_' + (selector ? ui_data.god_name + ':' + selector : ''),
		keys = Object.keys(this._backend),
		key = '';
	for (var i = 0, len = keys.length; i < len; i++) {
		key = keys[i];
		if (key.startsWith(prefix)) {
			lines.push(key + ' = ' + this._backend[key]);
		}
	}
	lines.sort();
	worker.console.info('Godville UI+: Storage:\n' + lines.join('\n'));
};
// resets saved options
ui_storage.clear = function(what) {
	if (!what || !/^(?:eGUI|Godville|All)$/.test(what)) {
		if (worker.GUIp_locale === 'ru') {
			worker.console.log('Godville UI+: использование storage.clear:\n' +
							   'storage.clear("eGUI") для удаления только настроек Godville UI+;\n' +
							   'storage.clear("Godville") для удаления настроек Годвилля, сохранив настройки Godville UI+;\n' +
							   'storage.clear("All") для удаления всех настроек.');
		} else {
			worker.console.log('Godville UI+: storage.clear usage:\n' +
							   'storage.clear("eGUI") to remove Godville UI+ settings only;\n' +
							   'storage.clear("Godville") to remove Godville settings and keep Godville UI+ settings;\n' +
							   'storage.clear("All") to remove all settings.');
		}
		return;
	}
	var keys = Object.keys(this._backend),
		key = '';
	for (var i = 0, len = keys.length; i < len; i++) {
		key = keys[i];
		if (what === 'eGUI' && key.startsWith('eGUI_') ||
			what === 'Godville' && !key.startsWith('eGUI_') ||
			what === 'All') {
			this._backend.removeItem(key);
		}
	}
	location.reload();
};
/**
 * Register function to be called when *another tab* modifies a particular key in the storage.
 * Caution: if you modify the storage via browser console attached to *this tab*, callback will not be invoked.
 *
 * @param {string} id
 * @param {function(?string)} handler
 */
ui_storage.addListener = function(id, handler) {
	if (id in this._listeners) {
		throw new Error('attempting to reassign external change listener for "' + id + '"');
	}
	this._listeners[id] = handler;
};
/**
 * Register function to be called when *another tab* modifies a particular key in the storage,
 * and invoke it immediately.
 * Caution: if you modify the storage via browser console attached to *this tab*, callback will not be invoked.
 *
 * @param {string} id
 * @param {function(?string)} handler
 */
ui_storage.addImmediateListener = function(id, handler) {
	this.addListener(id, handler);
	handler(this.get(id));
};
/**
 * Register function to be called when *another tab* modifies something in the storage.
 * Caution: if you modify the storage via browser console attached to *this tab*, callback will not be invoked.
 *
 * @param {function(string, ?string)} handler
 */
ui_storage.addFallbackListener = function(handler) {
	this._fallbackListeners.push(handler);
};
ui_storage._processExternalChanges = function(ev) {
	var prefix = ui_storage._getKey(''),
		storage = ev.storageArea === localStorage ? ui_storage : ui_tmpstorage,
		key = '',
		handler;
	// we're interested in keys related to current godname only
	if (!ev.key || !ev.key.startsWith(prefix)) {
		return;
	}
	// strip prefix from actual key name and switch by eGUI+ storage keys
	key = ev.key.slice(prefix.length);
	if ((handler = storage._listeners[key])) {
		handler(ev.newValue);
	} else {
		for (var i = 0, len = storage._fallbackListeners.length; i < len; i++) {
			GUIp.common.try2(storage._fallbackListeners[i], key, ev.newValue);
		}
	}
};
ui_storage.Var = function(value, save) {
	this._value = value;
	this.save = save;
};
ui_storage.Var.prototype = {
	constructor: ui_storage.Var,
	get: function() {
		return this._value;
	},
	set: function(value) {
		this._value = value;
		this.save();
	},
	setTemp: function(value) {
		this._value = value;
	}
};
/**
 * Create a variable which value might be modified by another tab.
 *
 * @template T
 * @param {string} id
 * @param {?function(?string): T} [decode]
 * @param {?function(T): (boolean|number|string|!Array<(boolean|number|string)>)} [encode]
 * @param {?function()} [onReload]
 * @returns {!GUIp.storage.Var<T>}
 */
ui_storage.createVar = function(id, decode, encode, onReload) {
	var storage = this,
		v = new ui_storage.Var(
			decode ? decode(storage.get(id)) : storage.get(id),
			encode ? (
				function save() { storage.set(id, encode(this._value)); }
			) : function save() { storage.set(id, this._value); }
		);
	storage.addListener(id, function onVarReload(newValue) {
		v._value = decode ? decode(newValue) : newValue;
		if (onReload) onReload();
	});
	return v;
};
ui_storage._rename = function(from, to) {
	var keys = Object.keys(this._backend),
		key = '';
	for (var i = 0, len = keys.length; i < len; i++) {
		key = keys[i];
		if (from.test(key)) {
			this._backend[key.replace(from, to)] = this._backend[key];
			this._backend.removeItem(key);
		}
	}
};
ui_storage._delete = function(regexp) {
	var keys = Object.keys(this._backend),
		key = '';
	for (var i = 0, len = keys.length; i < len; i++) {
		key = keys[i];
		if (key.startsWith('eGUI_') && regexp.test(key)) {
			this._backend.removeItem(key);
		}
	}
};
ui_storage._iterate = function(callback) {
	var keys = Object.keys(this._backend),
		key = '',
		colon = 0;
	for (var i = 0, len = keys.length; i < len; i++) {
		key = keys[i];
		if (!key.startsWith('eGUI_')) continue;
		colon = key.indexOf(':', 5);
		callback.call(this, key, key.slice(colon >= 0 ? colon + 1 : 5), colon >= 6 ? key.slice(5, colon) : '');
	}
};
ui_storage.migrate = function() {
	var mid = localStorage.eGUI_migrated,
		midc = false,
		updateTo = function(date) {
			if (mid >= date) return false;
			mid = date;
			midc = true;
			return true;
		};
	if (!mid) {
		ui_storage._rename(/^GUIp_/, 'eGUI_');
		mid = localStorage.eGUI_migrated;
		if (!mid) {
			mid = '141115';
			midc = true;
		}
	}
	if (updateTo('150510')) {
		ui_storage._delete(/:Stats:/);
	}
	if (updateTo('151003')) {
		var topics = Object.create(null);
		ui_storage._iterate(function(key, localKey, godn) {
			if (!/Forum\d/.test(localKey)) {
				return;
			}
			Object.assign(topics[godn] || (topics[godn] = {}), JSON.parse(localStorage.getItem(key)));
			localStorage.removeItem(key);
		});
		for (var godn in topics) {
			localStorage.setItem('eGUI_' + godn + ':ForumSubscriptions', JSON.stringify(topics[godn]));
		}
	}
	if (updateTo('160310')) {
		var allInformers = ['full_godpower','much_gold','dead','low_health','fight','arena_available','dungeon_available','sail_available','selected_town','wanted_monster','special_monster','tamable_monster','chosen_monster','pet_knocked_out','close_to_boss','close_to_rival','guild_quest','mini_quest','custom_informers','arena_box','aura_box','black_box','treasure_box','boss_box','charge_box','coolstory_box','friend_box','gift_box','good_box','heal_box','invite','raidboss_box','quest_box','smelter','teleporter','temper_box','to_arena_box','transformer'];
		ui_storage._iterate(function(key, localKey, godn) {
			if (localKey === 'Option:forbiddenInformers') {
				var oldInformers = localStorage.getItem(key).split(','),
					newInformers = {};
				for (var i = 0, len = allInformers.length; i < len; i++) {
					if (!oldInformers.includes(allInformers[i])) {
						newInformers[allInformers[i]] = 48;
					}
				}
				if (newInformers['tamable_monster']) {
					newInformers['tamable_monster'] = 112;
				}
				localStorage.removeItem(key);
				localStorage.setItem('eGUI_' + godn + ':Option:activeInformers', JSON.stringify(newInformers));
			}
		});
	}
	if (updateTo('160320')) {
		ui_storage._delete(/:LEMRestrictions:/);
	}
	if (updateTo('170200')) {
		var oldValue, customWords = [['custom_informers','title'],['custom_craft','t'],['ally_blacklist','n']];
		ui_storage._iterate(function(key, localKey) {
			for (var i = 0, len = customWords.length; i < len; i++) {
				if (localKey === 'CustomWords:' + customWords[i][0]) {
					var prop = customWords[i][1];
					oldValue = JSON.parse(localStorage.getItem(key));
					for (var j = 0, len2 = oldValue.length; j < len2; j++) {
						if (oldValue[j][prop] && oldValue[j][prop][0] === '#') {
							oldValue[j].q = true;
							oldValue[j][prop] = oldValue[j][prop].slice(1);
						}
					}
					localStorage.setItem(key,JSON.stringify(oldValue));
				}
			}
		});
	}
	if (updateTo('171010')) {
		localStorage.setItem('LogDB:lastUpdate', 0);
		localStorage.setItem('LogDB:lastSerial', 0);
	}
	if (updateTo('190825')) {
		ui_storage._iterate(function(key, localKey, godn) {
			if (localKey === 'ThirdEye:LastLog' || localKey === 'ThirdEye:PenultLog') {
				var date = new Date(localStorage.getItem(key));
				if (date.getTime()) {
					var res = JSON.parse(localStorage.getItem('eGUI_' + godn + ':ThirdEye:DungeonResults') || '[]');
					res.push(date.getTime());
					res = res.sort().slice(-2);
					localStorage.setItem('eGUI_' + godn + ':ThirdEye:DungeonResults',JSON.stringify(res));
					localStorage.removeItem(key);
				}
			}
		});
	}
	if (updateTo('190830')) {
		ui_storage._iterate(function(key, localKey, godn) {
			if (localKey === 'Option:disableLayingTimer') {
				if (localStorage.getItem(key) === 'true') {
					localStorage.setItem('eGUI_' + godn + ':Option:disabledTimers','laying');
				}
				localStorage.removeItem(key);
			}
		});
	}
	if (updateTo('190902')) {
		ui_storage._delete(/:ThirdEye:/);
	}
	if (updateTo('200118')) {
		ui_storage._iterate(function(key, localKey) {
			if (localKey.startsWith('Logger:HTML:') && localStorage.getItem(key).length > 3000) {
				localStorage.removeItem(key);
			}
		});
	}
	if (updateTo('200412')) {
		ui_storage._iterate(function(key, localKey) {
			if (localKey !== 'Option:disabledTimers' &&
				localKey !== 'ThirdEye:Activities' &&
				localKey !== 'ThirdEye:ActivityStatuses'
			) return;
			localStorage.setItem(key, localStorage.getItem(key).replace(/\blaying\b/g, 'conversion'));
		});
	}
	if (updateTo('200717')) {
		ui_storage._iterate(function(key, localKey, godn) {
			var newKey = '';
			switch (localKey) {
				case 'BingoItems': newKey = ':Newspaper:bingoItems'; break;
				case 'BingoTries': newKey = ':Newspaper:bingoTries'; break;
				case 'CouponPrize': newKey = ':Newspaper:couponPrize'; break;
				case 'DailyForecast': newKey = ':Newspaper:dailyForecast'; break;
				case 'DailyForecastText': newKey = ':Newspaper:dailyForecastText'; break;
				case 'WantedItem:Value': newKey = ':Newspaper:wantedItems'; break;
				case 'WantedMonster:Date': newKey = ':Newspaper:date'; break;
				case 'WantedMonster:Value': break;
				default: return;
			}
			if (newKey) {
				localStorage.setItem('eGUI_' + godn + newKey, localStorage.getItem(key));
			}
			localStorage.removeItem(key);
		});
	}
	if (updateTo('210514')) {
		localStorage.setItem('LogDB:lastUpdate', 0);
		localStorage.setItem('LogDB:lastSerial', 0);
	}
	if (updateTo('250222')) {
		ui_storage._delete(/:LEMRestrictions:/);
	}
	if (midc) {
		localStorage.eGUI_migrated = mid;
	}
};
// ui_expr
var ui_expr = GUIp.expr = {};

ui_expr.init = function() {
	GUIp.common.expr.init(jsep.noConflict());
};

ui_expr._unaryOps = {
	'!': function(x) { return !x; },
	'+': function(x) { return +x; },
	'-': function(x) { return -x; },
	'~': function(x) { return ~x; }
};

ui_expr._binaryOps = {
	'*':   function(x, y) { return x * y; },
	'/':   function(x, y) { return x / y; },
	'%':   function(x, y) { return x % y; },
	'+':   function(x, y) { return x + y; },
	'-':   function(x, y) { return x - y; },
	'<<':  function(x, y) { return x << y; },
	'>>':  function(x, y) { return x >> y; },
	'>>>': function(x, y) { return x >>> y; },
	'<':   function(x, y) { return x < y; },
	'>':   function(x, y) { return x > y; },
	'<=':  function(x, y) { return x <= y; },
	'>=':  function(x, y) { return x >= y; },
	'===': function(x, y) { return x === y; },
	'!==': function(x, y) { return x !== y; },
	'==':  function(x, y) { return x == y; },
	'!=':  function(x, y) { return x != y; },
	'&':   function(x, y) { return x & y; },
	'^':   function(x, y) { return x ^ y; },
	'|':   function(x, y) { return x | y; }
};

/**
 * @private
 * @param {*} text
 * @returns {boolean}
 */
ui_expr._testRegex = function(text) {
	return this.eRegex.test(text);
};

/**
 * @private
 * @param {*} text
 * @returns {?Array<string>}
 */
ui_expr._execRegex = function(text) {
	return this.eRegex.exec(text);
};

/**
 * @private
 * @const
 * @type {!Object<string, function({type: string})>}
 */
ui_expr._processors = {
	Literal: function() { },
	E_GVLiteral: function() { },

	ArrayExpression: function(node) {
		node.elements.forEach(ui_expr._processNode);
	},

	ConditionalExpression: function(node) {
		ui_expr._processNode(node.test);
		ui_expr._processNode(node.consequent);
		ui_expr._processNode(node.alternate);
	},

	UnaryExpression: function(node) {
		if (!node.prefix) {
			throw new Error('unsupported postfix unary operator "' + node.operator + '"');
		}
		if (!(node.eFunc = ui_expr._unaryOps[node.operator])) {
			throw new Error('unsupported prefix unary operator "' + node.operator + '"');
		}
		ui_expr._processNode(node.argument);
	},

	BinaryExpression: function(node) {
		if (!(node.eFunc = ui_expr._binaryOps[node.operator])) {
			throw new Error('unsupported binary operator "' + node.operator + '"');
		}
		ui_expr._processNode(node.left);
		ui_expr._processNode(node.right);
	},

	LogicalExpression: function(node) {
		if (!(node.eAnd = node.operator === '&&') && node.operator !== '||') {
			throw new Error('unsupported logical operator "' + node.operator + '"');
		}
		ui_expr._processNode(node.left);
		ui_expr._processNode(node.right);
	},

	MemberExpression: function(node) {
		ui_expr._processNode(node.object);
		if (node.computed) {
			ui_expr._processNode(node.property);
		}
	},

	E_GVExpression: function(node) {
		ui_expr._processNode(node.property);
	},

	CallExpression: function(node) {
		ui_expr._processNode(node.callee);
		node.arguments.forEach(ui_expr._processNode);
	},

	E_MatchExpression: function(node) {
		ui_expr._processNode(node.text);
		ui_expr._processNode(node.pattern);
		if (/*node.pattern.type !== 'Literal' ||*/ typeof node.pattern.value !== 'string') {
			return;
		}
		// pattern is a literal string
		var pattern = node.pattern.value,
			insensitive = node.insensitive;
		if (!node.testOnly || /[\\^$*+?.()|[{]/.test(pattern)) {
			node.eRegex = new RegExp(pattern, insensitive ? 'i' : '');
			node.eFunc = node.testOnly ? ui_expr._testRegex : ui_expr._execRegex;
		} else {
			// no metacharacters here, can optimize into plain substring search
			if (insensitive) {
				pattern = pattern.toLowerCase();
				node.eFunc = function(text) {
					return String(text).toLowerCase().includes(pattern);
				};
			} else {
				node.eFunc = function(text) {
					return String(text).includes(pattern);
				};
			}
			// though we must keep the regex available for debugging purpose
			GUIp.common.defineCachedProperty(node, 'eRegex', function() {
				return new RegExp(pattern, insensitive ? 'i' : '');
			});
		}
	}
};

/**
 * @private
 * @param {{type: string}} node
 */
ui_expr._processNode = function(node) {
	var type = node.type;
	ui_expr._processors[type](node);
	node.eEval = ui_expr._evaluators[type];
};

/**
 * @typedef {Object} GUIp.expr.CompiledExpr
 * @property {string} type
 * @property {function(!GUIp.expr.Runtime): *} eEval
 */

/**
 * @typedef {Object} GUIp.expr.Runtime
 * @property {!Object} gv
 * @property {function(string): *} gvCache
 * @property {?function(!GUIp.expr.CompiledExpr): *} eval
 */

/**
 * @param {string} text
 * @param {boolean} [inBooleanContext]
 * @returns {!GUIp.expr.CompiledExpr}
 */
ui_expr.compile = function(text, inBooleanContext) {
	var ast = GUIp.common.expr.parse(text, inBooleanContext);
	ui_expr._processNode(ast);
	return ast;
};

/**
 * @param {string} text
 * @returns {!Array<(string|!GUIp.expr.CompiledExpr)>}
 */
ui_expr.compileEmbedded = function(text) {
	var fragments = GUIp.common.expr.parseEmbedded(text);
	for (var i = 0, len = fragments.length; i < len; i++) {
		var fr = fragments[i];
		if (typeof fr === 'object') {
			ui_expr._processNode(fr);
		}
	}
	return fragments;
};

/**
 * @private
 * @param {!GUIp.expr.Runtime} rt
 * @param {!Array<!GUIp.expr.CompiledExpr>} items
 */
ui_expr._evaluateArray = function(rt, items) {
	if (rt.eval) {
		return items.map(rt.eval, rt);
	}
	var result = [];
	for (var i = 0, len = items.length; i < len; i++) {
		result[i] = items[i].eEval(rt);
	}
	return result;
};

/**
 * @private
 * @const
 * @type {!Object<string, function(this: GUIp.expr.CompiledExpr, !GUIp.expr.Runtime): *>}
 */
ui_expr._evaluators = {
	Literal: function() { return this.value; },
	E_GVLiteral: function(rt) { return rt.gv; },

	ArrayExpression: function(rt) {
		return ui_expr._evaluateArray(rt, this.elements);
	},

	ConditionalExpression: function(rt) {
		if (!rt.eval) {
			return this.test.eEval(rt) ? this.consequent.eEval(rt) : this.alternate.eEval(rt);
		}
		var a = rt.eval(this.test),
			b = rt.eval(this.consequent),
			c = rt.eval(this.alternate);
		return a ? b : c;
	},

	UnaryExpression: function(rt) {
		return this.eFunc(rt.eval ? rt.eval(this.argument) : this.argument.eEval(rt));
	},

	BinaryExpression: function(rt) {
		if (rt.eval) {
			return this.eFunc(rt.eval(this.left), rt.eval(this.right));
		} else {
			return this.eFunc(this.left.eEval(rt), this.right.eEval(rt));
		}
	},

	LogicalExpression: function(rt) {
		var x, y;
		if (rt.eval) {
			x = rt.eval(this.left);
			y = rt.eval(this.right);
		} else {
			x = this.left.eEval(rt);
		}
		return this.eAnd ? x && (rt.eval ? y : this.right.eEval(rt)) : x || (rt.eval ? y : this.right.eEval(rt));
	},

	MemberExpression: function(rt) {
		var property;
		if (!this.computed) {
			property = this.property.name;
		} else if (rt.eval) {
			property = rt.eval(this.property);
			} else {
				property = this.property.eEval(rt);
			}
			property = String(property);
			if (property === 'constructor' || property === 'prototype' || property === '__proto__') {
			throw new Error('unsafe property "' + property + '"');
		}
		if (rt.eval) {
			return rt.eval(this.object)[property];
		} else {
			return this.object.eEval(rt)[property];
		}
	},

	E_GVExpression: function(rt) {
		return rt.gvCache(rt.eval ? rt.eval(this.property) : this.property.eEval(rt));
	},

	CallExpression: function(rt) {
		var callee = this.callee, obj = null, methodName = '', func;
		if (callee.type === 'MemberExpression') {
			if (!callee.computed) {
				obj = rt.eval ? rt.eval(callee.object) : callee.object.eEval(rt);
				methodName = callee.property.name;
			} else if (rt.eval) {
				obj = rt.eval(callee.object);
				methodName = rt.eval(callee.property);
				} else {
					obj = callee.object.eEval(rt);
					methodName = callee.property.eEval(rt);
				}
				methodName = String(methodName);
				if (methodName === 'constructor' || methodName === 'prototype' || methodName === '__proto__') {
				throw new Error('unsafe method "' + methodName + '"');
			}
			func = obj[methodName];
			if (typeof func !== 'function') {
				throw new TypeError(
					'<' + Object.prototype.toString.call(obj).slice(8, -1) + '>.' + methodName +
					' is ' + (func === null ? 'null' : typeof func)
				);
			}
		} else {
			func = rt.eval ? rt.eval(callee) : callee.eEval(rt);
			if (typeof func !== 'function') {
				throw new TypeError(
					(func == null ? func : '<' + Object.prototype.toString.call(func).slice(8, -1) + '>') +
					' cannot be used as a function'
				);
			}
		}
		return func.apply(obj, ui_expr._evaluateArray(rt, this.arguments));
	},

	E_MatchExpression: function(rt) {
		var text = rt.eval ? rt.eval(this.text) : this.text.eEval(rt);
		if (this.eFunc) {
			// we have got optimized code for matching, lucky us
			if (this.negated) {
				return !this.eFunc(text);
			} else if (rt.eval) {
				// ...but we're not going to use it
				return this.eRegex.exec(text);
			} else {
				return this.eFunc(text);
			}
		}
		// common case: compile and match
		var regex = new RegExp(rt.eval ? rt.eval(this.pattern) : this.pattern.eEval(rt), this.insensitive ? 'i' : '');
		if (this.negated) {
			return !regex.test(text);
		} else if (this.testOnly && !rt.eval) {
			return regex.test(text);
		} else {
			return regex.exec(text);
		}
	}
};

/**
 * @param {!Object} obj
 * @returns {function(string): *}
 */
ui_expr.makeCache = function(obj) {
	var cache = Object.create(null);
	return function(prop) {
		var x = cache[prop];
		return x !== undefined ? x : (cache[prop] = obj[prop]);
	};
};

/**
 * @param {!GUIp.expr.CompiledExpr} ast
 * @param {!Object} gv
 * @param {function(string): *} gvCache
 * @returns {*}
 */
ui_expr.eval = function(ast, gv, gvCache) {
	return ast.eEval({gv: gv, gvCache: gvCache, eval: null});
};

/**
 * @param {!Array<(string|!GUIp.expr.CompiledExpr)>} fragments
 * @param {!Object} gv
 * @param {function(string): *} gvCache
 * @returns {string}
 */
ui_expr.evalEmbedded = function(fragments, gv, gvCache) {
	var result = '',
		replacer = function(m0, m1) { return gvCache(m1); },
		rt = {gv: gv, gvCache: gvCache, eval: null};
	for (var i = 0, len = fragments.length; i < len; i++) {
		var fr = fragments[i];
		result += typeof fr === 'string' ? fr.replace(/\bgv\.(\w+)/g, replacer) : fr.eEval(rt);
	}
	return result;
};

/**
 * @typedef {Object} GUIp.expr.DebugInfo
 * @property {*} result
 * @property {(string|undefined)} error
 * @property {!Array<{type: string, eResult: *}>} trace
 */

/**
 * @param {!GUIp.expr.CompiledExpr} ast
 * @param {!Object} gv
 * @param {function(string): *} gvCache
 * @returns {!GUIp.expr.DebugInfo}
 */
ui_expr.debug = function(ast, gv, gvCache) {
	var trace = [];
	var rt = {
		gv: gv,
		gvCache: gvCache,
		eval: function(node) {
			var result = node.eResult = node.eEval(this);
			trace.push(node);
			return result;
		}
	};

	try {
		return {trace: trace, result: rt.eval(ast)};
	} catch (e) {
		return {trace: trace, error: e.toString()};
	}
};
// ui_words
var ui_words = worker.GUIp.words = {};

/**
 * @readonly
 * @type {!Object<string, {q: boolean, n: string, r: string, s: string}>}
 */
ui_words.allyBlacklist = Object.create(null);
ui_words.currentPhrase = '';
// gets words from phrases.js file and splits them into sections
ui_words.init = function() {
	var customSects = ['chosen_monsters','special_monsters','custom_craft','custom_informers'],
		sect = '',
		text = '',
		inf;
	if (ui_data.isFight) {
		customSects = ['ally_blacklist','custom_informers'];
	}
	this.base = worker.GUIp_words();
	for (sect in this.base.phrases) {
		text = ui_storage.get('CustomPhrases:' + sect);
		if (text) {
			this.base.phrases[sect] = text.split('||');
		}
	}
	for (var i = 0, len = customSects.length; i < len; i++) {
		sect = customSects[i];
		text = ui_storage.get('CustomWords:' + sect);
		if (text) {
			try {
				this.base[sect] = JSON.parse(text,function(key,value) {
					return value === 'Infinity' ? Infinity : value;
				});
				if (sect === 'custom_informers') {
					for (var j = 0, jlen = this.base.custom_informers.length; j < jlen; j++) {
						inf = this.base.custom_informers[j];
						if (typeof inf.type === 'string') {
							inf.type = GUIp.common.parseInformerType(inf.type);
						}
					}
					ui_informer.recompileCustomInformers(this.base.custom_informers);
				}
			} catch (error) {
				GUIp.common.error('error while parsing custom words section "' + sect + '", resetting...');
				ui_storage.remove('CustomWords:' + sect);
			}
		}
	}
	this.allyBlacklist = GUIp.common.preprocessPlayerBlacklist(this.base.ally_blacklist || []);
};
ui_words._changeFirstLetter = function(text) {
	return text.startsWith('I ') ? text : text.charAt(0).toLowerCase() + text.slice(1);
};
ui_words._addHeroName = function(text) {
	if (!ui_storage.getFlag('Option:useHeroName')) { return text; }
	return ui_data.char_name + ', ' + ui_words._changeFirstLetter(text);
};
ui_words._addExclamation = function(text) {
	if (!ui_storage.getFlag('Option:useExclamations')) { return text; }
	return ui_utils.getRandomItem(this.base.phrases.exclamation) + ', ' + ui_words._changeFirstLetter(text);
};
// single phrase gen
ui_words._randomPhrase = function(sect) {
	return ui_utils.getRandomItem(this.base.phrases[sect]);
};
// single phrase gen for inverted direction
ui_words._randomPhraseInvDir = function(sect) {
	var replacement = [];
	switch (sect) {
		case 'go_north': sect = 'go_south'; replacement = ['↓','↑']; break;
		case 'go_south': sect = 'go_north'; replacement = ['↑','↓']; break;
		case 'go_west': sect = 'go_east'; replacement = ['→','←']; break;
		case 'go_east': sect = 'go_west'; replacement = ['←','→']; break;
	}
	if (ui_storage.getFlag('Option:disableInvertedArrows')) {
		return ui_utils.getRandomItem(this.base.phrases[sect]);
	} else {
		return ui_utils.getRandomItem(this.base.phrases[sect]).replace(replacement[0],replacement[1]);
	}
};
ui_words._longPhrase_recursion = function(source, len) {
	while (source.length) {
		var next = ui_utils.popRandomItem(source);
		var remainder = len - next.length - 2; // 2 for ', '
		if (remainder > 0) {
			return [next].concat(ui_words._longPhrase_recursion(source, remainder));
		}
	}
	return [];
};
// main phrase constructor
ui_words.longPhrase = function(sect, item_name, len) {
	if (ui_storage.getFlag('phrasesChanged')) {
		ui_words.init();
		ui_storage.set('phrasesChanged', 'false');
	}
	if (!ui_data.isFight && ['heal', 'pray', 'hit'].includes(sect)) {
		sect += '_field';
	}
	var prefix = ui_words._addHeroName(ui_words._addExclamation(''));
	var phrases;
	if (item_name) {
		phrases = [ui_words._randomPhrase(sect) + ' ' + item_name + '!'];
	} else if (sect.includes('go_')) {
		if (document.getElementById('map') && document.getElementById('map').textContent.match(/Противоречия|Disobedience/)) {
			phrases = [ui_words._randomPhraseInvDir(sect)];
		} else {
			phrases = [ui_words._randomPhrase(sect)];
		}
	} else if (ui_storage.getFlag('Option:useShortPhrases')) {
		phrases = [ui_words._randomPhrase(sect)];
	} else {
		phrases = ui_words._longPhrase_recursion(this.base.phrases[sect].slice(), (len || 100) - prefix.length);
	}
	this.currentPhrase = prefix ? prefix + ui_words._changeFirstLetter(phrases.join(' ')) : phrases.join(' ');
	return this.currentPhrase;
};
// inspect button phrase gen
ui_words.inspectPhrase = function(item_name) {
	return ui_words.longPhrase('inspect_prefix', item_name);
};
// craft button phrase gen
ui_words.craftPhrase = function(items) {
	return ui_words.longPhrase('craft_prefix', items);
};
// mnemonic voices processing
ui_words.mnemoVoice = function() {
	if (ui_storage.getFlag('phrasesChanged')) {
		ui_words.init();
		ui_storage.set('phrasesChanged', 'false');
	}
	if (!this.base.phrases.mnemonics.length) {
		return;
	}
	var i, len, result, voiceInput = ui_utils.voiceInput.value.split('//'),
		defResult = this.base.phrases.mnemonics[0].split('//')[0];
	if (!ui_utils.voiceInput.value) {
		ui_utils.setVoice('// ' + defResult.trim(), true);
		return;
	}
	if (!voiceInput[1]) {
		voiceInput.unshift('');
	}
	result = this.mnemoLookup(voiceInput[1].trim());
	if (result) {
		ui_utils.setVoice((voiceInput[0].trim() + ' // ' + result.trim()).trim(), true);
	};
};
// mnemonics lookup
ui_words.mnemoLookup = function(request) {
	var i, len, mnemoline;
	// searching through mnemonics, return first case-insensitive match
	for (i = 0, len = this.base.phrases.mnemonics.length; i < len; i++) {
		mnemoline = this.base.phrases.mnemonics[i].split('//');
		if (mnemoline[1] && (request.toLowerCase() === mnemoline[1].trim().toLowerCase())) {
			return mnemoline[0];
		}
	}
	// full text search, return one phrase after full-string match
	for (i = 0, len = this.base.phrases.mnemonics.length; i < len; i++) {
		if (request === this.base.phrases.mnemonics[i].split('//')[0].trim()) {
			if ((i + 1) < len) {
				return this.base.phrases.mnemonics[i + 1].split('//')[0];
			} else {
				return this.base.phrases.mnemonics[0].split('//')[0];
			}
		}
	}
	// partial text search, return first case-insensitive partial match
	for (i = 0, len = this.base.phrases.mnemonics.length; i < len; i++) {
		mnemoline = this.base.phrases.mnemonics[i].split('//');
		if (mnemoline[0].trim().toLowerCase().includes(request.toLowerCase())) {
			return mnemoline[0];
		}
	}
	return null;
};
// Checkers
ui_words.usableItemType = function(desc,free) {
	return Object.keys(this.base.usable_items).find(function(type) {
		return ui_words.base.usable_items[type].desc === desc && (ui_words.base.usable_items[type].isFree === undefined || ui_words.base.usable_items[type].isFree === free)
	});
};
ui_words.usableItemTypeMatch = function(desc,type) {
	return (desc === this.base.usable_items[type].desc);
};
// ui_stats
var ui_stats = worker.GUIp.stats = {};

ui_stats.Ark_F = function() {
	var a = parseInt(ui_utils.getStat('#hk_ark_m .l_val','pointed',2));
	return !isNaN(a) ? a : null;
};
ui_stats.Ark_M = function() {
	var a = parseInt(ui_utils.getStat('#hk_ark_m .l_val','pointed',1));
	return !isNaN(a) ? a : null;
};
ui_stats.Bricks = function() {
	var a = ui_utils.getStat('#hk_bricks_cnt .l_val','dec');
	return parseInt(a === 1000 ? 1000 : a * 10) || 0;
};
ui_stats.Bits = function() {
	var a, b = ui_utils.getStat(ui_data.isMobile ? '#statusbar .e_sb_boss_bits' : '#hk_bl .l_val','text') || '';
	if ((a = /(?:(\d+)\+)?\[(.*?)\]/.exec(b))) {
		return (+a[1] || 0) * a[2].length + (a[2].match(/1/g) || []).length;
	}
	return parseInt(b) * ui_mining.bitsPerByte || 0;
};
ui_stats.Bytes = function() {
	var a = /\d+\+/.exec(ui_utils.getStat(ui_data.isMobile ? '#statusbar .e_sb_boss_bits' : '#hk_bl .l_val','text') || '');
	return a && parseInt(a[0]) || 0;
};
ui_stats.Bits_Per_Byte = function() {
	var a, b = ui_utils.getStat(ui_data.isMobile ? '#statusbar .e_sb_boss_bits' : '#hk_bl .l_val', 'text') || '';
	return (a = /\[.*?\]/.exec(b)) ? a[0].length - 2 : 8;
};
ui_stats.Book_Bytes = function() {
	var a, b = ui_utils.getStat('#hk_wrd .l_val','text') || '';
	if (a = b.match(/^(?:(.*?)% \+ )?\[(.*?)\]$/)) {
		return (+a[1]*10 || 0)*4 + 4 - (a[2] && a[2].match(/\./g) || []).length;
	}
	return 0;
};
ui_stats.Book_Words = function() {
	var a = (ui_utils.getStat('#hk_wrd .l_val','text') || '').match(/^(.*?)% \+ \[(.*?)\]/);
	return a && +a[1]*10 || 0;
};
ui_stats.Forge_Rank = function() {
	var a = (ui_utils.getStat('.dm_map_header .dl_val','text') || '').match(/^(.*?)(?: \+ (.*?)%)?$/);
	return a && +a[1] || 0;
};
ui_stats.Forge_Exp = function() {
	var a = (ui_utils.getStat('.dm_map_header .dl_val','text') || '').match(/^(.*?)(?: \+ (.*?)%)?$/);
	return a && +a[2] || 0;
};
ui_stats.Forge_Bytes = function() {
	var a, b = ui_utils.getStat('.dm_map_header + .dm_map_header .dl_val','text') || '';
	if (a = b.match(/^(\d+) ?(?: \+ \[(.*?)\])? (?:из|out of)/)) {
		return (+a[1] || 0)*4 + (a[2] && a[2].match(/[^\.]/g) || []).length;
	}
	return 0;
};
ui_stats.Forge_Words = function() {
	var a = (ui_utils.getStat('.dm_map_header + .dm_map_header .dl_val','text') || '').match(/^(\d+) ?(?: \+ \[(.*?)\])? (?:из|out of)/);
	return a && +a[1] || 0;
};
ui_stats.Charges =
ui_stats.Map_Charges =
ui_stats.Hero_Charges = function() {
	return ui_utils.getStat('#cntrl .acc_val','num') || 0;
};
ui_stats.Death = function() {
	return ui_utils.getStat('#hk_death_count .l_val','num') || 0;
};
ui_stats.Enemy_Bossname = function() {
	return ui_utils.getStat(ui_data.isMobile ? '.e_m_opps .opp_n' : '#o_hk_name .l_val a','text') || '';
};
ui_stats.Enemy_Godname = function() {
	if (ui_data.isMobile) {
		return ''; // in mobile version enemy godname is printed exactly the same as boss abilities, so probably better to always return empty string
	}
	return ui_utils.getStat('#o_hk_godname .l_val a','text') || '';
};
ui_stats.Enemy_Gold = function() {
	return ui_utils.getStat('#o_hk_gold_we .l_val','numre') || 0;
};
ui_stats.Enemy_HP = function() {
	var a, b = document.querySelectorAll((ui_data.isMobile ? '.e_m_opps' : '#opps') + ' .opp_h'),
		hp = 0;
	if (!b.length) {
		return +ui_utils.getStat('#o_hl1 .l_val','slashed',1) || 0;
	}
	for (var i = 0, len = b.length; i < len; i++) {
		if (a = b[i].textContent.match(/^(.+?) \/ (.+?)$/)) {
			hp += +a[1] || 0;
		}
	}
	return hp;
};
ui_stats.Enemy_MaxHP = function() {
	var a, b = document.querySelectorAll((ui_data.isMobile ? '.e_m_opps' : '#opps') + ' .opp_h'),
		mhp = 0;
	if (!b.length) {
		return +ui_utils.getStat('#o_hl1 .l_val','slashed',2) || 0;
	}
	for (var i = 0, len = b.length; i < len; i++) {
		if (a = b[i].textContent.match(/^(.+?) \/ (.+?)$/)) {
			mhp += +a[2] || 0;
		}
	}
	return mhp;
};
ui_stats.Enemy_Inv = function() {
	return +ui_utils.getStat('#o_hk_inventory_num .l_val','slashed',1) || 0;
};
ui_stats.EnemySingle_HP = function(enemy) {
	var a, b = document.querySelectorAll((ui_data.isMobile ? '.e_m_opps' : '#opps') + ' .opp_h, #bosses .opp_h');
	if (b[enemy-1] && (a = b[enemy-1].textContent.match(/^(.+?) \/ (.+?)$/))) {
		return +a[1] || 0;
	}
	return 0;
};
ui_stats.EnemySingle_MaxHP = function(enemy) {
	var a, b = document.querySelectorAll((ui_data.isMobile ? '.e_m_opps' : '#opps') + ' .opp_h, #bosses .opp_h');
	if (b[enemy-1] && (a = b[enemy-1].textContent.match(/^(.+?) \/ (.+?)$/))) {
		return +a[2] || 0;
	}
	return 0;
};
ui_stats.EnemySingle_Name = function(enemy) {
	var a, b = document.querySelectorAll((ui_data.isMobile ? '.e_m_opps' : '#opps') + ' .opp_n:not(.opp_ng), #bosses .opp_n:not(.opp_ng)');
	return b[enemy-1] && b[enemy-1].textContent || '';
};
ui_stats.EnemySingle_Godname = function(enemy) {
	var a = document.querySelectorAll((ui_data.isMobile ? '.e_m_opps' : '#bosses') + ' .opp_ng')[enemy - 1];
	return a ? a.textContent.replace(/\s*➤/, '').slice(1, -1) : ''; // enemies can be friends as well
};
ui_stats.Enemy_AbilitiesText = function() {
	var a = document.querySelector(ui_data.isMobile ? '.e_m_opps .opp_n.opp_ng span' : '#o_hk_gold_we + .line:not(#o_hk_death_count) .l_val');
	return a && a.textContent || '';
};
ui_stats.Enemy_AbilitiesCount = function() {
	var a = this.Enemy_AbilitiesText();
	return a && a.split(',').length || 0;
};
ui_stats.Enemy_HasAbility = function(ability) {
	return !!this.Enemy_AbilitiesText().match(new worker.RegExp(ability,'i')) || false;
};
ui_stats.Enemy_HasAbilityLoc = function(ability) {
	return this.Enemy_HasAbility(ability);
};
ui_stats.Enemy_Count = function() {
	var a, b = document.querySelectorAll((ui_data.isMobile ? '.e_m_opps' : '#opps') + ' .opp_h, #bosses .opp_h'),
		count = 0;
	for (var i = 0, len = b.length; i < len; i++) {
		if (!(a = b[i].textContent.match(/^(.+?) \/ (.+?)$/)) || +a[2] > 1) {
			count++;
		}
	}
	return count;
};
ui_stats.Enemy_AliveCount = function() {
	var a, b = document.querySelectorAll((ui_data.isMobile ? '.e_m_opps' : '#opps') + ' .opp_h, #bosses .opp_h'),
		alive = 0;
	for (var i = 0, len = b.length; i < len; i++) {
		if ((a = b[i].textContent.match(/^(.+?) \/ (.+?)$/)) && +a[2] > 1) {
			alive++;
		}
	}
	return alive;
};
ui_stats._equipLevel = function(idx) {
	return ui_utils.getStat('#eq_' + idx + ' .eq_level','num') || 0;
};
ui_stats.Equip1 = ui_stats._equipLevel.bind(null, '0');
ui_stats.Equip2 = ui_stats._equipLevel.bind(null, '1');
ui_stats.Equip3 = ui_stats._equipLevel.bind(null, '2');
ui_stats.Equip4 = ui_stats._equipLevel.bind(null, '3');
ui_stats.Equip5 = ui_stats._equipLevel.bind(null, '4');
ui_stats.Equip6 = ui_stats._equipLevel.bind(null, '5');
ui_stats.Equip7 = ui_stats._equipLevel.bind(null, '6');
ui_stats.Equip8 = function() {
	return document.getElementById('eq_7') ? true : false; // there's no level on Relic anyway
}
ui_stats._isEquipBold = function(idx) {
	var a = document.querySelector('#eq_' + idx + ' .eq_name');
	return !!(a && a.classList.contains('eq_b'));
};
ui_stats.Equip1_IsBold = ui_stats._isEquipBold.bind(null, '0');
ui_stats.Equip2_IsBold = ui_stats._isEquipBold.bind(null, '1');
ui_stats.Equip3_IsBold = ui_stats._isEquipBold.bind(null, '2');
ui_stats.Equip4_IsBold = ui_stats._isEquipBold.bind(null, '3');
ui_stats.Equip5_IsBold = ui_stats._isEquipBold.bind(null, '4');
ui_stats.Equip6_IsBold = ui_stats._isEquipBold.bind(null, '5');
ui_stats.Equip7_IsBold = ui_stats._isEquipBold.bind(null, '6');
ui_stats.Equip8_IsBold = ui_stats._isEquipBold.bind(null, '7');
ui_stats.Exp =
ui_stats.Map_Exp =
ui_stats.Hero_Exp = function() {
	return ui_utils.getStat('#hk_level .p_bar','titlenumre') || 0;
};
ui_stats.Godpower = function() {
	return ui_utils.getStat('#cntrl .gp_val','num') || 0;
};
ui_stats.Gold =
ui_stats.Map_Gold =
ui_stats.Hero_Gold = function() {
	return ui_utils.getStat('#hk_gold_we .l_val','numre') || 0;
};
ui_stats.Map_Alls_HP =
ui_stats.Hero_Alls_HP = function() {
	var a, b = document.querySelectorAll((ui_data.isMobile ? '.e_m_alls' : '#alls') + ' .opp_h'),
		hp = 0;
	for (var i = 0, len = b.length; i < len; i++) {
		if (a = b[i].textContent.match(/^(.+?) \/ (.+?)$/)) {
			hp += +a[1] || 0;
		}
	}
	return hp;
};
ui_stats.Map_Ally_HP =
ui_stats.Hero_Ally_HP = function(ally) {
	var a, b = document.querySelectorAll((ui_data.isMobile ? '.e_m_alls' : '#alls') + ' .opp_h');
	if (b[ally-1]) {
		if (a = b[ally-1].textContent.match(/^(.+?) \/ (.+?)$/)) {
			return +a[1] || 0;
		}
		if (a = b[ally-1].textContent.match(/(defeated|повержен)/)) {
			return 1;
		}
		if (a = b[ally-1].textContent.match(/(exited|evacuated|вышел|отбуксирован)/)) {
			return null;
		}
	}
	return 0;
};
ui_stats.Hero_Alls_MaxHP = function(notBosses) {
	var a, b = document.querySelectorAll((ui_data.isMobile ? '.e_m_alls' : '#alls') + ' .opp_h'),
		mhp = 0;
	for (var i = 0, len = b.length; i < len; i++) {
		if (notBosses && ui_stats.Hero_Ally_Name(i)[0] === '+') continue;
		if (a = b[i].textContent.match(/^(.+?) \/ (.+?)$/)) {
			mhp += +a[2] || 0;
		}
	}
	return mhp;
};
ui_stats.Map_Ally_MaxHP =
ui_stats.Hero_Ally_MaxHP = function(ally) {
	var a, b = document.querySelectorAll((ui_data.isMobile ? '.e_m_alls' : '#alls') + ' .opp_h');
	if (b[ally-1] && (a = b[ally-1].textContent.match(/^(.+?) \/ (.+?)$/))) {
		return +a[2] || 0;
	}
	return 0;
};
ui_stats.Hero_Alls_Count = function(notBosses) {
	var a = document.querySelectorAll((ui_data.isMobile ? '.e_m_alls' : '#alls') + ' .opp_n:not(.opp_ng)');
	if (notBosses) {
		return Array.from(a).filter(function(b) { return b.textContent[0] !== '+'; }).length;
	}
	return a.length;
};
ui_stats.Hero_Alls_AliveCount = function() {
	var a, b = document.querySelectorAll((ui_data.isMobile ? '.e_m_alls' : '#alls') + ' .opp_h'),
		alive = 0;
	for (var i = 0, len = b.length; i < len; i++) {
		if (a = b[i].textContent.match(/^(.+?) \/ (.+?)$/)) {
			alive++;
		}
	}
	return alive;
};
ui_stats.Hero_Alls_AliveMaxHP = function() {
	var a, b = document.querySelectorAll((ui_data.isMobile ? '.e_m_alls' : '#alls') + ' .opp_h'),
		mhp = 0;
	for (var i = 0, len = b.length; i < len; i++) {
		if (a = b[i].textContent.match(/^(.+?) \/ (.+?)$/)) {
			mhp += +a[2] || 0;
		}
	}
	return mhp;
};
ui_stats.Hero_Ally_Name = function(ally) {
	var a, b = document.querySelectorAll((ui_data.isMobile ? '.e_m_alls' : '#alls') + ' .opp_n:not(.opp_ng)');
	if (ui_data.isSail) {
		return b[ally-1] && b[ally-1].textContent.slice(3) || '';
	} else {
		return b[ally-1] && b[ally-1].textContent || '';
	}
};
ui_stats.Hero_Ally_Names = function() {
	return Array.from(document.querySelectorAll((ui_data.isMobile ? '.e_m_alls' : '#alls') + ' .opp_n:not(.opp_ng)'),
		ui_data.isSail ? function(a) { return a.textContent.slice(3); } : function(a) { return a.textContent; }
	);
};
ui_stats._HP_selector = function() {
	var selector = (ui_data.isMining ? '#hk_bhp' : '#hk_health')+' .l_val';
	if (ui_data.isMobile) {
		if (ui_data.isMining) {
			selector = '#statusbar .e_sb_boss_hp';
		} else if (ui_data.isSail) {
			selector = '#statusbar .e_sb_ark_hp';
		}
	}
	return selector;
}
ui_stats.HP =
ui_stats.Map_HP =
ui_stats.Hero_HP = function() {
	return +ui_utils.getStat(this._HP_selector(),'slashed',1) || 0;
};
ui_stats.Inv =
ui_stats.Map_Inv =
ui_stats.Hero_Inv = function() {
	return +ui_utils.getStat('#hk_inventory_num .l_val','slashed',1) || 0;
};
ui_stats.Invites = function() {
	return ui_utils.getStat(ui_data.isMobile ? '.e_m_friends .fsearchbar + .line' : '#invites .block_title','numre') || 0;
};
ui_stats.Map_Supplies = function() {
	return +ui_utils.getStat(ui_data.isMobile ? '#statusbar .e_sb_ark_supplies' : '#hk_water .l_val','slashed',1) || 0;
};
ui_stats.Map_MaxSupplies = function() {
	return +ui_utils.getStat(ui_data.isMobile ? '#statusbar .e_sb_ark_supplies' : '#hk_water .l_val','slashed',2) || 0;
};
ui_stats.Lab_F = function() {
	var a = parseInt(ui_utils.getStat('.bps_mf .l_val','pointed',2));
	return !isNaN(a) ? a : null;
};
ui_stats.Lab_M = function() {
	var a = parseInt(ui_utils.getStat('.bps_mf .l_val','pointed',1));
	return !isNaN(a) ? a : null;
};
ui_stats.Level =
ui_stats.Map_Level = function() {
	return ui_utils.getStat('#hk_level .l_val','num') || 0;
};
ui_stats.Logs = function() {
	return ui_utils.getStat('#hk_wood .l_val','dec') * 10 || 0;
};
ui_stats.Max_Godpower = function() {
	return ui_data.hasShop ? 200 : 100;
};
ui_stats.Max_HP = function() {
	return +ui_utils.getStat(this._HP_selector(),'slashed',2) || 0;
};
ui_stats.Max_Inv = function() {
	return +ui_utils.getStat('#hk_inventory_num .l_val','slashed',2) || 0;
};
ui_stats.Monster = function() {
	return ui_utils.getStat('#hk_monsters_killed .l_val','num') || 0;
};
ui_stats.Pet_Level = function() {
	var a = document.querySelector('#hk_pet_class + div .l_val');
	return (a && a.parentNode.style.display !== 'none' && parseInt(a.textContent)) || 0;
};
ui_stats.Pet_NameType = function() {
	var b = document.querySelector('#hk_pet_class .l_val');
	if (!b || b.parentNode.style.display === 'none') {
		return ':';
	}
	var pName = ui_utils.getStat('#hk_pet_name .l_val','text') || '',
		pType = b.textContent;
	return (pName.match(/^(.*?)(\ «.+»)?(\ “.+”)?(\ ❌)?$/) || [null,''])[1] + ':' + pType;
};
ui_stats.Push_Readiness = function() {
	return ui_utils.getStat(ui_data.isMobile ? '#statusbar .e_sb_boss_push' : '#hk_bls .l_val','num') || 0;
};
ui_stats.Relics = function() {
	return Math.round(ui_utils.getStat('#hk_rl .l_val','dec') * 30) || 0;
};
ui_stats.Relics_Examined = function() {
	var a = ui_utils.getStat((ui_data.isMobile ? '.e_m_shop' : '#trader') + ' .line:nth-of-type(6)', 'text');
	return a && +(a.match(/\d+\+(\d+)/) || '')[1] || 0;
};
ui_stats.Souls = function() {
	return Math.round(ui_utils.getStat('#hk_sl .l_val','dec') * 50) || 0;
};
ui_stats.Souls_Processed = function() {
	return ui_utils.getStat('#sl_popover_c .bps_mf .l_val','num') || 0;
};
ui_stats.Souls_Collected = function() {
	return ui_utils.getStat('#sl_popover_c .sl_cnt .l_val','num') || 0;
};
ui_stats.Task = function() {
	return ui_utils.getStat('#hk_quests_completed .p_bar','titlenumre') || 0;
};
ui_stats.Task_Name_Full = function() {
	return (ui_utils.getStat('#hk_quests_completed .q_name','text') || '');
};
ui_stats.Task_Name = function() {
	return this.Task_Name_Full().replace(/ \[[^\]]+\]$/g, '');
};
ui_stats.Task_Reward = function() {
	return (this.Task_Name_Full().match(/ \[(?:дадут|reward:)? ?(.+?)(?: не дадут)?\]$/) || '')[1] || '';
};
ui_stats.Task_Number = function() {
	return +(ui_utils.getStat('#hk_quests_completed .l_val','text') || '').slice(1) || 0;
};
ui_stats.Side_Job = function() {
	var a = document.querySelector('#hk_quests_completed + .line .p_bar');
	return (a && (!ui_utils.isHidden(a) || ui_data.isMobile && a.parentNode.style.display !== 'none') && ui_utils.parseStat(a, 'titlenumre')) || 0;
};
ui_stats.Side_Job_Name = function() {
	var a = document.querySelector('#hk_quests_completed + .line .q_name');
	return (a && (!ui_utils.isHidden(a) || ui_data.isMobile && a.parentNode.style.display !== 'none') && a.textContent) || '';
};
ui_stats.Side_Job_Duration = function() {
	var m = /(\d+):(\d+)/.exec(ui_utils.getStat('#hk_quests_completed + .line .l_val','text') || '');
	return m ? +m[1] * 3600 + +m[2] * 60 : 0;
};
ui_stats.Side_Job_Requirements = function(title) {
	var a = title || this.Side_Job_Name();
	return +(/\d+/.exec(a) || '')[0] || (/дважды|twice/.test(a) ? 2 : 0);
};
ui_stats.Trader_Exp = function() {
	return ui_utils.getStat('#hk_t_level .p_bar','titlenumre') || 0;
};
ui_stats.Trader_Level = function() {
	return ui_utils.getStat('#hk_t_level .l_val','num') || 0;
};
ui_stats.Savings = function() {
	var a, b = ui_utils.getStat('#hk_retirement .l_val','text') || '';
	if (a = b.match(/^((\d+)M,? ?)?(\d+)?k?$/i)) {
		return 1000 * (a[2] || 0) + 1 * (a[3] || 0)
	} else {
		return parseInt(b) || 0;
	}
};
ui_stats._upProgressParser = function(str, idx) {
	var a = document.querySelectorAll('#upgrades .l_capt'),
		b = new RegExp(str);
	for (var i = 0, j = 0, len = a.length; i < len; i++) {
		if (b.test(a[i].textContent)) {
			if (idx && j !== idx) {
				j++;
				continue;
			}
			return ui_utils.parseStat(a[i].parentNode.lastElementChild, 'titlenumre') || 0;
		}
	}
	return 0;
}
ui_stats.Up_Retroscope = function() {
	return this._upProgressParser('Ретроскоп|Hindsighter');
};
ui_stats.Up_Cryochamber = function() {
	return this._upProgressParser('Криокамера|Cryopod');
};
ui_stats.Up_Forecast_Suppressor = function() {
	return this._upProgressParser('Печатня|forecast'); // currently doesn't exist in english version
};
ui_stats.Up_Temple_Tower_N = function(idx) {
	return this._upProgressParser('ярус храмовой башни|Tier of Temple Tower', idx);
};
for (var i = 1; i <= 7; i++) {
	ui_stats['Up_Temple_Tower' + (i > 1 ? ('_' + i) : '')] = ui_stats.Up_Temple_Tower_N.bind(ui_stats, i - 1);
}
ui_stats.auraName = function() {
	var a, b = document.getElementById('hk_distance');
	if (b && (b = b.previousSibling) && (!ui_utils.isHidden(b) || ui_data.isMobile && b.style.display !== 'none') && (a = /^(?:Аура|Aura)(.*?) \(.*?\)$/.exec(b.textContent))) {
		return a[1] || ''
	}
	return '';
};
ui_stats.auraDuration = function() {
	var a, b = document.getElementById('hk_distance');
	if (b && b.previousSibling && (a = b.previousSibling.textContent.match(/^(Аура|Aura).*?\((\d+):(\d+)\)$/))) {
		return (parseInt(a[2]) * 3600 + parseInt(a[3]) * 60) || 0;
	}
	return 0;
};
ui_stats.currentStep = function() {
	var a, b = ui_data.isMobile ? document.getElementsByClassName('e_mt_fight_log')[0] : (document.getElementById('m_fight_log') || document.getElementById('r_map'));
	return b && (b = (ui_data.isMobile ? (ui_data.isMining ? b : b.getElementsByClassName('l_header')[0]) : b.getElementsByTagName('h2')[0])) && (a = /\((?:шаг|step) (\d+)\)$/.exec(b.textContent)) ? +a[1] : 0;
};
ui_stats.currentStepText = function() {
	var i, len, a = Array.from(document.querySelectorAll((ui_data.isMobile ? '.e_m_fight_log' : '#m_fight_log') + ' .d_msg')),
		b = document.querySelector('#m_fight_log .sort_ch');
	if (b && b.textContent === '▲') {
		b = true;
		a.reverse();
	} else {
		b = false;
	}
	for (i = 0, len = a.length; i < len; i++) {
		if (a[i].parentNode.classList.contains('turn_separator' + (b ? '_inv' : ''))) break;
	}
	return a.slice(0,i+1).map(function(c) { return c.textContent; }).join('\n');
}
ui_stats.cargo = function() {
	return ui_utils.getStat(ui_data.isMobile ? '#statusbar .e_sb_ark_cargo' : '#hk_cargo .l_val', 'text') || '';
};
ui_stats.charName = function() {
	if (ui_data.isSail && !ui_data.isMobile) {
		if (this._sailCharName) {
			return this._sailCharName;
		}
		var n, pt = document.querySelector('.dir_arrow');
		if (pt && (n = pt.classList.toString().match(/pl(\d)/))) {
			var a = document.querySelectorAll((ui_data.isMobile ? '.e_m_alls' : '#alls') + ' .opp_n:not(.opp_ng)');
			if (a[+n[1]-1] && a[+n[1]-1].textContent.slice(3)) {
				this._sailCharName = a[+n[1]-1].textContent.slice(3);
				return this._sailCharName;
			}
		}
	}
	// note: if the user opens a datamine when their localStorage is empty (i.e., they've just installed
	// the extension or reset its settings), we will not be able to detect hero's name
	return ui_utils.getStat('#hk_name .l_val','text') || ui_storage.get('charName') || '';
};
ui_stats.inShop = function() {
	var inShop = document.querySelectorAll((ui_data.isMobile ? '.e_m_shop' : '#trader') + ' .line a');
	return inShop[1] && inShop[1].parentNode.style.display !== 'none' && /Покинуть|Leave/.test(inShop[1].textContent) || false;
};
ui_stats.checkShop = function() {
	var a = document.querySelector(ui_data.isMobile ? '.e_m_shop' : '#trader > .block_content');
	return !!(a && a.firstChild);
};
ui_stats.pendingShop = function() {
	var a = document.querySelector('#hk_t_level + div');
	return !!(a && /применения команды|will be processed/.test(a.textContent));
};
ui_stats.checkLab = function() {
	return ['Лаборатория','Lab'].includes((document.querySelector('#hk_distance ~ .line') || '').textContent);
};
ui_stats.checkDungeonForge = function() {
	return ['Творительная','Dungeon Forge'].includes((document.querySelector('#hk_distance ~ .line ~ .line') || '').textContent);
};
ui_stats.fightType = function() {
	if (this.isFight()) {
		var mfl = document.querySelector(ui_data.isMobile ? '.e_mt_fight_log .l_header' : '#m_fight_log h2');
		if (document.getElementById('map') && document.getElementById('map').style.display !== 'none' || ui_data.isMobile && document.getElementById('dmap_icon')) {
			return 'dungeon';
		} else if (document.getElementById('s_map') && document.getElementById('s_map').style.display !== 'none' || ui_data.isMobile && document.getElementById('map_wrap')) {
			return 'sail';
		} else if (document.getElementById('r_map') && document.getElementById('r_map').style.display !== 'none' || ui_data.isMobile && document.getElementsByClassName('wrmap')[0]) {
			return 'mining';
		} else if (mfl && /Тренировочный бой|Sparring Chronicle/.test(mfl.textContent)) {
			return 'spar';
		} else if (mfl && /Вести с арены|Arena Journal/.test(mfl.textContent)) {
			return 'arena';
		} else if (this.Enemy_Godname().length > 0) {
			return 'player';
		} else if (this.Hero_Alls_Count() === 0 && this.Enemy_Count() > 1) {
			return 'multi_monster';
		} else {
			return 'monster';
		}
	}
	return '';
};
ui_stats.godName = function() {
	var result, a, b = ui_utils.getStat('#hk_name a, #hk_godname a','href') || '';
	if (a = b.match(/\/([^\/]+)$/)) {
		result = decodeURIComponent(a[1]) || '';
	}
	if (!result) {
		if (a = ui_data.docTitle.match(/(?:\((?:\d+)?[!@~\+]\) )?(.*?)(?: и е(го|ё) геро| and h(is|er) hero)/)) {
			return a[1].trim();
		}
		return GUIp.common.getCurrentGodname();
	}
	return result;
};
ui_stats.guildName = function() {
	return ui_utils.getStat('#hk_clan a','text') || '';
};
ui_stats.goldTextLength = function() {
	return (ui_utils.getStat('#hk_gold_we .l_val','text') || '').length;
};
ui_stats.hasArk = function() {
	return this.Logs() >= 1000;
};
ui_stats.hasTemple = function() {
	return this.Bricks() === 1000;
}
ui_stats.heroHasPet = function() {
	var a = document.querySelector('#hk_pet_class .l_val');
	return !!(a && a.parentNode.style.display !== 'none' && a.textContent);
};
ui_stats._isActivityAvailable = function(selector) {
	var a = document.querySelector(selector);
	return !!a && a.classList.contains('div_link') && a.parentNode.style.display !== 'none';
};
ui_stats.isArenaAvailable   = ui_stats._isActivityAvailable.bind(ui_stats, '.arena_link_wrap a');
ui_stats.isSparAvailable    = ui_stats._isActivityAvailable.bind(ui_stats, '.e_challenge_button a');
ui_stats.isDungeonAvailable = ui_stats._isActivityAvailable.bind(ui_stats, '.e_dungeon_button a');
ui_stats.isSailAvailable    = ui_stats._isActivityAvailable.bind(ui_stats, '.e_sail_button a');
ui_stats.isMiningAvailable    = ui_stats._isActivityAvailable.bind(ui_stats, '.e_mining_button a');
ui_stats.isFight = function() {
	return /^\((\d+)?[!@~\+]\) /.test(ui_data.docTitle);
};
ui_stats.isBossFight = function() {
	return this.fightType() === 'monster';
};
ui_stats.isDungeon = function() {
	return this.fightType() === 'dungeon';
};
ui_stats.isSail = function() {
	return this.fightType() === 'sail';
};
ui_stats.isMining = function() {
	return this.fightType() === 'mining';
};
ui_stats.isMale = function() {
	return !/героиня|heroine/i.test((document.querySelector('#stats h2, #m_info h2') || '').textContent + ui_data.docTitle);
};
ui_stats.isBlessed = function() {
	var a = document.querySelector('.e_bless > .line');
	return a && !!a.textContent.length;
};
ui_stats.isGoingBack = function() {
	return /до столицы|to Pass/i.test(ui_utils.getStat('#hk_distance .l_capt','text') || '');
};
ui_stats.lastDiaryItems = function() {
	var a = Array.from(document.querySelectorAll('#diary .d_msg, .e_m_diary .d_msg')),
		b = document.querySelector('#diary .sort_ch');
	if (b && b.textContent === '▲') {
		a.reverse();
	}
	return a;
};
ui_stats.lastDiaryRealEntry = function(skip, skipInfl) {
	var a = ui_stats.lastDiaryItems();
	skip >>= 0;
	for (var i = 0, j = 0, len = a.length; i < len; i++) {
		if (a[i].textContent.includes('☣')) {
			this._lastDiaryVoice = a[i].textContent.replace(/ \([^(]+\)$/,'');
			continue;
		}
		if (this._lastDiaryVoice === a[i].textContent || (skipInfl && a[i].classList.contains('m_infl'))) {
			continue;
		}
		if (skip === j) {
			return a[i];
		}
		j++;
	}
	return null;
};
ui_stats.lastDiaryIsInfl = function(skip) {
	var a = ui_stats.lastDiaryRealEntry(skip);
	return a && a.classList.contains('m_infl') || false;
};
ui_stats.lastDiary = function() {
	return ui_stats.lastDiaryItems().map(function(a) { return a.textContent; });
};
ui_stats.lastNews = function() {
	return ui_utils.getStat('.f_news.line','text') || '';
};
ui_stats.logId = function() {
	var a, b = ui_utils.getStat('#fbclink','href') || '';
	if (!b.endsWith('/superhero') && (a = b.match(/\/([^\/\?]+)(\?.+)?$/))) {
		return decodeURIComponent(a[1]) || '';
	}
	return '';
};
ui_stats.locationAnomaly = function() {
	var loc, locs = document.querySelectorAll('#hmap_svg .loc_segment'),
		ms = this.mileStones(),
		tmp, re = /loc_segment_(\d+)_(\d+)$/;
	loc = Array.prototype.find.call(locs, function(a) {
		if ((tmp = re.exec(a.id)) && ms >= +tmp[1] && ms <= +tmp[2]) {
			return true;
		}
		return false;
	});
	if (loc) {
		if (loc.classList.contains('loc_known') && (tmp = /\n(.*?)$/.exec(loc.firstElementChild.textContent))) {
			return tmp[1];
		}
		return '?';
	}
	return '';
};
ui_stats.mileStones = function() {
	return ui_utils.getStat('#hk_distance .l_val','num') || ui_utils.getStat('#hmap_svg g.loc_dir + title, #hmap_svg g.sl title','numre') || 0;
};
ui_stats.monsterName = function() {
	var a = document.querySelector('#news_pb .line .l_val');
	return (a && a.parentNode.style.display !== 'none' && a.textContent || '').replace(/^(?:(?:🧱|🩹|🔨|💰|💠|🎬|🧿|📌|📦)  ?)+/, ''); // remove all kindergarten-level badges; note possible two spaces here (likely due to a bug)
};
ui_stats.canonicalMonsterName = function(name) {
	return (name != null ? name : ui_stats.monsterName()).replace(/^(?:(?:\uD83E\uDDB4|☠|WANTED) )+/, ''); // bone, skull
};
ui_stats.monsterLoot = function() {
	var a = document.querySelector('#news_pb .monster_d');
	return a && a.parentNode.style.display !== 'none' && a.textContent && (a = a.textContent.match(/^\((?:has|carries|тащит|несёт) (?:(?:(?:an?|the|some) )?(.*?))(?:(?: and | и )?(\d+ (?:coins|монет.?)?))?\)$/)) && a[1] !== 'мертвечиной' && [a[1],a[2]] || [];
};
ui_stats.monsterTrophy = function() {
	return this.monsterLoot()[0] || '';
};
ui_stats.monsterGold = function() {
	return parseInt(this.monsterLoot()[1]) || 0;
};
ui_stats.nearbyTown = function() {
	var a = (ui_utils.getStat('#hk_distance .l_val','title') || '').match(/: (.+?)(?: \(.*?\))?$/);
	return a && a[1] || '';
};
ui_stats.poiMileStones = function(dir) {
	var a = document.querySelectorAll('#hmap_svg g.poi title'),
		c = ui_stats.mileStones();
	if (a.length) {
		a = Array.from(a, function(b) { return +(b.textContent.match(/(\d+)/) || '')[1]; });
		this._poiMileStonesCached = a;
	} else if (this._poiMileStonesCached) {
		if (!document.querySelector('#hmap_svg g:not(.poi):not(.tl):not([style$="none;"]) title')) {
			a = this._poiMileStonesCached;
		} else {
			delete this._poiMileStonesCached;
		}
	}
	if (a.length > 1) {
		a.sort(function(d,e) { return Math.abs(c - d) - Math.abs(c - e);});
	}
	if (a.length && dir) {
		a = a.filter(function(b) {
			return (dir > 0) ? (b > c) : (b < c);
		});
	}
	return a[0] || Infinity;
};
ui_stats.poiDistance = function() {
	return ui_stats.poiMileStones() - ui_stats.mileStones();
};
ui_stats.selTownMileStones = function() {
	return document.querySelector('#hmap_svg g.e_selected_town') ? ui_utils.getStat('#hmap_svg g.e_selected_town title','numre') : Infinity;
};
ui_stats.selTownDistance = function() {
	return ui_stats.selTownMileStones() - ui_stats.mileStones();
};
ui_stats.returningToTown = function() {
	var a = document.querySelector('#hmap_svg g.tl circle[stroke-dasharray]'),
		b = a && a.previousElementSibling && /^(.*?) \(\d+\)/.exec(a.previousElementSibling.textContent);
	return b && b[1] || '';
};
ui_stats.petIsKnockedOut = function() {
	return (ui_utils.getStat('#hk_pet_name .l_val','text') || '').endsWith(' ❌');
};
ui_stats.heroState = function() {
	var a = document.getElementsByClassName('e_hero_state')[0];
	return a && a.dataset.state || 'unknown';
};
ui_stats.heroStateText = function() {
	var a = document.getElementsByClassName('e_hero_state')[0];
	return a && a.textContent || '';
};
ui_stats.mProgress = function() {
	var a = ui_utils.getStat('#news_pb .p_bar.monster_pb','title');
	return a && parseInt((a.match(/ (?:—|-) (\d+)%/) || [])[1]) || 0;

};
ui_stats.sProgress = function() {
	var a = ui_utils.getStat('#news_pb .p_bar.n_pbar','title');
	return a && parseInt((a.match(/ (?:—|-) (\d+)%/) || [])[1]) || 0;
};
ui_stats.progressDiff = function() {
	return Math.abs(ui_stats.sProgress() - ui_stats.Task());
};
ui_stats.sendDelay = function(text) {
	var nodes = document.querySelectorAll('#cntrl2 div.arena_msg'),
		sendToDesc, sendToStr, m;
	for (var i = 0, len = nodes.length; i < len; i++) {
		sendToDesc = nodes[i];
		sendToStr = sendToDesc.textContent;
		if (text.test(sendToStr)) {
			if (sendToDesc.style.display !== 'none' && (m = /(?:(\d+)\s*[чh]\s+)?(\d+)\s*(?:мин|m)/.exec(sendToStr))) {
				return ((+m[1] || 0) * 60 + +m[2]) * 60;
			}
			return 0;
		}
	}
	return 0;
};
ui_stats.sendDelayArena = function() { return this.sendDelay(/Арена откроется через|Arena available in/); };
ui_stats.sendDelayDungeon = function() { return this.sendDelay(/Подземелье откроется через|Dungeon available in/); };
ui_stats.sendDelaySail = function() { return this.sendDelay(/Отплыть можно через|Sail available in/); };
ui_stats.sendDelaySpar = function() { return this.sendDelay(/Тренировка через|Sparring available in/); };
ui_stats.sendDelayMine = function() { return this.sendDelay(/Босс освободится через|Boss ready in/); };
ui_stats.storedPets = function() {
	return ui_data.storedPets || [];
};
ui_stats.townName = function() {
	var a = ui_utils.getStat('#hk_distance .l_val','text') || '';
	return isNaN(parseInt(a)) && a || '';
};
ui_stats.chosenMonster = function() {
	var monster = ui_stats.monsterName();
	if (monster && ui_words.base.chosen_monsters.length && (new worker.RegExp(ui_words.base.chosen_monsters.join('|'),'i')).test(monster)) {
		return true;
	}
	return false;
};
ui_stats.soulMonster = function() {
	var a = document.querySelector('#news_pb .line .l_val');
	return !!a && a.parentNode.style.display !== 'none' && a.textContent.startsWith('☥ ');
};
ui_stats.specialMonster = function() {
	var monster = ui_stats.monsterName();
	if (monster && ui_words.base.special_monsters.length && (new worker.RegExp(ui_words.base.special_monsters.join('|'),'i')).test(monster)) {
		return true;
	}
	return false;
};
ui_stats.strongMonster = function() {
	var a = document.querySelector('#news_pb .line .l_val');
	return !!a && a.parentNode.style.display !== 'none' && a.classList.contains('bold');
};
ui_stats.tamableMonster = function() {
	var monster = ui_stats.monsterName();
	return (
		monster.includes('\uD83E\uDDB4') && // bone
		!ui_stats.heroHasPet() &&
		!ui_stats.storedPets().includes(ui_stats.canonicalMonsterName(monster).toLowerCase())
	);
};
ui_stats.wantedMonster = function() {
	return /(?:☠|WANTED) /.test(ui_stats.monsterName());
};
ui_stats._calcBossMaxDamage = function(abilitiesCount, teamSize, teamHP) {
	var lim = 102,
		k = 16.5;
	if (teamSize !== 5) {
		if (teamSize === 4) {
			// lim = 102;
			k = 13.5;
		} else if (teamSize >= 6) {
			lim = 111;
			k = 18.5;
		} else {
			lim = 91;
			k = 10.5;
		}
	}
	teamHP -= (408 + (abilitiesCount << 4)) * teamSize;
	return teamHP >= 0 ? lim : lim + teamHP / k;
};
ui_stats._applyAbilityModifiers = function(dmg, abilities, heroMaxHP) {
	var miniDmg = 0;
	if (/зовущий|summoning/i.test(abilities)) {
		if (ui_stats.EnemySingle_HP(2) > 0) { // in case secondary boss is present and alive
			miniDmg = dmg * 0.3;
		}
		if (ui_stats.EnemySingle_HP(1) < 1) { // in case primary boss is dead
			dmg = 0;
		}
	}
	if (/бойкий|nimble/i.test(abilities)) {
		dmg *= 1.9; // nimble boss can cause almost double damage, but it would be very rarely exactly doubled
	}
	if (/спешащий|scurrying/i.test(abilities)) {
		dmg += heroMaxHP * 0.05; // heroes can hurt themselves
	}
	return dmg + miniDmg;
};
ui_stats.lowHealth = function(location) {
	var step, hp = ui_stats.HP();
	switch (location) {
		case 'dungeon':
			return hp < 130 && hp > 1;
		case 'sail':
			// ark health level should be actually checked only when the ark is on the map since it is getting changed
			// to hero's health level when exiting sailing mode, possibly leading to false triggering
			if (ui_improver.islandsMap.manager && ui_improver.islandsMap.manager.model.arks[ui_improver.islandsMap.ownArk] !== 0x8080) {
				return hp < 25 && hp > 0;
			}
			return false;
		case 'fight':
			if (ui_stats.Enemy_HP() <= 0) {
				return false; // the fight is over, no need to worry any more
			}
			var healthLim = 0,
				heroMaxHP = ui_stats.Max_HP(),
				enemyHP = ui_stats.EnemySingle_HP(1),
				alliesCount = ui_stats.Hero_Alls_Count(true),
				bossAbilities = '';
			if (ui_stats.fightType() === 'multi_monster') { // corovan
				healthLim = heroMaxHP * 0.05 * ui_stats.Enemy_AliveCount();
			} else if (!alliesCount) { // single enemy
				healthLim = heroMaxHP * 0.15;
			} else { // raid boss or dungeon boss
				bossAbilities = ui_stats.Enemy_AbilitiesText();
				healthLim = ui_stats._applyAbilityModifiers(
					ui_stats._calcBossMaxDamage(
						bossAbilities.split(',').length,
						alliesCount + 1,
						(ui_improver.allsHP.sum || ui_stats.Hero_Alls_MaxHP(true)) + heroMaxHP
					),
					bossAbilities,
					heroMaxHP
				);
			}
			if ((step = this.currentStep()) > 60) { // damage increases in long fights
				healthLim *= (step - 60) * 0.02 + 1;
			}
			if (/взрывной|explosive/i.test(bossAbilities) && enemyHP > 0 && enemyHP < ui_stats.EnemySingle_MaxHP(1) * 0.3) {
				// however, damage from the explosion does not increase
				healthLim = Math.max(healthLim, heroMaxHP * 0.29);
			}
			return hp < healthLim + 2 && hp > 1;
	}
	return false;
};
// ui_logger
var ui_logger = worker.GUIp.logger = {};

ui_logger.create = function() {
	var menuBar = document.getElementById(ui_data.isMobile ? 'statusbar' : 'menu_bar'), html;
	this.updating = false;
	menuBar.insertAdjacentHTML(ui_data.isMobile ? 'beforeend' : 'afterend',
		'<ul id="logger"' + (worker.GUIp_browser === 'Firefox' ? ' style="mask: url(#fader_masking);"' : '') +
		'>\u200B</ul>' // zero-width space
	);
	this.bar = document.getElementById('logger');
	ui_storage.addImmediateListener('Option:disableLogger', function(newValue) {
		ui_logger.disabled = newValue === 'true';
		ui_utils.hideElem(ui_logger.bar, ui_logger.disabled);
	});
	GUIp.common.tooltips.watchSubtree(this.bar);
	this.need_separator = false;
	// arguments to ui_logger._watchStatsValue
	this.dungeonWatchers = [
		['Map_HP', 'hp', worker.GUIp_i18n.hero_health, 'hp'],
		['Map_Alls_HP', 'a:hp', worker.GUIp_i18n.allies_health, 'allies'],
		['Map_Exp', 'exp', worker.GUIp_i18n.exp, 'exp'],
		['Map_Level', 'lvl', worker.GUIp_i18n.level, 'level'],
		['Map_Inv', 'inv', worker.GUIp_i18n.inventory, 'inv'],
		['Map_Gold', 'gld', worker.GUIp_i18n.gold, 'gold'],
		['Map_Charges', 'ch', worker.GUIp_i18n.charges, 'charges']
	];
	this.battleWatchers = [
		['Hero_HP', 'h:hp', worker.GUIp_i18n.hero_health, 'hp'],
		['Enemy_HP', 'e:hp', worker.GUIp_i18n.enemy_health, 'enemies'],
		['Hero_Alls_HP', 'a:hp', worker.GUIp_i18n.allies_health, 'allies'],
		['Hero_Inv', 'h:inv', worker.GUIp_i18n.inventory, 'inv'],
		['Hero_Gold', 'h:gld', worker.GUIp_i18n.gold, 'gold'],
		['Hero_Charges', 'ch', worker.GUIp_i18n.charges, 'charges'],
		['Enemy_Gold', 'e:gld', worker.GUIp_i18n.gold, 'monster'],
		['Enemy_Inv', 'e:inv', worker.GUIp_i18n.inventory, 'monster']
	];
	this.sailWatchers = [
		['Map_HP', 'hp', worker.GUIp_i18n.hero_health, 'hp'],
		['Enemy_HP', 'e:hp', worker.GUIp_i18n.enemy_health, 'enemies'],
		['Map_Alls_HP', 'a:hp', worker.GUIp_i18n.allies_health, 'allies'],
		['Map_Supplies', 'spl', worker.GUIp_i18n.supplies, 'supplies'],
		['Map_Charges', 'ch', worker.GUIp_i18n.charges, 'charges']
	];
	this.miningWatchers = [
		['Hero_HP', 'hp', worker.GUIp_i18n.boss_health, 'hp'],
		['Enemy_HP', 'e:hp', worker.GUIp_i18n.enemy_health, 'enemies'],
		['Map_Charges', 'ch', worker.GUIp_i18n.charges, 'charges'],
		['Bits', 'bits', worker.GUIp_i18n.bits, 'bits'],
		['Bytes', 'bytes', worker.GUIp_i18n.bytes, 'bytes'],
		['Push_Readiness', 'psh', worker.GUIp_i18n.push_ready, 'push']
	];
	this.shopWatchers = [
		['HP', 'hp', worker.GUIp_i18n.health],
		['Charges', 'ch', worker.GUIp_i18n.charges],
		['Logs', 'wd', worker.GUIp_i18n.logs],
		['Side_Job', 'x:tsk', worker.GUIp_i18n.side_job],
		['Relics', 'rl', worker.GUIp_i18n.relics, 'relics'],
		['Hero_Inv', 'tr:inv', worker.GUIp_i18n.inventory, 'inv'],
		['Hero_Gold', 'tr:gld', worker.GUIp_i18n.gold, 'gold'],
		['Trader_Exp', 'tr:exp', worker.GUIp_i18n.trader_exp, 'trader_exp'],
		['Trader_Level', 'tr:lvl', worker.GUIp_i18n.trader_level, 'trader_level']
	];
	this.labWatchers = [
		['Lab_M', 'lab:m', worker.GUIp_i18n.ark_creatures, 'toek_m'],
		['Lab_F', 'lab:f', worker.GUIp_i18n.ark_creatures, 'toek_f'],
	];
	this.forgeWatchers = [
		['Forge_Exp', 'df:exp', worker.GUIp_i18n.forge_exp, 'forge_exp'],
		['Forge_Rank', 'df:rank', worker.GUIp_i18n.forge_rank, 'forge_rank'],
		['Forge_Bytes', 'df:bytes', worker.GUIp_i18n.forge_bytes, 'forge_b'],
		['Forge_Words', 'df:words', worker.GUIp_i18n.forge_words, 'forge_w'],
	];
	this.refineryWatchers = [
		['Souls_Processed', 'sl:prc', worker.GUIp_i18n.souls_prc, 'souls_prc'],
		['Souls_Collected', 'sl:cnt', worker.GUIp_i18n.souls_cnt, 'souls_cnt']
	];
	this.upgraderWatchers = [
		['Up_Retroscope', 'up:rsc', worker.GUIp_i18n.up_rsc, 'up_rsc'],
		['Up_Cryochamber', 'up:cch', worker.GUIp_i18n.up_cch, 'up_cch'],
		['Up_Forecast_Suppressor', 'up:fcs', worker.GUIp_i18n.up_fcs, 'up_fcs'],
		['Up_Temple_Tower', 'up:ttw', worker.GUIp_i18n.up_ttw, 'up_ttw']
	];
	for (var i = 2; i <= 7; i++) {
		this.upgraderWatchers.push(['Up_Temple_Tower_' + i, 'up:ttw:' + i, worker.GUIp_i18n.up_ttw + ' (' + ['II','III','IV','V','VI','VII'][i - 2] + ')', 'up_ttw']);
	}
	this.fieldWatchers = [
		['Exp', 'exp', worker.GUIp_i18n.exp],
		['Level', 'lvl', worker.GUIp_i18n.level],
		['HP', 'hp', worker.GUIp_i18n.health],
		['Charges', 'ch', worker.GUIp_i18n.charges],
		['Task', 'tsk', worker.GUIp_i18n.task],
		['Side_Job', 'x:tsk', worker.GUIp_i18n.side_job],
		['Monster', 'mns', worker.GUIp_i18n.monsters],
		['Inv', 'inv', worker.GUIp_i18n.inventory],
		['Gold', 'gld', worker.GUIp_i18n.gold],
		['Bricks', 'br', worker.GUIp_i18n.bricks],
		['Logs', 'wd', worker.GUIp_i18n.logs],
		['Savings', 'rtr', worker.GUIp_i18n.savings],
		['Equip1', 'eq1', worker.GUIp_i18n.weapon, 'equip'],
		['Equip2', 'eq2', worker.GUIp_i18n.shield, 'equip'],
		['Equip3', 'eq3', worker.GUIp_i18n.head, 'equip'],
		['Equip4', 'eq4', worker.GUIp_i18n.body, 'equip'],
		['Equip5', 'eq5', worker.GUIp_i18n.arms, 'equip'],
		['Equip6', 'eq6', worker.GUIp_i18n.legs, 'equip'],
		['Equip7', 'eq7', worker.GUIp_i18n.talisman, 'equip'],
		['Equip8', 'eq8', worker.GUIp_i18n.relic, 'equip'],
		['Death', 'death', worker.GUIp_i18n.death_count],
		['Pet_Level', 'pet:lvl', worker.GUIp_i18n.pet_level, 'pet'],
		['Ark_M', 'ark:m', worker.GUIp_i18n.ark_creatures, 'toek_m'],
		['Ark_F', 'ark:f', worker.GUIp_i18n.ark_creatures, 'toek_f'],
		['Book_Bytes', 'b:bytes', worker.GUIp_i18n.book_bytes, 'book_b'],
		['Book_Words', 'b:words', worker.GUIp_i18n.book_words, 'book_w'],
		['Souls', 'sl', worker.GUIp_i18n.souls, 'souls'],
		['Relics', 'rl', worker.GUIp_i18n.relics, 'relics'],
		['Trader_Exp', 'tr:exp', worker.GUIp_i18n.trader_exp, 'exp'],
		['Trader_Level', 'tr:lvl', worker.GUIp_i18n.trader_level, 'level'],
		['Invites', 'stub'],
		['Relics_Examined', 'stub']
	];
	this.commonWatchers = [
		['Godpower', 'gp', worker.GUIp_i18n.godpower]
	];

	this._htmlStorageKey = 'Logger:HTML:' + (
		ui_data.isDungeon ? 'Dungeon' : ui_data.isSail ? 'Sail' : ui_data.isMining ? 'Mining' : ui_data.isFight ? 'Fight' : 'Field'
	);
	// forget data when leaving fight mode
	if (this._htmlStorageKey !== 'Logger:HTML:Fight') {
		ui_storage.remove('Logger:HTML:Fight');
		if (this._htmlStorageKey !== 'Logger:HTML:Dungeon') {
			ui_storage.remove('Logger:HTML:Dungeon');
		}
	}
	if (this._htmlStorageKey !== 'Logger:HTML:Sail') {
		ui_storage.remove('Logger:HTML:Sail');
	}
	if (this._htmlStorageKey !== 'Logger:HTML:Mining') {
		ui_storage.remove('Logger:HTML:Mining');
	}

	// save html state only when page becomes hidden, not at every batch
	GUIp.common.addListener(document, 'visibilitychange', function() {
		if (document.visibilityState === 'hidden') {
			ui_storage.set(this._htmlStorageKey, this.bar.innerHTML);
		}
	}.bind(this));

	if (this.suppressOldStats()) {
		this.update();
	} else if ((html = ui_storage.get(this._htmlStorageKey))) {
		this.bar.innerHTML = html;
		this.need_separator = true;
		this.bar.scrollLeft = 21474836;
		GUIp.common.setTimeout(function(bar) { bar.scrollLeft = 21474836; }, 0, this.bar);
	}
};
ui_logger._appendStr = function(id, klass, str, descr) {
	if (this.disabled) return;
	// append separator if needed
	if (this.need_separator) {
		this.need_separator = false;
		if (this.bar.lastElementChild) {
			this.bar.insertAdjacentHTML('beforeend',
				'<li class="separator" title="' + GUIp.common.formatTime(new Date(), 'fulltime') + '"> |</li>'
			);
		}
	}
	// append string
	this.bar.insertAdjacentHTML('beforeend', '<li class="' + klass + '" title="' + descr + '"> ' + str + '</li>');
};

ui_logger._formatNumber = function(x) {
	return x >= 0 ? '+' + x : '\u2212' + -x; // minus sign
};

ui_logger.appendLogs = function(diff) {
	ui_logger._appendStr('Logs', 'logs', 'wd' + ui_logger._formatNumber(diff), worker.GUIp_i18n.logs);
};

ui_logger.finishBatch = function() {
	if (this.disabled) return;
	var bar = this.bar, li, classes;
	while ((li = bar.firstChild) && (bar.scrollWidth > bar.getBoundingClientRect().width + 100 || ((classes = li.classList) && classes.contains('separator')))) {
		bar.removeChild(li);
	}
	this.need_separator = true;
	bar.scrollLeft = 21474836;
};

/**
 * @private
 * @type {!Object<string, function(number, number, string): (number|string|undefined)>}
 */
ui_logger._diffOverriders = {
	generic_exp: function(diff, level, oldLevel) {
		if (diff === null) return null;
		oldLevel = +ui_storage.get('Logger:' + (oldLevel || level));
		level = ui_stats[level]();
		if (oldLevel !== level) {
			return (level - oldLevel) * 100 + diff;
		}
	},
	exp: function(diff, exp, id) {
		return this.generic_exp(diff,'Level',(id === 'Exp' ? 'Level' : 'Map_Level'));
	},

	'tr:exp': function(diff) {
		return this.generic_exp(diff,'Trader_Level');
	},

	'df:exp': function(diff) {
		return this.generic_exp(diff,'Forge_Rank');
	},

	'df:bytes': function(diff, progress) {
		if (diff < 0) {
			if (progress === 0) {
				return '';
			} else {
				return '→' + progress;
			}
		}
	},

	'df:words': function(diff, progress) {
		if (diff < 0) {
			return '→' + progress;
		}
	},

	tsk: function(diff, progress) {
		var quest = ui_stats.Task_Name().replace(/ \((?:выполнено|отменено|эпик|completed|cancelled|epic)\)/g, '');
		if (ui_storage.get('Logger:Task_Name') !== quest) {
			if (!diff && progress === 100) return ''; // workaround a Godville bug when quest progress is not reset to 0
			ui_storage.set('Logger:Task_Name', quest);
			if (diff === null) return null;
			return '→' + progress;
		}
	},

	'x:tsk': function(diff, progress) {
		var sideJob = ui_stats.Side_Job_Name().replace(/ \((?:готов к сдаче|провален|reward pending|expired)\)/g, '');
		if (ui_storage.get('Logger:Side_Job_Name') !== sideJob) {
			ui_storage.set('Logger:Side_Job_Name', sideJob);
			if (diff === null) return null;
			return sideJob && '→' + progress;
		}
	},

	'pet:lvl': function(diff, level) {
		var pet = ui_stats.Pet_NameType();
		if (ui_storage.get('Logger:Pet_NameType') !== pet) {
			ui_storage.set('Logger:Pet_NameType', pet);
			if (diff === null) return null;
			return '→' + level;
		}
	},

	spl: function(diff) {
		if (diff === -1) return '';
	},

	'sl:prc': function(diff, progress) {
		if (diff < 0) {
			if (diff <= -100) {
				return '→' + progress;
			}
		}
	},

	'up:rsc': function(diff, progress) {
		if (diff < 0 && progress === 0) { return ''; }
	},

	stub: function() { return ''; }, // for items we need to have record for in storage but never shown in the actual logger

	eq1: function(diff, value, id) {
		var bold = ui_stats[id + '_IsBold']();
		if (bold !== ui_storage.getFlag('Logger:' + id + '_IsBold')) {
			ui_storage.set('Logger:' + id + '_IsBold', bold);
			if (diff === null) return null;
			return (diff ? ui_logger._formatNumber(diff) : '') + (bold ? '+<b>b</b>' : '\u2212<b>b</b>');
		}
	}
};
ui_logger._diffOverriders.eq2 =
ui_logger._diffOverriders.eq3 =
ui_logger._diffOverriders.eq4 =
ui_logger._diffOverriders.eq5 =
ui_logger._diffOverriders.eq6 =
ui_logger._diffOverriders.eq7 =
ui_logger._diffOverriders.eq8 =
	ui_logger._diffOverriders.eq1;

ui_logger._diffOverriders['up:cch'] =
ui_logger._diffOverriders['up:ttw'] =
	ui_logger._diffOverriders['up:rsc'];

for (var i = 2; i <= 7; i++) {
	ui_logger._diffOverriders['up:ttw:' + i] = ui_logger._diffOverriders['up:rsc'];
}

ui_logger._watchStatsValue = function(id, name, descr, klass) {
	klass = (klass || id).toLowerCase();
	var i, j, len, len2, diff, value, result,
		q = '',
		alliesHPCallback = function(i) { return ui_stats.Map_Ally_MaxHP(i) || ui_improver.allsHP.a[i-1] || 0; },
		enemiesHPCallback = function(i) { return ui_stats.EnemySingle_MaxHP(i) || ui_improver.allsHP.e[i-1] || 0; };
	if (name === 'a:hp' && (!ui_storage.getFlag('Option:sumAlliesHp') || ui_data.isSail)) {
		var damageData = [];
		a_loop:
		for (i = 1, len = ui_stats.Hero_Alls_Count(); i <= len; i++) {
			diff = ui_storage.set_with_diff('Logger:'+(id === 'Hero_Alls_HP' ? 'Hero' : 'Map')+'_Ally'+i+'_HP', ui_stats.Hero_Ally_HP(i));
			if (diff) {
				if (!ui_data.isSail) {
					damageData.push({ num: i, diff: diff, cnt: 0, fuzz: 0, cntf: 0 });
				} else {
					// don't display our own hp in allies block
					if (ui_stats.Hero_Ally_Name(i) === ui_data.char_name) {
						continue a_loop;
					}
					// don't display ally hp when we're in fight with that agressive so-called ally (or maybe it's we who are agressive, but anyway)
					for (j = 1, len2 = ui_stats.Enemy_Count(); j <= len2; j++) {
						if (ui_stats.Hero_Ally_Name(i) === ui_stats.EnemySingle_Name(j)) {
							continue a_loop;
						}
					}
					ui_logger._appendStr(id, klass, 'a' + i + ':hp' + ui_logger._formatNumber(diff), descr + ui_utils.loggerPrc(diff,alliesHPCallback(i)));
				}
			}
		}
		if (!damageData.length) {
			return;
		}
		for (i = 0, len = damageData.length; i < len; i++) {
			for (j = (i + 1); j < damageData.length; j++) {
				if (damageData[j].processed) {
					continue;
				}
				if (damageData[i].diff === damageData[j].diff) {
					damageData[i].cnt++;
					damageData[j].processed = true;
					if (damageData[i].parts) {
						damageData[i].parts.push(damageData[j].num);
					} else {
						damageData[i].parts = [damageData[i].num, damageData[j].num];
					}
				} else if (Math.abs(damageData[i].diff - damageData[j].diff) < 3) {
					damageData[i].cntf++;
					damageData[i].fuzz = (damageData[i].fuzz || damageData[i].diff) + damageData[j].diff;
					damageData[j].processed = true;
					if (damageData[i].parts) {
						damageData[i].parts.push(damageData[j].num);
					} else {
						damageData[i].parts = [damageData[i].num, damageData[j].num];
					}
				}
			}
		}
		damageData.sort(function(a,b) {return a.cnt === b.cnt ? a.num - b.num : b.cnt - a.cnt;});
		for (i = 0, len = damageData.length; i < len; i++) {
			if (damageData[i].processed) {
				continue;
			}
			if (damageData[i].fuzz) {
				ui_logger._appendStr(id, klass, 'a:hp' + ui_logger._formatNumber(Math.round((damageData[i].fuzz + damageData[i].diff * damageData[i].cnt)/(damageData[i].cnt + damageData[i].cntf + 1))) + 'x' + (damageData[i].cnt + damageData[i].cntf + 1), descr + ui_utils.loggerPrcMulti(damageData[i],alliesHPCallback));
			} else if (damageData[i].cnt > 0) {
				ui_logger._appendStr(id, klass, 'a:hp' + ui_logger._formatNumber(damageData[i].diff) + 'x' + (damageData[i].cnt + 1), descr + ui_utils.loggerPrcMulti(damageData[i],alliesHPCallback));
			} else {
				ui_logger._appendStr(id, klass, 'a' + damageData[i].num + ':hp' + ui_logger._formatNumber(damageData[i].diff), descr + ui_utils.loggerPrc(damageData[i].diff,alliesHPCallback(damageData[i].num)));
			}
		}
		return;
	}
	if (name === 'e:hp' && (!ui_storage.getFlag('Option:sumAlliesHp') || ui_data.isSail || ui_data.isMining)) {
		for (i = 1, j = 1, len = ui_stats.Enemy_Count(); i <= len; i++) {
			diff = ui_storage.set_with_diff('Logger:Enemy'+i+'_HP', ui_stats.EnemySingle_HP(i));
			if (diff) {
				if (ui_data.isSail) {
					// in sail, we're not only ally to ourselves, but also an enemy too! cool, right?
					if (ui_stats.EnemySingle_Name(i) === ui_data.char_name) {
						continue;
					}
					// in sail we do have different enemies without page reloading, so as a workaround we'll just silently update saved hp
					// when the name of current enemy[i] doesn't match with previously saved enemy[i]
					if (ui_stats.EnemySingle_Name(i) !== ui_storage.get('Logger:Enemy'+i+'_Name')) {
						ui_storage.set('Logger:Enemy'+i+'_Name', ui_stats.EnemySingle_Name(i));
						continue;
					}
					ui_logger._appendStr(id, klass, 'e' + j++ + ':hp' + ui_logger._formatNumber(diff), descr + ui_utils.loggerPrc(diff,enemiesHPCallback(i)));
				} else if (ui_data.isMining) {
					// player's boss name is prefixes with an ugly '@' char, check for it and continue as we're not an enemy to ourselves (at least here)
					if (ui_stats.EnemySingle_Name(i).includes('@')) {
						continue;
					}
					ui_logger._appendStr(id, klass, 'e' + i + ':hp' + ui_logger._formatNumber(diff), descr + ui_utils.loggerPrc(diff,enemiesHPCallback(i)));
				} else {
					ui_logger._appendStr(id, klass, 'e' + (len > 1 ? i : '') + ':hp' + ui_logger._formatNumber(diff), descr + ui_utils.loggerPrc(diff,enemiesHPCallback(i)));
				}
			}
		}
		return;
	}

	value = ui_stats[id]();
	diff = ui_storage.set_with_diff('Logger:' + id, value);
	if (ui_logger._diffOverriders[name]) {
		result = ui_logger._diffOverriders[name](diff, value, id);
	}
	if (result == null) {
		if (!diff) return; // do not show zero diffs unless explicitly requested by the overrider
		result = diff;
	}
	if (typeof result === 'number') {
		result = ui_logger._formatNumber(result);
	}
	if (result) {
		if (name === 'hp' || name === 'h:hp') {
			q = ui_utils.loggerPrc(diff, ui_stats.Max_HP());
		}
		ui_logger._appendStr(id, klass, name + result, descr + q);
	}
};
ui_logger._updateWatchers = function(watchersList) {
	var args;
	for (var i = 0, len = watchersList.length; i < len; i++) {
		args = watchersList[i];
		ui_logger._watchStatsValue(args[0], args[1], args[2], args[3]);
	}
};
ui_logger.suppressOldStats = function() {
	var lastFieldInit;
	if ((lastFieldInit = ui_data.lastFieldInit)) {
		delete ui_data.lastFieldInit;
		// last init in more than 2 days ago
		if (lastFieldInit > 172800000) {
			// suppress some values so digest won't get overflown
			var supList = [
				'HP', 'Godpower', 'Gold', 'Inv', 'Task', 'Task_Name', 'Side_Job', 'Side_Job_Name', 'Equip1', 'Equip2',
				'Equip3', 'Equip4', 'Equip5', 'Equip6', 'Equip7', 'Equip1_IsBold', 'Equip2_IsBold', 'Equip3_IsBold',
				'Equip4_IsBold', 'Equip5_IsBold', 'Equip6_IsBold', 'Equip7_IsBold', 'Pet_NameType'
			];
			for (var i = 0, len = supList.length; i < len; i++) {
				ui_storage.set_with_diff('Logger:' + supList[i], ui_stats[supList[i]]());
			}
			// show ref date
			ui_logger._appendStr(null, 'refdate', GUIp.common.formatTime(new Date(Date.now() - lastFieldInit),'logger'), '');
			ui_logger.need_separator = true;
			return true;
		}
	}
	return false;
};
ui_logger.update = function(ltarget) {
	if (document.getElementById('search_block') && !ui_utils.isHidden(document.getElementById('search_block'))) {
		return;
	}
	if (ltarget !== undefined) {
		ui_logger._updateWatchers(ltarget);
	} else if (ui_data.isDungeon) {
		ui_logger._updateWatchers(this.dungeonWatchers);
	} else if (ui_data.isSail) {
		ui_logger._updateWatchers(this.sailWatchers);
	} else if (ui_data.isMining) {
		ui_logger._updateWatchers(this.miningWatchers);
	} else if (ui_data.isFight) {
		ui_logger._updateWatchers(this.battleWatchers);
	} else if (ui_data.inShop) {
		ui_logger._updateWatchers(this.shopWatchers);
	} else {
		ui_logger.suppressOldStats();
		ui_logger._updateWatchers(this.fieldWatchers);
	}
	this._updateWatchers(this.commonWatchers);
	this.finishBatch();
};
// ui_infdebug
var ui_infdebug = GUIp.infdebug = {};

/**
 * @private
 * @param {*} value
 * @param {boolean} [verbose]
 * @returns {string}
 */
ui_infdebug._formatValue = function(value, verbose) {
	var s = '',
		type = typeof value,
		len = 0,
		keys;
	if (type === 'string') {
		type = GUIp.common.escapeHTML(value);
		return verbose || value.length <= 25 ? (
			'&#34;' + type + '&#34;'
		) : '<abbr title="&#34;' + type + '&#34;">&#34;' + GUIp.common.escapeHTML(value.slice(0, 24)) + '…&#34;</abbr>';
	}
	if (value) {
		if (Array.isArray(value)) {
			s = value.map(ui_infdebug._formatValueVerbose).join(', ');
			return verbose || !s ? (
				'[' + s + ']'
			) : '<abbr title="[' + s.replace(/<[^>]*>/g, '') + ']">array(' + value.length + ')</abbr>';
		}
		if (type === 'function') {
			return value.name ? GUIp.common.escapeHTML(value.name) : 'function';
		}
		if (type === 'object') {
			if (value instanceof RegExp) {
				type = value.toString();
				return verbose || value.source.length <= 25 ? GUIp.common.escapeHTML(type) : (
					'<abbr title="' + GUIp.common.escapeHTML(type) + '">/' +
					GUIp.common.escapeHTML(value.source.slice(0, 24)) + '…' + type.slice(type.lastIndexOf('/')) +
					'</abbr>'
				);
			}
			keys = Object.keys(value).sort();
			len = keys.length;
			for (var i = 0; i < len; i++) {
				if (i === 25) {
					s += '    …\n';
					break;
				}
				type = keys[i];
				s += /^\w+$/.test(type) ? (
					'    ' + type + ',\n'
				) : '    &#34;' + GUIp.common.escapeHTML(type) + '&#34;,\n';
			}
			type = Object.prototype.toString.call(value);
			return '<abbr title="{\n' + s + (
				type === '[object Object]' ? '}">object(' : '}">' + GUIp.common.escapeHTML(type.slice(1, -1)) + '('
			) + len + ')</abbr>';
		}
	} else if (type === 'undefined' || value !== value) {
		return '<span style="color: red;">' + value + '</span>';
	}
	return String(value); // no need to escape: the value is either boolean, number, or null
};

/**
 * @private
 * @param {*} value
 * @returns {string}
 */
ui_infdebug._formatValueVerbose = function(value) {
	return ui_infdebug._formatValue(value, true);
};

/**
 * @private
 * @param {*} value
 * @returns {string}
 */
ui_infdebug._formatProperty = function(value) {
	var s = String(value);
	if (/^[A-Za-z_]\w*$/.test(s)) {
		return '.' + s;
	} else {
		return '[</strong>' + ui_infdebug._formatValue(value) + '<strong>]';
	}
};

/**
 * @private
 * @param {{eResult: *, computed: boolean, object: {type: string, eResult: *}, property: {type: string, eResult: *}}} n
 * @returns {string}
 */
ui_infdebug._formatMember = function(n) {
	var result, valueType = typeof n.object.value;
	if (/*n.object.type === 'Literal' &&*/ (valueType === 'object' || valueType === 'function')) {
		result = GUIp.common.escapeHTML(n.object.raw);
	} else {
		result = ui_infdebug._formatValue(n.object.eResult);
	}
	return result + ui_infdebug._formatProperty(n.property.name || n.property.eResult);
};

/**
 * @param {!Array<{type: string, eResult: *}>} trace
 * @returns {string}
 */
ui_infdebug.formatTraceHTML = function(trace) {
	var s = '', line;
	for (var i = 0, len = trace.length; i < len; i++) {
		var n = trace[i];

		switch (n.type) {
		case 'Literal':
		case 'E_GVLiteral':
		case 'ArrayExpression':
			continue;

		case 'ConditionalExpression':
			line =
				ui_infdebug._formatValue(n.test.eResult) + ' <strong>?</strong>\xA0' +
				ui_infdebug._formatValue(n.consequent.eResult) + ' <strong>:</strong>\xA0' +
				ui_infdebug._formatValue(n.alternate.eResult);
			break;

		case 'UnaryExpression':
			if (typeof n.argument.eResult === 'number' && (n.operator === '-' || n.operator === '+')) {
				continue;
			}
			line =
				'<strong>' + GUIp.common.escapeHTML(n.operator) + '</strong>' +
				ui_infdebug._formatValue(n.argument.eResult);
			break;

		case 'BinaryExpression':
		case 'LogicalExpression':
			line =
				ui_infdebug._formatValue(n.left.eResult) +
				' <strong>' + GUIp.common.escapeHTML(n.operator) + '</strong>\xA0' +
				ui_infdebug._formatValue(n.right.eResult);
			break;

		case 'MemberExpression':
			line = '<strong>' + ui_infdebug._formatMember(n) + '</strong>';
			break;

		case 'E_GVExpression':
			line = '<strong>gv' + ui_infdebug._formatProperty(n.property.eResult) + '</strong>';
			break;

		case 'CallExpression':
			line = '<strong>';
			if (n.callee.type === 'MemberExpression') {
				line += ui_infdebug._formatMember(n.callee);
			} else {
				line += ui_infdebug._formatValue(n.callee.eResult);
			}
			line += '(</strong>';
			for (var j = 0, jlen = n.arguments.length; j < jlen; j++) {
				if (j) line += ', ';
				line += ui_infdebug._formatValue(n.arguments[j].eResult);
			}
			line += '<strong>)</strong>';
			break;

		case 'E_MatchExpression':
			line =
				ui_infdebug._formatValue(n.text.eResult) +
				' <strong>' + (n.negated ? '!' : '') + (n.insensitive ? '~*' : '~') + '</strong>\xA0' +
				ui_infdebug._formatValue(n.pattern.value !== undefined ? n.pattern.value : n.pattern.eResult);
			break;

		default:
			throw new Error('expression type "' + n.type + '" is unsupported in custom informers');
		}

		s += '<li>' + line + ' →\xA0' + ui_infdebug._formatValue(n.eResult, true) + '</li>';
	}
	return s;
};

/**
 * @private
 * @param {string} msg
 * @returns {string}
 */
ui_infdebug._formatError = function(msg) {
	return '<div>' + GUIp_i18n.custom_informers_error + ': ' + GUIp.common.escapeHTML(msg) + '.</div>';
};

/**
 * @param {!GUIp.expr.DebugInfo} debug
 * @returns {string}
 */
ui_infdebug.formatDebugHTML = function(debug) {
	var s = '<ol>' + ui_infdebug.formatTraceHTML(debug.trace) + '</ol><br />';
	if (debug.error != null) {
		s += ui_infdebug._formatError(debug.error);
	} else {
		s += '<div>' + GUIp_i18n.custom_informers_check_result + '<strong>' + !!debug.result + '</strong></div>';
	}
	return s;
};

/**
 * @param {string} text
 * @param {!Object} gv
 * @param {function(string): *} gvCache
 * @returns {string}
 */
ui_infdebug.formatExprHTML = function(text, gv, gvCache) {
	var ast;
	try {
		ast = ui_expr.compile(text, true);
	} catch (e) {
		return ui_infdebug._formatError(e.message);
	}
	return ui_infdebug.formatDebugHTML(ui_expr.debug(ast, gv, gvCache));
};
// ui_informer
var ui_informer = worker.GUIp.informer = {};

/**
 * @private
 * @property {!Array<?GUIp.expr.CompiledExpr>} exprs
 * @property {!Array<(string|!Array<(string|!GUIp.expr.CompiledExpr>))>} titles
 */
ui_informer._compiled = {exprs: [], titles: []};

ui_informer._lgcc = '';
ui_informer._lgcid = '';
ui_informer._debugLastExpr = '';

ui_informer.init = function() {
	// container
	document.getElementById(ui_data.isMobile ? 'main_page' : 'main_wrapper').insertAdjacentHTML('afterbegin', '<div id="informer_bar"></div>');
	this.container = document.getElementById('informer_bar');
	// load
	ui_informer._load();
	// custom data
	ui_informer.initCustomInformersData();
	// forcefully update page title
	GUIp.common.setTimeout(function() { ui_utils.setTitle(ui_informer._getTitleNotices() + ui_data.docTitle); }, 100);
	// run custom informers at least once a minute, at xx:xx:00 (can be slightly postponed by a browser engine)
	ui_informer._initTimer();
};
ui_informer._initTimer = function() {
	GUIp.common.setTimeout(ui_informer._initTimerCallback, (60 - ui_utils.getPreciseTime(0, true).getSeconds()) * 1e3);
};
ui_informer._initTimerCallback = function() {
	ui_informer.updateCustomInformers();
	ui_informer._initTimer();
};
ui_informer._load = function() {
	this.activeInformers = ui_storage.createVar('Option:activeInformers',
		function(text) { return JSON.parse(text || '{}'); },
		JSON.stringify,
		ui_inventory.tryUpdate
	);
	this.flags = JSON.parse(ui_storage.get('informer_flags') || '{}');
	ui_informer.purgeFlags(true);
};
ui_informer._save = function() {
	ui_storage.set('informer_flags', JSON.stringify(this.flags));
};
ui_informer.purgeFlags = function(initial) {
	var ci;
	for (var flag in this.flags) {
		if (initial && this.flags[flag].state === 'e' || (flag.startsWith('ci ') && (!(ci = this.getCustomInformer(flag)) || ci.q))) {
			ui_informer._deleteLabel(flag);
			delete this.flags[flag];
		}
	}
	ui_informer._save();
};
ui_informer._createLabel = function(flag) {
	var div = document.createElement('div');
	div.id = flag.replace(/ /g, '_');
	div.textContent = this.flags[flag].text ? this.flags[flag].text : flag.replace(/^ci /,'');
	GUIp.common.addListener(div, 'click', function(e) {
		ui_informer.hide(flag);
		ui_utils.hideNotification(flag);
		e.stopPropagation();
	});
	this.container.appendChild(div);
};
ui_informer._deleteLabel = function(flag) {
	var label = document.getElementById(flag.replace(/ /g, '_'));
	if (label) {
		if (label.dataset.snInterval) {
			worker.clearInterval(label.dataset.snInterval);
		}
		this.container.removeChild(label);
	}
};
ui_informer._renameLabel = function(flag,text) {
	var label = document.getElementById(flag.replace(/ /g, '_'));
	if (label) {
		label.textContent = text;
	}
};
ui_informer._tick = function() {
	// iterate through all the flags and choose enabled ones
	var ci, activeFlags = [];
	for (var flag in this.flags) {
		if (this.flags[flag].state === 'e') {
			// custom informers with type 'N' (non-active) should never flash in document title
			if (flag.startsWith('ci ') && (ci = this.getCustomInformer(flag)) && (ci.type & 0x400)) {
				continue;
			}
			activeFlags.push(this.flags[flag].text || flag.replace(/^ci /,''));
		}
	}
	activeFlags.sort();
	// update title if there are active informers
	if (activeFlags.length) {
		ui_informer._updateTitle(activeFlags);
		this.tref = GUIp.common.setTimeout(ui_informer._tick.bind(ui_informer), 700);
	} else {
		ui_informer.clearTitle();
		this.tref = 0;
	}
};
ui_informer.clearTitle = function() {
	var ci;
	for (var flag in this.flags) {
		// it is fine to clear title when 'N'-type informer is still active
		if (flag.startsWith('ci ') && (ci = this.getCustomInformer(flag)) && (ci.type & 0x400)) {
			continue;
		}
		if (this.flags[flag].state === 'e') {
			return;
		}
	}
	ui_utils.setTitle(ui_informer._getTitleNotices() + ui_data.docTitle);
};
ui_informer._getTitleNotices = function() {
	var forbidden_title_notices = ui_storage.getList('Option:forbiddenTitleNotices');
	var titleNotices = (!forbidden_title_notices.includes('pm') ? ui_informer._getPMTitleNotice() : '') +
					   (!forbidden_title_notices.includes('gm') ? ui_informer._getGMTitleNotice() : '') +
					   (!forbidden_title_notices.includes('fi') ? ui_informer._getFITitleNotice() : '');
	return titleNotices ? titleNotices + ' ' : '';
};
ui_informer._getPMTitleNotice = function() {
	var pm = 0,
		pm_badge = !ui_data.isMobile && document.getElementsByClassName('fr_new_badge_pos')[0];
	if (pm_badge && pm_badge.style.display !== 'none') {
		pm = +pm_badge.textContent;
	}
	var stars = document.querySelectorAll((ui_data.isMobile ? '.e_m_friends' : '.msgDock') + ' .fr_new_msg');
	for (var i = 0, len = stars.length; i < len; i++) {
		if (ui_data.isMobile || !stars[i].parentNode.getElementsByClassName('dockfrname')[0].textContent.match(/Гильдсовет|Guild Council/)) {
			pm++;
		}
	}
	return pm ? '[' + pm + ']' : '';
};
ui_informer._getGMTitleNotice = function() {
	var stars, gm = ui_data.isMobile ? /\(\d+\)$/.test((document.getElementsByClassName('show_gc')[0] || '').textContent) : (document.getElementsByClassName('gc_new_badge')[0] || {style: {display: 'none'}}).style.display !== 'none';
	if (!gm) {
		stars = document.querySelectorAll('.msgDock .fr_new_msg');
		for (var i = 0, len = stars.length; i < len; i++) {
			if (stars[i].parentNode.getElementsByClassName('dockfrname')[0].textContent.match(/Гильдсовет|Guild Council/)) {
				gm = true;
				break;
			}
		}
	}
	return gm ? '[g]' : '';
};
ui_informer._getFITitleNotice = function() {
	return (ui_data.isMobile ? document.getElementsByClassName('e_m_forum_informers_line')[0] : document.getElementById('forum_informer_bar').firstChild) ? '[f]' : '';
};
ui_informer._updateTitle = function(activeFlags) {
	this.odd_tick = !this.odd_tick;
	var sep = this.odd_tick ? '!!!' : '...';
	this.tref_title = this._getTitleNotices() + sep + ' ' + activeFlags.join('! ') + ' ' + sep;
	ui_utils.setTitle(this.tref_title);
};
ui_informer.redrawTitle = function() {
	if (ui_storage.getFlag('Option:discardTitleChanges')) {
		ui_data.docTitle = ui_data.docTitle.replace(/\((\d+)([!@~\+])\)/,'($2)');
	}
	if (this.tref && this.tref_title) {
		ui_utils.setTitle(this.tref_title);
	} else {
		ui_utils.setTitle(this._getTitleNotices() + ui_data.docTitle);
	}
};
ui_informer.getInformerType = function(flag) {
	var type;
	if (flag.startsWith('ci ')) {
		var informer = this.getCustomInformer(flag);
		if (informer && informer.type > 1) {
			type = informer.type || 0;
		} else {
			type = this.activeInformers.get().custom_informers || 0;
		}
	} else {
		type = this.activeInformers.get()[flag.replace(/ /g, '_')] || 0;
	}
	return type;
};
ui_informer.activateLabelNotification = function(flag,type) {
	if (!(type & 0x10)) {
		return;
	}
	ui_informer._createLabel(flag);
	if (!this.tref) {
		ui_informer._tick();
	}
};
ui_informer.activateDesktopNotification = function(flag,type) {
	if (!(type & 0x20)) {
		return;
	}
	if (ui_storage.getFlag('Option:enableInformerAlerts') && GUIp.common.notif.enabled) {
		var title = '[☆] ' + ui_data.god_name,
			text = (this.flags[flag].text ? this.flags[flag].text : flag.replace(/^ci /,'')),
			callback = function() { ui_informer.hide(flag); };
		ui_utils.showNotification(title,text,callback,flag);
	}
	if (!(type & 0x10)) {
		this.flags[flag].state = 'd';
	}
};
ui_informer.activateSoundNotification = function(flag,type) {
	if (!(type & 0xC0)) {
		return;
	}
	var sound = ui_storage.get('Option:informerCustomSound') || 'arena',
		volume = ui_storage.get('Option:informerCustomSoundVolume');
	GUIp.common.playSound(sound, volume);
	if (!(type & 0x10)) {
		this.flags[flag].state = 'd';
	} else if (type & 0x80) {
		var snLabel = document.getElementById(flag.replace(/ /g, '_'));
		if (snLabel) {
			snLabel.dataset.snInterval = GUIp.common.setInterval(GUIp.common.playSound.bind(null, sound, volume), 7e3);
		}
	}
};
ui_informer.writeLogNotification = function(flag,type,code) {
	if (!(type & 0x2000)) {
		return;
	}
	if (!this.flags[flag] || !this.flags[flag].text) {
		GUIp.common.error('not enough data for informer logging of flag ' + flag);
		return;
	}
	var action;
	switch (code) {
		case 1: action = 'switching on'; break;
		case 2: action = 'resuming'; break;
		case 3: action = 'suspending'; break;
		case 4: action = 'switching off'; break;
		case 5: action = 'getting a new label'; break;
	}
	GUIp.common.info('informer [' + flag.replace(/^ci /,'') + ']' + ' is ' + action + (flag.replace(/^ci /,'') !== this.flags[flag].text ? ', value: ' + this.flags[flag].text : ''));
};
ui_informer.update = function(flag, value, text) {
	var infType = this.getInformerType(flag);
	if (value) {
		if ((this.activeInformers.get()[flag.replace(/ /g, '_')] || flag.startsWith('ci ')) && (flag === 'fight' || flag === 'low health' || flag.startsWith('ci ') || !(ui_data.isFight && !ui_data.isDungeon && !ui_data.isSail)) &&
			!(flag === 'much gold' && ui_stats.hasTemple() && ui_stats.townName()) &&
			!(flag === 'smelter' && this.flags['smelt!'] && this.flags['smelt!'].state === 'e') &&
			!(flag === 'transformer' && this.flags['transform!'] && this.flags['transform!'].state === 'e') &&
			!(ui_data.inShop && (infType & 0x800))) {
			if (this.flags[flag] === undefined) {
				this.flags[flag] = {state: 'e'};
				if (text) {
					this.flags[flag].text = text;
				}
				this.activateLabelNotification(flag, infType);
				this.activateDesktopNotification(flag, infType);
				this.activateSoundNotification(flag, infType);
				this.writeLogNotification(flag, infType, 1);
				ui_informer._save();
			} else if (this.flags[flag].state === 's') {
				this.flags[flag].state = 'e';
				this.activateLabelNotification(flag,infType);
				this.writeLogNotification(flag, infType, 2);
				ui_informer._save();
			}
		} else if (this.flags[flag] && this.flags[flag].state === 'e') {
			this.flags[flag].state = 's';
			this.writeLogNotification(flag, infType, 3);
			ui_informer._deleteLabel(flag);
			ui_informer._save();
		}
	} else if (this.flags[flag] !== undefined) {
		this.writeLogNotification(flag, infType, 4);
		delete this.flags[flag];
		ui_informer._deleteLabel(flag);
		ui_utils.hideNotification(flag);
		ui_informer._save();
	}
};
ui_informer.hide = function(flag) {
	var ci;
	if (flag.startsWith('ci ') && (ci = this.getCustomInformer(flag)) && (ci.type & 0x1000)) {
		return;
	}
	if (this.flags[flag]) {
		this.flags[flag].state = 'd';
	}
	ui_informer._deleteLabel(flag);
	if (flag === 'selected town') {
		delete this.flags[flag];
		ui_improver.distanceInformerReset();
	}
	ui_informer._save();
};
ui_informer.getCustomInformer = function(title) {
	title = title.replace(/^ci /,'');
	return ui_words.base.custom_informers.find(function(informer) { return informer.title === title; });
};

/**
 * @private
 * @param {!Array<{text: string, e: !Error}>} errors
 */
ui_informer._reportCustomInformerErrors = function(errors) {
	var len = errors.length;
	if (!len) return;
	var s = '<ul>';
	for (var i = 0; i < len; i++) {
		s +=
			'<li><div class="e_custom_informer_text">' + GUIp.common.escapeHTML(errors[i].text) +
			'</div><div class="e_custom_informer_error">' + GUIp.common.escapeHTML(errors[i].e.toString()) +
			'</div></li>';
	}
	ui_utils.showMessage('custom_informers_errors', {
		title: GUIp_i18n.custom_informers_check,
		content: '<div style="text-align: left;">' + GUIp_i18n.custom_informers_non_trivial_errors + s + '</ul></div>'
	});
};

/**
 * @private
 * @param {!Array<{q: boolean, title: string, expr: string}>} informers
 */
ui_informer.recompileCustomInformers = function(informers) {
	var errors = [], ast, fragments, fr;
	this._compiled.exprs.length = this._compiled.titles.length = 0;
	for (var i = 0, len = informers.length; i < len; i++) {
		var informer = informers[i];
		this._compiled.exprs[i] = null;
		this._compiled.titles[i] = '';
		if (informer.q) continue;

		try {
			ast = ui_expr.compile(informer.expr, true);
		} catch (e) {
			errors.push({text: informer.expr, e: e});
			ast = null;
		}
		try {
			fragments = ui_expr.compileEmbedded(informer.title);
		} catch (e) {
			errors.push({text: informer.title, e: e});
			continue;
		}
		if (!ast) continue;

		this._compiled.exprs[i] = ast;
		this._compiled.titles[i] =
			fragments.length === 1 && typeof (fr = fragments[0]) === 'string' && !/\bgv\.\w/.test(fr) ? fr : fragments;
	}
	this._reportCustomInformerErrors(errors);
};

ui_informer.updateCustomInformers = function() {
	if (!this.activeInformers.get().custom_informers) {
		return;
	}
	var cache = ui_expr.makeCache(this.CIDstate),
		errors = [],
		informer, state, title, computedTitle;
	for (var i = 0, len = ui_words.base.custom_informers.length; i < len; i++) {
		if (!this._compiled.exprs[i]) {
			continue;
		}

		informer = ui_words.base.custom_informers[i];
		// evaluate the condition
		try {
			state = !!ui_expr.eval(this._compiled.exprs[i], this.CIDstate, cache);
		} catch (e) {
			errors.push({text: informer.expr, e: e});
			// user-written code resulted in an exception; ignore that informer
			continue;
		}

		title = informer.title;
		if (!state) {
			computedTitle = null;
		} else if (typeof this._compiled.titles[i] === 'string') {
			computedTitle = this._compiled.titles[i];
		} else {
			// evaluate the dynamic title
			try {
				computedTitle = ui_expr.evalEmbedded(this._compiled.titles[i], this.CIDstate, cache);
			} catch (e) {
				errors.push({text: title, e: e});
				// if an informer has fired, we must notify the user even if the title is messy
				computedTitle = title;
			}

			// check if informer text has changed
			if (this.flags['ci ' + title] !== undefined && this.flags['ci ' + title].text !== computedTitle) {
				switch (this.flags['ci ' + title].state) {
				case 'e':
				case 's':
					if (informer.type & 0x200) {
						// remove everything with flag 'W'
						delete this.flags['ci ' + title];
						ui_informer._deleteLabel('ci ' + title);
					} else {
						// or just rename label if it exists
						this.flags['ci ' + title].text = computedTitle;
						ui_informer._renameLabel('ci ' + title, computedTitle);
						this.writeLogNotification('ci ' + title, informer.type, 5);
					}
					break;
				case 'd':
					// kill current label and flag of revivable-type informer to regenerate it from scratch as a new one
					if (informer.type & 0x300) {
						delete this.flags['ci ' + title];
						ui_informer._deleteLabel('ci ' + title);
					}
					break;
				}
				ui_informer._save();
			}
		}
		if ((informer.type % 2) === 0) {
			this.update('ci ' + title, state, computedTitle);
		} else {
			if (state) {
				this.update('ci ' + title, true, computedTitle);
			} else if (this.flags['ci ' + title] && this.flags['ci ' + title].state === 'd') {
				this.update('ci ' + title, false, computedTitle);
			}
		}
	}
	// clear guildchat last message cache
	if (this._lgcc) {
		this._lgcc = '';
	}
	if (errors.length && !document.getElementById('msgcustom_informers_errors')) {
		this._reportCustomInformerErrors(errors);
	}
};

/**
 * @private
 * @param {!Array<string>} impl
 * @param {!Array<string>} iface
 * @returns {{status: string, method: string}}
 */
ui_informer._checkConsistency = function(impl, iface) {
	for (var i = 0, len = Math.max(impl.length, iface.length); i < len; i++) {
		if (impl[i] !== iface[i]) {
			if (impl[i] && (!iface[i] || impl[i] < iface[i])) {
				return {status: 'undeclared', method: impl[i]};
			} else {
				return {status: 'unimplemented', method: iface[i]};
			}
		}
	}
	return {status: 'ok', method: ''};
};

ui_informer.initCustomInformersData = function() {
	var calcSoulsProc = function(type) {
		var list, sum = 0;
		list = JSON.parse(ui_storage.get('LastGatheredSouls')) || [];
		list.slice(0,3).forEach(function(a) {
			if (a.value !== undefined) {
				if (a.value === null) {
					sum += type > 0 ? 20 : type < 0 ? -5 : 10; // if we have opened the refinery popup recently then we already know the actual soul value except for mysterious type
				} else {
					sum += a.value;
				}
			} else {
				switch (a.kind) {
					case 1: sum += 20; break;
					case 2:
					case 3:
					case 12: sum += 15; break;
					case 4:
					case 5:
					case 6: sum += 10; break;
					case 7: sum += 5; break;
					case 8: sum += GUIp_locale === 'en' && type <= 0 ? (type < 0 ? -5 : 0) : 5; break; // it is claimed that these types in english version
					case 9: sum += GUIp_locale === 'en' && type >= 0 ? (type > 0 ? 5 : 0) : -5; break; // may be randomly set as either +5 or -5
					case 10: sum += type > 0 ? 20 : type < 0 ? -5 : 10; break;
				}
			}
			return false;
		});
		return sum;
	}
	this.CIDstate = {
		get health() { return ui_stats.HP(); },
		get healthMax() { return ui_stats.Max_HP(); },
		get healthPrc() { return Math.floor(100 * this.health / (this.healthMax - 1e-6)); },
		get gold() { return ui_stats.Gold(); },
		get supplies() { return ui_stats.Map_Supplies(); },
		get suppliesMax() { return ui_stats.Map_MaxSupplies(); },
		get suppliesPrc() { return Math.floor(100 * this.supplies / (this.suppliesMax - 1e-6)); },
		get inventory() { return ui_stats.Inv(); },
		get inventoryMax() { return ui_stats.Max_Inv(); },
		get inventoryPrc() { return Math.floor(100 * this.inventory / (this.inventoryMax - 1e-6)); },
		inventoryHasItem: function(name) { return ui_inventory.model.getItemIndex(String(name)) !== undefined; },
		inventoryHasType: function(type) {
			var t = String(type).replace(/-/g, ' ');
			if (!ui_words.base.usable_items.hasOwnProperty(t)) {
				throw new Error('unknown category in gv.inventoryHasType: "' + type + '"');
			}
			return ui_inventory.model.hasType(t);
		},
		inventoryCountLike: ui_inventory.countLike,
		get inventoryHealing() { return ui_inventory.model.countHealing(); },
		get inventoryUnsaleable() { return this.inventoryUnsellable; },
		get inventoryUnsellable() { return ui_inventory.model.countUnsellable(); },
		isEquipmentBold: function(slot) {
			var n = +slot;
			if (n < 1 || n > 8 || n !== Math.floor(n)) {
				throw new Error('invalid slot number in gv.isEquipmentBold: "' + slot + '"');
			}
			return ui_storage.getFlag('Logger:Equip' + n + '_IsBold');
		},
		get exp() { return ui_stats.Exp(); },
		get expTrader() { return ui_stats.Trader_Exp(); },
		get expForge() { return (+ui_storage.get('Logger:Forge_Exp') || 0); },
		get portDistance() { return ui_improver.sailPortDistance || 0; },
		get nearestPortDistance() { return ui_improver.sailNearestPortDistance || 0; },
		get auraName() { return ui_stats.auraName(); },
		get auraDuration() { return ui_stats.auraDuration(); },
		get bingoItems() { return ui_inventory.countBingoItems(); },
		get bingoSlotsLeft() { return ui_inventory.getBingoSlots().length; },
		get bingoTriesLeft() { return ui_improver.bingoTries.get(); },
		get couponPrize() { return ui_storage.get('Newspaper:couponPrize') || ''; },
		get godpowerCapAvailable() { return ui_storage.getFlag('Newspaper:godpowerCap'); },
		get activeAdvert() { return ui_storage.get('Newspaper:activeAdvert') || ''; },
		get activeAdvertButton() { return ui_storage.get('Newspaper:activeAdvert:button') || ''; },
		get enemyHealth() { return ui_stats.Enemy_HP(); },
		get enemyHealthMax() { return ui_stats.Enemy_MaxHP(); },
		get enemyHealthPrc() { return Math.floor(100 * this.enemyHealth / (this.enemyHealthMax - 1e-6)); },
		get enemyCount() { return ui_stats.Enemy_Count(); },
		get enemyAliveCount() { return ui_stats.Enemy_AliveCount(); },
		get enemyAbilitiesCount() { return ui_stats.Enemy_AbilitiesCount(); },
		get enemyGold() { return ui_stats.Enemy_Gold(); },
		get enemyName() { return ui_stats.EnemySingle_Name(1); },
		enemyHasAbility: ui_stats.Enemy_HasAbility.bind(ui_stats),
		enemyHasAbilityLoc: ui_stats.Enemy_HasAbilityLoc.bind(ui_stats),
		get alliesHealth() { return ui_stats.Hero_Alls_HP(); },
		get alliesHealthMax() { return ui_improver.allsHP.sum || ui_stats.Hero_Alls_MaxHP(); },
		get alliesHealthPrc() { return Math.floor(100 * this.alliesHealth / (this.alliesHealthMax - 1e-6)); },
		get alliesCount() { return ui_stats.Hero_Alls_Count(); },
		get alliesAliveCount() { return ui_stats.Hero_Alls_AliveCount(); },
		get alliesAliveHealthMax() { return ui_stats.Hero_Alls_AliveMaxHP(); },
		get lowHealth() { return ui_data.isDungeon ? ui_stats.lowHealth('dungeon') : (ui_data.isSail ? ui_stats.lowHealth('sail') : (ui_data.isFight ? ui_stats.lowHealth('fight') : false)); },
		get godpower() { return ui_stats.Godpower(); },
		get godpowerMax() { return ui_stats.Max_Godpower(); },
		get godpowerPrc() { return Math.floor(100 * this.godpower / this.godpowerMax); },
		get charges() { return ui_stats.Charges(); },
		get arenaAvailable() { return ui_stats.isArenaAvailable(); },
		get sparAvailable() { return ui_stats.isSparAvailable(); },
		get dungeonAvailable() { return ui_stats.isDungeonAvailable(); },
		get sailAvailable() { return ui_stats.isSailAvailable(); },
		get miningAvailable() { return ui_stats.isMiningAvailable(); },
		get arenaSendDelay() { return ui_stats.sendDelayArena(); },
		get sparSendDelay() { return ui_stats.sendDelaySpar(); },
		get dungeonSendDelay() { return ui_stats.sendDelayDungeon(); },
		get sailSendDelay() { return ui_stats.sendDelaySail(); },
		get miningSendDelay() { return ui_stats.sendDelayMine(); },
		get bossFightType() { return this.inBossFight ? (ui_words.base.std_dungeon_bosses.includes(this.enemyName) || ui_storage.get('Logger:Location') === 'Dungeon' ? 'dungeon' : 'field') : ''; },
		get fightMode() { return ui_stats.fightType(); },
		get fightType() { return ui_stats.fightType(); },
		get fightStep() { return ui_stats.currentStep(); },
		get fightStepText() { return ui_stats.currentStepText(); },
		get dungeonType() { return ui_improver.dungeonExtras.type === 'multi' ? (ui_improver.dungeonExtras.typesLoc && ui_improver.dungeonExtras.typesLoc.join('+') || 'unknown') : ui_improver.dungeonExtras.typeLoc; },
		get dungeonChallenge() { return ui_improver.dungeonExtras.challenge || ''; },
		get dungeonChallengeReward() { return ui_improver.dungeonExtras.reward || ''; },
		get guidedStepsCount() { return ui_improver.needLog || !ui_improver.dungeonGuidedSteps ? null : Object.keys(ui_improver.dungeonGuidedSteps).length; },
		get sailConditions() {
			if (!ui_improver.islandsMap.manager) return '';
			return Object.keys(ui_improver.islandsMap.manager.conditions).toString();
		},
		get cargo() { return ui_stats.cargo(); },
		get pushReadiness() { return ui_stats.Push_Readiness(); },
		get invites() { return (+ui_storage.get('Logger:Invites') || 0); },
		get logs() { return (+ui_storage.get('Logger:Logs') || 0); },
		get labF() { return (+ui_storage.get('Logger:Lab_F') || 0); },
		get labM() { return (+ui_storage.get('Logger:Lab_M') || 0); },
		get bits() { return ui_stats.Bits() - ui_stats.Bytes() * ui_mining.bitsPerByte; },
		get bytes() { return ui_stats.Bytes(); },
		get bitsPerByte() { return ui_mining.bitsPerByte; },
		get bookBytes() { return ui_stats.Book_Bytes() - ui_stats.Book_Words()*4; },
		get bookWords() { return ui_stats.Book_Words(); },
		get forgeBytes() { return (+ui_storage.get('Logger:Forge_Bytes') || 0) - (+ui_storage.get('Logger:Forge_Words') || 0)*4; },
		get forgeWords() { return (+ui_storage.get('Logger:Forge_Words') || 0); },
		get souls() { return (+ui_storage.get('Logger:Souls') || 0); },
		get soulsCollected() { return (+ui_storage.get('Logger:Souls_Collected') || 0); },
		get soulsProcessed() { return (+ui_storage.get('Logger:Souls_Processed') || 0); },
		get soulsProcDelay() { 
			var delay = (+ui_storage.get('Logger:Souls_Processed_Exp') || 0) - Date.now();
			if (delay > 0) {
				return Math.ceil(delay / 60e3) * 60; // since delay data is presented in hh:mm format, there's no reason to include seconds as they would be invalid anyway, so round it to minutes
			}
			return 0;
		},
		get soulsProcMin() { return calcSoulsProc(-1); },
		get soulsProcMax() { return calcSoulsProc(1); },
		get soulsProcAvg() { return calcSoulsProc(0); },
		get relics() { return (+ui_storage.get('Logger:Relics') || 0); },
		get relicsExamined() { return (+ui_storage.get('Logger:Relics_Examined') || 0); },
		get inBossFight() { return ui_stats.isBossFight(); },
		get inFight() { return ui_stats.isFight(); },
		get inShop() { return ui_data.inShop; },
		get pendingShop() { return ui_stats.pendingShop(); },
		get inTown() { return ui_stats.townName().length > 0; },
		get nearestTown() { return ui_improver.dailyForecast.get().includes('gvroads') ? (worker.GUIp_locale === 'ru' ? 'Годвилль' : 'Godville') : ui_stats.nearbyTown(); },
		get currentTown() { return ui_stats.townName(); },
		get locationAnomaly() { return ui_stats.locationAnomaly(); },
		get mileStones() { return ui_stats.mileStones(); },
		get poiMileStones() { return ui_stats.poiMileStones(); },
		get poiMileStonesAhead() { return ui_stats.poiMileStones(1); },
		get poiMileStonesBehind() { return ui_stats.poiMileStones(-1); },
		get poiDistance() { return ui_stats.poiDistance(); },
		get selTownName() { return ui_improver.informTown || ''; },
		get selTownMileStones() { return ui_stats.selTownMileStones(); },
		get selTownDistance() { return ui_stats.selTownDistance(); },
		get mProgress() { return ui_stats.mProgress(); },
		get sProgress() { return ui_stats.sProgress(); },
		get lastNews() { return ui_stats.lastNews(); },
		get lastDiary() {
			var lastDiary = ui_stats.lastDiaryRealEntry(0, true);
			return lastDiary ? lastDiary.textContent : '';
		},
		get lastDiarySign() {
			var lastDiary = ui_stats.lastDiary();
			for (var i = 0; i < lastDiary.length; i++) {
				if (/ \(@\)$/.test(lastDiary[i])) {
					return lastDiary[i];
				}
			}
			return '';
		},
		get lastDiaryVoice() {
			var lastDiary = ui_stats.lastDiary();
			for (var i = 0; i < lastDiary.length; i++) {
				if (/\|☣\)$/.test(lastDiary[i])) {
					return lastDiary[i];
				}
			}
			return '';
		},
		get lastGuildChat() {
			if (ui_informer._lgcc) {
				return ui_informer._lgcc;
			}
			var msgsc, msgs = ui_utils.getLastGCM();
			if (!msgs.length) {
				return '';
			}
			msgsc = msgs.length - 1;
			if (!ui_informer._lgcid) {
				ui_informer._lgcid = JSON.stringify(msgs[msgsc]);
				return '';
			}
			var found = false, filtered = '';
			for (var i = 0, len = msgs.length; i < len; i++) {
				if (JSON.stringify(msgs[i]) === ui_informer._lgcid) {
					found = true;
					continue;
				}
				if (!found || msgs[i].a === ui_data.god_name) {
					continue;
				}
				filtered += msgs[i].a + ': ' + msgs[i].c + '\n';
			}
			if (!found) {
				for (var i = 0, len = msgs.length; i < len; i++) {
					if (msgs[i].a !== ui_data.god_name) {
						filtered += msgs[i].a + ': ' + msgs[i].c + '\n';
					}
				}
			}
			ui_informer._lgcid = JSON.stringify(msgs[msgsc]);
			return filtered && (ui_informer._lgcc = filtered);
		},
		get hpd() { return ui_improver.detectors.stateField.hpd; },
		get immortalityExpiresIn() {
			var duration = (+ui_storage.get('Logger:Immortality_Exp') || 0) - Date.now();
			if (duration > 0) {
				if (duration > 86400e3) {
					return Math.ceil(duration / 86400e3) * 86400; // this duration data is presented in days only, so basically we have no idea of hours and minutes here at all
				} else {
					return Math.ceil(duration / 60e3) * 60; // supposedly, when the duration becomes lesser than one day, we may get more precise value for it... probably. but then the data should be updated!
				}
			}
			return 0;
		},
		get isImmortal() { return this.immortalityExpiresIn !== 0 },
		get isBlessed() { return ui_stats.isBlessed(); },
		get isGoingBack() { return ui_stats.isGoingBack(); },
		get isGoingForth() { return ui_improver.detectors.stateGTF.res; },
		get isGoingGodville() { return this.isGoingToGodville; },
		get isGoingToGodville() { return ui_improver.detectors.stateGTG.res; },
		get returningToTown() { return ui_improver.detectors.stateGTG.toTown; },
		get isBattling() { return this.heroState === 'battling'; },
		get isFishing() { return this.heroState === 'fishing'; },
		get isHealing() { return this.heroState === 'healing'; },
		get isPartying() { return this.heroState === 'partying'; },
		get isPraying() { return this.heroState === 'praying'; },
		get isReturning() { return this.heroState === 'returning'; },
		get isSleeping() { return this.heroState === 'sleeping'; },
		get isTrading() { return this.heroState === 'trading'; },
		get isWaiting() { return this.heroState === 'preAdventure' || this.heroState === 'postAdventure'; },
		get isWalking() { return this.heroState === 'walking'; },
		isForecast: function(type) {
			if (!GUIp.common.forecastRegexes.hasOwnProperty(type)) {
				var legacyNames = {
					nolaying:   'noconversion',
					nodrinking: 'retirement',
					itemsloss:  'itemloss',
					cheapactivatables:     'cheapitems',
					expensiveactivatables: 'pricyitems',
					lowpoweractivatables:  'easyitems',
					selfhealing: 'resting'
				};
				if (legacyNames.hasOwnProperty(type)) { // legacy name
					type = legacyNames[type];
				} else {
					throw new Error('unknown category in gv.isForecast: "' + type + '"');
				}
			}
			return ui_improver.dailyForecast.get().includes(type);
		},
		get dailyForecast() { return ui_improver.dailyForecastText.get(); },
		get dailyForecastSpecBoss() { return ui_improver.dailyForecastSpecBoss.get(); },
		get hasTemple() { return ui_stats.hasTemple(); },
		get hasArk() { return  ui_stats.hasArk(); },
		get heroState() { return ui_stats.heroState(); },
		get heroStateText() { return ui_stats.heroStateText(); },
		get monstersKilled() { return +ui_storage.get('Logger:Monster') || 0; },
		get currentMonster() { return ui_stats.monsterName(); },
		get currentMonsterGold() { return ui_stats.monsterGold(); },
		get currentMonsterTrophy() { return ui_stats.monsterTrophy(); },
		get chosenMonster() { return ui_stats.chosenMonster(); },
		get soulMonster() { return ui_stats.soulMonster(); },
		get specialMonster() { return ui_stats.specialMonster(); },
		get strongMonster() { return ui_stats.strongMonster(); },
		get tamableMonster() { return ui_stats.tamableMonster(); },
		get wantedMonster() { return ui_stats.wantedMonster(); },
		get questName() { return ui_stats.Task_Name(); },
		get questNumber() { return ui_stats.Task_Number(); },
		get questPrize() { return this.questReward; },
		get questProgress() { return ui_stats.Task(); },
		get questReward() { return ui_stats.Task_Reward(); },
		get sideJobName() { return ui_stats.Side_Job_Name(); },
		get sideJobDuration() { return ui_stats.Side_Job_Duration(); },
		get sideJobProgress() { return ui_stats.Side_Job(); },
		get sideJobRequirements() { return ui_stats.Side_Job_Requirements(); },
		get petKnockedOut() { return ui_stats.petIsKnockedOut(); },
		get expTimeout() {
			return Math.max(0, Math.ceil((ui_timers.getGuaranteeInfo().conversion.optimistic[0] - Date.now()) / 60e3 - 1e-6));
		},
		get logTimeout() {
			return Math.max(0, Math.ceil((ui_timers.getGuaranteeInfo().dungeon.optimistic[0] - Date.now()) / 60e3 - 1e-6));
		},
		get byteTimeout() {
			return Math.max(0, Math.ceil((ui_timers.getGuaranteeInfo().mining.optimistic[0] - Date.now()) / 60e3 - 1e-6));
		},
		get byteDoubleTimeout() {
			return Math.max(0, Math.ceil((ui_timers.getGuaranteeInfo().mining.optimistic[1] - Date.now()) / 60e3 - 1e-6));
		},
		get soulTimeout() {
			return Math.max(0, Math.ceil((ui_timers.getGuaranteeInfo().souls.optimistic[0] - Date.now()) / 60e3 - 1e-6));
		},
		get soulDoubleTimeout() {
			return Math.max(0, Math.ceil((ui_timers.getGuaranteeInfo().souls.optimistic[1] - Date.now()) / 60e3 - 1e-6));
		},
		get sparTimeout() {
			return Math.max(0, Math.ceil((ui_timers.getGuaranteeInfo().spar.optimistic[0] - Date.now()) / 60e3 - 1e-6));
		},
		get getSeconds() { return ui_utils.getPreciseTime().getSeconds(); },
		get getMinutes() { return ui_utils.getPreciseTime().getMinutes(); },
		get getHours() { return ui_utils.getPreciseTime().getHours(); },
		get getHoursUTC() { return ui_utils.getPreciseTime().getUTCHours(); },
		get getHoursMSK() { return ui_utils.getPreciseTime(10800e3).getUTCHours(); },
		get getDay() { return ui_utils.getPreciseTime().getDay() || 7; },
		get getDayUTC() { return ui_utils.getPreciseTime().getUTCDay() || 7; },
		get getDayMSK() { return ui_utils.getPreciseTime(10800e3).getUTCDay() || 7; },
		get getDate() { return ui_utils.getPreciseTime().getDate(); },
		get getDateUTC() { return ui_utils.getPreciseTime().getUTCDate(); },
		get getDateMSK() { return ui_utils.getPreciseTime(10800e3).getUTCDate(); },
		get getMonth() { return ui_utils.getPreciseTime().getMonth() + 1; },
		get getMonthUTC() { return ui_utils.getPreciseTime().getUTCMonth() + 1; },
		get getMonthMSK() { return ui_utils.getPreciseTime(10800e3).getUTCMonth() + 1; },
		get voiceCooldown() { return Math.max(0,Math.ceil((ui_timeout.finishDate - Date.now()) / 1000 - 1e-6)); },
		get windowFocused() { return ui_utils.windowFocused; }
	};

	var result = this._checkConsistency(Object.keys(this.CIDstate).sort(), GUIp.common.expr.gvAPI);
	if (result.status !== 'ok') {
		ui_utils.showMessage('gv_api_consistency_error', {
			title: GUIp_i18n.error_message_title,
			content: '<strong>' + result.method + (
				result.status === 'undeclared' ? (
					'</strong> is not declared in <strong>GUIp.common.expr.gvAPI</strong> <em>(common/expr/gv_api.js)</em>.'
				) : '</strong> is not implemented in <strong>GUIp.informer.CIDstate</strong> <em>(superhero/informer.js)</em>.'
			)
		});
	}
};

ui_informer.checkCustomExpression = function() {
	var n = ui_words.base.custom_informers.length;
	var input = worker.prompt(worker.GUIp_i18n.custom_informers_input, this._debugLastExpr || (
		n ? ui_words.base.custom_informers[Math.floor(Math.random() * n)].expr : 'gv.healthPrc > 70 || gv.godpower == gv.godpowerMax'
	));
	if (!input) return;
	this._debugLastExpr = input;

	ui_utils.showMessage('custom_expression_check', {
		title: GUIp_i18n.custom_informers_check,
		content:
			'<div style="text-align: left;">' +
				'<div>' + GUIp_i18n.custom_informers_check_expr +
					'<span class="e_custom_informer_text">' + GUIp.common.escapeHTML(input) + '</span>' +
				'</div><br />' +
				ui_infdebug.formatExprHTML(input, this.CIDstate, ui_expr.makeCache(this.CIDstate)) +
			'</div>'
	});
	GUIp.common.tooltips.watchSubtree(document.querySelector('#msgcustom_expression_check .hint_bar_content'));
};
// ui_forum
var ui_forum = worker.GUIp.forum = {};

/** @type {!Array<string>} */
ui_forum.processed = []; // list of already updated topics

/** @type {boolean} */
ui_forum.altCounter = false;

ui_forum.init = function() {
	if (ui_storage.getFlag('Option:forumInformerAltCounter')) {
		ui_forum.altCounter = true;
	}
	document.body.insertAdjacentHTML('afterbegin', '<div id="forum_informer_bar"' + (ui_forum.altCounter ? ' class="fi_alt_counter"' : '') + '></div>');
	// check for possible missed notifications
	var notifications = ui_storage.list('ForumInformersNotify');
	if (notifications.length) {
		var tids = [];
		notifications = notifications.map(function(a) { return {key:a,data:JSON.parse(ui_storage.get(a))}; })
			.sort(function(a,b) { return b.data.ndate - a.data.ndate; })
			.filter(function(a) { if (tids.includes(a.data.tid)) { ui_storage.remove(a.key); return false; }; tids.push(a.data.tid); return true; });
		ui_forum._informersNotify(notifications);
	}
	ui_storage.addFallbackListener(function onTopicOpen(key, value) {
		if (key.startsWith('ForumInformersNotify')) {
			ui_forum._informersNotify([{key: key, data: JSON.parse(value)}]);
		}
	});
	var subscriptions = JSON.parse(ui_storage.get('ForumSubscriptions')) || {},
		informers = JSON.parse(ui_storage.get('ForumInformers')) || {},
		topics = Object.keys(informers),
		tid;
	// update data from cache at first since online check might be unavailable due to new insane request limit restrictions
	for (var i = 0, len = topics.length; i < len; i++) {
		tid = topics[i];
		if (!subscriptions[tid] || informers[tid].obsolete) {
			delete informers[tid];
			continue;
		}
		ui_forum._setInformer(tid, informers[tid], subscriptions[tid]);
	}
	ui_storage.set('ForumInformers', JSON.stringify(informers));
	// first attempt to check for new posts
	ui_forum._check();
	GUIp.common.setInterval(ui_forum._check.bind(ui_forum), 200*1000);
};
ui_forum._processPending = function(subscriptions, informers, pending) {
	var topic = pending.tid,
		sub = subscriptions[topic],
		inf = informers[topic],
		quiet = true,
		node;
	if (sub && pending.posts && pending.date > sub.date) {
		sub.posts = pending.posts;
		sub.date = pending.date;
		sub.by = pending.by;
		quiet = false;
		GUIp.common.debug('updating subscriptions data for tid=' + topic);
	}
	if (pending.obsolete) {
		delete informers[topic];
		ui_forum._unsetInformer(topic);
		GUIp.common.debug('removing obsolete informer for tid=' + topic);
	} else if (inf && pending.iposts) {
		inf.posts = pending.iposts;
		inf.diff = Math.max(pending.tposts - inf.posts, 1);
		GUIp.common.debug('updating informer for tid=' + topic + ' with posts=' + inf.posts + ', diff=' + inf.diff);
		if (!(node = document.getElementById('topic' + topic)) || node.lastChild.textContent != inf.diff) {
			ui_forum._setInformer(topic, inf, sub, quiet);
		}
	}
};
ui_forum._informersNotify = function(pending_notifications) {
	var subscriptions = JSON.parse(ui_storage.get('ForumSubscriptions')) || {},
		informers = JSON.parse(ui_storage.get('ForumInformers')) || {};
	for (var i = 0, len = pending_notifications.length; i < len; i++) {
		var pending = pending_notifications[i].data;
		if (pending) { // can be null, e. g., when there are more than one /superhero tab open
			GUIp.common.debug('processing forum notification: ' + JSON.stringify(pending_notifications[i]));
			ui_forum._processPending(subscriptions, informers, pending);
		}
		ui_storage.remove(pending_notifications[i].key);
	}
	ui_storage.set('ForumSubscriptions', JSON.stringify(subscriptions));
	ui_storage.set('ForumInformers', JSON.stringify(informers));
};
ui_forum._check = function() {
	var i, len, topics, subscriptions = JSON.parse(ui_storage.get('ForumSubscriptions')) || {},
		prepared = [],
		available = [],
		requests = 0;
	topics = Object.keys(subscriptions);
	if (topics.length) {
		ui_improver.showSubsLink();
	}
	if (topics.length <= 20) {
		prepared = topics;
	} else {
		topics.sort();
		// process prioritized topics
		for (i = 0, len = topics.length; i < len; i++) {
			if (subscriptions[topics[i]].rapid) {
				if (prepared.length < 19) {
					prepared.push(topics[i]);
				}
			}
		}
		// prepare a list of available topics
		for (i = 0, len = topics.length; i < len; i++) {
			if (!prepared.includes(topics[i]) && !ui_forum.processed.includes(topics[i])) {
				available.push(topics[i]);
			}
		}
		if ((prepared.length + available.length) < 20) {
			prepared = prepared.concat(available);
			ui_forum.processed = [];
			available = [];
			for (i = 0, len = topics.length; i < len; i++) {
				if (!prepared.includes(topics[i])) {
					available.push(topics[i]);
				}
			}
		}
		// append random available topics to list of prepared ones up to 20
		prepared = prepared.concat(GUIp.common.shuffleArray(available).slice(0,Math.max(20 - prepared.length,0)));
	}
	// request update if there's anything we're interested in
	if (prepared.length) {
		for (i = 0, len = prepared.length; i < len; i++) {
			prepared[i] = 'topic_ids[]=' + prepared[i];
		}
		this._request(prepared, requests++);
	}
};
ui_forum._request = function(postdata, requests) {
	GUIp.common.setTimeout(GUIp.common.postXHR.bind(null, worker.location.protocol + '//' + worker.location.host + '/forums/last_in_topics', postdata.join('&'), 'url', ui_forum._parse.bind(ui_forum)), 500*requests);
};
ui_forum._setInformer = function(tid, inf, sub, quiet) {
	var nodeID = 'topic' + tid,
		notifID = nodeID,
		informer = document.getElementById(nodeID);
	if (!informer) {
		if (quiet) return;
		if (ui_data.isMobile) {
			var node = document.getElementsByClassName('e_mt_forum_informers')[0];
			ui_utils.hideElem(node, false);
			node.insertAdjacentHTML('afterend',
				'<div class="line e_m_forum_informers_line" id="' + nodeID + '"><div class="l_text"><span class="topic"></span><span class="date"></span><div class="fr_new_badge"></div></div></div>'
			);
		} else {
			document.getElementById('forum_informer_bar').insertAdjacentHTML('beforeend',
				'<a id="' + nodeID + '" target="_blank"><span></span><div class="fr_new_badge"></div></a>'
			);
		}
		informer = document.getElementById(nodeID);
		if (ui_data.isMobile) {
			GUIp.common.addListener(informer, 'click', function(ev) {
				// just open the forum link in a new tab
				worker.open(informer.dataset.href);
				// hide the desktop notification
				ui_utils.hideNotification(notifID);
			});
			GUIp.common.addListener(informer.firstChild.lastChild, 'click', function(ev) {
				// do not open the link
				ev.stopPropagation();
				// mark informer as read
				var informers = JSON.parse(ui_storage.get('ForumInformers'));
				delete informers[tid];
				ui_storage.set('ForumInformers', JSON.stringify(informers));
				ui_forum._unsetInformer(tid);
				// hide the desktop notification
				ui_utils.hideNotification(notifID);
			});
		} else {
			GUIp.common.addListener(informer, 'click', function(ev) {
				// prevent closing Godville's pop-ups
				ev.stopPropagation();
				if (ev.button === 0 /*left*/ && !ev.ctrlKey && !ev.shiftKey && !ev.metaKey /*⌘*/) {
					// prevent following the link
					ev.preventDefault();
					// hide the informer and desktop notification
					var informers = JSON.parse(ui_storage.get('ForumInformers'));
					delete informers[tid];
					ui_storage.set('ForumInformers', JSON.stringify(informers));
					ui_forum._unsetInformer(tid);
				} else if (ev.button !== 2 /*right*/) {
					// hide the desktop notification
					ui_utils.hideNotification(notifID);
				}
			});
			GUIp.common.addListener(informer.lastChild, 'click', function(ev) {
				if (ev.button === 0 /*left*/) {
					// prevent preventing following the link
					ev.stopPropagation();
					// hide the desktop notification
					ui_utils.hideNotification(notifID);
				}
			});
		}
	}
	var page = Math.floor((sub.posts - inf.diff) / 25) + 1;
	if (ui_data.isMobile) {
		informer.dataset.href = '/forums/show_topic/' + tid + '?page=' + page + '&epost=' + (sub.posts - inf.diff + 25 - page*25 + 1);
		informer.firstChild.style.paddingLeft = (16 + String(inf.diff).length*6) + 'px';
		informer.firstChild.firstChild.textContent = sub.name;
		informer.firstChild.firstChild.nextSibling.textContent = '(' + GUIp.common.formatTime(new Date(sub.date),'forum') + ', ' + sub.by +')'; 
		informer.firstChild.lastChild.textContent = inf.diff;
	} else {
		informer.style[ui_forum.altCounter ? 'paddingLeft' : 'paddingRight'] = (16 + String(inf.diff).length*6) + 'px';
		informer.title = worker.GUIp_i18n.forum_subs_info + sub.by + ' (' + GUIp.common.formatTime(new Date(sub.date)) + ')';
		informer.href = '/forums/show_topic/' + tid + '?page=' + page + '&epost=' + (sub.posts - inf.diff + 25 - page*25 + 1);
		informer.firstChild.textContent = sub.name;
		informer.lastChild.textContent = inf.diff;
	}

	if (quiet) return;

	// desktop notification
	if (sub.notifications & 0x1) {
		ui_utils.showNotification(
			'[F] ' + ui_data.god_name,
			GUIp_i18n.plfmt('forum_subs_new_posts_', inf.diff, sub.by, sub.name),
			function() { informer.lastChild.click(); return false; },
			notifID
		);
	}
	// sound notification
	if (sub.notifications & 0x2) {
		GUIp.common.playSound(ui_storage.get('Option:forumInformerCustomSound') || 'msg', ui_storage.get('Option:forumInformerCustomSoundVolume'));
	}
};
ui_forum._unsetInformer = function(tid) {
	var informer = worker.$('#topic' + tid);
	if (informer.length) {
		informer.slideToggle("fast", function() {
			if (this.parentElement) {
				this.parentElement.removeChild(this);
				ui_informer.clearTitle();
				if (ui_data.isMobile) {
					ui_utils.hideElem(document.getElementsByClassName('e_mt_forum_informers')[0], !document.querySelectorAll('.e_m_forum_informers_line').length);
				}
			}
		});
	}
	ui_utils.hideNotification('topic' + tid);
};
ui_forum._parse = function(xhr) {
	var response;
	try {
		response = JSON.parse(xhr.responseText);
		if (response.status !== 'success' || !response.topics) {
			return;
		}
	} catch (e) {
		GUIp.common.error('unexpected response to forum subscriptions request:', xhr.responseText);
		return;
	}
	var topic, topicDate, sub, inf, diff, new_diff, last_read,
		subscriptions = JSON.parse(ui_storage.get('ForumSubscriptions')) || {},
		informers = JSON.parse(ui_storage.get('ForumInformers')) || {},
		topics = response.topics;
	for (var tid in topics) {
		topic = topics[tid];
		topicDate = +new Date(topic.last_post_at);
		sub = subscriptions[tid];
		if (!sub) continue;

		if (!ui_forum.processed.includes(tid)) {
			ui_forum.processed.push(tid);
		}
		diff = topic.cnt - sub.posts;
		if (diff <= 0 && sub.date < topicDate) {
			diff = 1;
		}
		sub.posts = topic.cnt;
		sub.date = topicDate;
		sub.name = topic.title;
		sub.by = topic.last_post_by;
		inf = informers[tid];
		if (diff > 0) {
			if (topic.last_post_by !== ui_data.god_name) {
				new_diff = inf ? (topic.cnt - inf.posts) : diff;
				last_read = inf ? inf.posts : (topic.cnt - diff);
				inf = informers[tid] = {diff: new_diff < 1 ? 1 : new_diff, posts: last_read};
			} else {
				inf = null;
				delete informers[tid];
				ui_forum._unsetInformer(tid);
			}
		} else if (diff < 0) {
			if (topic.last_post_by !== ui_data.god_name && inf && (inf.diff + diff) > 0) {
				last_read = topic.cnt > inf.posts ? inf.posts : topic.cnt;
				inf = informers[tid] = {diff: inf.diff + diff, posts: last_read};
			} else {
				inf = null;
				delete informers[tid];
				ui_forum._unsetInformer(tid);
			}
		}
		if (inf) {
			ui_forum._setInformer(tid, inf, sub, diff <= 0);
		}
	}
	ui_storage.set('ForumSubscriptions', JSON.stringify(subscriptions));
	ui_storage.set('ForumInformers', JSON.stringify(informers));
	ui_informer.clearTitle();
};
var ui_mining = GUIp.mining = {};
(function() {

/**
 * @typedef {Object} GUIp.mining.VisibleFrame
 * @property {number} step
 * @property {!GUIp.common.mining.Map} map
 * @property {number} collected - Number of bits our own boss has.
 */

/**
 * Visible and inferred data related to one datamine frame (a frame is a quarter of a step).
 *
 * @typedef {Object} GUIp.mining.Frame
 * @property {number} step
 * @property {!GUIp.common.mining.Map} map
 * @property {!Array<number>} collected
 * @property {number} destroyed
 */

/**
 * A `Frame` augmented with several useful computed properties. Does not provide any additional information besides
 * what is contained in the wrapped `Frame`; thus it is always possible to construct a `FrameEx` out of `Frame`.
 *
 * @typedef {Object} GUIp.mining.FrameEx
 * @property {!GUIp.mining.Frame} frm
 * @property {!Array<number>} pos - Positions of bosses on the map (-1 if dead).
 * @property {number} unlockedBits
 * @property {number} lockedBits
 */

// map legend can be found in common/mining.js

/**
 * @readonly
 * @type {number}
 */
ui_mining.ownBoss = -1;

/**
 * @readonly
 * @type {number}
 */
ui_mining.bitsPerByte = 8;

/**
 * @readonly
 * @type {!Object<string, boolean>}
 */
ui_mining.conditions = {};
var analysis = ui_mining.analysis = {};
(function() {

/**
 * @param {!HTMLCollection} cells
 * @returns {!GUIp.common.mining.Map}
 */
analysis.parseMap = function(cells) {
	return Array.from(cells, GUIp.common.mining.parseMapCell, ui_mining.ownBoss);
};

/**
 * @param {!HTMLCollection} cells
 * @returns {!GUIp.mining.VisibleFrame}
 */
analysis.createVisibleFrame = function(cells) {
	return {
		step: ui_stats.currentStep(),
		map: analysis.parseMap(cells),
		collected: ui_stats.Bits()
	};
};

/**
 * Create a frame with what we can see on the page. This is called only for the very first frame in the datamine.
 *
 * @private
 * @param {!GUIp.mining.VisibleFrame} vfrm
 * @returns {!GUIp.mining.Frame}
 */
var _createFrame = function(vfrm) {
	var collected = [0, 0, 0, 0];
	collected[ui_mining.ownBoss] = vfrm.collected;
	return {step: vfrm.step, map: vfrm.map, collected: collected, destroyed: 0};
};

/**
 * @param {!GUIp.mining.Frame} frm
 * @returns {!GUIp.mining.FrameEx}
 */
analysis.createFrameEx = function(frm) {
	var map = frm.map,
		pos = [-1, -1, -1, -1],
		unlockedBits = 0,
		lockedBits = 0;
	for (var p = 0, plen = map.length; p < plen; p++) {
		switch (map[p] & 0xF) {
			case 0x3: lockedBits += 2; break;
			case 0x4: unlockedBits++; break;
			case 0x5: unlockedBits += 2; break;
			case 0x8: case 0x9: case 0xA: case 0xB: // a boss
				pos[map[p] & 0x3] = p;
				break;
		}
	}
	return {frm: frm, pos: pos, unlockedBits: unlockedBits, lockedBits: lockedBits};
};

analysis._tmpArr = new Float64Array(4);

/**
 * Compare two frames and calculate all the properties we want.
 *
 * @private
 * @param {!GUIp.mining.Frame} oldFrm
 * @param {!GUIp.mining.VisibleFrame} vfrm
 * @returns {!GUIp.mining.FrameEx}
 */
var _createFrameExWithOld = function(oldFrm, vfrm) {
	var oldMap = oldFrm.map,
		newMap = vfrm.map,
		collected = oldFrm.collected.slice(),
		destroyed = oldFrm.destroyed,
		pos = [-1, -1, -1, -1],
		unlockedBits = 0,
		lockedBits = 0,
		cur = 0x0,
		tmp = 0x0,
		prev = 0x0,
		pickedUp = analysis._tmpArr;
	pickedUp[0] = pickedUp[1] = pickedUp[2] = pickedUp[3] = 0;
	// process dropped bits first
	for (var p = 0, plen = newMap.length; p < plen; p++) {
		cur = newMap[p];
		if (cur <= 0x2) continue; // fast path
		// check for destroyed bits
		tmp = cur & 0x4F;
		if (tmp >= 0x3 && tmp <= 0x5) { // bits without a skull
			if ((oldMap[p] & 0x4F) === 0x40 && destroyed) { // nothing except a skull
				// there was a skull, and now there are bits. time flowed backwards :(
				destroyed -= tmp === 0x4 ? 1 : 2;
			}
		} else if (tmp === 0x40) { // nothing except a skull
			prev = oldMap[p] & 0x4F;
			if (prev >= 0x3 && prev <= 0x5) { // bits without a skull
				// there were bits, and now there is a skull
				destroyed += prev === 0x4 ? 1 : 2;
			}
		}
		// check for dropped / picked up bits
		if ((cur & 0xF) === 0x4) { // a bit
			prev = oldMap[p];
			unlockedBits++;
			if ((prev & 0xC) === 0x8 && collected[prev &= 0x3] % ui_mining.bitsPerByte) { // a boss
				// there was a boss, and now there is a bit
				collected[prev]--;
			}
		} else if ((cur & 0xC) === 0x8) { // a boss
			prev = oldMap[p] & 0xF;
			pos[cur &= 0x3] = p;
			if (prev >= 0x3 && prev <= 0x5) { // bits
				// there were bits, and now there is a boss
				pickedUp[cur] = prev === 0x4 ? 1 : 2;
			}
		} else if ((cur &= 0xF) === 0x3 || cur === 0x5) { // bits
			prev = oldMap[p];
			if (cur === 0x3) {
				lockedBits += 2;
			} else {
				unlockedBits += 2;
			}
			if ((prev & 0xC) === 0x8) { // a boss
				// there was a boss, and now there are bits. time flowed backwards :(
				collected[prev & 0x3] -= 2; // can break a byte
			}
		}
	}
	// then process picked up bits
	collected[0] += pickedUp[0];
	collected[1] += pickedUp[1];
	collected[2] += pickedUp[2];
	collected[3] += pickedUp[3];
	// luckily, at least for our own boss we have a reliable info source
	collected[ui_mining.ownBoss] = vfrm.collected;
	return {
		frm: {step: vfrm.step, map: newMap, collected: collected, destroyed: destroyed},
		pos: pos,
		unlockedBits: unlockedBits,
		lockedBits: lockedBits
	};
};

/**
 * @param {!Array<!GUIp.mining.Frame>} frames
 * @param {!GUIp.mining.VisibleFrame} vfrm
 * @returns {{index: number, frx: !GUIp.mining.FrameEx}}
 */
analysis.findOrInsertFrame = function(frames, vfrm) {
	var len = frames.length,
		i = len,
		insIndex = 0,
		existingFrm, frx;
	while (i--) { // we are likely to receive a recent frame so search backwards
		existingFrm = frames[i];
		if (vfrm.step >= existingFrm.step) {
			if (!insIndex) insIndex = i + 1; // naive, but works in most cases
			if (vfrm.step !== existingFrm.step) {
				break;
			}
			if (GUIp.common.areArraysEqual(vfrm.map, existingFrm.map)) {
				return {index: i, frx: analysis.createFrameEx(existingFrm)};
			}
		}
	}
	if (insIndex) {
		frx = _createFrameExWithOld(frames[insIndex - 1], vfrm);
		frames[len] = null;
		frames.copyWithin(insIndex + 1, insIndex);
		frames[insIndex] = frx.frm;
	} else {
		// we have no previous frame
		frx = len ? _createFrameExWithOld(frames[0], vfrm) : analysis.createFrameEx(_createFrame(vfrm));
		frames.unshift(frx.frm);
	}
	return {index: insIndex, frx: frx};
};

/**
 * @param {!Array<!GUIp.mining.Frame>} frames
 * @param {number} len
 */
analysis.limitFrameSequenceLength = function(frames, len) {
	if (frames.length > len) {
		frames.copyWithin(0, frames.length - len);
		frames.length = len;
	}
};

})(); // ui_mining.analysis
var actions = ui_mining.actions = {};
(function() {

/**
 * @private
 * @type {?GUIp.storage.Var<!Array<!GUIp.mining.Frame>>}
 */
actions._frames = null;

/**
 * @private
 * @type {?GUIp.mining.FrameEx}
 */
actions._curFrx = null;

/**
 * @private
 * @type {!Array<string>}
 */
actions._bossTitles = [];

/**
 * @private
 * @type {?Element}
 */
actions._summaryNode = null;

actions.init = function() {
	var bossName = '',
		conditionNode;
	if (!ui_data.isMining) {
		return;
	}
	ui_storage.set('Log:current', ui_data.logId);
	ui_mining.bitsPerByte = ui_stats.Bits_Per_Byte();
	if ((conditionNode = document.getElementById('bps_ra'))) {
		ui_mining.conditions = GUIp.common.mining.parseConditions(conditionNode.textContent);
	}
	actions._frames = ui_storage.createVar('Log:' + ui_data.logId + ':data',
		function(text) { return GUIp.common.parseJSON(text) || []; },
		JSON.stringify
	);
	for (var i = 0; i < 4; i++) {
		bossName = ui_stats.EnemySingle_Name(i + 1);
		actions._bossTitles[i] = bossName[0] === '@' ? (
			ui_mining.ownBoss = i,
			'$&: '
		) : (
			bossName.slice(4, -1) + ' (' + (ui_stats.EnemySingle_Godname(i + 1) || '?') + '):\xA0'
		).replace(/\$/g, '$$$$');
	}
	GUIp.common.tooltips.watchSubtree(document.getElementsByClassName('wrmap')[0]);
};

/**
 * @private
 * @param {!GUIp.mining.VisibleFrame} vfrm
 * @returns {!GUIp.mining.FrameEx}
 */
var _updateModel = function(vfrm) {
	var frames = actions._frames.get(),
		f = analysis.findOrInsertFrame(frames, vfrm);
	if (f.index === frames.length - 1) {
		analysis.limitFrameSequenceLength(frames, 4); // keep all frames of the current step
	}
	actions._frames.save();
	return f.frx;
};

/**
 * @private
 * @param {!GUIp.mining.FrameEx} frx
 * @param {!Element} mapBlock
 */
var _showBitsSummary = function(frx, mapBlock) {
	var frm = frx.frm,
		collected = frm.collected,
		totalCollected = collected[0] + collected[1] + collected[2] + collected[3],
		s = GUIp_i18n.bits_summary +
			'<abbr title="' + GUIp_i18n.fmt('bits_free', frx.unlockedBits + ' + ' + frx.lockedBits) + '">' +
			(frx.unlockedBits + frx.lockedBits) +
			'</abbr> + <abbr title="' + GUIp_i18n.fmt('bits_collected', collected.join('\xA0+\xA0')) + '">' +
			totalCollected +
			'</abbr> = <abbr title="' + GUIp_i18n.bits_total + '">' +
			(frx.unlockedBits + frx.lockedBits + totalCollected + frm.destroyed) +
			'</abbr>';
	if (frm.destroyed) {
		s += ' − <abbr title="' + GUIp_i18n.bits_destroyed + '">' + frm.destroyed + '</abbr>';
	}
	if (actions._summaryNode) {
		actions._summaryNode.innerHTML = s;
	} else {
		mapBlock = mapBlock.getElementsByClassName('wrmap')[0].parentNode;
		mapBlock.insertAdjacentHTML('beforeend', '<div class="e_bits_summary' + (GUIp.common.isAndroid ? ' e_select_disabled' : '') + '">' + s + '</div>');
		actions._summaryNode = mapBlock.lastChild;
		GUIp.common.tooltips.watchSubtree(actions._summaryNode);
	}
};

/**
 * @private
 * @returns {?HTMLCollection}
 */
var _getStepMarks = function() {
	var bar = document.getElementById('turn_pbar');
	return bar && bar.getElementsByClassName('st_div');
};

/**
 * You should perform any desired manipulations with step marks prior to calling this function.
 *
 * @private
 * @param {!GUIp.mining.FrameEx} frx
 * @param {number} step
 * @param {?HTMLCollection} stepMarks
 */
var _highlightImportantStep = function(frx, step, stepMarks) {
	var shouldHighlight = !!frx.lockedBits && (
			ui_mining.conditions.clarity ? step <= 4 || !(step % 3) : step >= 6 && !((step - 1) % 5)
		),
		a, b;
	if (stepMarks && (a = stepMarks[3 - ui_mining.ownBoss])) {
		if (shouldHighlight) {
			a.classList.add('e_important_step_mark');
			a.classList.remove('hidden');
		} else {
			a.classList.remove('e_important_step_mark');
		}
	}
	a = ui_data.isMobile ? document.getElementsByClassName('e_mt_fight_log')[0] : document.querySelector('#r_map .block_title');
	if (a && (b = a.getElementsByClassName('e_step')[0])) {
		b.classList.toggle('e_important_step', shouldHighlight);
		b.title = shouldHighlight ? GUIp_i18n.rmap_important_step : '';
	} else if (shouldHighlight) {
		a.innerHTML = a.innerHTML.replace(/\(((?:шаг|step) \d+)\)/,
			'<span class="e_step e_important_step" title="' + GUIp_i18n.rmap_important_step +
			'">(<span class="e_step_inner">$1</span>)</span>'
		);
	}
};

/**
 * The main entry point for datamine-related code.
 */
actions.processMap = function() {
	var settings = ui_storage.getList('Option:rangeMapSettings'),
		replaceWithAlpha = settings.includes('balph'),
		mapBlock = ui_data.isMobile ? document.getElementsByClassName('wrmap')[0].parentNode : document.getElementById('r_map'),
		stepMarks = _getStepMarks(),
		i = 0,
		pos = 0,
		len = 0,
		cell, cells, vfrm;
	if (!mapBlock) {
		GUIp.common.error('no map block for mining found');
		return;
	}
	cells = mapBlock.getElementsByClassName('rmc');
	vfrm = analysis.createVisibleFrame(cells);
	actions._curFrx = _updateModel(vfrm);
	mapBlock.classList.toggle('e_rmap_grid', settings.includes('grid'));
	for (i = 0; i < 4; i++) {
		if ((pos = actions._curFrx.pos[i]) < 0) continue;
		len = actions._curFrx.frm.collected[i];
		cell = cells[pos].firstElementChild;
		if (!cell) continue;
		cell.title = cell.title.replace(/(?:ваш|чужой) босс|(?:Your|Other) Boss|$/,
			actions._bossTitles[i] +
			(len >= ui_mining.bitsPerByte ? Math.floor(len / ui_mining.bitsPerByte) + '+[' : '[') +
			len % ui_mining.bitsPerByte + ']'
		);
		if (replaceWithAlpha && i === ui_mining.ownBoss) {
			cell.textContent = String.fromCharCode(i + 65); // 'A'
		}
	}
	_showBitsSummary(actions._curFrx, mapBlock);
	if (stepMarks) {
		// hide marks for bosses that will not move anymore (e.g., because they are dead)
		for (pos = 0, len = stepMarks.length; pos < len; pos++) {
			i = (pos + ui_mining.ownBoss + 1) & 0x3;
			stepMarks[pos].classList.toggle('hidden',
				actions._curFrx.pos[i] < 0 || (vfrm.step === 40 && i < ui_mining.ownBoss)
			);
		}
	}
	_highlightImportantStep(actions._curFrx, vfrm.step, stepMarks);
};

/**
 * An alternative entry point used when step number has changed but map hasn't. This function exists not only
 * as optimization but to prevent double-improving as well.
 */
actions.processStepChange = function() {
	var step = ui_stats.currentStep(),
		stepMarks = _getStepMarks();
	if (step === 40 && stepMarks) {
		for (var i = 3 - ui_mining.ownBoss, len = stepMarks.length; i < len; i++) {
			stepMarks[i].classList.add('hidden');
		}
	}
	_highlightImportantStep(actions._curFrx, step, stepMarks);
};

})(); // ui_mining.actions

ui_mining.init = actions.init;
ui_mining.processMap = actions.processMap;
ui_mining.processStepChange = actions.processStepChange;

})(); // ui_mining
// ui_dragger
var ui_dragger = GUIp.dragger = {};

ui_dragger.init = function() {
	ui_dragger._onMouseDown = GUIp.common.try2.bind(null, ui_dragger._onMouseDown);
	ui_dragger._onContextMenu = GUIp.common.try2.bind(null, ui_dragger._onContextMenu);
	ui_dragger._onMouseUp = GUIp.common.try2.bind(null, ui_dragger._onMouseUp);
};

ui_dragger._$target = null;
ui_dragger._timer = 0;
ui_dragger._finishing = false;

/** @const */
ui_dragger._mouseEventProps = [
	'altKey', 'clientX', 'clientY', 'ctrlKey', 'fromElement', 'layerX', 'layerY', 'metaKey', 'movementX', 'movementY',
	'offsetX', 'offsetY', 'pageX', 'pageY', 'relatedTarget', 'screenX', 'screenY', 'shiftKey', 'toElement', 'x', 'y'
];

/**
 * @private
 * @param {!MouseEvent} original
 * @param {!Object} fake
 * @returns {!MouseEvent}
 */
ui_dragger._forgeMouseEvent = function(original, fake) {
	var key = '';
	for (var i = 0, len = ui_dragger._mouseEventProps.length; i < len; i++) {
		key = ui_dragger._mouseEventProps[i];
		fake[key] = original[key];
	}
	return fake;
};

/**
 * @private
 * @param {!MouseEvent} ev
 * @param {number} dx
 * @param {number} dy
 * @returns {!MouseEvent}
 */
ui_dragger._adjustEventCoords = function(ev, dx, dy) {
	ev.clientX += dx;
	ev.clientY += dy;
	ev.screenX += dx;
	ev.screenY += dy;
	if (typeof ev.layerX === 'number') {
		ev.layerX += dx;
		ev.layerY += dy;
	}
	if (typeof ev.movementX === 'number') {
		ev.movementX += dx;
		ev.movementY += dy;
	}
	if (typeof ev.offsetX === 'number') {
		ev.offsetX += dx;
		ev.offsetY += dy;
	}
	if (typeof ev.pageX === 'number') {
		ev.pageX += dx;
		ev.pageY += dy;
	}
	if (typeof ev.x === 'number') {
		ev.x += dx;
		ev.y += dy;
	}
	return ev;
};

/**
 * @private
 * @param {!MouseEvent} ev
 */
ui_dragger._start = function(ev) {
	ui_dragger._finishing = false;
	ui_dragger._$target = $(ev.target);
	// emulate holding left button
	ui_dragger._$target.trigger(ui_dragger._forgeMouseEvent(ev, {type: 'mousedown', button: 0, buttons: 0x1, which: 1}));
	// start hooking clicks
	worker.addEventListener('mousedown', ui_dragger._onMouseDown, true);
	worker.addEventListener('contextmenu', ui_dragger._onContextMenu, true);
	worker.addEventListener('mouseup', ui_dragger._onMouseUp, true);
	ui_dragger._timer = GUIp.common.setTimeout(function() {
		ui_dragger._timer = 0;
		// emulate a mouse move so that visuals are shown
		ui_dragger._$target.trigger(ui_dragger._adjustEventCoords(
			ui_dragger._forgeMouseEvent(ev, {type: 'mousemove', button: 0, buttons: 0x1, which: 0}),
			12, 12
		));
	}, 125); // Godville ignores 'mousemove' for the first 100ms
};

/**
 * @private
 * @param {!MouseEvent} ev
 */
ui_dragger._finish = function(ev) {
	// stop hooking clicks
	worker.removeEventListener('mousedown', ui_dragger._onMouseDown, true);
	worker.removeEventListener('contextmenu', ui_dragger._onContextMenu, true);
	worker.removeEventListener('mouseup', ui_dragger._onMouseUp, true);
	// emulate releasing left button
	ui_dragger._$target.trigger(ui_dragger._forgeMouseEvent(ev, {type: 'mouseup', button: 0, buttons: 0x1, which: 1}));
	ui_dragger._$target = null;
	if (ui_dragger._timer) {
		clearTimeout(ui_dragger._timer);
		ui_dragger._timer = 0;
	}
};

/**
 * @private
 * @param {!MouseEvent} ev
 */
ui_dragger._onMouseDown = function(ev) {
	// allow only right mouse button to be clicked
	if (ev.button === 2) {
		ui_dragger._finishing = true;
	} else {
		ev.preventDefault();
		ev.stopPropagation();
	}
};

/**
 * @private
 * @param {!MouseEvent} ev
 */
ui_dragger._onContextMenu = function(ev) {
	// the user has performed a long tap (i.e., has clicked right mouse button)
	ev.preventDefault();
	// prevent mobile browser from selecting the word that is being tapped
	worker.getSelection().removeAllRanges();
	ui_dragger._finish(ev);
};

/**
 * @private
 * @param {!MouseEvent} ev
 */
ui_dragger._onMouseUp = function(ev) {
	// Godville stops dragging as soon as any button is released, not only left one. unfortunately, right mouse button
	// is released just after we enter drag mode. so we need to block it, too.
	if (ui_dragger._finishing && ev.button === 2) {
		// 'contextmenu' fires before 'mouseup', and we remove our listeners in `_finish`, so we shouldn't get here.
		// if, however, 'contextmenu' is somehow skipped and the control has reached this point, we'd better stop doing
		// what we are doing.
		GUIp.common.warn('touch dragger has not recevied "contextmenu" event');
		ui_dragger._finish(ev);
	} else {
		ev.stopPropagation();
	}
};

/**
 * @private
 * @param {!MouseEvent} ev
 */
ui_dragger._enterDragMode = function(ev) {
	if (!GUIp.common.isTouching || ui_dragger._$target) return;
	ev.preventDefault();
	// prevent mobile browser from selecting the word that is being tapped
	worker.getSelection().removeAllRanges();
	ui_dragger._start(ev);
};

/**
 * @param {!Element} draggable
 */
ui_dragger.register = function(draggable) {
	GUIp.common.addListener(draggable, 'contextmenu', ui_dragger._enterDragMode);
};
// ui_improver
var ui_improver = worker.GUIp.improver = {};

ui_improver.isFirstTime = true;
ui_improver.clockToggling = false;
ui_improver.clock = null;
ui_improver.wantedItems = null;
ui_improver.wantedMonsterRewards = null;
ui_improver.dailyForecast = null;
ui_improver.dailyForecastText = null;
ui_improver.dailyForecastSpecBoss = null;
ui_improver.bingoTries = null;
ui_improver.bingoItems = null;
ui_improver.improvementDebounce = null;
// dungeon & sailing
ui_improver.chronicles = {};
ui_improver.directionlessMoves = null;
ui_improver.wormholeMoves = null;
ui_improver.dungeonGuidedSteps = null;
ui_improver.allsHP = {a:[], e:[], sum: 0};
ui_improver.corrections = {n: 'north', e: 'east', s: 'south', w: 'west'};
ui_improver.dungeonXHRCount = 0;
ui_improver.dungeonExtras = {};
ui_improver.needLog = true;
// resresher
ui_improver.softRefreshInt = 0;
ui_improver.hardRefreshInt = 0;

ui_improver.init = function() {
	ui_improver.improvementDebounce = GUIp.common.debounce(250, function improvementDebounce() {
		ui_improver.improve();
		if (ui_data.isFight) {
			ui_logger.update();
		}
	});
};
ui_improver.softRefresh = function() {
	GUIp.common.info('soft reloading...');
	document.getElementById('d_refresh') && document.getElementById('d_refresh').click();
};
ui_improver.hardRefresh = function() {
	GUIp.common.warn('hard reloading...');
	location.reload();
};
ui_improver.improve = function() {
	this.improveInProcess = true;

	if (this.isFirstTime) {
		if (GUIp_browser === 'Opera') {
			document.body.classList.add('e_opera');
		}
		if (!ui_data.isFight && !ui_data.isDungeon && !ui_data.isSail) {
			ui_improver.improveDiary();
			ui_improver.distanceInformerInit();
			ui_improver.improveShop();
		}
		if (ui_data.isDungeon) {
			ui_improver.initStreaming(document.querySelector('#m_fight_log .block_content, .e_m_fight_log'));
			var heroNames = ui_stats.Hero_Ally_Names();
			heroNames.push(ui_data.char_name);
			GUIp.common.setExtraDiscardData(heroNames);
			this.dungeonExtras = JSON.parse(ui_storage.get('Log:' + ui_data.logId + ':extras') || '{}'); // even after this we need to reparse again in case we missed something
			if (!ui_data.isMobile) {
				this.parseDungeonExtras(document.querySelectorAll('#m_fight_log .d_imp .d_msg'), document.querySelector('#map .block_content > div > div'), ui_stats.currentStep());
			} else {
 				var node;
 				if (node = document.getElementById('dmap_icon')) {
					// same thing as for hmap (see improveInterface) and same bug goes for dungeons and their map
					// we must call this earlier since many things depend on the properly marked map, and improveInterface
					// is called too late for that
					node.click();
					// wup observers are too slow, we'll just run improver directly
					this.improveDmapMenu();
					// and immediately close the map like no one has seen it!
					node.click();
				}
			}
			GUIp.common.getDungeonPhrases(ui_improver.improveChronicles.bind(ui_improver),null);
			GUIp.common.dmapAuxCache = JSON.parse(ui_storage.get('Log:' + ui_data.logId + ':auxcache') || '{}');
			GUIp.common.dmapDisabledPointersCache = JSON.parse(ui_storage.get('Log:' + ui_data.logId + ':dptr') || '[]');
		}
		if (ui_data.isSail) {
			var mapSettings = ui_storage.getList('Option:islandsMapSettings');
			if (mapSettings.includes('widen')) {
				ui_improver.sailPageResize = true;
				ui_improver.whenWindowResize();
			}
			ui_improver.initSailing();
		}
		if (ui_data.isMining) {
			ui_mining.processMap();
		}
		if (ui_data.isFight) {
			GUIp.common.cleanupLogStorage();
			GUIp.common.setTimeout(ui_improver.improvePlayers, 250);
			ui_improver.addLastFightLink();
		}
		ui_improver.initTouchDragging();
	}
	ui_improver.improveStats();
	ui_improver.improveVoiceDialog();
	if (!ui_data.isFight) {
		ui_improver.improveNews();
		ui_improver.improveEquip();
		ui_improver.improveSkills();
		ui_improver.improvePet();
		ui_improver.improveSendButtons();
		ui_improver.detectors.detectField();
		if (ui_data.hasShop) {
			ui_improver.detectors.detectLS();
		}
		if (ui_data.isMobile) {
			// this is mostly for hp in #statusbar
			ui_improver.improveHP();
		}
	} else {
		if (ui_improver.isFirstTime) {
			ui_logger.update();
		} else {
			// Godville makes a tiny delay before assigning inline styles to players. we have to wait
			// until they're completed.
			ui_improver.improvePlayers();
		}
		ui_improver.improveHP();
		ui_improver.improveColumnWithMap();
	}
	if (ui_data.isDungeon) {
		ui_improver.improveDungeon();
	}
	ui_improver.improveInterface();
	ui_improver.improveChat();
	ui_improver.calculateButtonsVisibility();
	this.isFirstTime = false;
	this.improveInProcess = false;

	ui_informer.update('fight', ui_data.isFight && !ui_data.isDungeon && !ui_data.isSail);
	ui_informer.update('arena available', ui_stats.isArenaAvailable());
	ui_informer.update('dungeon available', ui_stats.isDungeonAvailable());
	ui_informer.update('sail available', ui_stats.isSailAvailable());
	ui_informer.update('datamine available', ui_stats.isMiningAvailable());

	ui_informer.updateCustomInformers();
};
ui_improver.improveVoiceDialog = function() {
	var map;
	// If playing in pure ZPG mode there won't be present voice input block at all;
	if (!document.getElementById('ve_wrap')) {
		return;
	}
	// Add voicegens and show timeout bar after saying
	if (this.isFirstTime) {
		this.freezeVoiceButton = ui_storage.createVar('Option:freezeVoiceButton', function(text) { return text || ''; });
		ui_utils.updateVoiceSubmitState();

		var voiceSubmit = document.getElementById('voice_submit');
		document.getElementById('ve_wrap').insertAdjacentHTML('afterbegin',
			'<div id="clear_voice_input" class="div_link_nu gvl_popover hidden" title="' + worker.GUIp_i18n.clear_voice_input + '">×</div>'
		);
		GUIp.common.addListener(document.getElementById('clear_voice_input'), 'click', function() {
			ui_utils.setVoice('');
		});
		worker.$(document).on('change keypress paste focus textInput input', '#godvoice, #god_phrase', function() {
			GUIp.common.try2(function(target) {
				ui_utils.updateVoiceSubmitState();
				ui_utils.hideElem(document.getElementById('clear_voice_input'), !target.value);
			}, this);
		});
		GUIp.common.addListener(document.getElementById('ve_wrap'), 'keypress', function(e) {
			if (e.which !== 13) return;
			if (voiceSubmit.disabled) {
				e.preventDefault();
				e.stopPropagation();
			}
		}, true);
		GUIp.common.addListener(voiceSubmit, 'click', function() {
			voiceSubmit.blur();
		});
		// prevent Godville from re-enabling the button when we want to keep it disabled
		GUIp.common.newMutationObserver(ui_utils.updateVoiceSubmitState.bind(ui_utils))
			.observe(voiceSubmit, {attributes: true, attributeFilter: ['disabled']});

		if (!ui_utils.isAlreadyImproved(document.getElementById('cntrl'))) {
			var gp_label = document.getElementsByClassName('gp_label')[0];
			gp_label.classList.add('l_capt');
			document.getElementsByClassName('gp_val')[0].classList.add('l_val');
			if (ui_words.base.phrases.mnemonics.length) {
				ui_utils.addVoicegen(gp_label, worker.GUIp_i18n.mnemo_button, 'mnemonics', worker.GUIp_i18n.mnemo_title);
			}
			if (ui_data.isDungeon) {
				ui_utils.addVoicegen(gp_label, worker.GUIp_i18n.upstairs, 'go_upstairs', worker.GUIp_i18n.fmt('ask_to_go_upstairs', ui_data.char_sex[0]));
				ui_utils.addVoicegen(gp_label, worker.GUIp_i18n.downstairs, 'go_downstairs', worker.GUIp_i18n.fmt('ask_to_go_downstairs', ui_data.char_sex[0]));
				ui_utils.addVoicegen(gp_label, worker.GUIp_i18n.east, 'go_east', worker.GUIp_i18n.fmt('ask_to_go_east', ui_data.char_sex[0]));
				ui_utils.addVoicegen(gp_label, worker.GUIp_i18n.west, 'go_west', worker.GUIp_i18n.fmt('ask_to_go_west', ui_data.char_sex[0]));
				ui_utils.addVoicegen(gp_label, worker.GUIp_i18n.south, 'go_south', worker.GUIp_i18n.fmt('ask_to_go_south', ui_data.char_sex[0]));
				ui_utils.addVoicegen(gp_label, worker.GUIp_i18n.north, 'go_north', worker.GUIp_i18n.fmt('ask_to_go_north', ui_data.char_sex[0]));
				if ((map = document.getElementById('map'))) {
					if (GUIp.common.isAndroid) {
						GUIp.common.addListener(map, 'click', ui_utils.mapVoicegen);
					}
					GUIp.common.tooltips.watchSubtree(map.getElementsByClassName('block_content')[0]);
				}
			} else if (!ui_data.isSail) {
				if (ui_data.isFight) {
					ui_utils.addVoicegen(gp_label, worker.GUIp_i18n.defend, 'defend', worker.GUIp_i18n.fmt('ask_to_defend', ui_data.char_sex[0]));
					ui_utils.addVoicegen(gp_label, worker.GUIp_i18n.pray, 'pray', worker.GUIp_i18n.fmt('ask_to_pray', ui_data.char_sex[0]));
					ui_utils.addVoicegen(gp_label, worker.GUIp_i18n.heal, 'heal', worker.GUIp_i18n.fmt('ask_to_heal', ui_data.char_sex[1]));
					ui_utils.addVoicegen(gp_label, worker.GUIp_i18n.hit, 'hit', worker.GUIp_i18n.fmt('ask_to_hit', ui_data.char_sex[1]));
				} else {
					ui_utils.addVoicegen(gp_label, worker.GUIp_i18n.sacrifice, 'sacrifice', worker.GUIp_i18n.fmt('ask_to_sacrifice', ui_data.char_sex[1]));
					ui_utils.addVoicegen(gp_label, worker.GUIp_i18n.pray, 'pray', worker.GUIp_i18n.fmt('ask_to_pray', ui_data.char_sex[0]));
				}
			}
		}
	}
	//hide_charge_button
	var charge_button = document.querySelector('#cntrl .hch_link');
	if (charge_button) {
		charge_button.style.visibility = ui_storage.getFlag('Option:hideChargeButton') ? 'hidden' : '';
	}
	ui_informer.update('full godpower', ui_stats.Godpower() === ui_stats.Max_Godpower() && !ui_data.isFight);
};
ui_improver._formatPetFeature = function(feature) {
	return GUIp_i18n['pet_feature_' + feature];
};
ui_improver._formatMonsterTitle = function(monster, isTamable) {
	var result = ui_improver.wantedMonsterRewards.get()[monster] || '',
		pet;
	if (isTamable && (pet = ui_words.base.pets[monster])) {
		if (result) result += '\n\n';
		result += GUIp_i18n.fmt('tamable_monster', Array.from(pet.features, ui_improver._formatPetFeature).join(', '));
	}
	return result;
};
ui_improver._improveMonsterNameHTML = function(html, putPetLink) {
	// must not be called twice
	return html.replace(/\uD83E\uDDB4 /g, // bone
		putPetLink ? (
			// we use `white-space: nowrap` instead of `&nbsp;` since the latter might cause unexpected results
			// in custom informers (`gv.lastDiary`, etc.) and user scripts
			'<span class="e_nowrap"><a class="div_link_nu e_emoji e_emoji_bone eguip_font" href="' +
				GUIp_i18n.wiki_pets_table +
			'" title="' + GUIp_i18n.open_wiki_pets_table +
			'" target="_blank">\uD83E\uDDB4</a> </span>'
		) : '<span class="e_nowrap"><span class="e_emoji e_emoji_bone eguip_font">\uD83E\uDDB4</span> </span>'
	).replace(/☠ /g,
		'<span class="e_nowrap"><span class="e_emoji e_emoji_skull' +
			(GUIp.common.renderTester.testChar('☠') ? '' : ' eguip_font') +
		'">☠</span> </span>'
	);
};
ui_improver.improveMonsterName = function() {
	var div = document.querySelector('#news_pb .line .l_val'),
		title = '';
	if (div && !div.getElementsByClassName('improved')[0]) {
		title = div.textContent;
		if ((title = ui_improver._formatMonsterTitle(
			ui_stats.canonicalMonsterName(title).toLowerCase(), title.includes('\uD83E\uDDB4') // bone
		))) {
			title = GUIp.common.escapeHTML(title);
			GUIp.common.tooltips.watchSubtree(div);
		}
		div.innerHTML = '<span class="improved' + (title && '" title="' + title) + '">' +
			ui_improver._improveMonsterNameHTML(div.innerHTML, true) +
		'</span>';
	}
	div = document.getElementsByClassName('f_news')[0];
	if (div && !div.getElementsByClassName('improved')[0]) {
		div.innerHTML = '<span class="improved">' +
			ui_improver._improveMonsterNameHTML(div.innerHTML, false) +
		'</span>';
	}
};
ui_improver.improveNews = function() {
	var node, news = document.getElementById('news_pb');
	if (!ui_utils.isAlreadyImproved(news)) {
		ui_utils.addVoicegen(news.getElementsByClassName('l_capt')[0], worker.GUIp_i18n.hit, 'hit', worker.GUIp_i18n.fmt('ask_to_hit', ui_data.char_sex[1]));
		Array.prototype.forEach.call(news.getElementsByClassName('p_bar'), GUIp.common.tooltips.watchSubtree);
		// make a way to easier refer to news block title
		// and add an observer for timely reparsing its contents
		if (ui_data.isMobile) {
			node = news.previousElementSibling;
		} else {
			node = document.querySelector('#news .block_title');
		}
		if (node && node.textContent) {
			var parseState = function() {
				var state, text = node.textContent.split(/[. ]/)[0];
				if (['Бой','Fighting'].includes(text)) {
					state = 'battling';
				} else if (['Дорога','Questing'].includes(text)) {
					state = 'walking';
				} else if (['Возврат','Returning'].includes(text)) {
					state = 'returning';
				} else if (['Лечение','Healing'].includes(text)) {
					state = 'healing';
				} else if (['Торговля','Trading'].includes(text)) {
					state = 'trading';
				} else if (['Отдых','Partying'].includes(text)) {
					state = 'partying';
				} else if (['Сон','Sleeping'].includes(text)) {
					state = 'sleeping';
				} else if (['Молитва','Praying'].includes(text)) {
					state = 'praying';
				} else if (['Рыбалка','Fishing'].includes(text)) {
					state = 'fishing';
				} else if (['Авантюра','Waiting'].includes(text)) {
					state = 'preAdventure';
				} else if (['Геройство','Бытиё','Adventuring','Being'].includes(text)) {
					state = 'postAdventure';
				} else if (['Спекуляция','Shopkeeping'].includes(text)) {
					state = 'profiteering';
				} else if (['Смерть','Decomposing'].includes(text)) {
					state = 'dying';
				} else {
					state = 'unparsed';
				}
				node.dataset.state = state;
			};
			GUIp.common.newMutationObserver(parseState).observe(node, {childList: true});
			parseState();
			node.classList.add('e_hero_state');
		}
	}
	ui_improver.improveMonsterName();
	ui_informer.update('wanted monster', ui_stats.wantedMonster());
	ui_informer.update('special monster', ui_stats.specialMonster());
	ui_informer.update('tamable monster', ui_stats.tamableMonster());
	ui_informer.update('chosen monster', ui_stats.chosenMonster());
};
ui_improver.improveColumnWithMap = function() {
	if (ui_storage.getFlag('Option:disableMapColumnImprover')) {
		return;
	}
	var oldColumn = document.getElementsByClassName('e_map_column')[0],
		node = document.getElementById('s_map') || document.getElementById('r_map') || document.getElementById('map'),
		pageClasses;
	for (; node; node = node.parentElement) {
		if (node.classList.contains('group_wrapper')) {
			if (node === oldColumn) return; // no changes
			node.classList.add('e_map_column');
			pageClasses = document.getElementById('main_wrapper').classList;
			if (node.classList.contains('c_col')) {
				pageClasses.add('e_map_in_c_col');
				pageClasses.remove('e_map_in_s_col');
			} else {
				pageClasses.add('e_map_in_s_col');
				pageClasses.remove('e_map_in_c_col');
			}
			break;
		}
	}
	if (oldColumn) {
		oldColumn.classList.remove('e_map_column');
	}
};
ui_improver.improveDungeon = function() {
	if (this.isFirstTime) {
		ui_storage.addListener('Option:dungeonMapSettings', function(newValue) {
			ui_utils.hideElem(document.getElementsByClassName('dmapDimensions')[0], !(newValue || '').includes('dims'));
		});
	}
	var i, j, mstep = +Object.keys(this.chronicles).pop(),
		box = document.querySelectorAll('#cntrl .voice_generator'),
		rows = document.getElementsByClassName('dml'),
		cells = Array.prototype.map.call(document.getElementsByClassName('dmc'), function(a) { return a.textContent; }),
		kRow = rows.length,
		kColumn = rows[0] && rows[0].children.length,
		isJumping = GUIp.common.checkParsedDungeonType(this.dungeonExtras, 'jumping');
	// if we don't have voice generator buttons OR the map (which is quite possible on mobile at an earily opened page), then we have no need to continue
	if (!box.length || !kRow) {
		return;
	}
	for (i = 0; i < 6; i++) {
		if (i < 4) {
			box[i].style.visibility = 'hidden';
		} else {
			box[i].style.display = 'none';
		}
	}
	var isCellar = GUIp.common.isDungeonCellar();
	for (var si = 0; si < kRow; si++) {
		for (var sj = 0; sj < kColumn; sj++) {
			if (cells[si * kColumn + sj] !== '@') {
				continue;
			}
			var isMoveLoss = [];
			for (i = 0; i < 4; i++) {
				isMoveLoss[i] = this.chronicles[mstep - i] && this.chronicles[mstep - i].marks.includes('trapMoveLoss');
			}
			var directionsShouldBeShown = !isMoveLoss[0] || (isMoveLoss[1] && (!isMoveLoss[2] || isMoveLoss[3]));
			if (directionsShouldBeShown) {
				if (cells[(si - 1) * kColumn + sj] !== '#' || isJumping && (si === 1 || si !== 1 && cells[(si - 2) * kColumn + sj] !== '#')) {
					box[0].style.visibility = ''; // north
				}
				if (cells[(si + 1) *kColumn + sj] !== '#' || isJumping && (si === kRow - 2 || si !== kRow - 2 && cells[(si + 2) *kColumn + sj] !== '#')) {
					box[1].style.visibility = ''; // south
				}
				if (cells[si * kColumn + sj - 1] !== '#' || isJumping && cells[si * kColumn + sj - 2] !== '#') {
					box[2].style.visibility = ''; // west
				}
				if (cells[si * kColumn + sj + 1] !== '#' || isJumping && cells[si * kColumn + sj + 2] !== '#') {
					box[3].style.visibility = ''; // east
				}
				if (this.chronicles[mstep] && (this.chronicles[mstep].marks.includes('staircaseHint') || this.chronicles[mstep].marks.includes('staircase')) &&
					(ui_data.availableGameModes.includes('mining') || ui_data.availableGameModes.includes('souls'))) {
					if (!isCellar) {
						box[4].style.display = ''; // downstairs
					} else {
						box[5].style.display = ''; // upstairs
					}
				}
				if (isJumping && ui_storage.getFlag('Option:jumpingOverrideDirections')) {
					for (i = 0; i < 4; i++) {
						box[i].style.visibility = '';
					}
				}
			}
		}
	}
};
ui_improver._toFixedPoint = function(m0) {
	return (+m0).toFixed(1);
};
ui_improver.improveStats = function() {
	var i, brNode, handler;
	if ((brNode = document.querySelector('#hk_bricks_cnt .l_val'))) {
		brNode.textContent = brNode.textContent.replace(/[\d.]+/, this._toFixedPoint);
	}
	if (ui_improver.isFirstTime) {
		Array.prototype.forEach.call(
			document.querySelectorAll(ui_data.isMobile ? '.e_mt_stats ~ .line .p_bar' : '#stats .p_bar, #o_hl1 .p_bar, #m_info .p_bar, #b_info .p_bar'),
			GUIp.common.tooltips.watchSubtree
		);
	}
	if (ui_data.isDungeon) {
		if (ui_storage.get('Logger:Location') === 'Field') {
			ui_storage.set('Logger:Location', 'Dungeon');
			ui_storage.set('Logger:Map_HP', ui_stats.HP());
			ui_storage.set('Logger:Map_Exp', ui_stats.Exp());
			ui_storage.set('Logger:Map_Level', ui_stats.Level());
			ui_storage.set('Logger:Map_Gold', ui_storage.get('Logger:Gold'));
			ui_storage.set('Logger:Map_Inv', ui_stats.Inv());
			ui_storage.set('Logger:Map_Charges',ui_stats.Charges());
			ui_storage.set('Logger:Map_Alls_HP', ui_stats.Map_Alls_HP());
			for (i = 1; i <= 5; i++) {
				ui_storage.set('Logger:Map_Ally'+i+'_HP', ui_stats.Map_Ally_HP(i));
			}
		}
		ui_informer.update('low health', ui_stats.lowHealth('dungeon'));
		return;
	}
	if (ui_data.isSail) {
		if (ui_storage.get('Logger:Location') === 'Field') {
			ui_storage.set('Logger:Location', 'Sail');
			ui_storage.set('Logger:Map_HP', ui_stats.HP());
			ui_storage.set('Logger:Map_Charges',ui_stats.Charges());
			ui_storage.set('Logger:Map_Supplies',ui_stats.Map_Supplies());
			for (i = 1; i <= 4; i++) {
				ui_storage.set('Logger:Map_Ally'+i+'_HP', ui_stats.Map_Ally_HP(i));
			}
			for (i = 1; i <= 4; i++) {
				ui_storage.set('Logger:Enemy'+i+'_Name', '');
			}
		}
		ui_informer.update('low health', ui_stats.lowHealth('sail'));
		return;
	}
	if (ui_data.isMining) {
		if (ui_storage.get('Logger:Location') === 'Field') {
			ui_storage.set('Logger:Location', 'Mining');
			ui_storage.set('Logger:Hero_HP', ui_stats.HP());
			ui_storage.set('Logger:Map_Charges',ui_stats.Charges());
			ui_storage.set('Logger:Bits',ui_stats.Bits());
			ui_storage.set('Logger:Bytes',ui_stats.Bytes());
			ui_storage.set('Logger:Push_Readiness',ui_stats.Push_Readiness());
			for (i = 1; i <= 4; i++) {
				ui_storage.set('Logger:Enemy'+i+'_HP', ui_stats.EnemySingle_HP(i));
			}
		}
		return;
	}
	if (ui_data.isFight) {
		if (this.isFirstTime) {
			ui_storage.set('Logger:Hero_HP', ui_stats.HP());
			ui_storage.set('Logger:Hero_Gold', ui_stats.Gold());
			ui_storage.set('Logger:Hero_Inv', ui_stats.Inv());
			ui_storage.set('Logger:Hero_Charges', ui_stats.Charges());
			ui_storage.set('Logger:Enemy_HP', ui_stats.Enemy_HP());
			ui_storage.set('Logger:Enemy_Gold', ui_stats.Enemy_Gold());
			ui_storage.set('Logger:Enemy_Inv', ui_stats.Enemy_Inv());
			ui_storage.set('Logger:Hero_Alls_HP', ui_stats.Hero_Alls_HP());
			for (i = 1; i <= 11; i++) {
				ui_storage.set('Logger:Hero_Ally'+i+'_HP', ui_stats.Hero_Ally_HP(i));
			}
			for (i = 1; i <= 6; i++) {
				ui_storage.set('Logger:Enemy'+i+'_HP', ui_stats.EnemySingle_HP(i));
			}
			ui_storage.set('Logger:Enemy_AliveCount', ui_stats.Enemy_AliveCount());
		}
		ui_informer.update('low health', ui_stats.lowHealth('fight'));
		return;
	}
	if (ui_data.hasShop) {
		if (ui_stats.inShop()) {
			if (ui_storage.get('Logger:Location') === 'Field') {
				ui_storage.set('Logger:Location', 'Store');
				ui_logger.suppressOldStats();
				ui_logger.update(ui_logger.fieldWatchers);
				ui_storage.set('Logger:Hero_Gold', ui_stats.Gold());
				ui_storage.set('Logger:Hero_Inv', ui_stats.Inv());
			}
			ui_data.inShop = true;
			document.body.classList.add('in_own_shop');
		} else if (ui_data.inShop) {
			ui_logger.update(ui_logger.shopWatchers);
			ui_data.inShop = false;
			document.body.classList.remove('in_own_shop');
		}
	}
	if (!ui_data.inShop && ui_storage.get('Logger:Location') !== 'Field') {
		ui_storage.set('Logger:Location', 'Field');
	}
	if (!ui_utils.isAlreadyImproved(ui_data.isMobile ? document.getElementsByClassName('e_mt_stats')[0] : document.getElementById('stats'))) {
		// Add voicegens
		ui_utils.addVoicegen(document.querySelector('#hk_level .l_capt'), worker.GUIp_i18n.study, 'exp', worker.GUIp_i18n.fmt('ask_to_study', ui_data.char_sex[1]));
		ui_utils.addVoicegen(document.querySelector('#hk_health .l_capt'), worker.GUIp_i18n.heal, 'heal', worker.GUIp_i18n.fmt('ask_to_heal', ui_data.char_sex[1]));
		ui_utils.addVoicegen(document.querySelector('#hk_gold_we .l_capt'), worker.GUIp_i18n.dig, 'dig', worker.GUIp_i18n.fmt('ask_to_dig', ui_data.char_sex[1]));
		ui_utils.addVoicegen(document.querySelector('#hk_quests_completed .l_capt'), worker.GUIp_i18n.cancel_task, 'cancel_task', worker.GUIp_i18n.fmt('ask_to_cancel_task', ui_data.char_sex[0]));
		ui_utils.addVoicegen(document.querySelector('#hk_quests_completed .l_capt'), worker.GUIp_i18n.do_task, 'do_task', worker.GUIp_i18n.fmt('ask_to_do_task', ui_data.char_sex[1]));
		ui_utils.addVoicegen(document.querySelector('#hk_death_count .l_capt'), worker.GUIp_i18n.die, 'die', worker.GUIp_i18n.fmt('ask_to_die', ui_data.char_sex[0]));
		handler = ui_improver.calculateButtonsVisibility.bind(ui_improver, true);
		ui_storage.addListener('Option:disableDieButton', handler);
		ui_storage.addListener('Option:disableVoiceGenerators', handler);
	}
	if (!document.querySelector('#hk_distance .voice_generator')) {
		ui_utils.addVoicegen(document.querySelector('#hk_distance .l_capt'), (!ui_data.isMobile && document.querySelector('#main_wrapper.page_wrapper_5c')) ? '回' : worker.GUIp_i18n.return, 'town', worker.GUIp_i18n.fmt('ask_to_return', ui_data.char_sex[0]));
	}

	ui_informer.update('much gold', ui_stats.Gold() >= (ui_stats.hasTemple() ? 10000 : 3000));
	ui_informer.update('dead', ui_stats.HP() === 0);
	var questName = ui_stats.Task_Name();
	ui_informer.update('guild quest', questName.match(/членом гильдии|member of the guild/) && !questName.match(/\((отменено|cancelled)\)/));
	ui_informer.update('mini quest', questName.match(/\((мини|mini)\)/) && !questName.match(/\((отменено|cancelled)\)/));

	ui_improver.distanceInformerCheck();

	GUIp.common.tooltips.watchSubtree(document.querySelector('#hk_distance .l_val'));

	// shovel imaging
	if (!ui_data.isMobile) {
		var digVoice = document.querySelector('#hk_gold_we .voice_generator');
		if (this.isFirstTime) {
			if (worker.GUIp_browser !== 'Opera') {
				digVoice.style.backgroundImage = 'url(' + worker.GUIp_getResource('images/shovel.png') + ')';
			} else {
				worker.GUIp_getResource('images/shovel.png',digVoice);
			}
		}
		if (ui_stats.goldTextLength() > 16 - 2*document.getElementsByClassName('page_wrapper_5c').length) {
			digVoice.classList.add('shovel');
			digVoice.classList.toggle('compact',
				ui_stats.goldTextLength() > 20 - 3*document.getElementsByClassName('page_wrapper_5c').length
			);
		} else {
			digVoice.classList.remove('shovel');
		}
	}
	// improve title of side quest bar with exact values
	var sjName = ui_stats.Side_Job_Name();
	if (sjName) {
		var sjMlt, sjCur = ui_stats.Side_Job(),
			sjReq = ui_stats.Side_Job_Requirements(sjName),
			sjBar = document.querySelector('#hk_quests_completed + .line .p_bar');
		if (sjBar && sjReq > 0) {
			if (sjReq > 100 && sjCur !== 100) {
				sjMlt = Math.pow(10, Math.floor(Math.log10(Math.max(100, sjReq - 5000))) - 1);
				sjCur = '\u2248' + (Math.round(sjCur / 100 * sjReq / sjMlt) * sjMlt);  /* approximately equal */
			} else {
				sjCur = Math.round(sjCur / 100 * sjReq);
			}
			sjBar.title = sjBar.title.replace(/( \(.?\d+\/\d+\))/,'') + ' (' + sjCur + '/' + sjReq + ')';
		}
	}
};
ui_improver.addLastFightLink = function() {
	var container = document.querySelector('#hk_arena_won .l_val'),
		a, child;
	if (!container || container.classList.contains('div_link') || container.getElementsByTagName('a')[0]) {
		return;
	}
	a = document.createElement('a');
	a.href = '/hero/last_fight';
	a.target = '_blank';
	a.style.display = 'block';
	while ((child = container.firstChild)) {
		a.appendChild(child);
	}
	container.appendChild(a);
};
ui_improver.improveShop = function() {
	var trdNode = ui_data.isMobile ? document.getElementsByClassName('e_m_shop')[0] : document.getElementById('trader'), node;
	if (trdNode && !ui_utils.isAlreadyImproved(trdNode)) {
		if (ui_data.isMobile) {
			node = trdNode.previousElementSibling;
		} else {
			node = trdNode.getElementsByClassName('l_slot')[0];
		}
		if (node) {
			node.insertAdjacentHTML('afterbegin', '<div id="trademode_timer" class="fr_new_badge ' + (ui_data.isMobile ? 'e_badge_pos ' : '') + 'hidden"></div>');
			GUIp.common.tooltips.watchSubtree(node.firstChild);
		}
		GUIp.common.tooltips.watchSubtree(trdNode.getElementsByClassName('p_bar')[0]);
	}
};
ui_improver.improvePet = function(forcedUpdate) {
	var timeRemaining, node,
		petNode = ui_data.isMobile ? document.getElementsByClassName('e_m_pet')[0] : document.getElementById('pet'),
		petBadge = document.getElementById('pet_badge'),
		petLevelLabel = document.querySelector('#hk_pet_class + div .l_val'),
		level = ui_stats.Pet_Level(),
		petRes  = (level * 0.4 + 0.5).toFixed(1) + 'k',
		petRes2 = (level * 0.8 + 0.5).toFixed(1) + 'k';
	if (ui_stats.petIsKnockedOut()) {
		if (!ui_utils.isAlreadyImproved(petNode)) {
			if (ui_data.isMobile) {
				node = petNode.previousElementSibling;
			} else {
				node = petNode.getElementsByClassName('r_slot')[0];
			}
			if (node) {
				node.insertAdjacentHTML('afterbegin', '<div id="pet_badge" class="fr_new_badge e_badge_pos hidden">0</div>');
				petBadge = node.firstChild;
				GUIp.common.tooltips.watchSubtree(petBadge);
			}
		}
		if (ui_data.isMobile || document.querySelector('#pet .block_content').style.display !== 'none') {
			petBadge.title = worker.GUIp_i18n.badge_pet2;
			petBadge.textContent = petRes;
		} else {
			timeRemaining = ui_utils.findLabel(worker.$('#pet'), worker.GUIp_i18n.pet_status_label).siblings('.l_val').text().match(/(?:(\d+)(?:h| ч) )?(?:(\d+)(?:m| мин))/) || '';
			petBadge.title = worker.GUIp_i18n.badge_pet1;
			petBadge.textContent = ('00' + (timeRemaining[1] || '')).substr(-2) + ':' + ('00' + (timeRemaining[2] || '')).substr(-2)
		}
		ui_utils.hideElem(petBadge, false);
	} else if (petBadge) {
		ui_utils.hideElem(petBadge, true);
	}
	if (petLevelLabel) {
		petLevelLabel.title = '↑ ' + petRes + (worker.GUIp_locale === 'ru' ? '\n⇈ ' + petRes2 : '');
		GUIp.common.tooltips.watchSubtree(petLevelLabel);
	}
	if (!ui_data.isMobile) {
		if (this.isFirstTime || forcedUpdate) {
			var node2, node3, buttonInPetBlock, relocatePetsButton = ui_storage.getFlag('Option:relocatePetsButton');
			buttonInPetBlock = document.querySelector('#pet #pcmd');
			if (relocatePetsButton && !buttonInPetBlock) {
				node = document.querySelector('#pet .block_content');
				node2 = document.getElementById('pcmd');
			} else if (!relocatePetsButton && buttonInPetBlock) {
				node = document.querySelector('#ark .block_content');
				node2 = buttonInPetBlock;
			}
			if (node && node2) {
				node3 = node2;
				while (node3 = node3.previousElementSibling) {
					if (/^(Pets|Питомцы)/.test(node3.textContent)) {
						node.insertAdjacentElement('beforeend', node3);
						break;
					}
				}
				node.insertAdjacentElement('beforeend', node2);
			}
		}
		if (this.isFirstTime) {
			ui_storage.addListener('Option:relocatePetsButton', ui_improver.improvePet.bind(ui_improver, true));
		}
	}
	// knock out informer
	ui_informer.update('pet knocked out', ui_stats.petIsKnockedOut());
};
ui_improver.describeEquipBoldness = function(mutations, observer) {
	var names = document.querySelectorAll(ui_data.isMobile ? '.e_m_equipment .eq_name' : '#equipment .eq_name'),
		name, eq;
	for (var i = 0, len = names.length; i < len; i++) {
		name = names[i];
		eq = name.parentNode;
		if (name.classList.contains('eq_b')) {
			eq.classList.add('e_eq_bold');
			name.title = GUIp_i18n.equip_boldness[i] ? eq.firstElementChild.textContent + ': ' + GUIp_i18n.equip_boldness[i] : '';
		} else {
			eq.classList.remove('e_eq_bold');
			name.title = '';
		}
	}
	observer.takeRecords();
};
ui_improver.improveEquip = function() {
	var equipNode = ui_data.isMobile ? document.getElementsByClassName('e_m_equipment')[0] : document.getElementById('equipment'), node, observer;
	if (!equipNode) return;
	if (!ui_utils.isAlreadyImproved(equipNode)) {
		if (ui_data.isMobile) {
			node = equipNode.previousElementSibling;
		} else {
			node = equipNode.getElementsByClassName('r_slot')[0];
		}
		if (node) {
			node.insertAdjacentHTML('afterbegin', '<div id="equip_badge" class="fr_new_badge e_badge_pos">0</div>');
			GUIp.common.tooltips.watchSubtree(node.firstChild);
		}
		observer = GUIp.common.newMutationObserver(ui_improver.describeEquipBoldness);
		observer.observe(equipNode, {subtree: true, attributes: true, attributeFilter: ['class']});
		ui_improver.describeEquipBoldness(null, observer);
		Array.prototype.forEach.call(equipNode.getElementsByClassName('eq_name'), GUIp.common.tooltips.watchSubtree);
	}
	var equipBadge = document.getElementById('equip_badge'),
		averageEquipLevel = 0;
	for (var i = 1; i <= 7; i++) {
		averageEquipLevel += ui_stats['Equip' + i]();
	}
	averageEquipLevel = averageEquipLevel / 7 - ui_stats.Level();
	averageEquipLevel = (averageEquipLevel >= 0 ? '+' : '') + averageEquipLevel.toFixed(1);
	if (equipBadge.textContent !== averageEquipLevel) {
		equipBadge.title = worker.GUIp_i18n.badge_equip;
		equipBadge.textContent = averageEquipLevel;
	}
};
ui_improver.improveSkills = function() {
	var skillsNode = ui_data.isMobile ? document.getElementById('s_b_id') : document.getElementById('skills'), node;
	if (!skillsNode) return;
	if (!ui_utils.isAlreadyImproved(skillsNode)) {
		if (ui_data.isMobile) {
			// weird but skills div has its own native id, but between it and its header there's an empty nameless div. why?
			node = document.getElementsByClassName('e_mt_skills')[0];
		} else {
			node = skillsNode.getElementsByClassName('r_slot')[0];
		}
		if (node) {
			node.insertAdjacentHTML('afterbegin', '<div id="skill_badge" class="fr_new_badge e_badge_pos"></div>');
			GUIp.common.tooltips.watchSubtree(node.firstChild);
		}
		Array.prototype.forEach.call(skillsNode.getElementsByClassName('skill_info'), GUIp.common.tooltips.watchSubtree);
	}
	var skillBadge = document.getElementById('skill_badge'),
		skillList = skillsNode.getElementsByClassName('skill_info'),
		minSkillLevel = Infinity,
		minSkillPrice = '',
		skill, m, level, price;
	for (var i = 0, len = skillList.length; i < len; i++) {
		skill = skillList[i];
		if (!(m = /\d+/.exec(skill.textContent))) {
			continue;
		}
		level = +m[0];
		price = ((level + 1) / 2).toFixed(1) + 'k';
		skill.title = '↑ ' + price;
		if (level < minSkillLevel) {
			minSkillLevel = level;
			minSkillPrice = price;
		}
	}
	if (minSkillPrice && skillBadge.textContent !== minSkillPrice) {
		skillBadge.title = worker.GUIp_i18n.badge_skill;
		skillBadge.textContent = minSkillPrice;
	}
	ui_utils.hideElem(skillBadge, !minSkillPrice);
};
ui_improver.improvePlayers = function() {
	var nodes = document.querySelectorAll(ui_data.isMobile ? '.e_m_alls .opp_n.opp_ng span, .e_m_opps .opp_n.opp_ng span' : '#alls .opp_n.opp_ng span, #bosses .opp_n.opp_ng span, #o_hk_godname .l_val a');
	GUIp.common.markBlacklistedPlayers(nodes, ui_words.allyBlacklist);
	Array.prototype.forEach.call(nodes, GUIp.common.tooltips.watchSubtree);
	Array.prototype.forEach.call(document.querySelectorAll('.opp_n .opp_g:not(.improved)'), function(a) {
		var godName;
		a.classList.add('improved');
		if (!a.firstChild || !(godName = a.firstChild.textContent.match(/\((.*?)\)$/)) || !(godName = godName[1])) {
			return;
		}
		// in sailing and datamine we can see our own nickname in ally list
		if (godName === ui_data.god_name) {
			return;
		}
		a.insertAdjacentHTML('beforeend','<a class="e_gc_link em_font div_link" title="' + worker.GUIp_i18n.call_in_gc + '">#</a>');
		ui_improver._improvePlayersFontResizer(a.parentNode, 12);
		GUIp.common.addListener(a.lastElementChild, 'click', function(ev) {
			var node;
			if (node = document.getElementsByClassName('e_guild_council')[0]) {
				// guild council can be already opened but not focused, just click on it in this case
				if (!document.querySelector('.e_guild_council.frbutton_pressed') && node.firstElementChild) {
					node.firstElementChild.click();
				}
				// immediately insert godname into the textarea
				if ((node = document.querySelector('.e_guild_council .frInputArea textarea'))) {
					ui_improver._insertGodNameToChat(node, godName);
				}
			} else if ((node = document.querySelector('.msgDockPopup .show_gc'))) {
				// open guild council chat if it still wasn't here
				node.click();
				var gcWaiter = GUIp.common.setInterval(function() {
					// wait till the textarea appears
					if ((node = document.querySelector('.e_guild_council .frInputArea textarea'))) {
						worker.clearInterval(gcWaiter);
						ui_improver._insertGodNameToChat(node, godName);
					}
				},150);
			}
			ev.preventDefault();
		});
	});
};

/**
 * this function idea was "borrowed" from original godville package to autoresize spans with names (jquery-based)
 * @param {jQuery} container
 * @param {number} maxFontPixels
 */
ui_improver._improvePlayersFontResizer = function(container, maxFontPixels) {
	container = worker.$(container);
	GUIp.common.setTimeout(function() {
		var sHeight, sWidth, s = worker.$('span:first', container), sd = s[0].dataset,
			cHeight = container.height(),
			cWidth = container.width();
		do
		{
			s.css('font-size', maxFontPixels);
			if (sd.ecss) {
				sd.ecss = sd.ecss.replace(/font-size\s*:\s*\d+px;/,'') + 'font-size: ' + maxFontPixels + 'px;'
			}
			sHeight = s.height();
			sWidth = s.width();
			maxFontPixels -= 1;
		} while ((sHeight > cHeight || sWidth > cWidth) && maxFontPixels > 3);
	}, 50);
};

ui_improver.improveHP = function() {
	if (ui_data.isFight) {
		var i, len, changed = false;
		// if we have just opened the page, try to find already processed data from before
		if (this.isFirstTime) {
			this.allsHP = GUIp.common.parseJSON(ui_storage.get('Log:' + ui_data.logId + ':allshp')) || {};
		}
		// from now on we must have allsHP.a, reinitialize the object if necessary
		if (!this.allsHP.a) {
			this.allsHP = {a: [], e: [], sum: 0};
		}
		// if length of allsHP.a is equal to the current count of allies, then we don't need to recalculate anything here
		len = ui_stats.Hero_Alls_Count();
		if (len !== this.allsHP.a.length) {
			changed = true;
			this.allsHP.sum = 0;
			for (i = 0; i < len; i++) {
				this.allsHP.a[i] = this.allsHP.a[i] || ui_stats.Hero_Ally_MaxHP(i+1) || 0;
				// sum health only for heroes, not for summonned bosses
				if (ui_stats.Hero_Ally_Name(i)[0] !== '+') {
					this.allsHP.sum += this.allsHP.a[i];
				}
			}
		}
		// do almost the same for enemies but not in sail, as collecting maxhp list there is useless
		if (!ui_data.isSail) {
			// reset current maxhp list on first load, as there are different enemies during dungeon session
			// and we're not sure if it's a new boss or we just reloaded the page on the same one
			if (this.isFirstTime && (ui_data.isDungeon || ui_data.isBoss)) {
				this.allsHP.e = [];
			}
			len = ui_stats.Enemy_Count();
			if (len !== this.allsHP.e.length) {
				changed = true;
				for (i = 0; i < len; i++) {
					this.allsHP.e[i] = this.allsHP.e[i] || ui_stats.EnemySingle_MaxHP(i+1) || 0;
				}
			}
		}
		// save changes if any
		if (changed) {
			ui_storage.set('Log:' + ui_data.logId + ':allshp', JSON.stringify(ui_improver.allsHP));
		}
	}

	var hp, diff, generator = function(isAlls, hps, diffs) {
		var hpNodes = document.querySelectorAll(hps),
			diffNodes = document.querySelectorAll(diffs);
		for (var i = 0, len = hpNodes.length; i < len; i++) {
			if ((hp = /^(\d+) ?\/ ?(\d+)$/.exec(hpNodes[i].textContent))) {
				hpNodes[i].title = ui_utils.hpPrc(+hp[1],+hp[2]);
			} else if ((hp = ui_improver.allsHP[isAlls ? 'a' : 'e'][i])) {
				hpNodes[i].title = '0 / ' + hp;
				hp = [, 0, hp];
			} else {
				hpNodes[i].title = '';
			}
			GUIp.common.tooltips.watchSubtree(hpNodes[i]);
			if (diffNodes[i]) {
				if (hp && +hp[2] && (diff = +diffNodes[i].textContent)) {
					diffNodes[i].title = ui_utils.hpPrc(+diff,+hp[2],true);
				} else {
					diffNodes[i].title = '';
				}
				GUIp.common.tooltips.watchSubtree(diffNodes[i]);
			}
		}
	}
	if (ui_data.isMobile) {
		generator(true, '.e_m_alls .opp_h, #hk_health .l_val', '.e_m_alls .hp_diff, #hk_health .hp_d');
		generator(false,
			'.e_m_opps .opp_h, #statusbar .e_sb_hero_hp, #statusbar .e_sb_opp_hp, #statusbar .e_sb_ark_hp, #statusbar .e_sb_boss_hp',
			'.e_m_opps .hp_diff, #statusbar .e_sb_hero_hp_diff, #statusbar .e_sb_opp_hp_diff, #statusbar .e_sb_ark_hp_diff, #statusbar .e_sb_boss_hp_diff'
		);
	} else {
		generator(true, '#alls .opp_h, #hk_health .l_val', '#alls .hp_diff, #hk_health .hp_d');
		generator(false,
			'#opps .opp_h, #bosses .opp_h, #o_hl1 .l_val',
			'#opps .hp_diff, #bosses .hp_diff, #o_hl1 .hp_d'
		);
	}
};
ui_improver.improveSendButtons = function(forcedUpdate) {
	var sendToButtons, pants = document.querySelector('#pantheons .block_content'),
		curGP = ui_stats.Godpower();
	if (this.isFirstTime) {
		sendToButtons = document.querySelectorAll('#cntrl div.chf_link_wrap a');
		for (var i = 0, len = sendToButtons.length; i < len; i++) {
			if (sendToButtons[i].textContent.match(/(Послать на тренировку|Spar a Friend)/i)) {
				sendToButtons[i].parentNode.classList.add("e_challenge_button");
			} else if (sendToButtons[i].textContent.match(/(Направить в подземелье|Drop to Dungeon)/i)) {
				sendToButtons[i].parentNode.classList.add("e_dungeon_button");
			} else if (sendToButtons[i].textContent.match(/(Снарядить в плавание|Set Sail)/i)) {
				sendToButtons[i].parentNode.classList.add("e_sail_button");
			} else if (sendToButtons[i].textContent.match(/(Посетить полигон|Explore Datamine)/i)) {
				sendToButtons[i].parentNode.classList.add("e_mining_button");
			}
		}
		if (ui_stats.Level() >= 14 && !ui_data.isMobile) {
			// personal statistics
			pants.insertAdjacentHTML('afterbegin', '<div class="guip p_group_sep"></div>');
			var panthLines = pants.getElementsByClassName('panth_line');
			ui_utils.observeUntil(pants, {childList: true, subtree: true}, function() {
				return panthLines[0];
			}).then(function() {
				pants.insertAdjacentHTML('beforeend', '<div class="guip_stats_lnk p_group_sep"></div>');
				pants.insertAdjacentHTML('beforeend',
					'<div class="guip_stats_lnk"><div class="line"><a class="no_link div_link"' +
					' href="https://stats.' + worker.location.host + '/me" target="_blank"' +
					' title="' + worker.GUIp_i18n.statistics_title + '">' +
						worker.GUIp_i18n.statistics +
					'</a></div></div>'
				);
			}).catch(GUIp.common.onUnhandledException);
		}
		ui_storage.addListener('Option:relocateDuelButtons', ui_improver.improveSendButtons.bind(ui_improver, true));
	}
	sendToButtons = document.querySelectorAll('a.to_arena');
	for (var lim, i = 0, len = sendToButtons.length; i < len; i++) {
		lim = 50;
		if (!i && ui_improver.dailyForecast.get().includes('arena')) {
			lim = 25;
		}
		sendToButtons[i].classList.toggle('e_low_gp', curGP < lim);
	}
	sendToButtons = document.querySelectorAll('#cntrl div.chf_link_wrap a');
	var sendToDelay, sendToStr, sendToDesc = document.querySelectorAll('#cntrl2 div.arena_msg, #cntrl2 span.to_arena');
	for (var i = 0, len = sendToDesc.length; i < len; i++) {
		GUIp.common.tooltips.watchSubtree(sendToDesc[i]);
		if (sendToDesc[i].style.display === 'none') {
			continue;
		}
		if ((!sendToDesc[i].title.length || (sendToDesc[i].dataset.expires < Date.now() + 5000)) && (sendToStr = sendToDesc[i].textContent.match(/(Подземелье откроется через|Отплыть можно через|Арена откроется через|Тренировка через|Полигон откроется через|Босс освободится через|Arena available in|Dungeon available in|Sail available in|Sparring available in|Datamine available in|Boss ready in) (?:(\d+)(?:h| ч) )?(?:(\d+)(?:m| мин))/))) {
			sendToDelay = ((sendToStr[2] !== undefined ? +sendToStr[2] : 0) * 60 + +sendToStr[3]) * 60;
			sendToStr = sendToStr[1].replace(' через',' в').replace(' in',' at');
			sendToDesc[i].dataset.expires = Date.now() + sendToDelay * 1000;
			sendToDesc[i].title = sendToStr + ' ' + GUIp.common.formatTime(new Date(+sendToDesc[i].dataset.expires),'simpledatetime');
		}
	}
	if ((this.isFirstTime || forcedUpdate) && !ui_data.isMobile) {
		var relocated, buttonInPantheons, relocateDuelButtons = ui_storage.getList('Option:relocateDuelButtons');
		relocated = relocateDuelButtons.includes('arena');
		buttonInPantheons = document.querySelector('#pantheons .arena_link_wrap');
		if (relocated && !buttonInPantheons) {
			pants.insertAdjacentElement('afterbegin', document.getElementsByClassName('arena_link_wrap')[0]);
		} else if (!relocated && buttonInPantheons) {
			document.getElementById('cntrl2').insertBefore(buttonInPantheons, document.querySelector('#control .arena_msg'));
		}
		relocated = relocateDuelButtons.includes('chf');
		buttonInPantheons = document.querySelector('#pantheons .e_challenge_button');
		if (relocated && !buttonInPantheons) {
			pants.insertBefore(document.getElementsByClassName('e_challenge_button')[0], document.getElementsByClassName('guip p_group_sep')[0]);
		} else if (!relocated && buttonInPantheons) {
			document.getElementById('cntrl2').insertBefore(buttonInPantheons, document.querySelector('#control .arena_msg').nextSibling);
		}
		relocated = relocateDuelButtons.includes('dun');
		buttonInPantheons = document.querySelector('#pantheons .e_dungeon_button');
		if (relocated && !buttonInPantheons) {
			pants.insertBefore(document.getElementsByClassName('e_dungeon_button')[0], document.getElementsByClassName('guip p_group_sep')[0]);
		} else if (!relocated && buttonInPantheons) {
			document.getElementById('cntrl2').insertBefore(buttonInPantheons, document.querySelectorAll('#control .arena_msg')[1]);
		}
		relocated = relocateDuelButtons.includes('sail');
		buttonInPantheons = document.querySelector('#pantheons .e_sail_button');
		if (relocated && !buttonInPantheons) {
			pants.insertBefore(document.getElementsByClassName('e_sail_button')[0], document.getElementsByClassName('guip p_group_sep')[0]);
		} else if (!relocated && buttonInPantheons) {
			document.getElementById('cntrl2').insertBefore(buttonInPantheons, document.querySelectorAll('#control .arena_msg')[2]);
		}
		relocated = relocateDuelButtons.includes('min');
		buttonInPantheons = document.querySelector('#pantheons .e_mining_button');
		if (relocated && !buttonInPantheons) {
			pants.insertBefore(document.getElementsByClassName('e_mining_button')[0], document.getElementsByClassName('guip p_group_sep')[0]);
		} else if (!relocated && buttonInPantheons) {
			document.getElementById('cntrl2').insertBefore(buttonInPantheons, document.querySelectorAll('#control .arena_msg')[3]);
		}
	}
};
/**
 * @returns {!Array<!GUIp.common.activities.DiaryEntry>}
 */
ui_improver.readDiaryOnce = function() {
	var root = ui_data.isMobile ? document.getElementsByClassName('e_m_diary')[0] : document.getElementById('diary'),
		messages = root.querySelectorAll('.d_msg:not(.parsed)'),
		sortButton = root.getElementsByClassName('sort_ch')[0],
		result = [],
		html = '',
		newHTML = '',
		date, time, msg, link, value;
	for (var i = 0, len = messages.length; i < len; i++) {
		msg = messages[i];
		msg.classList.add('parsed');
		time = msg.parentNode.getElementsByClassName('d_time')[0];
		if (!time || !(date = ui_utils.parseDiaryDate(time.textContent))) {
			GUIp.common.warn('cannot parse diary: no time for "' + msg.textContent + '"');
			continue;
		}
		if (msg.getElementsByClassName('vote_links_b')[0]) {
			result.push({date: date, type: 'foreignVoice', msg: msg.textContent, logID: ''});
		} else {
			html = msg.innerHTML;
			if ((newHTML = ui_improver._improveMonsterNameHTML(html, true)) !== html) {
				msg.innerHTML = newHTML;
			}
			if (msg.classList.contains('m_infl')) {
				result.push({date: date, type: 'influence', msg: msg.textContent, logID: ''});
			} else {
				link = msg.getElementsByTagName('a')[0]; // weird, it has .vote_link class
				result.push({
					date: date,
					type: 'regular',
					msg: msg.textContent,
					logID: link ? link.href.slice(link.href.lastIndexOf('/') + 1) : ''
				});
				if (!link && (msg.textContent.includes('☥ ') || ui_improver.detectors.stateField.monster.startsWith('☥ ')) && (value = GUIp.common.parseGatheredSoul(msg.textContent))) {
					GUIp.common.updateGatheredSouls(ui_storage, date, 0, value);
				}
			}
		}
	}
	if (!sortButton || sortButton.textContent === '▼') {
		// we cannot simply sort the entries by their date, because some of their dates might be identical
		// and we must keep them in the correct order in that case
		result.reverse();
	}
	return result;
};
ui_improver.improveForeignVoices = function() {
	var blocks = document.getElementsByClassName('vote_links_b'),
		links;
	for (var i = 0, len = blocks.length; i < len; i++) {
		links = blocks[i].getElementsByClassName('vote_link');
		GUIp.common.tooltips.watchSubtree(links[2] || links[0]);
	}
};
ui_improver.improveDiary = function() {
	var diary = ui_improver.readDiaryOnce(),
		len = diary.length,
		infl = false,
		reply = false;
	if (len && !ui_improver.isFirstTime) {
		// run voice timeout
		for (var i = 0; i < len; i++) {
			if (diary[i].msg.charCodeAt(0) === 0x27A5) { // ➥
				reply = true;
			} else if (diary[i].type === 'influence') {
				infl = true;
			}
		}
		if (infl && reply) {
			ui_timeout.start();
		}
	}
	ui_timers.updateDiary(diary);
	ui_improver.improveForeignVoices();
};
ui_improver.detectors = {};
ui_improver.detectors.stateLS = {bp: -1, bt: 0, cp: -1, ct: 0, tpp: 0};
ui_improver.detectors.detectLS = function() {
	var tmTimer = document.getElementById('trademode_timer');
	ui_utils.hideElem(tmTimer, !ui_data.inShop);
	if (!ui_data.inShop || !tmTimer) {
		this.stateLS = {bp: -1, bt: 0, cp: -1, ct: 0, tpp: 0};
		return;
	}
	if (!this.stateLS.tpp && ui_data.inShop) {
		tmTimer.title = worker.GUIp_i18n.trademode_timer_wait;
		tmTimer.textContent = '––:––';
	}
	var updateTimer = function() {
		if (this.stateLS.tpp) {
			tmTimer.title = '[' + GUIp.common.formatTime(new Date(+this.stateLS.bt - (this.stateLS.bp - 0.5) * this.stateLS.tpp),'simpletime') + '~' + GUIp.common.formatTime(new Date(+this.stateLS.ct + (100.5 - cp) * this.stateLS.tpp),'simpletime') + ']';
			tmTimer.textContent = GUIp.common.formatTime((+this.stateLS.ct - Date.now() + (100.5 - cp) * this.stateLS.tpp) / 60000,'remaining');
		}
	};
	var cp = ui_stats.sProgress();
	if (this.stateLS.bp < 0) {
		// check cached data if any
		var cache = GUIp.common.parseJSON(ui_storage.get('Cache:stateLS'));
		if (cache && Math.abs(cache.ct + (100.5 - cache.cp) * cache.tpp - Date.now() - (100.5 - cp) * cache.tpp) < 1800e3) {
			this.stateLS = cache;
			updateTimer.call(this);
			return;
		}
		this.stateLS.bp = cp;
		this.stateLS.bt = Date.now();
		return;
	}
	if (this.stateLS.bp < cp && this.stateLS.cp < 0) {
		this.stateLS.bp = this.stateLS.cp = cp;
		this.stateLS.bt = Date.now();
		return;
	}
	if (this.stateLS.bp < cp && this.stateLS.cp < cp) {
		this.stateLS.cp = cp;
		this.stateLS.ct = Date.now();
		this.stateLS.tpp = (this.stateLS.ct - this.stateLS.bt)/(this.stateLS.cp - this.stateLS.bp);
		// cache obtained values
		ui_storage.set('Cache:stateLS',JSON.stringify(this.stateLS));
	}
	updateTimer.call(this);
};
ui_improver.detectors.stateGTF = {cnt: 0, res: false};
ui_improver.detectors.stateGTG = {init: -1, toTown: "", res: false};
ui_improver.detectors.stateField = {dst: 0, intown: false, nbtown: "", task: "", monster: "", ld: "", ln: "", hs: "", hp: -1, hpd: 0};
ui_improver.detectors.detectField = function() {
	var sp = ui_stats.sProgress(),
		intown = !!ui_stats.townName(),
		nbtown = ui_stats.nearbyTown(),
		monster = ui_stats.monsterName().replace(/^(Undead|Восставший) /,''),
		milestones = ui_stats.mileStones(),
		fullTask = ui_stats.Task_Name(),
		task = fullTask.replace(/ \((?:выполнено|отменено|эпик|completed|cancelled|epic)\)/g,''),
		taskActive = !/ \((?:выполнено|отменено|completed|cancelled)\)/.test(fullTask),
		hs = ui_stats.heroState(),
		ld = (ui_stats.lastDiaryRealEntry(0, true) || '').textContent,
		ln = ui_stats.lastNews(),
		hp = ui_stats.HP();
	if (hs === 'returning') {
		// going to town/capital
		if (this.stateGTG.init < 0) {
			if (!taskActive || ui_improver.dailyForecast.get().includes('gvroads') || /\((Godville|Годвилль)\)/.test((document.querySelector('.e_hero_state[data-state="returning"]') || '').textContent)) {
				this.stateGTG.res = true;
			}
			this.stateGTG.init = this.stateField.dst ? this.stateField.dst : milestones;
			this.stateGTG.toTown = ui_stats.returningToTown();
		}
	} else if (hs !== 'fishing') {
		if (this.stateGTG.init > -1) {
			this.stateGTG = {init: -1, toTown: "", res: false};
		}
	}
	// go to fields
	if (hs !== 'walking' && hs !== 'fishing' || this.stateGTF.res && sp < this.stateField.sp && !(this.stateField.hs === 'walking' && hs === 'fishing' || this.stateField.hs === 'fishing' && hs === 'walking')) {
		this.stateGTF = {cnt: 0, res: false};
	} else if (this.stateField.intown && !intown && !ui_stats.lastDiaryIsInfl()) {
		this.stateGTF.res = true;
	} else if (hs === 'walking' && milestones > this.stateField.dst && ui_stats.progressDiff() > 2 && !(/\((мини|mini|гильд|guild)\)/.test(task))) {
		this.stateGTF.cnt++;
		if (this.stateGTF.cnt >= 2) {
			this.stateGTF.res = true;
		}
	}
	// hp delta
	if (this.stateField.hp >= 0 && (this.stateField.hp !== hp || this.stateField.ln !== ln)) {
		this.stateField.hpd = hp - this.stateField.hp;
	}
	this.stateField.hp = hp;
	// common
	this.stateField.dst = milestones;
	this.stateField.intown = intown;
	this.stateField.nbtown = nbtown;
	this.stateField.task = task;
	this.stateField.monster = monster;
	this.stateField.ld = ld;
	this.stateField.ln = ln;
	this.stateField.hs = hs;
	if (!monster) {
		this.stateField.sp = sp;
	}
};
ui_improver.distanceInformerInit = function() {
	var dstSelected, dstContent, dstContentInner,
		dstLine = worker.$('#hk_distance .l_capt'),
		dstSaved = ui_storage.getList('townInformer');
	if (dstLine) {
		dstLine.addClass('edst_header');
		dstLine.wup({
			title: worker.GUIp_i18n.town_informer,
			placement: 'bottom',
			mobile_root: ui_data.isMobile ? worker.$("#main_page") : undefined,
			width: 320,
			onShow: GUIp.common.try2.bind(null, function onTownTableShow(t) {
				var wup = t[0],
					pos = parseInt(wup.style.left);
				if (pos < 5) {
					wup.style.left = '10px';
					wup.firstElementChild.style.left = (parseInt(wup.firstElementChild.style.left) - (10 - pos)) + 'px';
				}
			}),
			content: GUIp.common.try2.bind(null, function createTownTableContent() {
				dstContent = $('<div></div>');
				dstSelected = worker.$('<div class="edst_headline"><div class="s">Aa</div><div class="c"></div></div>');
				GUIp.common.addListener(dstSelected[0].firstChild, 'click', function(ev) {
					ev.preventDefault();
					this.classList.toggle('alpha');
					var isAlpha = this.classList.contains('alpha');
					this.textContent = isAlpha ? '01' : 'Aa';
					ui_improver.distanceInformerListBuilder(dstContentInner, isAlpha);
				});
				GUIp.common.addListener(dstSelected[0].lastChild, 'click', function(ev) {
					ev.preventDefault();
					ui_improver.distanceInformerReset();
				});
				dstContent.append(dstSelected);
				dstContentInner = $('<div class="edst_towns"></div>');
				ui_improver.distanceInformerListBuilder(dstContentInner);
				GUIp.common.tooltips.watchSubtree(dstContentInner[0]);
				dstContent.append(dstContentInner);
				ui_improver.distanceInformerUpdate(dstLine,dstSelected);
				dstLine.wup("hide");
				return dstContent;
			})
		});
		if (dstSaved) {
			ui_improver.informTown = dstSaved[0];
			ui_improver.informTownInTown = !!dstSaved[1];
			ui_improver.distanceInformerUpdate(dstLine,dstSelected);
		}
	}
};
ui_improver.distanceInformerUpdate = function(dstLine,dstSelected) {
	dstLine = dstLine || worker.$('#hk_distance .l_capt');
	dstSelected = (dstSelected || worker.$('.edst_headline')).children().last();
	var town = document.getElementsByClassName('e_selected_town')[0];
	if (town) {
		town.classList.remove('e_selected_town');
	}
	town = document.getElementsByClassName('e_chosen_town')[0];
	if (town) {
		town.classList.remove('e_chosen_town');
		}
		if (ui_improver.informTown) {
			dstSelected.html(worker.GUIp_i18n[isNaN(+this.informTown) ? 'town_informer_curtown' : 'town_informer_curms'] + ': <strong>' + GUIp.common.escapeHTML(ui_improver.informTown) + '</strong> [x]');
		dstSelected.attr('title',worker.GUIp_i18n.town_informer_reset);
		dstLine.addClass('edst_header_active');
		dstSelected.addClass('edst_headline_active');
		town = Array.prototype.find.call(document.querySelectorAll('.edst_towns .l'), function(a) {
			return a.textContent === this.informTown;
		}.bind(this));
		if (town) {
			town.parentNode.classList.add('e_chosen_town');
		}
		ui_improver.nearbyTownsFix();
	} else {
		dstSelected.text(worker.GUIp_i18n.town_informer_choose);
		dstSelected.attr('title','');
		dstLine.removeClass('edst_header_active');
		dstSelected.removeClass('edst_headline_active');
	}
};
ui_improver.distanceInformerSet = function(town) {
	// in case we want to set the informer while being in the same town to notify us when we will leave it, add a special mark
	ui_improver.informTown = town.name;
	ui_improver.informTownInTown = ui_stats.townName() === town.name;
	ui_storage.set('townInformer', town.name + (ui_improver.informTownInTown ? ',1' : ''));
	ui_improver.distanceInformerUpdate();
	ui_improver.distanceInformerCheck();
};
ui_improver.distanceInformerReset = function() {
	if (ui_improver.informTown) {
		delete ui_improver.informTown;
		ui_storage.remove('townInformer');
		ui_improver.distanceInformerUpdate();
		ui_improver.distanceInformerCheck();
	}
};
ui_improver.distanceInformerCheck = function() {
	var townInformer = false;
	// we're unsetting the informer when entering the chosen town, and also in case we've set it for a POI and went too far away from it
	if (this.informTown === ui_stats.townName() && !this.informTownInTown || !isNaN(+this.informTown) && Math.abs(ui_stats.mileStones() - +this.informTown) >= 50) {
		delete ui_improver.informTown;
		ui_storage.remove('townInformer');
		this.distanceInformerUpdate();
	} else if (!ui_stats.isGoingBack() && ui_stats.townName() === '' && this.informTown === ui_stats.nearbyTown() || !isNaN(+this.informTown) && ui_stats.mileStones() >= +this.informTown) {
		townInformer = true;
		if (this.informTownInTown) {
			// remove the mark when we're outside of the town
			delete this.informTownInTown;
			ui_storage.set('townInformer', this.informTown);
		}
	}
	ui_informer.update('selected town', townInformer);
};
ui_improver.distanceInformerListBuilder = function(container, isAlpha) {
	container.empty();
	var town, towns, towns_keys, dist, name, desc, townInfo, sh, title = [],
		towns_dists = {},
		gvRoads = ui_improver.dailyForecast.get().includes('gvroads'),
		currentTown = ui_stats.townName();
	try {
		towns = JSON.parse(localStorage.town_c);
		towns_keys = Object.keys(towns.t).sort(function(a, b) { return a - b; });
		for (var i = 0, len = towns_keys.length; i < len; i++) {
			towns_dists[towns_keys[i]] = towns_keys[i] + (towns_keys[i+1] ? '–' + (+towns_keys[i+1] - 1) : '+');
		}
		if (isAlpha) {
			towns_keys = Object.keys(towns.t).sort(function(a, b) { return towns.t[a].localeCompare(towns.t[b]); });
		}
		for (var i = 0, len = towns_keys.length; i < len; i++) {
			dist = +towns_keys[i];
			name = towns.t[dist];
			if (typeof name !== 'string') {
				continue;
			}
			if (gvRoads && currentTown !== name) {
				continue;
			}
			title.length = 0;
			town = worker.$('<div class="edst_tline chf_line"></div>').html('<div class="l">' + GUIp.common.escapeHTML(name) + '</div><div class="r">(' + towns_dists[dist] + ')</div>');
			if (currentTown === name) {
				town.addClass('e_current_town');
				title.push(worker.GUIp_i18n.town_current);
			}
			if (ui_improver.informTown === name) {
				town.addClass('e_chosen_town');
			}
			if ((desc = towns.d[name])) {
				if (desc === 'capital') desc = 'being '+desc;
				title.push(worker.GUIp_i18n.town_banner + desc.replace(/\s*,\s*/, worker.GUIp_i18n.town_as_well_as));
			}
			if ((townInfo = ui_words.base.town_list.find(function(a) { return a.name === name; }))) {
				if (townInfo.wasteFraction &&
					/м(?:ног|ал)о пьют и сберегают|(?:lavish|cheap) parties and (?:good|bad) savings/.test(desc)
				) {
					title.push(GUIp_i18n.fmt('town_waste_fraction', townInfo.wasteFraction));
				}
				if ((townInfo.skillsDiscount || townInfo.skillsMarkup) &&
					/д(?:ешёвы|ороги)е умения|(?:cheap|expensive) skills/.test(desc)
				) {
					title.push(GUIp_i18n.fmt(
						townInfo.skillsDiscount ? 'town_skills_discount' : 'town_skills_markup',
						townInfo.skillsDiscount || townInfo.skillsMarkup
					));
				}
			}
			if ((sh = towns.sh.indexOf(dist)) > -1) {
				town.addClass('e_shifted_town');
				if (towns.t[towns.sh[sh^0x01]]) {
					title.push(worker.GUIp_i18n.fmt('town_shifted', towns.t[towns.sh[sh^0x01]]));
				}
			}
			if (title.length) {
				town.prop('title', title.join('. ') + '.');
			}
			if (!gvRoads) {
				GUIp.common.addListener(town[0], 'click', function(ev) {
					ev.preventDefault();
					ui_improver.distanceInformerSet(this);
				}.bind({name: name}));
			}
			town.appendTo(container);
		}
		if (gvRoads) {
			town = worker.$('<div class="edst_tline chf_line"></div>').html('<div class="c">' + worker.GUIp_i18n.town_informer_gvroads + '</div>');
			town.appendTo(container);
			GUIp.common.addListener(town[0], 'click', function(ev) {
				ev.preventDefault();
				ui_improver.distanceInformerSet(this);
			}.bind({name: towns.t[0]}));
		}
	} catch (e) {}
};
ui_improver.generateNewspaperSummary = function() {
	var s = GUIp_i18n.daily_forecast + (
		ui_improver.dailyForecast.get().length ? ': [' + ui_improver.dailyForecast.get().map(function(a) {
			if (a === 'specbosses' && ui_improver.dailyForecastSpecBoss.get().length) {
				a += ' (' + ui_improver.dailyForecastSpecBoss.get() + ')';
			}
			return a;
		}).join(', ') + ']\n' : ':\n'
	) + ui_improver.dailyForecastText.get();
	var couponPrize = ui_storage.get('Newspaper:couponPrize:raw') || '',
		activeAdvert = ui_storage.get('Newspaper:activeAdvert') || '',
		activeAdvertButton = ui_storage.get('Newspaper:activeAdvert:button');
	if (activeAdvert) {
		s += GUIp_i18n.fmt('ad_available', activeAdvert, activeAdvertButton);
	}
	if (ui_improver.bingoTries.get()) {
		s += GUIp_i18n.fmt('bingo_summary',
			GUIp_i18n.plfmt('bingo_slots_', ui_inventory.getBingoSlots().length),
			GUIp_i18n.plfmt('bingo_clicks_', ui_improver.bingoTries.get())
		);
	}
	if (couponPrize) {
		s += GUIp_i18n.fmt('coupon_available', couponPrize);
	}
	if (ui_storage.getFlag('Newspaper:godpowerCap')) {
		s += GUIp_i18n.godpower_cap_available;
	}
	return s;
};
ui_improver.showDailyForecast = function() {
	if (ui_data.isMobile) {
		var node = document.getElementById('e_forecast');
		if (node) {
			if (ui_improver.dailyForecast.get().length) {
				node.innerText = ui_improver.dailyForecast.get().map(function(a) {
					if (a === 'specbosses' && ui_improver.dailyForecastSpecBoss.get().length) {
						a += ' (' + ui_improver.dailyForecastSpecBoss.get() + ')';
					}
					return a;
				}).join(', ');
			} else {
				node.innerText = 'none';
			}
		}
		node = document.getElementsByClassName('e_m_available_coupon')[0];
		if (node) {
			var couponPrize = ui_storage.get('Newspaper:couponPrize:raw') || '';
			if (couponPrize) {
				node.firstChild.textContent = GUIp_i18n.fmt('coupon_available_mobile', couponPrize);
				ui_utils.hideElem(node,false);
			} else {
				ui_utils.hideElem(node,true);
			}
		}
		node = document.getElementsByClassName('e_m_available_ad')[0];
		if (node) {
			var adButton = ui_storage.get('Newspaper:activeAdvert:button') || '';
			if (adButton) {
				node.firstChild.textContent = GUIp_i18n.fmt('ad_available_mobile', adButton);
				ui_utils.hideElem(node,false);
			} else {
				ui_utils.hideElem(node,true);
			}
		}
		return;
	}
	var forecastLink = document.getElementById('e_forecast'),
		news = document.getElementById('m_hero').previousElementSibling,
		dfcTimer = 0,
		fr;
	if (forecastLink) {
		if (this.dailyForecastText.get()) {
			forecastLink.title = ui_improver.generateNewspaperSummary();
		} else {
			forecastLink.parentNode.removeChild(forecastLink);
		}
	} else if (news && this.dailyForecastText.get()) {
		forecastLink = document.createElement('a');
		forecastLink.id = 'e_forecast';
		forecastLink.textContent = '❅';
		forecastLink.href = '/news';
		forecastLink.title = ui_improver.generateNewspaperSummary();
		if (GUIp.common.isAndroid) {
			GUIp.common.addListener(forecastLink, 'click', function(ev) {
				ev.preventDefault();
				worker.alert(this.title);
			});
		} else {
			GUIp.common.addListener(forecastLink, 'click', function(ev) { ev.preventDefault(); });
		}
		fr = document.createDocumentFragment();
		fr.appendChild(document.createTextNode(' '))
		fr.appendChild(forecastLink);
		news.insertBefore(fr, news.lastElementChild.nextSibling);
	}
	if (!ui_utils.isAlreadyImproved(news)) {
		GUIp.common.addListener(news, 'mousedown', function(e) {
			if (e.button !== 0) { return; }
			dfcTimer = GUIp.common.setTimeout(function() {
				e.preventDefault();
				ui_data._getNewspaper(true);
				worker.alert(worker.GUIp_i18n.daily_forecast_update_notice);
			},1200);
		});
		GUIp.common.addListener(news, 'mouseup', function(e) {
			if (e.button !== 0) { return; }
			if (dfcTimer) {
				worker.clearTimeout(dfcTimer);
			}
		});
	}
};
ui_improver._onSubCheckboxClick = function() {
	// this: HTMLInputElement
	// see markup below
	var mask = this.dataset.eMask;
	if (!mask) return;
	var subscriptions = GUIp.common.parseJSON(ui_storage.get('ForumSubscriptions')) || {},
		tid = this.parentNode.dataset.eTid,
		sub = subscriptions[tid];
	if (!sub) return;

	if (this.checked) {
		sub.notifications |= mask;
	} else {
		sub.notifications &= ~mask;
	}
	ui_storage.set('ForumSubscriptions', JSON.stringify(subscriptions));
};
ui_improver.showSubsLink = function() {
	if (ui_data.isMobile) return;
	var subsLink = document.getElementById('e_subs'),
		forumLink, fr;
	if (!subsLink) {
		forumLink = document.querySelector('#menu_bar a[href="/forums"]');
		if (forumLink) {
			var subs_target = '/forums/show/1/#guip_subscriptions';
			subsLink = document.createElement('a');
			subsLink.id = 'e_subs';
			subsLink.className = 'em_font';
			subsLink.textContent = '▶';
			subsLink.href = subs_target;
			subsLink.title = worker.GUIp_i18n.forum_subs_short;
			fr = document.createDocumentFragment();
			fr.appendChild(document.createTextNode(' '));
			fr.appendChild(subsLink);
			forumLink.parentElement.insertBefore(fr, forumLink.parentElement.lastElementChild.nextSibling);
			worker.$('#e_subs').wup({
				title: worker.GUIp_i18n.forum_subs_short,
				placement: 'bottom',
				onShow: GUIp.common.try2.bind(null, function onSubsShow(t) {
					var wup = t[0],
						pos = parseInt(wup.style.left);
					if (pos < 5) {
						wup.style.left = '10px';
						wup.firstElementChild.style.left = (parseInt(wup.firstElementChild.style.left) - (10 - pos)) + 'px';
					}
					wup.classList.add('e_subs_wup');
				}),
				content: GUIp.common.try2.bind(null, function createSubsContent() {
					var fsubsContent = $('<div class="esubs_content"></div>');
						var fsubsLine, subscriptions = GUIp.common.parseJSON(ui_storage.get('ForumSubscriptions')) || {},
							informers = GUIp.common.parseJSON(ui_storage.get('ForumInformers')) || {},
							topics = Object.keys(subscriptions).filter(function(tid) {
								return /^\d+$/.test(tid) && subscriptions[tid] && typeof subscriptions[tid] === 'object';
							}).slice(0, 500),
							tid, sub, page, title;
						topics.sort(function(a,b) { return (+subscriptions[b].date || 0) - (+subscriptions[a].date || 0); });
						for (var i = 0, len = topics.length; i < len; i++) {
							tid = topics[i];
							sub = subscriptions[tid];
						sub.by = GUIp.common.escapeHTML(String(sub.by || '').slice(0, 256));
						sub.posts = Math.max(0, Math.min(1e7, parseInt(sub.posts, 10) || 0));
						page = Math.ceil(sub.posts / 25);
						title = GUIp.common.escapeHTML(String(sub.name || '').slice(0, 512));
						fsubsLine = worker.$('<div class="esubs_line"></div>').html(
							'<div class="title">' +
								'<img alt="Comment" class="' + (tid in informers ? 'green' : 'grey') +
									'" src="/images/forum/clearbits/comment.gif" />' +
								' <a href="/forums/show_topic/' + tid + '" title="' + title + '" target="_blank">' +
									title +
								'</a>' +
							'</div>' +
							'<div class="info">' +
								GUIp.common.formatTime(new Date(sub.date),'simpledate') +
								', ' +
								GUIp.common.formatTime(new Date(sub.date),'simpletime') +
								'<span class="em_font"> ➠ </span>' +
								'<a href="/forums/show_topic/' + tid + '?page=' + page +
									'&epost=' + (sub.posts + 25 - page*25) +
									'" title="' + worker.GUIp_i18n.forum_subs_info + sub.by +
									'" target="_blank">' +
									sub.by +
								'</a>' +
							'</div>' +
							'<div class="options" data-e-tid="' + tid + '">' +
								(GUIp.common.notif.supported ?
									'<input type="checkbox" data-e-mask="1" ' +
									(sub.notifications & 0x1 ? ' checked' : '') +
									' title="' + GUIp_i18n.forum_subs_desktop_notif + '" />'
								: '') +
								'<input type="checkbox" data-e-mask="2" ' +
									(sub.notifications & 0x2 ? ' checked' : '') +
									' title="' + GUIp_i18n.forum_subs_sound_notif + '" />' +
							'</div>' +
							'<div style="clear: both;"></div>'
						);
						fsubsLine.appendTo(fsubsContent);
					}
					fsubsLine = worker.$('<div class="esubs_line"></div>').html('<div class="c"><a href="' + subs_target + '" target="_blank">' + worker.GUIp_i18n.forum_subs_full + '</a></div>');
					fsubsLine.appendTo(fsubsContent);
					fsubsContent.on('click', 'input', function() {
						GUIp.common.try2.call(this, ui_improver._onSubCheckboxClick);
					});
					worker.$('#e_subs').wup("hide");
					return fsubsContent;
				})
			});
		}
	}
};

ui_improver.parseDungeonSouls = function(finished) {
	if (!ui_data.availableGameModes.includes('souls')) {
		return;
	}
	var step, found = false,
		steps = Object.keys(this.chronicles).length;
	for (step = steps; step > 0; step--) {
		if (this.chronicles[step].marks.includes('boss') && this.parseDungeonFightResults(step)) {
			found = true;
			break;
		}
	}
	if (!found && finished) {
		ui_timers.updateDungeonSouls({
			type: 'souls',
			date: ui_utils.parseDiaryDate(this.chronicles[steps].time),
			result: 0,
			inID: ui_data.logId
		});
	}
};

ui_improver.parseDungeonFightResults = function(step) {
	if (!ui_data.availableGameModes.includes('souls')) {
		return;
	}
	var result, date;
	if (!(result = GUIp.common.parseDungeonResultFromStep(this.chronicles[step].text, ui_data.char_name, ui_stats.Hero_Ally_Names(), GUIp.common.parseGatheredSoul))) {
		return false;
	}
	date = this.chronicles[step+1] ? (ui_utils.parseDiaryDate(this.chronicles[step+1].time) - 30e3) : ui_utils.parseDiaryDate(this.chronicles[step].time); /* chronicle logs have times set at the start of a fight, so try getting the next step if available */
	ui_timers.updateDungeonSouls({
		type: 'souls',
		date: date,
		result: 1,
		inID: ui_data.logId
	});
	GUIp.common.updateGatheredSouls(ui_storage, date, 2, result);
	return true;
};

ui_improver.parseChronicles = function(xhr) {
	this.needLog = false;

	var page = document.createElement('div'),
		currentStep = ui_stats.currentStep(),
		isMobileChronicle;
	page = new worker.DOMParser().parseFromString(xhr.responseText, 'text/html').body;
	isMobileChronicle = !!page.querySelector('#main_page .ui-bar');

	this.parseDungeonExtras(page.querySelectorAll(isMobileChronicle ? '.li_capt ~ div.new_line.d_imp .text_content' : '#last_items_arena .d_imp .text_content'), null, currentStep); // in case first step is already gone in on-page chronicles
	GUIp.common.parseChronicles.call(ui_improver, page, currentStep, {
		putDMLink: ui_storage.getList('Option:dungeonMapSettings').includes('dmln'),
		isMobile: isMobileChronicle
	});
	page = null;

	// data on the chronicle page is assumed always to be complete, so we can just rebuild allsHP object from scratch using it
	var hpMatch, hpRE = isMobileChronicle ? /<a href=["']\/gods\/.*?><span class=["']all_name["']>(.*?)\n[^]+?<span id=["']hp\d["']>\d+<\/span>\/(\d+)/g : /<a href=["']\/gods\/.*?>(.*?)<\/a>[^]+?<span id=["']hp\d["']>\d+<\/span> \/ (\d+)/g,
		hpCountAllies = ui_stats.Hero_Alls_Count(),
		hpCountEnemies = ui_stats.Enemy_Count(),
		hpObj = {a: [], e: [], sum: 0};
	while (hpMatch = hpRE.exec(xhr.responseText)) {
		for (var i = 0; i < hpCountAllies; i++) {
			if (ui_stats.Hero_Ally_Name(i+1) === hpMatch[1]) {
				hpObj.a[i] = +hpMatch[2];
				if (hpMatch[1][0] !== '+') {
					hpObj.sum += hpObj.a[i];
				}
				break;
			}
		}
	}
	hpRE = isMobileChronicle ? /<a href=["']https?:\/\/wiki\.[^"']+\/.*?><span class=["']all_name["']>(.*?)<\/span>[^]+?<span id=["']hp\d["']>\d+<\/span>\/(\d+)/g : /<a href=["']https?:\/\/wiki\.[^"']+\/.*?>(.*?)<\/a>[^]+?<span id=["']hp\d["']>\d+<\/span> \/ (\d+)/g
	while (hpMatch = hpRE.exec(xhr.responseText)) {
		for (var i = 0; i < hpCountEnemies; i++) {
			if (isMobileChronicle) {
				// in mobile chronicle boss name AND its abilities are simply put together, so we need to filter abilities out
				hpMatch[1] = hpMatch[1].replace(new RegExp(Object[worker.GUIp_locale === 'ru' ? 'keys' : 'values'](GUIp.common.bossAbilitiesList).join('|')+'|,','ig'),'').trim()
			}
			if (ui_stats.EnemySingle_Name(i+1) === hpMatch[1]) {
				hpObj.e[i] = +hpMatch[2];
				break;
			}
		}
	}
	if (hpObj.sum > 0 && hpObj.a.length === hpCountAllies && hpObj.e.length === hpCountEnemies) {
		ui_improver.allsHP = hpObj;
		ui_storage.set('Log:' + ui_data.logId + ':allshp', JSON.stringify(ui_improver.allsHP));
	}
	this.parseDungeonSouls(this.isDungeonFinished(currentStep));
	this.colorDungeonMap();
};
ui_improver.deleteInvalidChronicles = function() {
	var isHiddenChronicles = true,
		chronicles = document.querySelectorAll('#m_fight_log .line.d_line');
	for (var i = chronicles.length - 1; i >= 0; i--) {
		if (isHiddenChronicles) {
			if (chronicles[i].style.display !== 'none') {
				isHiddenChronicles = false;
			}
		} else {
			if (chronicles[i].style.display === 'none') {
				chronicles[i].parentNode.removeChild(chronicles[i]);
			}
		}
	}
};
ui_improver.improveChronicles = function() {
	if (!GUIp.common[GUIp.common.dungeonPhrases[GUIp.common.dungeonPhrases.length - 1] + 'RegExp']) {
		GUIp.common.getDungeonPhrases(ui_improver.improveChronicles.bind(ui_improver),null);
	} else {
		//ui_improver.deleteInvalidChronicles();
		var i, len, lastNotParsed, cur_pos, cur_step, time = '', texts = [], infls = [],
			chronicles = document.querySelectorAll(ui_data.isMobile ? '.e_m_fight_log .d_msg:not(.parsed)' : '#m_fight_log .d_msg:not(.parsed)'),
			sort_ch = ui_data.isMobile || document.getElementsByClassName('sort_ch')[0],
			ch_down = !(sort_ch && sort_ch.textContent === '▲'),
			step = ui_stats.currentStep();
		for (cur_step = step, len = chronicles.length, i = ch_down ? 0 : len - 1; (ch_down ? i < len : i >= 0) && step; ch_down ? i++ : i--) {
			lastNotParsed = true;
			if (!chronicles[i].className.includes('m_infl')) {
				texts = [chronicles[i].textContent].concat(texts);
			} else {
				infls = [chronicles[i].textContent].concat(infls);
			}
			if (chronicles[i].previousElementSibling && chronicles[i].previousElementSibling.className.includes('d_time')) {
				time = chronicles[i].previousElementSibling.textContent.trim() || time;
			}
			if (chronicles[i].parentNode.className.includes(ch_down ? 'turn_separator' : 'turn_separator_inv')) {
				GUIp.common.parseSingleChronicle.call(ui_improver, texts, infls, time, step);
				lastNotParsed = false;
				time = '';
				texts = [];
				infls = [];
				step--;
			}
			if (!chronicles[i].className.includes('m_infl')) {
				if (GUIp.common.bossHintRegExp.test(chronicles[i].textContent)) {
					chronicles[i].parentNode.classList.add('bossHint');
					// workaround for an issue when there are two adjacent bosses and bossHint entry is added to the chronicle with a delay,
					// so it never gets inserted into chronicles object and never painted on the already processed map
					if (!this.needLog && step === cur_step && ui_improver.chronicles[cur_step] && !ui_improver.chronicles[cur_step].marks.includes('bossHint')) {
						ui_improver.chronicles[cur_step].marks.push('bossHint');
						if (cur_pos = document.querySelector((ui_data.isMobile ? '.e_m_dmap' : '#map') + ' .map_pos')) {
							cur_pos.classList.add('bossHint');
						}
					}
				}
				if (/voice from above announced that all bosses in|голос откуда-то сверху сообщил, что ни единого живого босса/.test(chronicles[i].textContent)) {
					chronicles[i].innerHTML = chronicles[i].innerHTML.replace(/A pleasant voice from above announced that all bosses in this dungeon have perished and wished the intruders to burn in hell\.|Приятный голос откуда-то сверху сообщил, что ни единого живого босса (?:в этом подземелье|здесь) не осталось, и пожелал виновникам гореть в аду\./, '<strong>$&</strong>');
				}
			}
			chronicles[i].classList.add('parsed');
		}
		if (lastNotParsed) {
			GUIp.common.parseSingleChronicle.call(ui_improver, texts, infls, time, step);
		}

		if (this.needLog) {
			if (Object.keys(this.chronicles)[0] === '1' && chronicles.length < 20 && (cur_step === document.querySelectorAll((ui_data.isMobile ? '.e_m_fight_log' : '#m_fight_log') + ' .turn_separator' + (!ch_down ? '_inv' : '')).length)) {
				this.needLog = false;
				this.parseDungeonSouls(this.isDungeonFinished(cur_step));
				this.colorDungeonMap();
			} else if (this.dungeonXHRCount < 3) {
				this.dungeonXHRCount++;
				GUIp.common.requestLog(ui_data.logId, ui_improver.parseChronicles.bind(ui_improver));
			}
		} else {
			if (this.dungeonExtras.transformationPending || !this.dungeonExtras.stairsOffset) {
				// we may need to call this on transformationPending since title in map block can be updated with an arbitrary delay, and also until stairsOffset is populated
				this.parseDungeonExtras([], ui_data.isMobile ? document.querySelector('.e_m_dmap > div') : document.querySelector('#map .block_content > div > div'), cur_step);
			}
			// check for gathered souls
			if (this.chronicles[cur_step]) {
				if (this.isDungeonFinished(cur_step)) {
					this.parseDungeonSouls(true);
				} else if (this.chronicles[cur_step].marks.includes('boss')) {
					this.parseDungeonFightResults(cur_step);
				}
			}
		}

		// informer
		if (Object.keys(this.chronicles).length) {
			ui_informer.update('close to boss', false); // we want to explicitly _restart_ this informer over again on each step that has the bossHint mark
			ui_informer.update('close to boss', this.chronicles[Object.keys(this.chronicles).pop()].marks.includes('bossHint'));
		}

		if (ui_storage.get('Log:current') !== ui_data.logId) {
			ui_storage.set('Log:current', ui_data.logId);
			ui_storage.set('Log:' + ui_data.logId + ':dlMoves', '{}');
			ui_storage.set('Log:' + ui_data.logId + ':whMoves', '{}');
			// detect dungeons of pledge and dungeons of mysterious pledge
			if (GUIp.common.checkParsedDungeonType(this.dungeonExtras, 'pledge')) {
				ui_logger.appendLogs(-1);
				ui_logger.finishBatch();
			} else if (GUIp.common.checkParsedDungeonType(this.dungeonExtras, 'mystery')) {
				GUIp.common.getDomainXHR('/gods/api/' + encodeURIComponent(ui_data.god_name), function(xhr) {
					var logs = +ui_storage.get('Logger:Logs');
					try {
						logs = JSON.parse(xhr.responseText).wood_cnt - logs;
						if (!logs) return;
					} catch (e) {
						GUIp.common.warn('got invalid JSON from /gods/api/:', xhr.responseText);
						return;
					}
					// we calculate a difference instead of just showing "wd-1" in case user has opened a dungeon
					// after being inactive for some time
					ui_logger.appendLogs(logs);
					ui_logger.finishBatch();
					// and update detected type
					ui_improver.parseDungeonExtras([], 'pledge', cur_step);
				}, function(xhr) {
					GUIp.common.warn('failed to load /gods/api/ (' + xhr.status + '):', xhr.responseText);
				});
			}
		}
		ui_storage.set('Log:' + ui_data.logId + ':steps', ui_stats.currentStep());
		ui_storage.set('Log:' + ui_data.logId + ':map', JSON.stringify(ui_improver.getDungeonMap()));

		// stream the dungeon
		if (this.streamingManager.active) {
			this.streamingManager.uploadStep();
		}
	}
};

ui_improver.isDungeonFinished = function(step) {
	var step = step || ui_stats.currentStep(),
		chronicle = this.chronicles[step] || this.chronicles[Object.keys(this.chronicles).length];
	if (
		chronicle.marks.includes('treasureChest') || chronicle.marks.includes('vault') ||
		(step >= (GUIp.common.checkParsedDungeonType(this.dungeonExtras, 'hurry') ? 50 : 100)) ||
		(ui_stats.Hero_Alls_AliveCount() + (ui_stats.HP() > 1 ? 1 : 0)) < 2
	) {
		return true;
	}
	return false;
};

ui_improver.getDungeonMap = function() {
	var result = [];
	Array.prototype.forEach.call(document.getElementsByClassName('dml'), function(row) {
		result.push(Array.prototype.map.call(row.getElementsByClassName('dmc'), function(a) {
			return a.textContent.trim();
		}));
	});
	return result;
};

ui_improver.colorDungeonMap = function() {
	if (!ui_data.isDungeon || ui_improver.needLog || ui_data.isMobile && !document.getElementsByClassName('e_m_dmap')[0]) {
		return;
	}
	var step, mapCells, currentCell, trapMoveLossCount = 0,
		isJumping = GUIp.common.checkParsedDungeonType(this.dungeonExtras, 'jumping'),
		isStepInCellar = false,
		isMapInCellar = GUIp.common.isDungeonCellar(),
		coords = GUIp.common.calculateExitXY(isMapInCellar),
		heroesCoords = GUIp.common.calculateXY(GUIp.common.getOwnCell()),
		steps = Object.keys(this.chronicles),
		steps_max = steps.length;
	if (steps_max !== ui_stats.currentStep()) {
		GUIp.common.warn('step count mismatch: parsed=' + steps_max + ', required=' + ui_stats.currentStep());
		return;
	}
	if ((this.dungeonExtras.nookOffset.x || this.dungeonExtras.nookOffset.y) && (this.dungeonExtras.nookOffset.x + coords.x) === heroesCoords.x && (this.dungeonExtras.nookOffset.y + coords.y) === heroesCoords.y) {
		GUIp.common.debug('party has entered the nook');
		if ((this.dungeonExtras.reward === 'transformation' || this.dungeonExtras.reward === 'unknown') && !this.dungeonExtras.transformationComplete) {
			this.dungeonExtras.transformationPending = true; // now we should wait for a transformation
		}
	}
	// load guidedSteps data if it's not present yet
	this.dungeonGuidedSteps = this.dungeonGuidedSteps || JSON.parse(ui_storage.get('Log:' + ui_data.logId + ':guidedSteps')) || {};
	// describe map
	mapCells = document.getElementsByClassName('dml');
	GUIp.common.dmapTitlesFixup(mapCells);
	// add the description of the first step to the staircase cell if we're in a basement - to help remind dungeon start conditions
	if (isMapInCellar && mapCells[coords.y] && mapCells[coords.y].children[coords.x] && this.chronicles[1]) {
		GUIp.common.describeCell(mapCells[coords.y].children[coords.x],1,steps_max,this.chronicles[1],trapMoveLossCount);
	}
	for (step = 1; step <= steps_max; step++) {
		if (!this.chronicles[step]) {
			GUIp.common.error('data for step #' + step + ' is missing, colorizing map failed');
			return;
		}
		// check moving to or from the subfloor
		if (this.chronicles[step].marks.includes('staircase')) {
			isStepInCellar = !isStepInCellar;
		}
		// if currently shown map is unrelated to this step - we just don't care and move on till we get again on the proper map
		if (isStepInCellar !== isMapInCellar) {
			GUIp.common.markGuidedSteps.call(this,step,isJumping,mapCells,null); // this will do fine without coordinates or proper direction if it's not the dungeon of jumping
			continue;
		}
		// directionless step
		if (this.chronicles[step].directionless) {
			this.directionlessMoves = this.directionlessMoves || JSON.parse(ui_storage.get('Log:' + ui_data.logId + ':dlMoves')) || {};
			if (this.directionlessMoves[step]) {
				this.chronicles[step].direction = this.corrections[this.directionlessMoves[step]];
				this.chronicles[step].directionless = false;
			} else {
				Object.assign(this.directionlessMoves,GUIp.common.calculateDirectionlessMove.call(ui_improver, coords, step));
				if (this.directionlessMoves[step]) {
					this.chronicles[step].direction = this.corrections[this.directionlessMoves[step]];
					this.chronicles[step].directionless = false;
					ui_storage.set('Log:' + ui_data.logId + ':dlMoves',JSON.stringify(this.directionlessMoves));
				}
			}
		}
		// try to properly count the number of steps which had directional godvoices
		GUIp.common.markGuidedSteps.call(this,step,isJumping,mapCells,coords);
		// normal step
		GUIp.common.moveCoords(coords, this.chronicles[step]);
		// wormhole jump
		if (this.chronicles[step].wormhole) {
			this.wormholeMoves = this.wormholeMoves || JSON.parse(ui_storage.get('Log:' + ui_data.logId + ':whMoves')) || {};
			if (this.wormholeMoves[step]) {
				this.chronicles[step].wormholedst = this.wormholeMoves[step];
			} else if (step === steps_max) {
				GUIp.common.debug('getting wormhole target from actual coords mismatch');
				this.chronicles[step].wormholedst = [heroesCoords.y - coords.y, heroesCoords.x - coords.x];
				this.wormholeMoves[step] = this.chronicles[step].wormholedst;
				ui_storage.set('Log:' + ui_data.logId + ':whMoves',JSON.stringify(this.wormholeMoves));
			} else {
				var result = GUIp.common.calculateWormholeMove.call(ui_improver, coords, step);
				if (result.wm) {
					this.directionlessMoves = this.directionlessMoves || JSON.parse(ui_storage.get('Log:' + ui_data.logId + ':dlMoves')) || {};
					Object.assign(this.wormholeMoves,result.wm);
					Object.assign(this.directionlessMoves,result.dm);
					this.chronicles[step].wormholedst = this.wormholeMoves[step];
					ui_storage.set('Log:' + ui_data.logId + ':whMoves',JSON.stringify(this.wormholeMoves));
					ui_storage.set('Log:' + ui_data.logId + ':dlMoves',JSON.stringify(this.directionlessMoves));
				}
			}
			if (this.chronicles[step].wormholedst !== null) {
				if (mapCells[coords.y] && mapCells[coords.y].children[coords.x]) {
					currentCell = mapCells[coords.y].children[coords.x];
					GUIp.common.describeCell(currentCell,step,steps_max,this.chronicles[step],trapMoveLossCount,true);
				}
				coords.y += this.chronicles[step].wormholedst[0];
				coords.x += this.chronicles[step].wormholedst[1];
			}
		}
		if (!mapCells[coords.y] || !mapCells[coords.y].children[coords.x]) {
			break;
		}
		currentCell = mapCells[coords.y].children[coords.x];
		if (currentCell.textContent.trim() === '#') {
			GUIp.common.error(
				'parsed chronicle does not match the map at step #' + step +
				': either direction ("' + this.chronicles[step].direction + '") is invalid or map is out of sync!');
			break;
		}
		if (currentCell.textContent.trim() === '✖') {
			this.chronicles[step].chamber = true;
		} else if (currentCell.textContent.trim() === '◿') {
			this.chronicles[step].staircase = true;
		}
		if (this.chronicles[step].pointers.length > 0) {
			currentCell.dataset.pointers = this.chronicles[step].pointers.join(' ');
		}
		trapMoveLossCount = GUIp.common.describeCell(currentCell,step,steps_max,this.chronicles[step],trapMoveLossCount);
	}
	if (heroesCoords.x !== coords.x || heroesCoords.y !== coords.y) {
		console.log(heroesCoords,coords);
		console.log(ui_improver.chronicles);
		console.log(JSON.stringify(ui_improver.chronicles));
		GUIp.common.error(
			'chronicle processing failed, coords diff: x: ' + (heroesCoords.x - coords.x) + ', y: ' + (heroesCoords.y - coords.y));
		if (ui_utils.hasShownInfoMessage !== true) {
			ui_utils.showMessage('info', {
				title: worker.GUIp_i18n.coords_error_title,
				content: '<div>' + worker.GUIp_i18n.coords_error_desc + ': [x:' + (heroesCoords.x - coords.x) + ', y:' + (heroesCoords.y - coords.y) + '].</div>'
			});
			ui_utils.hasShownInfoMessage = true;
		}
		// reset possibly wrong corrections to try again on the next step
		if (this.directionlessMoves) {
			Object.values(this.chronicles).forEach(function(ch) {
				if (ch.marks.includes('directionless')) {
					ch.direction = null;
					ch.directionless = true;
				}
			});
			this.directionlessMoves = null;
			ui_storage.set('Log:' + ui_data.logId + ':dlMoves','{}');
		}
		if (this.wormholeMoves) {
			this.wormholeMoves = null;
			ui_storage.set('Log:' + ui_data.logId + ':whMoves','{}');
		}
	}
	// check for evacuation
	coords = GUIp.common.calculateExitXY(isMapInCellar);
	if (steps_max > 20 && heroesCoords.x === coords.x && heroesCoords.y === coords.y) {
		this.parseDungeonSouls(true);
	}
	// save accumulated guided steps information
	ui_storage.set('Log:' + ui_data.logId + ':guidedSteps',JSON.stringify(this.dungeonGuidedSteps));
	// update broadcast link
	ui_utils.updateBroadcastLink(document.getElementById('e_broadcast'));
	ui_utils.updateBroadcastLink(document.querySelector('div.fightblink a'));
	// bind treasure pointer switchers
	GUIp.common.dmapDisabledPointersBind(function() {
		ui_storage.set('Log:' + ui_data.logId + ':dptr', JSON.stringify(GUIp.common.dmapDisabledPointersCache));
	}, GUIp.common.improveMap.bind(this));
	// map settings
	var dmapSettings = ui_storage.getList('Option:dungeonMapSettings');
	// mark exclamations or demolished walls
	if (!this.isFirstTime && (['clarity','demolition','mystery'].some(function(type) { return GUIp.common.checkParsedDungeonType(ui_improver.dungeonExtras, type); }) || Object.keys(GUIp.common.dmapAuxCache).length)) {
		GUIp.common.dmapAuxProc({
			shown: dmapSettings.includes('excl'),
			processWalls: ['demolition','mystery'].some(function(type) { return GUIp.common.checkParsedDungeonType(ui_improver.dungeonExtras, type); }),
			processExclamations: ['clarity','mystery'].some(function(type) { return GUIp.common.checkParsedDungeonType(ui_improver.dungeonExtras, type); })
		});
		if (Object.keys(GUIp.common.dmapAuxCache).length) {
			ui_storage.set('Log:' + ui_data.logId + ':auxcache', JSON.stringify(GUIp.common.dmapAuxCache));
		}
	}
	// highlight treasury on the map
	GUIp.common.improveMap.call(this);
	// print dungeon coords
	GUIp.common.dmapCoords();
	// print dungeon dimensions
	var node = ui_data.isMobile ? document.getElementsByClassName('e_mt_dmap')[0] : document.querySelector('#map .block_title');
	if (node) {
		var mapDimensions;
		if (!(mapDimensions = node.getElementsByClassName('dmapDimensions')[0])) {
			mapDimensions = document.createElement('span');
			mapDimensions.classList.add('dmapDimensions');
			ui_utils.hideElem(mapDimensions, !dmapSettings.includes('dims'));
			node.insertBefore(mapDimensions,document.querySelector('#map .block_title #e_broadcast'));
		}
		mapDimensions.textContent = GUIp.common.dmapDimensions();
	}
	// add an explanation to a combined dungeon type
	if (ui_improver.dungeonExtras.type === 'multi') {
		GUIp.common.explainDungeonType(ui_improver.dungeonExtras);
	}
};

ui_improver.parseDungeonExtras = function(impNodes, dungeonType, step) {
	if (GUIp.common.parseDungeonExtras(this.dungeonExtras, impNodes, dungeonType, step)) {
		ui_storage.set('Log:' + ui_data.logId + ':extras', JSON.stringify(this.dungeonExtras));
	}
};

ui_improver.improveMutationChronicles = function(oldAbility, newAbility) {
	var node, chronicle, chronicles = document.querySelectorAll(ui_data.isMobile ? '.e_m_fight_log .d_msg:not(.parsed)' : '#m_fight_log .d_msg:not(.parsed)'),
		sort_ch = ui_data.isMobile || document.getElementsByClassName('sort_ch')[0],
		ch_down = !(sort_ch && sort_ch.textContent === '▲'),
		replaced = false,
		currentStep = ui_stats.currentStep();
	for (var i = 0, len = chronicles.length; i < len; i++) {
		var chronicle = chronicles[ch_down ? i : len - 1 - i];
		// this will add abilities swap details to latest mutation event chronicle entry
		// in assumtion that exatly this is the one related to the most recent mutation;
		// also mark everything else as 'parsed' to ensure that we won't touch them later
		if (!replaced && chronicle.textContent.startsWith('\uD83E\uDDEC ')) { /* 🧬 */
			chronicle.innerHTML = chronicle.innerHTML.replace('\uD83E\uDDEC', '<span class="e_mutated e_select_disabled">\uD83E\uDDEC</span>');
			replaced = true;
			if ((node = chronicle.getElementsByClassName('e_mutated')[0])) {
				node.title = worker.GUIp_i18n.step_n + currentStep + ': ' + ui_utils.capitalizeFirstLetter(oldAbility) + ' \u2192 ' /* → */ + ui_utils.capitalizeFirstLetter(newAbility);
				GUIp.common.tooltips.watchSubtree(node);
			}
		}
		// we need to keep track which step each d_msg actually belongs to
		if (chronicle.parentNode.classList.contains('turn_separator' + (!ch_down ? '_inv' : ''))) {
			currentStep--;
		}
		chronicle.classList.add('parsed');
	}
};

/** @namespace */
ui_improver.reporter = {
	// module loading order is arbitrary, so we cannot simply assign a field
	/** @type {string} */
	get url() { return (worker.GUIp_locale === 'ru' ? GUIp.common.erinome_url : GUIp.common.erinome_url_en) + '/reporter'; },
	/** @type {string} */
	get urlMS() { return GUIp.common.erinome_url + '/mapStreamer'; },

	/**
	 * @param {string} logID
	 * @returns {string}
	 */
	getLogURL: function(logID) {
		return ui_data.isDungeon ? '/duels/log/' + logID + '?sort=desc&estreaming=1' : this.url + '/duels/log/' + logID;
	},

	_getHTML: function(id) {
		var node = document.getElementById(id);
		return node ? node.outerHTML : '';
	},

	// we have to convert the mobile layout to something that would resemble a desktop one so it matches the reporter service inputs
	_getMobileHTML: function(id) {
		var node, result = '';
		switch (id) {
		case 'alls':
			node = document.querySelectorAll('.e_m_alls .line.oppl');
			if (node.length) {
				var span;
				// a minimal skeleton of a block with desktop layout
				result = '<div id="alls" class="block"><div class="block_h"><span class="l_slot"></span><h2 class="block_title">' + worker.GUIp_i18n.sailors + '</h2><span class="r_slot"></span></div><div class="block_content"><div><div>';
				Array.prototype.forEach.call(node, function(a) {
					a = a.cloneNode(true);
					span = document.createElement('span');
					span.innerText = '(?)'; // we don't have direct access to allies godnames in mobile sailing layout, and for now it seems there's no acceptable way to get this information
					span.style.fontSize = '12px';
					a.getElementsByClassName('opp_ng')[0].appendChild(span);
					result += a.outerHTML;
				});
				// end of block
				result += '</div></div><div class="line"></div></div></div>';
			}
			break;
		case 's_map':
			node = document.getElementById('map_wrap');
			if (node && (node = node.parentNode)) {
				result = '<div id="s_map" class="block"><div class="block_h"><span class="l_slot"> </span><h2 class="block_title" style="width: 822px;">' + worker.GUIp_i18n.map + '</h2><span class="r_slot"></span></div><div class="block_content">';
				result += node.outerHTML;
				result += '<div class="dir_resp" style="display:none;"></div></div></div>';
			}
			break;
		case 'm_fight_log':
			node = document.querySelector('.e_m_fight_log .d_content');
			if (node) {
				var chronicleTitle = (document.querySelector('.e_mt_fight_log .l_header') || '').textContent || 'Chronicle';
				result = '<div id="m_fight_log" class="block"><div class="block_h"><span class="l_slot"></span><h2 class="block_title">' + chronicleTitle + '</h2><span class="r_slot"></span></div><div class="block_content"><div id="turn_pbar" class="line"><div class="p_bar"><div class="p_val" style="background-color: rgb(179, 189, 200); width: 0%; overflow: hidden;"></div></div></div><div>';
				result += node.outerHTML;
				result += '</div></div></div>';
			}
			break;
		}
		return result;
	},

	/** @const {number} */
	protocolVersion: 3,

	/**
	 * @returns {!Object<string, (string|number)>}
	 */
	collect: function() {
		if (ui_data.isDungeon) {
			return {
				id: ui_data.logId,
				step: ui_stats.currentStep(),
				map: JSON.stringify(ui_improver.getDungeonMap()),
				lang: worker.GUIp_locale
			};
		}
		// https://github.com/Godvillers/ReporterServer/blob/master/docs/api.md
		var data = ['alls', 's_map', 'm_fight_log'].map(ui_data.isMobile ? this._getMobileHTML : this._getHTML).join('<&>');
		return {
			protocolVersion: this.protocolVersion,
			agent: 'eGUI+/' + ui_data.currentVersion,
			link: GUIp.common.resolveURL(ui_utils.getStat('#fbclink', 'href') || worker.location.href),
			stepDuration: 18,
			timezone: -new Date().getTimezoneOffset(),
			step: ui_stats.currentStep(),
			playerNumber: ui_improver.islandsMap.ownArk + 1,
			cargo: ui_stats.cargo(),
			data: worker.base64js.fromByteArray(worker.pako.deflate(data)),
			clientData: '{"erinome":' + JSON.stringify({
				conditions2: ui_improver.islandsMap.manager.conditions
			}) + '}'
		};
	},

	/**
	 * @param {!Object} data
	 * @param {function(!Object)} onsuccess
	 * @param {function(!Object)} onfailure
	 */
	send: function(data, onsuccess, onfailure) {
		GUIp.common.postXHR((ui_data.isDungeon ? this.urlMS + '/port' : this.url + '/send'), data, 'form-data', onsuccess, onfailure);
	},

	/**
	 * @param {function(!Object)} onsuccess
	 * @param {function(!Object)} onfailure
	 */
	fetchAPIInfo: function(onsuccess, onfailure) {
		GUIp.common.getXHR(this.url + '/api.json', onsuccess, onfailure);
	},

	/**
	 * @param {string} text
	 * @returns {?Object<string, *>}
	 */
	parseAPIInfo: function(text) {
		try {
			var api = JSON.parse(text);
			return api.currentVersion >= api.minSupportedVersion ? api : null;
		} catch (e) {
			return null;
		}
	},

	/**
	 * @param {!Object} api
	 * @returns {boolean}
	 */
	checkVersion: function(api) {
		return this.protocolVersion >= api.minSupportedVersion && this.protocolVersion <= api.currentVersion;
	}
};

ui_improver.streamingManager = {
	onsuccess: [],
	onfailure: [],
	onincompatibility: [],
	lastUploadedStep: 0,

	get active() {
		return ui_storage.get('Log:streaming') === ui_data.logId;
	},

	set active(value) {
		ui_storage.set('Log:streaming', value ? ui_data.logId : '');
	},

	_runCallbacks: function(callbacks) {
		callbacks.forEach(function(f) { f(); });
	},

	uploadStep: function() {
		var self = this,
			reporter = ui_improver.reporter,
			step = ui_stats.currentStep();
		if (step <= this.lastUploadedStep) return;

		reporter.send(reporter.collect(), function() {
			// requests are asynchronous, so perform an extra check
			if (step > self.lastUploadedStep) {
				self.lastUploadedStep = step;
				self._runCallbacks(self.onsuccess);
			}
		}, function(xhr) {
			GUIp.common.error('cannot stream step ' + step + ' (' + xhr.status + '):', xhr.responseText);
			// investigate the problem
			if (xhr.status === 501 /*Not Implemented*/) {
				// stop trying to stream
				self.active = false;
				// apparently, we are using an outdated protocol - let's check that
				reporter.fetchAPIInfo(function(xhr) {
					var api = reporter.parseAPIInfo(xhr.responseText);
					if (api == null) {
						// got invalid JSON?
						GUIp.common.error("cannot parse Reporter API: '" + xhr.responseText + "'");
						self._runCallbacks(self.onfailure);
						return;
					}
					GUIp.common.info('version = ' + reporter.protocolVersion + ', api =', api);
					if (reporter.checkVersion(api)) {
						// our version seems to be OK, but we still got 501. Something mystical
						self._runCallbacks(self.onfailure);
					} else {
						// yes, we're indeed too ancient
						self._runCallbacks(self.onincompatibility);
					}
					// as said before, don't try again
				}, function(xhr) {
					GUIp.common.error('cannot fetch Reporter API:', xhr.status);
					self._runCallbacks(self.onfailure);
				});
				return;
			}
			// try again later
			GUIp.common.setTimeout(function() {
				if (step === ui_stats.currentStep()) {
					self.uploadStep();
				}
			}, 5e3);
		});
	}
};

ui_improver.initStreaming = function(container) {
	if (!container) {
		GUIp.common.error('streaming link injection failed');
		return;
	}

	container.insertAdjacentHTML('beforeend',
		'<div id="e_streaming">' +
			'<a href="#">' + GUIp_i18n.start_streaming + '</a>' +
			'<span class="hidden">' + GUIp_i18n.streaming_now +
				' <span class="e_emoji e_emoji_cross eguip_font">❌</span></span>' +
			'<a href="' + this.reporter.getLogURL(ui_data.logId) + '" target="_blank">' +
				GUIp_i18n.streaming_now +
			'</a>' +
			' <a class="e_cancel e_emoji e_emoji_cross eguip_font" href="#" title="' + GUIp_i18n.cancel_streaming +
			'">❌</a>' +
		'</div>'
	);
	container = document.getElementById('e_streaming');
	var startLink = container.firstChild,
		placeholder = startLink.nextSibling,
		streamingLink = placeholder.nextSibling,
		stopLink = container.lastChild, // streamingLink.nextSibling is a text node containing whitespace
		established = this.streamingManager.active;
	if (established) {
		startLink.classList.add('hidden');
		// streamingManager.uploadStep is called from elsewhere
	} else {
		streamingLink.classList.add('hidden');
		stopLink.classList.add('hidden');
	}

	GUIp.common.addListener(startLink, 'click', function(ev) {
		ev.preventDefault();
		startLink.classList.add('hidden');
		if (!established) {
			placeholder.classList.remove('hidden');
		} else {
			streamingLink.classList.remove('hidden');
			stopLink.classList.remove('hidden');
		}
		ui_improver.streamingManager.active = true;
		ui_improver.streamingManager.uploadStep();
	});

	GUIp.common.addListener(stopLink, 'click', function(ev) {
		ev.preventDefault();
		startLink.classList.remove('hidden');
		streamingLink.classList.add('hidden');
		stopLink.classList.add('hidden');
		ui_improver.streamingManager.active = false;
	});

	this.streamingManager.onsuccess.push(function() {
		if (!established) {
			established = true;
			placeholder.classList.add('hidden');
			streamingLink.classList.remove('hidden');
			stopLink.classList.remove('hidden');
		}
	});

	var handler = function(msg) {
		container.textContent = msg;
		container.classList.add('error');
	};
	this.streamingManager.onincompatibility.push(handler.bind(null, worker.GUIp_i18n.streaming_is_unsupported));
	this.streamingManager.onfailure.push(handler.bind(null, worker.GUIp_i18n.streaming_failed));
};

/** @namespace */
ui_improver.islandsMap = {
	/** @type {?GUIp.common.islandsMap.MigratingMVManager} */
	manager: null,

	_svg: null,

	/**
	 * @readonly
	 * @type {number}
	 */
	ownArk: -1,

	_saveData: function() {
		ui_storage.set('Log:current', ui_data.logId);
		ui_storage.set('Log:' + ui_data.logId + ':model',
			JSON.stringify(GUIp.common.islandsMap.conv.encode(this.manager.model))
		);
	},

	/**
	 * @private
	 * @returns {{model: ?GUIp.common.islandsMap.Model, relevant: boolean}}
	 */
	_tryLoadData: function() {
		var rawModel = GUIp.common.parseJSON(ui_storage.get('Log:' + ui_data.logId + ':model'));
		return rawModel ? {
			model: GUIp.common.islandsMap.conv.decode(rawModel),
			relevant: rawModel.step === ui_stats.currentStep()
		} : {model: null, relevant: false};
	},

	_getOwnArkIndex: function() {
		for (var i = 1; i <= 4; i++) {
			if (ui_stats.Hero_Ally_Name(i) === ui_data.char_name) {
				return i - 1;
			}
		}
		return -1;
	},

	_rollbackModifications: function(svg) {
		if (svg === this._svg) {
			GUIp.common.islandsMap.defaults.vTransUnbindAll(this.manager.model, this.manager.view, this.manager.conditions);
		} else {
			this._svg = svg;
		}
	},

	_checkBeasties: function() {
		if (!GUIp.common.sailing.phrases.beastiesCount) {
			return;
		}
		var enemies = document.querySelectorAll('#opps .opp_n'),
			allies = [];
		if (!enemies.length) {
			return;
		}
		for (var i = 0, len = ui_stats.Hero_Alls_Count(); i < len; i++) {
			allies.push(ui_stats.Hero_Ally_Name(i + 1));
		}
		for (var i = 0, len = enemies.length; i < len; i++) {
			var enemy = ui_stats.EnemySingle_Name(i + 1);
			if (allies.includes(enemy)) {
				// we're not interested in players, apparently
				continue;
			}
			var maxHP = ui_stats.EnemySingle_MaxHP(i + 1);
			if (enemy && (!GUIp.common.sailing.isBeastie(enemy) || !GUIp.common.sailing.checkBeastieHP(enemy, maxHP)) && !enemies[i].classList.contains('improved')) {
				enemies[i].insertAdjacentHTML('beforeend',
					'<span class="e_beareport"> ' +
					'<a title="' + worker.GUIp_i18n.sea_monster_report +
					'" href="' + GUIp.common.erinome_url +
						'/beastiereport?name=' + encodeURIComponent(enemy) +
						'&hp=' + maxHP +
						'&locale=' + worker.GUIp_locale +
					'" target="_blank">[?]</a></span>'
				);
				enemies[i].classList.add('improved');
			}
		}
	},

	/**
	 * @private
	 * @param {!Element} mapContainer
	 * @param {number} ownArkPos
	 * @param {!Array<string>} settings
	 */
	_changeMapHeader: function(mapContainer, ownArkPos, settings) {
		var blockTitle, distInfo;
		if (!(blockTitle = (ui_data.isMobile ? document.querySelector('.e_mt_smap .l_header') : mapContainer.getElementsByClassName('block_title')[0]))) {
			return;
		}
		if (!(distInfo = blockTitle.getElementsByClassName('e_dist_info')[0])) {
			// opera 12.x can't insert multiple nodes in insertAdjacentHTML at once
			// when any ancestor node has DOMNodeInserted event attached
			blockTitle.appendChild(document.createTextNode(' '));
			blockTitle.insertAdjacentHTML('beforeend', '<span class="e_dist_info"></span>');
			distInfo = blockTitle.lastChild;
		}
		distInfo.innerHTML = ui_utils.formatSailingDistInfo(
			this.manager.model, ownArkPos, this.manager.conditions, settings
		);
	},

	_replaceModelAndView: function(step) {
		this.manager.replaceModelAndView(this._svg, step);
		this._saveData();
	},

	_applyModifications: function(mapContainer) {
		var model = this.manager.model,
			settings = ui_storage.getList('Option:islandsMapSettings'),
			ownArkPos = model.arks[this.ownArk],
			rivalsNearby = false;
		// (re)set monochrome icons and inforing disabler if requested
		mapContainer.classList.toggle('e_monochrome', settings.includes('mch'));
		mapContainer.classList.toggle('e_no_inforing', settings.includes('hrng'));
		// apply changes to the SVG
		GUIp.common.islandsMap.defaults.vTransBindAll(
			model, this.manager.view, this.manager.conditions, settings, true
		);
		// detect missing beasties in our lists
		this._checkBeasties();
		// stream the sailing
		if (ui_improver.streamingManager.active) {
			// wait until beasties in the chronicle block are highlighted
			GUIp.common.setTimeout(function() { ui_improver.streamingManager.uploadStep(); }, 0);
		}
		// display sailing conditions (if any) on the map for those who can't remember them or missed the beginning of the sail
		GUIp.common.sailing.showConditionsOnMap(mapContainer, this.manager.conditions);

		if (ownArkPos !== 0x8080) {
			// remember distance to the port for custom informers
			ui_improver.sailPortDistance =
				GUIp.common.islandsMap.vec.dist(ownArkPos, model.port !== 0x8080 ? model.port : 0x0);
			ui_improver.sailNearestPortDistance = Math.min.apply(null,
				model.otherPorts.map(function(pos) { return GUIp.common.islandsMap.vec.dist(ownArkPos, pos); }).concat(ui_improver.sailPortDistance)
			);
			// show distances to port & rim
			this._changeMapHeader(mapContainer, ownArkPos, settings);
			// check distances to other arks
			rivalsNearby = !this.manager.conditions.kindness && model.step >= 5 && model.arks.some(function(ark) {
				return ark !== 0x8080 && ark !== ownArkPos && GUIp.common.islandsMap.vec.dist(ark, ownArkPos) <= 3;
			});
		}
		ui_informer.update('close to rival', rivalsNearby);
	},

	_extractConditions: function(mapContainer) {
		var logID = ui_data.logId,
			key = 'Log:' + logID + ':conds2',
			conditions = ui_storage.get(key);
		if (conditions != null) {
			this.manager.conditions = conditions ? GUIp.common.parseJSON(conditions) : Object.create(null);
			return;
		}

		conditions = GUIp.common.sailing.tryExtractConditions();
		if (conditions != null) {
			this.manager.conditions = GUIp.common.sailing.parseConditions(conditions);
			ui_storage.set(key, JSON.stringify(this.manager.conditions));
		} else {
			// TODO: retry on failure
			GUIp.common.requestLog(logID, function(xhr) {
				var conds;
				this.manager.conditions = GUIp.common.sailing.parseConditions(
					GUIp.common.sailing.extractConditionsFromHTML(xhr.responseText)
				);
				conds = this.manager.conditions;
				ui_storage.set(key, JSON.stringify(conds));
				if (Object.keys(conds).length) {
					// they could affect parsing the map
					this._rollbackModifications(mapContainer.getElementsByTagName('svg')[0]);
					this._replaceModelAndView(ui_stats.currentStep());
					this._applyModifications(mapContainer);
				}
			}.bind(this));
		}
	},

	_loadPOIColors: function() {
		if (!ui_storage.getList('Option:islandsMapSettings').includes('rndc')) {
			return;
		}

		var key = 'Log:' + ui_data.logId + ':poiColors',
			colors = GUIp.common.parseJSON(ui_storage.get(key)),
			colorizer = GUIp.common.islandsMap.vtrans.poiColorizer;
		if (GUIp.common.isIntegralArray(colors)) {
			colorizer.colors = colors;
		} else {
			GUIp.common.shuffleArray(colorizer.colors);
			ui_storage.set(key, '[' + colorizer.colors + ']');
		}
	},

	/**
	 * @param {!Element} mapContainer
	 */
	initMap: function(mapContainer) {
		var loaded = this._tryLoadData(), // instead of parsing each time the page is refreshed
			svgs = mapContainer.getElementsByTagName('svg'),
			config = {childList: true, subtree: true},
			observer;
		this.ownArk = this._getOwnArkIndex();
		this.manager = new GUIp.common.islandsMap.MigratingMVManager(loaded.model);
		this._extractConditions(mapContainer);
		this._loadPOIColors();

		// do initial processing
		this._svg = svgs[0]; // nothing to rollback; just assign
		if (loaded.relevant) {
			this.manager.replaceView(this._svg);
		} else {
			this._replaceModelAndView(ui_stats.currentStep());
		}
		this._applyModifications(mapContainer);

		// watch for changes
		observer = GUIp.common.islandsMap.observer.create(function() {
			var step = ui_stats.currentStep();
			this._rollbackModifications(svgs[0]);
			if (step !== this.manager.model.step) {
				this._replaceModelAndView(step);
			} else {
				// surprisingly, sometimes an SVG can be replaced with no changes to it.
				// no need to touch our model in that case.
				this.manager.replaceView(this._svg);
			}
			this._applyModifications(mapContainer);
		}, this);
		observer.observe(mapContainer, config);
		observer.observe(document.querySelector(ui_data.isMobile ? '.e_mt_fight_log .l_header' : '#m_fight_log h2'), config);
		GUIp.common.tooltips.watchSubtreeSVG(document.getElementById('map_wrap'));
	}
};

ui_improver._wrapCargoEmoji = function(emoji) {
	return (
		'<span class="e_emoji e_emoji_sailing' + (GUIp.common.renderTester.testChar(emoji) ? '' : ' eguip_font') +
		'">' + emoji + '</span>'
	);
};

ui_improver.improveCargo = function() {
	if (ui_data.isMobile) return; // possible selector: '#statusbar img[src="/images/sb/sb_ark_cargo.png"] + div'
	var node = document.querySelector('#hk_cargo .l_val'),
		html = '',
		newHTML = '';
	if (node.getElementsByClassName('e_emoji')[0]) {
		return;
	}
	html = node.innerHTML;
	newHTML = html.replace(/[♂♀]|\uD83D[\uDCB0\uDCE6]/g, ui_improver._wrapCargoEmoji); // ♂♀💰📦
	if (newHTML !== html) {
		node.innerHTML = newHTML;
	}
};

ui_improver.improveSailChronicles = function() {
	GUIp.common.sailing.describeBeastiesOnPage('.d_msg:not(.parsed)', 'parsed', ui_storage.getList('Option:islandsMapSettings').includes('bhp'));
};

ui_improver.initSailing = function() {
	var mapContainer = GUIp.common.sailing.tryFindMapBlock(ui_data.isMobile);
	if (!mapContainer) {
		GUIp.common.setTimeout(ui_improver.initSailing, 250);
		return;
	}
	var rulerContainer;
	if (ui_data.isMobile) {
		if (mapContainer.parentNode.parentNode.previousElementSibling) {
			// there's an unnamed empty header just before map wrapper suitable for the ruler
			rulerContainer = mapContainer.parentNode.parentNode.previousElementSibling;
			// and we'll use it for _changeMapHeader as well, so we need a way to search for it later
			rulerContainer.classList.add('e_mt_smap');
		} else {
			GUIp.common.error('failed to find sail map header container');
		}
	} else {
		rulerContainer = mapContainer.querySelector('.block_h .l_slot');
	}
	if (!rulerContainer) {
		GUIp.common.error('ruler injection failed');
	} else {
		rulerContainer.insertAdjacentHTML('beforeend',
			'<span id="e_ruler_button" class="e_emoji e_emoji_ruler eguip_font" title="' + GUIp_i18n.sail_ruler +
			'">📏</span>'
		);
		GUIp.common.islandsMap.vtrans.rulerManager.init(rulerContainer.lastChild);
	}
	ui_improver.initStreaming(document.querySelector('#m_fight_log .block_content, .e_m_fight_log'));
	ui_improver.islandsMap.initMap(mapContainer);
	ui_improver.improveCargo();
	ui_improver.improveSailChronicles();
};

ui_improver.whenWindowResize = function() {
	ui_improver.chatsFix();
	// sail mode column resizing
	if (ui_improver.sailPageResize && !ui_data.isMobile) {
		var sccwidth,
			sclwidth = worker.$('#a_left_block').outerWidth(true),
			scrwidth = worker.$('#a_right_block').outerWidth(true),
			scl2width = worker.$('#a_left_left_block'),
			scr2width = worker.$('#a_right_right_block'),
			maxwidth = worker.$(worker).width() * 0.85;
		scl2width = scl2width[0] && scl2width[0].offsetWidth ? scl2width.outerWidth(true) : 0;
		scr2width = scr2width[0] && scr2width[0].offsetWidth ? scr2width.outerWidth(true) : 0;
		sccwidth = Math.max(Math.min((maxwidth - sclwidth - scl2width - scrwidth - scr2width),932),448); // todo: get rid of hardcoded values?
		worker.$('#a_central_block').width(sccwidth);
		sccwidth = worker.$('#a_central_block').outerWidth(true);
		//worker.$('#main_wrapper').width(sccwidth + sclwidth + scl2width + scrwidth + scr2width + 20);
		worker.$('.c_col .block_title').each(function() { worker.$(this).width(sccwidth - 115); });
	}
	// body widening
	worker.$('body').width(worker.$(worker).width() < worker.$('#main_wrapper').width() ? worker.$('#main_wrapper').width() : '');
};
ui_improver._clockUpdate = function() {
	worker.$(ui_data.isMobile ? '.e_mt_remote .l_header' : '#control .block_title').text(ui_utils.formatClock(ui_utils.getPreciseTime(ui_improver.clock.offset)));
	if (Date.now() > ui_improver.clock.switchOffTime) {
		ui_improver._clockToggle();
	}
};
ui_improver._clockToggle = function(e) {
	if (e) {
		e.stopPropagation();
	}
	if (ui_improver.clockToggling) {
		return;
	}
	ui_improver.clockToggling = true;
	var $clock = worker.$(ui_data.isMobile ? '.e_mt_remote .l_header' : '#control .block_title');
	if (ui_improver.clock) {
		worker.clearInterval(ui_improver.clock.updateTimer);
		$clock.fadeOut(500, GUIp.common.try2.bind(ui_improver.clock.prevText, function() {
			$clock.removeClass('e_clock_inaccurate');
			$clock.text(this).fadeIn(500);
			$clock.prop('title', worker.GUIp_i18n.show_godville_clock);
			ui_improver.clockToggling = false;
		}));
		ui_improver.clock = null;
	} else {
		ui_improver.clock = {
			prevText: $clock.text(),
			switchOffTime: Date.now() + 300e3, // 5 min
			offset: ui_storage.getFlag('Option:localtimeGodvilleClock') ? (
				new Date().getTimezoneOffset() * -60e3
			) : (ui_storage.get('Option:offsetGodvilleClock') || 3) * 3600e3,
			updateTimer: 0
		};
		var ok = false;
		Promise.all([
			ui_utils.syncClock().then(function(success) {
				ok = success;
			}),
			new Promise(function(resolve) {
				$clock.fadeOut(500, GUIp.common.try2.bind(null, function() {
					$clock.fadeIn(500);
					ui_improver.clockToggling = false;
					if (!ok) {
						$clock.text('––:––:––').addClass('e_clock_inaccurate');
					}
					$clock.prop('title', worker.GUIp_i18n.hide_godville_clock);
					resolve();
				}));
			})
		]).then(function() {
			if (!ui_improver.clock || ui_improver.clock.updateTimer) {
				return; // user hid the clock before it got synced
			}
			if (ok) {
				ui_improver._clockUpdate();
				ui_improver.clock.updateTimer = GUIp.common.setTimeout(function() {
					ui_improver._clockUpdate();
					ui_improver.clock.updateTimer = GUIp.common.setInterval(ui_improver._clockUpdate, 1e3);
				}, 1e3 - ui_utils.getPreciseTime().getMilliseconds());
			} else {
				// ui_improver.clockToggling = false;
				ui_improver._clockToggle();
			}
		}).catch(GUIp.common.onUnhandledException);
	}
};

ui_improver.improveInterface = function() {
	var node, handler;
	if (this.isFirstTime) {
		worker.$('a[href="#"]').removeAttr('href');
		ui_improver.whenWindowResize();
		GUIp.common.addListener(worker, 'resize', GUIp.common.debounce(250, ui_improver.whenWindowResize));
		ui_utils.loggerWidthChanger();
		if (ui_storage.getFlag('Option:themeOverride')) {
			ui_utils.switchTheme(ui_storage.get('ui_s'),true);
		} else {
			ui_utils.switchTheme();
		}
		GUIp.common.addListener(worker, 'focus', function() {
			ui_improver.checkGCMark('focus');
			ui_informer.updateCustomInformers();
			// forcefully fire keyup event on focus to prevent possible issues with alt key processing
			worker.$(document).trigger(worker.$.Event('keyup', {originalEvent: {}}));
		});
		// cache private messages
		ui_utils.pmNotificationInit();
		// experimental keep-screen-awake feature for Android
		if (GUIp.common.isAndroid && (worker.navigator.requestWakeLock || worker.navigator.wakeLock)) {
			ui_improver.createWakelock();
		}
		// generate nearby town information on usual place
		if (!ui_data.isFight) {
			// stupid hack to initialize the missing towns map on the page for mobile view
			// this works based on a (possibly) bug that the map stays on page after being closed
			if (ui_data.isMobile) {
				node = document.getElementById('tmap_icon');
				if (node) {
					node.click(); // map appears
					node.click(); // map disappears
					ui_improver.nearbyTownsFix();
				}
			} else {
				ui_improver.nearbyTownsFix();
			}
		}
		if (!ui_data.isFight && !ui_storage.getFlag('Option:disableGodvilleClock') && (node = document.querySelector(ui_data.isMobile ? '.e_mt_remote .l_header' : '#control .block_title'))) {
			node.title = worker.GUIp_i18n.show_godville_clock;
			node.style.cursor = 'pointer';
			GUIp.common.addListener(node, 'click', ui_improver._clockToggle);
		}
		var encButton = worker.$('#cntrl .enc_link'),
			punButton = worker.$('#cntrl .pun_link'),
			mirButton = worker.$('#cntrl .mir_link');
		if (ui_storage.getFlag('Option:improveDischargeButton')) {
			var dischargeHandlers, dischargeButton = worker.$('#acc_links_wrap .dch_link');
			encButton.click(function() { ui_improver.last_infl = 'enc'; });
			punButton.click(function() { ui_improver.last_infl = 'pun'; });
			mirButton.click(function() { ui_improver.last_infl = 'mir'; });
			if (dischargeButton.length) {
				dischargeHandlers = worker.$._data(dischargeButton[0],'events');
				if (dischargeHandlers && dischargeHandlers.click && dischargeHandlers.click.length === 1) {
					dischargeButton.click(function() {
						try {
							var limit = ui_stats.Max_Godpower() - 50;
							if (ui_improver.dailyForecast.get().includes('accu70')) {
								limit -= 20;
							}
							if (worker.$('#voice_submit').attr('disabled') === 'disabled') {
								limit += 5;
							}
							if (!worker.$('#cntrl .enc_link').hasClass('div_link')) {
								if (ui_improver.last_infl === 'mir') {
									limit += 50;
								} else {
									limit += 25;
								}
							}
							GUIp.common.debug('acc_discharge dynamic limit =', limit);
							localStorage.setItem('gp_thre',limit);
						} catch (e) {
							GUIp.common.error('setting discharge dynamic limit failed:', e);
						}
					});
					dischargeHandlers.click.reverse();
				}
			}
		}
		if (!ui_data.isFight) {
			ui_utils.addGPConfirmation(encButton, 25,
				worker.GUIp_i18n.fmt('do_you_want', worker.GUIp_i18n[ui_stats.isMale() ? 'to_encourage_hero' : 'to_encourage_heroine']));
			ui_utils.addGPConfirmation(punButton, 25,
				worker.GUIp_i18n.fmt('do_you_want', worker.GUIp_i18n[ui_stats.isMale() ? 'to_punish_hero' : 'to_punish_heroine']));
			ui_utils.addGPConfirmation(mirButton, 50,
				worker.GUIp_i18n.fmt('do_you_want', worker.GUIp_i18n.to_make_a_miracle));
		}
		// hide_bless_button
		var bless_button = Array.prototype.find.call(document.querySelectorAll(ui_data.isMobile ? '#cntrl + .line > a.div_link' : '#stats .line > a.div_link'), function (a) { return /Благословить|Bless/.test(a.textContent) });
		if (bless_button) {
			bless_button.parentNode.classList.add('e_bless');
			bless_button.parentNode.style.display = ui_storage.getFlag('Option:hideBlessButton') ? 'none' : '';
		}
		// remove the mean 'new' label in a stupid blue box in the upgrader link (or any possible links in the future)
		var upgrader = Array.prototype.find.call(document.querySelectorAll(ui_data.isMobile ? '.e_mt_stats ~ .line > a.div_link' : '#stats .line > a.div_link'), function (a) { return a.firstChild.nodeType === 3 && a.firstChild.textContent.endsWith(' \uD83C\uDD95'); });
		if (upgrader) {
			upgrader.firstChild.textContent = upgrader.firstChild.textContent.replace(/ \uD83C\uDD95/g,''); /* 🆕 */
		}
		if (worker.GUIp_browser === 'Firefox') {
			try {
				worker.$(document).bind('click', function(e) {
					if (e.which !== 1) {
						e.stopImmediatePropagation();
					}
				});
				var rmClickFix, clickHandlers = worker.$._data(document,'events');
				if (clickHandlers.click && clickHandlers.click.length) {
					rmClickFix = clickHandlers.click.pop();
					clickHandlers.click.splice(clickHandlers.click.delegateCount || 0,0,rmClickFix);
				}
			} catch (e) {
				GUIp.common.error('failed to init rmclickfix workaround:', e);
			}
		}
		if (ui_data.isMobile) {
			// better tabs swiping (with shiny sparkles)
			var $hEvents, $hBlock = worker.$('#hero_block');
			// make sure we actually have a block and there's only one touchstart handler bound to it
			// in case there is more, then probably something has changed on page and we'd better won't get into it
			if ($hBlock.length && ($hEvents = $._data($hBlock[0],'events')) && $hEvents.touchstart && $hEvents.touchstart.length === 1) {
				// basically detect any touch on hero block
				$hBlock[0].addEventListener('touchstart', GUIp.common.try2.bind(null, function(e) {
					// respect original restrictions
					if (worker.$(e.target).parents('.tab-selector').length > 0 || worker.$(e.target).parents('#map_wrap').length || document.body.classList.contains('stop-scrolling')) {
						return;
					}
					// then begin building our own crutches
					var touchStart = e.touches[0] || e.changedTouches[0],
						diffX = 0, // shift in pixels
						diffY = 0,
						gap = 35, // shift less than this won't lead to tab swiping
						shiftStarted = false,
						scrollPos,
						tabButtons = document.querySelectorAll('#tabbar .tab-selector > .tab-btn'),
						tabContents = document.querySelectorAll('#tabbar .tab-content > div'),
						currentIdx = Array.prototype.indexOf.call(tabButtons[0].parentNode.children, tabButtons[0].parentNode.getElementsByClassName('active')[0]), // any better idea how to get current tab?
						prevIdx = (currentIdx + tabContents.length - 1) % tabContents.length,
						nextIdx = (currentIdx + 1) % tabContents.length,
						currentWidth = worker.$(tabContents[currentIdx]).width();
					// technically we almost repeat the vanilla event scheme only changing the details... a lot
					var touchMove = GUIp.common.try2.bind(null, function(e) {
						var touchMove = e.touches[0] || e.changedTouches[0];
						diffX = touchMove.clientX - touchStart.clientX;
						diffY = touchMove.clientY - touchStart.clientY;
						// note that diffX should be much larger than diffY to swipe, which should make vertical scrolling more solid
						if (Math.abs(diffX) > gap && Math.abs(diffY/diffX) < 0.25) {
							if (!shiftStarted) {
								shiftStarted = true;
								// default dragging class
								$hBlock.addClass('mpage_drag');
								// keeping this open while swiping would look weird, although vanilla kept it in place till touchend
								worker.$(document).trigger('close.wup');
								// add required styles for low-quality magic
								scrollPos = worker.pageYOffset;
								tabContents[currentIdx].style.top = (tabContents[currentIdx].offsetTop - scrollPos) + 'px';
								tabContents[currentIdx].style.width    = tabContents[prevIdx].style.width    = tabContents[nextIdx].style.width    = currentWidth + 'px';
								tabContents[currentIdx].style.position = tabContents[prevIdx].style.position = tabContents[nextIdx].style.position = 'fixed';
							}
							// this time we start shifting the tab considering the gap size too, so it won't jump around
							tabContents[currentIdx].style.left = diffX + (diffX > 0 ? -gap : gap) + 'px';
							// and partially show adjacent tabs
							if (diffX > 0) {
								tabContents[prevIdx].style.left = (-currentWidth + diffX - gap) + 'px';
								tabContents[prevIdx].style.display = '';
								tabContents[nextIdx].style.display = 'none';
							} else {
								tabContents[nextIdx].style.left = (currentWidth + diffX + gap) + 'px';
								tabContents[nextIdx].style.display = '';
								tabContents[prevIdx].style.display = 'none';
							}
						}
					});
					// when action has ended
					var touchEnd = GUIp.common.try2.bind(null, function(e) {
						// if we even started
						if (shiftStarted) {
							var targetIdx = diffX > 0 ? prevIdx : nextIdx,
								animationCnt = 0;
							// vanilla drag class whatever it does should be gone here
							$hBlock.removeClass('mpage_drag');
							// function to cleaning after ourselves, and pretending like nothing has happened
							var cleanStyles = function(visibleIdx) {
								// iterate through all participating tabs
								[currentIdx, prevIdx, nextIdx].forEach(function(a) {
									tabContents[a].style.position = '';
									tabContents[a].style.top = '';
									tabContents[a].style.left = '';
									tabContents[a].style.width = '';
									tabContents[a].style.display = visibleIdx === a ? '' : 'none';
								});
								// also we have a chance to close possibly opened tooltips we accidentally created during swiping
								Array.prototype.forEach.call(document.getElementsByClassName('e_tooltip'), function (a) {
									a.parentNode.removeChild(a);
								});
							};
							// function to do when animation finishes
							var afterAnimation = function(swiped) {
								// we do have two different animations and no nice way to do something after _both_ completes
								if (++animationCnt < 2) {
									return;
								}
								// whether we actually changed the tab
								if (swiped) {
									// remove unnecessary styles from content containers leaving target container visible
									cleanStyles(targetIdx);
									// and then officially move to another tab; won't emulate original code but rather just naively click on the tab-selector instead
									tabButtons[targetIdx].click();
								} else {
									// remove unnecessary styles from content containers leaving old container visible
									cleanStyles(currentIdx);
									// restore old scroll position
									worker.scrollTo(null,scrollPos);
								}
							}
							// actual actions: if we've shifted far enough, let's switch there
							if (Math.abs(diffX) > currentWidth / 3) {
								// do some fancy animations (probably would be better to use css animations one day)
								$(tabContents[currentIdx]).animate({left: (diffX > 0 ? currentWidth : -currentWidth)}, 225, GUIp.common.try2.bind(null, afterAnimation, true));
								$(tabContents[targetIdx]).animate({left: 0}, 225, GUIp.common.try2.bind(null, afterAnimation, true));
							} else {
								$(tabContents[currentIdx]).animate({left: 0}, 150, GUIp.common.try2.bind(null, afterAnimation, false));
								$(tabContents[targetIdx]).animate({left: (diffX > 0 ? -currentWidth : currentWidth)}, 150, GUIp.common.try2.bind(null, afterAnimation, false));
							}
							// also please don't propagate it anywhere
							e.stopPropagation();
						}
						// and we must remove unnecessary events when they aren't needed anymore
						document.removeEventListener('touchmove', touchMove);
						document.removeEventListener('touchend', touchEnd, true);
					});
					// we use low-level event listeners here because:
					// 1. jquery's do not allow us to useCapture, and because of that a number of issues happens all around
					//    when vanilla's item craft uses a touchend handler which boldly stops our code it the middle of action
					// 2. GUIp's addListener doesn't provide a way to remove it when we're finished
					document.addEventListener('touchmove', touchMove);
					document.addEventListener('touchend', touchEnd, true);
				}));
				// get rid of default touchstart handler
				worker.$($hBlock).off('touchstart');
			}
		}
		GUIp.common.addListener(document, 'visibilitychange', function() {
			if (document.visibilityState !== 'hidden') {
				return;
			}
			// save unsent personal messages
			if (ui_data.isMobile) {
				ui_utils.saveMobileUnsentMessage(document.querySelector('#hero_block .mpage:not(#tabbar)'));
			} else {
				var node = document.getElementsByClassName('chat_ph')[0], text;
				if (node) {
					var textareas = node.getElementsByTagName('textarea'),
						names = node.getElementsByClassName('dockfrname');
					for (var i = 0, len = Math.min(textareas.length, names.length); i < len; i++) {
						node = textareas[i];
						if (!node.disabled) {
							if ((text = node.value)) {
								ui_tmpstorage.set('PM:' + names[i].textContent, text);
							} else {
								ui_tmpstorage.remove('PM:' + names[i].textContent);
							}
						}
					}
				}
			}
		});
		if ((node = document.getElementById('logout')) ||
			ui_data.isMobile && (node = document.querySelector('.e_mt_menu + .line + .line + .line + .line') /* best selector ever! */ ) && /Выход|Logout/.test(node.textContent)) {
			GUIp.common.addListener(node, 'click', ui_tmpstorage.wipeOut.bind(ui_tmpstorage));
		}
		// workaround for title-related issues
		Object.defineProperty(document,'title', {
			set: function(val) {
				try {
					ui_data.docTitle = val;
					ui_informer.redrawTitle();
					return val;
				} catch (e) { return val; }
			},
			get: function() {
				try {
					return document.querySelector('title').childNodes[0].nodeValue;
				} catch (e) { return ''; }
			},
			configurable: true
		});
		ui_storage.addImmediateListener('Option:discardTitleChanges', ui_informer.redrawTitle.bind(ui_informer));
		ui_storage.addImmediateListener('UserCss', GUIp.common.addCSSFromString);
	}
	if (ui_data.isFight && !document.getElementById('e_broadcast')) {
		var qselector = document.querySelector(ui_data.isDungeon ? '#map .block_title, #control .block_title, #m_control .block_title, .e_mt_remote div' : '#control .block_title, #m_control .block_title, .e_mt_remote div');
		if (qselector) {
			if ((ui_data.isSail || ui_data.isMining) && worker.GUIp_locale === 'en') {
				qselector.textContent = 'Remote';
			}
			qselector.insertAdjacentHTML('beforeend', '<a id="e_broadcast" class="broadcast" href="/duels/log/' + ui_data.logId + ui_utils.generateBroadcastLinkXtra() + '" target="_blank">' + worker.GUIp_i18n.broadcast + '</a>');
		}
	}
	if (!document.getElementById('e_custom_informers_setup') && ui_informer.activeInformers.get().custom_informers) {
		ui_utils.generateLightboxSetup('custom_informers','#stats .block_title, #m_info .block_title, #b_info .block_title',function() { ui_words.init(); ui_informer.purgeFlags(); });
	}
	if (!ui_data.isFight && !document.getElementById('e_custom_craft_setup') && ui_storage.getFlag('Option:enableCustomCraft') && !ui_data.isMobile) {
		ui_utils.generateLightboxSetup('custom_craft','#inventory .block_title',function() { ui_words.init(); ui_inventory.rebuildCustomCraft(); ui_improver.calculateButtonsVisibility(true); });
		ui_storage.addListener('Option:fixedCraftButtons', ui_improver.calculateButtonsVisibility.bind(ui_improver, true));
	}
	if (ui_data.isFight && !document.getElementById('e_ally_blacklist_setup') && document.querySelector('#alls .block_title, #bosses .block_title, #o_info .block_title')) {
		ui_utils.generateLightboxSetup('ally_blacklist',(document.querySelector('#o_info .l_val a[href*="/gods/"]') ? '#o_info' : '#alls')+' .block_title, #bosses .block_title',function() { ui_words.init(); ui_improver.improvePlayers(); });
	}
	if (this.isFirstTime) {
		handler = ui_words.init.bind(ui_words);
		ui_storage.addListener('CustomWords:custom_informers', function() {
			ui_words.init();
			ui_informer.purgeFlags();
		});
		if (ui_data.isFight) {
			ui_storage.addListener('CustomWords:ally_blacklist', function() {
				ui_words.init();
				ui_improver.improvePlayers();
			});
		} else {
			ui_storage.addListener('CustomWords:chosen_monsters', handler);
			ui_storage.addListener('CustomWords:special_monsters', handler);
			ui_storage.addListener('CustomWords:custom_craft', function() {
				ui_words.init();
				ui_inventory.rebuildCustomCraft();
				ui_improver.calculateButtonsVisibility(true);
			});
		}
		ui_storage.addImmediateListener('Option:useBackground', GUIp.common.setPageBackground);
	}
};
/**
 * @param {!Element} root
 * @returns {!Array<!GUIp.common.activities.LastFightsEntry>}
 */
ui_improver.getLastFights = function(root) {
	var ftypes = root.getElementsByClassName('wl_ftype');
	if (!ftypes.length) return [];
	root = ftypes[0].parentNode.parentNode;
	var dates = root.getElementsByClassName('wl_date'),
		result = [],
		ftype, link, href;
	for (var i = 0, len = Math.min(ftypes.length, dates.length); i < len; i++) {
		ftype = ftypes[i];
		link = ftype.getElementsByTagName('a')[0];
		href = link.href;
		result[i] = {
			date: +GUIp.common.parseDateTime(dates[i].textContent),
			type: GUIp.common.activities.parseFightType(link.textContent),
			logID: href.slice(href.lastIndexOf('/') + 1),
			success: ftype.textContent.includes('✓')
		};
	}
	// replicate souls from dungeons (other ideas?)
	if (ui_data.availableGameModes.includes('souls'))
	for (var i = 0, len = result.length; i < len; i++) {
		if (result[i].type !== 'dungeon') {
			continue;
		}
		result.push({
			date: result[i].date,
			type: 'souls',
			logID: result[i].logID,
			success: result[i].success
		});
	}
	return result.sort(ui_utils.byDate);
};
ui_improver.improveLastFights = function() {
	var popover = document.getElementById('lf_popover_c');
	if (!popover || ui_utils.isAlreadyImproved(popover)) {
		return;
	}
	var wup = $(popover).closest('.wup')[0],
		wupStyle = wup.style;
	wupStyle.width = ((wupStyle.width ? parseInt(wupStyle.width) : wup.offsetWidth) + 30) + 'px';
	ui_utils.observeUntil(popover, {childList: true, subtree: true}, function() {
		var fights = ui_improver.getLastFights(popover);
		if (fights.length) return fights;
	}).then(function(fights) {
		var activities = ui_timers.updateLastFights(fights),
			byID = Object.create(null),
			soulsCombined = Object.create(null),
			links = popover.querySelectorAll('.wl_ftype.wl_stats a'),
			desc = null,
			i, len, act, link, id, content;
		for (i = 0, len = activities.length; i < len; i++) {
			act = activities[i];
			if (act.type === 'dungeon' || act.type === 'mining' || act.type === 'spar') {
				byID[act.logID] = act;
			} else if (act.type === 'souls') {
				id = act.logID || act.inID;
				if (!soulsCombined[id]) {
					soulsCombined[id] = act;
					soulsCombined[id].src = 1;
				} else {
					if (soulsCombined[id].result < 0) {
						soulsCombined[id].result = act.result; // actually this never should happen
					} else if (act.result >= 0) {
						soulsCombined[id].result += act.result;
					}
					soulsCombined[id].src++;
				}
			}
		}
		for (i = 0, len = links.length; i < len; i++) {
			link = links[i];
			id = link.href;
			id = id.slice(id.lastIndexOf('/') + 1);
			content = '';
			if ((act = soulsCombined[id]) && (act.result || act.src < 2)) {
				desc = GUIp.common.activities.describe(act, desc);
				content += '<span class="' + desc.class + '" title="' + desc.title + '">' + desc.content + '</span>';
			}
			if ((act = byID[id]) && act.result) {
				desc = GUIp.common.activities.describe(act, desc);
				content += '<span class="' + desc.class + '" title="' + desc.title + '">' + desc.content + '</span>';
			}
			if (content) {
				link.parentNode.insertAdjacentHTML('afterend',
					'<div class="e_fight_result" data-e-id="' + id + '">' + content + '</div>'
				);
			}
		}
	}).catch(GUIp.common.onUnhandledException);
};
/**
 * @param {string} activitiesStr
 */
ui_improver.redrawLastFights = function(activitiesStr) {
	var root = document.getElementById('lf_popover_c'),
		desc = null,
		nodes, activities, byID, soulsCombined, i, len, id, act, node, span;
	if (!root) return;
	nodes = root.getElementsByClassName('e_fight_result_unknown');
	if (!nodes.length) return;
	activities = JSON.parse(activitiesStr);
	byID = Object.create(null);
	soulsCombined = Object.create(null);
	for (i = 0, len = activities.length; i < len; i++) {
		act = activities[i];
		if (act.type === 'dungeon' || act.type === 'mining' || act.type === 'spar') {
			byID[act.logID] = act;
		} else if (act.type === 'souls') {
			id = act.logID || act.inID;
			if (!soulsCombined[id]) {
				soulsCombined[id] = act;
				soulsCombined[id].src = 1;
			} else {
				if (soulsCombined[id].result < 0) {
					soulsCombined[id].result = act.result;
				} else if (act.result >= 0) {
					soulsCombined[id].result += act.result;
				}
				soulsCombined[id].src++;
			}
		}
	}
	for (i = 0, len = nodes.length; i < len; i++) {
		node = nodes[i].parentNode;
		if ((act = soulsCombined[node.dataset.eId]) && act.result >= 0 && act.src >= 2 || (act = byID[node.dataset.eId]) && act.result >= 0) {
			desc = GUIp.common.activities.describe(act, desc);
			if (span = node.getElementsByClassName('e_fight_result_unknown_' + act.type)[0]) {
				span.title = desc.title;
				span.textContent = desc.content;
				span.classList.remove('e_fight_result_unknown_' + act.type);
				if (desc.class) {
					span.classList.add(desc.class);
				}
			}
		}
	}
};
ui_improver.improveLastVoices = function() {
	if (!document.querySelector('#gv_popover_c .gv_list_empty')) {
		return;
	}
	var lvContent = document.querySelectorAll('.lv_text .div_link_nu');
	if (!lvContent.length) {
		return;
	}
	var handler = ui_utils.triggerChangeOnVoiceInput.bind(ui_utils);
	for (var i = 0, len = lvContent.length; i < len; i++) {
		GUIp.common.addListener(lvContent[i], 'click', handler);
	}
};
ui_improver.improveStoredPets = function() {
	var wtitle = document.querySelector('.wup-inner > .wup-title');
	if (!wtitle || !/Ковчег|Ark|Питомцы|Pets/.test(wtitle.textContent)) {
		return;
	}
	var splinks = wtitle.parentNode.querySelectorAll('.wup-content .wup_line > a:not(.no_link)');
	if (!splinks.length) {
		return;
	}
	var sp = [];
	for (var i = 0, len = splinks.length; i < len; i++) {
		sp.push(splinks[i].textContent.toLowerCase());
	}
	ui_storage.set('charStoredPets',JSON.stringify(sp));
	ui_data.storedPets = sp;
};
/**
 * @private
 * @param {!GUIp.inventory.Model} inv
 * @returns {!Object<string, !Array<{type: string, bossAndLevel: string}>>}
 */
ui_improver._getBossParts = function(inv) {
	var result = {},
		itemName = '',
		part, parts;
	for (var i = 0, len = inv.length; i < len; i++) {
		if (!inv.isBossPart(i)) {
			continue;
		}
		itemName = inv.getName(i);
		part = ui_inventory.splitBossPart(itemName);
		if ((parts = result[part.type])) {
			parts.push(part);
		} else {
			result[part.type] = [part];
		}
		part.type = itemName; // reusing existing field
	}
	return result;
};
ui_improver.improveLab = function(container) {
	if (!ui_utils.isAlreadyImproved(container)) {
		var observer, observeLab = function(mutations,observer) {
			if (!container.querySelector('.bps_mf.wup_line')) {
				return;
			}
			// improve boss parts list
			var itm, bSrc, parts,
				enemyName = ui_stats.Enemy_Bossname(),
				bpLines = container.querySelectorAll('.wup_line.bps_line'),
				// `ui_inventory` is not initialized in duel modes so we force scanning
				available = ui_improver._getBossParts(ui_data.isDungeon ? ui_inventory.getInventory().md : ui_inventory.model),
				toggleHighlighting = function() {
					var bossName = this.textContent,
						highlighted = this.classList.toggle('e_match_part'),
						part;
					for (var i = 0, len = bpLines.length; i < len; i++) {
						if ((part = bpLines[i].getElementsByClassName('bps_val')[0])) {
							part.classList.toggle('e_match_part', highlighted && part.textContent === bossName);
						}
					}
				};
			for (var i = 0, len = bpLines.length; i < len; i++) {
				itm = bpLines[i].querySelector('div.bps_val');
				bSrc = itm.textContent;
				GUIp.common.addListener(itm, 'click', toggleHighlighting);
				if (ui_data.isBoss) {
					if (bSrc.startsWith(enemyName) || (bSrc.startsWith(enemyName, 5) && ui_stats.Enemy_HasAbility(/зовущий|summoning/))) {
						itm.classList.add('e_current_boss');
					}
				} else if ((parts = available[GUIp_i18n.bp_types[i]])) {
					for (var j = 0, jlen = parts.length; j < jlen; j++) {
						if (parts[j].bossAndLevel === bSrc) {
							continue; // exactly the same part; ignore
						}
						if (!itm.title) {
							itm.title = worker.GUIp_i18n.bp_others;
							itm.classList.add('e_new_part');
							GUIp.common.tooltips.watchSubtree(itm);
						}
						itm.title += '\n · ' + parts[j].type; // actually, this field contains item's name
					}
				}
			}
			// update logger with lab creatures
			ui_logger.update(ui_logger.labWatchers);
			observer.takeRecords();
		};
		observer = GUIp.common.newMutationObserver(observeLab);
		observer.observe(container, {subtree: true, childList: true});
		observeLab(null, observer);
	}
};
ui_improver.improveForge = function(container) {
	if (!ui_utils.isAlreadyImproved(container)) {
		var observer, observeForge = function(mutations,observer) {
			if (!container.getElementsByClassName('dm_map_header')[0]) {
				return;
			}
			var mnav = container.getElementsByClassName('mnav')[0];
			if (mnav) {
				mnav.parentNode.insertBefore(mnav,mnav.parentNode.getElementsByClassName('dm_map_title')[0]);
				mnav.classList.remove('mnav');
				mnav.classList.add('mnav_top');
			}
			var fmap = document.getElementById('wrd_map');
			if (fmap)
			Array.prototype.forEach.call(fmap.children, function(row) {
				Array.prototype.forEach.call(row.children, function(cell) {
					switch (cell.textContent) {
						case '\uD83D\uDEAA': /*🚪*/ cell.classList.add('map_exit_pos_' + worker.GUIp_locale); break;
						case '\uD83D\uDCB0': /*💰*/ cell.classList.add('treasureChestForge'); break;
						case '\u2620':       /*☠*/ cell.classList.add('lesserBossForge'); break;
						case '\uD83D\uDC7E': /*👾*/ cell.classList.add('masterBossForge'); break;
						case '\uD83D\uDD73': /*🕳*/ /*cell.classList.add('trapForge');*/
						default: cell.classList.remove('masterBossForge');
					};
				});
			});
			ui_logger.update(ui_logger.forgeWatchers);
			ui_informer.updateCustomInformers();
			observer.takeRecords();
		};
		observer = GUIp.common.newMutationObserver(observeForge);
		observer.observe(container, {subtree: true, childList: true, attributes: true, attributeFilter: ['class']});
		observeForge(null, observer);
	}
};
ui_improver.improveSpiritRefinery = function(container) {
	if (!ui_utils.isAlreadyImproved(container)) {
		var observer, observeWr = function(mutations,observer) {
			if (!container.getElementsByClassName('bps_mf')[0]) {
				return;
			}
			var node, value, list, regex;
			if ((node = container.querySelector('#sl_list + .sl_l')) && (value = node.textContent.match(/(?:(\d+)(?:h| ч) )?(?:(\d+)(?:m| мин))/))) {
				value = new Date(Date.now() + (value[1] !== undefined ? +value[1] : 0) * 3600e3 + +value[2] * 60e3);
				node.title = worker.GUIp_i18n.refinery_available_at + GUIp.common.formatTime(value,'simpletime');
				ui_storage.set('Logger:Souls_Processed_Exp', value.getTime());
			} else {
				ui_storage.set('Logger:Souls_Processed_Exp', 0);
			}
			if ((node = container.querySelector('.sl_u + .sl_l')) && (value = node.textContent.match(/(\d+) (?:minute|минут)|(\d+) (?:hour|час)|(\d+) (?:день|дня|дней|day)/))) {
				value  = new Date(Date.now() + (value[3] !== undefined ? +value[3] * 86400e3 : (value[2] !== undefined ? +value[2] * 3600e3 : (value[1] !== undefined ? +value[1] * 60e3 : 0))));
				node.title = worker.GUIp_i18n.immortality_up_to + (value.getTime() - Date.now() < 86400e3 ? GUIp.common.formatTime(value,'simpletime') : GUIp.common.formatTime(value,'simpledate'));
				ui_storage.set('Logger:Immortality_Exp', value.getTime());
			} else {
				ui_storage.set('Logger:Immortality_Exp', 0);
			}
			list = [];
			regex = new RegExp('(' + worker.GUIp_i18n.gathered_soul_types.join('|') + ')' + (worker.GUIp_locale === 'en' ? ' soul' : 'ая душ(?:онк)?а') + '(?: \\(([^\\)]+)\\))?');
			Array.prototype.forEach.call(container.querySelectorAll('#sl_list li'), function(a) {
				if (value = regex.exec(a.textContent)) {
					list.unshift({date: Date.now(), origin: -1, kind: worker.GUIp_i18n.gathered_soul_types.indexOf(value[1]) + 1, value: value[2] === '?' ? null : parseInt(value[2]) || 0});
				}
				if (/чистая душа|pure soul/.test(a.textContent)) {
					list.unshift({date: Date.now(), origin: -1, kind: 0});
				}
			});
			ui_storage.set('LastGatheredSouls', JSON.stringify(list));
			ui_logger.update(ui_logger.refineryWatchers);
			ui_informer.updateCustomInformers();
			observer.takeRecords();
		};
		observer = GUIp.common.newMutationObserver(observeWr);
		observer.observe(container, {subtree: true, childList: true});
		observeWr(null, observer);
	}
};
ui_improver.improveUpgrader = function(container) {
	if (!ui_utils.isAlreadyImproved(container)) {
		var observer, observeWr = function(mutations,observer) {
			if (!container.querySelector('#upgrades .up_line')) {
				return;
			}
			ui_logger.update(ui_logger.upgraderWatchers);
			ui_informer.updateCustomInformers();
			observer.takeRecords();
		};
		observer = GUIp.common.newMutationObserver(observeWr);
		observer.observe(container, {subtree: true, childList: true});
		observeWr(null, observer);
	}
};
ui_improver.improveTraderOrders = function(container) {
	if (!ui_utils.isAlreadyImproved(container)) {
		var observer, observeTo = function(mutations,observer) {
			var node = document.getElementById('t_orders'),
				fb = document.getElementById('e_fetch_orders_info');
			if (!node || fb) {
				return;
			}
			node.insertAdjacentHTML('afterend','<div id="e_fetch_orders_info" class="line"><div class="no_link div_link" title="' + worker.GUIp_i18n.trade_orders_fetch_title + '">' + worker.GUIp_i18n.trade_orders_fetch + '</div></div>');
			fb = document.getElementById('e_fetch_orders_info');
			GUIp.common.addListener(fb, 'click', function(e) {
				if (fb.classList.contains('e_wait')) {
					return;
				}
				var items = Array.from(document.getElementById('t_orders').children);
				GUIp.common.getXHR(GUIp.common.erinome_url + '/traders?lang=' + worker.GUIp_locale + '&items=' + encodeURIComponent(JSON.stringify(items.map(function(a) { return a.firstChild.textContent; }))), function(xhr) {
					ui_utils.hideElem(fb, true);
					var data = GUIp.common.parseJSON(xhr.responseText) || {};
					items.forEach(function(a) {
						var span, item = a.firstChild.textContent;
						if (data[item]) {
							span = document.createElement('span');
							span.classList.add('e_item');
							span.textContent = a.firstChild.textContent;
							if (data[item].records.length) {
								span.classList.add('e_info');
								span.title = data[item].records.map(function(b) { return GUIp.common.formatTime(new Date(b.date),'simpledate') + ' – ' + b.count + ' (' + b.trader + ')';  }).join('\n');
							}
							a.replaceChild(span, a.firstChild);
							if (data[item]['ratio']) {
								span = document.createElement('span');
								span.classList.add('e_ratio');
								span.textContent = data[item]['ratio'];
								span.title = '~'+parseFloat(data[item]['avg']).toFixed(2);
								a.insertBefore(span, null);
							}
							if (data[item]['bold']) {
								a.classList.add('e_bold');
							}
							if (data[item]['active']) {
								a.classList.add('e_active');
							}
						}
					});
				}, function() {
					fb.classList.remove('e_wait')
				});
			});
			observer.takeRecords();
		};
		observer = GUIp.common.newMutationObserver(observeTo);
		observer.observe(container, {subtree: true, childList: true});
		observeTo(null, observer);
		GUIp.common.tooltips.watchSubtree(container);
	}
};
ui_improver.improveSparMenu = function() {
	var lines, names, content = document.getElementById('chf_popover_c');
	if (!content || ui_data.isMobile) {
		return;
	}
	lines = content.getElementsByClassName('chf_line');
	for (var i = 0, len = lines.length; i < len; i++) {
		names = lines[i].firstChild.textContent.match(/^(.+?) \((.+?)\)/);
		if (!names || names.length < 3) {
			continue;
		}
		lines[i].insertAdjacentHTML('beforeend','<div class="e_chfr"><a class="div_link em_font">[✉]</a><a class="div_link em_font">[➠]</a></div>');
		(function(name) {
			GUIp.common.addListener(lines[i].lastChild.firstChild, 'click', function(e) {
				ui_utils.openChatWith(name);
				e.stopPropagation();
			});
			lines[i].lastChild.firstChild.title = worker.GUIp_i18n.open_pchat;
			GUIp.common.addListener(lines[i].lastChild.lastChild, 'click', function(e) {
				worker.open("/gods/" + encodeURIComponent(name));
				e.stopPropagation();
			});
			lines[i].lastChild.lastChild.title = worker.GUIp_i18n.open_ppage;
		})(names[1]);
	}
};
ui_improver.improveCraftMenu = function() {
	var menus = document.getElementsByClassName('inv_craft_popover'),
		container = document.querySelector('.wup.in'),
		inv = ui_inventory.model,
		index = NaN,
		isBaseCraftable = true,
		node, items;
	// check if the base item is not allowed to be crafted
	// it appears that span element of the item has the an attribute containing id of the corresponding popup
	// so in fact we can just check whether it's parent node has a class of an uncraftable item
	if (container && document.querySelector('.ul_inv > li.e_craft_impossible > span[data-target="' + container.id + '"]')) {
		isBaseCraftable = false;
	}
	for (var i = 0, len = menus.length; i < len; i++) {
		node = menus[i];
		if (node.classList.contains('improved')) {
			continue;
		}
		node.classList.add('improved');
		// strike through suggested items that we can't craft with
		items = node.getElementsByClassName('div_link');
		for (var j = 0, jlen = items.length; j < jlen; j++) {
			node = items[j];
			// no need to check anything if the base item is already disallowed
			if (!isBaseCraftable) {
				node.classList.add('e_uncraftable_choice');
				continue;
			}
			index = +inv.getItemIndex(node.textContent);
			// we need to check that the item is present in the inventory because Godville's craft menu is buggy
			if (index === index && !inv.isCraftable(index)) {
				node.classList.add('e_uncraftable_choice');
			}
			node.classList.toggle('bingo_item', ui_improver.bingoTries.get() && (node.textContent === '❄' || (ui_improver.bingoItems.get() && ui_improver.bingoItems.get().test(node.textContent))));
		}
	}
};
ui_improver.improveDmapMenu = function() {
	var wtitle = document.querySelector('.wup-inner > .wup-title');
	if (!wtitle || !/Карта|Map/.test(wtitle.textContent)) {
		return;
	}
	if (wtitle && wtitle.nextElementSibling && wtitle.nextElementSibling.firstChild) {
		// map popup title block to put the dimensions into. it is destoyed with the popup
		wtitle.classList.add('e_mt_dmap');
		// map container itself. it is preserved after popup is closed
		var node = wtitle.nextElementSibling.firstChild;
		node.classList.add('e_m_dmap');
		GUIp.common.debug('mobile dmap (re)marked');
		GUIp.common.tooltips.watchSubtree(node);
		// initial extras parsing is happening before we mark this as the map,
		// thus we are losing the dungeon type. and repeating this here kinda fixes it
		this.parseDungeonExtras(document.querySelectorAll('.e_m_fight_log .d_imp .d_msg'), node.firstElementChild, ui_stats.currentStep());
		ui_improver.colorDungeonMap();
	}
};
ui_improver.calculateButtonsVisibility = function(forcedUpdate) {
	var i, j, len, gv = document.getElementById('godvoice'),
		baseCond = gv && (!ui_utils.isHidden(gv) || ui_data.isMobile && gv.style.display !== 'none') && !ui_storage.getFlag('Option:disableVoiceGenerators') && ui_stats.HP() > 0,
		isMonster = ui_stats.monsterName();
	if (!ui_data.isFight) {
		// inspect buttons
		var inspBtns = document.getElementsByClassName('inspect_button'),
			inspBtnsBefore = [], inspBtnsAfter = [];
		for (i = 0, len = inspBtns.length; i < len; i++) {
			inspBtnsBefore[i] = !inspBtns[i].classList.contains('hidden');
			inspBtnsAfter[i] = baseCond && !isMonster;
		}
		ui_improver.setButtonsVisibility(inspBtns, inspBtnsBefore, inspBtnsAfter);
		// craft buttons
		if (this.isFirstTime || forcedUpdate) {
			this.crftBtns = [document.getElementsByClassName('craft_button b_b')[0],
							 document.getElementsByClassName('craft_button b_r')[0],
							 document.getElementsByClassName('craft_button r_r')[0],
							 document.getElementsByClassName('craft_button span')[0],
							 document.getElementsByClassName('craft_group b_b')[0],
							 document.getElementsByClassName('craft_group b_r')[0],
							 document.getElementsByClassName('craft_group r_r')[0]
							];
			this.crftCustom = [[],[],[]];
			for (i = 0; i < 3; i++) {
				var ccrbs = this.crftBtns[i+4].getElementsByClassName('craft_button');
				for (j = 0, len = ccrbs.length; j < len; j++) {
					this.crftCustom[i].push(this.crftBtns.length);
					this.crftBtns.push(ccrbs[j]);
				}
			}
		}
		var crftBtnsBefore = [], crftBtnsAfter = [],
			crftFixed = ui_storage.getFlag('Option:fixedCraftButtons');
		for (i = 0, len = this.crftBtns.length; i < len; i++) {
			crftBtnsBefore[i] = !this.crftBtns[i].classList.contains('hidden');
			crftBtnsAfter[i] = !(!crftFixed && (!baseCond || isMonster));
		}
		crftBtnsAfter[0] = crftBtnsAfter[0] && ui_inventory.b_b.length;
		crftBtnsAfter[1] = crftBtnsAfter[1] && ui_inventory.b_r.length;
		crftBtnsAfter[2] = crftBtnsAfter[2] && ui_inventory.r_r.length;
		crftBtnsAfter[3] = crftBtnsAfter[0] || crftBtnsAfter[1] || crftBtnsAfter[2];

		for (i = 7, len = this.crftBtns.length; i < len; i++) {
			crftBtnsAfter[i] = crftBtnsAfter[i] && ui_inventory[this.crftBtns[i].id] && ui_inventory[this.crftBtns[i].id].length;
		}
		for (i = 0; i < 3; i++) {
			var crftGroupActive = false;
			for (j = 0, len = this.crftCustom[i].length; j < len; j++) {
				if (crftBtnsAfter[this.crftCustom[i][j]]) {
					crftGroupActive = true;
					break;
				}
			}
			crftBtnsAfter[i+4] = crftBtnsAfter[i+4] && crftGroupActive && crftBtnsAfter[i];
		}
		ui_improver.setButtonsVisibility(this.crftBtns, crftBtnsBefore, crftBtnsAfter);

		if (crftFixed) {
			for (i = 0, len = this.crftBtns.length; i < len; i++) {
				if (baseCond && !isMonster && !ui_data.inShop) {
					this.crftBtns[i].classList.remove('crb_inactive');
				} else {
					this.crftBtns[i].classList.add('crb_inactive');
				}
			}
		}
		// if we're in trader mode then try to mark some buttons as unavailable
		if (ui_data.hasShop) {
			ui_improver.switchButtonsForStore(!!ui_data.inShop);
		}
	}
	// voice generators
	if (this.isFirstTime) {
		this.voicegens = document.getElementsByClassName('voice_generator');
		this.voicegenClasses = [];
		for (i = 0, len = this.voicegens.length; i < len; i++) {
			this.voicegenClasses[i] = this.voicegens[i].className;
		}
	}
	var voicegensBefore = [], voicegensAfter = [],
		specialConds, specialClasses;
	if (!ui_data.isFight) {
		var isGoingBack = ui_stats.isGoingBack(),
			isTown = ui_stats.townName(),
			isSearching = ui_improver.detectors.stateGTF.res || ui_stats.lastNews().includes('дорогу'),
			isResting = /^(Переводит дух|Сушит вещи|Заканчивает перекур|Catching h.. breath|Drying h.. clothes)\.\.\.$/.test(ui_stats.lastNews()),
			dieIsDisabled = ui_storage.getFlag('Option:disableDieButton'),
			isFullGP = ui_stats.Godpower() === ui_stats.Max_Godpower(),
			isFullHP = ui_stats.HP() === ui_stats.Max_HP(),
			canQuestBeAffected = !/\((?:выполнено|completed|отменено|cancelled)\)/.test(ui_stats.Task_Name());
		specialClasses = ['heal', 'do_task', 'cancel_task', 'die', 'exp', 'dig', 'town', 'pray', 'sacrifice'];
		specialConds = [isMonster || isGoingBack || isTown || isSearching || isFullHP,				// heal
						isMonster || isGoingBack || isTown || isSearching || !canQuestBeAffected,	// do_task
																			 !canQuestBeAffected,	// cancel_task
						isMonster ||				isTown ||				 dieIsDisabled,			// die
						isMonster,																	// exp
						isMonster ||				isTown,											// dig
						isMonster || isGoingBack || isTown || isSearching || isResting,				// town
						isMonster ||										 isFullGP,				// pray
													isTown 											// sacrifice
					   ];
	}
	baseCond = baseCond && !worker.$('.r_blocked:visible').length;
	for (i = 0, len = this.voicegens.length; i < len; i++) {
		voicegensBefore[i] = !this.voicegens[i].classList.contains('hidden');
		voicegensAfter[i] = baseCond;
		if (baseCond && !ui_data.isFight) {
			for (var j = 0, len2 = specialConds.length; j < len2; j++) {
				if (specialConds[j] && this.voicegenClasses[i] && this.voicegenClasses[i].match(specialClasses[j])) {
					voicegensAfter[i] = false;
				}
			}
		}
	}
	ui_improver.setButtonsVisibility(this.voicegens, voicegensBefore, voicegensAfter);
};
ui_improver.setButtonsVisibility = function(btns, before, after) {
	for (var i = 0, len = btns.length; i < len; i++) {
		if (before[i] && !after[i]) {
			ui_utils.hideElem(btns[i], true);
		}
		if (!before[i] && after[i]) {
			ui_utils.hideElem(btns[i], false);
		}
	}
};
ui_improver.switchButtonsForStore = function(disable) {
	var activityButtons = document.querySelectorAll('#cntrl1 a, #cntrl2 a:not(.to_r_shop), a.voice_generator, a.craft_button, a.inspect_button, a.item_act_link_div');
	for (var i = 0, len = activityButtons.length; i < len; i++) {
		activityButtons[i].classList.toggle('crb_inactive', disable);
	}
};
ui_improver.improveTownAbbrs = function(towns) {
	try {
		var ntname, abbr;
		for (var i = 0, len = towns.length; i < len; i++) {
			if (ntname = ui_words.base.town_list.find(function(a) { return a.abbr && a.name === towns[i].name; })) {
				abbr = towns[i].g.lastChild;
				if (abbr.textContent !== ntname.abbr) {
					abbr.textContent = ntname.abbr;
				}
			}
		}
	} catch(e) {}
};
ui_improver.nearbyTownsFix = function(onlyDistance) {
	if (!document.getElementById('hmap_svg')) {
		return;
	}
	try {
		if (worker.GUIp_browser === 'Opera') {
			ui_improver.operaWMapFix();
		}
		var tmr, pos, town, towns, lval = document.querySelector('#hk_distance .l_val');
		pos = ui_stats.mileStones();
		towns = Array.from(document.querySelectorAll('#hmap_svg g.tl title, #hmap_svg g.sl title, #hmap_svg g.poi title'),
				function(a) {
					var b;
					if (b = a.textContent.match(/^(.*?) \((\d+)\)/)) {
						return {name:b[1], dst:+b[2], g: a.parentNode};
					} else if (b = a.textContent.match(/^(.*?), (\d+) ..\./)) {
						return {name:b[2], dst:+b[2], g: a.parentNode};
					}
				}).sort(function(a,b) { return a.dst - b.dst; });
		if (!onlyDistance) {
			var switchTI = function(town) {
				if (ui_improver.informTown === town.name) {
					ui_improver.distanceInformerReset();
				} else if (!ui_improver.dailyForecast.get().includes('gvroads') || ['Годвилль','Godville'].includes(town.name) || !isNaN(+town.name)) {
					ui_improver.distanceInformerSet(town);
				}
			}, listenerD = function(town, e) {
				if (e.which === 2) {
					switchTI(town);
					e.preventDefault();
					return;
				}
				tmr = GUIp.common.setTimeout(function() {
					switchTI(town);
					if (towns[0].g.parentNode) towns[0].g.parentNode.classList.add('block_once');
					tmr = 0;
				},1e3);
			}, listenerU = function() {
				if (tmr) {
					worker.clearTimeout(tmr);
				}
			};
			for (var i = 0, len = towns.length; i < len; i++) {
				if (!ui_utils.isAlreadyImproved(towns[i].g)) {
					GUIp.common.addListener(towns[i].g, 'mousedown', listenerD.bind(null, towns[i]));
					GUIp.common.addListener(towns[i].g, 'touchstart', listenerD.bind(null, towns[i]));
					GUIp.common.addListener(towns[i].g, 'mouseup', listenerU);
					GUIp.common.addListener(towns[i].g, 'touchend', listenerU);
				}
				if (ui_improver.informTown === towns[i].name) {
					towns[i].g.classList.add('e_selected_town');
				}
			}
			if (towns.length && !towns[0].g.parentNode.classList.contains('improved')) {
				GUIp.common.addListener(towns[0].g.parentNode, 'click', function(e) {
					if (this.classList.contains('block_once')) {
						this.classList.remove('block_once');
						e.stopPropagation();
					}
				}, true);
				towns[0].g.parentNode.classList.add('improved');
			}
			if (ui_storage.getFlag('Option:improveTownAbbrs')) {
				ui_improver.improveTownAbbrs(towns);
			}
		}
		town = towns.filter(function(b) { return isNaN(+b.name) && b.dst <= pos; }).pop();
		if (!lval.title.includes(town.name)) {
			lval.title = worker.GUIp_i18n.fmt('nearby_town', town.name, town.dst);
		}
	} catch(e) {}
};
ui_improver.operaWMapFix = function() {
	if (ui_improver.operaWMapObserver) {
		ui_improver.operaWMapObserver.disconnect();
	} else {
		ui_improver.operaWMapObserver = GUIp.common.newMutationObserver(function(mutations) {
			var f = false;
			for (i = 0, len = mutations.length; i < len; i++) {
				if (mutations[i].attributeName === 'd' || mutations[i].attributeName === 'to' && mutations[i].target.nodeName === 'animateTransform' && mutations[i].target.getAttribute('type') === 'translate') {
					mutations[i].target.removeAttribute('oprfix');
					GUIp.common.debug('removing oprfix from "' + mutations[i].attributeName + '"')
					f = true;
				}
			}
			if (f) {
				ui_improver.operaWMapFix();
			}
		});
	}
	// info popups positioned at the bottom most of the time are glitched and not repainted properly, placing them at the top kinda "resolves" this issue
	var hinfos = document.getElementsByClassName('hmap_info');
	for (var i = 0, len = hinfos.length; i < len; i++) {
		hinfos[i].style.bottom = 'inherit';
		hinfos[i].style.top = '10px';
	}
	// if the map is placed at central column then it's not required to apply rescaling to it
	if (document.querySelector('.c_col #hmap')) {
		return;
	}
	var svg = document.getElementById('hmap_svg');
	var hscale = function(a) { return (a*0.65).toFixed(2); }
	var paths = svg.getElementsByTagName('path');
	for (var j = 0, i = 0; i < paths.length; i++) {
		if (paths[i].getAttribute('d') && !paths[i].getAttribute('oprfix')) {
			paths[i].setAttribute('d',paths[i].getAttribute('d').replace(/\d+(\.\d+)?/g,hscale));
			paths[i].setAttribute('oprfix','1');
			j++;
		}
		if (paths[i].classList.contains('tmap')) {
			paths[i].style.strokeWidth = hscale(2);
		}
		if (paths[i].classList.contains('loc_segment')) {
			paths[i].style.strokeWidth = hscale(12);
		}
	}
	if (j) GUIp.common.info('world map: scaled '+j+' paths');
	var gs = svg.querySelectorAll('g[transform^="translate"]');
	for (var j = 0, i = 0, len = gs.length; i < len; i++) {
		if (!gs[i].getAttribute('oprfix')) {
			gs[i].setAttribute('transform',gs[i].getAttribute('transform').replace(/\d+(\.\d+)?/g,hscale));
			gs[i].setAttribute('oprfix','1');
			j++;
		}
	}
	if (j) GUIp.common.info('world map: scaled '+j+' gs');
	var circles = svg.getElementsByTagName('circle');
	for (var j = 0, i = 0, len = circles.length; i < len; i++) {
		if (!circles[i].getAttribute('oprfix')) {
			circles[i].setAttribute('r',hscale(circles[i].getAttribute('r')));
			circles[i].setAttribute('oprfix','1');
			j++;
		}
	}
	if (j) GUIp.common.info('world map: scaled '+j+' circles');
	var texts = svg.getElementsByTagName('text');
	for (var j = 0, i = 0, len = texts.length; i < len; i++) {
		if (!texts[i].getAttribute('oprfix')) {
			texts[i].setAttribute('dy',hscale(texts[i].getAttribute('dy')));
			texts[i].setAttribute('font-size',hscale(texts[i].getAttribute('font-size')));
			texts[i].setAttribute('oprfix','1');
			j++;
		}
	}
	if (j) GUIp.common.info('world map: scaled '+j+' texts');
	var anims = svg.querySelectorAll('animateTransform[type="translate"]');
	for (var j = 0, i = 0, len = anims.length; i < len; i++) {
		if (!anims[i].getAttribute('oprfix')) {
			anims[i].setAttribute('from',anims[i].getAttribute('from').replace(/\d+(\.\d+)?/g,hscale));
			anims[i].setAttribute('to',anims[i].getAttribute('to').replace(/\d+(\.\d+)?/g,hscale));
			anims[i].setAttribute('oprfix','1');
			j++;
		}
	}
	if (j) GUIp.common.info('world map: scaled '+j+' anims');
	svg.style.transform = 'scale(1)';
	ui_improver.operaWMapObserver.observe(svg,{ subtree: true, attributes: true, attributeFilter: ['d','to']});
};
ui_improver.thirdEyePositionFix = function() {
	var owtop, oatop, wtop, atop,
		content = document.querySelector('.wup.in .tep'),
		wup = document.querySelector('.wup.in');
	try {
		owtop = wup.style.top;
		oatop = wup.firstChild.style.top;
		wup.style.top = '-2000px';
		ui_utils.hideElem(wup,false);
		content.style.maxHeight = (worker.innerHeight - 150) + 'px';
		wtop = worker.innerHeight + worker.scrollY - wup.clientHeight - 75;
		atop = document.getElementById('imp_button').getBoundingClientRect().top + worker.scrollY - wtop + 11;
		if (atop < 50) {
			wtop -= 50 - atop;
			atop = 50;
		}
		if (atop > wup.clientHeight) {
			wtop += atop - wup.clientHeight + 10;
			atop -= atop - wup.clientHeight + 15;
		}
		if (wtop < 0) wtop = 0;
		wup.firstChild.style.top = atop + 'px';
		wup.style.top = wtop + 'px';
	} catch (e) {
		wup && wup.firstChild && (wup.firstChild.style.top = oatop);
		wup && (wup.style.top = owtop);
	}
};
ui_improver.chatsFix = function() {
	if (ui_data.isMobile) return;
	var chats = document.getElementsByClassName('frDockCell'),
		len = chats.length;
	// fix overlapping issues when opening a huge number of chats
	for (var i = 0; i < len; i++) {
		var chat = chats[i];
		chat.classList.remove('left');
		chat.style.zIndex = len - i;
		if (chat.getBoundingClientRect().right < 350) {
			chat.classList.add('left');
		}
	}
	// padding for page settings link
	var paddingBottom = len ? chats[0].getBoundingClientRect().bottom - chats[len - 1].getBoundingClientRect().top : worker.GUIp_browser === 'Opera' ? 27 : 0,
		isBottom = worker.scrollY >= document.documentElement.scrollHeight - document.documentElement.clientHeight - 10;
	paddingBottom = Math.floor(paddingBottom*10)/10 + 10;
	paddingBottom = paddingBottom < 0 ? 0 : paddingBottom + 'px';
	document.getElementsByClassName('reset_layout')[0].style.paddingBottom = paddingBottom;
	if (isBottom) {
		worker.scrollTo(0, document.documentElement.scrollHeight - document.documentElement.clientHeight);
	}
};
ui_improver.improveChat = function() {
	var chats = ui_data.isMobile ? ui_improver._openedChatContents : document.getElementsByClassName('chat_ph')[0];
	if (!chats || ui_utils.isAlreadyImproved(chats)) {
		return;
	}
	// by default, guildmate's name is appended to the end of the message when clicked.
	// we insert it into current cursor's position instead
	GUIp.common.addListener(chats, 'click', function(ev) {
		var node = ev.target;
		// ignore unless a godname is clicked
		if (!node.classList.contains('gc_fr_god')) {
			return;
		}
		var godName = node.textContent;
		// find the textarea
		while (!(node = node.parentNode).classList.contains('frMsgBlock')) { }
		node = node.querySelector('.frInputArea textarea');
		// insert godname into it
		ui_improver._insertGodNameToChat(node,godName);
		// avoid executing original code
		ev.stopPropagation();
	}, true);
};
ui_improver._insertGodNameToChat = function(node, godName) {
	var text = node.value,
		pos = node.selectionDirection === 'backward' ? node.selectionStart : node.selectionEnd;
	node.value = text.slice(0, pos) + '@' + godName + ', ' + text.slice(pos);
	node.focus();
	node.selectionStart = node.selectionEnd = pos + godName.length + 3;
};
ui_improver._getChatMsgText = function(msg) {
	var author = msg.getElementsByClassName('gc_fr_god')[0],
		result = author ? author.textContent : '',
		classes;
	// there might be hyperlinks in the message
	for (var child = msg.firstChild; child && !((classes = child.classList) && classes.contains('fr_msg_meta')); child = child.nextSibling) {
		result += child.textContent;
	}
	return result;
};
ui_improver._fixChatScrolling = function(msgArea) {
	var msgs = msgArea.getElementsByClassName('fr_msg_l'),
		latestMsgText = '',
		latestMsgOffset = 0,
		scroll = msgArea.scrollTop;
	if (msgs.length) {
		latestMsgText = this._getChatMsgText(msgs[msgs.length - 1]);
		latestMsgOffset = msgs[msgs.length - 1].offsetTop;
	}

	msgArea.addEventListener('scroll', function() {
		// executed without a try-catch wrapper for speed; extra careful here
		scroll = this.scrollTop;
	});

	GUIp.common.newMutationObserver(function() {
		var i = msgs.length - 1;
		if (i < 0) return;
		var j = i,
			newLatestMsg = msgs[i],
			newLatestMsgText = ui_improver._getChatMsgText(newLatestMsg),
			latestMsg = newLatestMsg;
		// look for the message we've seen the last time
		if (newLatestMsgText !== latestMsgText) {
			while (i-- && ui_improver._getChatMsgText((latestMsg = msgs[i])) !== latestMsgText) { }
			latestMsgText = newLatestMsgText;
		}

		var newLatestMsgOffset = newLatestMsg.offsetTop;
		if (i < 0 || (j - i <= 5 && scroll >= latestMsgOffset + latestMsg.offsetHeight - msgArea.offsetHeight - 3)) {
			// we've lost it or were already at the bottom; scroll down to the bottom
			// but guild council preserves its scrolling when more than 5 messages arrive at once, so do we
			// note:
			// since firefox 124 value 2147483647 (2^31 - 1) has stopped working here,
			// so now the maximum scrollTop allowed seems to be 2147483583 (2^31 - 65)
			msgArea.scrollTop = 2147483583;
		} else {
			// restore scrolling with respect to new messages' height
			msgArea.scrollTop = scroll + (latestMsg.offsetTop - latestMsgOffset);
		}
		latestMsgOffset = newLatestMsgOffset;
	}).observe(msgArea, {childList: true, subtree: true});
};
ui_improver.processNewChat = function(chat) {
	var node = chat.getElementsByClassName(ui_data.isMobile ? 'ui-title' : 'dockfrname')[0],
		name, key, saved, header;
	if (!node || !(name = node.textContent) || !(node = chat.querySelector('.frInputArea textarea'))) {
		return;
	}

	key = 'PM:' + name;
	if ((saved = ui_tmpstorage.get(key))) {
		node.value = saved;
		node.dispatchEvent(new Event('change', {bubbles: true})); // ask Godville to resize the textarea
		if (node.disabled) {
			// Guild Council window is initially disabled, and when it gets enabled, the text is cleared
			GUIp.common.newMutationObserver(function(mutations, observer) {
				if (!node.disabled) {
					node.value = saved;
					observer.disconnect();
				}
			}).observe(node, {attributes: true, attributeFilter: ['disabled']});
		}
	}

	var saveText = function() {
		var text = node.value;
		if (text) {
			ui_tmpstorage.set(key, text);
		} else {
			ui_tmpstorage.remove(key);
		}
	};
	GUIp.common.addListener(node, 'blur', saveText);

	// on mobile version we don't care for scrolling for now, and we have proper full name from the beginning
	if (ui_data.isMobile) {
		ui_utils.hideNotification('pm_' + name);
		GUIp.common.addListener(node, 'focus', ui_utils.hideNotification.bind(ui_utils, 'pm_' + name));
	}
	// wait until chat is loaded
	else if ((header = chat.getElementsByClassName('fr_chat_header')[0])) {
		ui_utils.observeUntil(header, {characterData: true, childList: true}, function() {
			return header.textContent.trim() || undefined;
		}).then(function(friendName) {
			var pos = friendName.search(/ и е(?:го|ё) | and h[ie][sr] hero/);
			if (pos >= 0) {
				friendName = friendName.slice(0, pos);
			}
			// hide desktop notification when opening the chat
			// unfortunately, .dockfrname contains just abbreviated name
			ui_utils.hideNotification('pm_' + friendName);
			GUIp.common.addListener(node, 'focus', ui_utils.hideNotification.bind(ui_utils, 'pm_' + friendName));
			// scroll position is reset every time a new message appears. try to workaround that
			var msgArea = chat.getElementsByClassName('frMsgArea')[0];
			if (msgArea) {
				ui_improver._fixChatScrolling(msgArea);
			}
		}).catch(GUIp.common.onUnhandledException);
	}
};
ui_improver.checkGCMark = function(csource) {
	var gc_tab = document.querySelector('.msgDock.frDockCell.frbutton_pressed .dockfrname');
	if (gc_tab && gc_tab.textContent.match(/Гильдсовет|Guild Council/) && gc_tab.parentNode.getElementsByClassName('fr_new_msg').length) {
		worker.$('.frbutton_pressed textarea').triggerHandler('focus');
	}
};
ui_improver.createWakelock = function() {
	var wakelockSwitch;
	if (ui_data.isMobile) {
		document.querySelector('.e_mt_forum_informers, .e_mt_menu').insertAdjacentHTML('beforebegin',
			'<div class="line" id="wakelock_switch"><div class="l_text"><input type="checkbox"/> ' + worker.GUIp_i18n.wakelock_menu + '</div></div>'
		);
		wakelockSwitch = document.getElementById('wakelock_switch');
	} else {
		wakelockSwitch = document.createElement('div');
		wakelockSwitch.id = 'wakelock_switch';
		wakelockSwitch.textContent = '\uD83D\uDCA1'; // light bulb
		document.getElementById('main_wrapper').appendChild(wakelockSwitch);
	}
	GUIp.common.addListener(wakelockSwitch, 'click', function() { ui_improver.switchWakelock(); });
	// we need to re-enable a modern wakelock on each visibility state change to visible
	if (worker.navigator.wakeLock) {
		GUIp.common.addListener(document, 'visibilitychange', function() {
			if (document.visibilityState === "visible" && ui_improver.wakeLock === null && ui_storage.getFlag('wakelockEnabled')) {
				ui_improver.switchWakelock(true);
			}
		});
	}
	ui_improver.wakeLock = null;
	if (ui_storage.getFlag('wakelockEnabled')) {
		ui_improver.switchWakelock(true);
	}
};
ui_improver.switchWakelock = function(enable) {
	var wakelockSwitch = document.getElementById('wakelock_switch'),
		wakelockCB = wakelockSwitch.getElementsByTagName('input')[0], 
		wakelockRemoved = function() {
			ui_improver.wakeLock = null;
			wakelockSwitch.classList.remove('wakelock_enabled');
			if (wakelockCB) {
				wakelockCB.checked = false;
			}
		},
		wakelockEnabled = function() {
			ui_storage.set('wakelockEnabled',true);
			wakelockSwitch.classList.add('wakelock_enabled');
			if (wakelockCB) {
				wakelockCB.checked = true;
			}
		};
	if (!ui_improver.wakeLock || enable) {
		if (worker.navigator.wakeLock) {
			// modern request
			worker.navigator.wakeLock.request("screen").then(function (wakeLock) {
				GUIp.common.debug('modern wakelock active.');
				ui_improver.wakeLock = wakeLock;
				GUIp.common.addListener(ui_improver.wakeLock, 'release', function() {
					GUIp.common.debug('modern wakelock released.');
					wakelockRemoved();
				});
				wakelockEnabled();
			}).catch(function(e) { GUIp.common.error('error trying to enable modern wakelock:',e) });
		} else {
			// legacy firefox
			ui_improver.wakeLock = worker.navigator.requestWakeLock('screen');
			if (ui_improver.wakeLock) {
				wakelockEnabled();
			}
		}
	} else {
		if (ui_improver.wakeLock.release) {
			ui_improver.wakeLock.release();
		} else if (ui_improver.wakeLock.unlock) {
			ui_improver.wakeLock.unlock();
			wakelockRemoved();
		}
		ui_storage.set('wakelockEnabled',false);
	}
};
ui_improver.initTouchDragging = function() {
	Array.prototype.forEach.call(document.getElementsByClassName('b_handle'), ui_dragger.register);
};
ui_improver.activity = function() {
	if (!ui_logger.updating) {
		ui_logger.updating = true;
		GUIp.common.setTimeout(function() {
			ui_logger.updating = false;
		}, 500);
		ui_logger.update();
	}
};
// ui_inventory
var ui_inventory = worker.GUIp.inventory = {};

ui_inventory.observer = {
	config: {
		childList: true,
		attributes: true,
		subtree: true,
		attributeFilter: ['style']
	},
	func: function(mutations) {
		var losingItem = false,
			mutation, target;
		for (var i = 0, len = mutations.length; i < len; i++) {
			mutation = mutations[i];
			target = mutation.target;
			switch (target.tagName) {
				case 'LI':
					// see `ui_inventory.getInventory` for an explanation
					if (mutation.type === 'attributes' && target.style.overflow === 'hidden' && target.parentNode) {
						losingItem = true;
					}
					break;
				case 'UL':
					if (mutation.addedNodes.length || mutation.removedNodes.length) {
						return ui_inventory._update();
					}
			}
		}
		if (losingItem) ui_inventory._updateThrottled();
	},
	target: ['#inv_block_content ul']
};
ui_inventory.bossPartRE = /[]/;
ui_inventory.model = null;
ui_inventory._updateThrottled = null;
ui_inventory.init = function() {
	if (ui_data.isFight) {
		ui_inventory.model = new ui_inventory.Model;
		return;
	}
	this.forbiddenCraft = ui_storage.createVar('Option:forbiddenCraft', function(text) { return text || ''; });
	this.bossPartRE = new RegExp('^(?:влюблённое )?(' + GUIp_i18n.bp_types.join('|') + ')' + GUIp_i18n.bp_prefix, 'i');
	this._updateThrottled = GUIp.common.throttle(500, this._update);
	this._createCraftButtons();
	this._update();
	ui_observers.start(ui_inventory.observer);
};
ui_inventory.rebuildCustomCraft = function() {
	var groupType, rebuiltGroup, craftGroups = document.getElementsByClassName('craft_group');
	for (var i = 0, len = craftGroups.length; i < len; i++) {
		while (craftGroups[i].firstChild) {
			craftGroups[i].removeChild(craftGroups[i].firstChild);
		}
		if ((groupType = /b_b|b_r|r_r/.exec(craftGroups[i].className))) {
			rebuiltGroup = ui_inventory._createCraftSubGroup(groupType[0]);
			rebuiltGroup.className = craftGroups[i].className;
			craftGroups[i].parentNode.replaceChild(rebuiltGroup,craftGroups[i]);
		}
	}
	ui_inventory._update();
};
ui_inventory._createCraftButtons = function() {
	var invContent = document.getElementById('inv_block_content'),
		craftContent = document.createElement('span');
	if (!invContent) {
		return;
	}
	craftContent.className = 'craft_button span';
	craftContent.appendChild(ui_inventory._createCraftButton(worker.GUIp_i18n.b_b, 'b_b', worker.GUIp_i18n.b_b_hint));
	craftContent.appendChild(ui_inventory._createCraftSubGroup('b_b'));
	craftContent.appendChild(ui_inventory._createCraftButton(worker.GUIp_i18n.b_r, 'b_r', worker.GUIp_i18n.b_r_hint));
	craftContent.appendChild(ui_inventory._createCraftSubGroup('b_r'));
	craftContent.appendChild(ui_inventory._createCraftButton(worker.GUIp_i18n.r_r, 'r_r', worker.GUIp_i18n.r_r_hint));
	craftContent.appendChild(ui_inventory._createCraftSubGroup('r_r'));
	ui_storage.addImmediateListener('Option:relocateCraftButtons', function(relocate) {
		invContent.insertAdjacentElement(relocate === 'true' ? 'beforebegin' : 'afterend', craftContent);
	});
};
ui_inventory._createInspectButton = function(item_name) {
	var a = document.createElement('a');
	a.className = 'inspect_button' + (ui_data.inShop ? ' crb_inactive' : '');
	a.title = worker.GUIp_i18n.fmt('ask_to_inspect', ui_data.char_sex[0], item_name);
	a.textContent = '?';
	GUIp.common.addListener(a, 'click', ui_inventory._inspectButtonClick.bind(null, item_name));
	return a;
};
ui_inventory._inspectButtonClick = function(item_name, ev) {
	ev.preventDefault();
	ui_utils.setVoice(ui_words.inspectPhrase(worker.GUIp_i18n.trophy + item_name));
};
ui_inventory._createCraftButton = function(combo, combo_list, hint) {
	var a = document.createElement('a');
	if (!combo_list.includes('customCraft-')) {
		a.className = 'craft_button ' + combo_list + (ui_data.inShop ? ' crb_inactive' : '');
		a.title = worker.GUIp_i18n.fmt('ask_to_craft', ui_data.char_sex[0], hint);
	} else {
		a.className = 'craft_button' + (ui_data.inShop ? ' crb_inactive' : '');
		a.id = combo_list;
		a.title = worker.GUIp_i18n.fmt('ask_to_craft_a', ui_data.char_sex[0], hint);
	}
	a.innerHTML = combo;
	GUIp.common.addListener(a, 'click', ui_inventory._craftButtonClick.bind(a, combo_list));
	return a;
};
ui_inventory._craftButtonClick = function(combo_list, ev) {
	ev.preventDefault();
	var rand = Math.floor(Math.random()*ui_inventory[combo_list].length),
		items = ui_inventory[combo_list][rand];
	if (Math.random() < 0.5) {
		items.reverse();
	}
	ui_utils.setVoice(ui_words.craftPhrase(items[0] + worker.GUIp_i18n.and + items[1]));
};
ui_inventory._createCraftSubGroup = function(combo_group) {
	var span = document.createElement('span'),
		customCraftGroups = ui_inventory._customCraftCheckGrp(combo_group);
	span.className = 'craft_group ' + combo_group + ' hidden';
	span.appendChild(document.createElement('wbr'));
	span.appendChild(document.createTextNode('('));
	for (var i = 0, len = customCraftGroups.length; i < len; i++) {
		span.appendChild(document.createElement('wbr'));
		span.appendChild(ui_inventory._createCraftButton(customCraftGroups[i].t, 'customCraft-'+combo_group+'-'+customCraftGroups[i].i, customCraftGroups[i].d));
	}
	span.appendChild(document.createTextNode(')'));
	span.appendChild(document.createElement('wbr'));
	return span;
};
ui_inventory._customCraftCheckGrp = function(grp) {
	var grpm, result = [];
	switch (grp) {
		case 'b_b': grpm = /[жb]/i; break;
		case 'b_r': grpm = /[сm]/i; break;
		default: grpm = /[нr]/i;
	}
	for (var i = 0, len = ui_words.base.custom_craft.length; i < len; i++) {
		var customCombo = ui_words.base.custom_craft[i];
		if (customCombo.q) {
			continue;
		}
		if (grpm.test(customCombo.g)) {
			result.push(customCombo);
		}
	}
	return result;
};
ui_inventory._getFirstLetter = function(name) {
	return name.charAt(name.search(/[a-zа-яё]/i)).toLowerCase(); // may return ''
};
ui_inventory._update = function() {
	var i, len, inv, li, item, count, ilink, types,
		trophyType = {},
		forbiddenCraft = '';
	if (ui_data.isSail || ui_data.isMining) {
		return;
	}
	forbiddenCraft = ui_inventory.forbiddenCraft.get();
	// Parse items
	inv = ui_inventory.getInventory();
	ui_inventory.model = inv.md;
	for (i = 0, len = inv.lis.length; i < len; i++) {
		li = inv.lis[i];
		item = inv.md.getName(i);
		count = inv.md.getCount(i);
		// color items and add buttons
		if ((ilink = inv.useLinks[i])) { // usable item
			if (inv.usableTypes[i]) {
				li.classList.add('type-' + inv.usableTypes[i].replace(/ /g,'-'));
			} else if (!ui_utils.hasShownInfoMessage) {
				ui_utils.hasShownInfoMessage = true;
				ui_utils.showMessage('info', {
					title: worker.GUIp_i18n.unknown_item_type_title,
					content: '<div>' + worker.GUIp_i18n.unknown_item_type_content + '<b>"' + GUIp.common.escapeHTML(String(inv.descriptions[i] || '')) + '</b>"</div>'
				});
			}
			if (!(forbiddenCraft.includes('usable') || (forbiddenCraft.includes('b_b') && forbiddenCraft.includes('b_r'))) &&
				!ui_words.usableItemTypeMatch(inv.descriptions[i], 'to arena box') && !ui_words.usableItemTypeMatch(inv.descriptions[i], 'temper box')) {
				trophyType[item] = {a:true, b:inv.md.isBold(i), c:count};
			}
			// confirm dialog on item activation for firefox on Android. note that official mobile version has its own confirm dialog doing the same thing
			if (GUIp.common.isAndroid && !ui_data.isMobile) {
				var ilink2;
				if (!li.getElementsByTagName('a')[1]) {
					ilink2 = document.createElement('a');
					GUIp.common.addListener(ilink2, 'click', function(link) {
						if (!link.classList.contains('div_link') || worker.confirm(link.title + '. ' + worker.GUIp_i18n.confirm_item_activate)) {
							link.click();
						}
					}.bind(null, ilink));
					ilink.insertAdjacentElement('afterend', ilink2);
					ilink.style.display = 'none';
				} else {
					ilink2 = li.getElementsByTagName('a')[1];
				}
				if (ilink2) {
					ilink2.title = ilink.title;
					ilink2.className = ilink.className;
					ilink2.textContent = '★';
				}
			} else if (!li.classList.contains('improved') && inv.gpCosts[i]) {
				ui_utils.addGPConfirmation(worker.$(ilink), inv.gpCosts[i],
					worker.GUIp_i18n.fmt('do_you_want', worker.GUIp_i18n.to_activate + item));
			}
			if (ui_improver.dailyForecast.get().includes('cheapactivatables')) {
				li.classList.add('usable_item_fcc');
				li.classList.remove('usable_item_fce');
			} else if (ui_improver.dailyForecast.get().includes('expensiveactivatables')) {
				li.classList.add('usable_item_fce');
				li.classList.remove('usable_item_fcc');
			} else {
				li.classList.remove('usable_item_fcc', 'usable_item_fce');
			}
		} else if (inv.md.isHealing(i)) { // healing item
			// if item quantity has increased, it seems that class needs to be re-added again
			li.classList.add('heal_item');
			if (!(forbiddenCraft.includes('heal') || (forbiddenCraft.includes('b_r') && forbiddenCraft.includes('r_r')))) {
				trophyType[item] = {b:false,c:count};
			}
		} else {
			if (inv.md.isBold(i)) { // bold item
				if (!(forbiddenCraft.includes('b_b') && forbiddenCraft.includes('b_r')) && inv.md.isCraftable(i)) {
					trophyType[item] = {b:true,c:count};
				}
			} else {
				if (!(forbiddenCraft.includes('b_r') && forbiddenCraft.includes('r_r')) && inv.md.isCraftable(i)) {
					trophyType[item] = {b:false,c:count};
				}
			}
		}
		if (!li.classList.contains('improved') && !ui_inventory._uninspectables.test(item)) {
			li.appendChild(ui_inventory._createInspectButton(item));
		}
		li.classList.toggle('wanted_item', ui_improver.wantedItems.get() && ui_improver.wantedItems.get().test(item));
		li.classList.toggle('bingo_item', ui_improver.bingoTries.get() && (item === '❄' || (ui_improver.bingoItems.get() && ui_improver.bingoItems.get().test(item))));
		li.classList.toggle('e_craft_impossible',
			!inv.md.isCraftable(i) || inv.craftableForPrefix[ui_inventory._getFirstLetter(item)] === 1
		);
		li.classList.add('improved');
	}

	types = Object.keys(ui_words.base.usable_items);
	for (i = 0, len = types.length; i < len; i++) {
		ui_informer.update(types[i], inv.md.hasType(types[i]));
	}
	ui_informer.update('transform!', inv.boldCount >= 2 && inv.md.hasType('transformer'));
	ui_informer.update('smelt!', inv.md.hasType('smelter') && ui_stats.Gold() >= 3000);

	ui_inventory._updateCraftCombos(trophyType);
};
ui_inventory.tryUpdate = function() {
	if (document.querySelector('#inv_block_content li.improved')) {
		ui_inventory._update();
	}
};
ui_inventory._updateCraftCombos = function(trophy_type) {
	// Склейка трофеев, формирование списков
	ui_inventory.b_b = [];
	ui_inventory.b_r = [];
	ui_inventory.r_r = [];
	var item_names = Object.keys(trophy_type).sort(),
		ccraft_enabled = ui_storage.getFlag('Option:enableCustomCraft');
	if (item_names.length) {
		for (var i = 0, len = item_names.length; i < len; i++) {
			for (var j = i + 1; j < len && i < len - 1; j++) {
				if (item_names[i][0] === item_names[j][0]) {
					if (trophy_type[item_names[i]].b && trophy_type[item_names[j]].b) {
						if (!this.forbiddenCraft.get().includes('b_b')) {
							ui_inventory.b_b.push([item_names[i], item_names[j]]);
						}
					} else if (!trophy_type[item_names[i]].b && !trophy_type[item_names[j]].b) {
						if (!this.forbiddenCraft.get().includes('r_r')) {
							ui_inventory.r_r.push([item_names[i], item_names[j]]);
						}
					} else {
						if (!this.forbiddenCraft.get().includes('b_r')) {
							ui_inventory.b_r.push([item_names[i], item_names[j]]);
						}
					}
				} else {
					break;
				}
			}
			if (trophy_type[item_names[i]].c > 1) {
				if (trophy_type[item_names[i]].b) {
					ui_inventory.b_b.push([item_names[i], item_names[i]]);
				} else {
					ui_inventory.r_r.push([item_names[i], item_names[i]]);
				}
			}
		}
		for (var i = 0, len = ui_words.base.custom_craft.length; i < len; i++) {
			var customCombo = ui_words.base.custom_craft[i];
			if (/[жb]/i.test(customCombo.g)) {
				ui_inventory['customCraft-b_b-'+customCombo.i] = [];
				if (ccraft_enabled) {
					for (var j = 0, len2 = ui_inventory.b_b.length; j < len2; j++) {
						if (customCombo.l.includes(ui_inventory._getFirstLetter(ui_inventory.b_b[j][0]))) {
							if (/[аa]/i.test(customCombo.g) && !(trophy_type[ui_inventory.b_b[j][0]].a || trophy_type[ui_inventory.b_b[j][1]].a)) {
								continue;
							}
							ui_inventory['customCraft-b_b-'+customCombo.i].push(ui_inventory.b_b[j]);
						}
					}
				}
			}
			if (/[сm]/i.test(customCombo.g)) {
				ui_inventory['customCraft-b_r-'+customCombo.i] = [];
				if (ccraft_enabled) {
					for (var j = 0, len2 = ui_inventory.b_r.length; j < len2; j++) {
						if (customCombo.l.includes(ui_inventory._getFirstLetter(ui_inventory.b_r[j][0]))) {
							if (/[аa]/i.test(customCombo.g) && !(trophy_type[ui_inventory.b_r[j][0]].a || trophy_type[ui_inventory.b_r[j][1]].a)) {
								continue;
							}
							ui_inventory['customCraft-b_r-'+customCombo.i].push(ui_inventory.b_r[j]);
						}
					}
				}
			}
			if (/[нr]/i.test(customCombo.g)) {
				ui_inventory['customCraft-r_r-'+customCombo.i] = [];
				if (ccraft_enabled) {
					for (var j = 0, len2 = ui_inventory.r_r.length; j < len2; j++) {
						if (customCombo.l.includes(ui_inventory._getFirstLetter(ui_inventory.r_r[j][0]))) {
							if (/[аa]/i.test(customCombo.g) && !(trophy_type[ui_inventory.r_r[j][0]].a || trophy_type[ui_inventory.r_r[j][1]].a)) {
								continue;
							}
							ui_inventory['customCraft-r_r-'+customCombo.i].push(ui_inventory.r_r[j]);
						}
					}
				}
			}
		}
	}
	// fixme! this shouldn't be called until everything in improver has finished loading
	if (!ui_improver.isFirstTime) {
		ui_improver.calculateButtonsVisibility();
	}
};

ui_inventory._uncraftables = /ошмёток босса |(пушистого|зубастого) триббла|шкуру разыскиваемого |старую шмотку|золотой кирпич|ареналин|подземелин|заплывин|билет в провал|путевку в круиз|движок по фазе|слезинку бога в янтаре|^заморск.. |(?:ларец|сундучок|ящик) из моря|босскоин|shred of the |tribble$|hide of a wanted |old piece of equipment|^golden brick|arena(?:lin| ticket)|ticket to sail|invite to dungeon|sail setter|dungeon key|hammer of realignment|holy powercell|^outlandish |^overseas |chained crate|donation box|pirate coffer|bosscoin/i;
ui_inventory._unsellables = /(пушистого|зубастого) триббла|шкуру разыскиваемого |(?:купон на|coupon for) .*©|tribble$|hide of a wanted /i;
ui_inventory._uninspectables = /(пушистого|зубастого) триббла|шкуру разыскиваемого |tribble$|hide of a wanted /i;
ui_inventory._coupons = /^(купон на|coupon for) .*©/i

ui_inventory._areBossPartsUnsellable = function() {
	// boss parts' sellability is dynamic: they cannot be sold to a roadside trader
	return ui_stats.heroState() === 'trading' && ui_stats.sProgress() === 1 && !ui_stats.townName();
};

ui_inventory.Model = function() {
	this._names = [];
	this._namesDict = null; // lazy
	this._typesSet = Object.create(null);
	this._counts = [];
	this._useLinks = [];
	// healing:   0x1
	// bold:      0x2
	// boss part: 0x4
	// craftable: 0x8
	// sellable:  0x10 (lazy)
	this._props = [];
	this._healingCount = 0;
	this._bossPartsCount = 0;
	this._unsellableCount = -1; // lazy
};

ui_inventory.Model.prototype = {
	constructor: ui_inventory.Model,

	// lazy initialization
	_calcNamesDict: function() {
		var result = Object.create(null);
		for (var i = 0, len = this._names.length; i < len; i++) {
			result[this._names[i].toLowerCase()] = i;
		}
		return (this._namesDict = result);
	},
	_calcUnsellable: function() {
		var count = 0;
		for (var i = 0, len = this._names.length; i < len; i++) {
			if (ui_inventory._unsellables.test(this._names[i])) {
				count += this._counts[i];
			} else {
				this._props[i] += 0x10;
			}
		}
		return (this._unsellableCount = count);
	},

	get length() { return this._names.length; },
	// querying properties of a single item
	getName: function(i) { return this._names[i]; },
	getCount: function(i) { return this._counts[i]; },
	isUsable: function(i) { return !!this._useLinks[i]; },
	isHealing: function(i) { return !!(this._props[i] & 0x1); },
	isBold: function(i) { return !!(this._props[i] & 0x2); },
	isBossPart: function(i) { return !!(this._props[i] & 0x4); },
	isCraftable: function(i) { return !!(this._props[i] & 0x8); },
	isSellable: function(i) {
		var p = 0x0;
		if (this._unsellableCount < 0) { // not initialized yet
			this._calcUnsellable();
		}
		p = this._props[i];
		// healing items (0x1) are excluded as well
		return (p & 0x15) === 0x10 || !(!(p & 0x4) || ui_inventory._areBossPartsUnsellable());
	},

	// detecting presence of particular items
	getItemIndex: function(name) { return (this._namesDict || this._calcNamesDict())[name.toLowerCase()]; },
	hasType: function(type) { return type in this._typesSet; },

	// aggregate functions
	countHealing: function() { return this._healingCount; },
	countUnsellable: function() {
		var u = this._unsellableCount,
			bp = this._bossPartsCount;
		return (
			this._healingCount + (u >= 0 ? u : this._calcUnsellable()) +
			// avoid calling `_areBossPartsUnsellable` if we don't need it
			(bp && ui_inventory._areBossPartsUnsellable() && bp)
		);
	}
};

ui_inventory.getInventory = function() {
	var allLis = document.querySelectorAll('#inv_block_content li'),
		md = new ui_inventory.Model,
		boldCount = 0,
		lis = [],
		craftableForPrefix = {},
		usableTypes = [],
		descriptions = [],
		gpCosts = [],
		i = 0,
		name = '',
		count = 0,
		healing = false,
		bold = false,
		bossPart = false,
		craftable = false,
		s = '',
		li, node, m;
	for (var j = 0, jlen = allLis.length; j < jlen; j++) {
		li = allLis[j];
		// when an item is being removed from the inventory, its `overflow` is set to 'hidden' and its `height`,
		// `padding-top`, and `padding-bottom` are being decreased rapidly. when they reach 0, `display` is set to
		// 'none' and all other attributes are cleared.
		// on the other hand, when an item is added to the inventory, it appears instantly (and glows, but that is
		// irrelevant to us). so we just need to check `overflow` and `display` to exclude lost items.
		if (li.style.overflow === 'hidden' || li.style.display === 'none') {
			continue;
		}
		lis[i] = li;
		name = md._names[i] = li.firstChild.textContent;
		count = md._counts[i] =
			((node = li.childNodes[1]) && (m = /\((\d+)\s*(?:шт|pcs)\.?\)$/.exec(node.nodeValue)) && +m[1]) || 1;
		// usable items
		if ((node = md._useLinks[i] = li.querySelector('a.item_act_link_div'))) {
			// extract item's description, godpower cost, and type
			m = /^(.*?)\s*\((.*?)\)$/.exec(node.title) || [, node.title, node.title];
			s = descriptions[i] = m[1];
			if ((s = usableTypes[i] = ui_words.usableItemType(s, !(
				gpCosts[i] = (m = /\d+\s*%/.exec(m[2])) ? parseInt(m[0]) : 0
			)) || '')) {
				md._typesSet[s] = true;
			}
		} else {
			usableTypes[i] = descriptions[i] = '';
			gpCosts[i] = 0;
		}
		// various properties
		if ((healing = li.style.fontStyle === 'italic')) {
			md._healingCount += count;
		}
		if ((bold = (s = li.style.fontWeight) === 'bold' || !!+s)) {
			boldCount += count;
		}
		if ((bossPart =
			bold && (m = ui_inventory.bossPartRE.exec(name)) && (s = name[m[0].length]) && s === s.toUpperCase()
		)) {
			md._bossPartsCount += count;
		}
		if ((craftable =
			!bossPart && (!ui_inventory._uncraftables.test(name) || ui_inventory._coupons.test(name)) && !!(s = ui_inventory._getFirstLetter(name))
		)) {
			craftableForPrefix[s] = (craftableForPrefix[s] || 0) + count;
		}
		md._props[i] = healing | bold << 1 | bossPart << 2 | craftable << 3;
		i++;
	}
	return {
		md: md,
		boldCount: boldCount,
		lis: lis,
		craftableForPrefix: craftableForPrefix,
		usableTypes: usableTypes,
		descriptions: descriptions,
		gpCosts: gpCosts,
		useLinks: md._useLinks
	};
};

/**
 * Split boss part into its components. Be sure to check that the item is a boss part first.
 *
 * @param {string} item
 * @returns {{type: string, bossAndLevel: string}} There will be no level if we haven't gathered the pairs.
 */
ui_inventory.splitBossPart = function(item) {
	var m = ui_inventory.bossPartRE.exec(item);
	return {type: m[1].toLowerCase(), bossAndLevel: item.slice(m[0].length)};
};

/**
 * @returns {!Array<string>}
 */
ui_inventory.getBingoSlots = function() {
	var regex = ui_improver.bingoItems.get();
	return regex ? regex.source.split('|') : [];
};

/**
 * @returns {number}
 */
ui_inventory.countBingoItems = function() {
	var regex = ui_improver.bingoItems.get(),
		bonus = 0,
		graph = [],
		inv = ui_inventory.model,
		slotsCount = 0,
		itemName = '',
		itemCount = 0,
		slots, filteredSlots;
	if (!regex) return 0;
	slots = regex.source.split('|');
	slotsCount = slots.length;
	for (var i = 0, len = inv.length; i < len; i++) {
		itemName = inv.getName(i).toLowerCase();
		if (itemName === '❄') {
			// snowflakes are always at the end of the list so they don't ban slots
			bonus += inv.getCount(i);
			continue;
		}
		if (!regex.test(itemName)) {
			continue; // fast path
		}
			filteredSlots = [];
			for (var j = 0; j < slotsCount; j++) {
				if (new RegExp(slots[j], 'i').test(itemName)) {
					filteredSlots.push(j);
				}
		}
		itemCount = Math.min(Math.max(0, inv.getCount(i)), slotsCount);
		while (itemCount-- > 0) {
			graph.push(filteredSlots);
		}
	}
	return Math.min(GUIp.common.findBipartiteMatching(graph, slotsCount) + bonus, slotsCount);
};

/**
 * @private
 * @param {?RegExp} regex
 * @param {number} constraints
 * @returns {number}
 */
ui_inventory._countLike = function(regex, constraints) {
	var result = 0,
		inv = ui_inventory.model,
		bingoRegex = ui_improver.bingoItems.get(),
		name = '',
		mask = 0x0;
	for (var i = 0, len = inv.length; i < len; i++) {
		name = inv.getName(i);
		if (regex && !regex.test(name)) continue;
		if (constraints) {
			mask = constraints & 0x3 ? inv.isHealing(i) + 1 : 0x0;
			if (constraints & 0xC) {
				mask += inv.isBold(i) ? 0x8 : 0x4;
			}
			if (constraints & 0x30) {
				mask += inv.isUsable(i) ? 0x20 : 0x10;
			}
			if (constraints & 0xC0) {
				mask += inv.isCraftable(i) ? 0x80 : 0x40;
			}
			if (constraints & 0x300) {
				mask += inv.isSellable(i) ? 0x200 : 0x100;
			}
			if (constraints & 0xC00) {
				mask += bingoRegex && bingoRegex.test(name) ? 0x800 : 0x400;
			}
			if (mask !== constraints) continue;
		}
		result += inv.getCount(i);
	}
	return result;
};

/**
 * Count how many items match the regex (case-insensitive) and satisfy the constraints.
 * `constraints` are a string composed of the following letters:
 *
 * + 'h' - Healing.
 * + 'H' - Non-healing.
 * + 'b' - Any bold.
 * + 'B' - Non-bold.
 * + 'a' - Any activatable.
 * + 'A' - Non-activatable.
 * + 'c' - Can be used for crafting.
 * + 'C' - Cannot be used for crafting.
 * + 's' - Sellable.
 * + 'S' - Unsellable.
 * + 'g' - Can be used in Bingo.
 * + 'G' - Cannot be used in Bingo.
 *
 * @param {string}  regex
 * @param {(string|number)} [constraints]
 * @returns {number}
 */
ui_inventory.countLike = function(regex, constraints) {
	var mask = 0x0,
		unrecognized = '';
	if (typeof constraints === 'string') {
		for (var i = 0, len = constraints.length; i < len; i++) {
			switch (constraints.charCodeAt(i)) {
				case 0x48: /*H*/ mask |= 0x1; break;
				case 0x68: /*h*/ mask |= 0x2; break;
				case 0x42: /*B*/ mask |= 0x4; break;
				case 0x62: /*b*/ mask |= 0x8; break;
				case 0x41: /*A*/ mask |= 0x10; break;
				case 0x61: /*a*/ mask |= 0x20; break;
				case 0x43: /*C*/ mask |= 0x40; break;
				case 0x63: /*c*/ mask |= 0x80; break;
				case 0x53: /*S*/ mask |= 0x100; break;
				case 0x73: /*s*/ mask |= 0x200; break;
				// codes above once were public API and must not be changed
				case 0x47: /*G*/ mask |= 0x400; break;
				case 0x67: /*g*/ mask |= 0x800; break;
				default: unrecognized += constraints[i];
			}
		}
		if (unrecognized) {
			throw new Error('unknown constraints in gv.inventoryCountLike: "' + unrecognized + '"');
		}
		constraints = mask;
	} else {
		constraints >>>= 0;
		if (constraints >= 0x400) {
			throw new Error('unknown constraints in gv.inventoryCountLike: ' + constraints);
		}
	}
	// sadly, the regex is recompiled each time this function is invoked
	return ui_inventory._countLike(regex !== '' ? new RegExp(regex, 'i') : null, constraints);
};
// ui_timers
var ui_timers = worker.GUIp.timers = {};

/**
 * @private
 * @type {!Array<string>}
 */
ui_timers._enabledTimers = [];

/**
 * Index into _enabledTimers. If the array is empty, _curTimer may have arbitrary non-negative value.
 *
 * @private
 * @type {number}
 */
ui_timers._curTimer = 0;

/**
 * @private
 * @type {?Array<!GUIp.common.activities.DiaryEntry>}
 */
ui_timers._fallbackThirdEye = null;

ui_timers.init = function() {
	var container, timer, i;
	if ((ui_stats.hasTemple() && !ui_data.isSail) || ui_data.isMining) {
		if (!(container = document.querySelector(ui_data.isMobile ? '.e_mt_diary, .e_mt_fight_log' : '#m_fight_log .block_h .l_slot, #diary .block_h .l_slot, #r_map .block_h .l_slot'))) {
			// seems that in come cases it may fail to find a place for timers immediately
			GUIp.common.setTimeout(ui_timers.init, 1e3);
			return;
		}
		ui_timers._setDisabledTimers(ui_storage.get('Option:disabledTimers') || '');
		ui_storage.addListener('Option:disabledTimers', function(newValue) {
			ui_timers._setDisabledTimers(newValue || '');
			ui_timers.redraw();
		});
		if (!ui_timers._fallbackThirdEye && !GUIp.common.activities.readThirdEyeFromLS(ui_data.god_name).length) {
			ui_timers._fallbackThirdEye = []; // enable fallback
			GUIp.common.setTimeout(ui_timers._requestThirdEyeUpdate, 200 + 300 * Math.random());
		}
		ui_storage.addListener('ThirdEye:Activities', function(newValue) {
			ui_improver.redrawLastFights(newValue || '[]');
			ui_timers._processActivitiesExternal();
		});
		ui_storage.addListener('ThirdEye:ActivityStatuses', ui_timers._processActivitiesExternal);
		if (ui_data.isMobile) {
			// using a special case for mining since currently the container there is completely overwritten on each turn
			if (ui_data.isMining && container.nextElementSibling) {
				container = container.nextElementSibling;
				container.classList.add('e_imp_timer_mining');
			}
			container.insertAdjacentHTML('beforeend', '<span id="imp_timer" class="fr_new_badge"></span>');
		} else {
			container.insertAdjacentHTML('beforeend', '<div id="imp_timer" class="fr_new_badge"></div>');
		}
		
		timer = container.lastChild;
		if (ui_data.isDungeon || ui_data.isBoss && ui_words.base.std_dungeon_bosses.includes(ui_stats.Enemy_Bossname()) || ui_storage.get('Logger:Location') === 'Dungeon') {
			if ((i = ui_timers._enabledTimers.indexOf(ui_data.availableGameModes.includes('souls') ? 'souls' : 'dungeon')) >= 0) { // by default show souls timer in dungeons when soul gathering is available
				ui_timers._curTimer = i;
			}
		} else if (ui_data.isMining && (i = ui_timers._enabledTimers.indexOf('mining')) >= 0) {
			ui_timers._curTimer = i;
		}
		GUIp.common.addListener(timer, 'click', ui_timers._toggleTimers);
		GUIp.common.tooltips.watchSubtree(timer);
	}
	ui_timers.redraw();
	GUIp.common.setInterval(ui_timers.redraw, 60e3);
};

/**
 * @private
 * @param {string} disabled - A comma-separated list of timers.
 */
ui_timers._setDisabledTimers = function(disabled) {
	var enabled = [], i, timer;
	if (!disabled.includes('conversion')) {
		enabled[0] = 'conversion';
	}
	if (!disabled.includes('dungeon')) {
		enabled.push('dungeon');
	}
	if (!disabled.includes('souls') && ui_data.availableGameModes.includes('souls')) {
		enabled.push('souls');
	}
	if (!disabled.includes('mining') && ui_data.availableGameModes.includes('mining')) {
		enabled.push('mining');
	}
	if ((i = enabled.indexOf(ui_timers._enabledTimers[ui_timers._curTimer])) >= 0) {
		ui_timers._curTimer = i;
	} else if (enabled.length) {
		ui_timers._curTimer %= enabled.length;
	}
	ui_timers._enabledTimers = enabled;
	if ((timer = document.getElementById('imp_timer'))) {
		ui_utils.hideElem(timer, !enabled.length);
		timer.style.cursor = enabled.length === 1 ? 'default' : '';
	}
};

/**
 * @private
 * @returns {!Array<!GUIp.common.activities.DiaryEntry>}
 */
ui_timers._readThirdEyeFromHTML = function() {
	var lines = document.querySelectorAll('.tep .d_line'),
		result = [],
		now = Date.now(),
		offset = 0,
		entry, elements, element, m;
	for (var i = 0, len = lines.length; i < len; i++) {
		entry = {date: 0, type: 'regular', msg: '', logID: ''};
		elements = lines[i].querySelectorAll('div, span a');
		for (var j = 0, jlen = elements.length; j < jlen; j++) {
			element = elements[j];
			if (element.classList.contains('diary_cs_t')) {
				switch (element.textContent) {
					case 'Сегодня':
					case 'Today':
						offset = 0;
						break;
					case 'Вчера':
					case 'Yesterday':
						offset = 86400e3;
						break;
					case 'Позавчера':
					// case '2 days ago':
						offset = 172800e3;
						break;
					default:
						offset = parseInt(element.textContent) * 86400e3 || 0;
						break;
				}
			} else if (element.classList.contains('d_time')) {
				if ((m = /(\d+):(\d+)\s*([AP]M)?/i.exec(element.textContent))) {
					entry.date = GUIp.common.setTime(new Date(now - offset), +m[1], +m[2], (m[3] || '').toUpperCase());
				}
			} else if (element.classList.contains('d_msg')) {
				if (element.classList.contains('m_infl')) {
					entry.type = 'influence';
				}
				entry.msg = element.textContent;
			} else if (element.classList.contains('div_link')) {
				entry.logID = element.href.slice(element.href.lastIndexOf('/') + 1);
			}
		}
		if (entry.date && entry.msg) {
			result.push(entry);
		}
	}
	return result.sort(ui_utils.byDate);
};

/**
 * @private
 * @returns {!Array<!GUIp.common.activities.DiaryEntry>}
 */
ui_timers._readThirdEye = function() {
	return ui_timers._fallbackThirdEye || GUIp.common.activities.readThirdEyeFromLS(ui_data.god_name);
};

/**
 * @private
 * @param {!Array<number>} gaps
 * @param {number} threshold
 */
ui_timers._dropOldGaps = function(gaps, threshold) {
	var n = gaps.length;
	while (n > 1 && gaps[1] <= threshold) {
		gaps.shift();
		gaps.shift();
		n -= 2;
	}
	if (n && threshold > gaps[0]) {
		gaps[0] = threshold;
	}
};

/**
 * @private
 * @param {!Array<!GUIp.common.activities.DiaryEntry>} te
 * @returns {{gaps: !Array<number>, latest: number}}
 */
ui_timers._updateGaps = function(te) {
	var gaps = GUIp.common.parseJSON(ui_storage.get('ThirdEye:Gaps')) || [],
		threshold = Date.now() - GUIp.common.activities.storageTime,
		latest = +ui_storage.get('ThirdEye:Latest') || threshold;
	if (te.length) {
		if (latest < te[0].date) {
			gaps.push(latest, te[0].date);
		}
		ui_storage.set('ThirdEye:Latest', te[te.length - 1].date);
	}
	ui_timers._dropOldGaps(gaps, threshold);
	ui_storage.set('ThirdEye:Gaps', '[' + gaps + ']');
	return {gaps: gaps, latest: latest};
};

/**
 * @private
 * @returns {!Array<!GUIp.common.activities.Activity>}
 */
ui_timers._loadActivities = function() {
	return GUIp.common.activities.load(ui_storage);
};

/**
 * @private
 * @param {!Array<!GUIp.common.activities.Activity>} activities
 */
ui_timers._saveActivities = function(activities) {
	GUIp.common.activities.save(ui_storage, activities);
};

/**
 * @private
 * @returns {!Object<string, !GUIp.common.activities.ActivityStatus>}
 */
ui_timers._loadActivityStatuses = function() {
	return GUIp.common.activities.loadStatuses(ui_storage);
};

/**
 * @private
 * @param {!Object<string, !GUIp.common.activities.ActivityStatus>} statuses
 */
ui_timers._saveActivityStatuses = function(statuses) {
	GUIp.common.activities.saveStatuses(ui_storage, statuses);
};

/**
 * Points in the future when a timer is expired.
 *
 * @private
 * @type {!Object<string, {optimistic: ?Float64Array, pessimistic: number}>}
 */
ui_timers._guaranteeCache = {
	spar:       {optimistic: null, pessimistic: Infinity},
	dungeon:    {optimistic: null, pessimistic: Infinity},
	mining:     {optimistic: null, pessimistic: Infinity},
	conversion: {optimistic: null, pessimistic: Infinity},
	souls:      {optimistic: null, pessimistic: Infinity}
};

ui_timers._invalidateGuarantee = function() {
	var g = ui_timers._guaranteeCache;
	g.spar.optimistic = g.dungeon.optimistic = g.mining.optimistic = g.conversion.optimistic = g.souls.optimistic = null;
	g.spar.pessimistic = g.dungeon.pessimistic = g.mining.pessimistic = g.conversion.pessimistic = g.souls.pessimistic = Infinity;
};

/**
 * @private
 * @const
 * @type {!Object<string, function(string): number>}
 */
ui_timers._diaryParsers = {
	spar: function(msg) {
		if (!/^(?:Выдержка из хроники тренировочного боя|Notes from the sparring fight):/i.test(msg)) {
			return -1;
		}
		// known bug: under extremely rare circumstances, ui_data.char_name can be empty (see ui_stats.charName for more
		// information). in such case, we might incorrectly assign results to sparring fights visible in the Third Eye.
		var pos = msg.search(/ получает порцию опыта| gets experience points for today/i);
		return +(pos >= 0 && msg.endsWith(ui_data.char_name, pos));
	},
	dungeon: function(msg) {
		if (!/^(?:Выдержка из хроники подземелья|Notes from the dungeon):/i.test(msg)) {
			return -1;
		}
		return (msg.match(/бревно для ковчега|ещё одно бревно|log for the ark/gi) || []).length;
	},
	mining: function(msg) {
		if (!/^(?:Заметки с полигона|Notes from the datamine):/i.test(msg)) {
			return -1;
		}
		return /два слога|two glyphs/i.test(msg) ? 2 : /три слога|three glyphs/i.test(msg) ? 3 : +/ слог[^а-яё]| glyph\b/i.test(msg);
	},
	conversion: function(msg) {
		return /^(?:(?:Asking for.+?|I )?Placed.+?bags of gold.+?altar.+?experience)/i.test(msg) || (
			/(?:десят|двадцат|тридцат).+(?:мешочк...? (?:с )?(?:золот|кругл...? сумм.+алтар|по карманам.+храмовых)|золоты..? (?:мешочк|столбик)|толстых кошельков|тысяч монет)|алтар.+тридцать мешочков/i.test(msg) &&
			/ опыт|мощне|мудре|героичне/i.test(msg)
		) ? 1 : -1;
	},
	souls: function(msg) {
		if (!/^(?:Выдержка из хроники подземелья|Notes from the dungeon):/i.test(msg)) {
			return -1;
		}
		return GUIp.common.parseGatheredSoul(msg);
	}
};

/**
 * @private
 * @param {string} msg
 * @param {?{type: string, value: number}} [result]
 * @returns {{type: string, value: number}}
 */
ui_timers._parseDiaryMsg = function(msg, result) {
	var type = '',
		value = -1;
	for (var i = 0, len = GUIp.common.activities.guaranteeArr.length; i < len; i++) {
		type = GUIp.common.activities.guaranteeArr[i].type;
		value = ui_timers._diaryParsers[type](msg);
		if (value >= 0) {
			if (!result) return {type: type, value: value};
			result.type = type;
			result.value = value;
			return result;
		}
	}
	if (!result) return {type: '', value: -1};
	result.type = '';
	result.value = -1;
	return result;
};

/**
 * @private
 * @param {!Array<!GUIp.common.activities.DiaryEntry>} te
 * @param {number} latest
 * @returns {{activities: ?Array<!GUIp.common.activities.Activity>, statuses: ?Array<!GUIp.common.activities.ActivityStatus>}}
 */
ui_timers._updateThirdEye = function(te, latest) {
	var len = te.length;
	if (len >= 2 && te[len - 1].date === latest && te[len - 2].date < latest) {
		return {activities: null, statuses: null}; // avoid parsing the Third Eye and loading activities when possible
	}
	var activities = null,
		dict = null,
		statuses = null,
		changed = false,
		parsed = null,
		type = '',
		value = -1,
		entry, act;
	var processEntry = function() {
		if (!activities) {
			activities = ui_timers._loadActivities();
			dict = GUIp.common.activities.createActivitiesDict(activities);
			statuses = ui_timers._loadActivityStatuses();
		}
		GUIp.common.activities.updateStatus(statuses[type], true, entry.date);
		if ((act = dict[type+(entry.logID || entry.date)])) {
			if (value === act.result && entry.date === act.date) {
				return; // no changes
			}
			act.result = value;
			// if we discovered that activity from its log page, it might have wrong date (off by a minute)
			act.date = entry.date;
		} else {
			activities.push({type: type, date: entry.date, result: value, logID: entry.logID});
		}
		changed = true;
	}
	for (var i = len - 1; i >= 0; i--) {
		entry = te[i];
		if (entry.date < latest) { // strictly less than
			break;
		}
		if (entry.type !== 'regular') continue;
		parsed = ui_timers._parseDiaryMsg(entry.msg, parsed);
		if ((type = parsed.type)) {
			value = parsed.value;
			processEntry();
			// a quick hack to replicate a confirmed dungeon entry to souls parser (as they're the same by nature)
			if (type === 'dungeon' && ui_data.availableGameModes.includes('souls')) {
				type = 'souls';
				value = ui_timers._diaryParsers[type](entry.msg);
				if (value > 0) {
					GUIp.common.updateGatheredSouls(ui_storage, entry.date, 1, value);
					value = 1;
				}
				processEntry();
			}
		} else if (ui_data.availableGameModes.includes('souls') && (value = GUIp.common.parseGatheredSoul(entry.msg))) {
			// we may also want to know about collected souls regardless of dungeons
			GUIp.common.updateGatheredSouls(ui_storage, entry.date, 0, value);
		}
	}
	if (statuses) {
		ui_timers._invalidateGuarantee();
		if (changed) {
			ui_timers._saveActivities(activities.sort(ui_utils.byDate));
		}
		ui_timers._saveActivityStatuses(statuses);
	}
	return {activities: activities, statuses: statuses};
};

/**
 * @private
 * @returns {{te: !Array<!GUIp.common.activities.DiaryEntry>, gaps: !Array<number>, activities: ?Array<!GUIp.common.activities.Activity>, statuses: ?Array<!GUIp.common.activities.ActivityStatus>}}
 */
ui_timers._readAndUpdateThirdEye = function() {
	var te = ui_timers._readThirdEye(),
		tmp = ui_timers._updateGaps(te),
		tmp1 = ui_timers._updateThirdEye(te, tmp.latest);
	return {
		te: te,
		gaps: tmp.gaps,
		activities: tmp1.activities,
		statuses: tmp1.statuses
	};
};

ui_timers._requestThirdEyeUpdate = function() {
	var button = document.getElementById('imp_button'),
		container = document.getElementById('imp_e_popover_c');
	if (!button || !container) return;
	var unreadCnt = button.classList.contains('fr_new_badge') ? button.textContent : '';
	try {
		$(button).trigger($.Event('click', {originalEvent: {}}));
		container.parentNode.parentNode.style.display = 'none';
	} catch (e) { GUIp.common.error(e); };
	GUIp.common.setTimeout(function() {
		$(button).trigger($.Event('click', {originalEvent: {}}));
		if (unreadCnt) {
			button.textContent = unreadCnt;
			button.classList.add('fr_new_badge');
		}
	}, 300);
};

ui_timers.updateThirdEyeFromHTML = function() {
	if (ui_timers._fallbackThirdEye) {
		ui_timers._fallbackThirdEye = ui_timers._readThirdEyeFromHTML();
		ui_timers._readAndUpdateThirdEye();
	}
};

/**
 * @private
 * @param {!Array<!GUIp.common.activities.Activity>} activities
 * @returns {!Object<string, {successfulDates: !Float64Array, indeterminateDate: number}>}
 */
ui_timers._getGuaranteeSummary = function(activities) {
	var summary = {
		spar:       {successfulDates: new Float64Array(GUIp.common.activities.guarantee.spar.number),       indeterminateDate: 0},
		dungeon:    {successfulDates: new Float64Array(GUIp.common.activities.guarantee.dungeon.number),    indeterminateDate: 0},
		mining:     {successfulDates: new Float64Array(GUIp.common.activities.guarantee.mining.number),     indeterminateDate: 0},
		conversion: {successfulDates: new Float64Array(GUIp.common.activities.guarantee.conversion.number), indeterminateDate: 0},
		souls:      {successfulDates: new Float64Array(GUIp.common.activities.guarantee.souls.number),      indeterminateDate: 0, isUncertain: false}
	};
	var indices = {
		spar:       GUIp.common.activities.guarantee.spar.number,
		dungeon:    GUIp.common.activities.guarantee.dungeon.number,
		mining:     GUIp.common.activities.guarantee.mining.number,
		conversion: GUIp.common.activities.guarantee.conversion.number,
		souls:      GUIp.common.activities.guarantee.souls.number
	};
	var now = Date.now(),
		threshold = now - GUIp.common.activities.maxTimeout,
		i, j, act, s, result;
	for (i = activities.length - 1; i >= 0; i--) {
		act = activities[i];
		if (act.date < threshold) {
			break;
		} else if (act.date < now - GUIp.common.activities.guarantee[act.type].timeout || !(j = indices[act.type])) {
			continue; // too old or the guarantee is filled up
		}
		s = summary[act.type];
		result = act.result;
		// for soul entries (s.isUncertain defined for them only) that were got from the treasury (with logID set)
		// check whether there's corresponding activity entry for tb souls (only they have inID set)
		if (s.isUncertain === false && act.logID) {
			s.isUncertain = !activities.some(function(entry) { return entry.inID === act.logID; }); // if there isn't, mark the whole souls summary as uncertain
		}
		if (result > 0) {
			do {
				s.successfulDates[--j] = act.date;
			} while (j && --result);
			indices[act.type] = j;
		} else if (result && !s.indeterminateDate) {
			s.indeterminateDate = act.date;
		}
	}
	return summary;
};

/**
 * @private
 * @param {!Array<number>} gaps
 * @param {?Array<!GUIp.common.activities.Activity>} activities
 * @param {?Array<!GUIp.common.activities.ActivityStatus>} statuses
 * @returns {!Object<string, {optimistic: !Float64Array, pessimistic: number}>}
 */
ui_timers._calcGuarantee = function(gaps, activities, statuses) {
	var g = ui_timers._guaranteeCache;
	if (g.spar.optimistic) return g;
	if (!activities) {
		activities = ui_timers._loadActivities();
	}
	var summary = ui_timers._getGuaranteeSummary(activities),
		latestGap = gaps.length ? gaps[gaps.length - 1] : 0,
		data, s, gg;
	if (!statuses) {
		statuses = ui_timers._loadActivityStatuses();
	}
	for (var i = 0, len = GUIp.common.activities.guaranteeArr.length; i < len; i++) {
		data = GUIp.common.activities.guaranteeArr[i];
		s = summary[data.type];
		for (var j = 0; j < data.number; j++) {
			s.successfulDates[j] += data.timeout;
		}
		gg = g[data.type];
		gg.optimistic = s.successfulDates;
		gg.pessimistic = statuses[data.type].reliable && (s.isUncertain !== true) ? Math.max(s.indeterminateDate, latestGap) + data.timeout : Infinity; // s.isUncertain can be set to `false` for souls only
	}
	return g;
};

/**
 * @returns {!Object<string, {optimistic: !Float64Array, pessimistic: number}>}
 */
ui_timers.getGuaranteeInfo = function() {
	return ui_timers._guaranteeCache.spar.optimistic ? (
		ui_timers._guaranteeCache
	) : ui_timers._calcGuarantee(GUIp.common.parseJSON(ui_storage.get('ThirdEye:Gaps')) || [], null, null);
};

/**
 * @private
 * @param {number} time
 * @returns {string}
 */
ui_timers._formatRemaining = function(time) {
	return GUIp.common.formatTime(Math.ceil(time / 60e3 - 1e-6), 'remaining');
};

/**
 * @private
 * @param {number} timeElapsed
 * @returns {string}
 */
ui_timers._calculateExp = function(timeElapsed) {
	var baseExp = Math.min(timeElapsed / 64800e3, 2), // 18h
		levelMultiplier = (ui_storage.getFlag('Logger:Equip3_IsBold') ? 1.25 : 1) / (
			Math.floor(Math.max(+ui_storage.get('Logger:Level') || 0, 75) * 0.04 + 1e-6) - 2
		),
		lines = ['', '', ''];
	for (var i = 1; i <= 3; i++) {
		// amount multipliers are [1, 2, 2.5] for Russian Godville and [1, 2, 3] for English
		lines[i - 1] = i + '0k gld → ' +
			((i + baseExp * (i !== 3 || GUIp_locale === 'en' ? i : 2.5)) * levelMultiplier).toFixed(1) + '% exp';
	}
	return lines.join('\n');
};

/**
 * @private
 * @typedef {Object} GUIp.timers._Design
 * @property {number} midTimeout - Time till (the first) guarantee, under which the timer turns yellow.
 * @property {number} timerPhases - Number of guaranteed resources that should have timers.
 * @property {string} guaranteedLabel - Text to be displayed when enough resources are guaranteed.
 * @property {function(string): string} decorateTime - Transformer for the time string.
 * @property {function(!Float64Array): string} getTitle
 * @property {function(!Float64Array, number): string} getTitleUnsure
 * @property {function(!Float64Array): string} getTitleUnreliable
 */

/**
 * @private
 * @const
 * @type {!Object<string, !GUIp.timers._Design>}
 */
ui_timers._design = {
	dungeon: {
		midTimeout: 1800e3, // 30m
		timerPhases: 1,
		guaranteedLabel: '木',
		decorateTime: function(time) { return '¦' + time + '¦'; },
		getTitle: function(remaining) {
			return remaining[0] ? GUIp_i18n.log_isnt_guaranteed : GUIp_i18n.log_is_guaranteed;
		},
		getTitleUnsure: function(remainingOpt, remainingPess) {
			return GUIp_i18n.fmt(remainingOpt[0] ? 'log_isnt_guaranteed_old_time' : 'log_old_time', ui_timers._formatRemaining(remainingPess));
		},
		getTitleUnreliable: function(remaining) {
			return remaining[0] ? GUIp_i18n.log_isnt_guaranteed_requires_te : GUIp_i18n.log_requires_te;
		}
	},
	mining: {
		midTimeout: 780e3, // 13m
		timerPhases: 2,
		guaranteedLabel: '字',
		decorateTime: function(time) { return '⁞' + time + '⁞'; },
		getTitle: function(remaining) {
			return remaining[0] ? (
				GUIp_i18n.fmt('byte_isnt_guaranteed', ui_timers._formatRemaining(remaining[1]))
			) : remaining[1] ? (
				GUIp_i18n.byte_is_guaranteed
			) : remaining[2] ? (
				GUIp_i18n.two_bytes_are_guaranteed
			) : (
				GUIp_i18n.three_bytes_are_guaranteed
			);
		},
		getTitleUnsure: function(remainingOpt, remainingPess) {
			return remainingOpt[0] ? GUIp_i18n.fmt('byte_isnt_guaranteed_old_time',
				ui_timers._formatRemaining(remainingPess),
				ui_timers._formatRemaining(remainingOpt[1])
			) : GUIp_i18n.fmt('bytes_old_time', ui_timers._formatRemaining(remainingPess), this.getTitle(remainingOpt));
		},
		getTitleUnreliable: function(remaining) {
			return remaining[0] ? GUIp_i18n.byte_isnt_guaranteed_requires_te : GUIp_i18n.byte_requires_te;
		}
	},
	conversion: {
		midTimeout: 64800e3, // 18h
		timerPhases: 1,
		guaranteedLabel: '✓',
		decorateTime: function(time) { return time; },
		getTitle: function(remaining) {
			return ui_timers._calculateExp(GUIp.common.activities.guarantee.conversion.timeout - remaining[0]);
		},
		getTitleUnsure: function(remainingOpt, remainingPess) {
			return GUIp_i18n.fmt('gte_old_penalty',
				ui_timers._calculateExp(GUIp.common.activities.guarantee.conversion.timeout - remainingOpt[0]),
				ui_timers._formatRemaining(remainingPess)
			);
		},
		getTitleUnreliable: function(remaining) {
			return GUIp_i18n.fmt('gte_requires_te',
				ui_timers._calculateExp(GUIp.common.activities.guarantee.conversion.timeout - remaining[0])
			);
		}
	},
	souls: {
		midTimeout: 900e3, // 15m
		timerPhases: 2,
		guaranteedLabel: '☥',
		decorateTime: function(time) { return '˟' + time + '˟'; },
		getTitle: function(remaining) {
			return remaining[0] ? (
				GUIp_i18n.fmt('soul_isnt_guaranteed', ui_timers._formatRemaining(remaining[1]))
			) : remaining[1] ? (
				GUIp_i18n.soul_is_guaranteed
			) : remaining[2] ? (
				GUIp_i18n.two_souls_are_guaranteed
			) : (
				GUIp_i18n.three_souls_are_guaranteed
			);
		},
		getTitleUnsure: function(remaining) {
			return GUIp_i18n.fmt('souls_uncertain', ui_utils.decapitalizeFirstLetter(this.getTitle(remaining)));
		},
		getTitleUnreliable: function(remaining) {
			return this.getTitleUnsure(remaining);
		}
	},
};

ui_timers.redraw = function() {
	var timer = document.getElementById('imp_timer'),
		tmp = ui_timers._readAndUpdateThirdEye(); // evaluated unconditionally for custom informers' variables to work
	if (!timer || !ui_timers._enabledTimers.length) return;
	var type = ui_timers._enabledTimers[ui_timers._curTimer],
		g = ui_timers._calcGuarantee(tmp.gaps, tmp.activities, tmp.statuses)[type],
		now = +ui_utils.getPreciseTime(0, true),
		remainingOpt = g.optimistic.map(function(opt) { return Math.max(opt - now, 0); }),
		remainingPess = Math.max(g.pessimistic - now, 0),
		design = ui_timers._design[type],
		fontSize = '';
	timer.className = timer.className.replace(/\b(?:blue|green|yellow|red|grey|darkgray)\b/g, '');
	timer.title = '';

	if (type === 'conversion' && ui_improver.dailyForecast.get().includes('noconversion')) {
		timer.textContent = '\u2716'; // large cross
		timer.classList.add('darkgray');
		fontSize = 'unset';
		timer.title = GUIp_i18n.gte_noconversion + '\n';
	} else if (remainingOpt[0]) {
		timer.textContent = design.decorateTime(ui_timers._formatRemaining(remainingOpt[0]));
		timer.classList.add(remainingOpt[0] <= design.midTimeout ? 'yellow' : 'red');
	} else if (remainingPess === Infinity) {
		timer.textContent = '?';
		timer.classList.add('darkgray');
	} else if (design.timerPhases >= 2 && remainingOpt[1]) {
		timer.textContent = design.decorateTime(ui_timers._formatRemaining(remainingOpt[1]));
		timer.classList.add(remainingPess ? 'grey' : 'green');
	} else {
		timer.textContent = design.guaranteedLabel;
		timer.classList.add(remainingPess ? 'grey' : design.timerPhases === 1 ? 'green' : 'blue');
		fontSize = 'unset';
	}
	timer.style.fontSize = fontSize;

	timer.title += remainingPess === Infinity ? (
		design.getTitleUnreliable(remainingOpt)
	) : remainingPess > remainingOpt[0] ? (
		design.getTitleUnsure(remainingOpt, remainingPess)
	) : (
		design.getTitle(remainingOpt)
	);
};

/**
 * @private
 * @param {!Event} ev
 */
ui_timers._toggleTimers = function(ev) {
	ev.stopPropagation();
	if (ui_timers._enabledTimers.length <= 1) return;
	ui_timers._curTimer = (ui_timers._curTimer + 1) % ui_timers._enabledTimers.length;
	var timer = $('#imp_timer');
	timer.fadeOut(500, GUIp.common.try2.bind(null, function() {
		ui_timers.redraw();
		timer.fadeIn(500);
	}));
};

/**
 * @param {!Array<!GUIp.common.activities.DiaryEntry>} diary
 */
ui_timers.updateDiary = function(diary) {
	var activities = null,
		dict = null,
		statuses = null,
		changed = false,
		changedStatuses = false,
		type = '',
		value = -1,
		nextParsed = {type: '', value: -1},
		multiple = false,
		entry, nextEntry;
	var processEntry = function() {
		var tmp, act;
		if (!activities) {
			tmp = ui_timers._readAndUpdateThirdEye();
			activities = tmp.activities || ui_timers._loadActivities();
			dict = GUIp.common.activities.createActivitiesDict(activities);
			statuses = tmp.statuses;
		}
		if ((act = dict[type+(entry.logID || entry.date)])) {
			if (value === act.result && entry.date === act.date) {
				return; // no changes
			}
			act.result = value;
			// if we discovered that activity from its log page, it might have wrong date (off by a minute)
			act.date = entry.date;
		} else {
			activities.push({type: type, date: entry.date, result: value, logID: entry.logID});
			// we should have seen this in the Third Eye, but we haven't. seems that this type of activities
			// is disabled in the Third Eye's settings
			if (!statuses) {
				statuses = ui_timers._loadActivityStatuses();
			}
			GUIp.common.activities.updateStatus(statuses[type], false, entry.date);
			changedStatuses = true;
		}
		changed = true;
	};


	for (var i = 0, len = diary.length; i < len; i++) {
		nextEntry = diary[i];
		if (nextEntry.type === 'regular') {
			nextParsed = ui_timers._parseDiaryMsg(nextEntry.msg, nextParsed);
		} else {
			nextParsed.type = '';
			nextParsed.value = -1;
		}
		multiple = type === nextParsed.type;
		if (type && (type === 'conversion' || (!multiple && entry.logID))) {
			// there should be 2 diary entries in a row for 'spar', 'dungeon', or 'mining': both match our regexes, but
			// the earlier indicates the start of an activity and the later does the end. we should ignore the former.
			// and if an entry does not have an associated link, we certainly should ignore it.
			processEntry();
			// a quick hack to replicate a confirmed dungeon entry to souls parser (as they're the same by nature)
			if (type === 'dungeon' && ui_data.availableGameModes.includes('souls')) {
				type = 'souls';
				value = ui_timers._diaryParsers[type](entry.msg);
				if (value > 0) {
					GUIp.common.updateGatheredSouls(ui_storage, entry.date, 1, value);
					value = 1;
				}
				processEntry();
			}
		}
		entry = nextEntry;
		type = nextParsed.type;
		value = nextParsed.value;
	}
	if (type && (type === 'conversion' || (multiple && entry.logID))) {
		// if the latest entry in the diary is unpaired, then it indicates the start of an activity that is just
		// about to begin. so we ignore it as well.
		processEntry();
	}

	if (changed) {
		ui_timers._invalidateGuarantee();
		ui_timers._saveActivities(activities.sort(ui_utils.byDate));
		if (changedStatuses) {
			ui_timers._saveActivityStatuses(statuses);
		}
		// we intentionally do not call redraw() here so that old conversion timer's values can be observed for a while
	}
};

/**
 * @param {!Array<!GUIp.common.activities.LastFightsEntry>} fights
 * @returns {!Array<!GUIp.common.activities.Activity>}
 */
ui_timers.updateLastFights = function(fights) {
	var tmp = ui_timers._readAndUpdateThirdEye(),
		activities = tmp.activities || ui_timers._loadActivities();
	if (GUIp.common.activities.updateLastFights(
		ui_storage, tmp.te, tmp.gaps, activities, tmp.statuses || ui_timers._loadActivityStatuses(), fights
	)) {
		ui_timers._invalidateGuarantee();
	}
	if (ui_timers._enabledTimers.length && ui_timers._enabledTimers[ui_timers._curTimer] !== 'conversion') {
		ui_timers.redraw();
	}
	return activities;
};

ui_timers.updateDungeonSouls = function(act) {
	if (!act.inID) {
		return;
	}
	var changed = true,
		activities = ui_timers._loadActivities(),
		existing = activities.find(function(existing) { return (existing.inID === act.inID); }); // we're only interested in souls from the tb having the inID field
	if (!existing) {
		activities.push(act);
	} else if (existing.result !== act.result || existing.date !== act.date) {
		// update date only when results have changed or date is later than the previous one
		if (existing.date < act.date || existing.result !== act.result) {
			existing.date = act.date;
		}
		// new result is always preferred regardless
		existing.result = act.result;
	} else {
		changed = false;
	}
	if (changed) {
		ui_timers._saveActivities(activities.sort(ui_utils.byDate));
		ui_timers._invalidateGuarantee();
		if (ui_timers._enabledTimers.length && ui_timers._enabledTimers[ui_timers._curTimer] === 'souls') {
			ui_timers.redraw();
		}
	}
};

ui_timers._processActivitiesExternal = function() {
	ui_timers._invalidateGuarantee();
	if (ui_timers._enabledTimers.length && ui_timers._enabledTimers[ui_timers._curTimer] !== 'conversion') {
		ui_timers.redraw();
	}
};
// ui_observers
var ui_observers = worker.GUIp.observers = {};

ui_observers.init = function() {
	var objs = Object.values(ui_observers),
		obj;
	for (var i = 0, len = objs.length; i < len; i++) {
		if ((obj = objs[i]).condition) {
			ui_observers.start(obj);
		}
	}
};
ui_observers.start = function(obj) {
	var observer = GUIp.common.newMutationObserver(obj.func),
		target;
	for (var i = 0, len = obj.target.length; i < len; i++) {
		if ((target = document.querySelector(obj.target[i]))) {
			observer.observe(target, obj.config);
		}
	}
};
ui_observers.mutationChecker = function(mutations, check, callback) {
	if (!mutations.some(check)) {
		return false;
	}
	callback();
	return true;
};
ui_observers.chats = {
	condition: true,
	config: {childList: true},
	func: function(mutations) {
		for (var i = 0, len = mutations.length; i < len; i++) {
			var mutation = mutations[i];
			for (var j = 0, jlen = mutation.addedNodes.length; j < jlen; j++) {
				var newNode = mutation.addedNodes[j];
				if (newNode.classList.contains('e_moved')) {
					continue;
				}
				newNode.classList.add('e_moved');
				mutation.target.appendChild(newNode); // move chat window to the left
				if (newNode.querySelector('.gc_topic')) {
					newNode.classList.add('e_guild_council'); // this is a guild chat
				}
				var msgArea = newNode.querySelector('.frMsgArea');
				if (msgArea) {
					msgArea.scrollTop = msgArea.scrollTopMax || msgArea.scrollHeight;
				}
				ui_improver.processNewChat(newNode);
			}
		}
		ui_observers.mutationChecker(mutations, function(mutation) {
			return mutation.addedNodes.length || mutation.removedNodes.length;
		}, function() {
			ui_improver.chatsFix();
			ui_informer.clearTitle();
		});
	},
	target: ['.chat_ph']
};
ui_observers.chatsMobile = {
	get condition() {
		return ui_data.isMobile;
	},
	config: {childList: true},
	func: function(mutations) {
		for (var i = 0, len = mutations.length; i < len; i++) {
			var mutation = mutations[i];
			if (mutation.addedNodes.length && mutation.addedNodes[0].classList.contains('mpage') && mutation.addedNodes[0].id !== 'tabbar') {
				// work with newly opened chat
				ui_improver._openedChatContents = mutation.addedNodes[0].querySelector('.msgDock');
				if (mutation.addedNodes[0].querySelector('.gc_topic') && ui_improver._openedChatContents) {
					ui_improver._openedChatContents.classList.add('e_guild_council'); // this is a guild chat
				}
				ui_improver.processNewChat(mutation.addedNodes[0]);
				ui_improver.improveChat();
			}
			if (mutation.removedNodes.length && mutation.removedNodes[0].classList.contains('mpage') && mutation.removedNodes[0].id !== 'tabbar') {
				// save typed text in a chat when it closes
				ui_utils.saveMobileUnsentMessage(mutation.removedNodes[0]);
				ui_improver._openedChatContents = null;
				// vanilla code uses history.back() or something, which restores the previous document title (in tab header) to text it had when we just opened the chat;
				// after that we appear to have document.title in HTML and actual title in browser header having DIFFERENT texts.
				// what's even worse: changing document.title to same value it already has in HTML does just nothing (at least in vivaldi 5)
				// so, to have browser redraw the visible title we need to change it to *something different* and then back to proper value that we want to have
				GUIp.common.setTimeout(function() { 
					var tmp = ui_data.docTitle;
					document.title = '_'; // this automagically changes ui_data.docTitle to new value too, so we need to restore it manually
					ui_data.docTitle = tmp;
					ui_informer.clearTitle(); // set proper prefixes
				}, 50);
			}
		}
	},
	target: ['#hero_block']
};
ui_observers.clearTitle = {
	condition: true,
	get config() {
		return ui_data.isMobile ? {
			childList: true,
			subtree: true
		} : {
			childList: true,
			attributes: true,
			subtree: true,
			attributeFilter: ['style']
		};
	},
	func: function(mutations) {
		if (ui_data.isMobile) {
			ui_observers.mutationChecker(mutations, function(mutation) {
				return mutation.target.classList && mutation.target.classList.contains('frmsg_i') || mutation.addedNodes.length && mutation.addedNodes[0].classList && mutation.addedNodes[0].classList.contains('fr_new_msg');
			}, function() { GUIp.common.setTimeout(ui_utils.pmNotification.bind(ui_utils), 100); });
			ui_observers.mutationChecker(mutations, function(mutation) {
				return mutation.target.classList && mutation.target.classList.contains('show_gc') ||
					  (mutation.target.className.includes('frline') && (mutation.removedNodes.length && mutation.removedNodes[0].className.includes('fr_new_msg') || mutation.addedNodes.length && mutation.addedNodes[0].className.includes('fr_new_msg')));
			}, ui_informer.clearTitle.bind(ui_informer));
			return;
		}
		var isFocused = document.hasFocus && document.hasFocus();
		ui_observers.mutationChecker(mutations, function(mutation) {
			return isFocused && mutation.addedNodes.length && mutation.addedNodes[0].classList && mutation.addedNodes[0].classList.contains('fr_new_msg')
		}, function() { GUIp.common.setTimeout(ui_improver.checkGCMark.bind(ui_improver,'observe'), 50); });
		ui_observers.mutationChecker(mutations, function(mutation) {
			return mutation.target.classList && (mutation.target.classList.contains('fr_new_badge_pos') || mutation.target.classList.contains('frmsg_i'));
		}, function() { GUIp.common.setTimeout(ui_utils.pmNotification.bind(ui_utils), 100); });
		ui_observers.mutationChecker(mutations, function(mutation) {
			return mutation.target.className.match(/fr_new_(?:msg|badge)/) ||
				  (mutation.target.className.includes('dockfrname_w') && (mutation.removedNodes.length && mutation.removedNodes[0].className.includes('fr_new_msg') || mutation.addedNodes.length && mutation.addedNodes[0].className.includes('fr_new_msg')));
		}, ui_informer.clearTitle.bind(ui_informer));
	},
	target: ['.msgDockWrapper, .e_m_friends']
};
ui_observers.voiceform = {
	condition: true,
	config: {
		attributes: true,
		attributeFilter: ['style']
	},
	func: function(mutations) {
		for (var i = 0, len = mutations.length; i < len; i++) {
			if (mutations[i].target.style.display) {
				ui_improver.improvementDebounce();
				break;
			}
		}
	},
	target: ['#cntrl .voice_line']
};
ui_observers.refresher = {
	condition: (worker.GUIp_browser !== 'Opera'),
	config: {
		attributes: true,
		characterData: true,
		childList: true,
		subtree: true
	},
	func: function(mutations) {
		var toReset = false;
		for (var i = 0, len = mutations.length; i < len; i++) {
			var tgt = mutations[i].target,
				id = tgt.id,
				cl = tgt.className;
			if (!(id && id.match && id.match(/logger|pet_badge|equip_badge/)) &&
				!(cl && cl.match && cl.match(/voice_generator|inspect_button|m_hover|craft_button/))) {
				toReset = true;
				break;
			}
		}
		if (toReset) {
			worker.clearInterval(ui_improver.softRefreshInt);
			worker.clearInterval(ui_improver.hardRefreshInt);
			if (!ui_storage.getFlag('Option:disablePageRefresh')) {
				ui_improver.softRefreshInt = GUIp.common.setInterval(ui_improver.softRefresh, (ui_data.isFight || ui_data.isDungeon) ? 9e3 : 18e4);
				ui_improver.hardRefreshInt = GUIp.common.setInterval(ui_improver.hardRefresh, (ui_data.isFight || ui_data.isDungeon) ? 25e3 : 50e4);
			}
		}
	},
	target: ['#main_wrapper']
};
ui_observers.diary = {
	get condition() {
		return !ui_data.isFight;
	},
	config: {childList: true},
	func: function(mutations, observer) {
		ui_observers.mutationChecker(mutations, function(mutation) { return mutation.addedNodes.length; }, function() {
			ui_improver.improveDiary();
			ui_improver.improvementDebounce();
			observer.takeRecords();
		});
	},
	target: ['#diary .d_content, .e_m_diary .d_content']
};
ui_observers.news = {
	get condition() {
		return !ui_data.isFight;
	},
	config: {childList: true, characterData: true, subtree: true},
	func: function(mutations, observer) {
		ui_improver.improveMonsterName();
		ui_improver.improvementDebounce();
		observer.takeRecords();
	},
	target: ['.f_news']
};
ui_observers.hero_health = {
	get condition() {
		return !ui_data.isFight;
	},
	config: {
		childList: true,
		subtree: true
	},
	func: function(mutations) {
		ui_observers.mutationChecker(mutations, function(mutation) {
			return mutation.addedNodes.length;
		}, ui_improver.improvementDebounce);
	},
	target: ['#hk_health']
};
ui_observers.wup_detector = {
	condition: true,
	config: {childList: true},
	func: function(mutations) {
		ui_observers.mutationChecker(mutations, function(mutation) {
			return mutation.addedNodes.length && mutation.addedNodes[0].classList && mutation.addedNodes[0].classList.contains('wup');
		}, function() {
			if (document.querySelector('.wup.in .tep') && ui_storage.getFlag('Option:tePosFix')) {
				ui_utils.hideElem(document.querySelector('.wup.in'),true);
				GUIp.common.setTimeout(function() { ui_improver.thirdEyePositionFix(); },0);
			}
			if (ui_improver.improveWupInt) {
				worker.clearInterval(ui_improver.improveWupInt);
			}
			if (!ui_data.isFight) {
				ui_timers.updateThirdEyeFromHTML();
				ui_improver.improveLastFights();
				ui_improver.improveLastVoices();
				ui_improver.improveStoredPets();
				ui_improver.improveSparMenu();
				ui_improver.improveCraftMenu();
			} else if (ui_data.isMobile) {
				ui_improver.improveDmapMenu();
				ui_improver.improveLastFights();
			}
			var wTitle = document.querySelector('.wup.in .wup-title') || '',
				wContent = document.querySelector('.wup.in .wup-content') || '';
			if (wContent.textContent) {
				return; // if content is already present, then we've already improved it above. below are improvers only for content that needs to be explicitly loaded
			}
			ui_improver.improveWupInt = GUIp.common.setInterval(function() {
				if (wContent.textContent) {
					worker.clearInterval(ui_improver.improveWupInt);
					if (['Лаборатория','Lab'].includes(wTitle.textContent)) {
						ui_improver.improveLab(wContent);
					}
					if (['Творительная','Dungeon Forge'].includes(wTitle.textContent)) {
						ui_improver.improveForge(wContent);
					}
					if (['Душевая','Spirit Refinery'].includes(wTitle.textContent)) {
						ui_improver.improveSpiritRefinery(wContent);
					}
					if (['Приделы','Constructs'].includes(wTitle.textContent)) {
						ui_improver.improveUpgrader(wContent);
					}
					if (['Заказать на завтра','Tomorrow\'s orders:'].includes(wTitle.textContent)) {
						ui_improver.improveTraderOrders(wContent);
					}
				}
			},200);
		});
	},
	target: ['body']
};
ui_observers.chronicles = {
	get condition() {
		return ui_data.isDungeon;
	},
	config: {childList: true},
	func: function(mutations) {
		ui_observers.mutationChecker(mutations, function(mutation) { return mutation.addedNodes.length; }, function() { ui_improver.improveChronicles(); ui_improver.improvementDebounce(); });
	},
	target: ['#m_fight_log .d_content, .e_m_fight_log .d_content']
};
ui_observers.map_colorization = {
	get condition() {
		return ui_data.isDungeon;
	},
	config: {
		childList: true,
		subtree: true
	},
	func: function(mutations) {
		ui_observers.mutationChecker(mutations, function(mutation) { return mutation.addedNodes.length && !(mutation.target.classList && mutation.target.classList.contains('restoredExcl')); }, ui_improver.colorDungeonMap.bind(ui_improver));
	},
	target: ['#map .block_content, .e_m_dmap']
};
ui_observers.s_chronicles = {
	get condition() {
		return ui_data.isSail;
	},
	config: {childList: true},
	func: function(mutations) {
		ui_observers.mutationChecker(mutations, function(mutation) { return mutation.addedNodes.length; }, function() { ui_improver.improveSailChronicles(); ui_improver.improvementDebounce(); });
	},
	target: ['#m_fight_log h2, .e_mt_fight_log .l_header']
};
ui_observers.cargo = {
	get condition() {
		return ui_data.isSail;
	},
	config: {childList: true, characterData: true},
	func: function(mutations, observer) {
		ui_improver.improveCargo();
		observer.takeRecords();
	},
	target: ['#hk_cargo .l_val']
};
ui_observers.h_map = {
	get condition() {
		return !ui_data.isFight;
	},
	config: {
		childList: true,
		subtree: true
	},
	func: function(mutations) {
		ui_observers.mutationChecker(mutations, function(mutation) { return mutation.addedNodes[0] && mutation.addedNodes[0].tagName === 'g'; }, ui_improver.nearbyTownsFix.bind(ui_improver)) ||
			ui_observers.mutationChecker(mutations, function(mutation) { return mutation.addedNodes[0] && mutation.target.tagName === 'title'; }, ui_improver.nearbyTownsFix.bind(ui_improver,true));
	},
	target: ['#hmap_svg']
};
ui_observers.mining_map = {
	get condition() {
		return ui_data.isMining;
	},
	config: {
		childList: true,
		subtree: true
	},
	chooseAction: function(mutations) {
		var action = 0,
			mutation, node;
		for (var i = 0, len = mutations.length; i < len; i++) {
			mutation = mutations[i];
			if (!mutation.addedNodes.length) continue;
			for (node = mutation.target; node; node = node.parentElement) {
				if (node.classList.contains('wrmap')) {
					return 2;
				}
			}
			action = 1;
		}
		return action;
	},
	func: function(mutations, observer) {
		var action = ui_observers.mining_map.chooseAction(mutations);
		if (!action) return;
		ui_improver.improvementDebounce();
		ui_mining[action === 2 ? 'processMap' : 'processStepChange']();
		observer.takeRecords();
	},
	target: ['#r_map .block_title, .e_mt_fight_log', '.wrmap']
};
ui_observers.theme_switcher = {
	condition: true,
	config: {childList: true},
	func: function(mutations) {
		var href = '', nodes, theme;
		for (var i = 0, len = mutations.length; i < len; i++) {
			nodes = mutations[i].addedNodes;
			if (nodes.length && (href = nodes[0].href) && (theme = /\/stylesheets\/+(th_.*?)\.css/.exec(href))) {
				ui_utils.switchTheme(theme[1]);
				break;
			}
		}
	},
	target: ['head']
};
ui_observers.logger_width_changer = {
	condition: (worker.GUIp_browser !== 'Opera'),
	config: {attributes: true, attributeFilter: ['style']},
	func: ui_utils.loggerWidthChanger,
	target: ['#hero_columns:not([style*="display:none;"]) #central_block, #arena_columns:not([style*="display:none;"]) #a_central_block']
};
ui_observers.node_insertion = {
	condition: true,
	config: {
		childList: true,
		subtree: true
	},
	func: function(mutations) {
		ui_observers.mutationChecker(mutations, function(mutation) {
			// to prevent improving WHEN ENTERING FUCKING TEXT IN FUCKING TEXTAREA
			return mutation.addedNodes.length && mutation.addedNodes[0].nodeType !== 3;
		}, ui_improver.improvementDebounce);
	},
	target: ['body']
};
// ui_starter
var ui_starter = worker.GUIp.starter = {};

ui_starter._init = function() {
	var try2 = GUIp.common.try2;
	ui_data.init();
	ui_storage.init();
	try2.call(ui_utils,     ui_utils.jqueryExtInit);
	try2.call(ui_utils,     ui_utils.addCSS);
	try2.call(ui_expr,      ui_expr.init);
	try2.call(ui_words,     ui_words.init);
	try2.call(ui_logger,    ui_logger.create);
	try2.call(ui_timeout,   ui_timeout.create);
	try2.call(ui_help,      ui_help.init);
	try2.call(ui_informer,  ui_informer.init);
	try2.call(ui_forum,     ui_forum.init);
	try2.call(ui_inventory, ui_inventory.init);
	try2.call(ui_mining,    ui_mining.init);
	try2.call(ui_dragger,   ui_dragger.init);
	try2.call(ui_improver,  ui_improver.init);
	try2.call(ui_improver,  ui_improver.improve);
	try2.call(ui_timers,    ui_timers.init);
	try2.call(ui_observers, ui_observers.init);
};

ui_starter.start = function() {
	if (document.body.classList.contains('mbg') && !/^\((\d+)?[!@~\+]\) /.test(document.title)) {
		// a faulty mobile page in non-fight mode may request town_c update after the page is fully renreded,
		// but then will throw a devastating unrecoverable error if we try to open #hmap_svg before data is fetched.
		// so we'll try to delay our initialization until town_c is updated
		var lsTowns, ct = Date.now()/1e3;
		if (!(lsTowns = localStorage.getItem('town_c')) || !(lsTowns = JSON.parse(lsTowns)) || (ct - lsTowns.at > 180) || !lsTowns.mrt || (ct - lsTowns.at > lsTowns.mrt) /* town_c updates when these conditions are met */
			&& (!worker.e_start_delayed || worker.e_start_delayed < 10) /* also safeguard ourselves from waiting forever in case something goes wrong */) {
			GUIp.common.setTimeout(function() {
				if (!worker.e_start_delayed) {
					worker.e_start_delayed = 0;
				}
				worker.e_start_delayed++;
				ui_starter.start();
			}, 200);
			return;
		}
	}
	worker.console.time('Godville UI+ initialized in');

	GUIp.common.onUnhandledException = ui_utils.processErrorOnce;
	ui_starter._init();

	if (!ui_data.isFight) {
		GUIp.common.addListener(worker, 'mousemove', ui_improver.activity);
		GUIp.common.addListener(worker, 'scroll', ui_improver.activity);
		GUIp.common.addListener(worker, 'touchmove', ui_improver.activity);
	}

	// svg for #logger fade-out in FF
	if (worker.GUIp_browser === 'Firefox') {
		var is5c = document.getElementsByClassName('page_wrapper_5c').length;
		document.body.insertAdjacentHTML('beforeend',
			'<svg id="fader">' +
				'<defs>' +
					'<linearGradient id="gradient" x1="0" y1="0" x2 ="100%" y2="0">' +
						'<stop stop-color="black" offset="0"></stop>' +
						'<stop stop-color="white" offset="0.0' + (is5c ? '2' : '3') + '"></stop>' +
					'</linearGradient>' +
					'<mask id="fader_masking" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">' +
						'<rect x="0.0' + (is5c ? '2' : '3') + '" width="0.9' + (is5c ? '8' : '7') + '" height="1" fill="url(#gradient)" />' +
					'</mask>' +
				'</defs>' +
			'</svg>'
		);
	}

	worker.console.timeEnd('Godville UI+ initialized in');
};

ui_starter.waitForTitle = function(callback) {
	var titleRE = /(\(\d*[!@~+]\) )?.*? (и е(го|ё) геро|and h(is|er) hero)/;
	if (titleRE.test(document.title)) {
		ui_starter.start();
		callback();
	} else {
		GUIp.common.newMutationObserver(function(mutations, observer) {
			if (mutations.some(function(mutation) {
				return Array.prototype.some.call(mutation.addedNodes, function(node) {
					return titleRE.test(node.nodeValue);
				});
			})) {
				observer.disconnect();
				ui_starter.start();
				callback();
			}
		}).observe(document.querySelector('title'),{ childList: true });
	}
};

ui_starter.waitForJQuery = function(callback) {
	if (worker.$) {
		ui_starter.waitForTitle(callback);
	} else {
		// no better way
		// fortunately, we almost surely won't get there, as jQuery would either be cached or already loaded
		var timer = GUIp.common.setInterval(function() {
			if (!worker.$) return;
			worker.clearInterval(timer);
			ui_starter.waitForTitle(callback);
		}, 100);
	}
};

ui_starter.waitForContents = function(callback) {
	if (document.getElementById('stats') || document.getElementById('m_info') || document.getElementById('b_info') || document.getElementById('tabbar')) {
		GUIp.common.try2(this.waitForJQuery, callback);
	} else {
		GUIp.common.newMutationObserver(function(mutations, observer) {
			if (document.getElementById('stats') || document.getElementById('m_info') || document.getElementById('b_info') || document.getElementById('tabbar')) {
				observer.disconnect();
				ui_starter.waitForJQuery(callback);
			}
		}).observe(document.body, {childList: true, subtree: true});
	}
};
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

registerModuleAsync('superhero', ui_starter.waitForContents, ui_starter);

})(this);
