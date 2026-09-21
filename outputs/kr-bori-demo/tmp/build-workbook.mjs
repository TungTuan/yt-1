import fs from 'node:fs/promises';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const outputDir = '/Users/tung/Documents/youtube-1/outputs/kr-bori-demo';
const workbook = Workbook.create();
const guide = workbook.worksheets.add('Huong_dan');
const schedule = workbook.worksheets.add('Weekly_Schedule');
const quiz = workbook.worksheets.add('Quiz_Questions');

const navy = '#243447';
const blue = '#3E6578';
const paleBlue = '#EAF2F5';
const paleYellow = '#FFF4CC';
const line = '#CCD8DE';
const bodyFont = { name: 'Arial', size: 10, color: '#25313B' };

guide.showGridLines = false;
guide.getRange('A2:F2').merge();
guide.getRange('A2').values = [['KR Bori demo content']];
guide.getRange('A2').format.font = { name: 'Arial', size: 16, bold: true, color: navy };
guide.getRange('A3:F3').format.borders = { bottom: { style: 'thin', color: blue } };
guide.getRange('A5:B11').values = [
  ['Mục', 'Nội dung'],
  ['Mục tiêu', 'Một video demo tiếng Hàn 45–60 giây giới thiệu mascot Bori.'],
  ['Market', 'kr'],
  ['Kênh', '햇살 편지'],
  ['Phân đoạn', 'companionship'],
  ['Mascot', 'Bori (보리), chim ác là Hàn Quốc với khăn vàng.'],
  ['Cách dùng', 'Import sheet Weekly_Schedule vào dashboard. Nội dung đã đặt needs_review=TRUE để duyệt trước khi render.'],
];
guide.getRange('A5:B5').format.fill = navy;
guide.getRange('A5:B5').format.font = { name: 'Arial', size: 10, bold: true, color: '#FFFFFF' };
guide.getRange('A6:B11').format.font = bodyFont;
guide.getRange('A5:B11').format.borders = { insideHorizontal: { style: 'thin', color: line }, bottom: { style: 'thin', color: line } };
guide.getRange('A6:A11').format.font = { ...bodyFont, bold: true, color: blue };
guide.getRange('A5:B11').format.verticalAlignment = 'center';
guide.getRange('A5:B11').format.wrapText = true;
guide.getRange('A:A').format.columnWidth = 20;
guide.getRange('B:B').format.columnWidth = 82;
guide.getRange('2:2').format.rowHeight = 26;
guide.getRange('6:11').format.rowHeight = 34;

const headers = [
  'market','scheduled_date','time_slot','segment_type','title','script_text','tags','needs_review',
  'shorts_snippet','target_keyword','seo_title','seo_description','seo_tags','hashtags',
];
const script = '안녕하세요. 햇살 편지의 보리예요. 한국에서는 까치가 반가운 소식을 전해 주는 새로 오래 사랑받아 왔어요. 오늘 제가 가져온 소식은 아주 작고 따뜻합니다. 잠시 어깨의 힘을 빼고, 창밖의 빛을 바라보세요. 천천히 숨을 들이쉬고 내쉬면서 오늘 잘해 낸 일 하나를 떠올려 보세요. 따뜻한 차 한 잔, 반가운 인사 한마디도 충분히 소중합니다. 오늘도 당신 곁에 좋은 소식이 머물기를 바라요. 보리와 함께 편안한 하루 보내세요.';
const data = [[
  'kr', new Date('2026-09-18T00:00:00Z'), '19:00', 'companionship',
  '보리가 전하는 오늘의 좋은 소식', script,
  '보리,까치,좋은소식,마음휴식,중장년', 'TRUE', '', '좋은 소식',
  '좋은 소식｜보리와 함께하는 따뜻한 1분',
  '좋은 소식을 전하는 까치 보리와 함께 잠시 숨을 고르고, 오늘의 작은 기쁨을 떠올려 보세요. 햇살 편지가 전하는 편안한 1분입니다.',
  '좋은 소식,보리,까치,마음 휴식,중장년,햇살 편지', '#좋은소식,#마음휴식,#햇살편지',
]];

schedule.showGridLines = false;
schedule.getRange('A1:N1').values = [headers];
schedule.getRange('A2:N2').values = data;
schedule.getRange('A1:N1').format.fill = navy;
schedule.getRange('A1:N1').format.font = { name: 'Arial', size: 10, bold: true, color: '#FFFFFF' };
schedule.getRange('A1:N1').format.horizontalAlignment = 'center';
schedule.getRange('A1:N2').format.verticalAlignment = 'top';
schedule.getRange('A2:N2').format.font = bodyFont;
schedule.getRange('A2:N2').format.borders = { bottom: { style: 'thin', color: line } };
schedule.getRange('A2:D2').format.fill = paleBlue;
schedule.getRange('H2').format.fill = paleYellow;
schedule.getRange('B2').setNumberFormat('yyyy-mm-dd');
schedule.getRange('A1:N2').format.wrapText = true;
schedule.freezePanes.freezeRows(1);
const widths = [10,16,11,18,34,90,30,14,18,18,42,72,40,34];
for (let i = 0; i < widths.length; i++) schedule.getRangeByIndexes(0, i, 2, 1).format.columnWidth = widths[i];
schedule.getRange('1:1').format.rowHeight = 30;
schedule.getRange('2:2').format.rowHeight = 150;
schedule.tables.add('A1:N2', true, 'KrBoriDemoTable').style = 'TableStyleMedium2';

quiz.showGridLines = false;
quiz.getRange('A1:I1').values = [[
  'market','date','question','choice_1','choice_2','choice_3','choice_4','answer','fun_fact',
]];
quiz.getRange('A1:I1').format.fill = navy;
quiz.getRange('A1:I1').format.font = { name: 'Arial', size: 10, bold: true, color: '#FFFFFF' };
quiz.getRange('A1:I1').format.horizontalAlignment = 'center';
quiz.getRange('A2:I2').merge();
quiz.getRange('A2').values = [['Không cần dữ liệu cho video companionship demo này.']];
quiz.getRange('A2').format.font = { ...bodyFont, italic: true, color: blue };
quiz.getRange('A2').format.fill = paleBlue;
quiz.getRange('A:I').format.columnWidth = 20;
quiz.getRange('C:C').format.columnWidth = 46;
quiz.getRange('I:I').format.columnWidth = 46;

workbook.recalculate();
console.log((await workbook.inspect({ kind: 'table', range: 'Weekly_Schedule!A1:N2', include: 'values,formulas', tableMaxRows: 4, tableMaxCols: 14 })).ndjson);
console.log((await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 100 }, summary: 'final formula error scan' })).ndjson);
const preview = await workbook.render({ sheetName: 'Weekly_Schedule', range: 'A1:N2', scale: 1.2 });
await fs.writeFile(`${outputDir}/preview-weekly-schedule.png`, new Uint8Array(await preview.arrayBuffer()));
await fs.mkdir(outputDir, { recursive: true });
const blob = await SpreadsheetFile.exportXlsx(workbook);
await blob.save(`${outputDir}/kr-bori-demo-content.xlsx`);
