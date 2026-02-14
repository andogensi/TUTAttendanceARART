// グローバルスコープに定数を定義
const CLASS_START_TIMES = [
    { period: 1, hour: 8, minute: 50, label: '1限' },
    { period: 2, hour: 10, minute: 45, label: '2限' },
    { period: 3, hour: 13, minute: 15, label: '3限' },
    { period: 4, hour: 15, minute: 10, label: '4限' },
    { period: 5, hour: 17, minute: 5, label: '5限' }
];

const DEFAULT_MINUTES_BEFORE = 10;
const DEFAULT_MINUTES_AFTER = 20;

const DEFAULT_CLASS_SCHEDULE = {
    mon: [true, true, true, true, true],
    tue: [true, true, true, true, true],
    wed: [true, true, true, true, true],
    thu: [true, true, true, true, true],
    fri: [true, true, true, true, true]
};

const DAY_MAP = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const DEFAULT_NOTIFICATION_ENABLED = true;
const STORAGE_KEYS = {
    MINUTES_BEFORE: 'minutesBefore',
    MINUTES_AFTER: 'minutesAfter',
    SHOW_MYPAGE_LINK: 'showMypageLink',
    SHOW_POPUP_ON_NEW_TAB: 'showPopupOnNewTab',
    AUTO_SAVE_ENABLED: 'autoSaveEnabled',
    CLASS_SCHEDULE: 'classSchedule',
    ATTENDANCE_COMPLETED: 'attendanceCompleted',
    NOTIFICATION_ENABLED: 'notificationEnabled',
    REMINDER_BG_MODE: 'reminderBgMode',
    REMINDER_BG_COLOR: 'reminderBgColor',
    REMINDER_BG_COLORS: 'reminderBgColors'
};

const DEFAULT_REMINDER_BG_MODE = 'gradient';
const DEFAULT_REMINDER_BG_COLOR = '#56CCF2';
const DEFAULT_REMINDER_BG_COLORS = ['#56CCF2', '#2F80ED'];
