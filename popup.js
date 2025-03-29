// ポップアップが開かれたときに現在の設定を読み込む
document.addEventListener("DOMContentLoaded", function () {
  const autoFullscreenCheckbox = document.getElementById("autoFullscreen");
  const topSensitivitySlider = document.getElementById("topSensitivity");
  const topSensitivityValue = document.getElementById("topSensitivityValue");
  const returnDelaySlider = document.getElementById("returnDelay");
  const returnDelayValue = document.getElementById("returnDelayValue");
  const toggleButton = document.getElementById("toggleFullscreen");

  // 保存された設定を読み込む
  chrome.storage.sync.get(
    ["autoFullscreenEnabled", "topSensitivityArea", "returnDelay"],
    function (result) {
      if (result.autoFullscreenEnabled !== undefined) {
        autoFullscreenCheckbox.checked = result.autoFullscreenEnabled;
      } else {
        // デフォルト値を設定（初回起動時）
        autoFullscreenCheckbox.checked = true;
        chrome.storage.sync.set({ autoFullscreenEnabled: true });
      }

      if (result.topSensitivityArea !== undefined) {
        topSensitivitySlider.value = result.topSensitivityArea;
        topSensitivityValue.textContent = result.topSensitivityArea;
      } else {
        // デフォルト値を設定
        chrome.storage.sync.set({ topSensitivityArea: 20 });
      }

      if (result.returnDelay !== undefined) {
        returnDelaySlider.value = result.returnDelay;
        returnDelayValue.textContent = result.returnDelay;
      } else {
        // デフォルト値を設定
        chrome.storage.sync.set({ returnDelay: 1000 });
      }
    }
  );

  // 自動全画面表示の設定変更
  autoFullscreenCheckbox.addEventListener("change", function () {
    const isEnabled = autoFullscreenCheckbox.checked;
    chrome.storage.sync.set({ autoFullscreenEnabled: isEnabled });

    // アクティブなタブに設定変更を通知
    updateSettingsInActiveTab();
  });

  // 上部感度設定の変更
  topSensitivitySlider.addEventListener("input", function () {
    topSensitivityValue.textContent = topSensitivitySlider.value;
  });

  topSensitivitySlider.addEventListener("change", function () {
    const sensitivity = parseInt(topSensitivitySlider.value);
    chrome.storage.sync.set({ topSensitivityArea: sensitivity });

    // アクティブなタブに設定変更を通知
    updateSettingsInActiveTab();
  });

  // 復帰時間設定の変更
  returnDelaySlider.addEventListener("input", function () {
    returnDelayValue.textContent = returnDelaySlider.value;
  });

  returnDelaySlider.addEventListener("change", function () {
    const delay = parseInt(returnDelaySlider.value);
    chrome.storage.sync.set({ returnDelay: delay });

    // アクティブなタブに設定変更を通知
    updateSettingsInActiveTab();
  });

  // 全画面表示の切り替えボタン
  toggleButton.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length > 0 && tabs[0].id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "toggle" },
          function (response) {
            if (chrome.runtime.lastError) {
              console.log("Error: ", chrome.runtime.lastError.message);
            }
          }
        );
      }
    });
  });

  // アクティブなタブに設定変更を通知する関数
  function updateSettingsInActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length > 0 && tabs[0].id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          {
            action: "updateSettings",
            autoFullscreenEnabled: autoFullscreenCheckbox.checked,
            topSensitivityArea: parseInt(topSensitivitySlider.value),
            returnDelay: parseInt(returnDelaySlider.value),
          },
          function (response) {
            if (chrome.runtime.lastError) {
              console.log("Error: ", chrome.runtime.lastError.message);
            }
          }
        );
      }
    });
  }
});
