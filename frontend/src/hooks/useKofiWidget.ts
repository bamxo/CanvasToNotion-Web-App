import { useEffect, useRef } from 'react';

// Global flag to track if Ko-fi script is loaded
let kofiScriptLoaded = false;
let kofiScriptLoading = false;

interface KofiWidgetOptions {
  animationDelay?: number; // Optional delay in milliseconds for the startup animation
}

export const useKofiWidget = (options: KofiWidgetOptions = {}) => {
  const widgetInitialized = useRef(false);
  const startupAnimationTriggered = useRef(false);

  useEffect(() => {
    // Create and inject custom CSS to fix Ko-fi widget styling
    const injectCustomCSS = () => {
      // Check if custom CSS is already injected
      if (document.querySelector('#kofi-widget-custom-styles')) {
        return;
      }

      const style = document.createElement('style');
      style.id = 'kofi-widget-custom-styles';
      style.textContent = `
        /* Remove white background from Ko-fi widget */
        div[id*="kofi-widget-overlay"] {
          color-scheme: none !important;
        }
        
        /* Additional styling to ensure proper appearance */
        div[id*="kofi-widget-overlay"] * {
          color-scheme: none !important;
        }
        
        /* Move Ko-fi widget to bottom right corner */
        .floatingchat-container-wrap {
          left: unset !important;
          right: 16px !important;
          bottom: 16px !important;
        }
        
        .floatingchat-container-wrap-mobi {
          left: unset !important;
          right: 16px !important;
          bottom: 16px !important;
        }
        
        /* Position popup iframe to bottom right */
        .floating-chat-kofi-popup-iframe {
          left: unset !important;
          right: 16px !important;
          bottom: 70px !important; /* Position above the widget button */
          max-width: calc(100vw - 32px) !important; /* Ensure popup fits within viewport */
          max-height: calc(100vh - 100px) !important; /* Prevent popup from overflowing viewport */
        }
        
        .floating-chat-kofi-popup-iframe-mobi {
          left: unset !important;
          right: 16px !important;
          bottom: 70px !important; /* Position above the widget button */
          max-width: calc(100vw - 32px) !important; /* Ensure popup fits within viewport */
          max-height: calc(100vh - 100px) !important; /* Prevent popup from overflowing viewport */
        }
        
        /* Ensure popup content is contained within viewport */
        .floating-chat-kofi-popup-iframe-container {
          max-width: 100% !important;
          max-height: 100% !important;
          overflow: auto !important;
        }
        
        .floating-chat-kofi-popup-iframe-container-mobi {
          max-width: 100% !important;
          max-height: 100% !important;
          overflow: auto !important;
        }
        
        /* Position closer button for mobile */
        .floating-chat-kofi-popup-iframe-closer-mobi {
          left: unset !important;
          right: 16px !important;
        }
        
        /* Hide Ko-fi notice element on desktop devices (devices with fine pointer and hover capability) */
        @media (hover: hover) and (pointer: fine) {
          .floating-chat-kofi-popup-iframe-notice {
            display: none !important;
          }
        }
        
        /* Hide Ko-fi notice element on mobile devices (devices with coarse pointer and no hover) */
        @media (hover: none) and (pointer: coarse) {
          .floating-chat-kofi-popup-iframe-notice {
            display: none !important;
          }
        }
        
        /* Hide Ko-fi notice element on mobile devices (alternative targeting for touch devices) */
        @media (any-pointer: coarse) {
          .floating-chat-kofi-popup-iframe-notice {
            display: none !important;
          }
        }
        
        /* Fallback: Hide Ko-fi notice element on all devices */
        .floating-chat-kofi-popup-iframe-notice {
          display: none !important;
        }
        
        /* Hide Ko-fi popup close button on both desktop and mobile */
        .floating-chat-kofi-popup-iframe-closer,
        .floating-chat-kofi-popup-iframe-closer-mobi {
          display: none !important;
        }
        
        /* Add smooth closing animation for Ko-fi popup */
        .floating-chat-kofi-popup-iframe,
        .floating-chat-kofi-popup-iframe-mobi {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          transform-origin: bottom right !important;
        }
        
        /* Animation states for popup closing */
        .floating-chat-kofi-popup-iframe[style*="display: none"],
        .floating-chat-kofi-popup-iframe-mobi[style*="display: none"] {
          transform: scale(0.95) translateY(10px) !important;
          opacity: 0 !important;
        }
        
        /* Ensure popup appears smoothly when opening */
        .floating-chat-kofi-popup-iframe[style*="display: block"],
        .floating-chat-kofi-popup-iframe-mobi[style*="display: block"] {
          transform: scale(1) translateY(0) !important;
          opacity: 1 !important;
        }
        
        /* Animation for Ko-fi widget button */
        .floatingchat-container-wrap,
        .floatingchat-container-wrap-mobi {
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        .floatingchat-container-wrap:hover,
        .floatingchat-container-wrap-mobi:hover {
          transform: scale(1.05) !important;
        }
        
        /* Startup animation keyframes */
        @keyframes kofiWidgetStartup {
          0% {
            opacity: 0;
            transform: scale(0.3) translateY(20px);
          }
          60% {
            opacity: 0.8;
            transform: scale(1.1) translateY(-5px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        /* Initial hidden state for startup animation */
        .floatingchat-container-wrap,
        .floatingchat-container-wrap-mobi {
          opacity: 0;
          transform: scale(0.3) translateY(20px);
        }
        
        /* Startup animation class */
        .floatingchat-container-wrap.kofi-startup-animation,
        .floatingchat-container-wrap-mobi.kofi-startup-animation {
          animation: kofiWidgetStartup 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        
        /* Mobile-first responsive adjustments - MOVED 0.5X LEFT (CENTERED) */
        @media screen and (max-width: 600px) {
          .floatingchat-container-wrap,
          .floatingchat-container-wrap-mobi {
            left: calc(50vw + 25px) !important;
            right: unset !important;
            bottom: 40px !important;
            max-width: 47vw !important; /* Prevent overflow on very small screens */
          }
          
          .floating-chat-kofi-popup-iframe,
          .floating-chat-kofi-popup-iframe-mobi {
            left: unset !important;
            right: 16px !important; /* Position popup from right edge for better alignment */
            bottom: 100px !important;
            max-width: calc(100vw - 32px) !important; /* Full width minus margins */
            max-height: calc(100vh - 140px) !important;
            width: 400px !important; /* Set a reasonable default width */
          }
          
          .floating-chat-kofi-popup-iframe-closer-mobi {
            left: unset !important;
            right: 16px !important; /* Position close button aligned with popup */
          }
        }
        
        /* Very small screens - MOVED 0.5X LEFT (CENTERED) */
        @media screen and (max-width: 480px) {
          .floatingchat-container-wrap,
          .floatingchat-container-wrap-mobi {
            left: calc(50vw + 20px) !important;
            right: unset !important;
            bottom: 45px !important;
            max-width: 47vw !important;
          }
          
          .floating-chat-kofi-popup-iframe,
          .floating-chat-kofi-popup-iframe-mobi {
            left: unset !important;
            right: 16px !important; /* Position popup from right edge for better alignment */
            bottom: 105px !important;
            max-width: calc(100vw - 16px) !important; /* Full width minus smaller margins */
            max-height: calc(100vh - 150px) !important;
            width: 360px !important; /* Set a reasonable default width for small screens */
          }
          
          .floating-chat-kofi-popup-iframe-closer-mobi {
            left: unset !important;
            right: 16px !important; /* Position close button aligned with popup */
          }
        }
      `;
      document.head.appendChild(style);
    };

    // Trigger startup animation with configurable delay
    const triggerStartupAnimation = () => {
      if (startupAnimationTriggered.current) {
        return;
      }
      
      // Use custom delay if provided, otherwise use the default timing for landing page
      const customDelay = options.animationDelay;
      const defaultDelay = 2300 + 500; // Default: splash screen duration + additional delay
      
      const totalDelay = customDelay !== undefined ? customDelay : defaultDelay;
      
      setTimeout(() => {
        const widgets = document.querySelectorAll('.floatingchat-container-wrap, .floatingchat-container-wrap-mobi');
        widgets.forEach(widget => {
          widget.classList.add('kofi-startup-animation');
        });
        startupAnimationTriggered.current = true;
      }, totalDelay);
    };

    // Initialize the Ko-fi widget
    const initializeWidget = () => {
      if (widgetInitialized.current || !window.kofiWidgetOverlay) {
        return;
      }

      // Remove any existing Ko-fi widgets first
      const existingWidgets = document.querySelectorAll('[id*="kofi-widget-overlay"]');
      existingWidgets.forEach(widget => widget.remove());

      // Initialize the widget
      window.kofiWidgetOverlay.draw('landonnguyen1011', {
        'type': 'floating-chat',
        'floating-chat.donateButton.text': 'Support Us',
        'floating-chat.donateButton.background-color': '#f45d22',
        'floating-chat.donateButton.text-color': '#fff'
      });

      widgetInitialized.current = true;
      
      // Inject custom CSS after widget initialization
      setTimeout(injectCustomCSS, 100);
      
      // Trigger startup animation
      triggerStartupAnimation();
    };

    // If script is already loaded, initialize immediately
    if (kofiScriptLoaded && window.kofiWidgetOverlay) {
      initializeWidget();
      return;
    }

    // If script is already loading, wait for it
    if (kofiScriptLoading) {
      const checkLoaded = () => {
        if (kofiScriptLoaded && window.kofiWidgetOverlay) {
          initializeWidget();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
      return;
    }

    // Check if the Ko-fi script is already in the DOM
    const existingScript = document.querySelector('script[src="https://storage.ko-fi.com/cdn/scripts/overlay-widget.js"]');
    if (existingScript) {
      kofiScriptLoaded = true;
      if (window.kofiWidgetOverlay) {
        initializeWidget();
      }
      return;
    }

    // Load the Ko-fi script
    kofiScriptLoading = true;
    const script = document.createElement('script');
    script.src = 'https://storage.ko-fi.com/cdn/scripts/overlay-widget.js';
    script.async = true;
    
    script.onload = () => {
      kofiScriptLoaded = true;
      kofiScriptLoading = false;
      initializeWidget();
    };

    script.onerror = () => {
      kofiScriptLoading = false;
      console.error('Failed to load Ko-fi widget script');
    };

    document.head.appendChild(script);

    // Cleanup function - only clean up widget elements, not the script
    return () => {
      // Mark widget as not initialized for this component
      widgetInitialized.current = false;
      
      // Remove Ko-fi widget elements (but keep the script for other components)
      const kofiWidgets = document.querySelectorAll('[id*="kofi-widget-overlay"]');
      kofiWidgets.forEach(widget => widget.remove());
      
      // Note: We don't remove the script or CSS here because other components might be using it
      // The script and CSS are global resources that should persist across component unmounts
    };
  }, [options.animationDelay]);
};

// Type declaration for the Ko-fi widget
declare global {
  interface Window {
    kofiWidgetOverlay: {
      draw: (username: string, options: {
        'type': string;
        'floating-chat.donateButton.text': string;
        'floating-chat.donateButton.background-color': string;
        'floating-chat.donateButton.text-color': string;
      }) => void;
    };
  }
} 