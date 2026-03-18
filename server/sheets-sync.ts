const WEBHOOK_URL =
  process.env.GOOGLE_WEBHOOK_URL ||
  "https://script.google.com/macros/s/AKfycbyNT3GCAdc0JLSR2qB6ThMWJlSbrejYQfOeviDhd1MedXfm-3u_J3glpiPkKzPc_KY/exec";

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
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: data.subject,
        teacherName: data.teacherName,
        className: data.className,
        studentName: data.studentName,
        studentPhone: data.studentPhone,
        parentPhone: data.parentPhone,
        school: data.school,
      }),
    });
    if (!res.ok) {
      console.error("[Webhook] 수강예약 전송 실패:", res.status, await res.text());
    } else {
      console.log("[Webhook] 수강예약 전송 성공");
    }
  } catch (err) {
    console.error("[Webhook] 수강예약 전송 실패:", err);
  }
}

export async function appendSmsRow(data: {
  name: string;
  phone: string;
  school?: string;
  grade?: string;
}) {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "문자수신",
        name: data.name || "-",
        phone: data.phone,
        school: data.school || "-",
        grade: data.grade || "-",
      }),
    });
    if (!res.ok) {
      console.error("[Webhook] 문자수신 전송 실패:", res.status, await res.text());
    } else {
      console.log("[Webhook] 문자수신 전송 성공");
    }
  } catch (err) {
    console.error("[Webhook] 문자수신 전송 실패:", err);
  }
}

export async function appendLevelTestRow(data: {
  name: string;
  phone: string;
  school?: string;
  grade?: string;
}) {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "수학레벨테스트",
        name: data.name,
        phone: data.phone,
        school: data.school || "-",
        grade: data.grade || "-",
      }),
    });
    if (!res.ok) {
      console.error("[Webhook] 수학레벨테스트 전송 실패:", res.status, await res.text());
    } else {
      console.log("[Webhook] 수학레벨테스트 전송 성공");
    }
  } catch (err) {
    console.error("[Webhook] 수학레벨테스트 전송 실패:", err);
  }
}
