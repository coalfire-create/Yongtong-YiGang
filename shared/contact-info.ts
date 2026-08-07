export const CONTACTS = {
  highSchool: { label: "영통이강 고등 (내신/수능 전문)", tel: "031-204-1353" },
  juniorSchool: { label: "영통이강 초/중등관", tel: "031-548-0985" },
  owl: { label: "올빼미 관리형 스터디 카페", tel: "031-548-0982" },
} as const;

export function toTelHref(tel: string): string {
  return `tel:${tel.replace(/-/g, "")}`;
}
