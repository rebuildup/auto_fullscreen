// Global variables
let isFullscreen = false;
let isMouseNearTop = false;
let autoFullscreenEnabled = true;
let autoReturnEnabled = true;
let topSensitivityArea = 20;
let returnDelay = 1000;
let isInitialized = false;
let returnTimeoutId = null;
let lastUserGesture = 0;
let debugMode = false; // デバッグログを無効化

// Initialization function
function initialize() {
  if (isInitialized) return;
  isInitialized = true;

  // Load settings from storage
  chrome.storage.sync.get(
    [
      "autoFullscreenEnabled",
      "topSensitivityArea",
      "returnDelay",
      "autoReturnEnabled",
    ],
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
      if (result.autoReturnEnabled !== undefined) {
        autoReturnEnabled = result.autoReturnEnabled;
      }
    }
  );

  // Listen for mouse movements
  document.addEventListener("mousemove", handleMouseMove);

  // ユーザージェスチャーを検出
  document.addEventListener("click", recordUserGesture);
  document.addEventListener("keydown", recordUserGesture);

  // Listen for fullscreen state changes
  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
  document.addEventListener("mozfullscreenchange", handleFullscreenChange);
  document.addEventListener("MSFullscreenChange", handleFullscreenChange);
}

// ユーザージェスチャーを記録
function recordUserGesture() {
  lastUserGesture = Date.now();

  // ユーザージェスチャー後すぐにフルスクリーンを試みる（クリック時のみ）
  if (autoFullscreenEnabled && !isFullscreen && !isMouseNearTop) {
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

  // 自動復帰は無効化 - ユーザーのクリックに依存するようにする
  if (
    wasFullscreen &&
    !isFullscreen &&
    autoFullscreenEnabled &&
    autoReturnEnabled
  ) {
    if (returnTimeoutId) {
      clearTimeout(returnTimeoutId);
    }
    // 自動復帰は行わない - ユーザーが画面をクリックするのを待つ
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
      lastUserGesture = Date.now();
    }
  }
}

// Enter fullscreen mode
function enterFullscreen() {
  if (!isFullscreen && autoFullscreenEnabled) {
    const docElm = document.documentElement;

    try {
      if (docElm.requestFullscreen) {
        docElm.requestFullscreen().catch(() => {
          // エラーが発生しても何もしない（エラーログを表示しない）
        });
      } else if (docElm.mozRequestFullScreen) {
        docElm.mozRequestFullScreen();
      } else if (docElm.webkitRequestFullscreen) {
        docElm.webkitRequestFullscreen();
      } else if (docElm.msRequestFullscreen) {
        docElm.msRequestFullscreen();
      }
    } catch (e) {
      // エラーを抑制
    }
  }
}

// Exit fullscreen mode
function exitFullscreen() {
  if (isFullscreen) {
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {
          // エラーが発生しても何もしない
        });
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    } catch (e) {
      // エラーを抑制
    }
  }
}

// Listen for messages from background or popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "checkAlive") {
    sendResponse({ status: "alive" });
  } else if (request.action === "toggle") {
    lastUserGesture = Date.now();

    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }

    setTimeout(() => {
      sendResponse({ status: "toggled", isFullscreen: isFullscreen });
    }, 100);
  } else if (request.action === "enterFullscreen") {
    lastUserGesture = Date.now();
    enterFullscreen();
    sendResponse({ status: "entering fullscreen" });
  } else if (request.action === "updateSettings") {
    autoFullscreenEnabled = request.autoFullscreenEnabled;
    topSensitivityArea = request.topSensitivityArea;
    returnDelay = request.returnDelay;

    if (request.autoReturnEnabled !== undefined) {
      autoReturnEnabled = request.autoReturnEnabled;
    }

    if (!autoFullscreenEnabled) {
      if (returnTimeoutId) {
        clearTimeout(returnTimeoutId);
        returnTimeoutId = null;
      }
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
