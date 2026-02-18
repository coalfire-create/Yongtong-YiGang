import { SectionPage } from "@/components/layout";
import { Link } from "wouter";
import { Calendar, Users, Clock, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { TimetableGallery } from "@/components/timetable-gallery";

interface Teacher {
  id: number;
  name: string;
  subject: string;
  description: string;
  image_url: string | null;
}

export function MiddleSchool() {
  return (
    <SectionPage title="중등관" subtitle="중등부 수학 전문 과정 안내">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/middle-school/schedule" className="block border border-gray-200 bg-white p-8 hover:border-orange-300 transition-colors duration-200 cursor-pointer" data-testid="card-mid-schedule">
          <Calendar className="w-10 h-10 text-orange-500 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">강의시간표</h3>
          <p className="text-gray-500 text-sm">중1·중2·중3 과정별 시간표를 확인하세요.</p>
        </Link>
        <Link href="/middle-school/teachers" className="block border border-gray-200 bg-white p-8 hover:border-orange-300 transition-colors duration-200 cursor-pointer" data-testid="card-mid-teachers">
          <Users className="w-10 h-10 text-orange-500 mb-4" />
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

export function MiddleSchoolSchedule() {
  return (
    <SectionPage title="중등관 강의시간표" subtitle="중등부 전 학년 강의 시간표">
      <TimetableGallery category="중등관" />
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
  const { data: teachers = [], isLoading } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  const fallbackTeachers = [
    { id: 0, name: "정민수 선생님", subject: "중등 수학 전 과정", description: "기본기를 탄탄히 잡아주는 맞춤형 수업. 중등 내신 만점자 다수 배출.", image_url: null },
    { id: 0, name: "한지영 선생님", subject: "중등 심화·선행", description: "개념 이해부터 고난도 문제까지. 고등 수학 선행 전문.", image_url: null },
  ];

  const displayTeachers = teachers.length > 0 ? teachers : fallbackTeachers;

  return (
    <SectionPage title="중등관 선생님 소개" subtitle="중등부 전문 강사진을 소개합니다">
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayTeachers.map((t) => (
            <div key={t.id} className="bg-white border border-gray-200 overflow-hidden" data-testid={`card-teacher-${t.name}`}>
              {t.image_url ? (
                <img src={t.image_url} alt={t.name} className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-48 bg-orange-50 flex items-center justify-center">
                  <Users className="w-16 h-16 text-orange-300" />
                </div>
              )}
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900">{t.name}</h3>
                <p className="text-sm text-orange-500 font-medium mt-0.5">{t.subject}</p>
                <p className="text-sm text-gray-500 mt-2">{t.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionPage>
  );
}
