import { SectionPage } from "@/components/layout";
import { Link } from "wouter";
import { Calendar, Users, Clock } from "lucide-react";
import { TeacherIntroPage } from "@/components/teacher-intro";
import { useQuery } from "@tanstack/react-query";

const MIDDLE_SCHOOL_SUBJECTS = ["수학", "국어", "영어", "탐구"];

export function MiddleSchool() {
  const { data: images = [] } = useQuery<any[]>({
    queryKey: ["/api/middle-school-images"],
    queryFn: async () => {
      const res = await fetch("/api/middle-school-images");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    }
  });

  return (
    <SectionPage title="중등관" subtitle="중등부 수학 전문 과정 안내">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="block border border-gray-200 bg-white p-8 transition-colors duration-200" data-testid="card-mid-schedule">
          <Calendar className="w-10 h-10 text-red-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">강의시간표</h3>
          <p className="text-gray-500 text-sm">중1.중2 초/중등관 과정별 시간표를 확인하세요.</p>
        </div>
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
            { grade: "중3", desc: "중 3 : 월수금 / 화목금", time: "주 3회, 1일 3시간, 주 9시간" },
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
          <p className="text-sm text-gray-600 mt-4 font-medium">
            7월부터는 2026년 중3 썸머스쿨 과정 참조 부탁드립니다.
          </p>
        </div>
      </div>

      {images.length > 0 && (
        <div className="mt-10 pt-10 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">안내 포스터</h2>
          <div className="flex flex-col gap-6 items-center">
            {images.map((img) => (
              <img
                key={img.id}
                src={img.image_url}
                alt="중3 안내 포스터"
                className="w-full max-w-3xl border border-gray-200 rounded-lg shadow-sm"
              />
            ))}
          </div>
        </div>
      )}
    </SectionPage>
  );
}


export function MiddleSchoolTeachers() {
  return <TeacherIntroPage division="중등관" subjects={MIDDLE_SCHOOL_SUBJECTS} />;
}
