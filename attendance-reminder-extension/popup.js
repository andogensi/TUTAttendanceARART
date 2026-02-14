
function getDefaultSettings() {
    return {
        [STORAGE_KEYS.MINUTES_BEFORE]: DEFAULT_MINUTES_BEFORE,
        [STORAGE_KEYS.MINUTES_AFTER]: DEFAULT_MINUTES_AFTER,
        [STORAGE_KEYS.SHOW_MYPAGE_LINK]: true,
        [STORAGE_KEYS.SHOW_POPUP_ON_NEW_TAB]: true,
        [STORAGE_KEYS.AUTO_SAVE_ENABLED]: false,
        [STORAGE_KEYS.CLASS_SCHEDULE]: DEFAULT_CLASS_SCHEDULE,
        [STORAGE_KEYS.NOTIFICATION_ENABLED]: DEFAULT_NOTIFICATION_ENABLED,
        [STORAGE_KEYS.REMINDER_BG_MODE]: DEFAULT_REMINDER_BG_MODE,
        [STORAGE_KEYS.REMINDER_BG_COLOR]: DEFAULT_REMINDER_BG_COLOR,
        [STORAGE_KEYS.REMINDER_BG_COLORS]: DEFAULT_REMINDER_BG_COLORS,
        darkMode: false
    };
}

const beforeSlider = document.getElementById('before-slider');
const beforeNumber = document.getElementById('before-number');
const afterSlider = document.getElementById('after-slider');
const afterNumber = document.getElementById('after-number');
const saveBtn = document.getElementById('save-btn');
const message = document.getElementById('message');
const autoSaveToggle = document.getElementById('auto-save-toggle');
const notificationToggle = document.getElementById('notification-toggle');
const darkModeToggle = document.getElementById('dark-mode-toggle');

// リマインダー背景色関連
const bgModeStaticBtn = document.getElementById('bg-mode-static');
const bgModeGradientBtn = document.getElementById('bg-mode-gradient');
const bgStaticSettings = document.getElementById('bg-static-settings');
const bgGradientSettings = document.getElementById('bg-gradient-settings');
const bgStaticColor = document.getElementById('bg-static-color');
const bgStaticHex = document.getElementById('bg-static-hex');
const gradientColorsList = document.getElementById('gradient-colors-list');
const addGradientColorBtn = document.getElementById('add-gradient-color');
const bgPreview = document.getElementById('bg-preview');

let currentBgMode = DEFAULT_REMINDER_BG_MODE;
let gradientColors = [...DEFAULT_REMINDER_BG_COLORS];

let autoSaveTimeout = null;

function showMessage(text, type = 'success') {
    message.textContent = text;
    message.className = `message ${type} show`;

    setTimeout(() => {
        message.classList.remove('show');
    }, 3000);
}


function loadScheduleCalendar(schedule) {
    const checkboxes = document.querySelectorAll('.schedule-checkbox');
    checkboxes.forEach(checkbox => {
        const day = checkbox.getAttribute('data-day');
        const period = parseInt(checkbox.getAttribute('data-period'), 10) - 1; // 0-indexed
        const cell = checkbox.parentElement;
        if (schedule[day] && schedule[day][period] !== undefined) {
            checkbox.checked = schedule[day][period];
            cell.classList.toggle('checked', schedule[day][period]);
        }
    });
}

function initToggleCells() {
    const checkboxes = document.querySelectorAll('.schedule-checkbox');
    checkboxes.forEach(checkbox => {
        const cell = checkbox.parentElement;
        cell.classList.add('toggle-cell');
        if (checkbox.checked) {
            cell.classList.add('checked');
        }
        cell.addEventListener('click', () => {
            checkbox.checked = !checkbox.checked;
            cell.classList.toggle('checked', checkbox.checked);
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        });
    });
}

async function loadSettingsFromStorage() {
    const settings = await getSettings(getDefaultSettings());

    beforeSlider.value = settings[STORAGE_KEYS.MINUTES_BEFORE];
    beforeNumber.value = settings[STORAGE_KEYS.MINUTES_BEFORE];
    afterSlider.value = settings[STORAGE_KEYS.MINUTES_AFTER];
    afterNumber.value = settings[STORAGE_KEYS.MINUTES_AFTER];
    document.getElementById('mypage-link-toggle').checked = settings[STORAGE_KEYS.SHOW_MYPAGE_LINK];
    document.getElementById('new-tab-popup-toggle').checked = settings[STORAGE_KEYS.SHOW_POPUP_ON_NEW_TAB];
    autoSaveToggle.checked = settings[STORAGE_KEYS.AUTO_SAVE_ENABLED];
    notificationToggle.checked = settings[STORAGE_KEYS.NOTIFICATION_ENABLED];
    darkModeToggle.checked = settings.darkMode || false;

    // ダークモードを適用
    if (settings.darkMode) {
        document.body.classList.add('dark-mode');
    }

    loadScheduleCalendar(settings[STORAGE_KEYS.CLASS_SCHEDULE]);
    initToggleCells();

    // リマインダー背景色を読み込み
    currentBgMode = settings[STORAGE_KEYS.REMINDER_BG_MODE] || DEFAULT_REMINDER_BG_MODE;
    const savedColor = settings[STORAGE_KEYS.REMINDER_BG_COLOR] || DEFAULT_REMINDER_BG_COLOR;
    gradientColors = settings[STORAGE_KEYS.REMINDER_BG_COLORS] || [...DEFAULT_REMINDER_BG_COLORS];

    bgStaticColor.value = savedColor;
    bgStaticHex.textContent = savedColor;
    setBgMode(currentBgMode);

    updateSaveButtonVisibility(settings[STORAGE_KEYS.AUTO_SAVE_ENABLED]);
}


async function saveSettingsToStorage(showSuccessMessage = true) {
    const minutesBefore = parseInt(beforeNumber.value, 10);
    const minutesAfter = parseInt(afterNumber.value, 10);
    const showMypageLink = document.getElementById('mypage-link-toggle').checked;
    const showPopupOnNewTab = document.getElementById('new-tab-popup-toggle').checked;
    const autoSaveEnabled = autoSaveToggle.checked;
    const notificationEnabled = notificationToggle.checked;

    const classSchedule = {
        mon: [false, false, false, false, false],
        tue: [false, false, false, false, false],
        wed: [false, false, false, false, false],
        thu: [false, false, false, false, false],
        fri: [false, false, false, false, false]
    };

    const checkboxes = document.querySelectorAll('.schedule-checkbox');
    checkboxes.forEach(checkbox => {
        const day = checkbox.getAttribute('data-day');
        const period = parseInt(checkbox.getAttribute('data-period'), 10) - 1; // 0-indexed
        classSchedule[day][period] = checkbox.checked;
    });


    if (isNaN(minutesBefore) || minutesBefore < 0 || minutesBefore > 60) {
        showMessage('開始前は0〜60分の範囲で入力してください', 'error');
        return;
    }

    if (isNaN(minutesAfter) || minutesAfter < 0 || minutesAfter > 60) {
        showMessage('終了後は0〜60分の範囲で入力してください', 'error');
        return;
    }

    try {
        await saveSettings({
            [STORAGE_KEYS.MINUTES_BEFORE]: minutesBefore,
            [STORAGE_KEYS.MINUTES_AFTER]: minutesAfter,
            [STORAGE_KEYS.SHOW_MYPAGE_LINK]: showMypageLink,
            [STORAGE_KEYS.SHOW_POPUP_ON_NEW_TAB]: showPopupOnNewTab,
            [STORAGE_KEYS.AUTO_SAVE_ENABLED]: autoSaveEnabled,
            [STORAGE_KEYS.CLASS_SCHEDULE]: classSchedule,
            [STORAGE_KEYS.NOTIFICATION_ENABLED]: notificationEnabled,
            [STORAGE_KEYS.REMINDER_BG_MODE]: currentBgMode,
            [STORAGE_KEYS.REMINDER_BG_COLOR]: bgStaticColor.value,
            [STORAGE_KEYS.REMINDER_BG_COLORS]: gradientColors,
            darkMode: darkModeToggle.checked
        });

        chrome.runtime.sendMessage(
            { type: 'SETTINGS_CHANGED' },
            (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Background script への通知に失敗:', chrome.runtime.lastError);
                }
            }
        );

        if (showSuccessMessage) {
            showMessage('設定を保存しました！', 'success');
        }
    } catch (error) {
        showMessage('設定の保存に失敗しました', 'error');
    }
}

function performAutoSave() {
    if (!autoSaveToggle.checked) {
        return;
    }
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }

    autoSaveTimeout = setTimeout(() => {
        saveSettingsToStorage(false); // メッセージを表示しない
    }, 500);
}


function updateSaveButtonVisibility(autoSaveEnabled) {
    if (autoSaveEnabled) {
        saveBtn.style.display = 'none';
    } else {
        saveBtn.style.display = 'block';
    }
}

function syncInputs(slider, numberInput) {
    slider.addEventListener('input', () => {
        numberInput.value = slider.value;
        performAutoSave();
    });

    numberInput.addEventListener('input', () => {
        const value = parseInt(numberInput.value, 10);
        if (!isNaN(value) && value >= 0 && value <= 60) {
            slider.value = value;
        }
        performAutoSave();
    });
}

loadSettingsFromStorage();
syncInputs(beforeSlider, beforeNumber);
syncInputs(afterSlider, afterNumber);
saveBtn.addEventListener('click', () => saveSettingsToStorage(true));

autoSaveToggle.addEventListener('change', async () => {
    const enabled = autoSaveToggle.checked;
    updateSaveButtonVisibility(enabled);
    if (enabled) {
        await saveSettingsToStorage(true);
    } else {

        await saveSettings({ [STORAGE_KEYS.AUTO_SAVE_ENABLED]: false });
    }
});

document.getElementById('mypage-link-toggle').addEventListener('change', performAutoSave);
document.getElementById('new-tab-popup-toggle').addEventListener('change', performAutoSave);
notificationToggle.addEventListener('change', performAutoSave);

document.querySelectorAll('.schedule-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', performAutoSave);
});

// === リマインダー背景色の機能 ===

function setBgMode(mode) {
    currentBgMode = mode;
    if (mode === 'static') {
        bgModeStaticBtn.classList.add('active');
        bgModeGradientBtn.classList.remove('active');
        bgStaticSettings.style.display = '';
        bgGradientSettings.style.display = 'none';
    } else {
        bgModeStaticBtn.classList.remove('active');
        bgModeGradientBtn.classList.add('active');
        bgStaticSettings.style.display = 'none';
        bgGradientSettings.style.display = '';
        renderGradientColors();
    }
    updateBgPreview();
}

function renderGradientColors() {
    gradientColorsList.innerHTML = '';
    gradientColors.forEach((color, index) => {
        const item = document.createElement('div');
        item.className = 'gradient-color-item';

        const label = document.createElement('span');
        label.className = 'color-label';
        label.textContent = `色 ${index + 1}`;

        const picker = document.createElement('input');
        picker.type = 'color';
        picker.value = color;
        picker.className = 'color-picker-input';
        picker.addEventListener('input', () => {
            gradientColors[index] = picker.value;
            hex.textContent = picker.value;
            updateBgPreview();
            performAutoSave();
        });

        const hex = document.createElement('span');
        hex.className = 'color-hex';
        hex.textContent = color;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-color-btn';
        removeBtn.textContent = '✕';
        removeBtn.disabled = gradientColors.length <= 2;
        removeBtn.addEventListener('click', () => {
            if (gradientColors.length > 2) {
                gradientColors.splice(index, 1);
                renderGradientColors();
                updateBgPreview();
                performAutoSave();
            }
        });

        item.appendChild(label);
        item.appendChild(picker);
        item.appendChild(hex);
        item.appendChild(removeBtn);
        gradientColorsList.appendChild(item);
    });
}

function updateBgPreview() {
    if (currentBgMode === 'static') {
        bgPreview.style.background = bgStaticColor.value;
    } else {
        if (gradientColors.length === 1) {
            bgPreview.style.background = gradientColors[0];
        } else {
            const stops = gradientColors.map((c, i) => {
                const pct = Math.round((i / (gradientColors.length - 1)) * 100);
                return `${c} ${pct}%`;
            }).join(', ');
            bgPreview.style.background = `linear-gradient(135deg, ${stops})`;
        }
    }
}

bgModeStaticBtn.addEventListener('click', () => {
    setBgMode('static');
    performAutoSave();
});

bgModeGradientBtn.addEventListener('click', () => {
    setBgMode('gradient');
    performAutoSave();
});

bgStaticColor.addEventListener('input', () => {
    bgStaticHex.textContent = bgStaticColor.value;
    updateBgPreview();
    performAutoSave();
});

addGradientColorBtn.addEventListener('click', () => {
    const lastColor = gradientColors[gradientColors.length - 1] || '#000000';
    gradientColors.push(lastColor);
    renderGradientColors();
    updateBgPreview();
    performAutoSave();
});

darkModeToggle.addEventListener('change', async () => {
    if (darkModeToggle.checked) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    // ダークモードは自動保存の設定に関わらず常に即座に保存
    try {
        await saveSettings({ darkMode: darkModeToggle.checked });
    } catch (error) {
        console.log('ダークモード設定の保存に失敗:', error);
    }
    performAutoSave();
});

document.getElementById('copy-discord-btn').addEventListener('click', () => {
    const discordId = document.getElementById('discord-id').textContent;
    navigator.clipboard.writeText(discordId).then(() => {
        showMessage('Discord IDをコピーしました！', 'success');
    }).catch(err => {
        console.error('コピーに失敗しました:', err);
        showMessage('コピーに失敗しました', 'error');
    });
});
