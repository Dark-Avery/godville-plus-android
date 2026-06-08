(function () {
    "use strict";

    window.__godvillePlusAndroid = true;
    var listeners = [];
    var runtime = {
        getURL: function (path) {
            return "";
        },
        getManifest: function () {
            return { manifest_version: 3, version: "1.1.39.8" };
        },
        sendMessage: function (message) {
            if (message && message.type === "playsound" && message.content) {
                try {
                    var audio = new Audio(message.content);
                    audio.volume = Math.max(0, Math.min(1, (message.volume || 100) / 100));
                    audio.play().catch(function () {});
                } catch (ignored) {}
            }
            GodvillePlus.postMessage(JSON.stringify(message));
            return Promise.resolve();
        },
        connect: function () {
            return {
                postMessage: runtime.sendMessage,
                onMessage: { addListener: function (listener) { listeners.push(listener); } }
            };
        },
        onMessage: {
            addListener: function (listener) { listeners.push(listener); }
        }
    };

    window.chrome = window.chrome || {};
    window.chrome.runtime = runtime;
    window.chrome.extension = { getURL: runtime.getURL };
    window.__godvillePlusDispatch = function (message) {
        listeners.forEach(function (listener) {
            listener(message, {}, function () {});
        });
    };
})();
