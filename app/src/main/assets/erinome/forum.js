(function(worker) {
'use strict';

// base functions and variables initialization

var doc = document;
var $id = function(id) {
	return doc.getElementById(id);
};
var $C = function(classname) {
	return doc.getElementsByClassName(classname);
};
var $c = function(classname) {
	return doc.getElementsByClassName(classname)[0];
};
var $T = function(classname) {
	return doc.getElementsByTagName(classname);
};
var $Q = function(sel) {
	return doc.querySelectorAll(sel);
};
var $q = function(sel) {
	return doc.querySelector(sel);
};
var storage = {
	_getKey: function(key) {
		return 'eGUI_' + this.god_name + ':' + key;
	},
	set: function(id, value) {
		if (!this.god_name || this.god_name === '_unknown_') {
			// there's no single reason to write into localStorage broken entries with invalid logins. we can't do anything with it anyway
			return;
		}
		localStorage[this._getKey(id)] = value;
	},
	get: function(id) {
		return localStorage.getItem(this._getKey(id));
	},
	getFlag: function(id) {
		return this.get(id) === 'true';
	},
	god_name: ''
};
var addSmallElements = function() {
	var temp = $Q('.c2, .ftopic');
	for (i = 0, len = temp.length; i < len; i++) {
		if (!temp[i].querySelector('small')) {
			temp[i].insertAdjacentHTML('beforeend', '<small></small>');
		}
	}
};
var followOnclick = function(e) {
	e.preventDefault();
	var topic, posts, dates, date, name, by,
		topics = JSON.parse(storage.get('ForumSubscriptions')) || {};
	if (isTopic) {
		var nextPageDisabled = !!$C('disabled next_page').length;
		topic = location.pathname.match(/\d+/)[0];
		posts = +$c('subtitle').textContent.match(/\d+/)[0];
		dates = $T('abbr');
		date = nextPageDisabled ? dates[dates.length - 1] : 0;
		name = $q('.cur_nav').textContent;
		by = nextPageDisabled ? $Q((isMobile ? '.st_header' : '.fn') + ' > span:first-child > a')[dates.length - 1].textContent : '-'
	} else {
		topic = this.parentElement.parentElement.querySelector('a').href.match(/\d+/)[0];
		posts = isMobile ? +this.parentElement.parentElement.nextElementSibling.nextElementSibling.textContent.match(/\d+/) : +this.parentElement.parentElement.nextElementSibling.textContent;
		date = isMobile && !isSubs ? 0 : this.parentElement.parentElement.parentElement.getElementsByTagName('abbr')[0]; // in default mobile layout there's no exact date available at all
		name = this.parentElement.parentElement.querySelector('a').textContent;
		by = this.parentElement.parentElement.parentElement.querySelector(isMobile ? '.ftnotes strong' : 'span.author').textContent
	}
	if (date) {
		// mobile layout doesn't provide us the date in machine-readable format even in topics, so we have to parse it ourselves
		date = date.title ? new Date(date.title) : (GUIp.common.parseDateTime(date.textContent.trim()) || 0);
	}
	if (Object.keys(topics).length < 60) {
		topics[topic] = {posts: posts, name: name, by: by, date: +date};
	} else {
		worker.alert(worker.GUIp_i18n.forum_subs_limit_exceeded + ' (60)');
		return;
	}
	storage.set('ForumSubscriptions', JSON.stringify(topics));
	this.style.display = 'none';
	this.parentElement.querySelector('.unfollow').style.display = 'inline';
	if (isSubs) {
		this.parentElement.querySelector('.mkrapid').style.display = 'inline';
		var checkboxes = this.parentElement.parentElement.parentElement.querySelectorAll('input[type=checkbox]');
		for (var i = 0, len = checkboxes.length; i < len; i++) {
			checkboxes[i].disabled = false;
		}
		updateSubscriptionsStats(topics, Object.keys(topics));
	}
};
var addOnclickToFollow = function() {
	var follow_links = $Q('.follow');
	for (i = 0, len = follow_links.length; i < len; i++) {
		GUIp.common.addListener(follow_links[i], 'click', followOnclick);
	}
};
var unfollowOnclick = function(e) {
	e.preventDefault();
	var topic = isTopic ? location.pathname.match(/\d+/)[0]
						: this.parentElement.parentElement.querySelector('a').href.match(/\d+/)[0],
		topics = JSON.parse(storage.get('ForumSubscriptions')) || {},
		informers = JSON.parse(storage.get('ForumInformers')) || {};
	delete topics[topic];
	storage.set('ForumSubscriptions', JSON.stringify(topics));
	if (informers[topic]) {
		var notify = {tid: +topic, obsolete: true, ndate: Date.now()};
		storage.set('ForumInformersNotify' + Math.random(), JSON.stringify(notify));
	}
	this.style.display = 'none';
	this.parentElement.querySelector('.follow').style.display = 'inline';
	if (isSubs) {
		var tr = this.parentElement.parentElement.parentElement, icon, checkboxes;
		this.parentElement.querySelector('.mkrapid').style.display = 'none';
		this.parentElement.querySelector('.unmkrapid').style.display = 'none';
		if ((icon = tr.getElementsByClassName('icon')[0])) {
			icon.classList.add('grey');
			icon.classList.remove('green');
		}
		checkboxes = tr.querySelectorAll('input[type=checkbox]');
		for (var i = 0, len = checkboxes.length; i < len; i++) {
			checkboxes[i].checked = false;
			checkboxes[i].disabled = true;
		}
		updateSubscriptionsStats(topics, Object.keys(topics));
	}
};
var addOnclickToUnfollow = function() {
	var unfollow_links = $Q('.unfollow');
	for (i = 0, len = unfollow_links.length; i < len; i++) {
		GUIp.common.addListener(unfollow_links[i], 'click', unfollowOnclick);
	}
};
var addOnclickToRapid = function() {
	var rapid_links = $Q('.mkrapid');
	for (i = 0, len = rapid_links.length; i < len; i++) {
		GUIp.common.addListener(rapid_links[i], 'click', function(e) {
			e.preventDefault();
			var topic = isTopic ? location.pathname.match(/\d+/)[0]
								: this.parentElement.parentElement.querySelector('a').href.match(/\d+/)[0],
				topics = JSON.parse(storage.get('ForumSubscriptions')) || {},
				keys = Object.keys(topics),
				rapid = 0;
			for (var j = 0, len2 = keys.length; j < len2; j++) {
				if (topics[keys[j]].rapid) {
					rapid++;
				}
			}
			if (rapid >= 9) {
				worker.alert(worker.GUIp_i18n.forum_subs_rapid_exceeded + ' (9)');
				return;
			}
			if (topics[topic]) {
				topics[topic].rapid = true;
				storage.set('ForumSubscriptions', JSON.stringify(topics));
			}
			this.style.display = 'none';
			this.parentElement.querySelector('.unmkrapid').style.display = 'inline';
			if (isSubs) {
				updateSubscriptionsStats(topics,keys);
			}
		});
	}
};
var addOnclickToUnrapid = function() {
	var rapid_links = $Q('.unmkrapid');
	for (i = 0, len = rapid_links.length; i < len; i++) {
		GUIp.common.addListener(rapid_links[i], 'click', function(e) {
			e.preventDefault();
			var topic = isTopic ? location.pathname.match(/\d+/)[0]
								: this.parentElement.parentElement.querySelector('a').href.match(/\d+/)[0],
				topics = JSON.parse(storage.get('ForumSubscriptions')) || {};
			if (topics[topic]) {
				delete topics[topic].rapid;
				storage.set('ForumSubscriptions', JSON.stringify(topics));
			}
			this.style.display = 'none';
			this.parentElement.querySelector('.mkrapid').style.display = 'inline';
			if (isSubs) {
				updateSubscriptionsStats(topics, Object.keys(topics));
			}
		});
	}
};
var addLinks = function(fullSubscrText) {
	var links_containers;
	if (isTopic) {
		links_containers = $q(isMobile ? '#t_notify a:last-of-type' : '#content .crumbs');
		topic = location.pathname.match(/\d+/)[0];
		var isFollowed = topics[topic] !== undefined;
		if (links_containers) {
			links_containers.insertAdjacentHTML('afterend',
				'\n<div id="ui_notify' + (isMobile ? '_m' : '') + '">' +
				'<a class="follow" href="#" style="display: ' + (isFollowed ? 'none' : 'inline') + '" title="' + worker.GUIp_i18n.subscribe_title + '">' + worker.GUIp_i18n.Subscribe + '</a>' +
				'<a class="unfollow" href="#" style="display: ' + (isFollowed ? 'inline' : 'none') + '" title="' + worker.GUIp_i18n.unsubscribe_title + '">' + worker.GUIp_i18n.Unsubscribe + '</a>' +
				'</div>'
			);
		}
	} else {
		links_containers = $Q('.c2 small, .ftopic small');
		for (i = 0, len = links_containers.length; i < len; i++) {
			topic = links_containers[i].parentElement.getElementsByTagName('a')[0].href.match(/\d+/)[0];
			var isFollowed = topics[topic] !== undefined,
				isRapid = topics[topic] && topics[topic].rapid;
			links_containers[i].insertAdjacentHTML('beforeend',
				'\n<a class="follow" href="#" style="display: ' + (isFollowed ? 'none' : 'inline') + '" title="' + worker.GUIp_i18n.subscribe_title + '">' + (isMobile && !fullSubscrText ? '♡' : worker.GUIp_i18n.subscribe) + '</a>' +
				'<a class="unfollow" href="#" style="display: ' + (isFollowed ? 'inline' : 'none') + '" title="' + worker.GUIp_i18n.unsubscribe_title + '">' + (isMobile && !fullSubscrText ? '♥︎' : worker.GUIp_i18n.unsubscribe) + '</a>' +
				(isSubs ? ' <a class="mkrapid" href="#" style="display: ' + (isFollowed && !isRapid ? 'inline' : 'none') + '">☆</a>' + '<a class="unmkrapid" href="#" style="display: ' + (isFollowed && isRapid ? 'inline' : 'none') + '">★</a>' : '')
			);
		}
	}
	addOnclickToFollow();
	addOnclickToUnfollow();
	addOnclickToRapid();
	addOnclickToUnrapid();
};
var addTooltipEmulation = function() {
	Array.prototype.forEach.call(document.getElementsByTagName('abbr'), GUIp.common.tooltips.watchSubtree);
};
var prepareSubscriptionsList = function() {
	var i, len, elm, tid, sub, page, date, comment, last,
		content = '',
		informers = GUIp.common.parseJSON(storage.get('ForumInformers')) || {},
		subscriptions = GUIp.common.parseJSON(storage.get('ForumSubscriptions')) || {},
		topics = Object.keys(subscriptions).filter(function(tid) {
			return /^\d+$/.test(tid) && subscriptions[tid] && typeof subscriptions[tid] === 'object';
		}).slice(0, 500);

	if ((elm = $q('.crumbs .cur_nav'))) {
		elm.textContent = worker.GUIp_i18n.forum_subs;
	}
	elm = $Q(isMobile ? '#search_link, .forum .subtitle, .forum .pagination, .forum .pre_list' : '#search_block, #content .subtitle, #content .pagination, #content div a[href="/forums/new_topic/1"]');
	for (i = 0, len = elm.length; i < len; i++) {
		elm[i].style.display = 'none';
	}
	elm = $Q(isMobile ? '.forum .ft_line' : 'tr.hentry');
	for (i = 0, len = elm.length; i < len; i++) {
		elm[i].parentNode.removeChild(elm[i]);
	}
	if (!isMobile) {
		var abbr = document.createElement('abbr');
		abbr.title = GUIp_i18n.forum_subs_notif_title;
		abbr.textContent = GUIp_i18n.forum_subs_notif_abbr;
		elm = $Q('table.topics th');
		elm[2].textContent = elm[1].textContent; // set `Posts` into third column
		elm[1].textContent = '';
		elm[1].appendChild(abbr);
	}
	if (!topics.length) {
		insertSubscriptions(isMobile ? '<div class="ft_line"><div class="ftopic">' + + '</div></div>' : '<tr><td colspan="5">' + worker.GUIp_i18n.forum_subs_no_subs + '</td></tr>');
		return;
	}
	topics.sort(function(a, b) { return (+subscriptions[b].date || 0) - (+subscriptions[a].date || 0); });
	for (i = 0, len = topics.length; i < len; i++) {
		tid = topics[i];
		sub = subscriptions[tid];
		sub.name = GUIp.common.escapeHTML(String(sub.name || '').slice(0, 512));
		sub.by = GUIp.common.escapeHTML(String(sub.by || '').slice(0, 256));
		sub.posts = Math.max(0, Math.min(1e7, parseInt(sub.posts, 10) || 0));
		sub.notifications = parseInt(sub.notifications, 10) || 0;
		page = Math.ceil(sub.posts / 25);
		date = new Date(sub.date || 0);
		comment = '<img alt="Comment" class="icon ' + (tid in informers ? 'green' : 'grey') + ' " src="/images/forum/clearbits/comment.gif">';
		last = 	'<abbr class="updated" title="' + GUIp.common.formatTime(date,'fakejson') + '">' + GUIp.common.formatTime(date,'forum') + '</abbr> ' +
					worker.GUIp_i18n.forum_subs_by + (isMobile ? '<strong>' : '<span class="author"><strong class="fn">') + sub.by + '</strong>' + (isMobile ? '' : '</span>') +
					' <a href="/forums/show_topic/' + tid + '?page=' + page + '&epost=' + (sub.posts + 25 - page*25) + '">' + (isMobile ? '➠' : worker.GUIp_i18n.forum_subs_view) + '</a></span>';
		if (isMobile) {
			content += '<div class="ft_line">' + comment + '<div class="ftopic">' +
					'<a href="/forums/show_topic/' + tid + '" class="entry-title" rel="bookmark">' + sub.name + '</a>' +
				'</div><div class="ftnotes">' + worker.GUIp_i18n.forum_subs_last_m + ' ' + last + '</div><div class="ftfooter">' + worker.GUIp_i18n.forum_subs_posts_m + ': ' + sub.posts + ' ' +
				(GUIp.common.notif.supported ?
					'<label data-e-tid="' + tid + '"><input type="checkbox" data-e-mask="1" ' + (sub.notifications & 0x1 ? ' checked' : '') + '> ' + GUIp_i18n.forum_subs_desktop_notif_m + '</label>'
					: '') +
					'<label data-e-tid="' + tid + '"><input type="checkbox" data-e-mask="2" ' + (sub.notifications & 0x2 ? ' checked' : '') + '> ' + GUIp_i18n.forum_subs_sound_notif_m + '</label>' +
				'</div></div>';
		} else {
			content += '<tr class="hentry">' +
				'<td style="padding:5px; width:16px;" class="c1">' + comment + '</td>' +
				'<td class="c2">' +
					'<a href="/forums/show_topic/' + tid + '" class="entry-title" rel="bookmark">' + sub.name + '</a> ' +
					'<small><a href="/forums/show_topic/' + tid + '?page=' + page + '">' + worker.GUIp_i18n.forum_subs_last + '</a></small>' +
				'</td>' +
				'<td class="ca inv" style="padding: 0;" data-e-tid="' + tid + '">' +
					(GUIp.common.notif.supported ?
						'<input type="checkbox" data-e-mask="1" ' +
						(sub.notifications & 0x1 ? ' checked' : '') +
						' title="' + GUIp_i18n.forum_subs_desktop_notif + '" />'
					: '') +
					'<input type="checkbox" data-e-mask="2" ' +
						(sub.notifications & 0x2 ? ' checked' : '') +
						' title="' + GUIp_i18n.forum_subs_sound_notif + '" />' +
				'</td>' +
				'<td class="ca inv stat">' + sub.posts + '</td>' +
				'<td class="lp">' + last + '</td></tr>';
		}
	}
	insertSubscriptions(content);
	content = null;
	updateSubscriptionsStats(subscriptions,topics);
	addSmallElements();
	addLinks(true);

	var notifswitch = function(ev) {
		var checkbox = ev.target,
			mask = checkbox.dataset.eMask;
		if (!mask) return;

		var subscriptions = GUIp.common.parseJSON(storage.get('ForumSubscriptions')) || {},
			tid = checkbox.parentNode.dataset.eTid,
			sub = subscriptions[tid];
		if (!sub) return;

		// typeof mask === 'string'
		if (checkbox.checked) {
			sub.notifications |= mask;
		} else {
			sub.notifications &= ~mask;
		}
		storage.set('ForumSubscriptions', JSON.stringify(subscriptions));
	};
	Array.from($Q('table.topics input, .ft_line input')).forEach(function (input) {
		GUIp.common.addListener(input, 'click', notifswitch);
	});
};
var insertSubscriptions = function(content) {
	$q(isMobile ? '.forum .pagination' : 'table.topics tbody').insertAdjacentHTML(isMobile ? 'afterend' : 'beforeend', content);
};
var updateSubscriptionsStats = function(subscriptions, keys) {
	var topics, interval, rapid = 0, subtitle = $q((isMobile ? '.forum' : '#content') + ' .subtitle');
	if (!subtitle) {
		return;
	}
	for (i = 0, len = keys.length; i < len; i++) {
		if (subscriptions[keys[i]].rapid) {
			rapid++;
		}
	}
	interval = (Math.ceil((keys.length - rapid) / (20 - rapid)) || 1) * 3;
	subtitle.textContent = worker.GUIp_i18n.forum_subs_count + keys.length + (keys.length > 0 ? (rapid > 0 ? worker.GUIp_i18n.forum_subs_rapid + rapid : '') + worker.GUIp_i18n.forum_subs_intv + interval + ' ' + worker.GUIp_i18n.format_time_minute : '');
	subtitle.style.display = '';
};
var addSubscriptionsLink = function() {
	var node,
		lnk = document.createElement('a'),
		div = document.createElement('div');
	lnk.href = '/forums/show/1/#guip_subscriptions';
	lnk.textContent = worker.GUIp_i18n.forum_subs_lowercase;
	lnk.title = worker.GUIp_i18n.forum_subs;
	div.appendChild(lnk);
	div.style.textAlign = 'center';
	div.style.marginTop = '0.5em';
	if (isMobile && (node = $id('footer'))) {
		node.parentNode.insertBefore(div, node);
	} else if ((node = $id('content'))) {
		node.appendChild(div);
	}
};
var getTotalPosts = function() {
	try {
		return +/\d+/.exec($q((isMobile ? '.forum' : '#content') + ' .subtitle').textContent.replace(',', ''))[0];
	} catch (e) {
		return 0;
	}
};
var rearrangeUnreadSubs = function() {
	// we're only interested in desktop version here since mobile layout has no info about post numbers at all
	if (!$id('pant_tbl')) {
		return;
	}
	var tbody = $id('pant_tbl').lastElementChild,
		refRow = tbody.firstElementChild.nextElementSibling, // skip header
		row, next;
	while (refRow && +refRow.firstElementChild.nextElementSibling.textContent) {
		refRow.classList.add('e_unread_sub');
		refRow = refRow.nextElementSibling;
	}
	if (!refRow) return;
	// `refRow` is the first topic that contains 0 unread posts
	for (row = refRow.nextElementSibling; row; row = next) {
		next = row.nextElementSibling;
		if (+row.firstElementChild.nextElementSibling.textContent) {
			row.classList.add('e_unread_sub');
			tbody.insertBefore(row, refRow);
		}
	}
};
// topic formatting
var val = '', ss = 0, se = 0, pageSelection = '';

/**
 * @param {!HTMLTextAreaElement} editor
 */
var initEditor = function(editor) {
	val = editor.value;
	ss = editor.selectionStart;
	se = editor.selectionEnd;
	var selection = worker.getSelection();
	pageSelection = selection.isCollapsed ? '' : selection.toString().trim();
};

/**
 * @param {!HTMLTextAreaElement} editor
 */
var unsetSelection = function(editor) {
	if (editor.selectionDirection === 'backward') {
		se = ss;
	} else {
		ss = se;
	}
};

var trimSelection = function() {
	var c = '';
	while (ss !== se && ((c = val[ss]) === ' ' || c === '\t' || c === '\n')) {
		ss++;
	}
	while (ss !== se && ((c = val[se - 1]) === ' ' || c === '\t' || c === '\n')) {
		se--;
	}
};

var deselectListMarkerOrBlockTag = function() {
	if (ss && val[ss - 1] !== '\n') return;
	// cannot use /\s/ since it also matches '\xA0' (nbsp) and other stuff
	var regex = /(?:[*#]+|(?:[a-z][a-z0-9]*|[Цц][Тт])\.\.?) [ \t]*/g,
		m;
	regex.lastIndex = ss;
	if ((m = regex.exec(val)) && m.index === ss && regex.lastIndex <= se) {
		ss = regex.lastIndex;
	}
};

var expandSelectionToLine = function() {
	if (ss) ss = val.lastIndexOf('\n', ss - 1) + 1;
	var pos = val.indexOf('\n', se);
	se = pos >= 0 ? pos : val.length;
};

/**
 * @param {string} separator
 * @returns {string}
 */
var getSelectedText = function(separator) {
	if (ss === se) return pageSelection;
	var result = val.slice(ss, se);
	if (pageSelection) {
		// text is selected both in the textarea and on the page. why would someone do that?..
		// anyway, just concatenate them.
		result += separator;
		result += pageSelection;
	}
	return result;
};

/**
 * @param {!HTMLTextAreaElement} editor
 * @param {string} text
 */
var replaceSelectedText = function(editor, text) {
	editor.setSelectionRange(ss, se);
	editor.focus();
	try {
		// for Chrome and Edge; supports Ctrl+Z this way
		// one day it may work in Firefox too: https://bugzilla.mozilla.org/show_bug.cgi?id=1220696
		if (document.execCommand('insertText', false, text)) {
			return;
		}
	} catch (e) { }
	try {
		editor.setRangeText(text); // for Firefoxes; older ones support Ctrl+Z, while newer ones do not
	} catch (e) {
		editor.value = val.slice(0, ss) + text + val.slice(se); // for Opera
	}
};

/**
 * @param {string} text
 * @param {number} pos
 * @returns {number}
 */
var consumeLineBreak = function(text, pos) {
	var len = text.length,
		start = pos,
		c = '';
	do {
		if (pos === len) return pos - start; // assume implicit line break at the end
		c = text[pos++];
	} while (c === ' ' || c === '\t');
	return c === '\n' ? pos - start : -1;
};

/**
 * @param {string} text
 * @param {number} pos
 * @returns {boolean}
 */
var hasLineBreakBefore = function(text, pos) {
	var c = '';
	do {
		if (!pos) return true; // assume implicit line break at the start
		c = text[--pos];
	} while (c === ' ' || c === '\t');
	return c === '\n';
};

/**
 * @param {string} text
 * @param {number} pos
 * @returns {number}
 */
var consumeListMarker = function(text, pos) {
	var len = text.length,
		start = pos,
		c = '';
	if (pos === len) return -1;
	c = text[pos];
	if (c !== '*' && c !== '#') return -1;
	do {
		if (++pos === len) return -1;
		c = text[pos];
	} while (c === '*' || c === '#');
	return c === ' ' ? pos - start : -1;
};

/**
 * @param {string} text
 * @returns {!Array<number>}
 */
var findParaBreaks = function(text) {
	var result = [],
		rx = /[ \t\n]*\n(?:[*#]+ |[ \t]*\n(?:(?:[a-z][a-z0-9]*|[Цц][Тт])\.\.? )?)[ \t]*/g,
		m;
	while ((m = rx.exec(text))) {
		result.push(m.index, rx.lastIndex);
	}
	return result;
};

/**
 * @param {string} text
 * @returns {{hasNonList: boolean, positions: !Array<number>}}
 */
var findListBreaks = function(text) {
	var hasNonList = false,
		positions = [],
		insideList = false,
		len = text.length,
		pos = 0,
		step = 0;
	while (pos !== len) {
		if ((step = consumeListMarker(text, pos)) >= 0) { // this line has a list marker
			insideList = true;
			positions.push(pos, (pos += step));
		} else if ((step = consumeLineBreak(text, pos)) >= 0) { // this is a paragraph break
			insideList = false;
			pos += step;
			continue;
		} else if (!insideList) {
			hasNonList = true;
			positions.push(pos, pos);
		} // otherwise, this line is a part of the (multiline) list item seen earlier
		pos = text.indexOf('\n', pos) + 1;
		if (!pos) break;
	}
	return {hasNonList: hasNonList, positions: positions};
};

/**
 * @param {string} text
 * @param {number} pos
 * @returns {boolean}
 */
var isListItemAt = function(text, pos) {
	if (!pos++) {
		return consumeListMarker(text, 0) >= 0;
	}
	// search for a paragraph boundary backwards
	do {
		pos = text.lastIndexOf('\n', pos - 2);
		if (consumeListMarker(text, pos + 1) >= 0) {
			return true;
		}
	} while (pos >= 2 && !hasLineBreakBefore(text, pos));
	return false;
};

/**
 * @param {!Array<*>} leftAndRight
 * @param {!HTMLTextAreaElement} editor
 * @param {!Event} ev
 */
var insertInlineTag = function(leftAndRight, editor, ev) {
	ev.preventDefault();
	initEditor(editor);
	trimSelection();
	deselectListMarkerOrBlockTag();
	var selection = getSelectedText(' '),
		s = '',
		precedingChar = ss ? val[ss - 1] : '',
		// '"' is a delimiter as well, but we exclude it since text processors can silently
		// replace it with '“' or '”', which are not delimiters
		delimiters = ' \t\n`~!#$%^&()-=[]/\\|;:.,<?',
		restrictedTag = !!leftAndRight[2],
		needsIsolation = restrictedTag ? (
			!!precedingChar && precedingChar !== ' ' && precedingChar !== '\n'
		) : (
			// similarly, '...' counts as a delimiter, but '…' does not
			!delimiters.includes(precedingChar) || val.endsWith('...', ss)
		),
		needsIsolationRight = se !== val.length && (
			!delimiters.includes(val[se]) || val.startsWith('...', se) || (restrictedTag && val[se] === '\t')
		),
		paraBreaks = findParaBreaks(selection),
		i = 0,
		len = 0,
		pos = 0,
		lastBreak = '';
	if ((len = paraBreaks.length)) {
		// inline formatting, as its name suggests, cannot span across paragraphs, so we need to close and reopen it
		if (needsIsolation) {
			s = '['; // guaranteed not to be at the start of a paragraph
		}
		// i = 0;
		do {
			s += leftAndRight[0];
			s += selection.slice(pos, paraBreaks[i]);
			s += leftAndRight[1];
			if (needsIsolation) {
				// may only get here for the first paragraph
				s += ']';
				needsIsolation = false;
			}
			pos = paraBreaks[i + 1];
			s += lastBreak = selection.slice(paraBreaks[i], pos);
		} while ((i += 2) < len);
		// if we start a paragraph with a '[', that paragraph vanishes.
		// for those tags that allow unbalanced brackets, we omit the opening one.
		if (needsIsolationRight && restrictedTag) {
			// for those that do not, we prepend 'p. ' to it if we have to
			s += /[^ \t\n]/.test(lastBreak) ? '[' : 'p. [';
		}
		s += leftAndRight[0];
		s += selection.slice(pos);
	} else {
		// easy case: selected text does not span across paragraphs
		if (needsIsolation || needsIsolationRight) {
			if (restrictedTag) {
				// this tag requires balanced brackets
				s = ss && (precedingChar !== '\n' || !hasLineBreakBefore(val, ss - 1)) ? '[' : 'p. [';
			} else if (precedingChar && precedingChar !== '\n') {
				// we may omit opening bracket for this tag.
				// for consistency, omit after any newline, not only at paragraph boundaries.
				s = '[';
			}
		}
		s += leftAndRight[0];
		s += selection;
	}
	pos = ss + s.length;
	s += leftAndRight[1];
	if (needsIsolation || needsIsolationRight) {
		s += ']';
	}
	replaceSelectedText(editor, s);
	editor.setSelectionRange(pos, pos);
};

/**
 * @param {string} tagName
 * @param {!HTMLTextAreaElement} editor
 * @param {!Event} ev
 */
var insertBlockTag = function(tagName, editor, ev) {
	ev.preventDefault();
	initEditor(editor);
	trimSelection();
	if (!pageSelection) {
		expandSelectionToLine();
	}
	var selection = getSelectedText('\n\n'),
		s = '',
		extended = /\n[ \t]*\n/.test(selection),
		newCursorPos = 0,
		rx, m;
	if (ss) {
		// there should be a blank line before the block
		if (val[ss - 1] !== '\n') {
			s = '\n\n';
		} else if (!hasLineBreakBefore(val, ss - 1)) {
			s = '\n';
		}
	}
	s += tagName;
	s += extended ? '.. ' : '. ';
	s += selection;
	if (extended && (
		!(rx = /(?:[ \t\n]*\n)?(?:[a-z][a-z0-9]*|[Цц][Тт])\.\.? /g, rx.lastIndex = se, m = rx.exec(val)) ||
		m.index !== se
	)) {
		// close extended block unless it is already closed exactly at this place
		s += '\n\np. ';
		if (se !== val.length && val[se] === '\n') {
			se += Math.max(0, consumeLineBreak(val, se + 1)) + 1;
		}
		// put the cursor at the end of the block or after 'p. '
		newCursorPos = ss + s.length - (se !== val.length ? 5 : 0);
	} else {
		newCursorPos = ss + s.length;
		if (se !== val.length) {
			// there should be a blank line after the block
			if (val[se] !== '\n') {
				s += '\n\n';
			} else if (consumeLineBreak(val, se + 1) < 0) {
				s += '\n';
			}
		}
	}
	replaceSelectedText(editor, s);
	editor.setSelectionRange(newCursorPos, newCursorPos);
};

/**
 * @param {string} listMarker
 * @param {!HTMLTextAreaElement} editor
 * @param {!Event} ev
 */
var insertList = function(listMarker, editor, ev) {
	ev.preventDefault();
	initEditor(editor);
	trimSelection();
	if (!pageSelection) {
		expandSelectionToLine();
	}
	var selection = getSelectedText('\n'),
		s = '',
		inMidLine = false,
		lb = findListBreaks(selection),
		listBreaks = lb.positions,
		i = 0,
		len = listBreaks.length,
		pos = 0,
		markerPos = 0;
	if (ss && ((inMidLine = val[ss - 1] !== '\n') || !hasLineBreakBefore(val, ss - 1))) {
		// put a blank line before the list unless it's preceded by another list item
		switch (inMidLine - isListItemAt(val, ss - 1)) {
			case 0: s = '\n'; break;
			case 1: s = '\n\n'; break;
		}
	}
	if (!len) {
		// the cursor is placed on a blank line, and nothing is selected on the page
		s += listMarker;
		s += ' ';
	} else {
		if (!lb.hasNonList) {
			// every selected line has a marker. create an inner list.
			for (i = 1; i < len; i += 2) {
				markerPos = listBreaks[i];
				s += selection.slice(pos, markerPos);
				s += listMarker;
				pos = markerPos;
			}
		} else {
			// there are lines without a marker in selection. create an outer list.
			for (i = 0; i < len; i += 2) {
				markerPos = listBreaks[i];
				s += selection.slice(pos, markerPos);
				s += listMarker;
				if (markerPos === listBreaks[i + 1]) {
					s += ' ';
				}
				pos = markerPos;
			}
		}
		s += selection.slice(pos);
	}
	pos = ss + s.length;
	if (se !== val.length) {
		// put a blank line after the list unless it's followed by another list item
		if (val[se] !== '\n') {
			s += consumeListMarker(val, se) >= 0 ? '\n' : '\n\n';
		} else if (consumeLineBreak(val, se + 1) < 0 && consumeListMarker(val, se + 1) < 0) {
			s += '\n';
		}
	}
	replaceSelectedText(editor, s);
	editor.setSelectionRange(pos, pos);
};

/**
 * @param {null} dummy
 * @param {!HTMLTextAreaElement} editor
 * @param {!Event} ev
 */
var insertBr = function(dummy, editor, ev) {
	ev.preventDefault();
	initEditor(editor);
	unsetSelection(editor);
	var s = '<br>' + pageSelection,
		pos = ss + s.length;
	replaceSelectedText(editor, s);
	editor.setSelectionRange(pos, pos);
};

/**
 * @param {!Element} panel
 * @param {!HTMLTextAreaElement} editor
 */
var setClickActions = function(panel, editor) {
	var handlers = {
		bold: {func: insertInlineTag, params: ['*', '*']},
		underline: {func: insertInlineTag, params: ['+', '+']},
		strike: {func: insertInlineTag, params: ['-', '-', true]},
		italic: {func: insertInlineTag, params: ['_', '_']},
		godname: {func: insertInlineTag, params: ['"', '":пс']},
		link: {func: insertInlineTag, params: ['"', '":']},
		sup: {func: insertInlineTag, params: ['^', '^', true]},
		sub: {func: insertInlineTag, params: ['~', '~', true]},
		monospace: {func: insertInlineTag, params: ['@', '@', true]},
		bq: {func: insertBlockTag, params: 'bq'},
		bc: {func: insertBlockTag, params: 'bc'},
		pre: {func: insertBlockTag, params: 'pre'},
		ul: {func: insertList, params: '*'},
		ol: {func: insertList, params: '#'},
		br: {func: insertBr, params: null}
	};
	var buttons = panel.getElementsByClassName('formatting'),
		button, classes, h;
	for (var i = 0, len = buttons.length; i < len; i++) {
		button = buttons[i];
		classes = button.classList;
		for (var j = 0, jlen = classes.length; j < jlen; j++) {
			if ((h = handlers[classes[j]])) { // can omit .hasOwnProperty check since we generate them ourselves
				GUIp.common.addListener(button, 'click', h.func.bind(null, h.params, editor));
				break;
			}
		}
	}
};

var substituteGodnameLink = function(m0, prefix, godname0, godname1, needsIsolationRight, index, text) {
	var godname = godname0 || godname1 || '',
		needsIsolation = !!needsIsolationRight || !(
			prefix || !index || ' \t\n`~!#$%^&()-=[]/\\|;:.,<?'.includes(text[index - 1])
		),
		encoded = encodeURIComponent(godname),
		escaping = / - |--|(?:^| )-.+?-(?![^ -])|(?:^|[ -])\d+ x \d/.test(godname) ? '==' : '';
	return (
		(prefix || '') +
		(needsIsolation ? prefix || !index ? 'p. ["' : '["' : '"') +
		escaping + godname + escaping +
		'":/gods/' + (encoded.endsWith('-') ? encoded.slice(0, -1) + '%2D' : encoded) +
		(needsIsolation ? ']' : '')
	);
};

var fixBareParagraphs = function(text) {
	var s = '',
		extended = /^(?:[ \t]*\n)? *(?:[a-z][a-z0-9]*|[Цц][Тт])\.\. /.test(text),
		rx = /(\n[ \t]*\n)( *)(?:(?:[a-z][a-z0-9]*|[Цц][Тт])(\.\.?) |[^ \n])/g,
		lastPos = 0,
		m;
	while ((m = rx.exec(text))) {
		if (m[2]) {
			// there are spaces at the start of the paragraph. delete them.
			if (extended) continue; // unless we're inside an extended block
			s += text.slice(lastPos, (lastPos = m.index + m[1].length));
			lastPos += m[2].length;
		}
		if (m[3]) {
			extended = m[3] !== '.';
		}
	}
	return lastPos ? s + text.slice(lastPos) : text;
};

var preprocessPostBeforeSending = function(editor) {
	var newText = '';
	val = editor.value;
	// Godville messes пс-links up if they are followed by a non-space (e.g., punctuation or markup). we can do better.
	newText = val.replace(
		/(^[ \t\n]*|\n[ \t]*\n)?(?:"([^"\n]*)"|“([^"“”\n]*)”):[Пп][Сс](?=(\.\.\.|[`~!#$%^&()=\[\]/\\|;:.,?-]*[^ \t\n`~!#$%^&()=\[\]/\\|;:.,<?-])?)/g,
		substituteGodnameLink
	);
	// if a paragraph starts with a space, it will not be wrapped into <p></p> and line breaks inside it will not
	// be replaced with <br />. it's an extremely obscure feature, perhaps even a bug, so we remove those spaces
	// unless told otherwise.
	if (!storage.getFlag('Option:keepBareParagraphs')) {
		newText = fixBareParagraphs(newText);
	}
	if (newText !== val) {
		ss = 0;
		se = val.length;
		replaceSelectedText(editor, newText);
	}
};

var setupPreSendHook = function(editor) {
	var callback = GUIp.common.try2.bind(null, preprocessPostBeforeSending, editor);
	var setup = function(btn) {
		var events;
		if (!btn) return;
		$(btn).click(callback);
		events = $._data(btn, 'events').click;
		events.unshift(events.pop());
	};
	setup($id('reply_btn'));
	setup($id('save_btn'));
	setup($id('post_preview'));
};

/**
 * @param {boolean} onForum
 */
var addFormattingButtons = function(onForum) {
	var container, editor, panel;
	if (onForum) {
		container = $id('post_body_editor');
		editor = $id('post_body');
	} else {
		if (isMobile) {
			if (!(container = $q('#chronicle_edit_form > div'))) return;
			editor = $id('message');
		} else {
			if (!(container = $id('post-content-inplaceeditor'))) return;
			editor = container.getElementsByClassName('editor_field')[0];
		}
	}
	container.insertAdjacentHTML('afterbegin',
		'<div class="e_formatting_block">' +
			'<button class="formatting button bold" title="' + worker.GUIp_i18n.bold_hint + '">' + worker.GUIp_i18n.bold + '</button>' +
			'<button class="formatting button underline" title="' + worker.GUIp_i18n.underline_hint + '">' + worker.GUIp_i18n.underline + '</button>' +
			'<button class="formatting button strike" title="' + worker.GUIp_i18n.strike_hint + '">' + worker.GUIp_i18n.strike + '</button>' +
			'<button class="formatting button italic" title="' + worker.GUIp_i18n.italic_hint + '">' + worker.GUIp_i18n.italic + '</button>' +
			'<button class="formatting bq" title="' + worker.GUIp_i18n.quote_hint + '">bq.</button>' +
			'<button class="formatting bc" title="' + worker.GUIp_i18n.code_hint + '">bc.</button>' +
			'<button class="formatting pre" title="' + worker.GUIp_i18n.pre_hint + '">pre.</button>' +
			(onForum && GUIp_locale === 'ru' ? '<button class="formatting button godname" title="Вставить ссылку на бога"></button>' : '') +
			'<button class="formatting button link" title="' + worker.GUIp_i18n.link_hint + '">a</button>' +
			'<button class="formatting button ul" title="' + worker.GUIp_i18n.unordered_list_hint + '">•</button>' +
			'<button class="formatting button ol" title="' + worker.GUIp_i18n.ordered_list_hint + '">1.</button>' +
			'<button class="formatting button br" title="' + worker.GUIp_i18n.br_hint + '"></button>' +
			'<button class="formatting button sup" title="' + worker.GUIp_i18n.sup_hint + '">X<sup>2</sup></button>' +
			'<button class="formatting button sub" title="' + worker.GUIp_i18n.sub_hint + '">X<sub>2</sub></button>' +
			'<button class="formatting button monospace" title="' + worker.GUIp_i18n.monospace_hint + '">' + worker.GUIp_i18n.monospace + '</button>' +
		'</div>'
	);
	GUIp.common.tooltips.watchSubtree(container);
	panel = container.firstChild;
	if (onForum) {
		setupPreSendHook(editor);
	} else {
		// hide panel when previewing
		GUIp.common.newMutationObserver(function() {
			panel.classList.toggle('hidden', !editor.offsetParent);
		}).observe(editor, {attributes: true, attributeFilter: ['class', 'style']});
	}
	setClickActions(panel, editor);
};

var fixGodnamePaste = function() {
	if (!worker.jQuery) {
		return;
	}
	worker.ReplyForm.add_name = function(name,e) {
		e.preventDefault();
		var pos = 0,
			editor, storedMsg;
		if ($id('edit').style.display === 'none' || !(editor = $id('edit_body'))) {
			editor = $id('post_body');
			if ($id('reply').style.display === 'none') {
				worker.ReplyForm.show();
				if (!editor.value && (storedMsg = localStorage.fmsgl)) {
					editor.value = storedMsg;
					editor.setSelectionRange(0, 0);
				}
			}
		}
		initEditor(editor);
		unsetSelection(editor);
		replaceSelectedText(editor, '*' + name + '*, ');
		pos = ss + name.length + 4;
		editor.setSelectionRange(pos, pos);
	};
	var godnameLinks = $Q(isMobile ? '.ft_line .gravatar a' : '.vcard .gravatar a'),
		len = godnameLinks.length,
		handlers = Object.create(null),
		name = '',
		link, handler;
	if (len && $(godnameLinks[0]).off) {
		for (var i = 0; i < len; i++) {
			link = godnameLinks[i];
			$(link).off('click');
			name = link.dataset.gname;
			if (!(handler = handlers[name])) {
				handler = handlers[name] = GUIp.common.try2.bind(null, worker.ReplyForm.add_name, name);
			}
			link.addEventListener('click', handler);
		}
	}
};
// topic other improvements
var fixPaginationLinks = function() {
	var links, a;
	if (queryString.get1('epost') == null) {
		return;
	}
	links = $Q('.pagination a');
	for (var i = 0, len = links.length; i < len; i++) {
		a = links[i];
		a.href = a.href.replace(/([?&])epost=[^&#]*&?/, '$1');
	}
};
var checkHash = function() {
	var postID = '',
		post, m, table;
	// scroll to a certain post #
	if ((postID = queryString.get1('epost')) && (post = $C(isMobile ? 'ft_line' : 'spacer')[+postID - 1])) {
		location.hash = post.id;
		queryString.remove('epost');
		history.replaceState(history.state, '',
			location.pathname + GUIp.common.stringifyQueryString(queryString) + location.hash
		);
	}

	if ((m = /#post_(\d+)/.exec(location.hash))) {
		postID = m[1];
		// highlight target post
		if (!storage.getFlag('Option:disableTargetPostHighlight')) {
			if ((post = $c('e_highlight'))) {
				post.classList.remove('e_highlight');
			}
			if ((post = $id('post_' + postID + '-row'))) {
				post.classList.add('e_highlight');
				// force redrawing to workaround a rendering issue in Chrome
				var tmpStyle = post.style.cssText;
				post.style.cssText += ';-webkit-transform:rotateZ(0deg)';
				post.offsetHeight;
				post.style.cssText = tmpStyle;
			}
		}
		// show a warning when target post appears to be on another page
		if (!$id('post_' + postID)) {
			try {
				table = $q(isMobile ? '#pnf' : 'table.posts');
				table.insertAdjacentHTML('beforebegin',
					'<div class="e_missing_post">' + GUIp_i18n.forum_missing_target_post + '</div>'
				);
				table.previousSibling.getElementsByTagName('a')[0].href =
					'/forums/redirect_to_post/' + /\/show_topic\/+(\d+)/.exec(location.pathname)[1] + '?post=' + postID;
				if ((post = $id('pnf'))) {
					post.style.display = 'none'; // our warning is more informative than Godville's one
				}
			} catch (e) {
				GUIp.common.error(e);
			}
		}
	}
};
var findPost = function(el) {
	do {
		el = el.parentNode;
	} while (!el.classList.contains('post'));
	return el;
};
var picturesAutoreplace = function() {
	if (worker.__godvillePlusAndroid) {
		return;
	}
	if (!storage.getFlag('Option:disableLinksAutoreplace')) {
		var links, linkSelector = (isMobile ? '.ft_line .post' : '.post .body') + ' a';
		try {
			links = $Q(linkSelector + '[href*=".jpeg" i], ' + linkSelector + '[href*=".jpg" i], ' + linkSelector + '[href*=".png" i], ' + linkSelector + '[href*=".gif" i]');
		} catch (e) {
			links = Array.prototype.filter.call($Q(linkSelector), function(a) {
				return /\.(?:jpe?g|png|gif)/i.test(a.href);
			});
		}
		var imgs = [],
			onerror = function(i) {
				links[i].removeChild(links[i].getElementsByTagName('img')[0]);
				imgs[i] = null;
			},
			onload = function(i) {
				var oldBottom, hash = location.hash.match(/\d+/),
					post = findPost(links[i]),
					linkBeforeCurrentPost = hash ? +post.id.match(/\d+/)[0] < +hash[0] : false;
				if (linkBeforeCurrentPost) {
					oldBottom = post.getBoundingClientRect().bottom;
				}
				links[i].removeChild(links[i].getElementsByTagName('img')[0]);
				var hint = links[i].innerHTML;
				links[i].outerHTML = '<div class="img_container"><a id="link' + i + '" href="' + links[i].href + '" target="_blank" alt="' + worker.GUIp_i18n.open_in_a_new_tab + '"></a><div class="hint">' + hint + '</div></div>';
				imgs[i].alt = hint;
				var new_link = $id('link' + i),
					width = Math.min(imgs[i].width, 456),
					height = imgs[i].height*(imgs[i].width <= 456 ? 1 : 456/imgs[i].width);
				if (height < 1500) {
					new_link.insertAdjacentHTML('beforeend', '<div style="width: ' + width + 'px; height: ' + height + 'px; background-image: url(' + imgs[i].src + '); background-size: ' + width + 'px;"></div>');
				} else {
					new_link.insertAdjacentHTML('beforeend', '<div style="width: ' + width + 'px; height: 750px; background-image: url(' + imgs[i].src + '); background-size: ' + width + 'px;"></div>' +
															 '<div id="linkcrop' + i + '" style="width: ' + width + 'px; height: ' + (342*width/456) + 'px; background-image: url(' + worker.GUIp_getResource('images/crop.png') + '); background-size: ' + width + 'px; position: absolute; top: ' + (750 - 171*width/456) + 'px;"></div>' +
															 '<div style="width: ' + width + 'px; height: 750px; background-image: url(' + imgs[i].src + '); background-size: ' + width + 'px; background-position: 100% 100%;"></div>');
					if (worker.GUIp_browser === 'Opera') {
						worker.GUIp_getResource('images/crop.png', $id('linkcrop' + i));
					}
				}
				if (linkBeforeCurrentPost) {
					var diff = post.getBoundingClientRect().bottom - oldBottom;
					worker.scrollTo(0, worker.scrollY + diff);
				}
			};
		for (i = 0, len = links.length; i < len; i++) {
			links[i].insertAdjacentHTML('beforeend', '<img class="img_spinner" src="/images/spinner.gif">');
			imgs[i] = document.createElement('img');
			GUIp.common.addListener(imgs[i], 'error', onerror.bind(null, i));
			GUIp.common.addListener(imgs[i], 'load', onload.bind(null, i));
			imgs[i].src = links[i].href;
		}
	}
};
var updatePostsNumber = function() {
	var topics = JSON.parse(storage.get('ForumSubscriptions')) || {},
		informers = JSON.parse(storage.get('ForumInformers'));
	if (topics[topic]) {
		var notify = {},
			page = (+queryString.get1('page') || 1) - 1,
			posts = page*25 + $C('post').length,
			posts_total = getTotalPosts() || posts,
			is_last_page = !$q('.next_page') || !!$q('.next_page.disabled');
		if (topics[topic].posts < posts || !topics[topic].date) {
			topics[topic].posts = posts;
			var dates = $T('abbr');
			topics[topic].date = (isMobile ? GUIp.common.parseDateTime(dates[dates.length - 1].textContent.trim()) : new worker.Date(dates[dates.length - 1].title)).getTime();
			topics[topic].by = $Q((isMobile ? '.st_header' : '.fn') + ' > span:first-child > a')[dates.length - 1].textContent;
			notify = {posts: posts, date: topics[topic].date, by: topics[topic].by};
			storage.set('ForumSubscriptions', JSON.stringify(topics));
		}
		if (informers[topic]) {
			if (is_last_page) {
				notify.obsolete = true;
			} else if (posts > informers[topic].posts) {
				notify.iposts = posts;
				notify.tposts = posts_total;
			}
		}
		if (Object.keys(notify).length > 0) {
			notify.tid = +topic;
			notify.ndate = Date.now();
			GUIp.common.debug('writing forum notification:', JSON.stringify(notify));
			storage.set('ForumInformersNotify' + Math.random(), JSON.stringify(notify));
		}
	}
};
/**
 * @param {string} text
 * @returns {?Node} null if nothing needs to be done.
 */
var expandLinksInText = function(text) {
	var lastPos = 0,
		pos = 0,
		url = '',
		nesting = 0,
		oParenPos = 0,
		cParenPos = 0,
		linkRegex, m, result, a;
	if (!text.includes('://')) return null; // fast path
	linkRegex = /https?:\/\/[\wа-яё/=]+(?:[-!#$%&'(*+,.:;?@~]+[\wа-яё)/=]+)*/gi;
	m = linkRegex.exec(text);
	if (!m) return null;
	result = document.createDocumentFragment();
	do {
		url = m[0];
		pos = m.index;
		if (pos !== lastPos) {
			result.appendChild(document.createTextNode(text.slice(lastPos, pos)));
		}
		lastPos = linkRegex.lastIndex;
		// cut the link as soon as unbalanced parenthesis is encountered,
		// so that links placed inside parentheses can be parsed correctly
		nesting = 0;
		oParenPos = url.indexOf('(') >>> 0;
		cParenPos = url.indexOf(')');
		while (cParenPos >= 0) {
			if (oParenPos < cParenPos) {
				nesting++;
				oParenPos = url.indexOf('(', oParenPos + 1) >>> 0;
			} else if (nesting--) {
				cParenPos = url.indexOf(')', cParenPos + 1);
			} else {
				// unbalanced closing parenthesis
				// strip trailing punctuation from the link
				while ("-!#$%&'(*+,.:;?@~".includes(url[cParenPos - 1])) {
					cParenPos--;
				}
				url = url.slice(0, cParenPos);
				// we do not rescan the tail for more links, since that would result in O(n**2) complexity
				lastPos = pos + cParenPos;
				break;
			}
		}
		a = document.createElement('a');
		a.href = a.textContent = url;
		result.appendChild(a);
	} while ((m = linkRegex.exec(text)));
	if (lastPos !== text.length) {
		result.appendChild(document.createTextNode(text.slice(lastPos)));
	}
	return result;
};
/**
 * @param {!Element} postBody
 */
var expandPlainTextLinksInPost = function(postBody) {
	var cur = postBody.firstChild,
		steppedOut = false,
		willStepOut = false,
		tagName = '',
		next, newNode;
	if (!postBody.textContent.includes('://')) {
		return; // fast path; also handles the case when cur is null
	}
	while (true) {
		next = cur.nextSibling;
		if ((willStepOut = !next)) {
			next = cur.parentNode;
		}
		switch (cur.nodeType) {
			case 1: // element
				if (!steppedOut && (tagName = cur.tagName) !== 'A' && tagName !== 'PRE' && tagName !== 'CODE' && (cur = cur.firstChild)) {
					continue; // step into it
				}
				break;
			case 3: // text
				if ((newNode = expandLinksInText(cur.nodeValue))) {
					cur.parentNode.replaceChild(newNode, cur);
				}
				break;
		}
		if (next === postBody) return;
		cur = next;
		steppedOut = willStepOut;
	}
};
var expandPlainTextLinks = function() {
	Array.prototype.forEach.call($Q(isMobile ? '.ft_line .post' : '.post .body'), expandPlainTextLinksInPost);
};
var checkInternalLinks = function() {
	var target, links = $Q((isMobile ? '.ft_line .post' : '.post .body') + ' a[href*="/show_topic/"], #chronicle .post_content a[href*="/show_topic/"]');
	for (i = 0, len = links.length; i < len; i++) {
		if (target = links[i].href.match(/^(https?:\/\/godville(?:game\.com|\.net)\/+forums)\/+show_topic\/+(\d+)\?page=\d+#post_(\d+)$/i)) {
			links[i].href = target[1] + '/redirect_to_post/' + target[2] + '?post=' + target[3];
		}
	}
};
var improveTopic = function() {
	fixPaginationLinks();
	checkHash();
	if (GUIp.common.isAndroid) {
		// on mobile devices, it might be hard to impossible to select and copy a plain-text link if it is long enough,
		// so let's make users' life easier by making those links clickable. we do not change anything for desktop
		// browsers, which are used by the majority of UI+ users, since it's not a problem to follow such link there and
		// somebody needs to tell plain-text-link posters to stop doing that.
		expandPlainTextLinks();
	}
	picturesAutoreplace();
	updatePostsNumber();
	checkInternalLinks();
};
var newspaper = {};
(function() {

var gpc = newspaper.gpc = {};
(function() {

gpc._available = false;
gpc._valueNode = null;
gpc._input = null;
gpc._threshold = 0;

var _scrollIntoView = function() {
	var header = $id('gp_bat').parentNode.firstElementChild;
	if (header.getBoundingClientRect().top < 0 ||
		gpc._input.getBoundingClientRect().bottom > document.documentElement.clientHeight
	) {
		try {
			gpc._input.scrollIntoView({block: 'center'});
		} catch (e) {
			header.scrollIntoView();
		}
	}
};

var _check = function() {
	var value = 0;
	if (!gpc._available || !gpc._threshold || (value = parseInt(gpc._valueNode.textContent)) < gpc._threshold) {
		GUIp.common.notif.hide('gpc');
	} else if (!GUIp.common.notif.enabled) {
		GUIp.common.playSound(storage.get('Option:informerCustomSound') || 'arena', storage.get('Option:informerCustomSoundVolume'));
	} else {
		GUIp.common.notif.show(
			'[%] ' + storage.god_name,
			GUIp_i18n.fmt('gpc_filled', value),
			parseFloat(storage.get('Option:informerAlertsTimeout')) * 1e3,
			_scrollIntoView,
			'gpc'
		);
	}
};

var _updateThreshold = function() {
	gpc._threshold = gpc._input.checkValidity() ? gpc._input.valueAsNumber : 0;
	storage.set('Newspaper:godpowerCap:userThreshold', gpc._threshold);
	_check();
};

var _initNotifier = function() {
	var node = $id('gpc_err');
	gpc._threshold = +storage.get('Newspaper:godpowerCap:userThreshold');
	gpc._valueNode = $id('gpc_val');
	node.insertAdjacentHTML('beforebegin',
		'<div class="e_gpc_settings">' +
			GUIp_i18n.fmt('gpc_remind_when', '<input type="number" min="1" max="200" />') +
		'</div>'
	);
	gpc._input = node.previousSibling.lastElementChild;
	if (gpc._threshold) {
		// we set it from JS and not from HTML because this way the cursor will be placed after the number
		gpc._input.value = gpc._threshold;
	}
	GUIp.common.addListener(gpc._input, 'keydown', function(ev) {
		if (ev.keyCode === 13) {
			this.blur();
		}
	});
	GUIp.common.addListener(gpc._input, 'input', GUIp.common.debounce(1e3, _updateThreshold));
	GUIp.common.addListener(gpc._input, 'change', function() {
		GUIp.common.notif.initialize();
		_updateThreshold();
	});
	GUIp.common.newMutationObserver(_check).observe(gpc._valueNode, {childList: true});
	if (gpc._threshold) {
		_check();
	}
};

gpc.init = function() {
	var dischargeBtn = $id('gp_cap_use');
	storage.set('Newspaper:godpowerCap', (gpc._available = !dischargeBtn.disabled));
	if (!gpc._available) return; // already discharged today, not interested anymore
	GUIp.common.addListener(dischargeBtn, 'click', function() {
		storage.set('Newspaper:godpowerCap', (gpc._available = false));
		storage.set('Newspaper:godpowerCap:userThreshold', (gpc._threshold = 0));
		GUIp.common.notif.hide('gpc');
	});
	GUIp.common.newMutationObserver(function() {
		// the button gets disabled each time someone discharges the cap.
		// avoid accessing `localStorage` whenever possible.
		if (!gpc._available && !dischargeBtn.disabled) {
			// it got re-enabled after we tried to discharge it
			storage.set('Newspaper:godpowerCap', (gpc._available = true));
			_updateThreshold(); // read it from the input
		}
	}).observe(dischargeBtn, {attributes: true, attributeFilter: ['disabled']});
	_initNotifier();
};

})(); // newspaper.gpc

var _annotateExpensiveBingoItem = function(html) {
	// there is an artifact named "heart of the matter" so this regex must be case-sensitive
	return /^(?:золотой кирпич|бесценный дар|инвайт на Годвилль|старую шмотку|шкуру разыскиваемого |(?:шкуру|рога|ухо|глаз|(?:влюбл.нное )?сердце|ребро|лапу|копыта) босса |зубастого триббла|бонус за подряд|призовой сундук|пасхал(?:ку|ьное яйцо)|(?:светящуюся |кран)тыкву|тыкву скорой помощи|юбилейный золотой|заморск.. |морскую (?:джемчужину|златоустрицу|суперзвезду)|морской приз|(?:ларец|сундучок|ящик) из моря|босс(?:коин|бух|оножку|ье)|(?:купон на|coupon for) .*©|golden brick|(?:really )?priceless gift|quest completion certificate|Godville invite|invite to Godville|old piece of equipment|[Hh]ide of a wanted |(?:fur|horn|ear|eye|heart|rib|lucky paw|hoof) of the [A-Z]|hungry tribble|side job bonus|(?:prize|goodies) chest|easter egg$|glowing pumpkin|best boss (?:award|pin|statuette)|🦃|outlandish |overseas |chained crate|donation box|pirate coffer|exotic seashell|bosscoin)/.test(html.replace(/<[^]*?>/g, '')) ? (
		'<span class="e_bingo_expensive" title="' + GUIp_i18n.bingo_expensive_artifact + '">' + html + '</span>'
	) : html;
};

var _highlightExpensiveInBingo = function() {
	var list = $id('b_inv'),
		html = list.innerHTML,
		replaced = html.replace(/[^\s:,.][^:,.]*/g, _annotateExpensiveBingoItem);
	if (replaced !== html) {
		list.innerHTML = replaced;
	}
};

var _prepareBingo = function() {
	var bingoItems = $Q('#bgn td span:not(.bgnk)'),
		bingoPattern = '',
		bingoTries = 0,
		node;
	if (bingoItems.length) {
		bingoPattern = Array.from(bingoItems, function(a) { return a.textContent; }).join('|');
		node = $id('l_clicks');
		if (node && node.style.display !== 'none') { // when filling the last time, #b_cnt is not updated
			node = $id('b_cnt');
			bingoTries = (node && parseInt(node.textContent)) || 0;
		}
	}
	storage.set('Newspaper:bingoItems', bingoPattern);
	storage.set('Newspaper:bingoTries', bingoTries);
	_highlightExpensiveInBingo();
};

var _updateCoupon = function() {
	var button = $id('coupon_b'),
		prize = button.disabled ? '' : button.previousElementSibling.previousSibling.nodeValue.trim();
	storage.set('Newspaper:couponPrize:raw', prize);
	storage.set('Newspaper:couponPrize', prize && prize.replace(/^(?:an?|the|some) /, ''));
};

var _updateAdvert = function() {
	var advert, button = document.querySelector('input#ad_b'); // there's an error in the newspaper: same `ad_b` id is assigned to both input and its nearest div, so we can't use $id() here
	if (!button) {
		return;
	}
	advert = button.disabled ? '' : button.parentNode.parentNode.firstChild.textContent.trim();
	storage.set('Newspaper:activeAdvert', advert);
	storage.set('Newspaper:activeAdvert:button', button.disabled ? '' : button.value);
};

var _updateForecast = function() {
	var fc = '', fcText = '', fcSB = '',
		forecasts = Array.from(document.querySelectorAll('.fc > p'), function(a) { return a.textContent; })
			.filter(function(a) { return a.startsWith('•'); }) // actual forecast lines don't use proper classes and can be identified only by a dot sign
			.join('\n');
	if (forecasts) {
		fc = GUIp.common.parseForecasts(forecasts);
		fcText = forecasts;
		if (fc.includes('specbosses')) {
			var key, input = fcText.toLowerCase();
			for (var key in GUIp.common.bossAbilitiesList) {
				if (input.includes(key) || input.includes(GUIp.common.bossAbilitiesList[key])) {
					fcSB = (worker.GUIp_locale === 'ru' ? key : GUIp.common.bossAbilitiesList[key]).replace(/^.{1}/, function(a) { return a.toUpperCase(); });
				}
			}
		}
	}
	storage.set('Newspaper:dailyForecast', fc);
	storage.set('Newspaper:dailyForecastText', fcText);
	storage.set('Newspaper:dailyForecast:specBoss', fcSB);
};

var _fixExoticCharacters = function() {
	var fc = $q('.fc > p'),
		html = fc.innerHTML;
	if (html.includes('🗳')) {
		fc.innerHTML = html.replace(/🗳[\uFE0E\uFE0F]?/,
			'<span class="e_emoji e_emoji_ballot' + (GUIp.common.renderTester.testChar('🗳') ? '' : ' eguip_font') +
			'">$&</span>'
		);
	}
};

newspaper.init = function() {
	var node, observer;
	// when viewing the newspaper unauthorized, we can still see the bingo `bgn_t` table, but the buttons `l_clicks` below it are missing
	if ((node = $id('l_clicks'))) {
		observer = GUIp.common.newMutationObserver(_prepareBingo);
		observer.observe($id('bgn_t'), {childList: true});
		observer.observe(node, {attributes: true, attributeFilter: ['style']});
		_prepareBingo();
	}
	if ((node = $id('coupon_b'))) {
		GUIp.common.newMutationObserver(_updateCoupon).observe(node, {attributes: true, attributeFilter: ['disabled']});
		_updateCoupon();
	}
	if ((node = document.querySelector('input#ad_b'))) {
		GUIp.common.newMutationObserver(_updateAdvert).observe(node, {attributes: true, attributeFilter: ['disabled']});
		_updateAdvert();
	}
	GUIp.common.try2(gpc.init);
	_updateForecast();
	_fixExoticCharacters();
	GUIp.common.renderTester.deinit();
};

})(); // newspaper
var godPage = {};
(function() {

var _improveGravatars = function() {
	var av = document.querySelector('#avatar img');
	var avSwitch = function() {
		if (av.src.includes('&size=50')) {
			var oldSrc = av.src, img = new Image;
			GUIp.common.addListener(img, 'load', function() {
				av.height = av.width = 50;
				av.src = img.src;
				av.parentNode.parentNode.classList.toggle('e_av_large');
			});
			GUIp.common.addListener(img, 'error', function() {
				av.height = av.width = 50;
				av.src = oldSrc;
			});
			img.src = av.src.replace('&size=50','&size=200');
			av.height = av.width = 32;
			av.src = worker.GUIp_getResource('images/loader.gif');
		} else if (av.src.includes('&size=200')) {
			av.parentNode.parentNode.classList.toggle('e_av_large');
		}
	};
	if (av && av.src.includes('gravatar.com/avatar/')) {
		av.classList.add('e_clickable');
		GUIp.common.addListener(av, 'click', avSwitch);
	}
};

var _fixExoticCharacters = function() {
	var spans = $Q('#ach_b li > span'),
		replacement = '<span class="e_emoji e_emoji_arrow' +
			(GUIp.common.renderTester.testChar('⤑') ? '' : ' eguip_font') +
		'">⤑</span>',
		html = '',
		span;
	for (var i = 0, len = spans.length; i < len; i++) {
		span = spans[i];
		html = span.innerHTML;
		if (html.includes('⤑')) {
			span.innerHTML = html.replace(/⤑/g, replacement);
		}
	}
};

godPage.init = function() {
	checkInternalLinks();
	_improveGravatars();
	_fixExoticCharacters();
	addFormattingButtons(false);
	GUIp.common.renderTester.deinit();
};

})(); // godPage
var lastFights = {};
(function() {

/**
 * @private
 * @param {!HTMLCollection} rows
 * @returns {!Array<!GUIp.common.activities.LastFightsEntry>}
 */
var _getLastFights = function(rows) {
	var result = [],
		tFormat = localStorage.getItem('tampm'),
		parsedDate, date, ftype, link, href;
	for (var i = 1, len = rows.length; i < len; i++) {
		date = rows[i].firstElementChild;
		ftype = date.nextElementSibling;
		link = ftype.getElementsByTagName('a')[0];
		href = link.href;
		parsedDate = GUIp.common.parseDateTime(date.textContent)
		result[i - 1] = {
			date: +parsedDate,
			type: GUIp.common.activities.parseFightType(link.textContent),
			logID: href.slice(href.lastIndexOf('/') + 1),
			success: ftype.textContent.includes('✓')
		};
		// fix formatting from AM/PM to 24H when it is set in page settings
		if (tFormat === '24h' && /AM|PM/.test(date.textContent)) {
			date.textContent = GUIp.common.formatTime(parsedDate,'westerndate') + ' ' + GUIp.common.formatTime(parsedDate,'simpletime')
		}
	}
	// replicate souls from dungeons
	if (+storage.get('Logger:Souls'))
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
	return result.sort(function(a, b) { return a.date - b.date; });
};

lastFights.init = function() {
	var table = document.getElementsByTagName('table')[0],
		rows = table.getElementsByTagName('tr'),
		activities = GUIp.common.activities.load(storage),
		byID = Object.create(null),
		soulsCombined = Object.create(null),
		desc = null,
		i, len, act, cell, href, id, content;
	GUIp.common.activities.updateLastFights(
		storage,
		GUIp.common.activities.readThirdEyeFromLS(storage.god_name),
		GUIp.common.parseJSON(storage.get('ThirdEye:Gaps')) || [],
		activities,
		GUIp.common.activities.loadStatuses(storage),
		_getLastFights(rows)
	);
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
	table.classList.add('e_last_fights');
	for (i = 1, len = rows.length; i < len; i++) {
		cell = rows[i].firstElementChild.nextElementSibling;
		href = cell.getElementsByTagName('a')[0].href;
		id = href.slice(href.lastIndexOf('/') + 1);
		content = '';
		if ((act = soulsCombined[id]) && (act.result || act.src < 2)) { // todo: don't show when souls unavailable
			desc = GUIp.common.activities.describe(act, desc);
			content += '<span class="' + desc.class + '" title="' + desc.title + '">' + desc.content + '</span>';
		}
		if ((act = byID[id]) && act.result) {
			desc = GUIp.common.activities.describe(act, desc);
			content += '<span class="' + desc.class + '" title="' + desc.title + '">' + desc.content + '</span>';
		}
		if (content) {
			cell.insertAdjacentHTML('beforeend',
				'<div class="e_fight_result">' + content + '</div>'
			);
		}
	}
};

})(); // lastFights

// main code
var i, len, topic, isForum, isTopic, isSubs, isMobile, queryString, topics;

var setInitVariables = function() {
	GUIp.common.exposeThemeName(localStorage.ui_s || 'th_classic');
	isForum = /^\/+forums\/+show\//.test(location.pathname);
	isTopic = /^\/+forums\/+show_topic\//.test(location.pathname);
	isSubs = /^\/+forums\/+show\/+1(?:\/|$)/.test(location.pathname) && location.hash.includes('#guip_subscriptions');
	isMobile = !!$id('menu_w');
	queryString = GUIp.common.parseQueryString(location.search);
	storage.god_name = GUIp.common.getCurrentGodname();
	if (!storage.get('ForumSubscriptions')) {
		storage.set('ForumSubscriptions', '{}');
		storage.set('ForumInformers', '{}');
	}
	topics = JSON.parse(storage.get('ForumSubscriptions')) || {};
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

registerModule('forum', function() {
	try {
		setInitVariables();
		GUIp.common.addCSSFromString(storage.get('UserCss'));

		if (/^\/+news(?:\/|$)/.test(location.pathname)) {
			newspaper.init();
			return;
		}

		if (/^\/+gods\//.test(location.pathname)) {
			godPage.init();
			return;
		}

		if (/^\/+hero\/+last_fight(?:\/|$)/.test(location.pathname)) {
			lastFights.init();
			return;
		}

		if (/^\/+forums\/+subs(?:\/|$)/.test(location.pathname)) {
			rearrangeUnreadSubs();
			return;
		}

		document.body.classList.add('forum');
		GUIp.common.setPageBackground(storage.get('Option:useBackground'));

		if (isSubs) {
			prepareSubscriptionsList();
		}

		if (isForum) {
			addSmallElements();
		}

		if (!isSubs && (isForum || isTopic)) {
			addLinks();
			addTooltipEmulation();
		}

		if (isTopic) {
			addFormattingButtons(true);
			fixGodnamePaste();
			improveTopic();
		}

		if (topics && !isSubs && (isForum || isTopic)) {
			addSubscriptionsLink();
		}
	} catch (e) {
		GUIp.common.error(e);
	}
});

})(this);
