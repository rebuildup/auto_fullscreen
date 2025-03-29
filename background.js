// Service Worker登録用のシンプルな実装
// バックグラウンドで動作する最低限の機能だけを含める

// 拡張機能がインストールされたときの初期設定
chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.sync.set({
    autoFullscreenEnabled: true,
    topSensitivityArea: 20,
    returnDelay: 1000,
  });
});

// タブが更新されたときの処理
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === "complete") {
    // コンテンツスクリプトが準備できたかチェック
    setTimeout(() => {
      try {
        chrome.tabs.sendMessage(tabId, { action: "checkAlive" });
      } catch (error) {
        // エラー処理は無視
      }
    }, 1000);
  }
});

// メッセージハンドラを追加
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 将来の拡張のためのプレースホルダー
  return false; // 同期レスポンス
});
