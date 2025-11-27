var TUT = TUT || {};

// Onload Event
window.addEventListener("load", function () {
    // Google CDNからのjQuery読み込み終了後でないと"$"が使えないことに注意！動的処理はloadイベントに書くのが基本
    //$ = jQuery;
    TUT.Attendance.$contentInfo = $('div#attend-info');
    TUT.Attendance.$contentForm = $('#attend-form');

    TUT.Attendance.getTodayMyLectures();
});

TUT.Attendance = {
    // 定数
    KEY_CODE : {
        ENTER: 13
    },
    ROLE : {
        TEACHER: 'TEACHER',
        ASSISTANT: 'ASSISTANT',
        STUDENT: 'STUDENT'
    },
    ATTENDANCE_STATUS : {
        ATTENDING: 'ATTENDING',
        AWAY: 'AWAY',
        ABSENCE: 'ABSENCE',
        BLOCK: 'BLOCK',
        NONE: 'NONE'
    },
    RESULT : {
        SUCCESS: 'SUCCESS',
        FAILURE: 'FAILURE'
    },
    ERROR_CODE : {
        INVALID_STATUS: 'INVALID_STATUS',
        INVALID_SEAT_NUMBER: 'INVALID_SEAT_NUMBER',
        INVALID_USER: 'INVALID_USER',
        INVALID_DATA: 'INVALID_DATA',
        ALREADY_ATTENDED_SEAT: 'ALREADY_ATTENDED_SEAT',
        ALREADY_ATTENDED_USER: 'ALREADY_ATTENDED_USER',
        NOT_ACCEPT_ATTENDANCE: 'NOT_ACCEPT_ATTENDANCE',
        NOT_LECTURE_ACTIVE: 'NOT_LECTURE_ACTIVE',
        EXTERNAL_IP: 'EXTERNAL_IP'
    },
    WARN : {
        SAME_SEAT : '出席登録時に「その座席コードは既に他の人が登録しています」と表示された場合は、直ちに担当教員やTAに報告して下さい。',
    },

    // JQuery Object
    $contentInfo : null,
    $contentForm : null,

    // 今日の個人の時間割取得(AJAX)
    getTodayMyLectures : function (debug='') {
        //DEBUG
        let url='/eye/request/myinfo';
        if (debug=='TEACHER') url='/aesc/img/eye_dummy.php?m=t';
        else if (debug=='ASSISTANT') url='/aesc/img/eye_dummy.php?m=s';
        else if (debug=='BEFORE') url='/aesc/img/eye_dummy.php?m=b';
        else if (debug=='AFTER') url='/aesc/img/eye_dummy.php?m=a';
        else if (debug=='TEMP') url='/aesc/img/eye_dummy.php?m=tmp';

        $.ajax({
            type: 'GET',
            dataType: 'JSON',
            url: url,
            cache: false
        }).done(function(data){
            if (!data.lectures || !data.lectures.length) {
                TUT.Attendance.setTimer([]);
                return;
            }
            
            data.term = new Date(data.term).getTime() || 0;
            TUT.Attendance.setTimer(data.lectures);
        }).fail(function() {
            let $attendStatus = $('<div class="attend-status" />').append($('<span class="status --retire"/>').text('講義情報の取得に失敗しました'));
            TUT.Attendance.$contentForm.append($attendStatus);
        });
    },

    // 授業時間に自動で出席フォーム等を表示させるようにセットする関数
    setTimer : function (lectureArray) {
        // 初期状態として，仮出席用のフォームを表示しておく
        this.$contentInfo.hide();
        this.showKariAttend();

        //lectureArrayには当日分のすべてが時間順(順番は保証されない)に入っている
        $.each(lectureArray, function (i, lecture) {
            // 授業終了時間が過ぎているものはスルー
            if (parseInt(lecture.end_time, 10) < new Date().getTime()) {
                return true; // continue;
            }

            // まだ開講時間になっていないものはスルー
            if (parseInt(lecture.begin_time, 10) > new Date().getTime()) {
                return true;// continue;
            }

            //過去判定でスルーされなかった1つ目のフォームを描画。その後、breakしてループ脱出
            switch (lecture.role) {
                case TUT.Attendance.ROLE.TEACHER:
                case TUT.Attendance.ROLE.ASSISTANT:
                    // 授業中画面の表示（教員＆TA）
                    TUT.Attendance.showDuringLectureStaffCard(lecture);
                    break;
                case TUT.Attendance.ROLE.STUDENT:
                    // 授業中画面の表示 (学生)
                    if (lecture.status === TUT.Attendance.ATTENDANCE_STATUS.NONE) {
                        TUT.Attendance.showAttendCard(lecture);
                    } else {
                        TUT.Attendance.showDuringLectureStudentCard(lecture);
                    }
                    break;
                default:
                    alert('不正なユーザーを検知しました');
            }
            return false;// break;
        });
    },

    // 講義の基本情報を表示する：出席枠生成関数(showXXXCard)から呼ばれる
    showLectureInfo : function (lectureInfo) {
        this.$contentInfo.empty();
        this.$contentInfo.show();

        var $lectureInfoInner = $('<div>');

        if (lectureInfo.is_temp) {
            $lectureInfoInner.append('<span class="note">[ 仮履修 ]</span>');
        }
        $lectureInfoInner.append('<span class="name">'+lectureInfo.lecture_name+'</span>');
        $lectureInfoInner.append('<span class="place">'+lectureInfo.room_name+'</span>');
        this.$contentInfo.append($lectureInfoInner);

        if (lectureInfo.url !== null && lectureInfo.url !== '') {
            var $lectureViewButton = TUT.factory.linkButton({
                value: '講義ページへ',
                url: lectureInfo.url,
                target: '_blank'
            }).addClass('e__btn');

            this.$contentInfo.append($lectureViewButton);
        }
    },

    //出席フォームを表示する関数
    showAttendCard : function (lectureInfo) {
        this.$contentForm.empty();
        this.$contentForm.show();

        this.showLectureInfo(lectureInfo);

        let $attendStatus = $('<div class="attend-status" />');
        $attendStatus.append($('<span class="status"/>').text('出席していません'));
		$attendStatus.append($('<p class="e__prg -md2 -sm2"/>').text('座席コードを利用して、出席を行ってください。'));

        let $seatCodeEntry = TUT.factory.textLine('座席コード','例: 9876').on('keypress', lectureInfo, function (event) {
            if (event.keyCode === TUT.Attendance.KEY_CODE.ENTER) {
                doAttendance(event.data);
            }
        }).attr('id', 'eye-form-seatcode');

        let $attendButton = TUT.factory.button('出席').on('click', lectureInfo, function (event) {
            doAttendance(event.data);
        }).attr('id', 'eye-form-status-button');

        let doAttendance = function (data) {
            let seatCode = parseInt($seatCodeEntry.children()[1].value);
            if (TUT.Attendance.isCorrectSeatCode(seatCode)) {
                TUT.Attendance.updateAttendance(data, TUT.Attendance.ATTENDANCE_STATUS.ATTENDING, seatCode, null);
            } else {
                alert('座席コードが不正です');
            }
        };

        let $wornText = $('<p class="e__prg -md2 -sm2"/>').text(this.WARN.SAME_SEAT).attr('id', 'eye-information');

        this.$contentForm.append($attendStatus,$seatCodeEntry,$attendButton,$wornText);

        var $cancelButton = null;
        if (lectureInfo.is_temp) {
            $cancelButton = TUT.factory.button('他の部屋に出席する').on('click', function () {
                TUT.Attendance.showKariAttend();
            }).attr('class', "btn-change-class e__btn -small");
            //this.$contentForm.append($cancelButton);
        }
        this.$contentForm.append($cancelButton);
    },

    // 授業中画面を表示する関数
    showDuringLectureStudentCard : function (lectureInfo) {
        this.$contentForm.empty();
        this.$contentForm.show();

        this.showLectureInfo(lectureInfo);

        let $attendStatus = $('<div class="attend-status" />');
        let $awayButton;
        if (lectureInfo.is_active === false) {
            $attendStatus.append($('<span class="status --retire"/>').text('今日は休講になりました'));
            this.$contentForm.append($attendStatus);
            return;
        }

        switch (lectureInfo.status) {
            case this.ATTENDANCE_STATUS.ATTENDING:
                $attendStatus.append($('<span class="status --seating"/>').text('出席が完了し着席しています'));
                $awayButton = TUT.factory.button('一時退席する').on('click', function () {
                    TUT.Attendance.updateAttendance(lectureInfo, TUT.Attendance.ATTENDANCE_STATUS.AWAY, lectureInfo.seat_number, null);
                }).attr('id', 'eye-form-status-button');
                break;
            case this.ATTENDANCE_STATUS.AWAY:
                $attendStatus.append($('<span class="status --not-seating"/>').text('一時退席中です。講義終了までに着席してください。'));
                $awayButton = TUT.factory.button('着席する').on('click', function () {
                    TUT.Attendance.updateAttendance(lectureInfo, TUT.Attendance.ATTENDANCE_STATUS.ATTENDING, lectureInfo.seat_number, null);
                }).attr('id', 'eye-form-status-button');
                break;
            case this.ATTENDANCE_STATUS.ABSENCE:
                $attendStatus.append($('<span class="status --retire"/>').text('不在状態とみなされたため操作できません'));
                break;
            case this.ATTENDANCE_STATUS.BLOCK:
                $attendStatus.append($('<span class="status --retire"/>').text('不正な出席とみなされたため操作できません'));
                break;
        }
        
        this.$contentForm.append($attendStatus);
        this.$contentForm.append($awayButton);
    },

    // 仮出席用のフォームを表示
    showKariAttend : function () {
        this.$contentForm.empty();
        this.$contentForm.show();

        var doAttendance = function () {
            var seatCode = parseInt($seatCodeEntry.children()[1].value);
            var roomCode = $roomCodeEntry.children()[1].value;
            if (TUT.Attendance.isCorrectSeatCode(seatCode) && TUT.Attendance.isCorrectRoomCode(roomCode)) {
                TUT.Attendance.updateAttendance({
                    is_temp: true,
                    lecture_name: '(ページを再読み込みしてください)'
                }, TUT.Attendance.ATTENDANCE_STATUS.ATTENDING, seatCode, roomCode);
            } else {
                alert('部屋番号または座席コードが不正です');
            }
        };

        var $roomCodeEntry = TUT.factory.textLine('部屋番号','例: KE101');
        var $seatCodeEntry = TUT.factory.textLine('座席コード','例: 9876').on('keypress', function(event) {
            if (event.keyCode === TUT.Attendance.KEY_CODE.ENTER) {
                doAttendance(event.data);
            }
        });
        var $attendButton = TUT.factory.button('出席').on('click', function(event) {
            doAttendance();
        });

        let $wornText = $('<p class="e__prg -md2 -sm2"/>').text(this.WARN.SAME_SEAT).attr('id', 'eye-information');

        this.$contentForm.append($roomCodeEntry, $seatCodeEntry, $attendButton, $wornText);
    },

    // 講義中，教員＆TA用カード
    showDuringLectureStaffCard : function (lectureInfo) {
        this.$contentForm.empty();
        this.$contentForm.show();

        this.showLectureInfo(lectureInfo);

        let $attendStatus = $('<div class="attend-status" />');
        
        if (lectureInfo.is_active === false) {
            $attendStatus.append($('<span class="status --retire"/>').text('開講は中止されました'));
            this.$contentForm.append($attendStatus);
            return;
        }

        if (lectureInfo.is_accept_attendance === true) {
            $attendStatus.append($('<span class="status --seating"/>').text('出席を受け付けています'));
        } else {
            $attendStatus.append($('<span class="status --retire"/>').text('出席は締め切られています'));
        }
        this.$contentForm.append($attendStatus);

        var $seatViewButton = TUT.factory.linkButton({
            value: '座席表の表示',
            url: '/eye/seating_chart.html',
            target: '_blank'
        }).attr('id', 'eye-teacher-seatview').addClass('e__btn');
        this.$contentForm.append($seatViewButton);

        if (lectureInfo.role === this.ROLE.TEACHER) {
            var $openButton = TUT.factory.button('出席を受け付ける').on('click', function () {
                if (confirm('出席を再び受け付けますか？')) {
                    TUT.Attendance.sendRoomCommand('OPEN');
                }
            }).attr('id', 'eye-teacher-lecture-open').addClass('--close');

            if (lectureInfo.is_accept_attendance === true) {
                $openButton.css('display', 'none');
            }
            
            this.$contentForm.append($openButton);

            var closeButton = TUT.factory.button('出席を締め切る').on('click', function () {
                if (confirm('出席を締め切りますか？再び受け付ける事も可能です')) {
                    TUT.Attendance.sendRoomCommand('CLOSE');
                }
            }).attr('id', 'eye-teacher-lecture-close');

            if (lectureInfo.is_accept_attendance === false) {
                closeButton.css('display', 'none');
            }
            this.$contentForm.append(closeButton);

            var cancelButton = TUT.factory.button('休講にする').on('click', function () {
                if (confirm('講義を休講にしますか？この操作は取り消す事ができません')) {
                    TUT.Attendance.sendRoomCommand('CANCEL');
                    $attendStatus.empty();
                }
            }).attr('id', 'eye-teacher-lecture-cancel');
            this.$contentForm.append(cancelButton);
        }
    },

    // 学生の出席のPOST用関数(AJAX)
    updateAttendance : function (lectureInfo, attendanceStatus, seatCode, roomCode) {
        var data = {
            'status': attendanceStatus,
            'seat_code': seatCode
        };

        if (roomCode !== null) {
            data.room_code = roomCode;
        }

        var upload_data = {
            'upload_data': JSON.stringify(data)
        };

        var showError = function (message, type) {
            if (type === 'information') {
                $('#eye-information').text(message);
            } else if (type === 'label') {
                let $attendStatus = $('<div class="attend-status" />').append($('<span class="status --error"/>').text(message));
                TUT.Attendance.$contentForm.empty().append($attendStatus);
            }
        };

        $.ajax({
            type: 'POST',
            url: '/eye/request/attendance/update',
            data: upload_data,
        }).done(function(res){
            var resultData = JSON.parse(res);

            if (resultData.result === TUT.Attendance.RESULT.SUCCESS) {
                lectureInfo.status = attendanceStatus;
                lectureInfo.seat_number = seatCode;
                TUT.Attendance.showDuringLectureStudentCard(lectureInfo);
                return;
            }

            if (resultData.result === TUT.Attendance.RESULT.FAILURE) {
                switch (resultData.error_code) {
                    case TUT.Attendance.ERROR_CODE.NOT_LECTURE_ACTIVE:
                        showError('この講義は休講になりました', 'label');
                        break;
                    case TUT.Attendance.ERROR_CODE.ALREADY_ATTENDED_SEAT:
                        showError('その座席コードは既に他の人が登録しています、直ちに担当教員やTAに報告して下さい', 'information');
                        break;
                    case TUT.Attendance.ERROR_CODE.ALREADY_ATTENDED_USER:
                        showError('あなたは既に出席登録を行なっています', 'label');
                        break;
                    case TUT.Attendance.ERROR_CODE.INVALID_SEAT_NUMBER:
                        showError('座席コードが不正です。もう一度座席コードを見なおしてください', 'information');
                        break;
                    case TUT.Attendance.ERROR_CODE.INVALID_STATUS:
                        showError('不在状態とみなされたため操作権限がありません', 'label');
                        break;
                    case TUT.Attendance.ERROR_CODE.INVALID_USER:
                        showError('不正な出席とみなされたため操作権限がありません', 'label');
                        break;
                    case TUT.Attendance.ERROR_CODE.NOT_ACCEPT_ATTENDANCE:
                        showError('出席が既に締め切られています', 'label');
                        break;
                    case TUT.Attendance.ERROR_CODE.INVALID_DATA:
                        showError('講義や教室が見つかりませんでした', 'label');
                        break;
                    case TUT.Attendance.ERROR_CODE.EXTERNAL_IP:
                        showError('学外からのアクセスです', 'label');
                        break;
                    default:
                        showError('想定外のエラーです', 'label');
                        break;
                }
            } else {
                showError('想定外のエラーです', 'label');
            }
        }).fail(function() {
            showError('サーバーエラーが発生しました', 'label');
        });
    },

    // 教員用授業ステータス変更関数
    sendRoomCommand : function (command) {
        var url = '/eye/request/room/update';
        var post_data = {};
        var upload_json = '{"command":"' + command + '"}';
    
        post_data.upload_data = upload_json;
    
        $.ajax({
            type: 'POST',
            url: url,
            data: post_data,
            dataType: 'text',
        }).done(function(data){
            var resultData = JSON.parse(data);
            if (resultData.result === TUT.Attendance.RESULT.SUCCESS) {
                if (command === 'CLOSE') {
                    $('#eye-teacher-lecture-open').show();
                    $('#eye-teacher-lecture-close').hide();
                    $("div.attend-status").empty().show().append($('<span class="status --retire"/>').text('出席は締め切られています'));
                } else if (command === 'OPEN') {
                    $('#eye-teacher-lecture-open').hide();
                    $('#eye-teacher-lecture-close').show();
                    $("div.attend-status").empty().show().append($('<span class="status --seating"/>').text('出席を受け付けています'));
                } else if (command === 'CANCEL') {
                    $('#eye-teacher-seatview').hide();
                    $('#eye-teacher-lecture-open').hide();
                    $('#eye-teacher-lecture-close').hide();
                    $('#eye-teacher-lecture-cancel').hide();
                    $("div.attend-status").empty().show().append($('<span class="status --retire"/>').text('本日の開講は中止されました'));
                }
            }
        }).fail(function() {
            alert('サーバーエラーが発生しました', 'label');
        });
    },

    // チェックデジットを返す関数 (座席コード1007の場合 引数100 で チェックデジット7を返す)
    getCheckDigit : function (num) {
        if (isNaN(num)) {
            throw new Error('getCheckDigit:Illegal argument');
        }

        var num_str = String(num);
        var str_length = num_str.length;
        var result = 0;

        for (var i = str_length; 0 < i; i--) {
        if ((str_length - i + 1) % 2 === 0) {
            result += num_str.substring(i - 1, i) * 1;
        } else {
            result += num_str.substring(i - 1, i) * 3;
        }
        }

        result = (10 - (result % 10)) % 10;
        return result;
    },

    isCorrectSeatCode : function (num) {
        try {
            if (!(!isFinite(num) || isNaN(num))) {
                var checkDigit = TUT.Attendance.getCheckDigit(parseInt(num / 10, 10));
                if (checkDigit === num % 10) {
                    return true;
                }
            }
        } catch (e) {
             return false;
        }
        return false;
    },
    
    isCorrectRoomCode : function (code) {
        return code.match("^[0-9A-Z]+[0-9]+$");
    },

};


/**
 * Form生成用Factory
 */
TUT.factory = {
    button: function(value) {
        return $('<input>', {
            'type': 'button',
            'class': 'btn-submit e__btn'
        }).val(value);
    },
    linkButton: function(args){
        return $('<a>', {
            'class': 'portal-button',
            'href': args.url,
            'target': args.target
        }).text(args.value);
    },
    textLine: function(label, placeholder) {
        return $('<div class="group"><span class="label">'+label+'</span><input type="text" class="e__fld" placeholder="'+placeholder+'"></div>');
    }
};
