// グローバルスコープの関数を使用（shared/constants.js, utils.js, storage.jsがすでに読み込まれている前提）

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
