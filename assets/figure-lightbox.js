/* ==========================================================================
   Figure Lightbox + Figure Metadata
   ========================================================================== */

(function () {
  'use strict';

  var figureNodes = Array.prototype.slice.call(document.querySelectorAll('figure.figure'));
  var entries = [];

  if (!figureNodes.length) {
    return;
  }

  function classifyOrientation(figure, img) {
    var width = img.naturalWidth || img.width;
    var height = img.naturalHeight || img.height;

    if (!width || !height) {
      return;
    }

    figure.classList.remove('is-portrait', 'is-landscape', 'is-ultra-wide');

    var ratio = width / height;
    if (ratio >= 2.1) {
      figure.classList.add('is-ultra-wide', 'is-landscape');
    } else if (ratio >= 1.1) {
      figure.classList.add('is-landscape');
    } else {
      figure.classList.add('is-portrait');
    }
  }

  function getCaptionParts(figure, fallbackLabel) {
    var idNode = figure.querySelector('.caption .id');
    var contentNode = figure.querySelector('.caption .content');
    var figureCaption = figure.querySelector('figcaption');
    var chapterLabelMatch = null;
    var normalizedId = '';

    var idText = idNode ? idNode.textContent.trim() : fallbackLabel;
    var contentText = contentNode ? contentNode.textContent.trim() : '';

    if (!contentText && figureCaption) {
      contentText = figureCaption.textContent.replace(idText, '').trim();
    }

    chapterLabelMatch = contentText.match(/^Figure\s+([A-Za-z0-9][A-Za-z0-9.\-]*)\s*:\s*(.*)$/i);
    if (chapterLabelMatch) {
      idText = 'Figure ' + chapterLabelMatch[1] + ':';
      contentText = (chapterLabelMatch[2] || '').trim();
    }

    normalizedId = idText.replace(/\s+/g, ' ').trim();
    if (normalizedId && normalizedId.slice(-1) !== ':') {
      normalizedId += ':';
    }
    if (normalizedId && contentText.toLowerCase().indexOf(normalizedId.toLowerCase()) === 0) {
      contentText = contentText.slice(normalizedId.length).trim();
    }

    return {
      id: normalizedId,
      text: contentText,
    };
  }

  figureNodes.forEach(function (figure) {
    var img = figure.querySelector('img');
    if (!img) {
      return;
    }

    var entry = {
      figure: figure,
      img: img,
      caption: getCaptionParts(figure, ''),
      toolbarMeta: null,
    };

    if (img.complete) {
      classifyOrientation(figure, img);
    } else {
      img.addEventListener('load', function () {
        classifyOrientation(figure, img);
      });
    }

    var toolbar = document.createElement('div');
    toolbar.className = 'figure-toolbar';

    var meta = document.createElement('span');
    meta.className = 'figure-meta';
    toolbar.appendChild(meta);
    entry.toolbarMeta = meta;

    var expandButton = document.createElement('button');
    expandButton.className = 'figure-expand-btn';
    expandButton.type = 'button';
    expandButton.textContent = 'Expand';
    toolbar.appendChild(expandButton);

    var figcaption = figure.querySelector('figcaption');
    if (figcaption) {
      figure.insertBefore(toolbar, figcaption);
    } else {
      figure.appendChild(toolbar);
    }

    var fallbackAlt = img.getAttribute('alt') || 'Figure image';
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', 'Open full-size figure: ' + fallbackAlt);

    entry.expandButton = expandButton;
    entries.push(entry);
  });

  if (!entries.length) {
    return;
  }

  var total = entries.length;
  entries.forEach(function (entry, index) {
    var figureNumber = index + 1;
    var fallbackId = 'Figure ' + figureNumber + ':';
    if (!entry.caption.id) {
      entry.caption.id = fallbackId;
    }

    entry.figure.setAttribute('data-figure-index', String(figureNumber));
    entry.figure.setAttribute('data-figure-total', String(total));
    entry.img.setAttribute('data-figure-index', String(figureNumber));
    entry.img.setAttribute('data-figure-total', String(total));

    if (entry.toolbarMeta) {
      entry.toolbarMeta.textContent = 'Figure ' + figureNumber + ' of ' + total;
    }
  });

  var modal = document.createElement('div');
  modal.className = 'figure-lightbox';
  modal.setAttribute('aria-hidden', 'true');

  modal.innerHTML =
    '<div class="figure-lightbox__backdrop" data-action="close"></div>' +
    '<div class="figure-lightbox__surface" role="dialog" aria-modal="true" aria-label="Figure viewer" tabindex="-1">' +
      '<div class="figure-lightbox__toolbar">' +
        '<div class="figure-lightbox__counter" aria-live="polite"></div>' +
        '<div class="figure-lightbox__actions">' +
          '<button type="button" class="figure-lightbox__btn" data-action="prev" aria-label="Previous figure">Prev</button>' +
          '<button type="button" class="figure-lightbox__btn" data-action="next" aria-label="Next figure">Next</button>' +
          '<button type="button" class="figure-lightbox__btn" data-action="close" aria-label="Close figure viewer">Close</button>' +
        '</div>' +
      '</div>' +
      '<figure class="figure-lightbox__stage">' +
        '<img class="figure-lightbox__image" alt="" />' +
        '<figcaption class="figure-lightbox__caption">' +
          '<span class="figure-lightbox__caption-id"></span>' +
          '<span class="figure-lightbox__caption-text"></span>' +
        '</figcaption>' +
      '</figure>' +
    '</div>';

  document.body.appendChild(modal);

  var surface = modal.querySelector('.figure-lightbox__surface');
  var backdrop = modal.querySelector('.figure-lightbox__backdrop');
  var prevButton = modal.querySelector('[data-action="prev"]');
  var nextButton = modal.querySelector('[data-action="next"]');
  var closeButton = modal.querySelector('.figure-lightbox__btn[data-action="close"]');
  var counter = modal.querySelector('.figure-lightbox__counter');
  var stage = modal.querySelector('.figure-lightbox__stage');
  var modalImage = modal.querySelector('.figure-lightbox__image');
  var captionId = modal.querySelector('.figure-lightbox__caption-id');
  var captionText = modal.querySelector('.figure-lightbox__caption-text');

  var activeIndex = 0;
  var isOpen = false;
  var lastFocusedElement = null;
  var touchStartX = null;

  function getFocusableControls() {
    var selectors = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
    return Array.prototype.slice.call(surface.querySelectorAll(selectors));
  }

  function render(index) {
    var entry = entries[index];

    modalImage.src = entry.img.getAttribute('src');
    modalImage.alt = entry.img.getAttribute('alt') || 'Figure ' + (index + 1);

    captionId.textContent = entry.caption.id || 'Figure ' + (index + 1) + ':';
    captionText.textContent = entry.caption.text || '';

    counter.textContent = (index + 1) + ' / ' + total;

    prevButton.disabled = index <= 0;
    nextButton.disabled = index >= total - 1;

    modal.setAttribute('data-figure-index', String(index + 1));
    modal.setAttribute('data-figure-total', String(total));
  }

  function openAt(index) {
    if (index < 0 || index >= total) {
      return;
    }

    activeIndex = index;
    render(activeIndex);

    lastFocusedElement = document.activeElement;
    isOpen = true;

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('figure-lightbox-open');

    surface.focus();
  }

  function closeModal() {
    if (!isOpen) {
      return;
    }

    isOpen = false;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('figure-lightbox-open');

    modalImage.removeAttribute('src');

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  function navigate(delta) {
    var target = activeIndex + delta;
    if (target < 0 || target >= total) {
      return;
    }

    activeIndex = target;
    render(activeIndex);
  }

  function trapFocus(event) {
    if (event.key !== 'Tab' || !isOpen) {
      return;
    }

    var focusables = getFocusableControls();
    if (!focusables.length) {
      event.preventDefault();
      return;
    }

    var first = focusables[0];
    var last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  document.addEventListener('keydown', function (event) {
    if (!isOpen) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigate(-1);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigate(1);
      return;
    }

    trapFocus(event);
  });

  backdrop.addEventListener('click', closeModal);
  closeButton.addEventListener('click', closeModal);
  prevButton.addEventListener('click', function () { navigate(-1); });
  nextButton.addEventListener('click', function () { navigate(1); });

  stage.addEventListener('touchstart', function (event) {
    if (!event.changedTouches || !event.changedTouches.length) {
      return;
    }
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });

  stage.addEventListener('touchend', function (event) {
    if (touchStartX === null || !event.changedTouches || !event.changedTouches.length) {
      return;
    }

    var endX = event.changedTouches[0].clientX;
    var deltaX = endX - touchStartX;
    touchStartX = null;

    if (Math.abs(deltaX) < 50) {
      return;
    }

    if (deltaX > 0) {
      navigate(-1);
    } else {
      navigate(1);
    }
  }, { passive: true });

  entries.forEach(function (entry, index) {
    function openThisFigure(event) {
      if (event) {
        event.preventDefault();
      }
      openAt(index);
    }

    entry.img.addEventListener('click', openThisFigure);
    entry.img.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        openThisFigure(event);
      }
    });

    if (entry.expandButton) {
      entry.expandButton.addEventListener('click', openThisFigure);
    }
  });
})();
