// Global variables
let isFullscreen = false;
let isMouseNearTop = false;
let autoFullscreenEnabled = true;
let topSensitivityArea = 20; // Pixels from top to trigger exit fullscreen
let returnDelay = 1000; // Delay (ms) before re-entering fullscreen
let isInitialized = false;
let returnTimeoutId = null; // Timer ID for returning fullscreen
let fullscreenRetryTimeout = null; // Timer to throttle fullscreen attempts

// Initialization function
function initialize() {
  if (isInitialized) return;
  isInitialized = true;
  console.log("Initializing content script");

  // Load settings from storage
  chrome.storage.sync.get(
    ["autoFullscreenEnabled", "topSensitivityArea", "returnDelay"],
    function (result) {
      if (result.autoFullscreenEnabled !== undefined) {
        autoFullscreenEnabled = result.autoFullscreenEnabled;
      }
      if (result.topSensitivityArea !== undefined) {
        topSensitivityArea = result.topSensitivityArea;
      }
      if (result.returnDelay !== undefined) {
        returnDelay = result.returnDelay;
      }
      // Automatically enter fullscreen if enabled
      if (autoFullscreenEnabled && !isFullscreen) {
        enterFullscreen();
      }
    }
  );

  // Listen for mouse movements
  document.addEventListener("mousemove", handleMouseMove);

  // Listen for fullscreen state changes
  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
  document.addEventListener("mozfullscreenchange", handleFullscreenChange);
  document.addEventListener("MSFullscreenChange", handleFullscreenChange);

  // Periodically check fullscreen state every second
  setInterval(checkAutoFullscreen, 1000);
}

// Check and enforce fullscreen periodically
function checkAutoFullscreen() {
  // Only attempt fullscreen if allowed, not already fullscreen, and user is not near top
  // Also throttle reattempts if an error was recently encountered.
  if (
    autoFullscreenEnabled &&
    !isFullscreen &&
    !isMouseNearTop &&
    !fullscreenRetryTimeout
  ) {
    enterFullscreen();
  }
}

// Handle changes in fullscreen state
function handleFullscreenChange() {
  const wasFullscreen = isFullscreen;
  isFullscreen =
    !!document.fullscreenElement ||
    !!document.webkitFullscreenElement ||
    !!document.mozFullScreenElement ||
    !!document.msFullscreenElement;
  console.log("Fullscreen changed:", isFullscreen);

  // When fullscreen is exited and auto mode is enabled, re-enter after delay
  if (wasFullscreen && !isFullscreen && autoFullscreenEnabled) {
    if (returnTimeoutId) {
      clearTimeout(returnTimeoutId);
    }
    returnTimeoutId = setTimeout(() => {
      if (!isMouseNearTop && autoFullscreenEnabled) {
        enterFullscreen();
      }
    }, returnDelay);
  }
}

// Mouse movement handler to detect if near top of screen
function handleMouseMove(e) {
  // If mouse is in the sensitive top area, exit fullscreen
  if (e.clientY < topSensitivityArea) {
    if (!isMouseNearTop && isFullscreen) {
      isMouseNearTop = true;
      exitFullscreen();
    }
  } else {
    if (isMouseNearTop) {
      isMouseNearTop = false;
    }
  }
}

// Enter fullscreen mode with throttling if an error occurs
function enterFullscreen() {
  if (!isFullscreen && autoFullscreenEnabled) {
    console.log("Entering fullscreen");
    const docElm = document.documentElement;
    let promise = null;
    if (docElm.requestFullscreen) {
      promise = docElm.requestFullscreen();
    } else if (docElm.mozRequestFullScreen) {
      promise = docElm.mozRequestFullScreen();
    } else if (docElm.webkitRequestFullscreen) {
      promise = docElm.webkitRequestFullscreen();
    } else if (docElm.msRequestFullscreen) {
      promise = docElm.msRequestFullscreen();
    }
    if (promise) {
      promise.catch((e) => {
        console.error("Fullscreen error:", e);
        // Throttle further fullscreen attempts for 10 seconds
        fullscreenRetryTimeout = setTimeout(() => {
          fullscreenRetryTimeout = null;
        }, 10000);
      });
    }
  }
}

// Exit fullscreen mode
function exitFullscreen() {
  if (isFullscreen) {
    console.log("Exiting fullscreen");
    if (document.exitFullscreen) {
      document
        .exitFullscreen()
        .catch((e) => console.error("Exit fullscreen error:", e));
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}

// Listen for messages from background or popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "checkAlive") {
    sendResponse({ status: "alive" });
  } else if (request.action === "toggle") {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
    setTimeout(() => {
      sendResponse({ status: "toggled", isFullscreen: isFullscreen });
    }, 100);
  } else if (request.action === "updateSettings") {
    console.log("Updating settings:", request);
    autoFullscreenEnabled = request.autoFullscreenEnabled;
    topSensitivityArea = request.topSensitivityArea;
    returnDelay = request.returnDelay;
    if (!autoFullscreenEnabled) {
      if (returnTimeoutId) {
        clearTimeout(returnTimeoutId);
        returnTimeoutId = null;
      }
    } else if (!isFullscreen) {
      enterFullscreen();
    }
    sendResponse({ status: "settings updated" });
  }
  return true; // Support async responses
});

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
