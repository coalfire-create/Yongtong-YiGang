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
    // Strictly ordered payload to match Google Sheet columns A-I
    const payload = {
      timestamp: timestamp, // A: 신청일시
      type: "수강예약",       // B: 구분
      subject: data.subject.trim() || "-",       // C: 과목명
      teacher_name: data.teacherName.trim() || "-", // D: 강사명
      class_name: data.className.trim() || "-",     // E: 수업명
      student_name: data.studentName.trim() || "-", // F: 학생 이름
      student_phone: data.studentPhone.trim() || "-", // G: 학생 전화번호
      parent_phone: data.parentPhone.trim() || "-",   // H: 부모님 전화번호
      school: data.school.trim() || "-",              // I: 재학중인 학교
    };

    console.log("[SheetsSync] Sending Reservation Payload:", JSON.stringify(payload, null, 2));

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("[Webhook] 수강예약 전송 실패:", res.status, errorText);
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
      timestamp,
      type: "문자수신",
      name: data.name || "-",
      phone: data.phone || "-",
      school: data.school || "-",
      grade: data.grade || "-",
    };

    console.log("[SheetsSync] Sending SMS Sub:", JSON.stringify(payload, null, 2));

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("[Webhook] 문자수신 전송 실패:", res.status, errorText);
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
      timestamp,
      type: "수학레벨테스트",
      name: data.name || "-",
      phone: data.phone || "-",
      school: data.school || "-",
      grade: data.grade || "-",
    };

    console.log("[SheetsSync] Sending Level Test:", JSON.stringify(payload, null, 2));

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("[Webhook] 수학레벨테스트 전송 실패:", res.status, errorText);
    } else {
      console.log("[Webhook] 수학레벨테스트 전송 성공:", data.name);
    }
  } catch (err) {
    console.error("[Webhook] 수학레벨테스트 전송 실패:", err);
  }
}


