// デフォルト設定値
const DEFAULT_MINUTES_BEFORE = 10;
const DEFAULT_MINUTES_AFTER = 20;

// 授業の実際の開始時刻（固定）
const CLASS_START_TIMES = [
    { period: 1, hour: 8, minute: 50, label: '1限' },
    { period: 2, hour: 10, minute: 45, label: '2限' },
    { period: 3, hour: 13, minute: 15, label: '3限' },
    { period: 4, hour: 15, minute: 10, label: '4限' },
    { period: 5, hour: 22, minute: 13, label: '5限' }
];

// 動的に生成される授業時間範囲（設定値に基づく）
let CLASS_PERIODS = [];

// セッション内で閉じたバナーを記録
let dismissedBanners = new Set();

// 現在表示中のバナーID
let currentBannerId = null;

/**
 * 設定値に基づいてCLASS_PERIODSを生成
 */
function generateClassPeriods(minutesBefore, minutesAfter) {
    CLASS_PERIODS = CLASS_START_TIMES.map(classTime => {
        // 開始時刻をミリ秒に変換
        const startDate = new Date();
        startDate.setHours(classTime.hour, classTime.minute, 0, 0);

        // 開始前の時刻を計算
        const beforeDate = new Date(startDate.getTime() - minutesBefore * 60000);

        // 終了後の時刻を計算
        const afterDate = new Date(startDate.getTime() + minutesAfter * 60000);

        return {
            period: classTime.period,
            label: classTime.label,
            startHour: beforeDate.getHours(),
            startMinute: beforeDate.getMinutes(),
            endHour: afterDate.getHours(),
            endMinute: afterDate.getMinutes()
        };
    });
}

/**
 * 現在の時刻が指定された授業時間内かチェック
 */
function getCurrentClassPeriod() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    for (const period of CLASS_PERIODS) {
        const startTime = period.startHour * 60 + period.startMinute;
        const endTime = period.endHour * 60 + period.endMinute;

        if (currentTime >= startTime && currentTime <= endTime) {
            return period;
        }
    }

    return null;
}

/**
 * 出席登録済みかチェック
 */
function isAttendanceCompleted(periodNumber, callback) {
    // 今日の日付を取得 (YYYY-MM-DD形式)
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Chrome Storageから現在のデータを取得
    try {
        chrome.storage.local.get({ attendanceCompleted: {} }, (result) => {
            if (chrome.runtime.lastError) {
                console.log('Extension context invalidated, skipping attendance check');
                callback(false);
                return;
            }

            const data = result.attendanceCompleted;
            const isCompleted = data[dateKey] && data[dateKey].includes(periodNumber);
            callback(isCompleted);
        });
    } catch (error) {
        console.log('Extension context invalidated:', error);
        callback(false);
    }
}

/**
 * 出席登録データを保存
 */
function saveAttendanceRecord(periodNumber) {
    // 今日の日付を取得 (YYYY-MM-DD形式)
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Chrome Storageから現在のデータを取得
    try {
        chrome.storage.local.get({ attendanceCompleted: {} }, (result) => {
            if (chrome.runtime.lastError) {
                console.log('Extension context invalidated, skipping save');
                return;
            }

            const data = result.attendanceCompleted;

            // 古いデータを削除（今日より前の日付）
            for (const date in data) {
                if (date < dateKey) {
                    delete data[date];
                }
            }

            // 今日のデータを初期化（存在しない場合）
            if (!data[dateKey]) {
                data[dateKey] = [];
            }

            // 時限を追加（重複チェック）
            if (!data[dateKey].includes(periodNumber)) {
                data[dateKey].push(periodNumber);
            }

            // データを保存
            chrome.storage.local.set({ attendanceCompleted: data }, () => {
                if (chrome.runtime.lastError) {
                    console.log('Extension context invalidated, could not save');
                    return;
                }
                console.log(`出席登録を保存しました: ${dateKey} ${periodNumber}限`);
            });
        });
    } catch (error) {
        console.log('Extension context invalidated:', error);
    }
}

/**
 * バナーを作成して表示
 */
function showBanner(period) {
    const bannerId = `attendance-banner-${period.period}`;

    // すでに閉じたバナーは再表示しない
    if (dismissedBanners.has(bannerId)) {
        return;
    }

    // すでに同じバナーが表示されている場合は何もしない
    if (currentBannerId === bannerId) {
        return;
    }

    // 既存のバナーを削除
    removeBanner();

    // showMypageLink設定を取得してバナーを作成
    try {
        chrome.storage.sync.get({ showMypageLink: false }, (items) => {
            if (chrome.runtime.lastError) {
                console.log('Extension context invalidated, skipping banner');
                return;
            }

            const showMypageLink = items.showMypageLink;

            const mypageButtonHtml = showMypageLink
                ? '<a href="https://service.cloud.teu.ac.jp/portal/mypage/" class="banner-mypage">📝 マイページへ</a>'
                : '';

            const banner = document.createElement('div');
            banner.id = bannerId;
            banner.className = 'attendance-reminder-banner';
            banner.innerHTML = `
        <div class="banner-content">
          <span class="banner-icon">⏰</span>
          <span class="banner-text">
            <strong>${period.label}の授業が始まります！</strong>
            <br>
            出席登録を忘れずに行ってください
          </span>
          <div class="banner-buttons">
            ${mypageButtonHtml}
            <button class="banner-register" aria-label="出席登録しました">✓ 出席登録しました</button>
            <button class="banner-close" aria-label="閉じる">✕</button>
          </div>
        </div>
      `;

            const registerButton = banner.querySelector('.banner-register');
            registerButton.addEventListener('click', () => {
                saveAttendanceRecord(period.period);
                dismissedBanners.add(bannerId);
                removeBanner();
            });

            const closeButton = banner.querySelector('.banner-close');
            closeButton.addEventListener('click', () => {
                dismissedBanners.add(bannerId);
                removeBanner();
            });

            document.body.insertBefore(banner, document.body.firstChild);
            currentBannerId = bannerId;

            setTimeout(() => {
                banner.classList.add('show');
            }, 100);
        });
    } catch (error) {
        console.log('Extension context invalidated:', error);
    }
}

/**
 * バナーを削除
 */
function removeBanner() {
    if (currentBannerId) {
        const existingBanner = document.getElementById(currentBannerId);
        if (existingBanner) {
            existingBanner.classList.remove('show');
            setTimeout(() => {
                existingBanner.remove();
            }, 300);
        }
        currentBannerId = null;
    }
}

/**
 * 時刻チェックとバナー表示制御
 */
function checkAndShowBanner() {
    const period = getCurrentClassPeriod();

    if (period) {
        isAttendanceCompleted(period.period, (isCompleted) => {
            if (!isCompleted) {
                showBanner(period);
            } else {
                removeBanner();
            }
        });
    } else {
        removeBanner();
    }
}

/**
 * 初期化処理
 */
function initialize() {
    try {
        chrome.storage.sync.get({
            minutesBefore: DEFAULT_MINUTES_BEFORE,
            minutesAfter: DEFAULT_MINUTES_AFTER
        }, (items) => {
            if (chrome.runtime.lastError) {
                console.log('Extension context invalidated, skipping initialization');
                return;
            }

            generateClassPeriods(items.minutesBefore, items.minutesAfter);
            checkAndShowBanner();
            setInterval(checkAndShowBanner, 60000);
        });
    } catch (error) {
        console.log('Extension context invalidated:', error);
    }
}

// 設定変更を監視
try {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && (changes.minutesBefore || changes.minutesAfter)) {
            try {
                chrome.storage.sync.get({
                    minutesBefore: DEFAULT_MINUTES_BEFORE,
                    minutesAfter: DEFAULT_MINUTES_AFTER
                }, (items) => {
                    if (chrome.runtime.lastError) {
                        console.log('Extension context invalidated, skipping settings update');
                        return;
                    }

                    generateClassPeriods(items.minutesBefore, items.minutesAfter);
                    dismissedBanners.clear();
                    removeBanner();
                    checkAndShowBanner();
                });
            } catch (error) {
                console.log('Extension context invalidated:', error);
            }
        }
    });
} catch (error) {
    console.log('Extension context invalidated, could not add listener:', error);
}

// 初期化開始
initialize();
