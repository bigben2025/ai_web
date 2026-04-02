(function () {
  'use strict';

  // Prevent double initialization
  if (window.__CCF_WIDGET_LOADED) return;
  window.__CCF_WIDGET_LOADED = true;

  // Determine the host URL from this script's src
  var scriptEl = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var scriptSrc = scriptEl ? scriptEl.src : '';
  var baseUrl = '';
  if (scriptSrc) {
    var url = new URL(scriptSrc);
    baseUrl = url.origin;
  } else {
    baseUrl = window.location.origin;
  }

  var WIDGET_URL = baseUrl + '/widget';
  var WIDGET_WIDTH = 400;
  var WIDGET_HEIGHT = 580;
  var BUTTON_SIZE = 60;

  // ─── Styles ───────────────────────────────────────────────────
  var styles = `
    #ccf-widget-button {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: ${BUTTON_SIZE}px;
      height: ${BUTTON_SIZE}px;
      border-radius: 50%;
      background: linear-gradient(135deg, #8dc63f 0%, #78b833 50%, #65a028 100%);
      border: none;
      cursor: pointer;
      z-index: 999998;
      box-shadow: 0 4px 20px rgba(120, 184, 51, 0.5), 0 2px 8px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      outline: none;
    }
    #ccf-widget-button:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 28px rgba(120, 184, 51, 0.6), 0 3px 12px rgba(0,0,0,0.25);
    }
    #ccf-widget-button:active {
      transform: scale(0.96);
    }
    #ccf-widget-button svg {
      width: 28px;
      height: 28px;
      fill: white;
      transition: transform 0.3s ease, opacity 0.3s ease;
    }
    #ccf-widget-button .ccf-icon-chat {
      position: absolute;
    }
    #ccf-widget-button .ccf-icon-close {
      position: absolute;
      opacity: 0;
      transform: rotate(-90deg);
    }
    #ccf-widget-button.is-open .ccf-icon-chat {
      opacity: 0;
      transform: rotate(90deg);
    }
    #ccf-widget-button.is-open .ccf-icon-close {
      opacity: 1;
      transform: rotate(0deg);
    }
    #ccf-widget-notification {
      position: fixed;
      bottom: ${BUTTON_SIZE + 24 + 8}px;
      right: 24px;
      background: white;
      border-radius: 12px;
      padding: 10px 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #374151;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);
      z-index: 999997;
      max-width: 220px;
      cursor: pointer;
      animation: ccf-bubble-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      border: 1px solid #e5e7eb;
    }
    #ccf-widget-notification::after {
      content: '';
      position: absolute;
      bottom: -6px;
      right: 22px;
      width: 10px;
      height: 10px;
      background: white;
      border-right: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
      transform: rotate(45deg);
    }
    #ccf-widget-notification strong {
      display: block;
      color: #78b833;
      margin-bottom: 2px;
      font-size: 12px;
    }
    #ccf-widget-container {
      position: fixed;
      bottom: ${BUTTON_SIZE + 24 + 12}px;
      right: 24px;
      width: ${WIDGET_WIDTH}px;
      height: ${WIDGET_HEIGHT}px;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 12px 48px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.12);
      z-index: 999999;
      border: 1px solid rgba(0,0,0,0.08);
      transform-origin: bottom right;
      animation: ccf-open 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    #ccf-widget-container.is-closing {
      animation: ccf-close 0.25s ease-in both;
    }
    #ccf-widget-container iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }
    @keyframes ccf-open {
      from {
        transform: scale(0.5) translateY(20px);
        opacity: 0;
      }
      to {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
    }
    @keyframes ccf-close {
      from {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
      to {
        transform: scale(0.5) translateY(20px);
        opacity: 0;
      }
    }
    @keyframes ccf-bubble-in {
      from {
        transform: scale(0.8) translateY(8px);
        opacity: 0;
      }
      to {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
    }
    @media (max-width: 480px) {
      #ccf-widget-container {
        bottom: 0;
        right: 0;
        width: 100vw;
        height: 100vh;
        border-radius: 0;
      }
      #ccf-widget-button {
        bottom: 16px;
        right: 16px;
      }
      #ccf-widget-notification {
        bottom: ${BUTTON_SIZE + 16 + 8}px;
        right: 16px;
      }
    }
  `;

  // ─── Inject styles ─────────────────────────────────────────────
  var styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // ─── Create elements ───────────────────────────────────────────

  // Chat icon SVG
  var chatIconSVG = '<svg class="ccf-icon-chat" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.05 20.8a1 1 0 001.25 1.25l3.632-1.388A9.954 9.954 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.95 7.95 0 01-3.86-1l-.28-.16-2.9 1.108 1.108-2.9-.16-.28A7.95 7.95 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/></svg>';

  // Close icon SVG
  var closeIconSVG = '<svg class="ccf-icon-close" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

  // Button
  var button = document.createElement('button');
  button.id = 'ccf-widget-button';
  button.setAttribute('aria-label', 'Chat with Concierge Care Florida');
  button.innerHTML = chatIconSVG + closeIconSVG;

  // Notification bubble
  var notification = document.createElement('div');
  notification.id = 'ccf-widget-notification';
  notification.innerHTML = '<strong>Concierge Care Florida</strong>Need help finding care for a loved one?';

  // Widget container (created lazily)
  var container = null;
  var isOpen = false;
  var notificationDismissed = false;

  // ─── Logic ────────────────────────────────────────────────────

  function createContainer() {
    if (container) return;
    container = document.createElement('div');
    container.id = 'ccf-widget-container';

    var iframe = document.createElement('iframe');
    iframe.src = WIDGET_URL;
    iframe.title = 'Concierge Care Florida Chat Widget';
    iframe.setAttribute('allow', 'microphone');
    iframe.setAttribute('loading', 'lazy');

    container.appendChild(iframe);
  }

  function openWidget() {
    isOpen = true;
    button.classList.add('is-open');
    button.setAttribute('aria-label', 'Close chat');

    // Remove notification
    dismissNotification();

    // Create & show container
    createContainer();
    if (container.classList.contains('is-closing')) {
      container.classList.remove('is-closing');
    }
    // Re-trigger animation
    container.style.animation = 'none';
    container.offsetHeight; // reflow
    container.style.animation = '';
    document.body.appendChild(container);
  }

  function closeWidget() {
    isOpen = false;
    button.classList.remove('is-open');
    button.setAttribute('aria-label', 'Chat with Concierge Care Florida');

    if (container && container.parentNode) {
      container.classList.add('is-closing');
      setTimeout(function () {
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
          container.classList.remove('is-closing');
        }
      }, 250);
    }
  }

  function toggleWidget() {
    if (isOpen) {
      closeWidget();
    } else {
      openWidget();
    }
  }

  function dismissNotification() {
    if (!notificationDismissed && notification.parentNode) {
      notificationDismissed = true;
      notification.style.transition = 'opacity 0.2s, transform 0.2s';
      notification.style.opacity = '0';
      notification.style.transform = 'scale(0.9) translateY(4px)';
      setTimeout(function () {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 200);
    }
  }

  // ─── Event listeners ──────────────────────────────────────────
  button.addEventListener('click', toggleWidget);

  notification.addEventListener('click', function () {
    openWidget();
  });

  // Close on escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) {
      closeWidget();
    }
  });

  // ─── Mount ─────────────────────────────────────────────────────
  document.body.appendChild(button);

  // Show notification after a delay
  setTimeout(function () {
    if (!isOpen && !notificationDismissed) {
      document.body.appendChild(notification);

      // Auto-dismiss notification after 8 seconds
      setTimeout(function () {
        dismissNotification();
      }, 8000);
    }
  }, 2500);

})();
