(function(worker) {
'use strict';

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

registerModule('i18n', function() {

worker.GUIp_words = function() {
	return {
	// Этот параметр показывает текущую версию файла
	// Меняется только при _структурных_ изменениях.
	// Например: добавление, удаление, переименование секций.
	// Добавление фраз — НЕ структурное изменение
	version: 25,

	// Фразы
	phrases: {
		// Ключевые корни: лечис, зелёнка
		heal: [
			"Do something about your wounds!", "Heal yourself, my hero!", "Drink potions, restore your health!", "You look like you need a drink!", "Take a moment to rest!",
			"Try to stay alive! Heal your wounds quickly!", "Some rest would do you good!", "Don't deny that you love drinking! Do it!"
		],

		heal_field: [
			"Heal yourself, my hero.", "You look like you need a drink.", "Take a moment to rest!",
			"Try to stay alive!", "Take a break and eat something!", "Some rest would do you good.", "Don't deny that you love drinking."
		],

		// Ключевые корни: молись,
		pray: [
			"Pray to me, mortal!", "Praise me, for I am your god!", "Help me to help you and pray!", "Kneel in prayer!"
		],

		pray_field: [
			"Pray to me, mortal!", "I demand worship!", "Praise me, for I am your god!", "I will show you the light.",
			"I'm watching you.", "Praise me daily and nightly!", "Help me to help you and pray.", "Kneel in prayer!"
		],

		// Ключевые корни: жертва
		sacrifice: [
			"Sacrifice something!", "I demand a sacrifice!"
		],

		// Ключевые корни: опыт
		exp: [
			"Do you ever learn?", "Learn something!", "You need to learn about levelling up!"
		],

		// Ключевые корни: золото клад
		dig: [
			"Dig a hole!", "Look for some treasure!", "Dig up something of value!", "I hear there is treasure underground!",
			"Search for gold!", "There is plenty of gold underground.", "Dig right here, it's a great spot!", "Stop right there and dig.",
			"There is a treasure under that tree!", "Digging is the best exercise!"
		],

		// Работает: бей, ударь, ударов
		hit: [
			"Hit the enemy harder!", "Smite your foe!", "Destroy your rival! Crush him!", "Use your special attack!", "Knock your rival out! Beat him!",
			"Kick them where it hurts!", "Attack with all your might!", "Strike like lightning!",
			"Hit your enemy twice!", "Attack out of turn!"
		],

		hit_field: [
			"Hit the monster harder!", "Smite your foe!", "Destroy your rival!", "Use your special attack!", "Knock your rival out!",
			"Kick them where it hurts!", "Bring your wrath upon the opponent!", "Attack with all your might!", "Strike like lightning!",
			"Hit your enemy twice!"
		],

		// Ключевые корни: отби, щит
		// Ключевое слово: защищайся
		defend: [
			"Duck and cover!", "Use your shield!", "Try to block incoming damage!", "Defend yourself!", "Resistance is futile!",
			"Come back with your shield — or on it!", "Take cover!", "Duck and dodge!", "Roll over and duck!"
		],

		do_task: [
			"Complete your quest!", "Surely you can quest faster than that!", "Do your quest faster!", "Your job won't wait forever, hurry up!",
			"Don't get distracted from your task, just do it!"
		],

		cancel_task: [
			"Cancel your quest!", "This quest is pointless! Abandon it!", "I do not like this quest. Stop what you are doing at once!",
			"Drop what you’re holding, and cease questing!"
		],

		die: [
			"Curl up and die!", "You die too often!", "I want you dead in the next five minutes!", "Play dead!"
		],

		town: [
			"Go to town!", "Turn back!", "Return to town!", "Return to town with glory!"
		],

		// Ключевые корни: Север
		go_north: [
			"Go north!"
		],

		// Ключевые корни: Юг
		go_south: [
			"Go south!"
		],

		// Ключевые корни: Запад
		go_west: [
			"Go west!"
		],

		// Ключевые корни: Восток
		go_east: [
			"Go east!"
		],

		// Ключевые корни: Вниз
		go_downstairs: [
			"Go down!"
		],

		// Ключевые корни: Вверх
		go_upstairs: [
			"Go up!"
		],

		// Начало для фраз-вопросиков
		inspect_prefix: [
			"Examine", "Study", "Look at", "Disassemble"
		],

		// Ключевые слова для крафта
		craft_prefix: [
			"Combine", "Assemble"
		],

		// Префиксы во имя
		exclamation: [
			"For my pleasure", "For science", "Please", "For Godville", "I command you", "Hey", "Quick",
			"I need you to do something for me", "Without hesitation"
		],

		mnemonics: [ ]
	},

	usable_items: {
		'aura box': {
			desc: 'This item gives a new aura to the hero',
			title: 'giving an aura'
		},
		'black box': {
			desc: 'This item can affect the hero in a good or bad way',
			title: 'randomly affecting the hero'
		},
		'boss box': {
			desc: 'This item summons a boss for the hero to fight',
			title: 'summoning a boss monster'
		},
		'charge box': {
			desc: 'This item adds one godpower charge',
			title: 'giving a godpower charge'
		},
		'coolstory box': {
			desc: 'This item writes an epic hero tale',
			title: 'composing a hero tale'
		},
		'friend box': {
			desc: 'This item helps the hero find a new friend',
			title: 'making a random friend'
		},
		'gift box': {
			desc: 'This spooky item can turn into something',
			title: 'free golden brick'
		},
		'godpower box': {
			desc: 'This item restores some godpower',
			title: 'filling the godpower bar',
			isFree: true
		},
		'godpower box hidden': {
			desc: 'This item restores some godpower',
			title: '',
			isFree: false
		},
		'good box': {
			desc: 'This item may give the hero a pleasant surprise',
			title: 'affecting the hero in a good way'
		},
		'invite': {
			desc: 'This item increases the number of available invitations',
			title: 'Godville invite'
		},
		'heal box': {
			desc: "This item can completely restore the hero's health",
			title: 'restoring hero’s health'
		},
		'prize box': {
			desc: 'There could be something valuable inside or some rubbish',
			title: 'containing prize treasures',
			isFree: false
		},
		'quest box': {
			desc: 'This item sends the hero on a mini-quest',
			title: 'sending the hero into a mini-quest'
		},
		'raidboss box': {
			desc: 'This item makes the hero search for allies against an underground boss',
			title: 'summoning an underground boss monster'
		},
		'skill box': {
			desc: "This item replaces one of the hero's skills with some other one",
			title: 'changing one skill with another'
		},
		'smelter': {
			desc: 'This item kills the monster or melts a golden brick out of 2000 gold coins',
			title: 'melting gold into a brick'
		},
		'teleporter': {
			desc: 'This item can teleport the hero into a random town',
			title: 'teleporting into a random town'
		},
		'temper box': {
			desc: "This item makes the hero's alignment more defined",
			title: 'changing hero’s alignment'
		},
		'to arena box': {
			desc: 'This item teleports the hero to the arena',
			title: 'sending the hero to arena'
		},
		'transformer': {
			desc: 'This item can transform one or several bold items in inventory into golden bricks',
			title: 'transforming <b>items</b> into golden bricks'
		},
		'treasure box': {
			desc: 'There could be something valuable inside or some rubbish',
			title: 'containing treasures (or not)',
			isFree: true
		},
		'dungeon box': {
			desc: 'This item sends the hero with a temple to a dungeon',
			title: 'sending the hero into a dungeon'
		},
		'sail box': {
			desc: 'This item teleports the hero with an ark to a sail',
			title: 'sending the hero to a sail'
		},
		'spoiler box': {
			desc: 'This item finds information about current quest prospects',
			title: 'giving spoilers about hero\'s current quest'
		}
	},

	pets: {
		// https://wiki.godvillegame.com/index.php?action=history&title=Pets
		// synchronized with: 29 Sep 2024
		'santa claws': {min_level: 18, max_level: Infinity, features: 'f'},
		'satan claus': {min_level: 18, max_level: Infinity, features: 'f?'},
		'ballpoint penguin': {min_level: 18, features: 'h?'},
		'dust bunny': {min_level: 18, features: 'h?'},
		'firefox': {min_level: 18, features: 'f'},
		'ninja tortoise': {min_level: 18, features: 'f?'},
		'robber chicken': {min_level: 18, features: 'l?'},
		'rocky raccoon': {min_level: 18, features: 'h'},
		'significant otter': {min_level: 18, features: 'h?'},
		'sun dog': {min_level: 18, features: 'f?'},
		'talking donkey': {min_level: 18, features: 'h?'},
		'velcrow': {min_level: 18, features: 'l?'},
		'prancing pony': {min_level: 25, features: 'r?'},
		'stripeless zebra': {min_level: 25, features: 'hr'},
		'biowolf': {min_level: 30, features: 'f'},
		'bipolar bear': {min_level: 30, features: 'f'},
		'chesthugger': {min_level: 30, features: 'l?'},
		'dandy lion': {min_level: 30, features: 'fr?'},
		'trojan horse': {min_level: 30, features: 'r?'},
		'fat cat': {min_level: 35, features: 'b?'},
		'lightsaber-toothed tiger': {min_level: 35, features: 'f'},
		'pocket monster': {min_level: 40, features: 'fl?'},
		'solar bear': {min_level: 40, features: 'fr?'},
		'were-panther': {min_level: 40, features: 'fr?'},
		'contraband mule': {min_level: 45, features: 'p?'},
		'heffalump': {min_level: 45, features: 'fr'},
		'pack rat': {min_level: 45, features: 'lr?'},
		'double dragon': {min_level: 50, features: 'r?'},
		'evil minion': {min_level: 50, features: 'fl?'},
		'grease monkey': {min_level: 55, features: 'b?'},
		'alpha centaur': {min_level: 60, features: 'fr'},
		'gnomewrecker': {min_level: 60, features: 'fdl?'},
		'grounded hog': {min_level: 60, features: 'hd?'},
		'spider pig': {min_level: 60, features: 'lr'},
		'hyper lynx': {min_level: 65, features: 'f'},
		'reservoir dog': {min_level: 65, features: 'p?'},
		'dreaded gazebo': {min_level: 70, features: 'f?'},
		'gummy wyrm': {min_level: 70, features: 'fd'},
		'legal weasel': {min_level: 70, features: 'b?'},
		'philosoraptor': {min_level: 70, features: 'fr'},
		'atomic kitten': {min_level: 75, features: 'fld'},
		'battlesheep': {min_level: 75, features: 'fr?'},
		'starfish trooper': {min_level: 75, features: 'fs?'},
		'landshark': {min_level: 80, features: 'fs'},
		'vengeful mole': {min_level: 80, features: 'fd'},
		'hamburglar': {min_level: 85, features: 'hl'},
		'piggy banker': {min_level: 85, features: 'lp'},
		'terror bull': {min_level: 85, features: 'f?'},
		'ticking crocodile': {min_level: 85, features: 'rs'},
		'cinnaminion': {min_level: 90, features: 'b?'},
		'godvilla': {min_level: 90, features: 'r'},
		'inner demon': {min_level: 90, features: 'fd'},
		'octobear': {min_level: 90, features: 'fs?'},
		'frog of war': {min_level: 95, features: 's?'},
		'battle toad': {min_level: 100, features: 'fs?'},
		'blind gorgon': {min_level: 100, features: 'rd'},
		'thesaurus rex': {min_level: 100, features: 'fr?'},
		'unbearable grizzly': {min_level: 100, features: 'fls?'},
		'stag of holding': {min_level: 105, features: 'pd'},
		'wizaardvark': {min_level: 105, features: 'b?'},
		'battle hamster': {min_level: 110, features: 'fl?'},
		'crypt creeper': {min_level: 110, features: 'fd?'},
		'presidential seal': {min_level: 110, features: 'hs?'},
		'lightning colt': {min_level: 115, features: 'fr?'},
		'closet monster': {min_level: 120, features: 'b?'},
		'fail whale': {min_level: 120, features: 's?'},
		'insomni-yak': {min_level: 125, features: 'p?'},
		'vogon poet': {min_level: 125, features: 'l?'},
		'lava lamb': {min_level: 130, features: 'lds'},
		'bear minimum': {min_level: 135, features: 'b?'},
		'undercover elephant': {min_level: 140, features: 'frd'},
		'high horse': {min_level: 150, features: 'hpr'},
		'optimus slime': {min_level: 160, features: 'b?'}
	},

	special_monsters: [
		'Anniversary','Bricked','Enlightened','Glowing','Healing',
		'Holiday','Loaded','Questing','Shedding','Smith','Wealthy'
	],

	chosen_monsters: [
		'Holykeeper', 'Christmas Wraith'
	],

	custom_craft: [
		{q:1,i:0,t:'box',d:'black boxes',l:'bcdmp',g:'bm'},
		{q:0,i:1,t:'chr',d:'charge boxes',l:'hps',g:'b'},
	],

	custom_informers: [
		{q:1,title:'going to field',type:0,expr:'gv.isGoingForth'},
		{q:1,title:'field trader',type:0,expr:'gv.isTrading && !gv.inTown'},
		{q:1,title:'low supplies',type:0,expr:'gv.fightType == "sail" && gv.supplies <= 5'},
		{q:1,title:'fishing-ng',type:0,expr:'gv.isFishing'},
		{q:1,title:'aura of {gv.auraName}',type:0,expr:'gv.auraName != ""'}
	],

	ally_blacklist: [
		{q:1,n:'Godname',r:'your optional commentary',s:'text-decoration:underline; color: red;'},
		{q:1,n:'Othername',r:'the reasoning',s:''}
	],

	town_list: [
		{name: 'Bumchester', wasteFraction: '19–67'},
		{name: 'Last Resort', wasteFraction: '8–34'},
		{name: 'Beerburgh', wasteFraction: '24–86'},
		{name: 'Unsettlement', wasteFraction: '9–39'},
		{name: 'Herowin', wasteFraction: '22–83'},
		{name: 'El Herado', wasteFraction: '18–66'},
		{name: 'Los Adminos', wasteFraction: '25–98'},
		{name: 'Bosswell', wasteFraction: '9–34'},
		{name: 'Herolympus', abbr: 'HO', wasteFraction: '23–74'},
		{name: 'Dogville', abbr: 'DG'},
		{name: 'Bad Gateway', wasteFraction: '25–93'},
		{name: 'Lostway', wasteFraction: '9–22'},
		{name: 'Dessertown', abbr: 'DT'},
		{name: 'Heisenburg', wasteFraction: '36–100'}
	],

	std_dungeon_bosses: [
		'Bagstabber', 'Bluffalo', 'Boozerker', 'Catastroflea', 'Cementalist', 'Dungeon Sweeper', 'Escargolem', 'Flowsnake', 'Hypnogriff', 'Keyborg',
		'Minotourist', 'Nachomancer', 'Optimystic', 'Plundertaker', 'Quasidodo', 'Salsamander', 'Scaretaker', 'Shyborg', 'Sighborg', 'Telepony', 'Turmerisk',
		'Aftermoth', 'Appetitan', 'Archetypo', 'Blamethrower', 'Buzzkiller', 'Detrimentalist', 'Exoskeletor', 'Flashmobster', 'Gastronaut', 'Glitch Doctor',
		'Grimelord', 'Hazmatador', 'Hellevangelist', 'Killdebeest', 'Magnum Octopus', 'Omnipoet', 'Tombcat', 'Underminer', 'Uranium Slug', 'Warmongrel',
		'Adminotaur', 'Afterlifeguard', 'Ark Enemy', 'Bosstradamus', 'Difficultist', 'Ducktator', 'Dungeon Keeper', 'Flawyer', 'Godbuster', 'Hangoverlord',
		'Hyperbully', 'Megahurtz', 'Obscentinel', 'Oxydjinn', 'Satyrant', 'Shamaniac', 'Spelun King', 'Stalactitan', 'Thug-of-war', 'Tinkerhell', 'Tubercolossus',
		'Balrogue', 'Bossanova', 'Bosstard', 'Cowlossus', 'Dreadwinner', 'Freezard', 'Imbossible', 'Jerkules', 'King Vahid', 'Lagviathan', 'Madmiral',
		'Magnifisaint', 'Megatribble', 'Oddzilla', 'Sinfluencer', 'Skeletaur', 'Spamurai', 'Stigmatador', 'Traumaturge', 'Warchef', 'Yesferatu'
	],

	std_dungeon_types: {
		abundance:     "Abundance",
		antiInfluence: "Anti-influence",
		clarity:       "Clarity",
		demolition:    "Demolition",
		emptiness:     "Emptiness",
		grace:         "Grace",
		halfTruth:     "Half Truth",
		highStakes:    "High Stakes",
		hoarding:      "Hoarding",
		hotness:       "Hotness",
		hurry:         "Hurry",
		jumping:       "Jumping",
		migration:     "Migration",
		mystery:       "Mystery",
		normalcy:      "Normalcy",
		pledge:        "Pledge",
		rejuvenation:  "Rejuvenation",
		robbery:       "Robbery",
		savings:       "Savings",
		solitude:      "Solitude",
		surprise:      "Surprise",
		toxicity:      "Toxicity",
		uncertainty:   "Uncertainty",
		wealth:        "Wealth",
		woodness:      "Woodness"
	}

	};
}; // GUIp_words

worker.GUIp_locale = 'en';

worker.GUIp_i18n = {
	getPluralCategory: function(n) {
		return n === 1 || n === -1 ? 1 : 2;
	},
	_fmt: function(base, args) {
		return this[base].replace(/\$([\d$])/g, function(m0, m1) {
			return m1 === '$' ? '$' : args[+m1];
		});
	},
	fmt: function(base) {
		return this._fmt(base, arguments);
	},
	plfmt: function(base, n) {
		return this._fmt(base + this.getPluralCategory(n), arguments); // $1 refers to n
	},
	// superhero
	hero: ['hero', 'hero'],
	heroine: ['heroine', 'heroine'],
	_inspect_verbs: ['examine', 'study', 'look at', 'disassemble'],
	get ask_to_inspect() {
		return 'Ask $1 to ' + this._inspect_verbs[Math.floor(Math.random() * 4)] + ' the $2';
	},
	_craft_verbs: ['combine', 'assemble'],
	get ask_to_craft() {
		return 'Ask $1 to ' + this._craft_verbs[Math.floor(Math.random() * 2)] + ' a random combination of $2 items from the inventory';
	},
	get ask_to_craft_a() {
		return 'Ask $1 to ' + this._craft_verbs[Math.floor(Math.random() * 2)] + ' “$2” combination of items from the inventory';
	},
	b_b: '<b>b</b>+<b>b</b>',
	b_b_hint: 'two bold',
	b_r: '<b>b</b>+r',
	b_r_hint: 'bold and regular',
	r_r: 'r+r',
	r_r_hint: 'two regular',
	close: 'close',
	help_dialog_capt: 'help dialog',
	how_to_update: 'How to update <b>Godville UI+</b> manually:',
	help_update_all: '<li>Check for a <a id="checkUIUpdate" title="Check for updates" href="#">new version</a> of the extension;</li>' +
		'<li>Install an update using directions in the <a href="'+GUIp.common.erinome_url+'/repo" title="Opens in a new tab" target="_blank">INSTALL file</a>.</li>',
	help_useful_links: 'Useful links: ' +
		'<a href="'+GUIp.common.erinome_url+'" title="Opens in a new tab" target="_blank">extension page</a>, ' +
		'<a href="https://bitbucket.org/Erinome/erinome-godville-ui-plus/issues" title="Opens in a new tab" target="about:blank">issue tracker</a>.',
	help_ci_links: 'Custom informers: <a id="checkCIExpression" href="#" title="Check expression">check expression execution</a>.',
	help_reset_links: 'In case of issues: ' +
		'reset <a id="resetGVSettings" href="#" title="Reset Godville settings">Godville settings</a>, ' +
		'<a id="resetUISettings" href="#" title="Reset Erinome Godville UI+ settings">eGUI+ settings</a>, ' +
		'update <a id="resetPhrasesDB" href="#" title="Request phrases DB update">phrases DB</a>.',
	reset_gv_settings: 'Resetting Godville settings may fix some random errors with UI+, no user data will be lost. Continue?',
	reset_ui_settings: 'Resetting UI+ settings may fix errors related to saving options, all UI+ settings will be lost! Continue?',
	reset_phrases_db: 'Phrases database update is queued. Please reload the page for changes to take effect.',
	ui_settings_top_menu: '<strong>ui+</strong>&nbsp;settings',
	getting_version_no: 'Getting the latest addon version number...',
	is_last_version: 'You have the latest version',
	is_last_version_desc: 'No further actions are required.',
	new_version_available: 'New version available!',
	is_not_last_version: 'Latest version — <b>$1</b>. Manual update is required.',
	proceed_to_next_step: ' Continue to the next step.',
	getting_version_failed: 'Checking new version failed',
	getting_version_failed_desc: 'Unable to determine the latest version number. Please try again later.',
	hero_health: 'Hero health',
	inventory: 'Inventory',
	supplies: 'Supplies',
	gold: 'Gold',
	charges: 'Charges',
	allies_health: 'Ally health' ,
	enemy_health: 'Enemy health',
	exp: 'Experience (percents)',
	level: 'Level',
	health: 'Health',
	godpower: 'Godpower (percents)',
	task: 'Quest (percents)',
	side_job: 'Side job (percents)',
	monsters: 'Monsters',
	bricks: 'Bricks',
	logs: 'Logs',
	savings: 'Savings (thousands)',
	weapon: 'Weapon',
	shield: 'Shield',
	head: 'Head',
	body: 'Body',
	arms: 'Arms',
	legs: 'Legs',
	talisman: 'Talisman',
	relic: 'Relic',
	death_count: 'Deaths',
	pet_level: 'Pet level',
	ark_creatures: 'God’s creatures',
	trader_exp: 'Trader’s experience (percents)',
	trader_level: 'Trader’s level',
	boss_health: 'Frankenboss’s health',
	bits: 'Bits of Information',
	bytes: 'Bytes of Information',
	book_bytes: 'Book Glyphs',
	book_words: 'Book Words',
	forge_exp: 'Dungeon Forge Progress',
	forge_rank: 'Dungeon Forge Rank',
	forge_bytes: 'Dungeon Forge Glyphs',
	forge_words: 'Dungeon Forge Words',
	push_ready: 'Push readiness',
	souls: 'Souls',
	relics: 'Relics',
	souls_prc: 'Souls cleaned',
	souls_cnt: 'Souls collected',
	up_rsc: 'Retroscope progress',
	up_cch: 'Cryoсhamber progress',
	up_fcs: 'Forecast Suppressor progress',
	up_ttw: 'Temple Tower progress',
	unknown_item_type_title: 'Unknown artifact type in Godville UI+!',
	unknown_item_type_content: 'We have detected an unrecognized artifact type. Please report the following to the developer: ',
	godpower_label: 'Godpower',
	north: 'north',
	east: 'east',
	south: 'south',
	west: 'west',
	downstairs: 'down',
	upstairs: 'up',
	north_side: 'northern side',
	east_side: 'eastern side',
	south_side: 'southern side',
	west_side: 'western side',
	ask_to_go_north: 'Ask $1 to go north',
	ask_to_go_east: 'Ask $1 to go east',
	ask_to_go_south: 'Ask $1 to go south',
	ask_to_go_west: 'Ask $1 to go west',
	ask_to_go_downstairs: 'Ask $1 to go downstairs',
	ask_to_go_upstairs: 'Ask $1 to go upstairs',
	defend: 'defend',
	ask_to_defend: 'Ask $1 to defend',
	pray: 'pray',
	ask_to_pray: 'Ask $1 to pray',
	heal: 'heal',
	ask_to_heal: 'Ask $1 to heal',
	hit: 'hit',
	ask_to_hit: 'Ask $1 to hit',
	sacrifice: 'sacrifice',
	ask_to_sacrifice: 'Ask $1 to sacrifice',
	mnemo_button: 'mnemonics',
	mnemo_title: 'lookup a voice from mnemonics dictionary',
	enemy_label: 'Enemy',
	boss_warning_hint: 'boss warning',
	boss_slay_hint: 'boss',
	small_prayer_hint: 'small prayer',
	small_healing_hint: 'small healing',
	unknown_trap_hint: 'trap blocked by pet',
	trophy_loss_trap_hint: 'trap: gold or trophy loss',
	low_damage_trap_hint: 'trap: low damage',
	moderate_damage_trap_hint: 'trap: moderate damage',
	move_loss_trap_hint: 'trap: move loss',
	boss_warning_and_trap_hint: 'boss warning and trap',
	boss_slay_and_trap_hint: 'boss and trap',
	treasury_hint: '<abbr title="Treasury might be located in this cell according to known hints">possible treasury</abbr>',
	treasury_th_hint: '<abbr title="Treasury might be located in this cell if an unknown wall exists between this cell and the hint">possible treasury</abbr> in Hotness Dungeon',
	health_label: 'Health',
	gold_label: 'Gold',
	inventory_label: 'Inventory',
	level_label: 'Level',
	task_label: 'Quest',
	death_label: 'Death Count',
	study: 'study',
	dig: 'dig',
	cancel_task: 'cancel',
	do_task: 'do',
	die: 'die',
	ask_to_study: 'Ask $1 to study',
	ask_to_dig: 'Ask $1 to dig',
	ask_to_cancel_task: 'Ask $1 to cancel current quest',
	ask_to_do_task: 'Ask $1 to do current quest quicker',
	ask_to_die: 'Ask $1 to die',
	milestones_label: 'Milestones Passed',
	return: 'return',
	ask_to_return: 'Ask $1 to go to the nearest town',
	do_you_want: 'Are you sure you want $1?',
	to_encourage_hero:    'to encourage your hero',
	to_encourage_heroine: 'to encourage your heroine',
	to_punish_hero:    'to punish your hero or his opponent',
	to_punish_heroine: 'to punish your heroine or her opponent',
	to_make_a_miracle: 'to make a miracle',
	to_activate: 'to activate the ',
	monsters_label: 'Monsters Killed',
	bricks_label: 'Bricks for Temple',
	logs_label: 'Wood for Ark',
	savings_label: 'Savings',
	pet_status_label: 'Status',
	pet_level_label: 'Level',
	gte_old_penalty: '$1\nThere were missing entries in the Third Eye. Displaying data assuming there were no non-logged conversions. Will resolve after any conversion or in $2',
	gte_requires_te: '$1\nDisplaying data assuming there were no non-logged conversions. Enable conversions in the Third\xA0Eye’s settings for more reliable work',
	gte_noconversion: 'Gold conversion is impossible due to current forecast',
	log_is_guaranteed: 'The log is guaranteed',
	log_isnt_guaranteed: 'The log isn’t guaranteed',
	log_old_time: 'There were missing entries in the Third Eye. The log is guaranteed unless there were non-logged dungeons. To resolve, open your fight history or wait for $1',
	log_isnt_guaranteed_old_time: 'There were missing entries in the Third Eye. Displaying time assuming there were no non-logged dungeons. To resolve, open your fight history or wait for $1',
	log_requires_te: 'Not enough data to determine when the guaranteed log will be available. Enable dungeons in the Third\xA0Eye’s settings for more reliable work',
	log_isnt_guaranteed_requires_te: 'The log isn’t guaranteed. Enable dungeons in the Third\xA0Eye’s settings for more reliable work',
	byte_is_guaranteed: 'One glyph for the Book is guaranteed',
	two_bytes_are_guaranteed: 'Two glyphs for the Book are guaranteed',
	three_bytes_are_guaranteed: 'Three glyphs for the Book are guaranteed',
	byte_isnt_guaranteed: 'The glyph for the Book isn’t guaranteed; two glyphs will be guaranteed in $1',
	bytes_old_time: 'There were missing entries in the Third Eye. $2 unless there were non-logged datamines. To resolve, open your fight history or wait for $1',
	byte_isnt_guaranteed_old_time: 'There were missing entries in the Third Eye. Displaying time assuming there were no non-logged datamines; two glyphs might be guaranteed in $2. To resolve, open your fight history or wait for $1',
	byte_requires_te: 'Not enough data to determine when the guaranteed glyph will be available. Enable datamines in the Third\xA0Eye’s settings for more reliable work',
	byte_isnt_guaranteed_requires_te: 'The glyph for the Book isn’t guaranteed. Enable datamines in the Third\xA0Eye’s settings for more reliable work',
	soul_is_guaranteed: 'Gathering one soul is guaranteed',
	two_souls_are_guaranteed: 'Gathering two souls is guaranteed',
	three_souls_are_guaranteed: 'Gathering three souls is guaranteed',
	soul_isnt_guaranteed: 'Gathering a soul isn’t guaranteed; two souls will be guaranteed in $1',
	souls_uncertain: 'Insufficient data. Presumably $1. Check your fight history for clarification.',
	got_exp: 'Earned some experience points',
	got_log: 'Got a log',
	got_2_logs: 'Got two logs',
	got_byte: 'Learned a glyph',
	got_2_bytes: 'Learned two glyphs',
	got_3_bytes: 'Learned three glyphs',
	got_soul: 'Gathered one soul',
	got_2_souls: 'Gathered two souls',
	open_spar_chronicle: 'Open the chronicle so that eGUI+ knows if experience was gained',
	open_dungeon_chronicle: 'Open the chronicle so that eGUI+ knows if a log was gained',
	mining_chronicle_unknown_result: 'Cannot tell whether glyphs were learned or not',
	open_dungeon_chronicle_souls: 'Open the chronicle so that eGUI+ knows if souls were gathered',
	wiki_pets_table: 'https://wiki.godvillegame.com/Pets#List_of_pets',
	open_wiki_pets_table: 'Open list of tameable monsters in the Godwiki',
	tamable_monster: 'Gods figured out that this monster can become a $1 pet',
	pet_feature_h: 'healing',
	pet_feature_f: 'fighting',
	pet_feature_l: 'looting',
	pet_feature_r: 'riding',
	pet_feature_d: 'dungeon',
	pet_feature_s: 'sailing',
	pet_feature_p: 'pack',
	pet_feature_b: 'embolding',
	'pet_feature_?': '(unknown)',
	error_message_title: 'Godville UI+ error!',
	debug_mode_warning: 'Warning! Error details are shown because debug mode is enabled.',
	possible_actions: 'Possible actions:',
	if_first_time: 'If this error has occured for the first time — ',
	press_here_to_reload: 'press here to reload the page',
	if_repeats: 'If this error repeats — ',
	press_here_to_show_details: 'press here to show the details of the error',
	error_message_subtitle: 'Error description:',
	error_message_text: 'Text of the error:',
	error_message_stack_trace: 'Stack trace:',
	error_message_in_old_version: 'Warning! Currently installed Godville&nbsp;UI+ version is outdated. Please try to update the extension as this error might be already fixed in the latest release.',
	and: ' and ',
	or: ' or ',
	ui_help: 'ui+&nbsp;help',
	// options
	import_success: 'Your settings’ve been imported successfully',
	import_fail: 'Incorrect settings string',
	ui_settings: 'UI+ Settings',
	import_prompt: 'Settings import:',
	export_prompt: 'Settings export:',
	bg_status_file: 'file',
	bg_status_link: 'link',
	bg_status_same: 'same',
	bg_status_error: 'error',
	// options-page
	profile_menu_settings: 'Settings',
	profile_menu_third_eye: 'Third Eye',
	profile_menu_gadgets: 'Mobile Apps',
	profile_menu_invites: 'Invites',
	profile_menu_plogs: 'Recharges',
	ui_settings_capt: 'Godville UI+ settings',
	disable_voice_generators: 'Disable godvoice generators',
	voicegen_settings: 'Voice generators’ options',
	use_hero_name: 'Add hero name to the beginning of the voices',
	use_exclamations: 'Add exclamations to the voices',
	use_short_phrases: 'Make short voices consisting of only one phrase',
	disable_die_button: 'Disable “Die” button',
	relocate_craft_buttons: 'Show craft buttons on top of the inventory',
	fixed_craft_buttons: 'Don’t hide craft buttons when combos available',
	enable_custom_craft: 'Enable <span id="span_ccraft" class="clickable">custom craft combos</a>',
	disable_logger: 'Disable logger',
	disable_logger_desc: 'Disable the ticker with colorful numbers',
	sum_allies_hp: 'Sum health in logger',
	sum_allies_hp_desc: 'while in battle, otherwise show values individually',
	relocate_duel_buttons: 'Move duel buttons',
	relocate_duel_buttons_desc: 'allows to move duel buttons into the pantheons section',
	relocate_duel_buttons_hint: 'which ones?',
	relocate_duel_buttons_arena: 'arena',
	relocate_duel_buttons_challenge: 'challenge',
	relocate_duel_buttons_dungeon: 'dungeon',
	relocate_duel_buttons_sail: 'sail',
	relocate_duel_buttons_mining: 'mining',
	forbidden_title_notices: 'Choose notifications in window title',
	forbidden_title_notices_desc: 'allows to disable certain notifications in the title',
	forbidden_title_notices_hint: 'which ones?',
	forbidden_title_notices_pm: 'private message',
	forbidden_title_notices_gm: 'guild council',
	forbidden_title_notices_fi: 'new forum posts',
	use_background: 'Enable background',
	use_background_desc: 'Enable cloudy or another background',
	use_background_hint: 'which one?',
	use_background_cloud: 'cloudy',
	use_background_file: 'from file',
	use_background_link: 'from link',
	voice_timeout: 'Choose timeout length',
	voice_timeout_desc: 'instead of the default 20 seconds',
	voice_timeout_hint: 'input time (in seconds)',
	improve_discharge_button: 'Improve “Restore” button',
	improve_discharge_button_desc: 'use dynamic limit to require confirmation',
	hide_charge_button: 'Remove “Charge” button',
	hide_charge_button_desc: 'for those who don’t buy charges',
	hide_bless_button: 'Remove “Bless” button',
	hide_bless_button_desc: 'for those who aren’t interested in p2w',
	confirm_influences: 'Confirm influences',
	confirm_influences_desc: 'in fields only, when not having enough godpower for an influence or item activation',
	dungeon_settings: 'Dungeon Settings',
	dmap_dimensions: 'show known map dimensions',
	dmap_save_marks: 'save spots in Clarity / walls in Demolition',
	dmap_put_dm_link: 'link the dungeon master’s profile',
	islands_map_settings: 'Sailing Settings',
	islands_map_widen: 'expand sail map',
	islands_map_showcrd: 'show coordinates instead of distances',
	islands_map_rndcolors: 'randomize POI colors order',
	islands_map_dhh: 'do not highlight hints on hover',
	islands_map_dth: 'do not highlight found treasures on hover',
	islands_map_mbc: 'show borders',
	islands_map_mfc: 'show all tiles',
	islands_map_conv: 'show the map on sail broadcast page',
	islands_map_pdpm: 'always use maximum possible Rim distance',
	islands_map_shh: 'simplified hints highlighting',
	islands_map_arknum: 'replace “@” with your ark’s number',
	islands_map_beastieshp: 'clearly show beasties’ HP range',
	islands_map_arkdir: 'show directions in which other arks are moving',
	islands_map_monochrome: 'use monochrome icons on the map',
	islands_map_hide_inforing: 'hide dashed ring around your ark',
	islands_map_dlh: 'do not highlight leviathan zones',
	islands_map_hints_style: 'draw hints:',
	islands_map_hints_tile_marking: 'by marking tiles considering all hints',
	islands_map_hints_tile_marking_old: 'by marking tiles considering active hints',
	islands_map_hints_polylinear: 'with lines',
	range_map_settings: 'Mining Settings',
	rmap_boss_alpha: 'replace “@” with your boss’s letter',
	rmap_grid: 'show grid on the map',
	freeze_voice_button: 'Freeze godvoice button',
	freeze_voice_button_desc: 'freezes godvoice button in certain cases',
	freeze_voice_button_after_voice: 'after voice has been heard',
	freeze_voice_button_when_empty: 'when no voice text is entered',
	forbidden_craft: 'Choose crafting modes',
	forbidden_craft_desc: 'allows to globally disable crafting of certain types and categories of items',
	forbidden_craft_b_b: '<b>bold</b> + <b>bold</b>',
	forbidden_craft_b_r: '<b>bold</b> + regular',
	forbidden_craft_r_r: 'regular + regular',
	forbidden_craft_usable: 'including <b>activatable</b>',
	forbidden_craft_heal: 'including healing',
	disable_page_refresh: 'Disable automatic page refresh',
	disable_page_refresh_desc: 'when the hero page hangs (approved by the devs)',
	disabled_timers: 'Timer settings',
	disabled_timers_desc: 'allows to hide unneeded timers',
	disabled_timers_hint: 'which ones to show?',
	disabled_timers_conversion: 'gold-to-XP conversion timer',
	disabled_timers_dungeon: 'log guarantee timer',
	disabled_timers_mining: 'glyph guarantee timer',
	disabled_timers_souls: 'souls guarantee timer',
	informer_type_l: 'classic informer',
	informer_type_d: 'desktop informer',
	informer_type_s: 'sound informer',
	informer_type_t: 'ignore while in own shop',
	active_informers: 'Informer Settings',
	active_informers_desc: 'Notify about game events:',
	active_informers_usable_items: 'Notify about activatable trophies:',
	active_informers_full_godpower: 'full godpower',
	active_informers_much_gold: 'lots of gold',
	active_informers_dead: 'death',
	active_informers_low_health: 'low health (in fight or dungeon)',
	active_informers_fight: 'fight',
	active_informers_arena_available: 'arena available',
	active_informers_dungeon_available: 'dungeon available',
	active_informers_sail_available: 'sailing available',
	active_informers_datamine_available: 'datamine available',
	active_informers_selected_town: 'town informer',
	active_informers_wanted_monster: 'wanted monster',
	active_informers_special_monster: '<span id="span_special" class="clickable">special</span> monster',
	active_informers_tamable_monster: 'tamable monster',
	active_informers_chosen_monster: '<span id="span_chosen" class="clickable">favourite</span> monster',
	active_informers_pet_knocked_out: 'pet knocked out',
	active_informers_close_to_boss: 'boss warning (dungeon)',
	active_informers_close_to_rival: 'rival warning (sailing)',
	active_informers_guild_quest: 'attempt to defect from the guild',
	active_informers_mini_quest: 'beginning of a mini-quest',
	active_informers_custom_informers: '<span id="span_informers" class="clickable">custom</span> informers',
	active_informers_check: 'check',
	active_informers_check_all: 'all',
	active_informers_or: 'or',
	active_informers_check_none: 'none',
	enable_desktop_alerts: 'Show desktop notifications',
	enable_informer_alerts: 'when informers are activated',
	enable_pm_alerts: 'when receiving new private messages',
	informer_custom_sound: 'Choose a sound for common informers',
	informer_custom_sound_desc: 'instead of default battle mode “ding”',
	informer_custom_sound_arena: 'arena entering sound',
	informer_custom_sound_spar: 'spar request sound',
	informer_custom_sound_msg: 'personal messages’ sound',
	informer_custom_sound_file: 'from file',
	informer_custom_sound_lnk: 'from link',
	informer_custom_sound_volume: 'Volume:',
	informer_custom_sound_play: 'play current sound',
	informer_custom_sound_error_type: 'file type is unsupported, try mp3/wav/ogg',
	informer_custom_sound_error_size: 'file size is too large, try less than ',
	forum_informer_custom_sound: 'Choose a sound for forum informers',
	forum_informer_custom_sound_desc: 'instead of PM “click”',
	informer_alerts_timeout: 'Choose notifications timeout',
	informer_alerts_timeout_desc: 'instead of the default 5 seconds',
	informer_alerts_timeout_hint: 'input time (in seconds)',
	disable_links_autoreplace: 'Disable links autoreplace by images',
	disable_links_autoreplace_desc: 'in forum threads',
	disable_target_post_highlight: 'Do not mark target posts',
	disable_target_post_highlight_desc: 'in forum threads',
	disable_godville_clock: 'Disable Godville clock',
	disable_godville_clock_desc: 'on click at “Remote Control” header',
	localtime_godville_clock: 'Make clock use localtime',
	localtime_godville_clock_desc: 'instead of UTC+3 offset',
	theme_override: 'Remember selected color scheme',
	theme_override_desc: 'and override current on mismatch',
	pm_sounds: 'New private message sound',
	pm_sounds_desc: 'play even when browser window isn’t minimized',
	fix_native_issues: 'Fix Godville issues',
	enable_glowfix: 'fix excessive glowing on hp labels',
	te_pos_fix: 'fix issues with Third Eye content positioning',
	improve_town_abbrs: 'rename some abbreviations on the world map',
	enable_chrome_chatfix: 'prevent closing chats when selecting texts (Chrome)',
	discard_title_changes: 'do not show step number in page title',
	relocate_pets_button: 'move "Pets" button back into Pet block',
	show_godville_clock: 'Show Godville Clock',
	hide_godville_clock: 'Hide Godville Clock',
	enable_debug_mode: 'Enable debugging mode',
	enable_debug_mode_desc: 'just for developers',
	apply: 'Apply',
	options_saved: 'options saved at ',
	voices_capt: 'Voice phrases',
	voices_heal: 'Heal',
	voices_heal_field: 'Heal (field)',
	voices_pray: 'Pray',
	voices_pray_field: 'Pray (field)',
	voices_sacrifice: 'Sacrifice',
	voices_exp: 'Study',
	voices_dig: 'Dig',
	voices_hit: 'Hit',
	voices_hit_field: 'Hit (field)',
	voices_do_task: 'Do task',
	voices_cancel_task: 'Cancel task',
	voices_die: 'Die',
	voices_town: 'Return',
	voices_defend: 'Defend',
	voices_exclamation: 'Exclamation',
	voices_inspect_prefix: 'Inspect prefixes',
	voices_craft_prefix: 'Craft prefixes',
	voices_north: 'North',
	voices_south: 'South',
	voices_west: 'West',
	voices_east: 'East',
	voices_downstairs: 'Downstairs',
	voices_upstairs: 'Upstairs',
	voices_mnemonics: 'Mnemonics',
	voices_save: 'Save',
	voices_defaults: 'Reset to default',
	import_export_capt: 'Settings import/export',
	import_export_all: 'process all settings of all accounts',
	import_all_warning: 'You have requested the import of the whole Godville settings storage (not only eGUI+ settings!), this action can’t be undone. Do you want to continue?',
	export_all_warning: 'You have requested the export of the whole Godville settings storage (not only eGUI+ settings!), do you want to continue?',
	import: 'Import',
	export: 'Export',
	settings_cloud_download: 'Download',
	settings_cloud_upload: 'Upload',
	settings_cloud_download_warning: 'You have requested the download of previously saved settings from the Cloud.\nPlease enter your keyword to continue:',
	settings_cloud_upload_warning: 'You have requested the upload of your settings to the Cloud.\nPlease create your own keyword to continue:',
	settings_cloud_wrong_keyword: 'Wrong keyword!',
	settings_cloud_error: 'Requested operation failed! Please try again later.',
	settings_cloud_missing: 'Your settings could not be found in the Cloud!',
	settings_cloud_download_ok: 'Your settings were successfully downloaded, please press “Import” to apply them.',
	settings_cloud_upload_ok: 'Your settings were successfully uploaded to the Cloud!',
	// forum
	Subscribe: 'subscribe in UI+',
	Unsubscribe: 'unsubscribe in UI+',
	subscribe: 'subscribe',
	unsubscribe: 'unsubscribe',
	subscribe_title: 'Notify about new messages in this topic via eGUI+',
	unsubscribe_title: 'Stop notifying about new messages in this topic via eGUI+',
	bold_hint: 'Bold',
	bold: 'B',
	underline_hint: 'Underline',
	underline: 'U',
	strike_hint: 'Strike',
	strike: 'S',
	italic_hint: 'Italic',
	italic: 'I',
	quote_hint: 'Quote',
	code_hint: 'Code',
	pre_hint: 'Pre',
	link_hint: 'Insert link',
	unordered_list_hint: 'Unordered list',
	ordered_list_hint: 'Ordered list',
	br_hint: 'Insert line breaker',
	sup_hint: 'Superscript',
	sub_hint: 'Subscript',
	monospace_hint: 'Monospace',
	monospace: 'ms',
	broadcast: 'broadcast',
	start_streaming: 'Stream',
	streaming_now: 'Streaming',
	cancel_streaming: 'Stop streaming',
	streaming_is_unsupported: 'Currently installed eGUI+ version is outdated. Please update it to enable streaming support!',
	streaming_failed: 'Something went wrong. Please make sure you are using the latest version of the extension, or try again later.',
	user_css: 'User CSS',
	open_chat_with: 'Open chat with god/goddess ',
	open_in_a_new_tab: 'Open in a new tab',
	north_east: 'north-east',
	north_west: 'north-west',
	south_east: 'south-east',
	south_west: 'south-west',
	burning: 'very hot (1–2 steps from treasure)',
	hot: 'hot (3–5 steps from treasure)',
	warm: 'warm (6–9 steps from treasure)',
	mild: 'mild (10–13 steps from treasure)',
	cold: 'cold (14–18 steps from treasure)',
	freezing: 'very cold (19 or more steps from treasure)',
	map: 'Map',
	opps: 'Opponents',
	sailors: 'Sailors',
	map_sm: 'map is streamed by the campaign participant',
	map_cgm: 'map is generated from the campaign log',
	cgm_no_dlm: 'Map unfinished: missing direction data for step #$1!',
	cgm_no_wm: 'Map unfinished: missing teleport data for step #$1!',
	dungeon_map_failed: 'Dungeon map processing failed!',
	dungeon_map_failed_manual: 'Corrections are manually set!',
	dungeon_map_failed_dl_label: 'Directionless',
	dungeon_map_failed_wh_label: 'Teleports',
	dungeon_map_failed_dl_title: 'step:direction',
	dungeon_map_failed_wh_title: 'step:shiftX:shiftY',
	dungeon_map_failed_list: 'Comma separated list of',
	dungeon_map_failed_reset: 'Reset',
	dungeon_map_failed_apply: 'Apply',
	dungeon_map_failed_parse: 'Unable to parse provided corrections.',
	trace_map_start: 'Start trace',
	trace_map_pause: 'Pause trace',
	trace_map_stop: 'Stop trace',
	trace_map_next: 'Next step',
	trace_map_prev: 'Previous step',
	trace_map_progress_step: 'Selected step',
	trace_map_progress_stopped: 'Click or press to jump into step',
	trace_map_progress_prompt: 'Please enter the step number to jump to:',
	browser: 'Browser:',
	version: 'Version:',
	clear_voice_input: 'Clear voice input',
	trophy: 'trophy ',
	save_log_to: 'Save to',
	save_log_fullpage: 'To save the chronicle into archive please switch your browser to show a desktop version of the page.',
	map_pointer: 'Pointer',
	map_pointer_disabled: 'highlighting disabled',
	lb_add: 'Add row',
	lb_save: 'Save',
	lb_reset: 'Reset',
	lb_close: 'Close',
	lb_enable: 'Enable',
	lb_save_duplicate: 'Can’t save, duplicated value detected: “$1”',
	lb_reset_confirm: 'Are you sure you want to reset this setting to its default value?',
	lb_pets_title: 'Customize tamable monsters',
	lb_pets_desc: 'List monsters that could be tamed:<br><i>name</i> <i>min_hero_level</i> [<i>max_hero_level</i>]',
	lb_chosen_monsters_title: 'Customize favourite monters',
	lb_chosen_monsters_desc: 'List monster names to notify when met:',
	lb_special_monsters_title: 'Customize special monters',
	lb_special_monsters_desc: 'List prefixes one by line:',
	lb_ally_blacklist_title: 'Setup your scratch-pad',
	lb_ally_blacklist_desc: 'List some players to mark when met in battle modes:<br><i>godname</i> [<i>comment</i>] [<i>CSS</i>]',
	lb_custom_craft_title: 'Custom craft combination rules setup',
	lb_custom_craft_desc: 'List your craft combo rules:<br><span class="lightbox_opt_desc" title="short combo name (shown as button)">title</span> <span class="lightbox_opt_desc" title="full combo name (shown as hint)">name</span> <span class="lightbox_opt_desc" title="first letters of trophies to merge">starting letters</span> <span class="lightbox_opt_desc" title="type of trophies to merge:\nb — bold\nr — regular\nm — mixed">trophy types</span>',
	lb_custom_informers_title: 'Custom informers setup',
	lb_custom_informers_desc: 'List your informer rules:<br><span class="lightbox_opt_desc" title="visible name of the informer">title</span> <span class="lightbox_opt_desc" title="expression defining the logic of informer activation (see FAQ for details)">logical_expression</span> <span class="lightbox_opt_desc" title="combination of letters:\nS — sticky (no auto-disabling)\nL — label with flashing (+N to disable flashing)\nD — desktop notification\nA — sound notification\nR — repeatable sound notification\n\nemply line means global defaults">type</span> [<a href="' + GUIp.common.erinome_url_en + '/godville/?show=FAQ" target="_blank">FAQ</a>]',
	custom_informers_error: 'Error in expression',
	custom_informers_braces_note: '\n\nNote: If you’d like to have braces in your informer’s title and not intending to calculate a complex expression inside them, you should double them: {{.',
	custom_informers_non_trivial_errors: 'Errors in custom informers were detected:',
	custom_informers_check: 'Custom informer expressions check',
	custom_informers_check_expr: 'Expression: ',
	custom_informers_check_result: 'Result: ',
	custom_informers_input: 'Please input expression you wish to test:',
	coords_error_title: 'Chronicle parsing failed!',
	coords_error_desc: 'Coordinates mismatch',
	step_n: 'Step #',
	confirm_item_activate: 'Proceed?',
	town_informer: 'Town informer',
	town_informer_curtown: 'Selected town',
	town_informer_curms: 'Selected milestone',
	town_informer_choose: 'Select a town to inform about',
	town_informer_reset: 'Deselect the town',
	town_informer_gvroads: 'All the roads today lead to Godville',
	daily_forecast: 'Daily Forecast',
	daily_forecast_update_notice: 'Requested data update from Godville News!',
	bingo_summary: '\n+ Bingo: $1, $2.', // $1 slots, $2 clicks
	bingo_slots_1: '1 slot',
	bingo_slots_2: '$1 slots',
	bingo_clicks_1: '1 click',
	bingo_clicks_2: '$1 clicks',
	coupon_available: '\n+ Coupon for $1.',
	coupon_available_mobile: 'Newspaper coupon for $1',
	ad_available: '\n+ Advert: $1 ($2)',
	ad_available_mobile: 'Active advert: [$1]',
	godpower_cap_available: '\n+ Godpower cap.',
	forum_subs_short: 'Subscribed Topics',
	forum_subs: 'Subscribed Topics (UI+)',
	forum_subs_lowercase: 'subscribed topics (UI+)',
	forum_subs_by: 'by',
	forum_subs_view: 'view',
	forum_subs_last: 'last',
	forum_subs_last_m: 'last',
	forum_subs_posts_m: 'Posts',
	forum_subs_notif_abbr: 'Notif.',
	forum_subs_notif_title: 'Notifications',
	forum_subs_desktop_notif: 'Desktop notification',
	forum_subs_sound_notif: 'Sound notification',
	forum_subs_desktop_notif_m: 'Desk. notif.',
	forum_subs_sound_notif_m: 'Sound notif.',
	forum_subs_info: 'Last message by ',
	forum_subs_new_posts_1: '1 new post (@$2) in topic “$3”',
	forum_subs_new_posts_2: '$1 new posts (@$2) in topic “$3”',
	forum_subs_no_subs: 'You have no subscribed topics yet.',
	forum_subs_missing_subs: 'Subscribed topics not found!',
	forum_subs_limit_exceeded: 'You have exceeded the limit of available subscriptions!',
	forum_subs_rapid_exceeded: 'You have exceeded the limit of prioritized subscriptions!',
	forum_subs_count: 'Subscribed topics: ',
	forum_subs_rapid: ', prioritized: ',
	forum_subs_intv: ', updates every: ~',
	forum_subs_full: 'see on the forum',
	format_time_minute: 'min.',
	format_time_minutes: 'min.',
	format_time_hour: 'hour',
	format_time_hours: 'hours',
	format_time_ago: 'ago',
	forum_missing_target_post: 'The post you are looking for is missing. It has probably been deleted or moved to another page of the topic. <a>Click here</a> to try searching for it.',
	bingo_expensive_artifact: 'very valueable artifact',
	gpc_remind_when: 'Remind when $1%',
	gpc_filled: 'The godpower cap is $1% full',
	sail_port: 'port',
	sail_rim: 'rim',
	sail_ruler: 'Ruler (Alt+R)',
	sail_dist_to_port: ' ($1 to port)',
	sail_conds: 'Sea peculiarities',
	sea_monster: 'Sea monster',
	sea_monster_report: 'Report this undetected sea monster to eGUI+ developer',
	saver_invalid_log: 'only godville chronicles are allowed for upload',
	saver_missing_log: 'the chronicle is missing',
	saver_missing_log_c: 'No duel chronicle could be found using this link',
	saver_missing_log_suggest: 'Try searching your chronicle at <a href="//gvg.erinome.net/duels/log/$1?from=search">gvg.erinome.net</a>',
	saver_broadcast_log: 'broadcasts are not allowed for upload',
	saver_broadcast_log_c: 'broadcast',
	saver_already_working: 'Chronicle is already being processed!',
	saver_error: 'An error occured when processing your chronicle. Please try again later.',
	badge_equip: 'Average equipment level relative to hero’s level',
	badge_skill: 'Skill training minimal cost',
	badge_pet1: 'Time to resurrect a pet',
	badge_pet2: 'Pet resurrection fee',
	ally_blacklist: 'Players scratch-pad',
	ally_blacklist_desc: 'Mark players listed in <span id="span_ally_blacklist" class="clickable">scratch-pad</span> in battle modes',
	player_marked: 'Player is in your scratch-pad',
	tes_tmpl_profit: 'This option should be enabled for conversion timer in eGUI+',
	tes_dgn_res: 'This option should be enabled for guaranteed logs timer in eGUI+',
	tes_r_res: 'This option should be enabled for guaranteed glyphs timer in eGUI+',
	tes_chf_res: 'This option should be enabled for showing who won the sparring fight in eGUI+',
	bp_others: 'There are other spare parts for this slot in the inventory:',
	bp_prefix: ' of the ',
	bp_types: ['fur','horn','ear','eye','heart','rib','fillet','lucky paw','hoof','tail'],
	open_pchat: 'open private chat',
	open_ppage: 'open personal page',
	nearby_town: 'Nearby town: $1 ($2 ms.)',
	get town_banner() {
		return 'Town is ' + ['famous','known','celebrated','popular','admitted','recognized','notable','prominent'][Math.floor(Math.random()*8)] + ' for ';
	},
	town_as_well_as: ' as well as ',
	town_shifted: 'At this place $1 is usually located',
	town_waste_fraction: 'Heroes waste $1% of their gold here',
	town_skills_discount: 'Skills average discount: $1%',
	town_skills_markup: 'Skills average markup: $1%',
	town_current: 'Current location',
	statistics: 'Statistics',
	statistics_title: 'Open hero stats page',
	equip_boldness: ['deals more damage to monsters','gives better protection','hero gets more experience','speeds up health recovery','give advantage in trade','make travel faster','saves the hero from an imminent death'],
	trademode_timer_wait: 'Please wait for trade timer to initialize...',
	rmap_important_step: 'Some bits may unlock on this step',
	rmap_more_info: 'More information',
	bits_summary: 'Bits: ',
	bits_free: 'Free ($1)',
	bits_collected: 'Collected ($1)',
	bits_total: 'Total',
	bits_initial: 'Initial',
	bits_synthesized: 'Created with nuclear synthesis',
	bits_created: 'Created with miracles ($1)',
	bits_destroyed: 'Destroyed',
	rmap_pushes: 'Pushes',
	rmap_encouragements: 'Encouragements',
	rmap_punishments: 'Punishments',
	rmap_miracles: 'Miracles',
	rmap_success_steps: 'Bosscoin completion step',
	map_preview_share: 'Share the map of this dungeon',
	map_preview_search: 'and search others',
	map_preview_stale: 'Current log was updated, please reload the page and try again.',
	map_cellar_substr: ', B',
	refinery_available_at: 'Refinement will be available at ',
	immortality_up_to: 'Immortality active up to ',
	gathered_soul_types: [
		'generous', 'kind', 'free', 'lost', 'stray', 'restless', 'dark', 'filthy', 'rotten', 'mysterious', 'dead', 'bright'
	],
	trade_orders_fetch: 'Load history',
	trade_orders_fetch_title: 'Download and show statistics from the order archive (UI+)',
	wakelock_menu: 'Keep the screen on',
	call_in_gc: 'Call in Guild Council'
}; // GUIp_i18n

}); // registerModule

})(this);
