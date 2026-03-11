import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, User, ArrowLeft } from "lucide-react";
import { PageLayout } from "@/components/layout";
import { Link } from "wouter";

interface Teacher {
  id: number;
  name: string;
  subject: string;
  division: string;
  description: string;
  image_url: string | null;
  display_order: number;
}

interface TeacherIntroPageProps {
  division?: string;
  subjects: string[];
}

export function TeacherIntroPage({ division, subjects }: TeacherIntroPageProps) {
  const [selectedSubject, setSelectedSubject] = useState("ALL");

  const queryKey = division
    ? `/api/teachers?division=${encodeURIComponent(division)}`
    : "/api/teachers";

  const { data: teachers = [], isLoading } = useQuery<Teacher[]>({
    queryKey: [queryKey],
  });

  const filteredTeachers =
    selectedSubject === "ALL"
      ? teachers
      : teachers.filter((t) => t.subject === selectedSubject);

  const tabs = [{ key: "ALL", label: "전체" }, ...subjects.map((s) => ({ key: s, label: s }))];

  return (
    <PageLayout>
      <div className="bg-white min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1
            className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight pt-10 sm:pt-14 pb-6"
            data-testid="text-teacher-intro-title"
          >
            선생님
          </h1>

          <div className="border-b border-gray-200 mb-8" data-testid="filter-subjects">
            <div className="flex gap-0 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedSubject(tab.key)}
                  className={`relative px-5 sm:px-7 py-3 text-sm sm:text-[15px] font-semibold whitespace-nowrap transition-colors ${
                    selectedSubject === tab.key
                      ? "text-[#7B2332]"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                  data-testid={`filter-subject-${tab.key === "ALL" ? "all" : tab.key}`}
                >
                  {tab.label}
                  {selectedSubject === tab.key && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#7B2332]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="text-center py-20">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">등록된 선생님이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0 pb-14">
              {filteredTeachers.map((teacher) => (
                <TeacherCard key={teacher.id} teacher={teacher} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

function TeacherCard({ teacher }: { teacher: Teacher }) {
  const bioLines = teacher.description
    ? teacher.description.split("\n").filter((l) => l.trim()).slice(0, 3)
    : [];

  return (
    <Link
      href={`/teachers/${teacher.id}`}
      className="block"
      data-testid={`card-teacher-${teacher.id}`}
    >
      <div
        id={`teacher-${teacher.id}`}
        className="flex items-stretch border-b border-gray-200 py-6 gap-4 group cursor-pointer"
      >
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3
            className="text-base sm:text-lg font-extrabold text-gray-900 mb-0.5"
            data-testid={`text-teacher-subject-${teacher.id}`}
          >
            {teacher.subject}
          </h3>
          <p
            className="text-sm text-gray-500 mb-2"
            data-testid={`text-teacher-name-${teacher.id}`}
          >
            {teacher.name} 선생님
          </p>
          {bioLines.length > 0 && (
            <div className="space-y-0.5 mt-1">
              {bioLines.map((line, i) => (
                <p key={i} className="text-xs text-gray-400 leading-relaxed truncate">
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>

        {teacher.image_url && (
          <div className="flex-shrink-0 w-[120px] sm:w-[140px]">
            <img
              src={teacher.image_url}
              alt={teacher.name}
              className="w-full h-[150px] sm:h-[175px] object-cover rounded-sm"
            />
          </div>
        )}
      </div>
    </Link>
  );
}

export function TeacherDetailPage({ id }: { id: string }) {
  const { data: teachers = [], isLoading } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  const teacher = teachers.find((t) => t.id === Number(id));

  const bioLines = teacher?.description
    ? teacher.description.split("\n").filter((l) => l.trim())
    : [];

  return (
    <PageLayout>
      <div className="bg-white min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-6 pb-4">
            <Link
              href="/teachers"
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#7B2332] transition-colors"
              data-testid="link-back-teachers"
            >
              <ArrowLeft className="w-4 h-4" />
              선생님 목록으로
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !teacher ? (
          <div className="text-center py-20">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">선생님 정보를 찾을 수 없습니다.</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-14">
            <div className="border-b border-gray-200 pb-8 mb-8">
              <div className={`flex flex-col ${teacher.image_url ? "sm:flex-row" : ""} gap-6 sm:gap-8`}>
                {teacher.image_url && (
                  <div className="flex-shrink-0 w-full sm:w-[260px]">
                    <img
                      src={teacher.image_url}
                      alt={teacher.name}
                      className="w-full aspect-[3/4] object-cover rounded-sm"
                      data-testid="img-teacher-detail"
                    />
                  </div>
                )}

                <div className="flex-1 flex flex-col justify-center">
                  <span className="text-sm font-bold text-[#7B2332] mb-1">
                    {teacher.subject}
                  </span>
                  <h1
                    className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1"
                    data-testid="text-teacher-detail-name"
                  >
                    {teacher.name} <span className="text-gray-400 font-medium text-lg sm:text-xl">선생님</span>
                  </h1>
                  {teacher.division && (
                    <p className="text-sm text-gray-400 mt-1">{teacher.division}</p>
                  )}
                </div>
              </div>
            </div>

            {bioLines.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Profile</h2>
                <div className="space-y-1.5">
                  {bioLines.map((line, i) => (
                    <p key={i} className="text-sm text-gray-500 leading-relaxed" data-testid={`text-bio-line-${i}`}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
