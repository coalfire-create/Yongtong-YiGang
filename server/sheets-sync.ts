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
    // Ensuring no field is truly empty by using explicit fallbacks
    const payload = {
      timestamp: timestamp, // A: 신청일시
      type: "수강예약",       // B: 구분
      subject: (data.subject && data.subject.trim()) ? data.subject.trim() : "-",       // C: 과목명
      teacher_name: (data.teacherName && data.teacherName.trim()) ? data.teacherName.trim() : "-", // D: 강사명
      class_name: (data.className && data.className.trim()) ? data.className.trim() : "-",     // E: 수업명
      student_name: (data.studentName && data.studentName.trim()) ? data.studentName.trim() : "-", // F: 학생 이름
      student_phone: (data.studentPhone && data.studentPhone.trim()) ? data.studentPhone.trim() : "-", // G: 학생 전화번호
      parent_phone: (data.parentPhone && data.parentPhone.trim()) ? data.parentPhone.trim() : "-",   // H: 부모님 전화번호
      school: (data.school && data.school.trim()) ? data.school.trim() : "-",              // I: 재학중인 학교
    };

    console.log("[SheetsSync] Final Payload for Google Sheets:", JSON.stringify(payload, null, 2));


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
    // 수강예약과 동일한 컬럼 구조(A~I + 학년)로 맞춰 시트 정렬이 어긋나지 않게 한다.
    const payload = {
      timestamp,                                            // A 신청일시
      type: "문자수신",                                       // B 구분
      subject: "-",                                          // C 과목명
      teacher_name: "-",                                     // D 강사명
      class_name: data.grade ? `학년: ${data.grade}` : "-",  // E 수업명(학년 보존)
      student_name: data.name || "-",                        // F 이름
      student_phone: data.phone || "-",                      // G 전화번호
      parent_phone: "-",                                     // H 부모님 전화번호
      school: data.school || "-",                            // I 학교
      grade: data.grade || "-",                              // J 학년
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
    // 수강예약과 동일한 컬럼 구조(A~I + 학년)로 맞춰 시트 정렬이 어긋나지 않게 한다.
    const payload = {
      timestamp,                                            // A 신청일시
      type: "수학레벨테스트",                                  // B 구분
      subject: "-",                                          // C 과목명
      teacher_name: "-",                                     // D 강사명
      class_name: data.grade ? `학년: ${data.grade}` : "-",  // E 수업명(학년 보존)
      student_name: data.name || "-",                        // F 이름
      student_phone: data.phone || "-",                      // G 전화번호
      parent_phone: "-",                                     // H 부모님 전화번호
      school: data.school || "-",                            // I 학교
      grade: data.grade || "-",                              // J 학년
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


