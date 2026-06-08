(function() {
'use strict';

var chromeStorageEngine = chrome.storage.session || chrome.storage.local;

/**
 * @typedef {Object} Notification
 * @property {number} tabId
 * @property {string} localNotifId
 * @property {number} timer
 */

/** @type {!Object<string, !Notification>} */
var allNotifications = null;
/** @type {!Object<string, !NotificationGroup>} */
var allGroups = Object.create(null);

var stateLoader = new Promise(async resolve => {
	allNotifications = (await chromeStorageEngine.get('allNotifications'))['allNotifications'] || {}; // wth?
	resolve();
});

/**
 * @param {string} id
 * @param {!Notification} n
 */
var _destroyNotification = async (id, n) => {
	if (n.timer) clearTimeout(n.timer);
	if (n.alarm) chrome.alarms.clear(id);
	await chrome.notifications.clear(id);
};

/**
 * @param {string} id
 * @param {boolean} manual
 */
var hideNotification = async (id, manual) => {
	await stateLoader;
	var n = allNotifications[id];
	if (!n) return;
	await chrome.tabs.sendMessage(n.tabId, {type: 'notifyClosed', notifId: n.localNotifId, manual: manual}).catch(e => {}); // we don't care if it was actually sent or not
	_destroyNotification(id, n);
	delete allNotifications[id];
	await chromeStorageEngine.set({'allNotifications': allNotifications});
};

var _notificationTemplate = {
	type: 'basic',
	iconUrl: chrome.runtime.getURL('icon64.png'),
	title: '',
	message: '',
	contextMessage: 'Erinome Godville UI+',
	requireInteraction: true // we use timers to close notifications ourselves
};

class NotificationGroup {
	/**
	 * @param {string} tabId
	 */
	constructor(tabId, windowId) {
		this._tabId = tabId;
		this._windowId = windowId;
	}
	/**
	 * @param {{notifId: string, title: string, message: string, timeout: number}} options
	 */
	async show({notifId: localNotifId, title, message, timeout}) {
		var id = '' + this._tabId + localNotifId,
			existing = allNotifications[id];
		if (existing && existing.timer) {
			clearTimeout(existing.timer);
		}
		_notificationTemplate.title = title;
		_notificationTemplate.message = message;
		chrome.notifications.create(id, _notificationTemplate);
		allNotifications[id] = {
			tabId: this._tabId,
			windowId: this._windowId,
			localNotifId: localNotifId,
			timer: timeout > 0 && timeout <= 25e3 ? setTimeout(hideNotification, timeout, id, false) : 0,
			alarm: timeout > 25e3 ? (await chrome.alarms.create(id, {delayInMinutes: Math.max(0.5, timeout/60e3)}), 1) : 0
		};
		await chromeStorageEngine.set({'allNotifications': allNotifications});
	}
	/**
	 * @param {string} localNotifId
	 */
	async hide(localNotifId) {
		await hideNotification('' + this._tabId + localNotifId, false);
	}
}

class PromiseQueue {
	queue = Promise.resolve()
	add(operation) {
		this.queue = this.queue.then(operation).catch(() => {})
	}
}

var _tabActivation = {active: true},
	_windowActivation = {focused: true},
	_procQueue = new PromiseQueue();
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
	await stateLoader;
	var notifGroup = allGroups[sender.tab.id]
	if (!notifGroup) {
		notifGroup = new NotificationGroup(sender.tab.id, sender.tab.windowId);
		allGroups[sender.tab.id] = notifGroup;
	}
	switch (msg.type) {
		case 'playsound':
			if (!(await chrome.offscreen.hasDocument()))
			await chrome.offscreen.createDocument({
				url: 'offscreen.html',
				reasons: ['AUDIO_PLAYBACK'],
				justification: 'play a notification sound on a page not allowing to embed sounds otherwise'
			});
			await chrome.runtime.sendMessage({ playsound: msg.content, volume: msg.volume });
			break;
		case 'makefocus':
			if (!sender.tab) break;
			if (msg.tab) {
				chrome.tabs.update(sender.tab.id, _tabActivation);
			}
			if (msg.window) {
				chrome.windows.update(sender.tab.windowId, _windowActivation);
			}
			break;
		case 'notify':
			await notifGroup.show(msg);
			break;
		case 'notifyHide':
			await notifGroup.hide(msg.notifId);
			break;
	}
});

chrome.notifications.onClicked.addListener(async id => hideNotification(id, true));
chrome.notifications.onClosed.addListener(async id => hideNotification(id, false));
chrome.alarms.onAlarm.addListener(async alarm => {
	await hideNotification(alarm.name, false)
});

// closes all opened notifications when a tab that initiated them is itself about to close.
// it's understood that the user could have possibly moved to another url on that tab earlier,
// but we don't want to ask for more permissions to be able to check for that
chrome.tabs.onRemoved.addListener(async (tabId, info) => {
	await stateLoader;
	var ids = Object.keys(allNotifications),
		id = '',
		changed = false;
	for (var i = 0, len = ids.length; i < len; i++) {
		id = ids[i];
		if (allNotifications[id].tabId === tabId) {
			_destroyNotification(id, allNotifications[id]);
			delete allNotifications[id];
			changed = true;
		}
	}
	if (changed) {
		await chromeStorageEngine.set({'allNotifications': allNotifications});
	}
});

})();
