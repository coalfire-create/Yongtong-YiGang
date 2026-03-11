import { getUncachableGoogleSheetClient } from "./googleSheets";

let cachedSpreadsheetId: string | null = null;

const SHEET_TITLE = "접수현황";
const HEADERS = ["신청일시", "구분", "과목명", "강사명", "수업명", "학생이름", "학생전화번호", "부모님전화번호", "재학중인학교"];

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

async function getOrCreateSpreadsheet(): Promise<string> {
  if (cachedSpreadsheetId) return cachedSpreadsheetId;

  const envId = process.env.GOOGLE_SHEET_ID;
  if (envId) {
    cachedSpreadsheetId = envId;
    return envId;
  }

  const sheets = await getUncachableGoogleSheetClient();
  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: "영통이강학원 접수현황" },
      sheets: [{ properties: { title: SHEET_TITLE } }],
    },
  });

  const id = res.data.spreadsheetId!;
  cachedSpreadsheetId = id;
  console.log(`[Google Sheets] 새 스프레드시트 생성됨: https://docs.google.com/spreadsheets/d/${id}`);

  await sheets.spreadsheets.values.update({
    spreadsheetId: id,
    range: `${SHEET_TITLE}!A1:I1`,
    valueInputOption: "RAW",
    requestBody: { values: [HEADERS] },
  });

  return id;
}

export async function appendReservationRow(data: {
  subject: string;
  teacherName: string;
  className: string;
  studentName: string;
  studentPhone: string;
  parentPhone: string;
  school: string;
}) {
  try {
    const spreadsheetId = await getOrCreateSpreadsheet();
    const sheets = await getUncachableGoogleSheetClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_TITLE}!A:I`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          formatDate(new Date()),
          "수강예약",
          data.subject,
          data.teacherName,
          data.className,
          data.studentName,
          data.studentPhone,
          data.parentPhone,
          data.school,
        ]],
      },
    });
  } catch (err) {
    console.error("[Google Sheets] 수강예약 기록 실패:", err);
  }
}

export async function appendSmsRow(data: {
  name: string;
  phone: string;
}) {
  try {
    const spreadsheetId = await getOrCreateSpreadsheet();
    const sheets = await getUncachableGoogleSheetClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_TITLE}!A:G`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          formatDate(new Date()),
          "문자수신",
          data.name || "-",
          "-",
          "-",
          data.phone,
          "-",
        ]],
      },
    });
  } catch (err) {
    console.error("[Google Sheets] 문자수신 기록 실패:", err);
  }
}
