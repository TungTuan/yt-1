import fs from 'node:fs';

function load(path) { return JSON.parse(fs.readFileSync(path, 'utf8')); }
function save(path, value) { fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`); }

const jpPath = '.batch-rewrite/content/bedtime_2026-09-26_jp.json';
const jp = load(jpPath);
let jpParts = jp[0].script_text.split('[PAUSE]').map((part) => part.trim()).filter(Boolean);
// Make this script idempotent, then place the Aimi subplot before the budget crisis.
jpParts = jpParts.filter((part) => !part.startsWith('活動が地域に根づいた翌春'));
const aimiStart = jpParts.findIndex((part) => part.startsWith('駄菓子コーナーが始まって一年ほど経った'));
const aimiEnd = jpParts.findIndex((part) => part.startsWith('ある日、児童館の主任職員が'));
if (aimiStart < 0 || aimiEnd < aimiStart) throw new Error('Could not locate JP Aimi subplot');
const aimi = jpParts.splice(aimiStart, aimiEnd - aimiStart + 1);
const crisisIndex = jpParts.findIndex((part) => part.startsWith('しかし、この活動が順調に進んでいた矢先'));
if (crisisIndex < 0) throw new Error('Could not locate JP budget crisis');
jpParts.splice(crisisIndex, 0, ...aimi);
const jpReflection = '活動が地域に根づいた翌春、ふさ子さんは児童館の若い職員たちと、小さな振り返りの会を開きました。子どもが話したくない日は無理に尋ねないこと、気になる変化は一人で抱えず職員同士で共有すること、食べ物を扱う日はアレルギー表示と手洗いを必ず確かめること。ふさ子さんが店で身につけた勘に、児童館の安全な仕組みを重ね、誰が担当しても子どもを穏やかに迎えられる手引きを作ったのです。完成した薄い冊子の表紙には、大輝と愛美が描いた、五円玉と木の棚の絵がありました。試しにその手引きを使った新人職員は、棚の前で黙り込んだ子を急かさず、選ぶ時間を静かに待ちました。やがてその子が自分から「これにする」と指を差したとき、ふさ子さんは、待つことも立派な支えなのだと改めて感じました。経験を言葉にして渡せば、誰かのやさしさを縛る規則ではなく、迷ったときの小さな灯りになる。ふさ子さんは、自分の五十年が思い出だけではなく、次の人が立ち戻れる知恵へ変わったことを、静かにうれしく思いました。';
const jpMoralIndex = jpParts.findIndex((part) => part.startsWith('ふさ子さんは、五十年間守り続けてきた'));
jpParts.splice(jpMoralIndex, 0, jpReflection);
jp[0].script_text = jpParts.join('[PAUSE]');
save(jpPath, jp);

const krPath = '.batch-rewrite/content/bedtime_2026-09-26_kr.json';
const kr = load(krPath);
let krParts = kr[0].script_text.split('[PAUSE]').map((part) => part.trim()).filter(Boolean);
// Remove a duplicated unsafe draft beat in which the child touches the operating lever.
krParts = krParts.filter((part) => !part.includes('손 위에 자기 손을 포개어 레버를 함께 돌렸습니다'));
const krAfter = '일을 그만둔 첫 주, 순자 씨는 오후 세 시 사십 분만 되면 습관처럼 손목시계를 바라보았습니다. 처음 며칠은 갈 곳을 잃은 듯 마음이 허전했지만, 곧 동네 복지관의 안내 봉사를 시작했습니다. 복잡한 무인 접수기 앞에서 망설이는 어르신에게 번호표 뽑는 법을 알려 주고, 잘 들리지 않는 분에게는 창구 설명을 천천히 다시 전했습니다. 승강기 레버를 잡던 손은 이제 안내 지도를 가리켰고, 층수를 묻던 목소리는 필요한 창구를 물었습니다. 기계가 일을 대신해도, 기계 앞에서 망설이는 사람 곁에 서 주는 일은 여전히 사람의 몫이라는 것을 순자 씨는 새 자리에서 배웠습니다.';
const krReunion = '몇 달 뒤 도윤이는 아버지와 복지관을 찾아왔습니다. 학교에서 만든 감사 카드를 전하고 싶었다고 했습니다. 카드 안에는 “안전선 뒤에서 기다리는 법과, 힘들 때 어른에게 말하는 법을 배웠어요”라고 적혀 있었습니다. 순자 씨는 아이가 단지 웃음을 되찾은 것만이 아니라, 스스로를 지키고 도움을 청하는 방법까지 배웠다는 사실이 대견했습니다. 아버지는 이제 검진이 끝난 뒤에도 저녁마다 십 분씩 도윤이의 하루를 듣는다고 말했습니다. 세 사람은 차 한 잔을 나누었고, 헤어질 때에는 다음 만남을 억지로 약속하지 않았습니다. 필요하면 다시 찾아갈 수 있다는 믿음만으로도 충분했기 때문입니다.';
const krLegacy = '복지관에는 순자 씨처럼 오래 하던 일을 내려놓은 사람들이 여럿 있었습니다. 인쇄소가 문을 닫아 퇴직한 사람, 시장의 작은 가게를 정리한 사람, 가족을 돌보느라 자신의 일을 멈춘 사람도 있었습니다. 순자 씨는 그들과 점심을 먹으며, 일이 사라진 뒤의 허전함을 굳이 감추지 않아도 된다는 것을 알았습니다. 어느 날 한 동료가 “우리가 하던 자리는 없어져도, 그 자리에서 배운 태도는 다른 곳으로 가져갈 수 있네요”라고 말했습니다. 순자 씨는 그 말에 오래 고개를 끄덕였습니다. 사람을 재촉하지 않는 법, 문이 완전히 열릴 때까지 기다리는 법, 짧은 대화 속에서도 표정을 살피는 법. 수동 승강기에서 익힌 그 습관들은 새 일터에서도 누군가를 안심시키는 힘이 되었습니다.';
krParts = krParts.filter((part) => !part.startsWith('일을 그만둔 첫 주') && !part.startsWith('몇 달 뒤 도윤이는') && !part.startsWith('복지관에는 순자 씨처럼'));
krParts.splice(krParts.length - 1, 0, krAfter, krLegacy, krReunion);
kr[0].script_text = krParts.join('[PAUSE]');
save(krPath, kr);

console.log('Finalized JP/KR bedtime narrative order, safety, and duration.');
