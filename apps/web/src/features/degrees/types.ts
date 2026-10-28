export type DegreeSummary = {
  province?: string | null; evaluation?: OrientationEvaluation;
  id: string;
  modality: string | null;
  university: { id: string; name: string };
  center: { id: string; name: string } | null;
  degree: { id: string; name: string; academicLevel: string };
};
export type DegreePlan = {
  id: string; name: string; totalEcts: number;
  subjects: { id: string; name: string; ects: number }[];
};
export type OrientationEvaluation = {
  id: string; score: number | null; criteria: Record<string, number>;
  coverage: { evaluated: number; requested: number };
  areas: string[]; reasons: string[]; pending: string[]; status: "pending_verification";
};
