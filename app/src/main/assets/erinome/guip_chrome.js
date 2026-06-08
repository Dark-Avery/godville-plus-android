window.GUIp_browser = 'Chrome';
window.GUIp_getResource = function(res) {
	return window.__godvillePlusAssetUrls[res] || localStorage.getItem('eGUI_prefix') + res;
};
