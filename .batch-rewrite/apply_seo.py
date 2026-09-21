# -*- coding: utf-8 -*-
"""
Injects real, per-item SEO metadata (target_keyword/seo_title/seo_description/
seo_tags/hashtags) into the build_*.py source files, keyed by exact title match,
so content/*.json (and the Excel built from it) stop relying on the app's
Japanese-only SEO fallback. Also fixes the 13 already-SEO'd KR items whose
hashtags were written space-separated (importer splits on comma only).
Idempotent: skips an item if it already has target_keyword.
"""
import glob
import re

NEW_SEO = {
    # ---------------- JP (27) ----------------
    "鍛冶屋の火を継ぐ者": dict(
        target_keyword="鍛冶屋の物語",
        seo_title="鍛冶屋の物語｜火を継ぐ者、親子三代の一夜",
        seo_description="三代続く鍛冶屋の跡取りが、大雨の夜に工房を守るため下した決断を描いた、眠る前に聴きたい物語です。",
        seo_tags="鍛冶屋,職人物語,親子の絆,眠れる物語,癒しのラジオ",
        hashtags="#鍛冶屋物語,#眠れる物語,#癒しのラジオ,#職人の心,#親子の絆",
    ),
    "今朝、ポストに挟まった一枚のメモ": dict(
        target_keyword="国際平和デー",
        seo_title="国際平和デー｜今朝、ポストに挟まった一枚のメモ",
        seo_description="9月21日月曜日の朝、集合ポストに挟まっていた一枚のメモと、国際平和デーの由来をお届けします。",
        seo_tags="朝の便り,国際平和デー,秋の便り,こもれび便り,シニアライフ",
        hashtags="#国際平和デー,#朝の便り,#こもれび便り,#シニアライフ",
    ),
    "夕焼けの豆腐屋ラッパ": dict(
        target_keyword="昭和の思い出",
        seo_title="昭和の思い出｜夕焼けの豆腐屋ラッパ",
        seo_description="夕暮れ時に響いた豆腐屋のラッパの音から蘇る、昭和の記憶を辿る物語です。",
        seo_tags="昭和レトロ,豆腐屋,懐かしい記憶,昭和の暮らし,癒しのラジオ",
        hashtags="#昭和の思い出,#豆腐屋ラッパ,#懐かしい記憶,#癒しのラジオ",
    ),
    "秋を表す言葉・五問クイズ": dict(
        target_keyword="秋の言葉クイズ",
        seo_title="秋の言葉クイズ｜秋を表す言葉・五問クイズ",
        seo_description="野分、鰯雲、十六夜など、秋を彩る美しい日本語五つを紹介するお昼の脳トレクイズです。",
        seo_tags="秋の言葉,脳トレクイズ,日本語クイズ,シニアライフ,こもれび便り",
        hashtags="#秋の言葉クイズ,#脳トレ,#こもれび便り,#シニアライフ",
    ),
    "貸本屋のおばあさんと最後の一冊": dict(
        target_keyword="貸本屋の物語",
        seo_title="貸本屋の物語｜おばあさんと最後の一冊",
        seo_description="街から姿を消しつつある貸本屋を営むおばあさんと、最後の一冊にまつわる心温まる物語です。",
        seo_tags="貸本屋,昭和の思い出,人情物語,眠れる物語,癒しのラジオ",
        hashtags="#貸本屋の物語,#眠れる物語,#癒しのラジオ,#人情物語",
    ),
    "隣の空き部屋に灯る明かり": dict(
        target_keyword="寄り添う夜",
        seo_title="寄り添う夜｜隣の空き部屋に灯る明かり",
        seo_description="隣の空き部屋に毎晩灯る明かりの謎から始まる、静かな寄り添いの物語をお届けします。",
        seo_tags="寄り添う夜,家族の想い,癒しのラジオ,こもれび便り,シニアライフ",
        hashtags="#寄り添う夜,#癒しのラジオ,#こもれび便り,#家族の想い",
    ),
    "自転車のかごに残された一輪の花": dict(
        target_keyword="彼岸の便り",
        seo_title="彼岸の便り｜自転車のかごに残された一輪の花",
        seo_description="彼岸を迎えた火曜日の朝、自転車のかごに残されていた一輪の花にまつわる小さな物語です。",
        seo_tags="彼岸,朝の便り,秋の便り,こもれび便り,シニアライフ",
        hashtags="#彼岸の便り,#朝の便り,#こもれび便り,#シニアライフ",
    ),
    "やさしい暗算・五問クイズ": dict(
        target_keyword="暗算クイズ",
        seo_title="暗算クイズ｜やさしい暗算・五問クイズ",
        seo_description="頭の体操にぴったりな、やさしい暗算問題を五つ出題するお昼の脳トレクイズです。",
        seo_tags="暗算クイズ,脳トレ,シニアライフ,こもれび便り,計算問題",
        hashtags="#暗算クイズ,#脳トレ,#こもれび便り,#シニアライフ",
    ),
    "銭湯の番台を継いだ日": dict(
        target_keyword="銭湯の物語",
        seo_title="銭湯の物語｜番台を継いだ日",
        seo_description="昔ながらの銭湯の番台を継ぐことになった日の、親子の情を描いた眠る前の物語です。",
        seo_tags="銭湯,親子の絆,昭和の暮らし,眠れる物語,癒しのラジオ",
        hashtags="#銭湯の物語,#眠れる物語,#癒しのラジオ,#親子の絆",
    ),
    "仏壇に供えたおはぎが一つ減っていた": dict(
        target_keyword="秋分の便り",
        seo_title="秋分の便り｜仏壇のおはぎが一つ減っていた朝",
        seo_description="秋分の日の朝、仏壇に供えたおはぎが一つ減っていた、小さな不思議とほっこりする物語です。",
        seo_tags="秋分の日,お彼岸,朝の便り,こもれび便り,シニアライフ",
        hashtags="#秋分の日,#お彼岸,#朝の便り,#こもれび便り",
    ),
    "駅の伝言板に残った丸印": dict(
        target_keyword="伝言板の思い出",
        seo_title="伝言板の思い出｜駅の伝言板に残った丸印",
        seo_description="かつて駅にあった伝言板に残された丸印から広がる、昭和の再会にまつわる物語です。",
        seo_tags="昭和レトロ,伝言板,懐かしい記憶,再会の物語,癒しのラジオ",
        hashtags="#伝言板の思い出,#昭和レトロ,#癒しのラジオ,#懐かしい記憶",
    ),
    "日本と韓国の昔話・五問クイズ": dict(
        target_keyword="昔話クイズ",
        seo_title="昔話クイズ｜日本と韓国の昔話・五問クイズ",
        seo_description="日本と韓国、それぞれに伝わる昔話にまつわる五つのクイズをお届けするお昼の脳トレです。",
        seo_tags="昔話クイズ,日韓文化,脳トレ,こもれび便り,シニアライフ",
        hashtags="#昔話クイズ,#脳トレ,#こもれび便り,#シニアライフ",
    ),
    "郵便配達夫と最後の年賀状": dict(
        target_keyword="郵便配達夫の物語",
        seo_title="郵便配達夫の物語｜最後の年賀状",
        seo_description="長年地域を見守ってきた郵便配達夫と、ある年賀状にまつわる心温まる眠る前の物語です。",
        seo_tags="郵便配達,地域の絆,見守りの物語,眠れる物語,癒しのラジオ",
        hashtags="#郵便配達夫,#眠れる物語,#癒しのラジオ,#地域の絆",
    ),
    "呼び出し音を三回待つ癖": dict(
        target_keyword="夫婦の習慣",
        seo_title="夫婦の習慣｜呼び出し音を三回待つ癖",
        seo_description="電話の呼び出し音を必ず三回待つという、ある夫婦だけの習慣に込められた想いの物語です。",
        seo_tags="夫婦の絆,習慣の物語,癒しのラジオ,こもれび便り,シニアライフ",
        hashtags="#夫婦の習慣,#癒しのラジオ,#こもれび便り,#夫婦の絆",
    ),
    "虫の声が教える休み方": dict(
        target_keyword="秋の虫の声",
        seo_title="秋の虫の声｜虫の声が教える休み方",
        seo_description="秋の夜長に響く虫の声から、忙しい毎日の中でのひと休みを見つめ直す朝の便りです。",
        seo_tags="秋の便り,虫の声,朝の便り,こもれび便り,シニアライフ",
        hashtags="#秋の虫の声,#朝の便り,#こもれび便り,#シニアライフ",
    ),
    "ことわざ・五問クイズ": dict(
        target_keyword="ことわざクイズ",
        seo_title="ことわざクイズ｜昔の知恵・五問クイズ",
        seo_description="昔から伝わることわざにまつわる五つのクイズで、先人の知恵に触れるお昼の脳トレです。",
        seo_tags="ことわざクイズ,昔の知恵,脳トレ,こもれび便り,シニアライフ",
        hashtags="#ことわざクイズ,#脳トレ,#こもれび便り,#シニアライフ",
    ),
    "写真館の暗室に残された手紙": dict(
        target_keyword="写真館の物語",
        seo_title="写真館の物語｜暗室に残された手紙",
        seo_description="古い写真館の暗室に長年眠っていた一通の手紙をめぐる、父と娘の眠る前の物語です。",
        seo_tags="写真館,父娘の絆,昭和の記憶,眠れる物語,癒しのラジオ",
        hashtags="#写真館の物語,#眠れる物語,#癒しのラジオ,#父娘の絆",
    ),
    "金曜日、できなかったことより": dict(
        target_keyword="金曜日の朝",
        seo_title="金曜日の朝｜できなかったことより",
        seo_description="一週間を振り返る金曜日の朝、できなかったことよりできたことに目を向けてみる小さな便りです。",
        seo_tags="金曜日,朝の便り,週の振り返り,こもれび便り,シニアライフ",
        hashtags="#金曜日の朝,#朝の便り,#こもれび便り,#シニアライフ",
    ),
    "給食当番の銀色バケツ": dict(
        target_keyword="給食当番の思い出",
        seo_title="給食当番の思い出｜銀色バケツの記憶",
        seo_description="小学校の給食当番で使った銀色のバケツから蘇る、昭和の学校生活と再会の物語です。",
        seo_tags="昭和レトロ,給食当番,懐かしい記憶,再会の物語,癒しのラジオ",
        hashtags="#給食当番の思い出,#昭和レトロ,#癒しのラジオ,#懐かしい記憶",
    ),
    "地理と旅・五問クイズ": dict(
        target_keyword="地理クイズ",
        seo_title="地理クイズ｜地理と旅・五問クイズ",
        seo_description="日本各地の地理と旅にまつわる五つのクイズで、頭の体操をしながら旅気分を味わえます。",
        seo_tags="地理クイズ,旅の話題,脳トレ,こもれび便り,シニアライフ",
        hashtags="#地理クイズ,#脳トレ,#こもれび便り,#シニアライフ",
    ),
    "駄菓子屋のおばあさんと五円玉": dict(
        target_keyword="駄菓子屋の物語",
        seo_title="駄菓子屋の物語｜おばあさんと五円玉",
        seo_description="地域に愛された駄菓子屋のおばあさんと、一枚の五円玉にまつわる心温まる眠る前の物語です。",
        seo_tags="駄菓子屋,地域の絆,昭和の記憶,眠れる物語,癒しのラジオ",
        hashtags="#駄菓子屋の物語,#眠れる物語,#癒しのラジオ,#地域の絆",
    ),
    "眠れない夜の湯のみ": dict(
        target_keyword="夫婦の湯のみ",
        seo_title="夫婦の湯のみ｜眠れない夜に寄り添う物語",
        seo_description="眠れない夜にそっと取り出す一つの湯のみに込められた、夫婦の想いを描いた物語です。",
        seo_tags="夫婦の絆,家族の想い,癒しのラジオ,こもれび便り,シニアライフ",
        hashtags="#夫婦の湯のみ,#癒しのラジオ,#こもれび便り,#家族の想い",
    ),
    "土曜の朝、小さな寄り道": dict(
        target_keyword="土曜日の朝",
        seo_title="土曜日の朝｜小さな寄り道",
        seo_description="のんびりとした土曜日の朝、いつもと違う道を歩いてみる小さな寄り道の物語です。",
        seo_tags="土曜日,朝の便り,散歩,こもれび便り,シニアライフ",
        hashtags="#土曜日の朝,#朝の便り,#こもれび便り,#シニアライフ",
    ),
    "食卓の知恵・五問クイズ": dict(
        target_keyword="料理の知恵クイズ",
        seo_title="料理の知恵クイズ｜食卓の知恵・五問クイズ",
        seo_description="昔から伝わる食卓と料理の知恵にまつわる五つのクイズをお届けするお昼の脳トレです。",
        seo_tags="料理クイズ,食卓の知恵,脳トレ,こもれび便り,シニアライフ",
        hashtags="#料理の知恵クイズ,#脳トレ,#こもれび便り,#シニアライフ",
    ),
    "時計修理店の最後の一本": dict(
        target_keyword="時計修理店の物語",
        seo_title="時計修理店の物語｜最後の一本",
        seo_description="三代続く時計修理店を営む職人と、一つの懐中時計にまつわる眠る前の物語です。",
        seo_tags="時計修理,職人物語,継承の物語,眠れる物語,癒しのラジオ",
        hashtags="#時計修理店,#眠れる物語,#癒しのラジオ,#職人物語",
    ),
    "日曜の朝、来週へ残す余白": dict(
        target_keyword="日曜日の朝",
        seo_title="日曜日の朝｜来週へ残す余白",
        seo_description="ゆったりとした日曜日の朝、来週のために少しの余白を残しておく小さな便りです。",
        seo_tags="日曜日,朝の便り,観光の日,こもれび便り,シニアライフ",
        hashtags="#日曜日の朝,#朝の便り,#こもれび便り,#シニアライフ",
    ),
    "年中行事・五問クイズ": dict(
        target_keyword="年中行事クイズ",
        seo_title="年中行事クイズ｜日本の伝統・五問クイズ",
        seo_description="日本の四季を彩る年中行事にまつわる五つのクイズで、伝統に触れるお昼の脳トレです。",
        seo_tags="年中行事クイズ,日本の伝統,脳トレ,こもれび便り,シニアライフ",
        hashtags="#年中行事クイズ,#脳トレ,#こもれび便り,#シニアライフ",
    ),
    # ---------------- KR (13) ----------------
    "가을 절기와 풍습 다섯 문제": dict(
        target_keyword="가을 절기 퀴즈",
        seo_title="가을 절기 퀴즈 | 가을 절기와 풍습 다섯 문제",
        seo_description="추분, 추석, 단풍까지 가을의 절기와 풍습을 담은 다섯 문제로 즐기는 점심시간 두뇌 퀴즈입니다.",
        seo_tags="가을절기퀴즈,두뇌퀴즈,전통풍습,시니어콘텐츠,감성라디오",
        hashtags="#가을절기퀴즈,#두뇌퀴즈,#전통풍습,#시니어콘텐츠",
    ),
    "자전거 바구니에 놓인 코스모스 한 송이": dict(
        target_keyword="추분 아침 인사",
        seo_title="추분 아침 인사 | 자전거 바구니에 놓인 코스모스 한 송이",
        seo_description="추분을 앞둔 화요일 아침, 자전거 바구니에 놓여 있던 코스모스 한 송이가 전해 준 작은 이야기입니다.",
        seo_tags="추분,아침인사,가을소식,시니어콘텐츠,감성라디오",
        hashtags="#추분,#아침인사,#가을소식,#시니어콘텐츠",
    ),
    "생활 속 계산 다섯 문제": dict(
        target_keyword="암산 두뇌 퀴즈",
        seo_title="암산 두뇌 퀴즈 | 생활 속 계산 다섯 문제",
        seo_description="일상 속 쉬운 계산 다섯 문제로 두뇌를 깨우는 점심시간 암산 퀴즈입니다.",
        seo_tags="암산퀴즈,두뇌퀴즈,계산문제,시니어콘텐츠,감성라디오",
        hashtags="#암산퀴즈,#두뇌퀴즈,#계산문제,#시니어콘텐츠",
    ),
    "차례상 위에서 사라진 송편 한 개": dict(
        target_keyword="추석 성묘 이야기",
        seo_title="추석 성묘 이야기 | 차례상 위에서 사라진 송편 한 개",
        seo_description="추석 차례상 위에서 사라진 송편 한 개를 둘러싼, 정겹고 훈훈한 수요일 아침 이야기입니다.",
        seo_tags="추석,성묘,아침인사,시니어콘텐츠,감성라디오",
        hashtags="#추석,#성묘,#아침인사,#시니어콘텐츠",
    ),
    "옛이야기 인물 다섯 문제": dict(
        target_keyword="옛이야기 퀴즈",
        seo_title="옛이야기 퀴즈 | 한일 옛이야기 인물 다섯 문제",
        seo_description="한국과 일본에 전해 내려오는 옛이야기 속 인물들을 다루는 다섯 문제 두뇌 퀴즈입니다.",
        seo_tags="옛이야기퀴즈,두뇌퀴즈,한일문화,시니어콘텐츠,감성라디오",
        hashtags="#옛이야기퀴즈,#두뇌퀴즈,#한일문화,#시니어콘텐츠",
    ),
    "시장 문이 열리기 전": dict(
        target_keyword="새벽 시장 이야기",
        seo_title="새벽 시장 이야기 | 시장 문이 열리기 전",
        seo_description="아직 문이 열리지 않은 이른 아침 시장 골목에서 마주친, 소소하고 따뜻한 목요일 이야기입니다.",
        seo_tags="새벽시장,아침인사,가을소식,시니어콘텐츠,감성라디오",
        hashtags="#새벽시장,#아침인사,#가을소식,#시니어콘텐츠",
    ),
    "속담 다섯 문제": dict(
        target_keyword="속담 퀴즈",
        seo_title="속담 퀴즈 | 옛 지혜가 담긴 속담 다섯 문제",
        seo_description="옛 어른들의 지혜가 담긴 속담 다섯 가지를 알아보는 점심시간 두뇌 퀴즈입니다.",
        seo_tags="속담퀴즈,두뇌퀴즈,옛지혜,시니어콘텐츠,감성라디오",
        hashtags="#속담퀴즈,#두뇌퀴즈,#옛지혜,#시니어콘텐츠",
    ),
    "금요일의 작은 영수증": dict(
        target_keyword="금요일 아침 이야기",
        seo_title="금요일 아침 이야기 | 작은 영수증 한 장",
        seo_description="지갑 속에서 발견한 작은 영수증 한 장으로 시작되는, 금요일 아침의 소소한 이야기입니다.",
        seo_tags="금요일,아침인사,일상이야기,시니어콘텐츠,감성라디오",
        hashtags="#금요일,#아침인사,#일상이야기,#시니어콘텐츠",
    ),
    "지리와 여행 다섯 문제": dict(
        target_keyword="지리 여행 퀴즈",
        seo_title="지리 여행 퀴즈 | 우리 국토 지리와 여행 다섯 문제",
        seo_description="우리나라 곳곳의 지리와 여행 이야기를 담은 다섯 문제로 즐기는 두뇌 퀴즈입니다.",
        seo_tags="지리퀴즈,여행퀴즈,두뇌퀴즈,시니어콘텐츠,감성라디오",
        hashtags="#지리퀴즈,#여행퀴즈,#두뇌퀴즈,#시니어콘텐츠",
    ),
    "버스 종점에서 만난 아침": dict(
        target_keyword="토요일 아침 산책",
        seo_title="토요일 아침 산책 | 버스 종점에서 만난 아침",
        seo_description="느긋한 토요일 아침, 평소와 다른 버스 종점까지 걸어가 본 작은 산책 이야기입니다.",
        seo_tags="토요일,아침산책,아침인사,시니어콘텐츠,감성라디오",
        hashtags="#토요일,#아침산책,#아침인사,#시니어콘텐츠",
    ),
    "음식과 살림 다섯 문제": dict(
        target_keyword="음식 살림 퀴즈",
        seo_title="음식 살림 퀴즈 | 식탁 위 지혜 다섯 문제",
        seo_description="식탁과 살림살이에 담긴 옛 지혜를 다루는 다섯 문제로 즐기는 점심시간 두뇌 퀴즈입니다.",
        seo_tags="음식퀴즈,살림지혜,두뇌퀴즈,시니어콘텐츠,감성라디오",
        hashtags="#음식퀴즈,#살림지혜,#두뇌퀴즈,#시니어콘텐츠",
    ),
    "일요일, 비워 둔 한 칸": dict(
        target_keyword="일요일 아침 이야기",
        seo_title="일요일 아침 이야기 | 다음 주를 위해 비워 둔 한 칸",
        seo_description="세계 관광의 날인 일요일 아침, 다이어리에 일부러 비워 둔 한 칸에 담긴 작은 여유 이야기입니다.",
        seo_tags="일요일,관광의날,아침인사,시니어콘텐츠,감성라디오",
        hashtags="#일요일,#관광의날,#아침인사,#시니어콘텐츠",
    ),
    "명절과 세시 풍속 다섯 문제": dict(
        target_keyword="명절 세시풍속 퀴즈",
        seo_title="명절 세시풍속 퀴즈 | 우리 전통 다섯 문제",
        seo_description="우리 전통 명절과 세시 풍속에 담긴 이야기를 다루는 다섯 문제 두뇌 퀴즈입니다.",
        seo_tags="명절퀴즈,세시풍속,두뇌퀴즈,시니어콘텐츠,감성라디오",
        hashtags="#명절퀴즈,#세시풍속,#두뇌퀴즈,#시니어콘텐츠",
    ),
}


def build_seo_block(indent, seo):
    lines = []
    lines.append(f'{indent}"target_keyword": {seo["target_keyword"]!r},')
    lines.append(f'{indent}"seo_title": {seo["seo_title"]!r},')
    lines.append(f'{indent}"seo_description": {seo["seo_description"]!r},')
    lines.append(f'{indent}"seo_tags": {seo["seo_tags"]!r},')
    lines.append(f'{indent}"hashtags": {seo["hashtags"]!r},')
    return "\n".join(lines) + "\n"


def process_file(path):
    text = open(path, encoding="utf-8").read()
    original = text
    changed = False

    for title, seo in NEW_SEO.items():
        title_pos = text.find(f'"title": "{title}"')
        if title_pos == -1:
            continue
        # only within this item's dict: search forward a bounded window for needs_review line
        window_end = text.find("}", title_pos)
        window_end = window_end if window_end != -1 else len(text)
        search_region = text[title_pos:window_end + 200]
        if '"target_keyword"' in search_region:
            continue  # already has SEO (idempotent / already-fixed items)
        m = re.search(r'\n( *)"needs_review": "(?:TRUE|FALSE)",\n', search_region)
        if not m:
            print(f"  WARNING: could not find needs_review line for title {title!r} in {path}")
            continue
        indent = m.group(1)
        insert_at = title_pos + m.end()
        block = build_seo_block(indent, seo)
        text = text[:insert_at] + block + text[insert_at:]
        changed = True
        print(f"  + added SEO for {title!r} in {path}")

    if changed:
        open(path, "w", encoding="utf-8").write(text)
    return changed


def main():
    files = sorted(glob.glob("build_*.py"))
    files = [f for f in files if f != "apply_seo.py"]
    any_changed = False
    for f in files:
        if process_file(f):
            any_changed = True
    print("done. any_changed =", any_changed)


if __name__ == "__main__":
    main()
