// ordered map implementation. it just wraps ES2015's `Map`, restricting it to string keys.
// see `opera/content/omap.js` for an ES5-compatible implementation with identical interface.
(function(worker) {
'use strict';

worker.GUIp = worker.GUIp || {};

GUIp.OMap = function(source) {
	this._m = new Map(source && source._m);
};

GUIp.OMap.prototype = {
	constructor: GUIp.OMap,
	get empty() {
		return !this._m.size;
	},
	get(key) {
		return this._m.get(String(key));
	},
	set(key, value) {
		this._m.set(String(key), value);
		return this;
	},
	remove(key) {
		this._m.delete(String(key));
		return this;
	},
	forEach(callback, thisArg) {
		this._m.forEach((value, key) => callback.call(thisArg, value, key, this));
	},
	getKeys() {
		return Array.from(this._m.keys());
	},
	clone() {
		return new this.constructor(this);
	}
};

GUIp.OMultiMap = function(source) {
	GUIp.OMap.call(this, source);
};

GUIp.OMultiMap.prototype = Object.create(GUIp.OMap.prototype);
GUIp.OMultiMap.prototype.constructor = GUIp.OMultiMap;

GUIp.OMultiMap.prototype.get1 = function(key) {
	var arr = this.get(key);
	return arr && arr[0];
};

GUIp.OMultiMap.prototype.require = function(key) {
	var arr = this.get(key);
	if (!arr) {
		arr = [];
		this.set(key, arr);
	}
	return arr;
};

GUIp.OMultiMap.prototype.add = function(key, value) {
	var arr = this.get(key);
	if (arr) {
		arr.push(value);
	} else {
		this.set(key, [value]);
	}
	return this;
};

})(this);
