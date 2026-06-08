(function() {
'use strict';

chrome.runtime.onMessage.addListener(msg => {
	if ('playsound' in msg) {
		try {
			var a = new Audio(msg.playsound);
			if (msg.volume !== 100) {
				a.volume = msg.volume / 100;
			}
			a.play();
		} catch (e) { }
	}
});

})();
