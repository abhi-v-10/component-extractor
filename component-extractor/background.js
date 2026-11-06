/**
 * Background script for Component Extractor (Firefox / Zen Browser MV3)
 * Injects the visual inspector and extractor into the active tab on action click.
 */

const api = typeof browser !== 'undefined' ? browser : chrome;

async function toggleExtractor(tab) {
  if (!tab || tab.id == null) return;
  const target = { tabId: tab.id };

  try {
    // Check if extractor is already injected
    const [probe] = await api.scripting.executeScript({
      target,
      func: () => {
        if (window.__componentExtractor) {
          window.__componentExtractor.toggle();
          return { running: true };
        }
        return { running: false };
      }
    });

    if (probe && probe.result && probe.result.running) {
      return;
    }

    // Inject the main extractor content script
    await api.scripting.executeScript({
      target,
      files: ['extractor.js']
    });
  } catch (err) {
    console.error('[ComponentExtractor] Failed to inject extractor:', err);
    try {
      await api.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#EF4444' });
      await api.action.setBadgeText({ tabId: tab.id, text: '!' });
      setTimeout(() => {
        api.action.setBadgeText({ tabId: tab.id, text: '' });
      }, 2500);
    } catch (_) {}
  }
}

api.action.onClicked.addListener(toggleExtractor);
