import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, User } from "lucide-react";
import { PageLayout } from "@/components/layout";

interface Teacher {
  id: number;
  name: string;
  subject: string;
  division: string;
  description: string;
  image_url: string | null;
}

interface TeacherIntroPageProps {
  division: string;
  subjects: string[];
}

export function TeacherIntroPage({ division, subjects }: TeacherIntroPageProps) {
  const [selectedSubject, setSelectedSubject] = useState("ALL");

  const { data: teachers = [], isLoading } = useQuery<Teacher[]>({
    queryKey: [`/api/teachers?division=${encodeURIComponent(division)}`],
  });

  const filteredTeachers =
    selectedSubject === "ALL"
      ? teachers
      : teachers.filter((t) => t.subject === selectedSubject);

  const subjectGroups = selectedSubject === "ALL"
    ? subjects.filter((s) => filteredTeachers.some((t) => t.subject === s))
    : [selectedSubject];

  return (
    <PageLayout>
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 text-center">
          <h1
            className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight"
            data-testid="text-teacher-intro-title"
          >
            {division} 선생님 소개
          </h1>
        </div>
      </div>
      <div className="bg-white min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

          <div className="border-t border-gray-200 pt-6 mb-8">
            <div className="flex flex-wrap gap-2" data-testid="filter-subjects">
              <button
                onClick={() => setSelectedSubject("ALL")}
                className={`px-5 py-2 text-sm font-semibold transition-colors ${
                  selectedSubject === "ALL"
                    ? "bg-red-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
                data-testid="filter-subject-all"
              >
                ALL
              </button>
              {subjects.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSubject(s)}
                  className={`px-5 py-2 text-sm font-semibold transition-colors ${
                    selectedSubject === s
                      ? "bg-red-600 text-white"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                  data-testid={`filter-subject-${s}`}
                >
                  {s}
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
            <div className="space-y-10">
              {subjectGroups.map((subj) => {
                const groupTeachers = filteredTeachers.filter(
                  (t) => t.subject === subj
                );
                if (groupTeachers.length === 0) return null;
                return (
                  <div key={subj}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-5 bg-red-600" />
                      <h2
                        className="text-lg font-extrabold text-gray-900"
                        data-testid={`text-subject-group-${subj}`}
                      >
                        {subj}
                      </h2>
                    </div>
                    <div className="border-t border-gray-200 pt-5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {groupTeachers.map((teacher) => (
                          <TeacherCard key={teacher.id} teacher={teacher} />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

function TeacherCard({ teacher }: { teacher: Teacher }) {
  const bioLines = teacher.description
    ? teacher.description.split("\n").filter((l) => l.trim())
    : [];

  return (
    <div
      className="group relative bg-gray-50 border border-gray-100 overflow-hidden"
      data-testid={`card-teacher-${teacher.id}`}
    >
      <div className="relative aspect-[3/4] w-full">
        {teacher.image_url ? (
          <img
            src={teacher.image_url}
            alt={teacher.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <svg
              viewBox="0 0 120 160"
              className="w-3/5 h-3/5 text-gray-300"
              fill="currentColor"
            >
              <ellipse cx="60" cy="50" rx="28" ry="30" />
              <path d="M15 160 Q15 105 60 100 Q105 105 105 160 Z" />
            </svg>
          </div>
        )}

        {bioLines.length > 0 && (
          <div className="absolute inset-0 bg-black/70 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex-shrink-0 pt-4 px-4 pb-2">
              <p className="text-white font-bold text-sm sm:text-base">
                {teacher.name} <span className="text-red-500">T</span>
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-0.5">
              {bioLines.map((line, i) => (
                <p key={i} className="text-white/90 text-xs sm:text-sm leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-3 sm:px-4 sm:py-3">
        <h3 className="text-sm sm:text-base font-extrabold text-gray-900" data-testid={`text-teacher-name-${teacher.id}`}>
          {teacher.name} <span className="text-red-600 font-bold">T</span>
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5" data-testid={`text-teacher-subject-${teacher.id}`}>
          {teacher.subject}
        </p>
      </div>
    </div>
  );
}
