(function(worker) {
'use strict';

worker.GUIp = worker.GUIp || {};
var ui_log = GUIp.log = {};

ui_log.customDomain = !/^https?:\/\/(b\.)?godville(?:\.net|game\.com)\/+duels\/+log\//.test(location.href);
ui_log.logID = (/\/duels\/+log\/+([^?#]+?)\/*(?:[?#]|$)/.exec(location.pathname) || [])[1];
ui_log.queryString = null;
// .startsWith relies on a polyfill in Opera 12 which may not be loaded yet
ui_log.isStream = location.pathname.indexOf('/reporter/') === 0;
ui_log.chronicles = {};
ui_log.directionlessMoves = null;
ui_log.wormholeMoves = null;
ui_log.dungeonGuidedSteps = null;
ui_log.corrections = {n: 'north', e: 'east', s: 'south', w: 'west'};

/** @namespace */
ui_log.storage = {
	_localPrefix: 'Log:' + ui_log.logID + ':',

	_keyOf: function(id, local) {
		return 'eGUI_' + ui_log.godname + (local ? ':' + this._localPrefix : ':') + id;
	},

	/**
	 * @param {string} id
	 * @param {boolean=} local
	 * @returns {?string}
	 */
	get: function(id, local) {
		return localStorage.getItem(this._keyOf(id, local));
	},

	/**
	 * @param {string} id
	 * @param {(string|number|boolean)} value
	 * @param {boolean=} local
	 */
	set: function(id, value, local) {
		localStorage[this._keyOf(id, local)] = value;
	},

	/**
	 * @param {string} id
	 * @param {boolean=} local
	 */
	remove: function(id, local) {
		delete localStorage[this._keyOf(id, local)];
	},

	/**
	 * @param {string} id
	 * @param {boolean=} local
	 * @returns {boolean}
	 */
	getFlag: function(id, local) {
		return this.get(id, local) === 'true';
	},

	/**
	 * @param {string} id
	 * @param {boolean=} local
	 * @returns {!Array<string>}
	 */
	getList: function(id, local) {
		var s = this.get(id, local);
		return s ? s.split(',') : [];
	},

	/**
	 * @param {string} id
	 * @param {boolean=} local
	 * @returns {*}
	 */
	getJSON: function(id, local) {
		return GUIp.common.parseJSON(this.get(id, local));
	},

	/**
	 * @param {string} id
	 * @param {*} value
	 * @param {boolean=} local
	 */
	setJSON: function(id, value, local) {
		this.set(id, JSON.stringify(value), local);
	}
};

// TODO: implement more robust checks
ui_log.isOldDungeonLog = function() {
	return this.logID.length === 5;
};

ui_log.isDungeonLog = function() {
	return this.logID.length === 9 && document.getElementById('dmap');
};

ui_log.isSailingLog = function() {
	return this.logID.length === 7;
};

ui_log.clearDungeonPhrases = function() {
	for (var key in localStorage) {
		if (key.startsWith('LogDB:')) {
			localStorage.removeItem(key);
		}
	}
};

/**
 * @param {string} selector
 * @returns {?Element}
 */
ui_log.getChronicleLastLine = function(selector) {
	var items = document.querySelectorAll(selector);
	return items[ui_log.isMobile || ui_log.queryString.get1('sort') === 'desc' ? 0 : items.length - 1] || null;
};

/**
 * @param {string} blockID
 * @returns {string}
 */
ui_log.getArenaHeroName = function(blockID) {
	var heroBlock = document.getElementById(blockID), fields;
	if (!heroBlock) return '';
	fields = heroBlock.getElementsByClassName('field_content');
	return fields.length >= 2 && fields[1].textContent.trim() === this.godname ? fields[0].textContent.trim() : '';
};

/**
 * @returns {string}
 */
ui_log.getArenaHeroNameMobile = function() {
	var fields = Array.from(document.querySelectorAll('#items_list li a.opp_line .all_name')).map(function(a) {
		return {
			heroname: a.firstChild.textContent.trim(),
			godname: a.lastElementChild.textContent.trim().slice(1,-1)
		};
	}).filter(function(a) {
		return a.godname === ui_log.godname;
	});
	return fields[0] && fields[0].heroname || '';
};

/**
 * @returns {!Object<string, string>} godName: heroName
 */
ui_log.getDungeonHeroNames = function() {
	var links = document.querySelectorAll(this.isMobile ? '#items_list li a.opp_line' : '#hero1_info .l_capt a'),
		result = Object.create(null),
		link;
	for (var i = 0, len = links.length; i < len; i++) {
		link = links[i];
		result[decodeURIComponent(/\/([^/]+)$/.exec(link.href)[1])] = this.isMobile ? link.firstChild.firstChild.textContent.trim() : link.textContent;
	}
	return result;
};

/**
 * @returns {!Date}
 */
ui_log.getStartDate = function() {
	return GUIp.common.parseDateTime(ui_log.customDomain ? Array.from(document.getElementsByClassName('lastduelpl_f')).map(function(a) { return a.textContent; }).join() : (
		document.getElementsByClassName('ft')[0].textContent
	));
};

/**
 * @returns {number}
 */
ui_log.getApproximateEndDate = function(toStep) {
	var date = ui_log.getStartDate(),
		startDate = +date,
		revCaptions = Array.from(document.querySelectorAll(ui_log.isMobile ? '.li_capt ~ div.new_line .d_capt' : '#last_items_arena .d_capt')),
		caption = '',
		endDate = 0,
		m;
	if (!ui_log.isMobile && ui_log.queryString.get1('sort') !== 'desc') { // mobile version is always reversed
		revCaptions.reverse();
	}
	for (var i = 0, len = revCaptions.length; i < len; i++) {
		if ((caption = revCaptions[i].textContent.trim())) {
			if (toStep && (m = /(?:step|шаг) (\d+)/.exec(caption)) && +m[1] > toStep) {
				continue;
			}
			m = /(\d+):(\d+)/.exec(caption);
			endDate = date.setHours(+m[1], +m[2], 0, 0);
			return endDate >= startDate ? endDate : endDate + 86400e3; // 24h
		}
	}
	throw new Error('cannot determine ' + (toStep ? 'step date in' : 'end date of') + ' the chronicle');
};

ui_log.initBlacklisting = function() {
	var node, players;
	if ((node = document.querySelector('#hero1_info .block_h, #fight_chronicle .block_h'))) {
		node.insertAdjacentHTML('beforeend',
			'<span id="e_ally_blacklist_setup" class="em_font e_t_icon e_icon" title="' + GUIp_i18n.lb_ally_blacklist_title + '">⚙</span>'
		);
		GUIp.common.addListener(node.lastChild, 'click', function() {
			GUIp.common.createLightbox('ally_blacklist', ui_log.storage, GUIp_words(), null);
			document.getElementById('optlightbox').classList.add('e_box');
		});
	}
	players = document.querySelectorAll(this.isMobile ? '#items_list .all_name .g_name' : '#hero1_info .l_capt > span, #h_tbl .t_line a');
	if (!players.length && (node = document.querySelector('#hero1_info a'))) {
		players = [node];
		if ((node = document.querySelector('#hero2_info a'))) {
			players[1] = node;
		}
	}
	GUIp.common.markBlacklistedPlayers(
		players,
		GUIp.common.preprocessPlayerBlacklist(ui_log.storage.getJSON('CustomWords:ally_blacklist') || [])
	);
	Array.prototype.forEach.call(players, GUIp.common.tooltips.watchSubtree);
};

ui_log.processMutatingBoss = function() {
	var abilities = ((this.isMobile ? document.querySelector('#items_list li.ui-li-divider + li a[href*="//wiki.godville"] .all_name') : document.getElementsByClassName('opp_meta')[0]) || '').textContent || '';
	if (!/мутирующий|mutating/i.test(abilities)) {
		return;
	}
	var chronicles = Array.from(document.querySelectorAll((this.isMobile ? '.li_capt ~ div.new_line:not(#no_msgs_stub)' : '#last_items_arena .new_line') + ' .text_content:not(.infl)')).filter(function(a) {
		if (a.textContent.trim().startsWith('\uD83E\uDDEC ')) { /* 🧬 */
			return true;
		}
		return false;
	});
	if (this.queryString.get1('sort') === 'desc' || this.isMobile) {
		chronicles.reverse();
	}
	var node, currentAbilities = [], oldAbilities = [],
		lostAbility = '', gainedAbility = '',
		allAbilities = worker.GUIp_locale === 'ru' ? Object.keys(GUIp.common.bossAbilitiesList) : Object.values(GUIp.common.bossAbilitiesList),
		capitalize = function(str) { return str.charAt(0).toUpperCase() + str.slice(1); };
	chronicles.forEach(function(a) {
		currentAbilities = [];
		allAbilities.forEach(function(b) {
			if (a.textContent.includes(capitalize(b))) {
				currentAbilities.push(b);
			}
		});
		currentAbilities.forEach(function(b) {
			if (!oldAbilities.includes(b)) {
				gainedAbility = b;
			}
		});
		oldAbilities.forEach(function(b) {
			if (!currentAbilities.includes(b)) {
				lostAbility = b;
			}
		});
		a.innerHTML = a.innerHTML.replace('\uD83E\uDDEC', '<span class="e_mutated e_select_disabled">\uD83E\uDDEC</span>');
		if ((node = a.getElementsByClassName('e_mutated')[0])) {
			if (oldAbilities.length) {
				node.title = capitalize(lostAbility) + ' \u2192 ' /* → */ + capitalize(gainedAbility);
			} else {
				node.title = '(?)' + ' \u2192 ' /* → */ + currentAbilities.filter(function(b) { return !/мутирующий|mutating/.test(b); }).map(capitalize).join(', ');
			}
			GUIp.common.tooltips.watchSubtree(node);
		}
		oldAbilities = currentAbilities;
	});
};

ui_log.getNodeIndex = function(node) {
	var i = 0;
	while ((node = node.previousElementSibling)) {
		i++;
	}
	return i;
};

ui_log.extractFromScripts = function(regex, obj) {
	var scripts = document.getElementsByTagName('script'),
		m;
	for (var i = 0, len = scripts.length; i < len; i++) {
		if ((m = regex.exec(scripts[i].textContent))) {
			try {
				return JSON.parse(m[1]);
			} catch (e) { }
		}
	}
	return obj ? {} : [];
};

ui_log.onscroll = function() {
	var $box = document.querySelector('#hero2 .box'),
		isFixed = $box.style.position === 'fixed',
		resSM = (ui_log.lfExp || !ui_log.customDomain || !ui_log.isOldDungeonLog()) ? 0 : 100;
	if (worker.scrollY > $box.offsetTop && ($box.offsetHeight + resSM) < worker.innerHeight && !isFixed) {
		$box.style.position = 'fixed';
		$box.style.top = 0;
	} else if ((worker.scrollY <= $box.offsetTop || ($box.offsetHeight + resSM) >= worker.innerHeight) && isFixed) {
		$box.style.position = 'static';
	}
};

ui_log.scrollTo = function(target) {
	if (!target) {
		return;
	}
	if (typeof target.scrollIntoView === 'function') {
		// older versions of firefox throw errors with {block: 'center'}, newer versions implement it but use 'start' as default value
		// although in MDN there's clearly stated that center should be the default
		try {
			target.scrollIntoView({behavior: 'smooth', block: 'center'});
		} catch (e) {
			target.scrollIntoView({behavior: 'smooth'});
		}
	}
};
/**
 * @param {string} msg
 * @param {string} heroName
 * @returns {boolean}
 */
ui_log.parseSparResult = function(msg, heroName) {
	var pos = msg.search(/ получает порцию опыта| gets experience points for today/i);
	return pos >= 0 && msg.endsWith(heroName, pos);
};

/**
 * @param {!GUIp.common.activities.Activity} act
 */
ui_log.addActivity = function(act) {
	if (act.date < Date.now() - GUIp.common.activities.storageTime) {
		return;
	}
	var activities = GUIp.common.activities.load(this.storage),
		existing = activities.find(function(existing) {
			return existing.type === act.type && (act.inID ? (existing.inID === act.inID) : (existing.logID === act.logID)); /* souls from the tb have special inID field */
		});
	if (!existing) {
		activities.push(act);
	} else if (existing.result < 0 && !act.inID) {
		existing.result = act.result;
		// should not update date here, since we might have inaccurate one
	} else if (act.inID) {
		// for souls from the tb always update result and update date but only if it's newer
		existing.result = act.result;
		if (existing.date < act.date) {
			existing.date = act.date;
		}
	} else {
		if (existing.result !== act.result) {
			GUIp.common.warn('activity result mismatch:', existing.result, '!=', act.result);
		}
		return;
	}
	GUIp.common.activities.save(this.storage, activities.sort(function(a, b) { return a.date - b.date; }));
};

ui_log.saveSparResults = function() {
	var entry = this.getChronicleLastLine((this.isMobile ? '.li_capt ~ div.new_line:not(#no_msgs_stub)' : '#last_items_arena .new_line') + ' .text_content'),
		heroName = this.isMobile ? this.getArenaHeroNameMobile() : (this.getArenaHeroName('hero1_info') || this.getArenaHeroName('hero2_info'));
	if (!entry || !heroName) return;
	this.addActivity({
		type: 'spar',
		date: this.getApproximateEndDate(),
		result: +this.parseSparResult(entry.textContent, heroName),
		logID: this.logID
	});
};

ui_log.saveDungeonResults = function() {
	var entry = this.getChronicleLastLine((this.isMobile ? '.li_capt ~ div.new_line:not(#no_msgs_stub)' : '#last_items_arena .new_line') + ' .text_content'),
		heroNames = this.getDungeonHeroNames(),
		date, value;
	if (!entry || !heroNames[this.godname]) return;
	date = this.getApproximateEndDate();
	this.addActivity({
		type: 'dungeon',
		date: date,
		result: GUIp.common.parseDungeonResultFromStep(entry.textContent, heroNames[this.godname], Object.values(heroNames), function(text) { return (text.match(/бревно для ковчега|ещё одно бревно|log for the ark/gi) || '').length; }),
		logID: this.logID
	});
	value = GUIp.common.parseDungeonResultFromStep(entry.textContent, heroNames[this.godname], Object.values(heroNames), GUIp.common.parseGatheredSoul);
	this.addActivity({
		type: 'souls',
		date: date,
		result: value ? 1 : 0,
		logID: this.logID
	});
	if (value > 0) {
		GUIp.common.updateGatheredSouls(ui_log.storage, date, 1, value);
	}
};

ui_log.saveDungeonFightResults = function(steps) {
	var date, value, step, found = 0,
		heroNames = this.getDungeonHeroNames();
	if (!heroNames[this.godname]) return;
	for (step = steps; step > 0; step--) {
		if (this.chronicles[step].marks.includes('boss')) {
			if (value = GUIp.common.parseDungeonResultFromStep(this.chronicles[step].text, heroNames[this.godname], Object.values(heroNames), GUIp.common.parseGatheredSoul)) {
				found = true;
				date = this.getApproximateEndDate(step+1) - 30e3; /* in chronicles boss step contains fight start time, but we need its end */
				this.addActivity({
					type: 'souls',
					date: date,
					result: 1,
					inID: this.logID
				});
				GUIp.common.updateGatheredSouls(ui_log.storage, date, 2, value);
				break; // there's only one soul-containing boss in a dungeon, so no reason to search further
			}
		}
	}
	if (!found) {
		this.addActivity({
			type: 'souls',
			date: this.getApproximateEndDate(),
			result: 0,
			inID: this.logID
		});
	}
};
ui_log.dmapDynamic = document.body.innerHTML.indexOf('var d_maps = [[[') !== -1; // this is how we check whether this log has dynamic dmap. any better idea?
ui_log.dmapMaxStep = function() {
	var steps = Object.keys(this.chronicles);
	if (this.dmapDynamic) {
		return Math.min(+(document.getElementById('turn_num') || '').textContent || Infinity,steps.length);
	}
	return steps.length;
}

ui_log.extractDungeonAuxCache = function() {
	GUIp.common.dmapAuxCache = {};
	var mapCache = GUIp.common.dmapAuxCache,
		maps = this.extractFromScripts(/\bd_maps\s*=\s*(\[\[\[.*?\]\]\])\s*;/),
		titles = this.extractFromScripts(/\bd_aura\s*=\s*({.*?})\s*;/),
		cValue;
	for (var k = 1, len = this.dmapMaxStep(); k <= len; k++) {
		if (!maps[k] || !titles[k]) continue;
		var cellarShift = /, (2Э|B)$/.test(titles[k]) ? 100 : 0,
			exitMark = cellarShift ? '◿' : '🚪',
			groupPos = [], exitPos = [];
		for (var i = 0, len2 = maps[k].length; i < len2; i++) {
			for (var j = 0, len3 = maps[k][i].length; j < len3; j++) {
				if (maps[k][i][j] === '@') {
					groupPos = [i,j];
				}
				if (maps[k][i][j] === exitMark) {
					exitPos = [i,j];
				}
			}
		}
		if (exitPos === undefined) {
			if (groupPos !== undefined) {
				exitPos = groupPos;
			} else {
				continue;
			}
		}
		for (var ki, i = 0, len2 = maps[k].length; i < len2; i++) {
			ki = i - exitPos[0] + cellarShift;
			for (var kj, j = 0, len3 = maps[k][i].length; j < len3; j++) {
				kj = j - exitPos[1] + cellarShift;
				cValue = 0;
				switch (maps[k][i][j]) {
				case '@':
					cValue = 0x01;
					break;
				case '!':
					cValue = 0x02;
					break;
				case '#':
					cValue = 0x04;
					break;
				}
				if (cValue) {
					if (!mapCache[ki]) mapCache[ki] = {};
					mapCache[ki][kj] |= cValue;
				}
			}
		}
	}
}

ui_log.processDungeonMap = function(parsed) {
	this.prepareMap();
	if (parsed) {
		this.describeMap();
	}
	GUIp.common.dmapDisabledPointersBind(function() {
		ui_log.storage.setJSON('dptr', GUIp.common.dmapDisabledPointersCache, true);
	}, this.highlightTreasuryZone);
	if (this.customDomain || !this.isBroadcast) {
		this.extractDungeonAuxCache();
	}
	// we should check the cache before the main map processing as we may have important data in cache to be used there (for demolition & clarity dungeons at least)
	if (Object.keys(GUIp.common.dmapAuxCache).length) {
		GUIp.common.dmapAuxProc({
			shown: this.customDomain || this.storage.getList('Option:dungeonMapSettings').includes('excl'),
			processWalls: true,
			processExclamations: true
		});
	}
	this.highlightTreasuryZone();
	GUIp.common.tooltips.watchSubtree(document.getElementById('dmap'));
	GUIp.common.dmapCoords();
	if ((ui_log.customDomain || ui_log.storage.getList('Option:dungeonMapSettings').includes('dims')) && document.querySelector(this.isMobile ? '#ar_name' : '#hero2 .block_h')) {
		var mapDimensions = document.querySelector('.dmapDimensions');
		if (!mapDimensions) {
			mapDimensions = document.createElement('span');
			mapDimensions.classList.add('dmapDimensions');
			document.querySelector(this.isMobile ? '#ar_name' : '#hero2 .block_h').appendChild(mapDimensions);
		}
		mapDimensions.textContent = GUIp.common.dmapDimensions();
	}
	// add an explanation to a combined dungeon type
	if (this.dungeonExtras.type === 'multi') {
		GUIp.common.explainDungeonType(this.dungeonExtras);
	}
};

ui_log.initColorMap = function() {
	if (localStorage.getItem('debugGVP') || ui_log.storage.getFlag('Option:enableDebugMode')) {
		GUIp.common['treasureChestRegExp'] = new worker.RegExp(localStorage.getItem('LogDB:treasureChestPhrases').replace(/(plunder the treasure trove and divide the loot|потрошат сокровищницу|делят награб)\|?/g,'').replace(/\|$/,''));
		GUIp.common['bossRegExp'] = new worker.RegExp(localStorage.getItem('LogDB:bossPhrases').replace(/(The heroes defeated|defeated the nasty creature|arrogant monster|the heroes are deciding what to do next|successfully defeating the boss|defeated the nasty boss|тяжело рухнул|победу над наглым|Собранные судьбой|предсмертными хрипами|золото и трофеи|порван на куски|над исчадием зла|побеждённого в столичный зоопарк|плохо себя вёл и остаётся без обеда. А также золота)\|?/g,'').replace(/\|$/,''));
	}
	// finally process everything
	if (this.steps > 1) {
		GUIp.common.parseChronicles.call(ui_log, document.body, this.steps, {
			compat: !!document.getElementById('fight_log_capt'),
			putDMLink: this.customDomain || ui_log.storage.getList('Option:dungeonMapSettings').includes('dmln'),
			gvURL: this.customDomain ? (
				/^(?:https?:\/\/)?[^/]*/.exec(document.querySelector('#hero1_info a').href)[0]
			) : '',
			isMobile: this.isMobile
		});
		// as we now have chronicles parsed, check for possibly gathered souls after the fights
		if (!this.customDomain && !this.isBroadcast) {
			this.saveDungeonFightResults(this.steps);
		}
	}
	if ((this.isCGM = !document.getElementById('dmap'))) {
		this.buildMap();
	}
	this.observeDungeonMap(true);
};

ui_log.observeDungeonMap = function(parsed) {
	var dmap = document.getElementById('dmap');
	if (dmap) {
		this.processDungeonMap(parsed);
		GUIp.common.newMutationObserver(function(mutations, observer) {
			if (!dmap.getElementsByClassName('.map_pos')[0]) {
				dmap.classList.remove('e_prepared', 'e_described');
				this.processDungeonMap(parsed);
				observer.takeRecords();
			}
		}.bind(this)).observe(dmap, { childList: true, subtree: true });
		this.createDungeonButtons();
	}
};

ui_log.prepareMap = function() {
	// make dmap feel a bit like normal map
	var dmap = document.getElementById('dmap');
	if (dmap.classList.contains('e_prepared')) {
		return;
	}
	dmap.innerHTML = dmap.innerHTML.replace(/>\s{2,}</g, "><");
	var cells = document.querySelectorAll('.dml .dmc');
	for (var i = 0, len = cells.length; i < len; i++) {
		if (cells[i].textContent.includes('@')) {
			cells[i].classList.add('map_pos');
			break;
		}
	}
	// expand minimap on desktop
	if (!this.isMobile)
	try {
		var mw, styles, overhead = 0, boxStyle;
		styles = worker.getComputedStyle(dmap);
		overhead += parseInt(styles.paddingLeft) + parseInt(styles.paddingRight);
		styles = worker.getComputedStyle(dmap.parentNode);
		overhead += parseInt(styles.paddingLeft) + parseInt(styles.paddingRight) + 2;
		overhead = Math.max((overhead || 0), 20);
		if (worker.GUIp_browser !== 'Opera') {
			dmap.style.width = dmap.scrollWidth > (400 - overhead) ? (400 - overhead) + 'px' : 'initial';
		} else {
			dmap.style.width = dmap.scrollWidth > (400 - overhead) ? (400 - overhead) + 'px' : 'inherit';
			dmap.style.overflowY = 'auto';
			dmap.style.paddingBottom = '25px';
		}
		mw = Math.min((dmap.scrollWidth + overhead),400) + 'px';
		boxStyle = dmap.parentNode.parentNode.style;
		GUIp.common.addListener(worker, 'scroll', function() {
			boxStyle.width = mw;
		});
		boxStyle.width = mw;
		// prevent hiding the horizontal scrollbar on narrow screens when the page is scrolled down
		if (overhead = document.getElementById('hscrollfix')) {
			overhead.style.width = mw;
		} else {
			dmap.parentNode.parentNode.insertAdjacentHTML('afterend', '<div id="hscrollfix" style="width: ' + mw + ';">\xA0</div>');
		}
	} catch (e) {
		GUIp.common.error('expanding minimap has failed:', e);
	}
	dmap.classList.add('e_prepared');
};

ui_log.buildMap = function() {
	var step, lastSentence, blocked, bounds, txmi, txma, pos = {x: 0, y: 0},
		mapData = {}, mapArray = [], text, noffset, soffset,
		trapMoveLossCount = 0,
		steps = Object.keys(this.chronicles),
		steps_max = steps.length,
		isDemolition = GUIp.common.checkParsedDungeonType(this.dungeonExtras, 'demolition'),
		dtitle, isStepInCellar = false, isMapInCellar = false;
	this.directionlessMoves = ui_log.storage.getJSON('dlMoves', true) || {};
	this.wormholeMoves = ui_log.storage.getJSON('whMoves', true) || {};
	if (location.search) {
		if ((text = ui_log.queryString.get1('edm'))) {
			text.split(',').forEach(function(a) { a = a.split(':'); ui_log.directionlessMoves[+a[0]] = a[1]; });
		}
		if ((text = ui_log.queryString.get1('ewh'))) {
			text.split(',').forEach(function(a) { a = a.split(':'); ui_log.wormholeMoves[+a[0]] = [-a[2],+a[1]]; });
		}
		if ((text = ui_log.queryString.get1('eno'))) {
			text = text.split(':');
			noffset = [-text[1],text[0]];
		}
		if ((text = ui_log.queryString.get1('eso'))) {
			text = text.split(':');
			soffset = [-text[1],text[0]];
		}
	}
	var setCell = function(position, content) {
		if (!mapData[position.y]) {
			mapData[position.y] = {}
		}
		if (isDemolition && mapData[position.y][position.x] === '#' && content !== '#') {
			content += '*'; // special mark for possibly removed wall
		} else if ((content === '#' || content === ' ') && mapData[position.y][position.x] !== undefined) {
			return;
		}
		mapData[position.y][position.x] = content;
	}
	var matchPointers = function(cellPointers, matchPointers) {
		return cellPointers.includes(matchPointers[0]) && cellPointers.includes(matchPointers[1]);
	}
	// detecting on which floor we are currently on
	for (step = 1; step <= steps_max; step++) {
		if (this.chronicles[step].marks.includes('staircase')) {
			isMapInCellar = !isMapInCellar;
		}
	}
	// iterate normally
	for (step = 1; step <= steps_max; step++) {
		if (!this.chronicles[step]) {
			GUIp.common.warn('data from step #' + step + ' missing: map generation not possible!');
			this.buildMapError = worker.GUIp_i18n.dungeon_map_failed;
			break;
		}
		// check moving to or from the subfloor
		if (this.chronicles[step].marks.includes('staircase')) {
			isStepInCellar = !isStepInCellar;
		}
		// we are NOT interested in building the map of the wrong floor
		if (isStepInCellar !== isMapInCellar) {
			continue;
		}
		// trying to build the usual way
		if (this.chronicles[step].directionless) {
			if (this.directionlessMoves[step]) {
				GUIp.common.moveCoords(pos, { direction: this.corrections[this.directionlessMoves[step]] });
			} else {
				var newDirection = null;
				if (this.chronicles[step-1]) {
					var prevDirection = this.chronicles[step-1].direction;
					if ((blocked = GUIp.common.calcBlocked(this.chronicles, step-1)) && blocked.toString(2).match(/1/g).length === 3) { // this is effectively the dead end - there's only one available exit (as 3 of 4 are blocked)
						switch (~blocked & 0x0f) {
							case 0x01: newDirection = 'north'; break;
							case 0x02: newDirection = 'south'; break;
							case 0x04: newDirection = 'west'; break;
							case 0x08: newDirection = 'east'; break;
						}
					} else if (this.chronicles[step].infls.length && (newDirection = GUIp.common.effectiveGodvoiceDirection(this.chronicles,step))) { // this _can_ make false assumptions but it's better than nothing
						GUIp.common.debug('tried to guess directionless move from step #' + step + ' to "' + newDirection + '" based on godvoice commands');
					} else {
						switch (prevDirection) {
							case 'север':
							case 'north':
								if ((blocked & 0x08) && !(blocked & 0x01)) {
									newDirection = 'north';
								}
								break;
							case 'юг':
							case 'south':
								if ((blocked & 0x04) && !(blocked & 0x02)) {
									newDirection = 'south';
								}
								break;
							case 'запад':
							case 'west':
								if ((blocked & 0x01) && !(blocked & 0x04)) {
									newDirection = 'west';
								}
								break;
							case 'east':
							case 'восток':
								if ((blocked & 0x02) && !(blocked & 0x08)) {
									newDirection = 'east';
								}
								break;
						}
						if (newDirection) {
							GUIp.common.info('tried to guess directionless move at step #' + step + ' to "' + newDirection + '" based on the motion vector');
						}
					}
				}
				if (newDirection) {
					GUIp.common.moveCoords(pos, { direction: newDirection });
				} else {
					GUIp.common.warn('detected directionless move at step #' + step + ': map generation not possible!');
					setCell(pos, '@');
					this.buildMapError = worker.GUIp_i18n.fmt('cgm_no_dlm',step);
					break;
				}
			}
		} else {
			GUIp.common.moveCoords(pos, this.chronicles[step]);
		}
		if (this.chronicles[step].wormhole) {
			setCell(pos, '~');
			if (this.wormholeMoves[step]) {
				pos.y += this.wormholeMoves[step][0];
				pos.x += this.wormholeMoves[step][1];
			} else {
				this.buildMapError = worker.GUIp_i18n.fmt('cgm_no_wm',step);
				break;
			}
		}
		if (this.chronicles[step].pointers.length) {
			var pchar = ' ';
			if (this.chronicles[step].pointers.length === 2) {
				if (matchPointers(this.chronicles[step].pointers, ['north', 'east'])) {
					pchar = '⌊';
				} else if (matchPointers(this.chronicles[step].pointers, ['north', 'west'])) {
					pchar = '⌋';
				} else if (matchPointers(this.chronicles[step].pointers, ['south', 'east'])) {
					pchar = '⌈';
				} else if (matchPointers(this.chronicles[step].pointers, ['south', 'west'])) {
					pchar = '⌉';
				} else if (matchPointers(this.chronicles[step].pointers, ['north_east', 'north_west'])) {
					pchar = '∨';
				} else if (matchPointers(this.chronicles[step].pointers, ['north_east', 'south_east'])) {
					pchar = '<';
				} else if (matchPointers(this.chronicles[step].pointers, ['south_east', 'south_west'])) {
					pchar = '∧';
				} else if (matchPointers(this.chronicles[step].pointers, ['north_west', 'south_west'])) {
					pchar = '>';
				}
			} else {
				switch (this.chronicles[step].pointers[0]) {
					case 'north_east': pchar = '↗'; break;
					case 'north_west': pchar = '↖'; break;
					case 'south_east': pchar = '↘'; break;
					case 'south_west': pchar = '↙'; break;
					case 'north_side': pchar = '╩'; break;
					case 'east_side':  pchar = '╠'; break;
					case 'south_side': pchar = '╦'; break;
					case 'west_side':  pchar = '╣'; break;
					case 'north':      pchar = '↑'; break;
					case 'east':       pchar = '→'; break;
					case 'south':      pchar = '↓'; break;
					case 'west':       pchar = '←'; break;
					case 'freezing': pchar = '✵'; break;
					case 'cold':     pchar = '❄'; break;
					case 'mild':     pchar = '☁'; break;
					case 'warm':     pchar = '♨'; break;
					case 'hot':      pchar = '☀'; break;
					case 'burning':  pchar = '✺'; break;
				}
			}
			setCell(pos, pchar);
		} else if (this.chronicles[step].marks.includes('boss')) {
			setCell(pos, '💀');
		} else if (this.chronicles[step].marks.join().includes('trap')) {
			setCell(pos, '🕳');
		} else if (this.chronicles[step].marks.includes('staircase') || this.chronicles[step].marks.includes('staircaseHint')) {
			setCell(pos, '◿');
		} else {
			setCell(pos, ' ');
		}
		if (blocked = GUIp.common.calcBlocked(this.chronicles, step)) {
			if (blocked & 0x01) {
				setCell({y: pos.y - 1, x: pos.x}, '#');
			}
			if (blocked & 0x02) {
				setCell({y: pos.y + 1, x: pos.x}, '#');
			}
			if (blocked & 0x04) {
				setCell({y: pos.y, x: pos.x - 1}, '#');
			}
			if (blocked & 0x08) {
				setCell({y: pos.y, x: pos.x + 1}, '#');
			}
		}
	}
	if (noffset && !isMapInCellar) {
		setCell({x: noffset[1], y: noffset[0]}, '✖');
	}
	if (soffset && !isMapInCellar) {
		setCell({x: soffset[1], y: soffset[0]}, '◿');
	}
	setCell({x: 0, y: 0}, !isMapInCellar ? '🚪' : '◿');
	if (step > steps_max) {
		setCell(pos, '@');
	}
	var bounds = {xmi: 0, xma: 0, ymi: 0, yma: 0};
	for (var y in mapData) {
		txmi = Math.min.apply(null,Object.keys(mapData[y]));
		txma = Math.max.apply(null,Object.keys(mapData[y]));
		if (txmi < bounds.xmi) {
			bounds.xmi = txmi;
		}
		if (txma > bounds.xma) {
			bounds.xma = txma;
		}
	}
	bounds.ymi = Math.min.apply(null,Object.keys(mapData));
	bounds.yma = Math.max.apply(null,Object.keys(mapData));
	txmi = false;
	txma = false;
	for (var y in mapData) {
		if (!txmi && mapData[y][bounds.xmi] && mapData[y][bounds.xmi] !== '#') {
			bounds.xmi--;
			txmi = true;
		}
		if (!txma && mapData[y][bounds.xma] && mapData[y][bounds.xma] !== '#') {
			txma = true;
			bounds.xma++;
		}
	}
	for (var x in mapData[bounds.ymi]) {
		if (mapData[bounds.ymi][x] !== '#') {
			bounds.ymi--;
			break;
		}
	}
	for (var x in mapData[bounds.yma]) {
		if (mapData[bounds.yma][x] !== '#') {
			bounds.yma++;
			break;
		}
	}
	for (var y = bounds.ymi, i = 0; y <= bounds.yma; y++, i++) {
		mapArray.push([]);
		for (var x = bounds.xmi; x <= bounds.xma; x++) {
			if (!mapData[y] || !mapData[y][x]) {
				mapArray[i].push('?');
			} else {
				mapArray[i].push(mapData[y][x]);
			}
		}
	}
	this.restoreDungeonMap({
		map: mapArray,
		isCGM: true
	});
	// we might also want to put type explanation into the title of the map we've just generated
	GUIp.common.parseDungeonExtras(this.dungeonExtras,
		document.querySelectorAll(this.isMobile ? '.li_capt ~ div.new_line.d_imp' : '#last_items_arena .new_line.d_imp'),
		document.getElementById('ar_name')
	);
	this.chronicleGeneratedMap = true;
};

ui_log.traceMapProcess = function(direction) {
	var chronicle, coords2, exitXY = GUIp.common.calculateExitXY(),
		currentCell, mapCells = document.querySelectorAll('#dmap .dml'),
		progressbar = document.getElementById('trace_progress');
	if (!mapCells.length || (this.traceStep + direction) > progressbar.max) {
		ui_log.traceMapStop();
		return;
	}
	var highlightThis = function(traceCoords) {
		currentCell = mapCells[traceCoords.y + exitXY.y] && mapCells[traceCoords.y + exitXY.y].children[traceCoords.x + exitXY.x];
		if (!currentCell) {
			ui_log.traceMapStop();
			return false;
		}
		currentCell.classList.add('dtrace');
		return true;
	}
	currentCell = document.querySelectorAll('.dmc.dtrace');
	for (var i = 0, len = currentCell.length; i < len; i++) {
		currentCell[i].classList.remove('dtrace');
	}
	if (direction !== -1) {
		if (this.chronicles[this.traceStep] && this.chronicles[this.traceStep].wormhole) {
			if (this.chronicles[this.traceStep].wormholedst) {
				this.traceCoords.y += this.chronicles[this.traceStep].wormholedst[0];
				this.traceCoords.x += this.chronicles[this.traceStep].wormholedst[1];
			} else {
				ui_log.traceMapStop();
				return false;
			}
		}
	} else {
		if (this.chronicles[this.traceStep - 1] && this.chronicles[this.traceStep - 1].wormhole) {
			coords2 = {x: this.traceCoords.x, y: this.traceCoords.y};
			GUIp.common.moveCoords(coords2, this.chronicles[this.traceStep], direction);
			if (!highlightThis(coords2)) {
				return;
			}
			if (this.chronicles[this.traceStep - 1].wormholedst) {
				this.traceCoords.y -= this.chronicles[this.traceStep - 1].wormholedst[0];
				this.traceCoords.x -= this.chronicles[this.traceStep - 1].wormholedst[1];
			} else {
				ui_log.traceMapStop();
				return false;
			}
		}
	}
	this.traceStep += direction;
	if (this.traceStep === 0) {
		ui_log.traceMapCalcCoords(progressbar.max);
		ui_log.traceStep++;
	} else {
		chronicle = this.chronicles[this.traceStep + (direction === -1 ? 1 : 0)];
		if (chronicle) {
			if (chronicle.marks.includes('staircase') && !ui_log.traceBegin) {
				var found = false;
				while (this.traceStep >= 0 && this.traceStep < progressbar.max) {
					this.traceStep += direction;
					chronicle = this.chronicles[this.traceStep + (direction === -1 ? 1 : 0)];
					if (chronicle && chronicle.marks.includes('staircase')) {
						found = true;
						break;
					}
				}
				if (!found) return;
			}
			ui_log.traceBegin = false;
			GUIp.common.moveCoords(this.traceCoords, chronicle, direction);
			if (chronicle.wormholedst && direction !== -1) {
				if (!highlightThis({y: this.traceCoords.y + chronicle.wormholedst[0], x: this.traceCoords.x + chronicle.wormholedst[1]})) {
					return;
				}
			};
		}
	}
	progressbar.value = this.traceStep;
	progressbar.title = worker.GUIp_i18n.trace_map_progress_step + ' #' + this.traceStep;
	if (!highlightThis(this.traceCoords)) {
		return;
	}
	currentCell = document.querySelector('.new_line.dtrace');
	if (currentCell) {
		currentCell.classList.remove('dtrace');
	}
	mapCells = document.querySelectorAll('.new_line .d_turn');
	for (var i = 0, len = mapCells.length; i < len; i++) {
		if ((mapCells[i].textContent.match(/[0-9]+/) || [])[0] === this.traceStep.toString()) {
			mapCells[i].parentNode.parentNode.classList.add('dtrace');
			break;
		}
	}
	ui_log.traceDir = direction;
};
ui_log.traceMapCalcCoords = function(maxStep) {
	var isStepInCellar = false, isMapInCellar = GUIp.common.isDungeonCellar();
	ui_log.traceCoords = {x: 0, y: 0};
	// this will adjust traceStep in cases an unavailable from this floor step was requested
	for (var i = 0; i < maxStep; i++) {
		// check moving to or from the subfloor (and looking ahead in one step due to the fact it is used with one step lookahead in traceMapProcess())
		if (this.chronicles[i+1] && this.chronicles[i+1].marks.includes('staircase')) {
			isStepInCellar = !isStepInCellar;
		}
		// skip steps on another floor
		if (isStepInCellar !== isMapInCellar) {
			continue;
		}
		if (i >= ui_log.traceStep) {
			ui_log.traceStep = i;
			break;
		}
	}
	// and this one will actually move coordinates for the relevant cell. todo: make the same in one loop
	isStepInCellar = false;
	for (var i = 1; i <= ui_log.traceStep; i++) {
		// check moving to or from the subfloor
		if (this.chronicles[i] && this.chronicles[i].marks.includes('staircase')) {
			isStepInCellar = !isStepInCellar;
		}
		// skip steps on another floor
		if (isStepInCellar !== isMapInCellar) {
			continue;
		}
		if (ui_log.chronicles[i - 1] && ui_log.chronicles[i - 1].wormhole) {
			if (ui_log.chronicles[i - 1].wormholedst) {
				ui_log.traceCoords.y += ui_log.chronicles[i - 1].wormholedst[0];
				ui_log.traceCoords.x += ui_log.chronicles[i - 1].wormholedst[1];
			} else {
				return;
			}
		}
		GUIp.common.moveCoords(ui_log.traceCoords, ui_log.chronicles[i]);
	}
	// actually all of this is quiet sad, it reminds about the obvious necessity to rewrite this feature from scratch to get rid of the awful hackery
};
ui_log.traceMapProgressClick = function(targetStep,max) {
	if (ui_log.traceInt) {
		ui_log.traceMapPause();
	}
	ui_log.traceDir = 1;
	ui_log.traceStep = Math.min(targetStep,max - 1);
	ui_log.traceMapCalcCoords(max);
	ui_log.traceBegin = true; // this hack allows us to start tracing directly on a step with a staircase, otherwise it'll try to skip everything like it was on a different floor
	ui_log.traceMapProcess(1);
};
ui_log.traceMapStart = function() {
	if (this.traceInt) {
		return;
	}
	this.traceInt = GUIp.common.setInterval(function() {
		if (ui_log.traceStep >= document.getElementById('trace_progress').max) {
			ui_log.traceStep = -1;
		}
		ui_log.traceMapProcess(1);
	},500);
	document.querySelectorAll('#trace_button_play img')[0].style.display = 'none';
	document.querySelectorAll('#trace_button_play img')[1].style.display = '';
	document.getElementById('trace_button_play').title = worker.GUIp_i18n.trace_map_pause;
};

ui_log.traceMapPause = function() {
	if (this.traceInt) {
		worker.clearInterval(this.traceInt);
	}
	delete this.traceInt;
	document.querySelectorAll('#trace_button_play img')[1].style.display = 'none';
	document.querySelectorAll('#trace_button_play img')[0].style.display = '';
	document.getElementById('trace_button_play').title = worker.GUIp_i18n.trace_map_start;
};

ui_log.traceMapStop = function() {
	if (this.traceInt) {
		worker.clearInterval(this.traceInt);
		document.querySelectorAll('#trace_button_play img')[1].style.display = 'none';
		document.querySelectorAll('#trace_button_play img')[0].style.display = '';
		document.getElementById('trace_button_play').title = worker.GUIp_i18n.trace_map_start;
	}
	delete this.traceInt;
	delete this.traceStep;
	delete this.traceCoords;
	var cell = document.querySelectorAll('.dmc.dtrace')
	for (var i = 0, len = cell.length; i < len; i++) {
		cell[i].classList.remove('dtrace');
	}
	cell = document.querySelector('.new_line.dtrace')
	if (cell) {
		cell.classList.remove('dtrace');
	}
	document.getElementById('trace_progress').value = 0;
	document.getElementById('trace_progress').title = worker.GUIp_i18n.trace_map_progress_stopped;
};

ui_log.enumerateSteps = function() {
	if (!this.customDomain || document.querySelector('.d_capt .d_turn') || this.logID.length === 6) return;
	var i, len, matches, step, stepholder, steplines = [], dcapt = false,
		chronobox = document.querySelector('#last_items_arena, #fight_chronicle, #m_fight_log'),
		reversed = this.queryString.get1('sort') === 'desc',
		flc = document.getElementById('fight_log_capt') || chronobox.querySelector('.block_h'),
		duel = !flc.textContent.match(/Хроника подземелья|Dungeon Journal/) || location.href.includes('boss=');
	if (!chronobox || !(matches = chronobox.getElementsByClassName('new_line'))) {
		return;
	}
	for (i = 0, len = matches.length; i < len; i++) {
		steplines.push(matches[i]);
	}
	if (reversed) {
		steplines.reverse();
	}
	for (i = 0, step = duel ? 0 : 1, len = steplines.length; i < len; i++) {
		stepholder = steplines[i].getElementsByClassName('d_capt')[0];
		stepholder.title = worker.GUIp_i18n.step_n+step;
		dcapt |= stepholder.textContent.length > 0;
		if ((!reversed && steplines[i].style.length > 0 || reversed && (!steplines[i+1] || steplines[i+1].style.length > 0)) && (!duel || dcapt)) {
			step++;
			dcapt = false;
		}
	}
};

ui_log.describeMap = function() {
	var step, mapCells, currentCell, trapMoveLossCount = 0,
		isJumping = GUIp.common.checkParsedDungeonType(this.dungeonExtras, 'jumping'),
		isStepInCellar = false,
		isMapInCellar = GUIp.common.isDungeonCellar(),
		dmap = document.getElementById('dmap'),
		coords = GUIp.common.calculateExitXY(isMapInCellar),
		steps_max = this.dmapMaxStep(),
		descFailed = false;
	mapCells = document.querySelectorAll('#dmap .dml');
	GUIp.common.dmapTitlesFixup(mapCells);
	if (dmap.classList.contains('e_described')) {
		return;
	}
	if (location.search && this.queryString.get1('efc')) { // corrections were forced from URI
		this.directionlessMoves = {};
		this.wormholeMoves = {};
		var text;
		if ((text = ui_log.queryString.get1('edm'))) {
			text.split(',').forEach(function(a) { a = a.split(':'); ui_log.directionlessMoves[+a[0]] = a[1]; });
		}
		if ((text = ui_log.queryString.get1('ewh'))) {
			text.split(',').forEach(function(a) { a = a.split(':'); ui_log.wormholeMoves[+a[0]] = [-a[2],+a[1]]; });
		}
	}
	this.dungeonGuidedSteps = this.dungeonGuidedSteps || ui_log.storage.getJSON('guidedSteps', true) || {};
	// add the description of the first step to the staircase cell if we're in a basement - to help remind dungeon start conditions
	if (isMapInCellar && mapCells[coords.y] && mapCells[coords.y].children[coords.x]) {
		GUIp.common.describeCell(mapCells[coords.y].children[coords.x],1,steps_max,this.chronicles[1],trapMoveLossCount);
	}
	for (step = 1; step <= steps_max; step++) {
		// check moving to or from the subfloor
		if (this.chronicles[step].marks.includes('staircase')) {
			isStepInCellar = !isStepInCellar;
		}
		// if currently shown map is unrelated to this step - we just don't care and move on till we get again on the proper map
		if (isStepInCellar !== isMapInCellar) {
			GUIp.common.markGuidedSteps.call(this,step,isJumping,mapCells,null);
			continue;
		}
		// we move the coordinates only on the currently shown map, since we have only one map at every moment of time
		if (this.chronicles[step].directionless) {
			this.directionlessMoves = this.directionlessMoves || ui_log.storage.getJSON('dlMoves', true) || {};
			if (this.directionlessMoves[step]) {
				this.chronicles[step].direction = this.corrections[this.directionlessMoves[step]];
			} else {
				Object.assign(this.directionlessMoves,GUIp.common.calculateDirectionlessMove.call(ui_log, coords, step));
				if (this.directionlessMoves[step]) {
					this.chronicles[step].direction = this.corrections[this.directionlessMoves[step]];
					if (!this.customDomain) {
						this.storage.setJSON('dlMoves', this.directionlessMoves, true);
					}
				} else {
					descFailed = true;
				}
			}
			this.chronicles[step].directionless = false;
		}
		// parse guided steps data for reference
		GUIp.common.markGuidedSteps.call(this,step,isJumping,mapCells,coords);
		// move coordinates finally
		GUIp.common.moveCoords(coords, this.chronicles[step]);
		// and check for wormholes
		if (this.chronicles[step].wormhole) {
			this.wormholeMoves = this.wormholeMoves || ui_log.storage.getJSON('whMoves', true) || {};
			if (this.wormholeMoves[step]) {
				this.chronicles[step].wormholedst = this.wormholeMoves[step];
			} else {
				var result = GUIp.common.calculateWormholeMove.call(ui_log, coords, step);
				if (result.wm) {
					this.directionlessMoves = this.directionlessMoves || ui_log.storage.getJSON('dlMoves', true) || {};
					Object.assign(this.wormholeMoves,result.wm);
					Object.assign(this.directionlessMoves,result.dm);
					this.chronicles[step].wormholedst = this.wormholeMoves[step];
					if (!this.customDomain) {
						this.storage.setJSON('whMoves', this.wormholeMoves, true);
						this.storage.setJSON('dlMoves', this.directionlessMoves, true);
					}
				}
			}
			if (this.chronicles[step].wormholedst !== null) {
				if (mapCells[coords.y] && mapCells[coords.y].children[coords.x]) {
					currentCell = mapCells[coords.y].children[coords.x];
					GUIp.common.describeCell(currentCell,step,steps_max,this.chronicles[step],trapMoveLossCount,true);
					if (!currentCell.classList.contains('e_clickable')) {
						currentCell.classList.add('e_clickable');
						GUIp.common.addListener(currentCell, 'click', function() { ui_log.cellClick(this); });
					}
				}
				GUIp.common.debug(
					'moving via wormhole to [' + this.chronicles[step].wormholedst.toString() + '] on step ' + step);
				coords.y += this.chronicles[step].wormholedst[0];
				coords.x += this.chronicles[step].wormholedst[1];
			} else {
				descFailed = true;
			}
		}
		if (!mapCells[coords.y] || !mapCells[coords.y].children[coords.x]) {
			GUIp.common.error(
				'the map does not match parsed chronicle at step #' + step +
				': either direction ("' + this.chronicles[step].direction + '") is invalid or map is out of sync!');
			descFailed = true;
			break;
		}
		currentCell = mapCells[coords.y].children[coords.x];
		if (/[#?]/.test(currentCell.textContent)) {
			GUIp.common.error(
				'parsed chronicle does not match the map at step #' + step +
				': either direction ("' + this.chronicles[step].direction + '") is invalid or map is out of sync!');
			descFailed = true;
			break;
		}
		if (currentCell.textContent.trim() === '✖') {
			this.chronicles[step].chamber = true;
		} else if (currentCell.textContent.trim() === '◿') {
			this.chronicles[step].staircase = true;
		}
		if (!currentCell.classList.contains('e_clickable')) {
			currentCell.classList.add('e_clickable');
			GUIp.common.addListener(currentCell, 'click', function() { ui_log.cellClick(this); });
		}
		if (this.chronicles[step].pointers.length > 0) {
			currentCell.dataset.pointers = this.chronicles[step].pointers.join(' ');
		}
		currentCell.classList.remove('dmv', 'dmh');
		trapMoveLossCount = GUIp.common.describeCell(currentCell,step,steps_max,this.chronicles[step],trapMoveLossCount);
	}
	GUIp.common.debug('directional godvoices count: ' + (Object.keys(this.chronicles).length !== steps_max ? Object.keys(this.dungeonGuidedSteps).filter(function(a) { return +a <= steps_max; }).length + ' (till step ' + steps_max + ')' : Object.keys(this.dungeonGuidedSteps).length));
	if (!this.customDomain) {
		this.storage.setJSON('guidedSteps', this.dungeonGuidedSteps, true);
	}
	var heroesCoords = GUIp.common.calculateXY(document.getElementsByClassName('map_pos')[0]);
	if (heroesCoords.x !== coords.x || heroesCoords.y !== coords.y) {
		GUIp.common.error(
			'chronicle processing failed, coords diff: x: ' + (heroesCoords.x - coords.x) + ', y: ' + (heroesCoords.y - coords.y));
		descFailed = true;
	} else {
		dmap.classList.add('e_described');
	}
	// show that describing the map has failed and allow to input some corrections manually
	var efc = null;
	if (!document.querySelector('.dungeon_corrections') && (descFailed || this.buildMapError || (efc = ui_log.queryString.get1('efc')))) {
		var generateButtons = Object.values(this.chronicles).some(function(a) { return a.marks.includes('longJump') || a.marks.includes('directionless') }),
			correctionsBar = '<div class="dungeon_corrections"><div class="centered">' + (this.buildMapError ? this.buildMapError : (efc && !descFailed ? worker.GUIp_i18n.dungeon_map_failed_manual : worker.GUIp_i18n.dungeon_map_failed)) + '</div>';
		if (generateButtons) {
			correctionsBar += '<div><table><tr>' +
				'<td>' + worker.GUIp_i18n.dungeon_map_failed_dl_label + ':</td>' +
				'<td><input id="dungeon_corrections_dl" type="text" placeholder="' + worker.GUIp_i18n.dungeon_map_failed_dl_title + '" title="' + worker.GUIp_i18n.dungeon_map_failed_list + ' ' + worker.GUIp_i18n.dungeon_map_failed_dl_title + '"></td>' +
				'</tr><tr>' +
				'<td>' + worker.GUIp_i18n.dungeon_map_failed_wh_label + ':</td>' + 
				'<td><input id="dungeon_corrections_wh" type="text" placeholder="' + worker.GUIp_i18n.dungeon_map_failed_wh_title + '" title="' + worker.GUIp_i18n.dungeon_map_failed_list + ' ' + worker.GUIp_i18n.dungeon_map_failed_wh_title + '"></td>' + 
				'</tr><table></div>' +
				'<div class="centered">' + 
				'<button id="dungeon_corrections_reset">' + worker.GUIp_i18n.dungeon_map_failed_reset + '</button> ' + 
				'<button id="dungeon_corrections_apply" disabled>' + worker.GUIp_i18n.dungeon_map_failed_apply + '</button>' + 
				'</div>';
		}
		correctionsBar += '</div>';
		dmap.insertAdjacentHTML('afterend',correctionsBar);
		if (generateButtons) {
			var generateXhref = function() {
				var xhref = [];
				['u','s','sort','preview','estreaming'].forEach(function (a) {
					if (ui_log.queryString.get1(a)) {
						xhref.push(a+'='+ui_log.queryString.get1(a));
					}
				});
				return xhref;
			}
			document.getElementById('dungeon_corrections_dl').value = this.directionlessMoves && Object.keys(this.directionlessMoves).reduce(function(prev,current) {
				prev.push([current,ui_log.directionlessMoves[current]].join(':'));
				return prev;
			}, []).join(',') || '';
			document.getElementById('dungeon_corrections_wh').value = this.wormholeMoves && Object.keys(this.wormholeMoves).reduce(function(prev,current) {
				prev.push([current,ui_log.wormholeMoves[current][1],-ui_log.wormholeMoves[current][0]].join(':'));
				return prev;
			}, []).join(',') || '';
			GUIp.common.addListener(document.getElementById('dungeon_corrections_reset'), 'click', function() {
				document.getElementById('dungeon_corrections_dl').value = document.getElementById('dungeon_corrections_wh').value = '';
				ui_log.storage.remove('dlMoves', true);
				ui_log.storage.remove('whMoves', true);
				location.href = location.pathname + '?' + generateXhref().join('&');
			});
			GUIp.common.addListener(document.getElementById('dungeon_corrections_apply'), 'click', function() {
				var dlValues = [], whValues = [];
				try {
					document.getElementById('dungeon_corrections_dl').value.split(',').forEach(function (a) {
						if (!a) return;
						var c, b = a.split(':').map(function(a) { return a.trim(); });
						if (isNaN(+b[0])) throw 'invalid step: ' + b[0];
						switch (b[1]) {
							case 'n':
							case 'с':
							case 'north':
							case 'север':
								c = 'n';
								break;
							case 'e':
							case 'в':
							case 'east':
							case 'восток':
								c = 'e';
								break;
							case 's':
							case 'ю':
							case 'south':
							case 'юг':
								c = 's';
								break;
							case 'w':
							case 'з':
							case 'west':
							case 'запад':
								c = 'w';
								break;
							default:
								throw 'invalid direction: ' + b[1];
						}
						dlValues.push(+b[0] + ':' + c);
					});
					document.getElementById('dungeon_corrections_wh').value.split(',').forEach(function (a) {
						if (!a) return;
						var b = a.split(':').map(function(a) { return a.trim(); });
						if (isNaN(+b[0])) throw 'invalid step: ' + b[0];
						if (isNaN(+b[1])) throw 'invalid X-shift: ' + b[1];
						if (isNaN(+b[2])) throw 'invalid Y-shift: ' + b[2];
						whValues.push(+b[0] + ':' + +b[1] + ':' + +b[2]);
					});
				} catch (e) {
					GUIp.common.warn('wrong input:',e);
					worker.alert(worker.GUIp_i18n.dungeon_map_failed_parse);
					return;
				}
				var xhref = generateXhref();
				if (dlValues.length) {
					xhref.push('edm='+dlValues.join(','));
				}
				if (whValues.length) {
					xhref.push('ewh='+whValues.join(','));
				}
				xhref.push('efc=1');
				location.href = location.pathname + '?' + xhref.join('&');
			});
			var applyEnabled = function() {
				document.getElementById('dungeon_corrections_apply').disabled = false;
			}
			GUIp.common.addListener(document.getElementById('dungeon_corrections_dl'), 'input', applyEnabled);
			GUIp.common.addListener(document.getElementById('dungeon_corrections_wh'), 'input', applyEnabled);
		}
	}
};

ui_log.cellClick = function(cell) {
	var targetStep, maxSteps = this.dmapMaxStep(),
		cellSteps = cell.title.match(/#(\d+)\b/g);
	if (!cellSteps) {
		return;
	}
	targetStep = parseInt(cellSteps[0].slice(1));
	for (var i = 0, len = cellSteps.length; i < len - 1; i++) {
		if (parseInt(cellSteps[i].slice(1)) === ui_log.traceStep) {
			targetStep = parseInt(cellSteps[i + 1].slice(1));
			break;
		}
	}
	document.getElementById('trace_progress').max = maxSteps;
	ui_log.traceMapProgressClick(targetStep - 1,maxSteps);
	ui_log.scrollTo(document.querySelector('div.new_line.dtrace'));
};

ui_log.highlightTreasuryZone = function() {
	GUIp.common.improveMap.call(
		ui_log, ui_log.isCGM, ui_log.isBroadcast ? 0 : GUIp.common.getDungeonVersion(+ui_log.getStartDate()), ui_log.dmapMaxStep()
	);
};

/**
* params:
* map			array	map cells
* isStreaming	bool	mark that map was got from streaming
* isCGM			bool	mark that map was generated from chronicles
 */
ui_log.restoreDungeonMap = function(params) {
	var dtitle, map_elem, extra = '',
		map = params.map;
	if (
		!Array.isArray(map) ||
		map.length < 1 ||
		map.length > 64 ||
		!Array.isArray(map[0]) ||
		map[0].length < 1 ||
		map[0].length > 64
	) {
		return;
	}
	for (var row = 0; row < map.length; row++) {
		if (!Array.isArray(map[row]) || map[row].length !== map[0].length) {
			return;
		}
		for (var column = 0; column < map[row].length; column++) {
			if (typeof map[row][column] !== 'string' || map[row][column].length > 16) {
				return;
			}
		}
	}
	if (params.isStreaming) {
		extra = ' <span title="' + worker.GUIp_i18n.map_sm + '">(SM)</span>';
	} else if (params.isCGM) {
		extra = ' <span title="' + worker.GUIp_i18n.map_cgm + '">(CGM)</span>';
	}
	if (this.isMobile) {
		dtitle = GUIp.common.escapeHTML(document.querySelector('.ui-bar').textContent.trim());
		map_elem = '<li class="ui-li-static ui-body-inherit ui-last-child"><div id="ar_name" style="text-align:center;margin-bottom:0.4em;">' + dtitle + extra + '</div>';
	} else {
		dtitle = GUIp.common.escapeHTML(document.querySelector('.lastduelpl').textContent.trim());
		map_elem = '<div id="hero2"><div class="box"><div class="block"><div class="block_h">' + worker.GUIp_i18n.map + extra + '</div><div id="ar_name" style="text-align:center;clear:both;padding-top: 0.4em;">' + dtitle + '</div>';
	}
	map_elem += '<div id="dmap" class="new_line em_font">';
	for (var i = 0, ilen = map.length; i < ilen; i++) {
		map_elem += '<div class="dml" style="width:' + (params.map[0].length * 21) + 'px;">';
		for (var j = 0, jlen = map[0].length; j < jlen; j++) {
			var cell = map[i][j],
				demolished = cell.slice(-1) === '*';
			if (demolished) {
				cell = cell.slice(0, -1);
			}
			map_elem += '<div class="dmc' + (cell === '#' ? ' dmw' : '') + (demolished ? ' demolishedWall' : '') + '" style="left:' + (j * 21) + 'px">' + GUIp.common.escapeHTML(cell) + '</div>';
		}
		map_elem += '</div>';
	}
	if (this.isMobile) {
		map_elem += '</div></li>';
		document.querySelector('.li_capt').insertAdjacentHTML('beforebegin', map_elem);
	} else {
		map_elem += '</div></div></div></div>';
		document.getElementById('right_block').insertAdjacentHTML('beforeend', map_elem);
		worker.onscroll = GUIp.common.try2.bind(ui_log, ui_log.onscroll);
		GUIp.common.setTimeout(worker.onscroll, 500);
	}
};

ui_log.createDungeonButtons = function() {
	var $box;
	if ($box = document.getElementById('dmap')) {
		$box.insertAdjacentHTML('afterend', '<div class="trace_div"><progress id="trace_progress" max="0" value="0" title="' + worker.GUIp_i18n.trace_map_progress_stopped + '"></progress><span class="trace_buttons"><button class="trace_button" id="trace_button_prev" title="' + worker.GUIp_i18n.trace_map_prev + '"><img src="' + worker.GUIp_getResource('images/trace_prev.png') + '"/></button><button class="trace_button" id="trace_button_stop" title="' + worker.GUIp_i18n.trace_map_stop + '"><img src="' + worker.GUIp_getResource('images/trace_stop.png') + '"/></button><button class="trace_button" id="trace_button_play" title="' + worker.GUIp_i18n.trace_map_start + '"><img src="' + worker.GUIp_getResource('images/trace_play.png') + '"/><img src="' + worker.GUIp_getResource('images/trace_pause.png') + '" style="display:none;"/></button><button class="trace_button" id="trace_button_next" title="' + worker.GUIp_i18n.trace_map_next + '"><img src="' + worker.GUIp_getResource('images/trace_next.png') + '"/></button></span></div>');
		if (worker.GUIp_browser === 'Opera') {
			worker.GUIp_getResource('images/trace_prev.png',document.querySelector('#trace_button_prev img'),true);
			worker.GUIp_getResource('images/trace_pause.png',document.querySelector('#trace_button_pause img'),true);
			worker.GUIp_getResource('images/trace_stop.png',document.querySelector('#trace_button_stop img'),true);
			worker.GUIp_getResource('images/trace_play.png',document.querySelectorAll('#trace_button_play img')[0],true);
			worker.GUIp_getResource('images/trace_pause.png',document.querySelectorAll('#trace_button_play img')[1],true);
			worker.GUIp_getResource('images/trace_next.png',document.querySelector('#trace_button_next img'),true);
		}
		GUIp.common.addListener(document.getElementById('trace_button_stop'), 'click', ui_log.traceMapStop.bind(ui_log));
		GUIp.common.addListener(document.getElementById('trace_button_play'), 'click', function() {
			if (!ui_log.traceCoords) {
				ui_log.traceStep = -1;
				ui_log.traceDir = 1;
				ui_log.traceCoords = {x: 0, y: 0};
			}
			document.getElementById('trace_progress').max = ui_log.dmapMaxStep();
			if (ui_log.traceInt) {
				ui_log.traceMapPause();
			} else {
				ui_log.traceMapStart();
			}
		});
		GUIp.common.addListener(document.getElementById('trace_button_prev'), 'click', function() {
			if (ui_log.traceInt) {
				ui_log.traceMapPause();
			}
			if (!ui_log.traceCoords || ui_log.traceStep <= 1) {
				return;
			}
			document.getElementById('trace_progress').max = ui_log.dmapMaxStep();
			ui_log.traceMapProcess(-1);
		});
		GUIp.common.addListener(document.getElementById('trace_button_next'), 'click', function() {
			if (ui_log.traceInt) {
				ui_log.traceMapPause();
			}
			if (!ui_log.traceCoords) {
				ui_log.traceStep = -1; // this will make initial coords recalculated
				ui_log.traceDir = 1;
			}
			document.getElementById('trace_progress').max = ui_log.dmapMaxStep();
			if (ui_log.traceStep === Object.keys(ui_log.chronicles).length) {
				return;
			}
			ui_log.traceMapProcess(1);
		});
		var traceProgTimer = null, traceProgCancel = false;
		GUIp.common.addListener(document.getElementById('trace_progress'), 'click', function(e) {
			if (traceProgCancel) {
				traceProgCancel = false;
				return;
			}
			if (this.max === 0) {
				return;
			}
			ui_log.traceMapProgressClick(parseInt(e.offsetX * this.max / this.offsetWidth),this.max);
			ui_log.scrollTo(document.querySelector('div.dtrace'));
		});
		GUIp.common.addListener(document.getElementById('trace_progress'), 'mouseup', function(e) {
			if (traceProgTimer) {
				worker.clearTimeout(traceProgTimer);
			}
		});
		GUIp.common.addListener(document.getElementById('trace_progress'), 'mousedown', function(e) {
			var max = this.max = ui_log.dmapMaxStep();
			if (this.max === 0) {
				return;
			}
			traceProgCancel = false;
			traceProgTimer = GUIp.common.setTimeout(function() {
				var step = parseInt(worker.prompt(worker.GUIp_i18n.trace_map_progress_prompt));
				if (step > 0 && step <= max) {
					ui_log.traceMapProgressClick(step - 1,max);
					ui_log.scrollTo(document.querySelector('div.dtrace'));
				}
				traceProgCancel = true;
			},7e2);
		});
		GUIp.common.addListener(document.getElementById(this.isMobile ? 'items_list' : 'last_items_arena'), 'click', function(ev) {
			var target = ev.target;
			while (!target.classList.contains('d_capt')) {
				if (target === this) return;
				target = target.parentNode;
			}
			var turn = target.getElementsByClassName('d_turn')[0],
				m = (turn && /\d+/.exec(turn.textContent)) || /\d+/.exec(target.title);
			if (!m) return;
			ev.stopPropagation();
			var maxSteps = Object.keys(ui_log.chronicles).length;
			document.getElementById('trace_progress').max = maxSteps;
			ui_log.traceMapProgressClick(+m[0] - 1, maxSteps);
		}, true);
	}
	// no map uploaders are currently supported in mobile versions
	if (this.isMobile) {
		return;
	}
	// erinome preview uploader for modern chronicles with any map present
	$box = document.querySelector('#hero2 fieldset, #hero2 .block') || document.getElementById('right_block')
	if (ui_log.isDungeonLog()) {
		if (!ui_log.queryString.get1('preview')) {
			var previewdiv = document.createElement('div'),
				previewlnk = document.createElement('button');
			previewlnk.textContent = worker.GUIp_i18n.map_preview_share;
			if (ui_log.chronicles[1] && GUIp.common.customRegExp.exec(ui_log.chronicles[1].text)) {
				previewlnk.innerHTML += '</br>(' + worker.GUIp_i18n.map_preview_search + ')';
			}
			previewdiv.className = 'e_map_preview'
			previewdiv.appendChild(previewlnk);
			$box.appendChild(previewdiv);
			GUIp.common.addListener(previewlnk, 'click', ui_log.saverPrepareLog.bind(ui_log, "preview"));
		}
	}
}
var ui_imapext = ui_log.islandsMapExt = {};
(function() {

/**
 * @typedef {Object} GUIp.log.islandsMapExt.Data
 * @property {?Array<number>} map
 * @property {?Object<number, !Array<number>>} layeredMap
 * @property {?Object<number, !Array>} tracks
 * @property {?Array<number>} pois
 * @property {?Object<number, !Array<number>>} layeredPois
 */

var _extract = function(regex, text) {
	var m = regex.exec(text);
	return m && GUIp.common.parseJSON(m[1]);
};

/**
 * @private
 * @param {!Object} obj
 * @param {function(*): boolean} checkValue
 * @returns {boolean}
 */
var _validate = function(obj, checkValue) {
	var keys = Object.keys(obj),
		len = keys.length,
		key = '';
	for (var i = 0; i < len; i++) {
		key = keys[i];
		if (!Number.isSafeInteger(+key) || !checkValue(obj[key])) {
			GUIp.common.warn('invalid key-value pair:', key, '=>', obj[key]);
			return false;
		}
	}
	return !!len;
};

/**
 * @returns {!GUIp.log.islandsMapExt.Data}
 */
ui_imapext.extractData = function() {
	var scripts = document.getElementsByTagName('script'),
		scriptText = '',
		map = null,
		layeredMap = null,
		tracks = null,
		pois = null,
		layeredPois = null,
		a;
	for (var i = 0, len = scripts.length; i < len; i++) {
		scriptText = scripts[i].textContent;
		// map data
		a = _extract(/\bm\s*=\s*(\[[^\]]*\])\s*;/, scriptText);
		if (GUIp.common.isIntegralArray(a) && a.length) {
			map = a;
		}
		// points of interest
		a = _extract(/\bsmh\s*=\s*(\[[^\]]*\])\s*;/, scriptText);
		if (GUIp.common.isIntegralArray(a) && a.length) {
			pois = a;
		}
		// tracks
		if ((a = _extract(/\btr\s*=\s*(\{[^}]*\})\s*;/, scriptText)) && _validate(a, Array.isArray)) {
			tracks = a;
		}
		// layered map data
		if ((a = _extract(/\bmc\s*=\s*(\{[^}]*\})\s*;/, scriptText)) && _validate(a, GUIp.common.isIntegralArray)) {
			layeredMap = a;
		}
		// layered points of interest
		if ((a = _extract(/\bsmhc\s*=\s*(\{[^}]*\})\s*;/, scriptText)) && _validate(a, GUIp.common.isIntegralArray)) {
			layeredPois = a;
		}
	}
	return {map: map, layeredMap: layeredMap, tracks: tracks, pois: pois, layeredPois: layeredPois};
};

/**
 * @private
 * @param {string} s
 * @returns {GUIp.common.islandsMap.Vec}
 */
var _parseVec = function(s) {
	return GUIp.common.islandsMap.vec.make(parseInt(s), +s.slice(s.lastIndexOf('_') + 1));
};

/**
 * @param {!GUIp.common.islandsMap.Model} model
 * @param {!Object<number, !Array>} tracks
 */
ui_imapext.setArksFromTracks = function(model, tracks) {
	var step = model.step - 1,
		pos = 0x0,
		positions, s;
	for (var i = 1; i <= 4; i++) {
		if ((positions = tracks[i]) && (s = positions[step])) {
			pos = _parseVec(String(s));
			if (pos in model.tiles) {
				model.arks[i - 1] = pos;
			} else {
				GUIp.common.warn('invalid position for ark #' + i, 'at step #' + (step + 1) + ':', s);
			}
		}
	}
};

})(); // ui_imapext
var ui_imapwcm = ui_log.islandsMapWCM = {};
(function() {

/**
 * @class
 * @implements {GUIp.common.islandsMap.IMVManager}
 * @param {!Array<!GUIp.common.islandsMap.Model>} models
 * @param {number} step
 * @param {!Object<string, string>} conditions
 */
ui_imapwcm.WholeChronicleMVManager = function(models, step, conditions) {
	var len = models.length,
		lastModel = models[len - 1];
	/**
	 * @readonly
	 * @type {!Array<!GUIp.common.islandsMap.Model>}
	 */
	this.models = models;
	this.model = models[step - 1] || lastModel;
	this.view = null;
	this._mapRadius = GUIp.common.islandsMap.defaults.predictBorderRadius(lastModel, conditions);
	this._expansionRollbackInfo = [];
	this._originalRadiuses = new Int8Array(len);
	for (var i = 0; i < len; i++) {
		this._originalRadiuses[i] = models[i].radius;
	}
};

ui_imapwcm.WholeChronicleMVManager.prototype = {
	constructor: ui_imapwcm.WholeChronicleMVManager,

	replaceModelAndView: function(svg, step) {
		this.model = this.models[step - 1] || this.models[this.models.length - 1];
		this.replaceView(svg);
	},

	replaceView: function(svg) {
		this.view = GUIp.common.islandsMap.domParsers.vFromSVG(svg);
	},

	_createRedrawCaller: function() {
		var model = this.models[0],
			rawModel;
		return function(redraw) {
			if (!rawModel) rawModel = GUIp.common.islandsMap.conv.encode(model);
			redraw(rawModel);
		};
	},

	expandMap: function(fill) {
		var j = 0,
			rollbackIndex = 0,
			model;
		for (var i = 0, len = this.models.length; i < len; i++) {
			model = this.models[i];
			if (i !== j) {
				if (this._mapRadius > model.radius) {
					model.radius = this._mapRadius;
				}
			} else {
				this._expansionRollbackInfo[rollbackIndex] = GUIp.common.islandsMap.mtrans.expand(
					model,
					this._mapRadius,
					fill,
					this._expansionRollbackInfo[rollbackIndex] || null
				);
				j += 10;
				rollbackIndex++;
			}
		}
		return this._createRedrawCaller();
	},

	unexpandMap: function() {
		var j = 0,
			rollbackIndex = 0;
		for (var i = 0, len = this.models.length; i < len; i++) {
			if (i !== j) {
				this.models[i].radius = this._originalRadiuses[i];
			} else {
				GUIp.common.islandsMap.mtrans.unexpand(this.models[i], this._expansionRollbackInfo[rollbackIndex++]);
				j += 10;
			}
		}
		this._expansionRollbackInfo.length = 0;
		return this._createRedrawCaller();
	}
};

/**
 * @param {!GUIp.log.islandsMapExt.Data} extracted
 * @returns {number}
 */
var _getSteps = function(extracted) {
	var steps = 0,
		n = 0,
		track;
	for (var i = 1; i <= 4; i++) {
		if ((track = extracted.tracks[i]) && (n = track.length) > steps) {
			steps = n;
		}
	}
	return steps + 1; // there are no arks on the map on the last step
};

/**
 * @private
 * @param {!GUIp.common.islandsMap.Model} model
 * @param {!GUIp.log.islandsMapExt.Data} extracted
 * @param {number} step
 */
var _decodeAndAdd = function(model, extracted, step) {
	var a;
	if ((a = extracted.layeredMap[step])) {
		GUIp.common.islandsMap.conv.decodeAndAddTiles(model, a);
	}
	if (extracted.layeredPois && (a = extracted.layeredPois[step])) {
		GUIp.common.islandsMap.conv.decodeAndAddPois(model, a);
	}
};

/**
 * @private
 * @param {!Object<GUIp.common.islandsMap.Vec, number>} from
 * @param {!Object<GUIp.common.islandsMap.Vec, number>} to
 */
var _rematerialize = function(from, to) {
	for (var key in from) {
		if (!(key in to)) {
			to[key] = from[key];
		}
	}
};

var _migrateWhirlpools = function(from, to) {
	var len = to.whirlpools.length;
	if (len) {
		GUIp.common.replaceArrayTail(to.whirlpools, len, from.whirlpools);
	} else {
		to.whirlpools = from.whirlpools;
	}
};

var _migrateBeasties = function(to, oldArr, newArr) {
	var pos = 0x0;
	for (var i = 0, len = oldArr.length; i < len; i++) {
		pos = oldArr[i];
		// contrary to whirlpools, beasties can disappear from the map
		if ((to.tiles[pos] | 0x20) === 0x62) { // Bb
			newArr.push(pos);
		}
	}
};

var _migrateZonalHints = function(from, to) {
	['thermos', 'leviathanHints'].forEach(function(type) {
		var i = 0,
			j = 0,
			len = from[type].length,
			jlen = to[type].length,
			zh;
		if (!jlen) {
			to[type] = from[type];
			return;
		}
outer:
		for (i = 0; i < len; i++) {
			zh = from[type][i];
			for (j = 0; j < jlen; j++) {
				if (zh.pos === to[type][j].pos) {
					continue outer;
				}
			}
			to[type].push(zh);
		}
	});
};

/**
 * @param {!GUIp.log.islandsMapExt.Data} extracted
 * @param {number} step
 * @param {!Object<string, string>} conditions
 * @returns {!GUIp.log.islandsMapWCM.WholeChronicleMVManager}
 */
ui_imapwcm.create = function(extracted, step, conditions) {
	var oldModel = new GUIp.common.islandsMap.Model(1),
		models = [oldModel],
		rematerializationStep = 10,
		newModel;
	_decodeAndAdd(oldModel, extracted, 1);
	if (oldModel.port === 0x8080) {
		GUIp.common.islandsMap.mtrans.guessPort(oldModel);
	}
	ui_imapext.setArksFromTracks(oldModel, extracted.tracks);
	for (var i = 1, steps = _getSteps(extracted); i < steps; i++) {
		newModel = new GUIp.common.islandsMap.Model(i + 1);
		if (i !== rematerializationStep) {
			newModel.tiles = Object.create(oldModel.tiles);
		}
		newModel.radius = oldModel.radius;
		newModel.borderRadius = oldModel.borderRadius;
		newModel.nonBorderRadius = oldModel.nonBorderRadius;
		_decodeAndAdd(newModel, extracted, i + 1);
		if (i === rematerializationStep) {
			// we re-create `tiles` hash map from scratch every 10 steps to avoid long prototype chains.
			// number 10 was chosen since it's a square root of 100 (maximal number of steps in a sailing).
			//
			// more formally, assuming:
			// n = number of steps,
			// m = number of visible tiles on the last step,
			// t = total number of unique tiles,
			//
			// we have a data structure with operations:
			// getTile(step, pos): O(sqrt(n))
			// setTile(step, pos, tile): O(sqrt(n))
			// memory consumption: O(t + m * sqrt(n))
			_rematerialize(oldModel.tiles, newModel.tiles);
			rematerializationStep += 10;
		}
		if (newModel.port === 0x8080) {
			if (oldModel.port in newModel.tiles) {
				newModel.port = oldModel.port;
			} else {
				GUIp.common.islandsMap.mtrans.guessPort(newModel);
			}
		}
		ui_imapext.setArksFromTracks(newModel, extracted.tracks);
		_migrateWhirlpools(oldModel, newModel);
		_migrateBeasties(newModel, oldModel.beasties, newModel.beasties);
		_migrateBeasties(newModel, oldModel.roamingBeasties, newModel.roamingBeasties);
		_migrateZonalHints(oldModel, newModel);
		GUIp.common.islandsMap.mtrans.migrate(oldModel, newModel);
		models[i] = oldModel = newModel;
	}
	return new ui_imapwcm.WholeChronicleMVManager(models, step, conditions);
};

})(); // ui_imapwcm
/**
 * Find an element suitable for inserting custom controls before it, or null.
 *
 * @param {boolean} [aboveDelimiter=false]
 * @returns {HTMLElement}
 */
ui_log.islandsMapGetAnchor = function(aboveDelimiter) {
	var mapAnchor = document.getElementsByClassName('c_center')[0] || document.getElementById('h_tbl');
	return mapAnchor && ((aboveDelimiter && mapAnchor.previousSibling) || mapAnchor);
};

/**
 * Insert the element before the chronicle anchor.
 *
 * @param {!HTMLElement} elem
 * @param {boolean} [aboveDelimiter=false]
 * @returns {boolean} true iff succeeds.
 */
ui_log.islandsMapInsertElement = function(elem, aboveDelimiter) {
	var mapAnchor = this.islandsMapGetAnchor(aboveDelimiter);
	return !!(mapAnchor && mapAnchor.insertAdjacentElement('beforebegin', elem));
};

/**
 * Insert the HTML before the chronicle anchor.
 *
 * @param {string} html
 * @param {boolean} [aboveDelimiter=false]
 * @returns {boolean} true iff succeeds.
 */
ui_log.islandsMapInsertHTML = function(html, aboveDelimiter) {
	var mapAnchor = this.islandsMapGetAnchor(aboveDelimiter);
	if (!mapAnchor) {
		return false;
	}
	mapAnchor.insertAdjacentHTML('beforebegin', html);
	return true;
};

ui_log.improveSailChronicles = function() {
	GUIp.common.sailing.describeBeastiesOnPage('.new_line, .d_msg:not(.parsed)', null,
		ui_log.storage.getList('Option:islandsMapSettings').includes('bhp')
	);
};

/** @namespace */
ui_log.islandsMap = new function() {
	var imap = this;

	/**
	 * @private
	 * @type {!Object<string, string>}
	 */
	imap._conditions = {};

	/** @type {?GUIp.common.islandsMap.IMVManager} */
	imap.manager = null;

	imap._svg = null;

	/**
	 * @private
	 * @type {?MutationObserver}
	 */
	imap._observer = null;

	/**
	 * @private
	 * @type {?function(!GUIp.common.islandsMap.conv.RawModel)}
	 */
	imap._redrawMap = null;

	imap._curExpansion = 0; // 0 (none), 1 (borders), or 2 (fill)

	/** @type {boolean} */
	Object.defineProperty(imap, 'canRedraw', {configurable: true, get: function() { return !!imap._redrawMap; }});

	var _getCurrentStep = function() {
		var node, m;
		return (
			(node = document.getElementById('turn_num')) && +node.textContent
		) || (
			(node = document.getElementById('fight_log_capt')) && (m = /\d+/.exec(node.textContent)) && +m[0]
		) || 0;
	};

	/**
	 * @private
	 * @param {!GUIp.log.islandsMapExt.Data} extracted
	 * @returns {?GUIp.common.islandsMap.conv.RawModel}
	 */
	var _tryCreateRawModel = function(extracted) {
		var map = extracted.map,
			pois = extracted.pois;
		if (!map) {
			// load the model from the local storage (for broadcast page) unless it is disabled in the settings
			return ui_log.storage.getList('Option:islandsMapSettings').includes('conv') ? (
				ui_log.storage.getJSON('model', true)
			) : null;
		}
		if (!pois) {
			// check if the Chronicle Archive tells us points of interest
			pois = GUIp.common.isIntegralArray(worker.e_islandsMapPoints) && e_islandsMapPoints.length ? (
				e_islandsMapPoints
			) : GUIp.common.islandsMap.conv.guessPOIsFromMap(map);
		}
		return GUIp.common.islandsMap.conv.createRawModel(
			_getCurrentStep(), map, GUIp.common.islandsMap.conv.ejectArksFromMap(map), pois
		);
	};

	/**
	 * @private
	 * @param {!Object<number, !Array>} tracks
	 * @returns {!Object<string, string>}
	 */
	var _mergeTracks = function(tracks) {
		var result = {},
			keys = Object.keys(tracks).sort(),
			key = '',
			positions;
		for (var i = 0, len = keys.length; i < len; i++) {
			key = keys[i];
			positions = tracks[key];
			for (var j = 0, jlen = positions.length; j < jlen; j++) {
				result[positions[j]] = key;
			}
		}
		return result;
	};

	/**
	 * @private
	 * @param {!Object<number, !Array>} tracks
	 * @returns {?function(!GUIp.common.islandsMap.conv.RawModel)}
	 */
	var _tryCreateMapRedrawer = function(tracks) {
		var hexer, mergedTracks;
		if (!ui_log.customDomain) {
			return null; // do not ever try to redraw a map on the original domain
		} else if (typeof worker.exported_map_reload === 'function') {
			return function(rawModel) {
				exported_map_reload(rawModel.map);
			};
		} else if (typeof worker.Hexer === 'function') {
			hexer = new Hexer;
			mergedTracks = _mergeTracks(tracks);
			return function(rawModel) {
				hexer.draw_smap($('#sail_map'), rawModel.map, {}, 0, '', mergedTracks, rawModel.pois);
			};
		} else if (typeof worker.make_map_log === 'function') {
			mergedTracks = _mergeTracks(tracks);
			return function(rawModel) {
				make_map_log($('#sail_map'), rawModel.map, {}, 0, '', mergedTracks);
			};
		}
		return null;
	};

	/**
	 * @private
	 * @returns {!Object<string, string>}
	 */
	var _extractConditions = function() {
		// load from the local storage
		var conditions = ui_log.storage.get('conds2', true),
			data;
		if (conditions != null) {
			return conditions ? GUIp.common.parseJSON(conditions) : Object.create(null);
		}

		// check if we're watching a stream
		data = worker.gReporterClientData; // see superhero/improver.js#reporter.collect
		if (data && (data = data.erinome) && Array.isArray(data.conditions2)) {
			return data.conditions2;
		}

		// parse ourselves
		conditions = GUIp.common.sailing.tryExtractConditions();
		if (conditions != null) {
			return GUIp.common.sailing.parseConditions(conditions);
		}

		GUIp.common.warn('cannot detect sailing conditions, assuming there are none');
		return Object.create(null);
	};

	/**
	 * @private
	 * @param {!GUIp.log.islandsMapExt.Data} extracted
	 * @returns {?GUIp.common.islandsMap.Model}
	 */
	var _tryCreateModel = function(extracted) {
		var rawModel = _tryCreateRawModel(extracted),
			model;
		if (!rawModel) return null;
		model = GUIp.common.islandsMap.conv.decode(rawModel);
		if (extracted.tracks) {
			ui_imapext.setArksFromTracks(model, extracted.tracks);
		}
		return model;
	};

	/**
	 * @private
	 * @param {!GUIp.log.islandsMapExt.Data} extracted
	 * @param {!Object<string, string>} conditions
	 * @returns {!GUIp.common.islandsMap.IMVManager}
	 */
	var _createManager = function(extracted, conditions) {
		var mger;
		if (extracted.layeredMap && extracted.tracks) {
			return ui_imapwcm.create(extracted, _getCurrentStep(), conditions);
		}
		mger = new GUIp.common.islandsMap.MigratingMVManager(_tryCreateModel(extracted));
		mger.conditions = conditions;
		return mger;
	};

	/**
	 * @param {string} type
	 */
	imap.changeHintDrawer = function(type, disableLH) {
		var cimap = GUIp.common.islandsMap;
		cimap.vtrans.hintManager.drawer = cimap.vtrans.createHintDrawer(
			imap.manager.model,
			imap.manager.view,
			type,
			{whirlpoolZoneRadius: cimap.defaults.getWhirlpoolZoneRadius(imap._conditions), leviathanPortDistance: imap._conditions.small ? 5 : 9, disableLeviathanHints: disableLH}
		);
	};

	var _rollbackModifications = function(svg) {
		if (svg === imap._svg) {
			GUIp.common.islandsMap.defaults.vTransUnbindAll(imap.manager.model, imap.manager.view, imap.manager.conditions);
		} else {
			imap._svg = svg;
		}
	};

	/**
	 * @param {!Array<string>} mapSettings
	 * @returns {number}
	 */
	imap.getExpansionLevel = function(mapSettings) {
		return mapSettings.includes('mbc') ? mapSettings.includes('mfc') ? 2 : 1 : 0;
	};

	var _changeExpansion = function(expansionLevel) {
		var caller;
		if (expansionLevel < imap._curExpansion) {
			caller = imap.manager.unexpandMap();
			imap._curExpansion = 0;
		}
		if (expansionLevel > imap._curExpansion) {
			caller = imap.manager.expandMap(expansionLevel === 2);
			imap._curExpansion = expansionLevel;
		}
		if (caller) {
			caller(imap._redrawMap);
			imap.manager.view = null;
		}
	};

	var _replaceView = function(svg) {
		imap._svg = svg;
		imap.manager.replaceView(svg);
	};

	/**
	 * @private
	 * @param {!Element} mapContainer
	 */
	var _applyModifications = function(mapContainer) {
		var settings = ui_log.storage.getList('Option:islandsMapSettings');
		mapContainer.classList.toggle('e_monochrome', settings.includes('mch'));
		GUIp.common.islandsMap.defaults.vTransBindAll(
			imap.manager.model,
			imap.manager.view,
			imap._conditions,
			settings,
			false
		);
		GUIp.common.sailing.showConditionsOnMap(mapContainer, imap._conditions);
		GUIp.common.tooltips.watchSubtreeSVG(document.getElementById('map_wrap') || mapContainer);
	};

	/**
	 * @param {number} expansionLevel
	 */
	imap.changeExpansion = function(expansionLevel) {
		var mapContainer = GUIp.common.sailing.tryFindMapBlock();
		// at the moment, `_redrawMap` always creates an SVG from scratch so rolling back is not necessary.
		// uncomment when this becomes not the case.
		// _rollbackModifications(imap._svg);
		_changeExpansion(expansionLevel);
		_replaceView(mapContainer.getElementsByTagName('svg')[0]);
		_applyModifications(mapContainer);
		imap._observer.takeRecords();
	};

	var _onMapMutation = function() {
		var mapContainer = GUIp.common.sailing.tryFindMapBlock(),
			svg = mapContainer.getElementsByTagName('svg')[0];
		_rollbackModifications(svg);
		imap.manager.replaceModelAndView(svg, _getCurrentStep());
		_applyModifications(mapContainer);
	};

	/**
	 * @private
	 * @param {!Array<string>} settings
	 */
	var _loadPOIColors = function(settings) {
		var colors;
		if (!settings.includes('rndc')) {
			return;
		}
		colors = ui_log.storage.getJSON('poiColors', true);
		if (GUIp.common.isIntegralArray(colors)) {
			GUIp.common.islandsMap.vtrans.poiColorizer.colors = colors;
		} else {
			GUIp.common.shuffleArray(GUIp.common.islandsMap.vtrans.poiColorizer.colors);
		}
	};

	/**
	 * @param {!Element} mapContainer
	 * @param {!Object<string, boolean>} settings
	 */
	var _finishInitialization = function(mapContainer, settings) {
		_loadPOIColors(settings);
		_applyModifications(mapContainer);
		imap._observer = GUIp.common.islandsMap.observer.create(_onMapMutation);
		// in streams, #s_map itself is replaced on each step, not just its contents
		imap._observer.observe(
			ui_log.isStream ? mapContainer.parentNode : mapContainer,
			{childList: true, subtree: true}
		);
	};

	/**
	 * @private
	 * @returns {!Object<number, number>}
	 */
	var _getHP150 = function() {
		var result = {},
			nodes = document.getElementsByClassName('ple');
		for (var i = 0, len = nodes.length; i < len; i++) {
			if (nodes[i].textContent.includes('150')) {
				result[i + 1] = 1;
			}
		}
		return result;
	};

	/**
	 * @param {function(!Element)} onMapPresent
	 * @param {*} [thisArg]
	 */
	imap.prepare = function(onMapPresent, thisArg) {
		var extracted = ui_imapext.extractData(),
			mapContainer, settings, svgs;
		imap._redrawMap = _tryCreateMapRedrawer(extracted.tracks || {});
		imap._conditions = _extractConditions();
		imap.manager = _createManager(extracted, imap._conditions);

		if ((mapContainer = GUIp.common.sailing.tryFindMapBlock())) {
			// the map is already here. it's either a finished chronicle, or a live stream.
			settings = ui_log.storage.getList('Option:islandsMapSettings');
			svgs = mapContainer.getElementsByTagName('svg');
			imap._svg = svgs[0];
			if (!imap.manager.model) {
				imap.manager.replaceModelAndView(imap._svg, _getCurrentStep());
			}
			if (imap.canRedraw) {
				_changeExpansion(imap.getExpansionLevel(settings));
			}
			if (!imap.manager.view) {
				_replaceView(svgs[0]);
			}
			GUIp.common.try2.call(thisArg, onMapPresent, mapContainer);
			_finishInitialization(mapContainer, settings);
		} else if (imap.manager.model) {
			// we're on a broadcast page - draw a map ourselves
			GUIp.common.loadDomainScript('sail_packaged.js',
				function() {
					return typeof worker.HS2 === 'function';
				},
				function() {
					var rawModel, mapContainer;
					if (!ui_log.islandsMapInsertHTML('<div id="sail_map"></div>')) {
						throw new Error('cannot insert a map');
					}

					rawModel = GUIp.common.islandsMap.conv.encode(imap.manager.model);
					GUIp.common.islandsMap.conv.putArksOntoMap(rawModel);
					try {
						new HS2().s(
							// {!Array<number>} map
							rawModel.map,
							// {!Object<number, !Array<number>>} layeredMap
							{},
							// {!Object<number, !Array<string>>} tracks
							{},
							// {!Array<number>} pois
							rawModel.pois,
							// {!Object<number, !Array<number>>} layeredPois
							{},
							// {!Object<number, number>} hp150
							_getHP150(),
							// {number} step
							rawModel.step,
							// {!Object<number, !Object<number, number>>} hp
							{},
							// {!Object<number, !Object<number, string>>} cargo
							{}
						);
					} catch (e) {
						GUIp.common.error('map builder failed:', e);
						return;
					}

					if (!(mapContainer = GUIp.common.sailing.tryFindMapBlock())) {
						throw new Error('#sail_map got lost after creating a map'); // evil HS2...
					}
					_replaceView(mapContainer.getElementsByTagName('svg')[0]);
					GUIp.common.try2.call(thisArg, onMapPresent, mapContainer);
					_finishInitialization(mapContainer, ui_log.storage.getList('Option:islandsMapSettings'));
				},
				function() {
					GUIp.common.error('cannot load the map builder');
				}
			);
		} else {
			// we're on a broadcast page but don't have a map
			GUIp.common.info('no data to build a map with');
		}
	};
};

ui_log.islandsMapCreateRuler = function() {
	var container = document.createElement('div');
	container.className = 'e_ruler_button_wrap';
	container.innerHTML = '<span id="e_ruler_button" class="e_emoji e_emoji_ruler eguip_font" title="' +
		GUIp_i18n.sail_ruler +
	'">📏</span>';
	GUIp.common.islandsMap.vtrans.rulerManager.init(container.lastChild);
	return container;
};

/**
 * @class
 */
ui_log.IslandsMapOptionBox = function() {
	/** @type {!Element} */
	this.container = document.createElement('div');
	this.container.className = 'e_option_box';
	/**
	 * @private
	 * @type {!Object<string, !HTMLInputElement>}
	 */
	this._group = {};
	var mapSettings = ui_log.storage.getList('Option:islandsMapSettings');
	if (ui_log.islandsMap.canRedraw) {
		this.container.appendChild(this._createOption('mbc', mapSettings));
		this.container.appendChild(document.createTextNode(' '));
		this.container.appendChild(this._createOption('mfc', mapSettings));
		this.container.appendChild(document.createTextNode(' '));
	}
	this.container.appendChild(this._createOption('shh', mapSettings));
};

ui_log.IslandsMapOptionBox.prototype = {
	constructor: ui_log.IslandsMapOptionBox,

	/**
	 * @private
	 * @param {string} optionName
	 */
	_onClick: function(optionName) {
		var settings = ui_log.storage.getList('Option:islandsMapSettings'),
			checked = this._group[optionName].checked,
			needsRedrawing = false,
			index = -1;
		if (checked) {
			if (!settings.includes(optionName)) {
				settings.push(optionName);
			}
		} else {
			GUIp.common.linearRemove(settings, optionName);
		}

		switch (optionName) {
			case 'mbc':
				if (!checked && (index = settings.indexOf('mfc')) >= 0) {
					settings.splice(index, 1);
					this._group.mfc.checked = false;
				}
				needsRedrawing = true;
				break;

			case 'mfc':
				if (checked && !settings.includes('mbc')) {
					settings.push('mbc');
					this._group.mbc.checked = true;
				}
				needsRedrawing = true;
				break;

			case 'shh':
				ui_log.islandsMap.changeHintDrawer(
					checked ? 'polylinear' : settings.includes('newhints') ? 'tileMarking' : 'tileMarkingOld',
					settings.includes('dlh')
				);
				break;
		}

		ui_log.storage.set('Option:islandsMapSettings', settings);
		if (needsRedrawing) {
			ui_log.islandsMap.changeExpansion(ui_log.islandsMap.getExpansionLevel(settings));
		}
	},

	/**
	 * @private
	 * @param {string} optionName
	 * @param {!Array<string>} mapSettings
	 * @returns {!Element}
	 */
	_createOption: function(optionName, mapSettings) {
		var checkbox = this._group[optionName] = document.createElement('input');
		checkbox.type = 'checkbox';
		if (mapSettings.includes(optionName)) {
			checkbox.checked = true;
		}
		GUIp.common.addListener(checkbox, 'click', this._onClick.bind(this, optionName));

		var label = document.createElement('label');
		label.textContent = worker.GUIp_i18n['islands_map_' + optionName];
		label.insertAdjacentElement('afterbegin', checkbox);
		return label;
	}
};

/**
 * @returns {!Element}
 */
ui_log.islandsMapCreateOptionBox = function() {
	return new this.IslandsMapOptionBox().container;
};
var ui_lmining = ui_log.mining = {};
(function() {

var grdigest = ui_lmining.grdigest = {};
(function() {

/**
 * @typedef {Array<!Array<number>>} GUIp.log.mining.grdigest.MapGroupDigest
 */

/**
 * Find positions where maps differ. However, if there are only 2 maps, find only their first difference.
 *
 * @private
 * @param {!Array<!GUIp.common.mining.Map>} maps
 * @returns {!Array<number>}
 */
var _findDiffIndices = function(maps) {
	var diffIndices = [],
		firstMap = maps[0],
		ref = 0x0,
		jlen = maps.length;
	if (jlen >= 2) {
		for (var i = 0, len = firstMap.length; i < len; i++) {
			ref = firstMap[i];
			for (var j = 1; j < jlen; j++) {
				if (maps[j][i] !== ref) {
					diffIndices.push(i);
					if (jlen === 2) return diffIndices;
					break;
				}
			}
		}
	}
	return diffIndices;
};

/**
 * @param {!Array<!GUIp.common.mining.Map>} maps
 * @returns {!GUIp.log.mining.grdigest.MapGroupDigest}
 */
grdigest.create = function(maps) {
	var result = [],
		diffIndices = _findDiffIndices(maps),
		len = maps.length,
		jlen = diffIndices.length,
		map, reduced;
	for (var i = 0; i < len; i++) {
		map = maps[i];
		reduced = result[i] = [];
		// keep only those elements that are listed in diffIndices
		for (var j = 0; j < jlen; j++) {
			reduced[j] = map[diffIndices[j]];
		}
	}
	result[len] = diffIndices;
	return result;
};

/**
 * @param {!GUIp.log.mining.grdigest.MapGroupDigest} mapGroupDigest
 * @param {!HTMLCollection} cells
 * @returns {number} Map's index in the group the digest was created for.
 */
grdigest.recognize = function(mapGroupDigest, cells) {
	var candidatesLen = mapGroupDigest.length - 1,
		candidates = new Float64Array(candidatesLen),
		diffIndices = mapGroupDigest[candidatesLen],
		i = 0,
		j = 0,
		len = 0,
		cell = 0x0;
	for (j = 1; j < candidatesLen; j++) {
		candidates[j] = j;
	}
	for (i = 0, len = diffIndices.length; candidatesLen > 1 && i < len; i++) {
		cell = GUIp.common.mining.parseMapCell(cells[diffIndices[i]]);
		for (j = 0; j < candidatesLen; j++) {
			if (mapGroupDigest[candidates[j]][i] !== cell) {
				candidates[j--] = candidates[--candidatesLen];
			}
		}
	}
	return candidates[0];
};

})(); // ui_log.mining.grdigest
var analysis = ui_lmining.analysis = {};
(function() {

/**
 * @typedef {Object} GUIp.log.mining.analysis.BossStats
 * @property {!Array<number>} collected - Indexed by frame number.
 * @property {!Array<number>} pushes - Indexed by frame number.
 * @property {!Array<number>} encouragements - Indexed by frame number.
 * @property {!Array<number>} punishments - Indexed by frame number.
 * @property {!Array<number>} miracles - Indexed by frame number.
 * @property {!Array<number>} createdBits - Indexed by frame number.
 * @property {!Array<number>} successSteps
 */

/**
 * @typedef {Object} GUIp.log.mining.analysis.Model
 * @property {number} bitsPerByte
 * @property {!Array<!GUIp.log.mining.analysis.BossStats>} bossStats
 * @property {!Array<number>} initialBits - Indexed by frame number.
 * @property {!Array<number>} freeUnlockedBits - Indexed by frame number.
 * @property {!Array<number>} freeLockedBits - Indexed by frame number.
 * @property {!Array<number>} synthesizedBits - Indexed by frame number.
 * @property {!Array<number>} destroyedBits - Indexed by frame number.
 * @property {!Array<number>} destroyedUndiscoveredBits - Indexed by frame number.
 * @property {!Array<number>} firstFrame - Indexed by step number.
 * @property {!Array<!GUIp.log.mining.grdigest.MapGroupDigest>} mapGroupDigests - Indexed by step number.
 */

/**
 * @private
 * @typedef {Object} GUIp.log.mining.analysis._Context
 * @property {boolean} noFoggedBits
 * @property {boolean} canSnatchBits
 * @property {number} mapWidth
 * @property {!GUIp.common.mining.Map} oldMap
 * @property {!Array<number>} oldPos
 * @property {!Array<number>} oldHP
 * @property {number} createdBits
 * @property {number} expectedActor
 * @property {!Array<number>} nextAliveBoss
 * @property {{lower: number, upper: number}} boundaries - If `lower <= cur < upper`, can do `cur += step`.
 * @property {{overflownFoggedCells: number, overflownBits: number}} flight
 * @property {!Int8Array} hadSkullAt
 * @property {!Array<number>} skulls
 */

// map legend can be found in common/mining.js
var _charCodes = {
	'?': 0x1,
	'#': 0x2,
	'$': 0x3,
	'*': 0x4,
	'⁂': 0x5,
	'+': 0x6,
	'x': 0x7,
	'A': 0x8,
	'B': 0x9,
	'C': 0xA,
	'D': 0xB,
	'💀': 0x40
};

var _markerCharCodes = {
	'e': 0x10,
	'p': 0x20,
	'm': 0x30
};

var _trailCharCodes = {
	'💀': 0x40,
	'⇡': 0x080,
	'⇢': 0x180,
	'⇣': 0x280,
	'⇠': 0x380
};

/**
 * @param {!Array<!Array<(string|!Array<?string>)>>} rows
 * @returns {!GUIp.common.mining.Map}
 */
analysis.parseStoredMap = function(rows) {
	var map = [],
		k = 0,
		charCodes = _charCodes,
		row, cell;
	for (var i = 0, len = rows.length; i < len; i++) {
		row = rows[i];
		for (var j = 0, jlen = row.length; j < jlen; j++) {
			cell = row[j];
			map[k++] = typeof cell === 'string' ? (
				charCodes[cell] | 0
			) : cell ? (
				charCodes[cell[0]] | _trailCharCodes[cell[1]] | _markerCharCodes[cell[2]]
			) : 0x0; // ' '
		}
	}
	return map;
};

var _parseStoredHP = function(hp) {
	return [hp.A, hp.B, hp.C, hp.D];
};

/**
 * @private
 * @param {!GUIp.log.mining.analysis.BossStats} bossStats
 * @param {number} fi - Frame index.
 * @param {{A: number, B: number, C: number, D: number}} collected
 */
var _addCollected = function(bossStats, fi, collected) {
	bossStats[0].collected[fi] = collected.A;
	bossStats[1].collected[fi] = collected.B;
	bossStats[2].collected[fi] = collected.C;
	bossStats[3].collected[fi] = collected.D;
};

/**
 * @private
 * @param {number} bitsPerByte
 * @returns {!GUIp.log.mining.analysis.Model}
 */
var _createModel = function(bitsPerByte) {
	var bossStats = [];
	for (var i = 0; i < 4; i++) {
		bossStats[i] = {
			collected: [0],
			pushes: [0],
			encouragements: [0],
			punishments: [0],
			miracles: [0],
			createdBits: [0],
			successSteps: []
		};
	}
	return {
		bitsPerByte: bitsPerByte,
		bossStats: bossStats,
		initialBits: [0],
		freeUnlockedBits: [0],
		freeLockedBits: [0],
		synthesizedBits: [0],
		destroyedBits: [0],
		destroyedUndiscoveredBits: [0],
		firstFrame: [0],
		mapGroupDigests: [[[], []]]
	};
};

/**
 * @private
 * @param {!Array} initialFrame
 * @param {!Object<string, boolean>} conditions
 * @returns {!GUIp.log.mining.analysis._Context}
 */
var _createContext = function(initialFrame, conditions) {
	var mapRows = initialFrame[1],
		map = analysis.parseStoredMap(mapRows);
	return {
		noFoggedBits: false,
		canSnatchBits: !!conditions.snatching,
		mapWidth: (mapRows[0] && mapRows[0].length) || 1,
		oldMap: map,
		oldPos: [-1, -1, -1, -1],
		oldHP: _parseStoredHP(initialFrame[2]),
		createdBits: 0,
		expectedActor: 0,
		nextAliveBoss: [1, 2, 3, 0],
		boundaries: {lower: 0, upper: 0},
		flight: {overflownFoggedCells: 0, overflownBits: 0},
		hadSkullAt: new Int8Array(map.length),
		skulls: []
	};
};

/**
 * @private
 * @param {!GUIp.log.mining.analysis.Model} md
 * @param {!GUIp.log.mining.analysis._Context} ctx
 */
var _processInitialState = function(md, ctx) {
	var map = ctx.oldMap,
		unlocked = 0,
		locked = 0,
		cell = 0x0;
	for (var p = 0, plen = map.length; p < plen; p++) {
		cell = map[p];
		if ((cell & 0xF) === 0x3) { // wall with bits
			locked += 2;
		} else if ((cell & 0xE) === 0x4) { // bits
			unlocked += (cell & 0xF) - 0x3;
		} else if ((cell & 0xC) === 0x8) { // a boss
			ctx.oldPos[cell & 0x3] = p;
		}
	}
	md.initialBits[0] = unlocked + locked;
	md.freeUnlockedBits[0] = unlocked;
	md.freeLockedBits[0] = locked;
	// if we see lots of locked bits on the 1st step, it must be the special condition
	ctx.noFoggedBits = locked >= 32;
};

/**
 * @private
 * @param {!GUIp.log.mining.analysis._Context} ctx
 * @param {!GUIp.common.mining.Map} newMap
 * @param {!Array<number>} newHP
 * @returns {number} Bit mask: bosses who could have acted in this frame.
 */
var _determinePossibleActors = function(ctx, newMap, newHP) {
	var p = 0,
		cur = 0x0,
		mask =
			(newHP[0] !== ctx.oldHP[0]) |
			(newHP[1] !== ctx.oldHP[1]) << 1 |
			(newHP[2] !== ctx.oldHP[2]) << 2 |
			(newHP[3] !== ctx.oldHP[3]) << 3;
	for (var i = 0; i < 4; i++) {
		p = ctx.oldPos[i];
		if (p >= 0) {
			cur = newMap[p];
			// set bit if we either moved from here or got a different divine marker than before
			mask |= ((cur & 0xC) !== 0x8 || (cur & 0x30 && (cur & 0x30) !== (ctx.oldMap[p] & 0x30))) << i;
		}
	}
	return mask;
};

/**
 * @private
 * @param {!GUIp.log.mining.analysis._Context} ctx
 * @param {number} possibleActors
 * @returns {number}
 */
var _guessActor = function(ctx, possibleActors) {
	var actor = 0;
	switch (possibleActors) {
		case 0x1: return 0;
		case 0x2: return 1;
		case 0x4: return 2;
		case 0x8: return 3;
		case 0x0:
			// nobody did anything. either it was the turn of a dead boss, or some stupid boss just stayed there, idle.
			return (
				// here we exploit the fact that dead boss's `nextAliveBoss` property stays constant
				(ctx.oldHP[0] <= 0 && ctx.nextAliveBoss[0] === ctx.expectedActor) ||
				(ctx.oldHP[1] <= 0 && ctx.nextAliveBoss[1] === ctx.expectedActor) ||
				(ctx.oldHP[2] <= 0 && ctx.nextAliveBoss[2] === ctx.expectedActor) ||
				(ctx.oldHP[3] <= 0 && ctx.nextAliveBoss[3] === ctx.expectedActor)
			) ? -1 : ctx.expectedActor;
	}
	// 2 (or more?) possible actors. select one that is closer to the expected.
	actor = ctx.expectedActor;
	while (!(possibleActors & 1 << actor)) {
		actor = ctx.nextAliveBoss[actor];
	}
	return actor;
};

/**
 * @private
 * @param {number} possibleActors
 * @param {number} actor
 * @returns {number}
 */
var _getAssistant = function(possibleActors, actor) {
	if (actor >= 0) {
		switch (possibleActors & ~(1 << actor)) {
			case 0x1: return 0;
			case 0x2: return 1;
			case 0x4: return 2;
			case 0x8: return 3;
		}
	}
	return -1;
};

/**
 * @private
 * @param {!Array<number>} oldPos
 * @param {!GUIp.common.mining.Map} newMap
 * @param {number} actor
 * @param {number} assistant
 * @returns {boolean}
 */
var _wasPushingUsed = function(oldPos, newMap, actor, assistant) {
	var trail = newMap[oldPos[actor]] & 0x380;
	// if two bosses collided, check that they flew in the same direction
	return !!trail && (assistant < 0 || (newMap[oldPos[assistant]] & 0x380) === trail);
};

/**
 * @private
 * @param {number} curCell
 * @param {number} prevCell
 * @param {boolean} pushed
 * @returns {boolean}
 */
var _wasInfluenceUsed = function(curCell, prevCell, pushed) {
	// precondition: curCell & 0x30
	// there are a few cases that this code misses. some of them are checked later.
	return !!((curCell ^ prevCell) & 0x30) || ( // there was a different divine marker or no marker at all; or
		(curCell & 0xC) === 0x4 && ( // there is a bit, medkit, or thruster, and
			!(prevCell & 0xF) || // it was either an empty cell before (perhaps, with a skull), or
			(pushed && (prevCell & 0xC) === 0x8) // there was a boss that got pushed away
		)
	);
};

/**
 * @private
 * @param {number} oldCell
 * @param {!GUIp.common.mining.Map} oldMap
 * @param {number} newPos
 * @param {!Array<number>} collected
 * @param {number} fi - Frame index.
 * @returns {boolean}
 */
var _wasBitSynthesized = function(oldCell, oldMap, newPos, collected, fi) {
	var expected = collected[fi - 1];
	if (newPos >= 0) {
		switch (oldMap[newPos] & 0xF) {
			case 0x3: case 0x5: expected += 2; break; // bits
			case 0x4: expected++; break; // bit
		}
	}
	return (oldCell & 0xF) === 0x4 && collected[fi] >= expected;
};

/**
 * @private
 * @param {!GUIp.log.mining.analysis._Context} ctx
 * @param {number} pos
 * @param {number} dir
 * @param {{lower: number, upper: number}} boundaries - To be assigned.
 * @returns {number} Step.
 */
var _setupNavigator = function(ctx, pos, dir, boundaries) {
	var mapWidth = ctx.mapWidth,
		totalLen = ctx.oldMap.length;
	switch (dir) {
		case 0x080: // north
			boundaries.lower = mapWidth;
			boundaries.upper = totalLen;
			return -mapWidth;
		case 0x180: // east
			boundaries.lower = 0;
			boundaries.upper = pos - pos % mapWidth + mapWidth - 1;
			return 1;
		case 0x280: // south
			boundaries.lower = 0;
			boundaries.upper = totalLen - mapWidth;
			return mapWidth;
		case 0x380: // west
			boundaries.lower = pos - pos % mapWidth + 1;
			boundaries.upper = totalLen;
			return -1;
	}
	throw new Error('invalid direction: ' + dir);
};

/**
 * @private
 * @param {!GUIp.common.mining.Map} oldMap
 * @param {!GUIp.common.mining.Map} newMap
 * @param {number} pos
 * @param {number} step
 * @param {{lower: number, upper: number}} boundaries
 * @param {{overflownFoggedCells: number, overflownBits: number}} flight - To be assigned.
 * @returns {number} Destination position.
 */
var _trackAliveBossFlight = function(oldMap, newMap, pos, step, boundaries, flight) {
	var lower = boundaries.lower,
		upper = boundaries.upper,
		cur = newMap[pos],
		prev = 0x0,
		ofc = 0,
		ob = 0;
	while ((cur & 0xC) !== 0x8 && pos >= lower && pos < upper) { // until we find the boss
		pos += step;
		cur = newMap[pos];
		prev = oldMap[pos] & 0xF;
		if (prev === 0x1) { // fog of war
			ofc++;
		} else if ((prev & 0xE) === 0x4 && (cur & 0xE) !== 0x4) { // unlocked bits
			ob += prev - 0x3;
		}
	}
	flight.overflownFoggedCells = ofc;
	flight.overflownBits = ob;
	return pos;
};

/**
 * @private
 * @param {!GUIp.log.mining.analysis._Context} ctx
 * @param {!GUIp.common.mining.Map} newMap
 * @param {number} pos
 * @param {number} dir
 * @param {number} step
 * @param {{lower: number, upper: number}} boundaries
 * @param {number} forbiddenPos
 * @param {{overflownFoggedCells: number, overflownBits: number}} flight - To be assigned.
 * @returns {number} Destination position.
 */
var _trackDeadBossFlight = function(ctx, newMap, pos, dir, step, boundaries, forbiddenPos, flight) {
	var oldMap = ctx.oldMap,
		lower = boundaries.lower,
		upper = boundaries.upper,
		cur = 0x0,
		prev = 0x0,
		ofc = 0,
		ob = 0,
		skullPos = -1,
		destPos = pos,
		prevOFC = 0,
		prevOB = 0;
	while (
		pos >= lower && pos < upper &&
		(pos += step) !== forbiddenPos && // must not fly over forbidden cell
		((cur = newMap[pos]) & 0x380) === dir && // while the arrow stays the same
		(cur & 0xC) !== 0x8 // until we find another boss
	) {
		if (cur & 0x40) { // a skull
			flight.overflownFoggedCells = ofc;
			flight.overflownBits = ob;
			if (!ctx.hadSkullAt[pos]) return pos;
			skullPos = pos;
		}
		destPos = pos; // this variable is necessary because we can leave the loop with or without incrementing `pos`
		prevOFC = ofc;
		prevOB = ob;
		prev = oldMap[pos] & 0xF;
		if (prev === 0x1) { // fog of war
			ofc++;
		} else if ((prev & 0xE) === 0x4 && (cur & 0xE) !== 0x4) { // unlocked bits
			ob += prev - 0x3;
		}
	}
	if (skullPos >= 0) return skullPos;
	// we exclude the destination cell here
	flight.overflownFoggedCells = prevOFC;
	flight.overflownBits = prevOB;
	return destPos;
};

var _updateExpectedActor = function(ctx, curActor) {
	var next = ctx.nextAliveBoss[curActor];
	if (ctx.oldHP[next] <= 0) { // oops, it's not alive any more
		do {
			next = ctx.nextAliveBoss[next];
		} while (ctx.oldHP[next] <= 0 && next !== curActor);
		ctx.nextAliveBoss[curActor] = next;
	}
	ctx.expectedActor = next;
};

var _processFrame = (function() {

var _discoveredInitialBits = 0,
	_pickedUpInitialBits = 0,
	_unlockedBits = 0,
	_lockedBits = 0,
	_synthesizedBits = 0,
	_destroyedBits = 0,
	_destroyedUndiscoveredBits = 0,
	_usedInfluence = 0x0;

/**
 * @private
 * @param {!GUIp.log.mining.analysis.Model} md
 * @param {!GUIp.log.mining.analysis._Context} ctx
 * @param {!GUIp.common.mining.Map} newMap
 * @param {boolean} pushed
 * @returns {!Array<number>} Positions of bosses on the new map.
 */
var _scanMap = function(md, ctx, newMap, pushed) {
	var newPos = [-1, -1, -1, -1],
		fi = md.freeUnlockedBits.length, // frame index
		oldMap = ctx.oldMap,
		cur = 0x0,
		prev = 0x0,
		tmp = 0x0,
		collected;
	for (var p = 0, plen = newMap.length; p < plen; p++) {
		cur = newMap[p];
		prev = oldMap[p];
		tmp = cur & 0xF;
		if (tmp >= 0x3 && tmp <= 0x5) { // bits
			if (tmp === 0x3) { // wall with bits
				_lockedBits += 2;
			} else {
				_unlockedBits += tmp - 0x3;
			}
			if ((prev & 0xF) === 0x1 && !(cur & 0x30)) { // bits without divine marker appeared in the fog of war
				_discoveredInitialBits += tmp === 0x4 ? 1 : 2;
			}
		} else if ((cur & 0xC) === 0x8) { // a boss
			newPos[cur & 0x3] = p;
			if ((prev & 0xF) === 0x1 && // fog of war
				(tmp = (collected = md.bossStats[cur & 0x3].collected)[fi] - collected[fi - 1]) > 0
			) {
				_pickedUpInitialBits += tmp;
			}
		} else if ((tmp = prev & 0xF) >= 0x3 && tmp <= 0x5) { // bits
			_destroyedBits += tmp === 0x4 ? 1 : 2;
		} else if (cur & 0x40 && tmp === 0x1 && !ctx.noFoggedBits) { // a skull appeared in the fog of war
			_destroyedUndiscoveredBits += 2;
		}
		if (cur & 0x40) { // a skull
			ctx.skulls.push(p);
		}
		if (cur & 0x30 && _wasInfluenceUsed(cur, prev, pushed)) { // divine marker
			_usedInfluence = cur & 0x30;
		}
	}
	return newPos;
};

/**
 * @private
 * @param {!GUIp.log.mining.analysis.Model} md
 * @param {!GUIp.log.mining.analysis._Context} ctx
 * @param {!GUIp.common.mining.Map} newMap
 * @param {!Array<number>} newPos
 * @param {!Array<number>} newHP
 * @param {number} actor
 * @param {number} assistant
 */
var _handleRegularStep = function(md, ctx, newMap, newPos, newHP, actor, assistant) {
	var fi = md.freeUnlockedBits.length, // frame index
		actorPos = 0,
		marker = 0x0;
	if (assistant >= 0) {
		if (_wasBitSynthesized(
			newMap[ctx.oldPos[actor]], ctx.oldMap, newPos[actor], md.bossStats[actor].collected, fi
		)) {
			_synthesizedBits++;
		}
		if (_wasBitSynthesized(
			newMap[ctx.oldPos[assistant]], ctx.oldMap, newPos[assistant], md.bossStats[assistant].collected, fi
		)) {
			_synthesizedBits++;
		}
	} else if (!_usedInfluence && // we have not detected influence yet
		actor >= 0 && (actorPos = newPos[actor]) >= 0 && // actor is alive
		(marker = newMap[actorPos] & 0x30) && // it currently has a divine marker
		!(ctx.oldMap[actorPos] & 0x4F) && // it came to a cell that was empty (without even a skull)
		newHP[actor] !== ctx.oldHP[actor] // but its health changed for some reason
	) {
		_usedInfluence = marker;
		// known bugs:
		// * we can miss influence if an object is placed on a skull with an existing marker and the actor collects
		//   it in that very frame;
		// * we can miss encouragement if a repair kit is placed on an existing marker, the actor collects it
		//   in that very frame but already has maximal health;
		// * we can miss punishment if a thruster is placed on an existing marker, the actor collects it in that
		//   very frame and dies on it;
		// * we can miss influence if an object is placed on an existing marker, then two bosses collide, and
		//   the actor lands on this newly created object - all of that in the same frame.
	}
};

/**
 * @private
 * @param {!GUIp.log.mining.analysis.Model} md
 * @param {!GUIp.log.mining.analysis._Context} ctx
 * @param {!GUIp.common.mining.Map} newMap
 * @param {!Array<number>} newPos
 * @param {number} boss
 * @param {boolean} pushed
 * @param {number} forbiddenPos
 */
var _handleSnatchflightFor = function(md, ctx, newMap, newPos, boss, pushed, forbiddenPos) {
	var srcPos = ctx.oldPos[boss],
		srcCell = newMap[srcPos],
		destPos = newPos[boss],
		died = destPos < 0,
		step = _setupNavigator(ctx, srcPos, srcCell & 0x380, ctx.boundaries),
		collected = md.bossStats[boss].collected,
		destWasFogged = true,
		bitsAtDest = 0,
		foggedBits = 0,
		covertBits = 0;
	if (died) {
		destPos = _trackDeadBossFlight(
			ctx, newMap, srcPos, srcCell & 0x380, step, ctx.boundaries, forbiddenPos, ctx.flight
		);
		bitsAtDest = ctx.oldMap[destPos];
		destWasFogged = (bitsAtDest & 0xF) === 0x1; // fog of war
		bitsAtDest = destWasFogged ? 2 : (bitsAtDest & 0xE) === 0x4 ? (bitsAtDest & 0xF) - 0x3 : 0 // unlocked bits
	} else {
		_trackAliveBossFlight(ctx.oldMap, newMap, srcPos, step, ctx.boundaries, ctx.flight);
	}

	foggedBits = ctx.flight.overflownFoggedCells * 2;
	covertBits = collected[collected.length - 1] - collected[collected.length - 2] - ctx.flight.overflownBits;
	// caution: dark magic ahead
	if (covertBits >= 0) {
		if (!pushed && (srcCell & 0xF) === 0x4) { // a bit was dropped
			if (!destWasFogged && !foggedBits && covertBits === bitsAtDest - 1) {
				return; // the boss dropped a bit, then picked up the bit(s) at destination, then died
			}
			_synthesizedBits++;
		}
		if (died) {
			if (destWasFogged && !foggedBits && covertBits === 1) {
				// the boss picked up one fogged bit at destination, then died
				_pickedUpInitialBits++;
				return;
			} else if (covertBits >= foggedBits + bitsAtDest) {
				// the boss picked up all bits on its path, including destination cell, then died
				_pickedUpInitialBits += foggedBits + destWasFogged * 2;
				return;
			}
		}
		if (covertBits > bitsAtDest) {
			_pickedUpInitialBits += Math.min(covertBits - bitsAtDest, foggedBits);
		}
	}
	if (died && (newMap[destPos] & 0xE) !== 0x4) { // the boss died, and there were no bits left on its corpse
		if (!destWasFogged && covertBits < bitsAtDest) {
			// the bits at destination were certainly destroyed
			_destroyedBits += bitsAtDest;
		} else {
			// the bits at destination might be destroyed if there were bits on the boss's path
			// in the fog of war; or there were no bits at destination at all
			_destroyedUndiscoveredBits += bitsAtDest;
		}
	}
};

/**
 * @private
 * @param {!GUIp.log.mining.analysis.Model} md
 * @param {!GUIp.log.mining.analysis._Context} ctx
 * @param {!GUIp.common.mining.Map} newMap
 * @param {!Array<number>} newPos
 * @param {number} actor
 * @param {number} assistant
 * @param {boolean} pushed
 */
var _handleSnatchflight = function(md, ctx, newMap, newPos, actor, assistant, pushed) {
	// we got these variables wrong, need to recalculate them
	_pickedUpInitialBits = _synthesizedBits = _destroyedBits = _destroyedUndiscoveredBits = 0;
	_handleSnatchflightFor(md, ctx, newMap, newPos, actor, pushed, assistant >= 0 ? ctx.oldPos[assistant] : -1);
	if (assistant >= 0) {
		_handleSnatchflightFor(md, ctx, newMap, newPos, assistant, pushed, -1);
	}
};

/**
 * @private
 * @param {!GUIp.log.mining.analysis.Model} md
 * @param {!GUIp.log.mining.analysis._Context} ctx
 * @param {number} actor
 * @param {boolean} pushed
 */
var _updateModel = function(md, ctx, actor, pushed) {
	var fi = md.freeUnlockedBits.length, // frame index
		created = 0,
		stat;
	md.initialBits[fi] = md.initialBits[fi - 1] + _discoveredInitialBits + _pickedUpInitialBits;
	md.freeUnlockedBits[fi] = _unlockedBits;
	md.freeLockedBits[fi] = _lockedBits;
	md.synthesizedBits[fi] = md.synthesizedBits[fi - 1] + _synthesizedBits;
	md.destroyedBits[fi] = md.destroyedBits[fi - 1] + _destroyedBits;
	md.destroyedUndiscoveredBits[fi] = md.destroyedUndiscoveredBits[fi - 1] + _destroyedUndiscoveredBits;
	for (var boss = 0; boss < 4; boss++) {
		stat = md.bossStats[boss];
		stat.pushes[fi] = stat.pushes[fi - 1];
		stat.encouragements[fi] = stat.encouragements[fi - 1];
		stat.punishments[fi] = stat.punishments[fi - 1];
		stat.miracles[fi] = stat.miracles[fi - 1];
		stat.createdBits[fi] = stat.createdBits[fi - 1];
		if (boss === actor) {
			if (pushed) stat.pushes[fi]++;
			switch (_usedInfluence) {
				case 0x10: stat.encouragements[fi]++; break;
				case 0x20: stat.punishments[fi]++; break;
				case 0x30: stat.miracles[fi]++; break;
			}
			created =
				_unlockedBits + _lockedBits +
				md.bossStats[0].collected[fi] +
				md.bossStats[1].collected[fi] +
				md.bossStats[2].collected[fi] +
				md.bossStats[3].collected[fi] +
				md.destroyedBits[fi] -
				(md.initialBits[fi] + md.synthesizedBits[fi]);
			// known bugs:
			// * we can mistake `initial` for `synthesized` if a boss flew to the fog of war (and survived);
			// * we can miss `created` (or attribute it to a wrong god) if a bit was created on a corpse
			//   and hidden under it (this has been fixed in Godville but can still occur in old logs);
			// * we can miss `synthesized` if a bit was dropped onto a corpse and hidden under it (ditto);
			// * we can mistake `destroyed` for `created` (yes, we're able to deduce that the number of created bits
			//   is negative) if a boss with 2+[7] bits collected a pair: only 1 bit is picked up in that case, while
			//   another is destroyed;
			// * we can wrongly decrease `created` as long as a boss with 3 bosscoins is staying on a bit (that bit
			//   is not destroyed but simply hidden under the boss);
			// * if some other crazy case occurs, it will affect `created` since it's a calculated parameter.
			stat.createdBits[fi] += created - ctx.createdBits;
			ctx.createdBits = created;
		}
	}
};

/**
 * @private
 * @param {!GUIp.log.mining.analysis.Model} md
 * @param {!GUIp.log.mining.analysis._Context} ctx
 * @param {!Array} frame
 * @returns {!GUIp.common.mining.Map}
 */
return function _processFrame(md, ctx, frame) {
	var newMap = analysis.parseStoredMap(frame[1]),
		newHP = _parseStoredHP(frame[2]),
		possibleActors = _determinePossibleActors(ctx, newMap, newHP),
		actor = _guessActor(ctx, possibleActors),
		assistant = _getAssistant(possibleActors, actor),
		pushed = actor >= 0 && _wasPushingUsed(ctx.oldPos, newMap, actor, assistant),
		newPos;
	_discoveredInitialBits = _pickedUpInitialBits = _unlockedBits = _lockedBits = _synthesizedBits =
	_destroyedBits = _destroyedUndiscoveredBits = 0;
	_usedInfluence = 0x0;
	ctx.skulls.length = 0;
	_addCollected(md.bossStats, md.freeUnlockedBits.length, frame[4]);
	// process the map
	newPos = _scanMap(md, ctx, newMap, pushed);
	if ((pushed || assistant >= 0) && ctx.canSnatchBits) {
		// trivial processing performed by `_scanMap` is insufficient for handling bits that were snatched on the fly
		_handleSnatchflight(md, ctx, newMap, newPos, actor, assistant, pushed);
	} else if (!pushed) {
		_handleRegularStep(md, ctx, newMap, newPos, newHP, actor, assistant);
	}
	// update model
	_updateModel(md, ctx, actor, pushed);
	// update context
	ctx.oldHP = newHP;
	if (actor >= 0) {
		_updateExpectedActor(ctx, actor);
		// when dead boss A makes its no-turn, all markers disappear from the map for 1 step for some reason. this makes
		// our influence detection code give false positives. thus we only update the context with the new map for those
		// steps where somebody acted.
		ctx.oldMap = newMap;
	}
	ctx.oldPos = newPos;
	for (var i = 0, len = ctx.skulls.length; i < len; i++) {
		ctx.hadSkullAt[ctx.skulls[i]] = 1;
	}
	return newMap;
};

})(); // _processFrame

/**
 * @private
 * @param {!GUIp.log.mining.analysis.Model} md
 * @param {!GUIp.log.mining.analysis._Context} ctx
 * @param {!Array<!Array>} frameGroup
 */
var _processFrameGroup = function(md, ctx, frameGroup) {
	var si = md.firstFrame.length, // step index
		fi = md.freeUnlockedBits.length, // frame index
		prevStepLastFI = fi - 1,
		maps = [],
		i = 0,
		groupLen = frameGroup.length,
		firstActor = -1,
		lastActor = -1,
		stat;
	md.firstFrame[si] = fi;
	for (i = 0; i < groupLen; i++) {
		maps[i] = _processFrame(md, ctx, frameGroup[i]);
		if (si === 2) {
			// in ancient datamines, the order in which bosses acted had been chosen randomly at the start. we need
			// to detect it. at those times, not all bosses might act on the 1st step so we check the 2nd step instead
			// (assuming that incorrect ordering will not get in our way during the processing of first two steps).
			lastActor = lastActor !== -1 ? (
				(ctx.nextAliveBoss[lastActor] = (ctx.expectedActor + 3) & 0x3)
			) : (firstActor = (ctx.expectedActor + 3) & 0x3);
		}
	}
	if (si === 2) ctx.nextAliveBoss[lastActor] = firstActor;
	md.mapGroupDigests[si] = grdigest.create(maps);

	fi = md.freeUnlockedBits.length - 1;
	for (i = 0; i < 4; i++) {
		stat = md.bossStats[i];
		if (Math.floor(stat.collected[fi] / md.bitsPerByte) * md.bitsPerByte > stat.collected[prevStepLastFI]) {
			stat.successSteps.push(si);
		}
	}
};

/**
 * @param {!Array<!Array<!Array>>} frameGroups
 * @param {number} bitsPerByte
 * @param {!Object<string, boolean>} conditions
 * @returns {!GUIp.log.mining.analysis.Model}
 */
analysis.processFrameGroups = function(frameGroups, bitsPerByte, conditions) {
	var md = _createModel(bitsPerByte),
		ctx = _createContext(frameGroups[0][0], conditions);
	_processInitialState(md, ctx);
	for (var i = 1, steps = frameGroups.length; i < steps; i++) {
		_processFrameGroup(md, ctx, frameGroups[i]);
	}
	return md;
};

})(); // ui_log.mining.analysis
var dom = ui_lmining.dom = {};

/**
 * @returns {!Array<!Array<!Array>>} [step, map, hp, hpDiff, bits]
 */
dom.extractFrameGroups = function() {
	var regex = /\bd\s*=\s*(\[\[\[.*?\]\]\])\s*;/;
	return ui_log.extractFromScripts(regex);
};

/**
 * @returns {number}
 */
dom.getBitsPerByte = function() {
	var rx = /\[.*?\]/;
	// there will be no bracketed part if a boss has collected 3 bosscoins
	return (
		rx.exec(document.getElementById('pl_a_l').textContent) ||
		rx.exec(document.getElementById('pl_b_l').textContent) ||
		rx.exec(document.getElementById('pl_c_l').textContent) ||
		rx.exec(document.getElementById('pl_d_l').textContent)
	)[0].length - 2;
};

/**
 * @returns {string}
 */
dom.getSpecialCondition = function() {
	var node = document.getElementById('rah');
	return node ? node.textContent : '';
};

/**
 * @param {!GUIp.log.mining.analysis.Model} md
 * @returns {number}
 */
dom.getCurrentFrameIndex = function(md) {
	var si = +document.getElementById('turn_num').textContent - 1;
	return md.firstFrame[si] + grdigest.recognize(md.mapGroupDigests[si], document.getElementsByClassName('rmc'));
};
var visualization = ui_lmining.visualization = {};
(function() {

/**
 * @private
 * @param {!GUIp.log.mining.analysis.Model} md
 * @param {number} fi - Frame index
 * @returns {string}
 */
var _generateBitsSummary = function(md, fi) {
	var unlocked = md.freeUnlockedBits[fi],
		locked = md.freeLockedBits[fi],
		a = md.bossStats[0].collected[fi],
		b = md.bossStats[1].collected[fi],
		c = md.bossStats[2].collected[fi],
		d = md.bossStats[3].collected[fi],
		initial = md.initialBits[fi],
		synthesized = md.synthesizedBits[fi],
		destroyed = md.destroyedBits[fi],
		destroyedUndiscovered = md.destroyedUndiscoveredBits[fi],
		ac = md.bossStats[0].createdBits[fi],
		bc = md.bossStats[1].createdBits[fi],
		cc = md.bossStats[2].createdBits[fi],
		dc = md.bossStats[3].createdBits[fi],
		created = ac + bc + cc + dc,
		s = GUIp_i18n.bits_summary +
			'<abbr title="' + GUIp_i18n.fmt('bits_free', unlocked + ' + ' + locked) + '">' +
			(unlocked + locked) +
			'</abbr> + <abbr title="' +
				GUIp_i18n.fmt('bits_collected', a + '\xA0+\xA0' + b + '\xA0+\xA0' + c + '\xA0+\xA0' + d) +
			'">' + (a + b + c + d) +
			'</abbr> = <abbr title="' + (
				synthesized + created + destroyed + destroyedUndiscovered ? GUIp_i18n.bits_initial : GUIp_i18n.bits_total
			) + '">' +
			initial +
			(destroyedUndiscovered ? '</abbr>…' + (initial + destroyedUndiscovered) : '</abbr>');
	if (synthesized) {
		s += ' + <abbr title="' + GUIp_i18n.bits_synthesized + '">' +
			synthesized +
			'</abbr>';
	}
	if (created) {
		s += ' + <abbr title="' +
			GUIp_i18n.fmt('bits_created', ac + '\xA0+\xA0' + bc + '\xA0+\xA0' + cc + '\xA0+\xA0' + dc) +
			'">' + created + '</abbr><sup>=</sup>';
	}
	if (destroyed + destroyedUndiscovered) {
		s += ' − <abbr title="' + GUIp_i18n.bits_destroyed + '">' +
			destroyed +
			(destroyedUndiscovered ? '</abbr>…' + (destroyed + destroyedUndiscovered) : '</abbr>');
	}
	return s;
};

/**
 * @private
 * @param {!GUIp.log.mining.analysis.Model} md
 * @param {!GUIp.log.mining.analysis.BossStats} stat
 * @param {number} fi - Frame index
 * @returns {string}
 */
var _generateBossActionsSummary = function(md, stat, fi) {
	var s = '',
		i = 0,
		n = 0;
	if ((n = stat.pushes[fi])) {
		s = '<span title="' + GUIp_i18n.rmap_pushes + '">' + n + '<sup style="font-size: 1.01em;">⇵</sup></span>';
	}
	if ((n = stat.encouragements[fi])) {
		if (s) s += ', ';
		s += '<span title="' + GUIp_i18n.rmap_encouragements + '">' + n + '<sup>+</sup></span>';
	}
	if ((n = stat.punishments[fi])) {
		if (s) s += ', ';
		s += '<span title="' + GUIp_i18n.rmap_punishments + '">' + n + '<sup>−</sup></span>';
	}
	if ((n = stat.miracles[fi])) {
		if (s) s += ', ';
		s += '<span title="' + GUIp_i18n.rmap_miracles + '">' + n + '<sup>=</sup></span>';
	}
	if ((n = stat.collected[fi]) >= md.bitsPerByte) {
		n /= md.bitsPerByte;
		if (s) s += ' | ';
		s += '<span title="' + GUIp_i18n.rmap_success_steps + '"><sup>•</sup>' + (stat.successSteps[0] + 1);
		for (i = 2; i <= n; i++) {
			s += ', <sup>•</sup>' + (stat.successSteps[i - 1] + 1);
		}
		s += '</span>';
	}
	return s;
};

visualization._model = null;
visualization._summaryNode = null;
visualization._bossActionsNodes = [];

var _updateExtraInfo = function() {
	var md = visualization._model,
		fi = dom.getCurrentFrameIndex(md);
	visualization._summaryNode.innerHTML = _generateBitsSummary(md, fi);
	for (var i = 0; i < 4; i++) {
		visualization._bossActionsNodes[i].innerHTML = _generateBossActionsSummary(md, md.bossStats[i], fi);
	}
};

visualization.init = function() {
	var map = document.getElementsByClassName('wrmap')[0];
	if (!map) return;
	if (ui_log.storage.getList('Option:rangeMapSettings').includes('grid')) {
		map.classList.add('e_rmap_grid');
	}
	map.parentNode.insertAdjacentHTML('beforeend',
		'<div class="e_bits_summary"><a href="#">' + GUIp_i18n.rmap_more_info + '</a></div>'
	);
	visualization._summaryNode = map.parentNode.lastChild;
	GUIp.common.addListener(visualization._summaryNode.firstChild, 'click', function(ev) {
		var table = document.getElementById('h_tbl'),
			i = 0,
			nodes;
		ev.preventDefault();
		visualization._model = analysis.processFrameGroups(
			dom.extractFrameGroups(),
			dom.getBitsPerByte(),
			GUIp.common.mining.parseConditions(dom.getSpecialCondition())
		);
		for (i = 0; i < 4; i++) {
			visualization._bossActionsNodes[i] = document.createElement('div');
			visualization._bossActionsNodes[i].className = 'e_boss_actions_summary';
		}
		_updateExtraInfo();
		table.classList.add('e_detailed');
		nodes = table.getElementsByClassName('c1');
		for (i = 0; i < 4; i++) {
			nodes[i].appendChild(visualization._bossActionsNodes[i]);
		}
		GUIp.common.newMutationObserver(_updateExtraInfo).observe(map, {childList: true, subtree: true});
		GUIp.common.tooltips.watchSubtree(visualization._summaryNode);
	});
};

})(); // ui_log.mining.visualization

ui_lmining.init = visualization.init;

})();
ui_log.saverSendLog = function() {
	var i, div = document.createElement('div'), inputs = '<input type="hidden" name="bosses_count" value="' + ui_log.saverBossesCnt + '"><input type="hidden" name="log_id" value="' + (ui_log.saverURL.includes('gdvl.tk/') && ui_log.logID.length >= 8 ? ui_log.logID.slice(0,5) : ui_log.logID) + '">';
	for (i = 0; i < ui_log.saverPages.length; i++) {
		inputs += '<input type="hidden" name="' + i + '">';
	}
	if (ui_log.islandsMap.manager && ui_log.islandsMap.manager.rawModel && ui_log.islandsMap.manager.rawModel.pois.length) {
		inputs += '<input type="hidden" name="poi" value="' + ui_log.islandsMap.manager.rawModel.pois + '">';
	}
	inputs += '<input type="hidden" name="tzo" value="' + (new Date()).getTimezoneOffset() + '">';
	if (ui_log.saverPreview) {
		if (ui_log.isDungeonLog) {
			var ndm, ndoc = new DOMParser().parseFromString(ui_log.saverPages[0], "text/html"),
				nsteps, nheader = ndoc.querySelector('#fight_log_capt, #last_items_arena .block_h, #fight_chronicle .block_h, #m_fight_log .block_h, .step_capt');
			if (nheader && /Dungeon Journal|Хроника подземелья/.test(nheader.textContent) && (nsteps = +GUIp.common.matchRegex(/(?:шаг|step)\s*(?:\w*\s*\/\s*)?(\d+)/, nheader.textContent, 0)) === ui_log.steps) {
				ui_log.saverPreview.dmap = Array.from(document.querySelectorAll('#dmap .dml'))
					.map(function(l) { return Array.from(l.querySelectorAll('.dmc'))
						.map(function(c) { return [c.textContent.trim(), c.className, c.title]; }); // we need the already parsed map cause right now we're lazy enough to avoid parsing it on the server-side
					});
				if (ui_log.chronicles[1] && (ndm = GUIp.common.customRegExp.exec(ui_log.chronicles[1].text))) {
					ui_log.saverPreview.dm = GUIp.common.findNonEmptyCapture(ndm) || '-';
				} else {
					ui_log.saverPreview.dm = null;
				}
				ui_log.saverPreview.bc = ui_log.isBroadcast;
				ui_log.saverPreview.date = ui_log.isBroadcast ? Date.now() : +ui_log.getStartDate();
				ui_log.saverPreview.steps = nsteps;
			} else {
				ui_log.saverRemoveLoader();
				if (worker.confirm(worker.GUIp_i18n.map_preview_stale)) {
					worker.location.reload();
				}
				return;
			}
		}
		inputs += '<input type="hidden" name="preview">';
	}
	div.insertAdjacentHTML('beforeend', '<form method="post" action="' + ui_log.saverURL + '" enctype="multipart/form-data" accept-charset="utf-8">' + inputs + '</form>');
	for (i = 0; i < ui_log.saverPages.length; i++) {
		div.querySelector('input[name="' + i + '"]').setAttribute('value', ui_log.saverPages[i]);
	}
	if (ui_log.saverPreview) {
		div.querySelector('input[name="preview"]').setAttribute('value', JSON.stringify(ui_log.saverPreview));
	}
	document.body.appendChild(div);
	div.firstChild.submit();
	document.body.removeChild(div);
};

ui_log.saverFetchPage = function(boss_no) {
	GUIp.common.getDomainXHR(location.pathname + (boss_no ? '?boss=' + boss_no : ''), ui_log.saverProcessPage.bind(this, boss_no), ui_log.saverFetchFailed);
};

ui_log.saverProcessPage = function(boss_no, xhr) {
	if (!xhr.responseText.match(new worker.RegExp(worker.GUIp_i18n.saver_missing_log_c)) && xhr.responseText.includes('class="lastduelpl"')) {
		var page = xhr.responseText.replace(/<img[^>]+>/g, '')
								 .replace(/\.js\?\d+/g, '.js')
								 .replace(/\.css\?\d+/g, '.css')
								 .replace(/не менее 30 дней/, 'по мере возможности')
								 .replace(/for at least 30 days after the fight is over/, 'as far as possible')
		page = page.replace(/(<script[^>]*?>[^]*?<\/script>)/g, function(script) { return script.match(/Tracker|analytics|googletagmanager/) ? '' : script.replace(/\.js\?\d+/g, '.js'); });
		// workaround inability of gdvl.tk to save 9-char logids
		if (ui_log.saverURL.includes('gdvl.tk/') && ui_log.logID.length >= 8) {
			page = page.replace(new worker.RegExp('/+duels/+log/+' + ui_log.logID,'g'),'/duels/log/' + ui_log.logID.slice(0,5));
		}
		if (!page.includes('text/html; charset=')) {
			page = page.replace('<head>', '<head>\n<meta http-equiv="content-type" content="text/html; charset=UTF-8">')
		}
		ui_log.saverPages.push(page);
		if (boss_no < ui_log.saverBossesCnt) {
			GUIp.common.setTimeout(function() { ui_log.saverFetchPage(boss_no + 1); }, 2e3);
		} else {
			ui_log.saverSendLog();
		}
	} else {
		ui_log.saverRemoveLoader();
		worker.alert(worker.GUIp_i18n.saver_error + ' (#1)');
	}
};

ui_log.saverFetchFailed = function() {
	ui_log.saverRemoveLoader();
	worker.alert(worker.GUIp_i18n.saver_error + ' (#2)');
};

ui_log.saverAddLoader = function() {
	document.body.insertAdjacentHTML('beforeend', '<div id="erinome_chronicle_loader" style="position: fixed; left: 50%; top: 50%; margin: -24px; padding: 8px; background: rgba(255,255,255,0.9);"><img src="' + (worker.GUIp_browser !== 'Opera' ? GUIp_getResource('images/loader.gif') : '//gv.erinome.net/images/loader.gif') + '"></div>');
};

ui_log.saverRemoveLoader = function() {
	if (document.getElementById('erinome_chronicle_loader')) {
		document.body.removeChild(document.getElementById('erinome_chronicle_loader'));
	}
};

ui_log.saverPrepareLog = function(type) {
	ui_log.saverPreview = null;
	switch (type) {
		case "preview":
			ui_log.saverPreview = {};
			if (worker.GUIp_locale === 'ru') {
				ui_log.saverURL = '//gv.erinome.net/processpreview';
			} else {
				ui_log.saverURL = '//gvg.erinome.net/processpreview';
			}
			break;
		default:
			if (worker.GUIp_locale === 'ru') {
				ui_log.saverURL = '//gv.erinome.net/processlog';
			} else {
				ui_log.saverURL = '//gvg.erinome.net/processlog';
			}
	}
	try {
		ui_log.saverPages = [];
		if (!ui_log.logID) {
			throw worker.GUIp_i18n.saver_invalid_log;
		}
		if (document.getElementById('search_status') && document.getElementById('search_status').textContent.match(new worker.RegExp(worker.GUIp_i18n.saver_missing_log_c))) {
			throw worker.GUIp_i18n.saver_missing_log;
		}
		if (ui_log.isBroadcast && !ui_log.saverPreview) {
			throw worker.GUIp_i18n.saver_broadcast_log;
		}
		if (document.getElementById('erinome_chronicle_loader')) {
			worker.alert(worker.GUIp_i18n.saver_already_working);
			return;
		} else {
			ui_log.saverAddLoader();
		}
		ui_log.saverBossesCnt = ui_log.saverPreview ? 0 : document.querySelectorAll('a[href*="boss"]').length;
		if (ui_log.saverPreview && document.getElementById('slider') && $('#slider').val() !== $('#slider').attr('max')) { // if #slider exists then jquery also should be available
			$('#slider').val($('#slider').attr('max')).change();
			GUIp.common.setTimeout(function() { ui_log.saverFetchPage(null); }, 5e2);
			return;
		}
		ui_log.saverFetchPage(null);
	} catch (e) {
		ui_log.saverRemoveLoader();
		worker.alert(worker.GUIp_i18n.error_message_subtitle + ' ' + e);
	}
};
ui_log.starter = function() {
	ui_log.queryString = GUIp.common.parseQueryString(location.search);

	// mobile layout (currently only arena/dungeons have completely separate mobile layouts; sailing has something in between mobile and desktop one, and datamines only have desktop layout as of 02.2025)
	// note, #main_page exists only in mobile fight/dungeon and #mini_stats exists only in mobile sailing
	this.isMobile = !!document.getElementById('main_page') || !!document.getElementById('mini_stats');

	// detect godname
	this.godname = GUIp.common.getCurrentGodname(this.customDomain);

	// check whether log is finished
	var node;
	this.isBroadcast = (node = this.isMobile ? document.getElementsByClassName('ft')[0] : document.getElementsByClassName('lastduelpl')[1]) && (new worker.RegExp(worker.GUIp_i18n.saver_broadcast_log_c)).test(node.textContent) || false;

	// log header
	var fight_log_capt = document.querySelector('#fight_log_capt, #last_items_arena .block_h, #fight_chronicle .block_h, #m_fight_log .block_h, .step_capt, .li_capt');

	// check for missing chronicle
	if ((node = this.isMobile ? document.querySelector('.ui-content > p') : document.getElementById('search_status')) && node.textContent.match(new worker.RegExp(worker.GUIp_i18n.saver_missing_log_c))) {
		if (!ui_log.customDomain) {
			node.insertAdjacentHTML('beforeend', '<br/><br/>' + worker.GUIp_i18n.fmt('saver_missing_log_suggest', ui_log.logID));
		}
		return;
	}

	// no reason to continue if we can't detect header
	if (!fight_log_capt) {
		return;
	}

	this.steps = +GUIp.common.matchRegex(/(?:шаг|step)\s*(?:\w*\s*\/\s*)?(\d+)/, fight_log_capt.textContent, 0);

	// try to load streamed dungeon map
	if (this.logID.length === 9 && this.queryString.get1('estreaming') === '1' && this.isBroadcast && !this.streamRequested && fight_log_capt) {
		this.streamRequested = true; // to use ONLY once per page load
		if (this.steps > 0 && !document.getElementById('dmap') && !document.getElementById('opps')) {
			var retry = 0,
				fn = function() {
					GUIp.common.getXHR(GUIp.common.erinome_url + '/mapStreamer/port?id=' + this.logID + '&step=' + this.steps + '&lang=' + worker.GUIp_locale, function(xhr) {
						try {
							var data = JSON.parse(xhr.responseText);
							if (data && data.map) {
								ui_log.restoreDungeonMap({
									map: data.map,
									isStreaming: true
								});
							}
						} catch (e) {}
						if (!document.getElementById('dmap') && retry++ < 3) {
							GUIp.common.setTimeout(fn.bind(ui_log), retry*250);
						} else {
							GUIp.common.setTimeout(ui_log.starter.bind(ui_log), 50);
						}
					}, function(xhr) {
						if (retry++ < 3) {
							GUIp.common.setTimeout(fn.bind(ui_log), retry*200);
						} else {
							GUIp.common.setTimeout(ui_log.starter.bind(ui_log), 50);
						}
					});
				};
			fn.call(ui_log);
			return;
		}
	}


	// clean old entries
	GUIp.common.cleanupLogStorage();

	// mark page as chronicle for use in custom CSS
	document.body.classList.add('chronicle');
	if (this.isMobile) {
		document.body.classList.add('mobile_chronicle');
	}
	// support other color themes
	GUIp.common.exposeThemeName(localStorage.ui_s || 'th_classic');
	if (worker.GUIp_browser === 'Opera') {
		document.body.classList.add('e_opera');
	}

	// add some styles
	GUIp.common.addCSSFromString(this.storage.get('UserCss'));
	var background = this.storage.get('Option:useBackground');
	if (background) {
		if (!this.isMobile) {
			document.getElementsByClassName('lastduelpl')[0].style.cssText = 'margin-top: 0; padding-top: 10px;';
		}
		GUIp.common.setPageBackground(background);
	}

	// live chronicles autoreload timeout
	var tm = document.head.innerHTML.match(/var tm = (\d+)(.\d+)?;/);
	if (tm && +tm[1] > 5) {
		var bar = document.createElement('div');
		bar.id = 'timeout_bar';
		document.body.insertBefore(bar, document.body.firstChild);
		bar.style.transitionDuration = +tm[1] + '000ms';
		GUIp.common.setTimeout(function() { bar.classList.add('running'); }, 100);
	}

	// add save links (but NOT on mobile devices since now godville generates DIFFERENT code for them)
	if (!ui_log.customDomain && !this.isBroadcast) {
		var savelnk, savediv = document.createElement('div');
		if (!document.querySelector('.rpl.mb')) { // <-- this element appears on any mobile device regardless desktop or mobile version of a page was requested, the only way to get rid of it is to make mobile client disguise as a desktop one
			savediv.appendChild(document.createTextNode(worker.GUIp_i18n.save_log_to + ' '));
			savelnk = document.createElement('a');
			if (worker.GUIp_locale === 'ru') {
				GUIp.common.addListener(savelnk, 'click', ui_log.saverPrepareLog.bind(ui_log));
				savelnk.textContent = 'gv.erinome.net';
			} else {
				GUIp.common.addListener(savelnk, 'click', ui_log.saverPrepareLog.bind(ui_log));
				savelnk.textContent = 'gvg.erinome.net';
			}
			savediv.appendChild(savelnk);
		} else {
			savediv.textContent = worker.GUIp_i18n.save_log_fullpage;
		}
		var ldplf = document.getElementsByClassName('lastduelpl_f');
		ldplf[ldplf.length - 1].appendChild(savediv);
	}

	// add usercss for custom domains
	if (ui_log.customDomain) {
		var uclink = document.querySelector('.lastduelpl_f a[href="#"]');
		if (uclink) {
			uclink.insertAdjacentHTML('afterend','<span>, <a id="user_css_edit" href="#">CSS ►</a><div id="user_css_form"><textarea></textarea></div></span>');
			GUIp.common.addListener(document.getElementById('user_css_edit'), 'click', function(ev) {
				ev.preventDefault();
				var ucform = document.getElementById('user_css_form');
				if (ucform.style.display === 'block') {
					this.textContent = 'CSS ►';
					ui_log.storage.set('UserCss',document.querySelector('#user_css_form textarea').value);
					GUIp.common.addCSSFromString(ui_log.storage.get('UserCss'));
					ucform.style.display = 'none';
				} else {
					this.textContent = 'CSS ▼';
					document.querySelector('#user_css_form textarea').value = ui_log.storage.get('UserCss');
					ucform.style.display = 'block';
				}
			});
		}
	} else {
		ui_log.initBlacklisting();
	}

	if (document.getElementsByClassName('rpl')[0]) {
		// make replay's keydown hook less aggressive
		GUIp.common.addListener(worker, 'keydown', function(ev) {
			var target = ev.target, key = ev.keyCode;
			if ((target.type === 'text' || target.tagName === 'TEXTAREA') &&
				(key === 13 || key === 37 || key === 39) && !ev.ctrlKey && !ev.altKey && !ev.shiftKey) {
				ev.stopPropagation();
			}
		}, true);
	}

	if (location.search.length > 1 && location.search !== '?sort=desc') {
		var a = document.querySelector('.block_h > a');
		if (a) {
			var q = ui_log.queryString.clone();
			if (q.get1('sort') === 'desc') {
				q.remove('sort');
			} else {
				q.set('sort', ['desc']);
			}
			a.href = location.pathname + GUIp.common.stringifyQueryString(q);
		}
	}

	// add step numbers to chronicle log
	this.enumerateSteps();

	// gizmo for mutating bosses
	this.processMutatingBoss();

	// save results for last fights list
	if (!this.customDomain && !this.isBroadcast) {
		try {
			if (/Тренировочный бой|Sparring Fight/.test(fight_log_capt.textContent)) {
				this.saveSparResults();
			} else if (/Хроника подземелья|Dungeon Journal/.test(fight_log_capt.textContent) && !location.href.includes('boss=')) {
				this.saveDungeonResults();
			}
		} catch (e) {
			GUIp.common.error(e);
		}
	}

	ui_lmining.init();

	if (location.href.includes('boss=') || (!/Хроника (подземелья|заплыва)|(Dungeon|Sail) Journal/.test(fight_log_capt.textContent) && !document.getElementById('s_map'))) {
		return;
	}

	try {
		// specific code for sailing
		if (this.isSailingLog()) {
			this.improveSailChronicles();
			this.islandsMap.prepare(function(mapContainer) {
				var controls = document.createElement('div');
				controls.className = 'e_sailing_controls';
				controls.appendChild(this.islandsMapCreateRuler());
				controls.appendChild(this.islandsMapCreateOptionBox());
				mapContainer.insertAdjacentElement('afterend', controls);
			}, this);
			GUIp.common.renderTester.deinit();
			return;
		}
		// add a pre-saved map for a translation-type chronicle if available
		if (this.isBroadcast && !document.getElementById('dmap') && this.steps === +this.storage.get('steps', true)) {
			this.restoreDungeonMap({
				map: this.storage.getJSON('map', true)
			});
		}
		if (document.querySelector('#hero2 .box') && typeof window.$ !== 'function') {
			worker.onscroll = GUIp.common.try2.bind(ui_log, ui_log.onscroll);
			GUIp.common.setTimeout(worker.onscroll, 500);
		}
		// parse dungeon features
		this.dungeonExtras = {};
		GUIp.common.parseDungeonExtras(this.dungeonExtras, document.querySelectorAll(this.isMobile ? '.li_capt ~ div.new_line.d_imp' : '#last_items_arena .new_line.d_imp'), document.getElementById('ar_name'));
		// add some colors and other info to the map
		GUIp.common.setExtraDiscardData(Object.values(ui_log.getDungeonHeroNames()));
		if (ui_log.storage.get('dptr',true)) {
			GUIp.common.dmapDisabledPointersCache = ui_log.storage.getJSON('dptr',true);
		}
		if (ui_log.storage.getList('Option:dungeonMapSettings').includes('excl') && ui_log.storage.get('auxcache',true)) {
			GUIp.common.dmapAuxCache = ui_log.storage.getJSON('auxcache',true);
		}
		GUIp.common.getDungeonPhrases(ui_log.initColorMap.bind(ui_log),ui_log.observeDungeonMap.bind(ui_log));
	} catch (e) {
		GUIp.common.error(e);
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

registerModule('log', ui_log.starter, ui_log);

})(this);
