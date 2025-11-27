https://service.cloud.teu.ac.jp/eye/request/myinfo
上のURLをたたくと、以下のようなJSONが返ってきます。

```json
{"term":1764222901000,"date":{"date":27,"day":4,"hours":0,"minutes":0,"month":10,"seconds":0,"time":1764169200000,"timezoneOffset":-540,"year":125},"lectures":[{"lecture_id":"3306","lecture_name":"English RW II[B6]CS","responsible_person":"楠元 洋子","url":"https://service.cloud.teu.ac.jp/moodle_epyc/course/view.php?id=23827","is_temp":false,"period":"hachioji3","room_name":"片柳研究所Ｅ１０２","is_active":true,"is_accept_attendance":true,"role":"STUDENT","begin_time":1764216600000,"end_time":1764222900000,"status":"ATTENDING"},{"lecture_id":"4494","lecture_name":"表象文化論[木2]CSMS","responsible_person":"関 大聡","url":"https://service.cloud.teu.ac.jp/moodle_epyc/course/view.php?id=23661","is_temp":false,"period":"hachioji2","room_name":"研究棟Ａ３０２","is_active":true,"is_accept_attendance":true,"role":"STUDENT","begin_time":1764207600000,"end_time":1764213900000,"status":"ATTENDING"}]}

```
status	"ATTENDING"	
あなたの現在の履修・出席状態。「受講中」や「出席済み」などを意味します。
"hachioji3"	
時限を表すコードです。hachioji（八王子キャンパス）の 3（3限）という意味だと思われます。
これを利用したい
