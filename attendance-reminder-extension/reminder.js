// グローバルスコープの関数を使用（shared/constants.js, utils.js, storage.jsがすでに読み込まれている前提）

// リマインダーページの背景色を適用
async function applyReminderBackground() {
    try {
        const defaults = {
            [STORAGE_KEYS.REMINDER_BG_MODE]: DEFAULT_REMINDER_BG_MODE,
            [STORAGE_KEYS.REMINDER_BG_COLOR]: DEFAULT_REMINDER_BG_COLOR,
            [STORAGE_KEYS.REMINDER_BG_COLORS]: DEFAULT_REMINDER_BG_COLORS
        };
        const settings = await getSettings(defaults);
        const mode = settings[STORAGE_KEYS.REMINDER_BG_MODE];
        const color = settings[STORAGE_KEYS.REMINDER_BG_COLOR];
        const colors = settings[STORAGE_KEYS.REMINDER_BG_COLORS];

        if (mode === 'static') {
            document.body.style.background = color;
        } else {
            if (colors && colors.length >= 2) {
                const stops = colors.map((c, i) => {
                    const pct = Math.round((i / (colors.length - 1)) * 100);
                    return `${c} ${pct}%`;
                }).join(', ');
                document.body.style.background = `linear-gradient(135deg, ${stops})`;
            } else if (colors && colors.length === 1) {
                document.body.style.background = colors[0];
            }
        }
        document.body.style.minHeight = '100vh';
    } catch (error) {
        console.log('背景色の適用に失敗:', error);
    }
}

applyReminderBackground();

function getPeriodFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const periodNum = parseInt(params.get('period'), 10);
    return getClassTimeByPeriod(periodNum);
}

const period = getPeriodFromUrl();
if (period) {
    document.getElementById('period-label').textContent = `${period.label}の授業時間です`;
}
document.getElementById('open-mypage').addEventListener('click', () => {
    window.location.href = 'https://service.cloud.teu.ac.jp/portal/mypage/';
});


document.getElementById('mark-completed').addEventListener('click', async () => {
    if (!period) return;

    try {
        await saveAttendanceRecord(period.period);
        alert('出席登録を記録しました！');
        window.close();
    } catch (error) {
        console.log('Error saving attendance:', error);
        alert('出席登録の記録に失敗しました。');
    }
});
