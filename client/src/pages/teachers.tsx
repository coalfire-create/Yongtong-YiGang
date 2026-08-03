import { TeacherIntroPage, TeacherDetailPage } from "@/components/teacher-intro";

const ALL_SUBJECTS = ["수학", "국어", "영어", "탐구"];

export default function TeachersPage() {
  return <TeacherIntroPage subjects={ALL_SUBJECTS} />;
}

export function TeacherDetail(props: { params: { id: string } }) {
  return <TeacherDetailPage id={props.params.id} />;
}
