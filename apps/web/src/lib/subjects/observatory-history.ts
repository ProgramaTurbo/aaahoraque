export type SampleBase = {
  subjectId: string; course: string; interest: string;
  n: number; graded: number; passed: number; absent: number; gradeSum: number; gradeSquares: number;
  low: number; pass: number; merit: number; high: number;
  hours: number; difficulty: number; difficultyN: number;
  satisfaction: number; satisfactionN: number; again: number; againN: number;
};

export type SampleStats = Omit<SampleBase, "subjectId" | "course" | "interest">;

export type ObservatoryHistory = {
  stats: SampleBase[];
  reasons: { subjectId: string; course: string; reason: string; count: number }[];
  mentions: { subjectId: string; name: string; sourceUrl: string; course: string }[];
};

export const emptyHistory: ObservatoryHistory = { stats: [], reasons: [], mentions: [] };

export function mergeSample(rows: SampleBase[]) {
  const sums: SampleStats = {
    n: 0, graded: 0, passed: 0, absent: 0, gradeSum: 0, gradeSquares: 0, low: 0, pass: 0, merit: 0, high: 0,
    hours: 0, difficulty: 0, difficultyN: 0, satisfaction: 0, satisfactionN: 0, again: 0, againN: 0,
  };
  const keys = Object.keys(sums) as (keyof SampleStats)[];
  for (const row of rows) for (const key of keys) sums[key] += row[key];
  return sums;
}
