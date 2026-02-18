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

export function Elementary() {
  return (
    <SectionPage title="초등관" subtitle="초등부 수학 전문 과정 안내">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/elementary/schedule" className="block border border-gray-200 bg-white p-8 hover:border-orange-300 transition-colors duration-200 cursor-pointer" data-testid="card-elem-schedule">
          <Calendar className="w-10 h-10 text-orange-500 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">강의시간표</h3>
          <p className="text-gray-500 text-sm">초등 과정별 시간표를 확인하세요.</p>
        </Link>
        <Link href="/elementary/teachers" className="block border border-gray-200 bg-white p-8 hover:border-orange-300 transition-colors duration-200 cursor-pointer" data-testid="card-elem-teachers">
          <Users className="w-10 h-10 text-orange-500 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">선생님 소개</h3>
          <p className="text-gray-500 text-sm">초등부 전문 강사진을 소개합니다.</p>
        </Link>
      </div>
      <div className="mt-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">과정 안내</h2>
        <div className="space-y-4">
          {[
            { grade: "초4", desc: "수학 사고력 + 연산 완성", time: "월·수·금 15:00~16:30" },
            { grade: "초5", desc: "심화 수학 + 중등 대비 기초", time: "화·목·토 15:00~16:30" },
            { grade: "초6", desc: "중등 선행 + 경시 대비", time: "월·수·금 16:30~18:00" },
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

export function ElementarySchedule() {
  return (
    <SectionPage title="초등관 강의시간표" subtitle="초등부 과정별 강의 시간표">
      <TimetableGallery category="초등관" />
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
                { time: "15:00~16:00", mon: "초4 수학", tue: "초5 수학", wed: "초4 수학", thu: "초5 수학", fri: "초4 수학", sat: "초6 심화" },
                { time: "16:30~17:30", mon: "초6 수학", tue: "초4 심화", wed: "초6 수학", thu: "초4 심화", fri: "초6 수학", sat: "초6 심화" },
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

export function ElementaryTeachers() {
  const { data: teachers = [], isLoading } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  const fallbackTeachers = [
    { id: 0, name: "최연희 선생님", subject: "초등 수학 전 과정", description: "아이들 눈높이에 맞춘 재미있는 수학 수업. 수학에 대한 흥미 유발 전문.", image_url: null },
    { id: 0, name: "오승재 선생님", subject: "사고력·경시 수학", description: "창의력과 논리력을 키우는 심화 수학. 경시대회 수상자 다수 배출.", image_url: null },
  ];

  const displayTeachers = teachers.length > 0 ? teachers : fallbackTeachers;

  return (
    <SectionPage title="초등관 선생님 소개" subtitle="초등부 전문 강사진을 소개합니다">
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
