const https = require('https');

https.get('https://yongtong-yigang.onrender.com/api/timetables', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const arr = JSON.parse(data);
      console.log(`Total timetables: ${arr.length}`);
      
      const g3 = arr.filter(t => t.category === '고등관-고3');
      console.log("=== G3 TIMETABLES (LIVE) ===");
      g3.forEach(t => {
        console.log(`ID: ${t.id} | Teacher: ${t.teacher_name} | Class: ${t.class_name} | Date: ${t.start_date} | Time: ${t.class_time} | Subject: ${t.subject}`);
      });
    } catch (err) {
      console.error("Parse error:", err.message);
    }
  });
}).on('error', (err) => {
  console.error("HTTP error:", err.message);
});
