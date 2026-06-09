package net.godville.plus.erinome

import com.google.gson.Gson

object ErinomeAssetBundle {
    private val gson = Gson()

    fun javascript(
        textAssets: Map<String, String>,
        assetUrls: Map<String, String>,
    ): String =
        """
        window.__godvillePlusAssets = ${gson.toJson(textAssets)};
        window.__godvillePlusAssetUrls = ${gson.toJson(assetUrls)};
        """.trimIndent()

    fun injectStyleJavascript(assetPath: String, elementId: String): String =
        """
        (function() {
          const css = window.__godvillePlusAssets[${gson.toJson(assetPath)}];
          if (!css) return;
          let style = document.getElementById(${gson.toJson(elementId)});
          if (!style) {
            style = document.createElement('style');
            style.id = ${gson.toJson(elementId)};
            style.type = 'text/css';
            document.head.appendChild(style);
          }
          style.textContent = css;
        })();
        """.trimIndent()

    fun webRequestBridgeJavascript(): String =
        """
        window.__godvillePlusForwardWebRequest = function(message) {
          GodvillePlus.postMessage(JSON.stringify(message));
        };
        """.trimIndent()

    fun shellTabBridgeJavascript(): String =
        """
        (function() {
          if (window.__godvillePlusShellTabBridgeInstalled) return;
          window.__godvillePlusShellTabBridgeInstalled = true;
          let lastTab = null;
          const report = function() {
            const buttons = Array.from(document.querySelectorAll('#tabbar .tab-selector > .tab-btn'));
            const active = buttons.find(function(button) {
              return button.classList.contains('active') ||
                button.parentElement?.classList.contains('active');
            });
            if (!active) return;
            const label = (active.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
            const aliases = [
              ['pult', ['пульт', 'remote']],
              ['diary', ['дневник', 'diary']],
              ['hero', ['герой', 'hero']],
              ['items', ['вещи', 'items', 'inventory']],
              ['friends', ['друзья', 'friends']],
              ['pantheons', ['пантеоны', 'pantheons']]
            ];
            const match = aliases.find(function(entry) {
              return entry[1].some(function(alias) { return label.includes(alias); });
            });
            if (!match || match[0] === lastTab) return;
            lastTab = match[0];
            GodvillePlus.postMessage(JSON.stringify({type: 'shellTab', tab: lastTab}));
          };
          const install = function() {
            const tabbar = document.querySelector('#tabbar');
            if (!tabbar) return false;
            tabbar.addEventListener('click', function() { setTimeout(report, 0); }, true);
            new MutationObserver(report).observe(tabbar, {
              subtree: true,
              attributes: true,
              attributeFilter: ['class']
            });
            report();
            return true;
          };
          if (!install()) {
            const rootObserver = new MutationObserver(function() {
              if (install()) rootObserver.disconnect();
            });
            rootObserver.observe(document.documentElement, {childList: true, subtree: true});
          }
        })();
        """.trimIndent()
}
