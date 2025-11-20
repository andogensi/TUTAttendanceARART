// 新しいタブが作成されたときのイベントリスナー
chrome.tabs.onCreated.addListener((tab) => {
    // 設定を読み込む
    chrome.storage.sync.get({ showPopupOnNewTab: false }, (items) => {
        // 設定がオンの場合のみポップアップを表示
        if (items.showPopupOnNewTab) {
            // 新しいタブが完全に読み込まれるまで少し待つ
            setTimeout(() => {
                // ポップアップを開く
                chrome.action.openPopup().catch((error) => {
                    // エラーが発生した場合（例：ユーザーが既に別のタブに移動した場合）
                    // エラーを無視する（静かに失敗する）
                    console.log('ポップアップを開けませんでした:', error);
                });
            }, 100);
        }
    });
});
