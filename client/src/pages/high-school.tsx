import { SectionPage } from "@/components/layout";
import { Link } from "wouter";
import { Calendar, Users } from "lucide-react";
import { TimetableGallery } from "@/components/timetable-gallery";
import { TeacherIntroPage } from "@/components/teacher-intro";

const HIGH_SCHOOL_SUBJECTS = ["국어", "영어", "수학", "과학", "사회/한국사", "제2외국어"];

export function HighSchool() {
  return (
    <SectionPage title="고등관" subtitle="고등부 수학 전문 과정 안내">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/high-school/teachers"
          className="flex flex-col items-center justify-center gap-3 bg-white border border-gray-200 p-6 sm:p-8 hover:border-orange-400 hover:shadow-sm transition-all duration-200 cursor-pointer"
          data-testid="card-high-teachers"
        >
          <Users className="w-10 h-10 text-orange-500" />
          <h3 className="text-base font-bold text-gray-900 text-center">강사 소개</h3>
        </Link>
        <Link
          href="/high-school/schedule/g1"
          className="flex flex-col items-center justify-center gap-3 bg-white border border-gray-200 p-6 sm:p-8 hover:border-orange-400 hover:shadow-sm transition-all duration-200 cursor-pointer"
          data-testid="card-high-g1"
        >
          <Calendar className="w-10 h-10 text-orange-500" />
          <h3 className="text-base font-bold text-gray-900 text-center">고1 시간표</h3>
        </Link>
        <Link
          href="/high-school/schedule/g2"
          className="flex flex-col items-center justify-center gap-3 bg-white border border-gray-200 p-6 sm:p-8 hover:border-orange-400 hover:shadow-sm transition-all duration-200 cursor-pointer"
          data-testid="card-high-g2"
        >
          <Calendar className="w-10 h-10 text-orange-500" />
          <h3 className="text-base font-bold text-gray-900 text-center">고2 시간표</h3>
        </Link>
        <Link
          href="/high-school/schedule/g3"
          className="flex flex-col items-center justify-center gap-3 bg-white border border-gray-200 p-6 sm:p-8 hover:border-orange-400 hover:shadow-sm transition-all duration-200 cursor-pointer"
          data-testid="card-high-g3"
        >
          <Calendar className="w-10 h-10 text-orange-500" />
          <h3 className="text-base font-bold text-gray-900 text-center">고3 시간표</h3>
        </Link>
      </div>
    </SectionPage>
  );
}

export function HighSchoolSchedule() {
  return (
    <SectionPage title="고등관 강의시간표" subtitle="고등부 전 학년 강의 시간표">
      <TimetableGallery category="고등관" />
    </SectionPage>
  );
}

export function HighSchoolScheduleG1() {
  return (
    <SectionPage title="고1 시간표" subtitle="고등관 고1 강의 시간표">
      <TimetableGallery category="고등관-고1" />
    </SectionPage>
  );
}

export function HighSchoolScheduleG2() {
  return (
    <SectionPage title="고2 시간표" subtitle="고등관 고2 강의 시간표">
      <TimetableGallery category="고등관-고2" />
    </SectionPage>
  );
}

export function HighSchoolScheduleG3() {
  return (
    <SectionPage title="고3 시간표" subtitle="고등관 고3 강의 시간표">
      <TimetableGallery category="고등관-고3" />
    </SectionPage>
  );
}

export function HighSchoolTeachers() {
  return <TeacherIntroPage division="고등관" subjects={HIGH_SCHOOL_SUBJECTS} />;
}
