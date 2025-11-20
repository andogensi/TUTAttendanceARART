// DOM要素の取得
const beforeSlider = document.getElementById('before-slider');
const beforeNumber = document.getElementById('before-number');
const afterSlider = document.getElementById('after-slider');
const afterNumber = document.getElementById('after-number');
const saveBtn = document.getElementById('save-btn');
const message = document.getElementById('message');

// デフォルト値
const DEFAULT_MINUTES_BEFORE = 10;
const DEFAULT_MINUTES_AFTER = 20;

/**
 * メッセージを表示する
 */
function showMessage(text, type = 'success') {
    message.textContent = text;
    message.className = `message ${type} show`;

    // 3秒後に非表示
    setTimeout(() => {
        message.classList.remove('show');
    }, 3000);
}

/**
 * 保存された設定を読み込む
 */
function loadSettings() {
    chrome.storage.sync.get({
        minutesBefore: DEFAULT_MINUTES_BEFORE,
        minutesAfter: DEFAULT_MINUTES_AFTER,
        showMypageLink: false,
        showPopupOnNewTab: false
    }, (items) => {
        beforeSlider.value = items.minutesBefore;
        beforeNumber.value = items.minutesBefore;
        afterSlider.value = items.minutesAfter;
        afterNumber.value = items.minutesAfter;
        document.getElementById('mypage-link-toggle').checked = items.showMypageLink;
        document.getElementById('new-tab-popup-toggle').checked = items.showPopupOnNewTab;
    });
}

/**
 * 設定を保存する
 */
function saveSettings() {
    const minutesBefore = parseInt(beforeNumber.value, 10);
    const minutesAfter = parseInt(afterNumber.value, 10);
    const showMypageLink = document.getElementById('mypage-link-toggle').checked;
    const showPopupOnNewTab = document.getElementById('new-tab-popup-toggle').checked;

    // バリデーション
    if (isNaN(minutesBefore) || minutesBefore < 0 || minutesBefore > 60) {
        showMessage('開始前は0〜60分の範囲で入力してください', 'error');
        return;
    }

    if (isNaN(minutesAfter) || minutesAfter < 0 || minutesAfter > 60) {
        showMessage('終了後は0〜60分の範囲で入力してください', 'error');
        return;
    }

    // Chrome Storageに保存
    chrome.storage.sync.set({
        minutesBefore: minutesBefore,
        minutesAfter: minutesAfter,
        showMypageLink: showMypageLink,
        showPopupOnNewTab: showPopupOnNewTab
    }, () => {
        showMessage('設定を保存しました！', 'success');
    });
}

/**
 * スライダーと数値入力を同期
 */
function syncInputs(slider, numberInput) {
    slider.addEventListener('input', () => {
        numberInput.value = slider.value;
    });

    numberInput.addEventListener('input', () => {
        const value = parseInt(numberInput.value, 10);
        if (!isNaN(value) && value >= 0 && value <= 60) {
            slider.value = value;
        }
    });
}

// 初期化
loadSettings();
syncInputs(beforeSlider, beforeNumber);
syncInputs(afterSlider, afterNumber);

// 保存ボタンのイベントリスナー
saveBtn.addEventListener('click', saveSettings);
