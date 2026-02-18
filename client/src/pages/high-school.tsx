import { SectionPage } from "@/components/layout";
import { Link } from "wouter";
import { Calendar, Users, Clock } from "lucide-react";
import { TimetableGallery } from "@/components/timetable-gallery";
import { TeacherIntroPage } from "@/components/teacher-intro";

const HIGH_SCHOOL_SUBJECTS = ["국어", "영어", "수학", "과학", "사회/한국사", "제2외국어"];

export function HighSchool() {
  return (
    <SectionPage title="고등관" subtitle="고등부 수학 전문 과정 안내">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/high-school/schedule" className="block border border-gray-200 bg-white p-8 hover:border-orange-300 transition-colors duration-200 cursor-pointer" data-testid="card-high-schedule">
          <Calendar className="w-10 h-10 text-orange-500 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">강의시간표</h3>
          <p className="text-gray-500 text-sm">고1·고2·고3 과정별 시간표를 확인하세요.</p>
        </Link>
        <Link href="/high-school/teachers" className="block border border-gray-200 bg-white p-8 hover:border-orange-300 transition-colors duration-200 cursor-pointer" data-testid="card-high-teachers">
          <Users className="w-10 h-10 text-orange-500 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">선생님 소개</h3>
          <p className="text-gray-500 text-sm">고등부 전문 강사진을 소개합니다.</p>
        </Link>
      </div>
      <div className="mt-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6" data-testid="text-course-title">과정 안내</h2>
        <div className="space-y-4">
          {[
            { grade: "고1", desc: "내신 대비 + 수능 기초 완성", time: "월·수·금 18:00~21:00" },
            { grade: "고2", desc: "수능 실전 + 모의고사 집중 분석", time: "화·목·토 18:00~21:00" },
            { grade: "고3", desc: "수능 파이널 + 실전 모의 훈련", time: "월~토 14:00~22:00" },
          ].map((course) => (
            <div key={course.grade} className="flex items-start gap-4 bg-white border border-gray-200 p-6" data-testid={`card-course-${course.grade}`}>
              <div className="flex-shrink-0 w-14 h-14 bg-orange-50 flex items-center justify-center">
                <span className="text-orange-500 font-extrabold text-lg">{course.grade}</span>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">{course.desc}</h4>
                <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{course.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionPage>
  );
}

export function HighSchoolSchedule() {
  return (
    <SectionPage title="고등관 강의시간표" subtitle="고등부 전 학년 강의 시간표">
      <TimetableGallery category="고등관" />
      <div className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">기본 시간표</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" data-testid="table-schedule">
            <thead>
              <tr className="bg-[#1B2A4A] text-white">
                <th className="py-3 px-4 text-sm font-semibold text-left border border-[#1B2A4A]">시간</th>
                {["월", "화", "수", "목", "금", "토"].map((d) => (
                  <th key={d} className="py-3 px-4 text-sm font-semibold text-center border border-[#1B2A4A]">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { time: "14:00~15:30", mon: "고3 수학(상)", tue: "", wed: "고3 수학(상)", thu: "", fri: "고3 수학(상)", sat: "고3 모의" },
                { time: "16:00~17:30", mon: "고3 수학(하)", tue: "", wed: "고3 수학(하)", thu: "", fri: "고3 수학(하)", sat: "고3 모의" },
                { time: "18:00~19:30", mon: "고1 수학(상)", tue: "고2 수학I", wed: "고1 수학(상)", thu: "고2 수학I", fri: "고1 수학(상)", sat: "" },
                { time: "20:00~21:30", mon: "고1 수학(하)", tue: "고2 수학II", wed: "고1 수학(하)", thu: "고2 수학II", fri: "고1 수학(하)", sat: "" },
              ].map((row) => (
                <tr key={row.time} className="border-b border-gray-200">
                  <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 whitespace-nowrap">{row.time}</td>
                  {[row.mon, row.tue, row.wed, row.thu, row.fri, row.sat].map((cell, i) => (
                    <td key={i} className={`py-3 px-4 text-sm text-center border border-gray-200 ${cell ? "text-gray-800 font-medium" : "text-gray-300"}`}>{cell || "-"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-gray-400">* 시간표는 학원 사정에 따라 변경될 수 있습니다.</p>
      </div>
    </SectionPage>
  );
}

export function HighSchoolTeachers() {
  return <TeacherIntroPage division="고등관" subjects={HIGH_SCHOOL_SUBJECTS} />;
}
