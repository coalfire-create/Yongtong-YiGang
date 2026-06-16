const https = require('https');

https.get('https://yongtong-yigang.onrender.com/api/timetables', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const arr = JSON.parse(data);
      const counts = {};
      arr.forEach(t => {
        counts[t.category] = (counts[t.category] || 0) + 1;
      });
      console.log("=== LIVE CATEGORY COUNTS ===");
      console.log(counts);
    } catch (err) {
      console.error("Parse error:", err.message);
    }
  });
});
