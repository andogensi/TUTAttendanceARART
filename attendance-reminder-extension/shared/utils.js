// グローバルスコープの定数を使用（constants.jsがすでに読み込まれている前提）

/**
 * 今日の日付キーを取得（YYYY-MM-DD形式）
 * @returns {string} 日付キー
 */
function getDateKey() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

/**
 * 現在の曜日キーを取得
 * @returns {string|null} 曜日キー（'mon', 'tue'など）、土日の場合はnull
 */
function getDayOfWeekKey() {
    const dayOfWeek = new Date().getDay();

    // 土日の場合はnull
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return null;
    }

    return DAY_MAP[dayOfWeek];
}

/**
 * 設定値に基づいて授業時間範囲を生成
 * @param {number} minutesBefore - 開始前の分数
 * @param {number} minutesAfter - 終了後の分数
 * @returns {Array} 授業時間範囲の配列
 */
function generateClassPeriods(minutesBefore, minutesAfter) {
    return CLASS_START_TIMES.map(classTime => {
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
 * @param {number} minutesBefore - 開始前の分数
 * @param {number} minutesAfter - 終了後の分数
 * @param {Object} classSchedule - 授業スケジュール設定
 * @returns {Object|null} 現在の授業時限オブジェクト、該当なしの場合はnull
 */
function getCurrentClassPeriod(minutesBefore, minutesAfter, classSchedule) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const dayKey = getDayOfWeekKey();

    // 土日または設定がない場合はnullを返す
    if (!dayKey || !classSchedule || !classSchedule[dayKey]) {
        return null;
    }

    const classPeriods = generateClassPeriods(minutesBefore, minutesAfter);

    for (const period of classPeriods) {
        const startTime = period.startHour * 60 + period.startMinute;
        const endTime = period.endHour * 60 + period.endMinute;

        if (currentTime >= startTime && currentTime <= endTime) {
            // この時限がスケジュールにチェックされているかを確認
            const periodIndex = period.period - 1; // 0-indexed
            if (classSchedule[dayKey][periodIndex]) {
                return period;
            } else {
                return null; // 時限はあるがスケジュールで無効化されている
            }
        }
    }

    return null;
}

/**
 * 指定された時限情報を取得
 * @param {number} periodNumber - 時限番号（1-5）
 * @returns {Object|null} 時限オブジェクト
 */
function getClassTimeByPeriod(periodNumber) {
    return CLASS_START_TIMES.find(p => p.period === periodNumber) || null;
}
