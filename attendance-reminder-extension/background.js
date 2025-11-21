import { DEFAULT_MINUTES_BEFORE, DEFAULT_MINUTES_AFTER, DEFAULT_CLASS_SCHEDULE, CLASS_START_TIMES, DAY_MAP } from './shared/constants.js';
import { getCurrentClassPeriod } from './shared/utils.js';
import { getSettings, isAttendanceCompleted } from './shared/storage.js';

chrome.tabs.onCreated.addListener(async (tab) => {
    try {
        const settings = await getSettings({
            showPopupOnNewTab: false,
            minutesBefore: DEFAULT_MINUTES_BEFORE,
            minutesAfter: DEFAULT_MINUTES_AFTER,
            classSchedule: DEFAULT_CLASS_SCHEDULE
        });
        if (!settings.showPopupOnNewTab) {
            return;
        }
        if (tab.url && tab.url !== 'chrome://newtab/' && !tab.pendingUrl) {
            return;
        }
        const period = getCurrentClassPeriod(
            settings.minutesBefore,
            settings.minutesAfter,
            settings.classSchedule
        );

        if (period) {
            const isCompleted = await isAttendanceCompleted(period.period);

            if (!isCompleted) {
                const reminderUrl = chrome.runtime.getURL(`reminder.html?period=${period.period}`);

                setTimeout(() => {
                    chrome.tabs.get(tab.id, (currentTab) => {
                        if (chrome.runtime.lastError) {
                            return;
                        }

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
        }
    } catch (error) {
        console.log('Error in tab creation handler:', error);
    }
});

async function setupAlarms() {
    try {
        const settings = await getSettings({
            notificationEnabled: true,
            minutesBefore: DEFAULT_MINUTES_BEFORE,
            classSchedule: DEFAULT_CLASS_SCHEDULE
        });

        if (!settings.notificationEnabled) {
            await chrome.alarms.clearAll();
            console.log('通知が無効のため、すべてのアラームをクリアしました');
            return;
        }

        await chrome.alarms.clearAll();

        for (const classTime of CLASS_START_TIMES) {
            for (let dayIndex = 1; dayIndex <= 5; dayIndex++) {
                const dayKey = DAY_MAP[dayIndex];
                const periodIndex = classTime.period - 1;


                if (settings.classSchedule[dayKey] && settings.classSchedule[dayKey][periodIndex]) {

                    const alarmName = `period-${classTime.period}-${dayKey}`;


                    const notificationTime = new Date();
                    notificationTime.setHours(classTime.hour, classTime.minute - settings.minutesBefore, 0, 0);

                    const now = new Date();
                    let delay = notificationTime.getTime() - now.getTime();


                    if (delay < 0) {
                        const currentDay = now.getDay();
                        let daysUntilTarget = dayIndex - currentDay;
                        if (daysUntilTarget <= 0) {
                            daysUntilTarget += 7;
                        }
                        notificationTime.setDate(notificationTime.getDate() + daysUntilTarget);
                        delay = notificationTime.getTime() - now.getTime();
                    } else {

                        const currentDay = now.getDay();
                        if (currentDay !== dayIndex) {
                            let daysUntilTarget = dayIndex - currentDay;
                            if (daysUntilTarget < 0) {
                                daysUntilTarget += 7;
                            }
                            notificationTime.setDate(notificationTime.getDate() + daysUntilTarget);
                            delay = notificationTime.getTime() - now.getTime();
                        }
                    }


                    await chrome.alarms.create(alarmName, {
                        when: Date.now() + delay,
                        periodInMinutes: 7 * 24 * 60 // 1週間ごと
                    });

                    console.log(`アラーム設定: ${alarmName} - ${notificationTime.toLocaleString('ja-JP')}`);
                }
            }
        }

        console.log('すべてのアラームを設定しました');
    } catch (error) {
        console.error('アラーム設定エラー:', error);
    }
}


chrome.alarms.onAlarm.addListener(async (alarm) => {
    try {
        console.log('アラーム発火:', alarm.name);

        const match = alarm.name.match(/^period-(\d+)-(\w+)$/);
        if (!match) {
            console.log('無効なアラーム名:', alarm.name);
            return;
        }

        const period = parseInt(match[1], 10);
        const dayKey = match[2];

        const now = new Date();
        const currentDayKey = DAY_MAP[now.getDay()];
        if (currentDayKey !== dayKey) {
            console.log(`曜日が一致しません: ${currentDayKey} !== ${dayKey}`);
            return;
        }

        const isCompleted = await isAttendanceCompleted(period);
        if (isCompleted) {
            console.log(`${period}限は出席登録済みです`);
            return;
        }

        const settings = await getSettings({
            notificationEnabled: true
        });

        if (!settings.notificationEnabled) {
            console.log('通知が無効化されています');
            return;
        }


        const classTime = CLASS_START_TIMES.find(c => c.period === period);
        if (classTime) {
            await chrome.notifications.create(`attendance-${period}`, {
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: '📚 出席登録のお知らせ',
                message: `${classTime.label}（${classTime.hour}:${String(classTime.minute).padStart(2, '0')}）の出席登録を忘れずに！`,
                priority: 2,
                requireInteraction: true
            });

            console.log(`通知を表示しました: ${classTime.label}`);
        }
    } catch (error) {
        console.error('アラーム処理エラー:', error);
    }
});


chrome.notifications.onClicked.addListener(async (notificationId) => {
    try {

        const match = notificationId.match(/^attendance-(\d+)$/);
        if (match) {
            const period = parseInt(match[1], 10);


            await chrome.tabs.create({
                url: 'https://service.cloud.teu.ac.jp/portal/home/'
            });


            await chrome.notifications.clear(notificationId);
        }
    } catch (error) {
        console.error('通知クリック処理エラー:', error);
    }
});

chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('拡張機能がインストール/更新されました:', details.reason);
    await setupAlarms();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SETTINGS_CHANGED') {
        console.log('設定が変更されたため、アラームを再設定します');
        setupAlarms().then(() => {
            sendResponse({ success: true });
        }).catch((error) => {
            console.error('アラーム再設定エラー:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }
});

setupAlarms();
