package net.godville.plus

import com.google.gson.Gson

object GodvilleShellScripts {
    private val gson = Gson()

    fun selectTab(labels: List<String>): String {
        val quotedLabels = gson.toJson(labels)
        return """
            (function() {
              const labels = $quotedLabels;
              const root = document.querySelector('#tabbar') || document;
              const candidates = Array.from(root.querySelectorAll('button, a, [role="tab"], .tab-btn, .tab-selector > *'));
              const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
              for (const node of candidates) {
                const text = normalize(node.textContent);
                if (labels.some((label) => text.includes(normalize(label)))) {
                  node.click();
                  return 'ok';
                }
              }
              return 'missing';
            })()
        """.trimIndent()
    }

    fun focusVoice(): String = """
        (function() {
          const input = document.querySelector('#godvoice, #god_phrase');
          if (!input) return 'missing';
          input.focus();
          input.scrollIntoView({block: 'center', inline: 'nearest'});
          return 'ok';
        })()
    """.trimIndent()

    fun clickRemoteAction(selector: String): String = """
        (function() {
          const node = document.querySelector(${gson.toJson(selector)});
          if (!node) return 'missing';
          node.click();
          return 'ok';
        })()
    """.trimIndent()
}
