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

    fun installNativeReplicaBridge(): String = """
        (function() {
          if (window.__godvillePlusNativeReplicaBridgeInstalled) return 'already';
          if (!window.GodvillePlus || !window.GodvillePlus.postMessage) return 'missing-bridge';
          window.__godvillePlusNativeReplicaBridgeInstalled = true;

          const MAX_SEGMENTS = 32;
          const MAX_TEXT_LENGTH = 64;
          let raf = 0;

          function text(value, maxLength) {
            return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
          }

          function rgbToHex(value) {
            if (!value) return '#A7A9B0';
            if (/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(value)) return value.toUpperCase();
            const parts = value.match(/\d+/g);
            if (!parts || parts.length < 3) return '#A7A9B0';
            return '#' + parts.slice(0, 3).map(function(part) {
              return Math.max(0, Math.min(255, parseInt(part, 10) || 0)).toString(16).padStart(2, '0');
            }).join('').toUpperCase();
          }

          function collectStatus() {
            const root = document.querySelector('#statusbar');
            if (!root) return {};

            function groupValue(group, pattern) {
              if (!group) return null;
              const value = text(group.innerText || group.textContent, 64).match(pattern);
              return value ? value[0].replace(/\s+/g, '') : null;
            }

            const hp = groupValue(root.querySelector('.e_sb_hero_hp'), /\d+\s*\/\s*\d+/);
            const godpower = groupValue(root.querySelector('.e_sb_godpower'), /\d+%/);
            const gold = groupValue(root.querySelector('.e_sb_hero_gold'), /\d+/);
            const inventory = groupValue(root.querySelector('.e_sb_hero_inventory'), /\d+\s*\/\s*\d+/);

            return {
              hp: hp,
              godpower: godpower,
              inventory: inventory,
              gold: gold
            };
          }

          function collectLogger() {
            const root = document.querySelector('#logger');
            if (!root) return { visible: false, segments: [] };
            const disabledByUiPlus = root.hidden || root.style.display === 'none' || root.classList.contains('hidden');
            const segments = Array.from(root.querySelectorAll('li')).slice(-MAX_SEGMENTS).map(function(node) {
              const style = window.getComputedStyle(node);
              const weight = parseInt(style.fontWeight, 10);
              return {
                text: text(node.textContent, MAX_TEXT_LENGTH),
                color: rgbToHex(style.color),
                bold: style.fontWeight === 'bold' || (!Number.isNaN(weight) && weight >= 600),
                title: text(node.getAttribute('title'), MAX_TEXT_LENGTH)
              };
            }).filter(function(segment) {
              return segment.text.length > 0;
            });
            return { visible: !disabledByUiPlus && segments.length > 0, segments: segments };
          }

          function sendSnapshot() {
            raf = 0;
            const snapshot = {
              status: collectStatus(),
              logger: collectLogger()
            };
            window.GodvillePlus.postMessage(JSON.stringify({
              type: 'nativeSnapshot',
              snapshot: snapshot
            }));
          }

          function scheduleSnapshot() {
            if (!raf) raf = window.requestAnimationFrame(sendSnapshot);
          }

          const observer = new MutationObserver(scheduleSnapshot);
          observer.observe(document.body || document.documentElement, {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['class', 'style']
          });
          window.setInterval(scheduleSnapshot, 5000);
          scheduleSnapshot();
          return 'ok';
        })()
    """.trimIndent()
}
