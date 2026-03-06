(function () {
  'use strict';

  var INDEX_URL = window.CSO_SEARCH_INDEX_URL;
  if (!INDEX_URL) {
    return;
  }

  var recordsPromise = null;
  var overlay = null;
  var overlayInput = null;
  var overlayResults = null;
  var activeQuery = '';
  var SEARCH_LIMIT = 10;

  function normalize(text) {
    return (text || '').toLowerCase().trim();
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function loadRecords() {
    if (!recordsPromise) {
      recordsPromise = fetch(INDEX_URL)
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Search index request failed');
          }
          return response.json();
        })
        .catch(function () {
          return [];
        });
    }
    return recordsPromise;
  }

  function badgeLabel(record) {
    if (record.surface_type === 'chapter' && record.chapter_num !== null && record.chapter_num !== undefined) {
      return 'Chapter ' + record.chapter_num;
    }
    if (record.surface_type === 'guide') {
      return 'Guide';
    }
    if (record.surface_type === 'reference') {
      return 'Reference';
    }
    return 'Archive';
  }

  function snippet(record) {
    return record.description || record.excerpt || '';
  }

  function renderResultCard(record) {
    var part = record.part_label ? '<span class="search-result-badge">' + escapeHtml(record.part_label) + '</span>' : '';
    return [
      '<a class="search-result-card" href="' + escapeHtml(record.url) + '">',
      '  <div class="search-result-meta">',
      '    <span class="search-result-badge">' + escapeHtml(badgeLabel(record)) + '</span>',
           part,
      '  </div>',
      '  <h3>' + escapeHtml(record.title) + '</h3>',
      '  <p>' + escapeHtml(snippet(record)) + '</p>',
      '</a>'
    ].join('\n');
  }

  function scoreRecord(record, query, terms) {
    var title = normalize(record.title);
    var description = normalize(record.description);
    var excerpt = normalize(record.excerpt);
    var keywords = normalize((record.keywords || []).join(' '));
    var score = (record.priority || 0) * 10;

    if (title.indexOf(query) !== -1) score += 120;
    if (keywords.indexOf(query) !== -1) score += 70;
    if (description.indexOf(query) !== -1) score += 35;
    if (excerpt.indexOf(query) !== -1) score += 18;

    for (var i = 0; i < terms.length; i++) {
      var term = terms[i];
      if (!term) continue;
      if (title.indexOf(term) !== -1) score += 25;
      if (keywords.indexOf(term) !== -1) score += 14;
      if (description.indexOf(term) !== -1) score += 7;
      if (excerpt.indexOf(term) !== -1) score += 3;
    }

    return score;
  }

  function searchRecords(records, rawQuery) {
    var query = normalize(rawQuery);
    if (!query) {
      return [];
    }

    var terms = query.split(/\s+/).filter(Boolean);
    return records
      .map(function (record) {
        return {
          record: record,
          score: scoreRecord(record, query, terms)
        };
      })
      .filter(function (item) {
        return item.score > 0;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      })
      .slice(0, SEARCH_LIMIT)
      .map(function (item) {
        return item.record;
      });
  }

  function renderResults(target, rawQuery, results) {
    if (!target) return;
    if (!rawQuery) {
      target.innerHTML = '<p class="search-helper">Search chapters, doctrine pages, appendices, and guides.</p>';
      target.hidden = false;
      return;
    }
    if (!results.length) {
      target.innerHTML = '<p class="search-empty">No canonical pages matched that query.</p>';
      target.hidden = false;
      return;
    }
    target.innerHTML = results.map(renderResultCard).join('\n');
    target.hidden = false;
  }

  function runSearch(rawQuery, target) {
    activeQuery = rawQuery || '';
    loadRecords().then(function (records) {
      renderResults(target, rawQuery, searchRecords(records, rawQuery));
    });
  }

  function ensureOverlay() {
    if (overlay) {
      return overlay;
    }

    overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = [
      '<div class="search-overlay__backdrop" data-search-close></div>',
      '<div class="search-overlay__panel" role="dialog" aria-modal="true" aria-label="Search the archive">',
      '  <div class="search-overlay__header">',
      '    <h2 class="search-overlay__title">Search the Archive</h2>',
      '    <button type="button" class="search-overlay__close" data-search-close aria-label="Close search">×</button>',
      '  </div>',
      '  <div class="search-overlay__body">',
      '    <form class="search-inline-form search-overlay__form">',
      '      <label class="search-label" for="overlay-search-input">Search query</label>',
      '      <div class="search-inline-row">',
      '        <input id="overlay-search-input" type="search" placeholder="Search terms like counter-jamming, cognitive conflict, or awakening" autocomplete="off">',
      '        <button type="submit" class="top-bar-search">Search</button>',
      '      </div>',
      '    </form>',
      '    <div class="search-results" aria-live="polite"></div>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(overlay);

    overlayInput = overlay.querySelector('input[type="search"]');
    overlayResults = overlay.querySelector('.search-results');

    overlay.querySelector('.search-overlay__form').addEventListener('submit', function (event) {
      event.preventDefault();
      runSearch(overlayInput.value, overlayResults);
    });

    overlayInput.addEventListener('input', function () {
      runSearch(overlayInput.value, overlayResults);
    });

    var closers = overlay.querySelectorAll('[data-search-close]');
    for (var i = 0; i < closers.length; i++) {
      closers[i].addEventListener('click', closeOverlay);
    }

    return overlay;
  }

  function openOverlay(prefill) {
    ensureOverlay();
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    overlayInput.value = prefill || activeQuery || '';
    runSearch(overlayInput.value, overlayResults);
    window.setTimeout(function () {
      overlayInput.focus();
      overlayInput.select();
    }, 10);
  }

  function closeOverlay() {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  }

  function wireInlineSearch() {
    var form = document.querySelector('[data-search-inline]');
    var results = document.querySelector('[data-search-results]');
    if (!form || !results) {
      return;
    }
    var input = form.querySelector('input[type="search"]');
    renderResults(results, '', []);

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      runSearch(input.value, results);
    });

    input.addEventListener('input', function () {
      if (!input.value.trim()) {
        renderResults(results, '', []);
        return;
      }
      runSearch(input.value, results);
    });
  }

  function wireTriggers() {
    var triggers = document.querySelectorAll('[data-search-trigger]');
    for (var i = 0; i < triggers.length; i++) {
      triggers[i].addEventListener('click', function () {
        openOverlay('');
      });
    }
  }

  function shouldIgnoreShortcut(event) {
    var target = event.target;
    if (!target) return false;
    var tag = target.tagName;
    return target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeOverlay();
      return;
    }

    if (event.key === '/' && !shouldIgnoreShortcut(event)) {
      event.preventDefault();
      var inlineInput = document.querySelector('[data-search-inline] input[type="search"]');
      if (inlineInput) {
        inlineInput.focus();
        inlineInput.select();
      } else {
        openOverlay('');
      }
    }
  });

  wireInlineSearch();
  wireTriggers();
})();
