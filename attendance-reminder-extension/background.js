// デフォルト設定値
const DEFAULT_MINUTES_BEFORE = 10;
const DEFAULT_MINUTES_AFTER = 20;

// 授業の実際の開始時刻
const CLASS_START_TIMES = [
    { period: 1, hour: 8, minute: 50, label: '1限' },
    { period: 2, hour: 10, minute: 45, label: '2限' },
    { period: 3, hour: 13, minute: 15, label: '3限' },
    { period: 4, hour: 15, minute: 10, label: '4限' },
    { period: 5, hour: 22, minute: 35, label: '5限' }
];

// 現在の授業時間帯を取得
function getCurrentClassPeriod(minutesBefore, minutesAfter) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    for (const classTime of CLASS_START_TIMES) {
        const startDate = new Date();
        startDate.setHours(classTime.hour, classTime.minute, 0, 0);

        const beforeDate = new Date(startDate.getTime() - minutesBefore * 60000);
        const afterDate = new Date(startDate.getTime() + minutesAfter * 60000);

        const startTime = beforeDate.getHours() * 60 + beforeDate.getMinutes();
        const endTime = afterDate.getHours() * 60 + afterDate.getMinutes();

        if (currentTime >= startTime && currentTime <= endTime) {
            return classTime;
        }
    }

    return null;
}

// 出席登録済みかチェック
function isAttendanceCompleted(periodNumber, callback) {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    chrome.storage.local.get({ attendanceCompleted: {} }, (result) => {
        const data = result.attendanceCompleted;
        const isCompleted = data[dateKey] && data[dateKey].includes(periodNumber);
        callback(isCompleted);
    });
}

// 新しいタブが作成されたときのイベントリスナー
chrome.tabs.onCreated.addListener((tab) => {
    // 設定を読み込む
    chrome.storage.sync.get({
        showPopupOnNewTab: false,
        minutesBefore: DEFAULT_MINUTES_BEFORE,
        minutesAfter: DEFAULT_MINUTES_AFTER
    }, (items) => {
        // 設定がオフの場合は何もしない
        if (!items.showPopupOnNewTab) {
            return;
        }

        // タブのURLが既に設定されている場合（マイページへのナビゲーションなど）は何もしない
        // 空の新しいタブの場合のみリマインダーページを表示
        if (tab.url && tab.url !== 'chrome://newtab/' && !tab.pendingUrl) {
            return;
        }

        // 現在の授業時間帯を取得
        const period = getCurrentClassPeriod(items.minutesBefore, items.minutesAfter);

        if (period) {
            // 出席登録済みかチェック
            isAttendanceCompleted(period.period, (isCompleted) => {
                if (!isCompleted) {
                    // 未登録の場合のみリマインダーページを表示
                    const reminderUrl = chrome.runtime.getURL(`reminder.html?period=${period.period}`);
                    setTimeout(() => {
                        // タブが既に閉じられているか、別のURLに移動していないかチェック
                        chrome.tabs.get(tab.id, (currentTab) => {
                            if (chrome.runtime.lastError) {
                                // タブが既に閉じられている
                                return;
                            }
                            // タブが空の新しいタブのままの場合のみ更新
                            if (!currentTab.url || currentTab.url === 'chrome://newtab/') {
                                chrome.tabs.update(tab.id, {
                                    url: reminderUrl
                                }).catch((error) => {
                                    console.log('Could not update tab:', error);
                                });
                            }
                        });
                    }, 100);
                }
            });
        }
    });
});

