import { SectionPage } from "@/components/layout";
import { Link } from "wouter";
import { Calendar, Users, Clock } from "lucide-react";
import { TimetableGallery } from "@/components/timetable-gallery";
import { TeacherIntroPage } from "@/components/teacher-intro";

const MIDDLE_SCHOOL_SUBJECTS = ["국어", "영어", "수학", "과학", "사회/역사"];

export function MiddleSchool() {
  return (
    <SectionPage title="중등관" subtitle="중등부 수학 전문 과정 안내">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/middle-school/schedule" className="block border border-gray-200 bg-white p-8 hover:border-red-400 transition-colors duration-200 cursor-pointer" data-testid="card-mid-schedule">
          <Calendar className="w-10 h-10 text-red-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">강의시간표</h3>
          <p className="text-gray-500 text-sm">중1·중2·중3 과정별 시간표를 확인하세요.</p>
        </Link>
        <Link href="/middle-school/teachers" className="block border border-gray-200 bg-white p-8 hover:border-red-400 transition-colors duration-200 cursor-pointer" data-testid="card-mid-teachers">
          <Users className="w-10 h-10 text-red-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">선생님 소개</h3>
          <p className="text-gray-500 text-sm">중등부 전문 강사진을 소개합니다.</p>
        </Link>
      </div>
      <div className="mt-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">과정 안내</h2>
        <div className="space-y-4">
          {[
            { grade: "중1", desc: "수학 기초 완성 + 내신 대비", time: "월·수·금 16:00~18:00" },
            { grade: "중2", desc: "심화 문제 풀이 + 선행 학습", time: "화·목·토 16:00~18:00" },
            { grade: "중3", desc: "고등 수학 선행 + 내신 완성", time: "월·수·금 18:30~20:30" },
          ].map((course) => (
            <div key={course.grade} className="flex items-start gap-4 bg-white border border-gray-200 p-6" data-testid={`card-course-${course.grade}`}>
              <div className="flex-shrink-0 w-14 h-14 bg-red-50 flex items-center justify-center">
                <span className="text-red-600 font-extrabold text-lg">{course.grade}</span>
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

export function MiddleSchoolSchedule() {
  return (
    <SectionPage title="중등관 강의시간표" subtitle="중등부 전 학년 강의 시간표">
      <TimetableGallery category="중등관" />
      <div className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">기본 시간표</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" data-testid="table-schedule">
            <thead>
              <tr className="bg-[#7B2332] text-white">
                <th className="py-3 px-4 text-sm font-semibold text-left border border-[#7B2332]">시간</th>
                {["월", "화", "수", "목", "금", "토"].map((d) => (
                  <th key={d} className="py-3 px-4 text-sm font-semibold text-center border border-[#7B2332]">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { time: "16:00~17:30", mon: "중1 수학", tue: "중2 수학", wed: "중1 수학", thu: "중2 수학", fri: "중1 수학", sat: "중3 심화" },
                { time: "18:00~19:30", mon: "중3 수학", tue: "중1 심화", wed: "중3 수학", thu: "중1 심화", fri: "중3 수학", sat: "중3 심화" },
                { time: "20:00~21:30", mon: "중3 선행", tue: "중2 심화", wed: "중3 선행", thu: "중2 심화", fri: "중3 선행", sat: "" },
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

export function MiddleSchoolTeachers() {
  return <TeacherIntroPage division="중등관" subjects={MIDDLE_SCHOOL_SUBJECTS} />;
}
