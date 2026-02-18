/* ==========================================================================
   Phased Arrays — Navigation JavaScript
   ========================================================================== */

(function () {
  'use strict';

  var MOBILE_BREAKPOINT = 860;

  // --- Sidebar Toggle ---
  var hamburger = document.querySelector('.hamburger');
  var sidebar = document.getElementById('sidebar');
  var overlay = null;

  // Create overlay element for mobile
  if (sidebar) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }

  if (hamburger) {
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-controls', 'sidebar');
  }

  function openSidebar() {
    if (sidebar && window.innerWidth <= MOBILE_BREAKPOINT) {
      sidebar.classList.add('open');
      if (overlay) overlay.classList.add('visible');
      document.body.classList.add('no-scroll');
      if (hamburger) hamburger.setAttribute('aria-expanded', 'true');
    }
  }

  function closeSidebar() {
    if (sidebar) {
      sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('visible');
      document.body.classList.remove('no-scroll');
      if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    }
  }

  function toggleSidebar() {
    if (sidebar && sidebar.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  if (hamburger) {
    hamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleSidebar();
    });
  }

  // Close sidebar when clicking overlay
  if (overlay) {
    overlay.addEventListener('click', function () {
      closeSidebar();
    });
  }

  // Close sidebar on mobile when clicking a link
  if (sidebar) {
    var links = sidebar.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function () {
        if (window.innerWidth <= MOBILE_BREAKPOINT) {
          closeSidebar();
        }
      });
    }
  }

  // Keyboard shortcut: Escape closes sidebar on mobile
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && window.innerWidth <= MOBILE_BREAKPOINT) {
      closeSidebar();
    }
  });

  // Keep classes in sync when viewport crosses mobile breakpoint.
  window.addEventListener('resize', function () {
    if (window.innerWidth > MOBILE_BREAKPOINT) {
      closeSidebar();
    }
  });

  // --- Highlight Current Chapter ---
  var chapterNum = document.body.getAttribute('data-chapter');
  if (chapterNum !== null && sidebar) {
    var sidebarLinks = sidebar.querySelectorAll('a[data-ch]');
    for (var j = 0; j < sidebarLinks.length; j++) {
      if (sidebarLinks[j].getAttribute('data-ch') === chapterNum) {
        sidebarLinks[j].classList.add('active');
        // Scroll the active link into view within the sidebar
        setTimeout(function () {
          var active = sidebar.querySelector('a.active');
          if (active) {
            active.scrollIntoView({ block: 'center', behavior: 'auto' });
          }
        }, 100);
        break;
      }
    }
  }
})();
