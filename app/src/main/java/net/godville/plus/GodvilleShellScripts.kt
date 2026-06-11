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

    fun speakVoice(phrase: String): String {
        val quotedPhrase = gson.toJson(phrase)
        return """
            (function() {
              const input = document.querySelector('#godvoice, #god_phrase');
              if (!input) return 'missing-input';
              input.focus();
              input.value = $quotedPhrase;
              input.dispatchEvent(new Event('input', {bubbles: true}));
              input.dispatchEvent(new Event('change', {bubbles: true}));
              const submit = document.querySelector('#cntrl input[type="submit"], #cntrl button[type="submit"], #cntrl .voice_line input[type="button"], #cntrl .voice_line button');
              if (!submit) return 'missing-submit';
              submit.click();
              return 'ok';
            })()
        """.trimIndent()
    }

    fun installNativeReplicaBridge(): String = """
        (function() {
          const BRIDGE_VERSION = 'native-replica-pult-3';
          if (window.__godvillePlusNativeReplicaBridgeVersion === BRIDGE_VERSION) return 'already';
          if (!window.GodvillePlus || !window.GodvillePlus.postMessage) return 'missing-bridge';
          if (window.__godvillePlusNativeReplicaBridgeObserver) {
            window.__godvillePlusNativeReplicaBridgeObserver.disconnect();
          }
          if (window.__godvillePlusNativeReplicaBridgeInterval) {
            window.clearInterval(window.__godvillePlusNativeReplicaBridgeInterval);
          }
          window.__godvillePlusNativeReplicaBridgeVersion = BRIDGE_VERSION;

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

          function cssPath(node) {
            if (!node || !node.parentElement) return null;
            if (node.id) return '#' + CSS.escape(node.id);
            const parent = cssPath(node.parentElement);
            if (!parent) return null;
            const siblings = Array.from(node.parentElement.children).filter(function(child) {
              return child.tagName === node.tagName;
            });
            const index = siblings.indexOf(node) + 1;
            return parent + ' > ' + node.tagName.toLowerCase() + ':nth-of-type(' + index + ')';
          }

          function actionFromLink(link, fallbackLabel) {
            if (!link) return null;
            const label = text(link.textContent || link.getAttribute('aria-label') || fallbackLabel, MAX_TEXT_LENGTH);
            const selector = cssPath(link);
            return label && selector ? { text: label, selector: selector } : null;
          }

          function findPultAction(pattern) {
            const links = Array.from(document.querySelectorAll('#cntrl a, #cntrl2 a, #control a'));
            return actionFromLink(links.find(function(link) {
              return pattern.test(text(link.textContent, MAX_TEXT_LENGTH));
            }));
          }

          function collectPult() {
            const root = document.querySelector('#cntrl');
            if (!root) return {};
            const rootText = String(root.innerText || root.textContent || '').replace(/\s+/g, ' ').trim();
            const pranaNode = root.querySelector('.gp_val');
            const chargeNode = root.querySelector('.acc_val');
            const blessingNode = document.querySelector('.e_bless .line, .e_bless, #cntrl + .line');
            const blessingText = blessingNode
              ? String(blessingNode.innerText || blessingNode.textContent || '').replace(/\s+/g, ' ').trim()
              : '';
            const prana = pranaNode ? text(pranaNode.textContent, MAX_TEXT_LENGTH).match(/\d+/) : null;
            const blessing = (
              blessingText.match(/Благословл[её]н(?:а|ён)?\s+на\s+\d+\s+(?:дн(?:я|ей)|days?)/i) ||
              blessingText.match(/Blessed\s+for\s+\d+\s+days?/i) ||
              rootText.match(/Благословл[её]н(?:а|ён)?\s+на\s+\d+\s+(?:дн(?:я|ей)|days?)/i) ||
              rootText.match(/Blessed\s+for\s+\d+\s+days?/i) ||
              [null]
            )[0];
            const dungeon = (
              rootText.match(/Подземелье.*?\d+\s*мин/i) ||
              rootText.match(/Dungeon.*?\d+\s*min/i) ||
              [null]
            )[0];
            const charge = (
              rootText.match(/Зарядов в аккумуляторе:\s*\d+/i) ||
              rootText.match(/Accumulator charges:\s*\d+/i) ||
              [null]
            )[0];
            return {
              prana: prana ? prana[0] + '%' : null,
              charge: chargeNode
                ? text(chargeNode.textContent, MAX_TEXT_LENGTH).replace(/\D/g, '')
                : charge
                  ? text(charge, MAX_TEXT_LENGTH).match(/\d+/)[0]
                  : null,
              blessing: blessing ? text(blessing, MAX_TEXT_LENGTH) : null,
              dungeon: dungeon ? text(dungeon, MAX_TEXT_LENGTH) : null,
              arena: findPultAction(/арен|arena/i),
              training: findPultAction(/трениров|train/i),
              sail: findPultAction(/плавани|sail/i),
              restorePranaAction:
                actionFromLink(document.querySelector('#acc_links_wrap .dch_link, #cntrl .dch_link'), 'Восстановить прану') ||
                findPultAction(/восстановить\s+прану|restore\s+godpower|recharge\s+godpower/i),
              chargeAction: actionFromLink(root.querySelector('.hch_link'), 'Зарядить аккумулятор') || findPultAction(/зарядить\s+аккумулятор|charge\s+accumulator/i)
            };
          }

          function sendSnapshot() {
            raf = 0;
            const snapshot = {
              status: collectStatus(),
              logger: collectLogger(),
              pult: collectPult()
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
          window.__godvillePlusNativeReplicaBridgeObserver = observer;
          window.__godvillePlusNativeReplicaBridgeInterval = window.setInterval(scheduleSnapshot, 5000);
          scheduleSnapshot();
          return 'ok';
        })()
    """.trimIndent()
}
