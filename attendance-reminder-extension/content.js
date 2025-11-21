// グローバルスコープで定義（importを削除）

let CLASS_PERIODS = [];
let dismissedBanners = new Set();
let currentBannerId = null;


async function showBanner(period) {
    const bannerId = `attendance-banner-${period.period}`;

    // 既に非表示にされている場合はスキップ
    if (dismissedBanners.has(bannerId)) {
        return;
    }

    if (currentBannerId === bannerId) {
        return;
    }
    removeBanner();

    try {
        const settings = await getSettings({ showMypageLink: false });
        const showMypageLink = settings.showMypageLink;

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
        registerButton.addEventListener('click', async () => {
            await saveAttendanceRecord(period.period);
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
    } catch (error) {
        console.log('Extension context invalidated:', error);
    }
}


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

async function checkAndShowBanner() {
    try {
        const settings = await getSettings({
            classSchedule: DEFAULT_CLASS_SCHEDULE,
            minutesBefore: DEFAULT_MINUTES_BEFORE,
            minutesAfter: DEFAULT_MINUTES_AFTER
        });

        const period = getCurrentClassPeriod(
            settings.minutesBefore,
            settings.minutesAfter,
            settings.classSchedule
        );

        if (period) {
            const isCompleted = await isAttendanceCompleted(period.period);
            if (!isCompleted) {
                showBanner(period);
            } else {
                removeBanner();
            }
        } else {
            removeBanner();
        }
    } catch (error) {
        console.log('Extension context invalidated:', error);
    }
}


async function initialize() {
    try {
        const settings = await getSettings({
            minutesBefore: DEFAULT_MINUTES_BEFORE,
            minutesAfter: DEFAULT_MINUTES_AFTER
        });

        CLASS_PERIODS = generateClassPeriods(settings.minutesBefore, settings.minutesAfter);

        // 初回チェック
        await checkAndShowBanner();
        setInterval(checkAndShowBanner, 60000);
    } catch (error) {
        console.log('Extension context invalidated:', error);
    }
}


try {
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'sync' && (changes.minutesBefore || changes.minutesAfter)) {
            try {
                const settings = await getSettings({
                    minutesBefore: DEFAULT_MINUTES_BEFORE,
                    minutesAfter: DEFAULT_MINUTES_AFTER
                });

                CLASS_PERIODS = generateClassPeriods(settings.minutesBefore, settings.minutesAfter);
                dismissedBanners.clear();
                removeBanner();
                await checkAndShowBanner();
            } catch (error) {
                console.log('Extension context invalidated:', error);
            }
        }
    });
} catch (error) {
    console.log('Extension context invalidated, could not add listener:', error);
}

initialize();
