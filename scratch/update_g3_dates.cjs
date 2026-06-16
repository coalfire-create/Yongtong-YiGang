const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_BASE = "https://yongtong-yigang.onrender.com/api";
const adminPassword = process.env.ADMIN_PASSWORD || "777777";

const updates = [
  { id: 152, start_date: '7/10', class_name: '김병우 1등급 프리미엄반' },
  { id: 153, start_date: '7/11', class_name: '김병우 공통 (수I, 수II) 정규반' },
  { id: 154, start_date: '7/12', class_name: '김병우 미적분 정규반' },
  { id: 155, start_date: '7/5',  class_name: '김동환 공통 (수I, 수II) 정규반' },
  { id: 157, start_date: '7/12', class_name: '정승준 확통 정규반' },
  { id: 158, start_date: '7/8',  class_name: '김승원 공통 (수I, 수II) 정규반' },
  { id: 159, start_date: '7/5',  class_name: '김승원 확통 정규반' },
  { id: 160, start_date: '6/5',  class_name: '홍준석 시대인재 서바이벌 국어반' },
  { id: 161, start_date: '6/6',  class_name: '김현종 수능 국어' },
  { id: 162, start_date: '6/13', class_name: '문브라더스 수능 영어' },
  { id: 163, start_date: '7/11', class_name: '최은석 시대인재 서바이벌 생명과학' },
  { id: 164, start_date: '7/5',  class_name: '김승원 약술논술 수학' }
];

async function run() {
  let headers = { 'Content-Type': 'application/json' };
  try {
    console.log("Logging into production admin...");
    const loginRes = await axios.post(`${API_BASE}/admin/login`, { password: adminPassword });
    const adminToken = loginRes.data.adminToken;
    headers['x-admin-token'] = adminToken;
    headers['Cookie'] = `adminToken=${adminToken}`;
    console.log("Login successful! Token acquired.");
  } catch (e) {
    console.error("Login failed:", e.message);
    return;
  }

  console.log("\nStarting G3 open dates updates...");
  for (const item of updates) {
    try {
      console.log(`Updating ID ${item.id} (${item.class_name}) to start date: ${item.start_date}`);
      const res = await axios.put(`${API_BASE}/timetables/${item.id}`, { start_date: item.start_date }, { headers });
      console.log(`-> Success! Status: ${res.status}`);
    } catch (e) {
      console.error(`-> Failed to update ID ${item.id}:`, e.response ? e.response.data : e.message);
    }
  }
  console.log("\nAll updates finished!");
}

run();
