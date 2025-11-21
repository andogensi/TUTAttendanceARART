// グローバルスコープに関数を定義（constants.jsとutils.jsがすでに読み込まれている前提）

/**
 * 設定を取得（Promise版）
 * @param {Object} defaults - デフォルト値のオブジェクト
 * @returns {Promise<Object>} 設定オブジェクト
 */
function getSettings(defaults = {}) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.sync.get(defaults, (items) => {
                if (chrome.runtime.lastError) {
                    console.log('Extension context invalidated, using defaults');
                    resolve(defaults);
                } else {
                    resolve(items);
                }
            });
        } catch (error) {
            console.log('Extension context invalidated:', error);
            resolve(defaults);
        }
    });
}

/**
 * 設定を保存（Promise版）
 * @param {Object} data 
 * @returns {Promise<void>}
 */
function saveSettings(data) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.sync.set(data, () => {
                if (chrome.runtime.lastError) {
                    console.log('Extension context invalidated, could not save');
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        } catch (error) {
            console.log('Extension context invalidated:', error);
            reject(error);
        }
    });
}

/**
 * 
 * @param {number} periodNumber - 時限番号
 * @returns {Promise<boolean>} 登録済みか
 */
function isAttendanceCompleted(periodNumber) {
    return new Promise((resolve) => {
        const dateKey = getDateKey();

        try {
            chrome.storage.local.get({ [STORAGE_KEYS.ATTENDANCE_COMPLETED]: {} }, (result) => {
                if (chrome.runtime.lastError) {
                    console.log('Extension context invalidated, skipping attendance check');
                    resolve(false);
                    return;
                }

                const data = result[STORAGE_KEYS.ATTENDANCE_COMPLETED];
                const isCompleted = data[dateKey] && data[dateKey].includes(periodNumber);
                resolve(isCompleted);
            });
        } catch (error) {
            console.log('Extension context invalidated:', error);
            resolve(false);
        }
    });
}

/**
 * 出席登録を保存（Promise版）
 * @param {number} periodNumber 
 * @returns {Promise<void>}
 */
function saveAttendanceRecord(periodNumber) {
    return new Promise((resolve) => {
        const dateKey = getDateKey();

        try {
            chrome.storage.local.get({ [STORAGE_KEYS.ATTENDANCE_COMPLETED]: {} }, (result) => {
                if (chrome.runtime.lastError) {
                    console.log('Extension context invalidated, skipping save');
                    resolve();
                    return;
                }

                const data = result[STORAGE_KEYS.ATTENDANCE_COMPLETED];

                for (const date in data) {
                    if (date < dateKey) {
                        delete data[date];
                    }
                }

                if (!data[dateKey]) {
                    data[dateKey] = [];
                }
                if (!data[dateKey].includes(periodNumber)) {
                    data[dateKey].push(periodNumber);
                }

                chrome.storage.local.set({ [STORAGE_KEYS.ATTENDANCE_COMPLETED]: data }, () => {
                    if (chrome.runtime.lastError) {
                        console.log('Extension context invalidated, could not save');
                    } else {
                        console.log(`出席登録を保存しました: ${dateKey} ${periodNumber}限`);
                    }
                    resolve();
                });
            });
        } catch (error) {
            console.log('Extension context invalidated:', error);
            resolve();
        }
    });
}

/**
 * 古い出席記録をクリーンアップ
 * @returns {Promise<void>}
 */
function cleanOldAttendanceRecords() {
    return new Promise((resolve) => {
        const dateKey = getDateKey();

        try {
            chrome.storage.local.get({ [STORAGE_KEYS.ATTENDANCE_COMPLETED]: {} }, (result) => {
                if (chrome.runtime.lastError) {
                    resolve();
                    return;
                }

                const data = result[STORAGE_KEYS.ATTENDANCE_COMPLETED];
                let hasChanges = false;
                for (const date in data) {
                    if (date < dateKey) {
                        delete data[date];
                        hasChanges = true;
                    }
                }

                if (hasChanges) {
                    chrome.storage.local.set({ [STORAGE_KEYS.ATTENDANCE_COMPLETED]: data }, () => {
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        } catch (error) {
            console.log('Extension context invalidated:', error);
            resolve();
        }
    });
}

/**
 * 全設定のデフォルト値を取得
 * @returns {Object} 
 */
function getDefaultSettings_storage() {
    return {
        [STORAGE_KEYS.MINUTES_BEFORE]: DEFAULT_MINUTES_BEFORE,
        [STORAGE_KEYS.MINUTES_AFTER]: DEFAULT_MINUTES_AFTER,
        [STORAGE_KEYS.SHOW_MYPAGE_LINK]: false,
        [STORAGE_KEYS.SHOW_POPUP_ON_NEW_TAB]: false,
        [STORAGE_KEYS.AUTO_SAVE_ENABLED]: false,
        [STORAGE_KEYS.CLASS_SCHEDULE]: DEFAULT_CLASS_SCHEDULE,
        [STORAGE_KEYS.NOTIFICATION_ENABLED]: DEFAULT_NOTIFICATION_ENABLED
    };
}
