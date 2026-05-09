const WEBHOOK_URL =
  process.env.GOOGLE_WEBHOOK_URL ||
  "https://script.google.com/macros/s/AKfycbyEjqeijDOVs1VgmWvXedh4u1WWepfbnECBfOg_rmnFFbD3ISIY1vFy8cw9UkpvWHQJ/exec";

export async function appendReservationRow(data: {
  subject: string;
  teacherName: string;
  className: string;
  studentName: string;
  studentPhone: string;
  parentPhone: string;
  school: string;
}) {
  const timestamp = new Date().toLocaleString("ko-KR", { 
    timeZone: "Asia/Seoul",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\. /g, '-').replace('.', '');

  try {
    const payload = {
      type: "수강예약",
      timestamp,
      subject: data.subject,
      teacherName: data.teacherName,
      teacher_name: data.teacherName,
      className: data.className,
      class_name: data.className,
      studentName: data.studentName,
      student_name: data.studentName,
      studentPhone: data.studentPhone,
      student_phone: data.studentPhone,
      parentPhone: data.parentPhone,
      parent_phone: data.parentPhone,
      school: data.school,
    };

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("[Webhook] 수강예약 전송 실패:", res.status, await res.text());
    } else {
      console.log("[Webhook] 수강예약 전송 성공:", data.studentName);
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
  const timestamp = new Date().toLocaleString("ko-KR", { 
    timeZone: "Asia/Seoul",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\. /g, '-').replace('.', '');

  try {
    const payload = {
      type: "문자수신",
      timestamp,
      name: data.name || "-",
      phone: data.phone,
      school: data.school || "-",
      grade: data.grade || "-",
    };

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("[Webhook] 문자수신 전송 실패:", res.status, await res.text());
    } else {
      console.log("[Webhook] 문자수신 전송 성공:", data.name);
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
  const timestamp = new Date().toLocaleString("ko-KR", { 
    timeZone: "Asia/Seoul",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\. /g, '-').replace('.', '');

  try {
    const payload = {
      type: "수학레벨테스트",
      timestamp,
      name: data.name,
      phone: data.phone,
      school: data.school || "-",
      grade: data.grade || "-",
    };

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("[Webhook] 수학레벨테스트 전송 실패:", res.status, await res.text());
    } else {
      console.log("[Webhook] 수학레벨테스트 전송 성공:", data.name);
    }
  } catch (err) {
    console.error("[Webhook] 수학레벨테스트 전송 실패:", err);
  }
}
