export type DemoSubject = {
  id: string;
  code: string;
  name: string;
  ects: number;
  year: number | null;
  semester: string | null;
  availability: "not_offered" | "listed";
  mentions: string[];
  sourceUrl: string | null;
  guide: DemoGuide | null;
};

export type DemoGuide = {
  sourceUrl: string;
  language: string;
  basic: string;
  outcomes: string;
  program: string;
  activities: string;
  assessment: string;
  signals: string[];
  multicenter: boolean;
  segmentation: string;
};

export type SubjectStats = {
  subjectId: string;
  mentionCode: string;
  cohort: string;
  n: number;
  presented: number;
  passed: number;
  failed: number;
  absent: number;
  gradeSum: number;
  gradeMean: number | null;
  gradeSqSum: number;
  grade0: number;
  grade5: number;
  grade7: number;
  grade9: number;
  hoursSum: number;
  difficultySum: number;
  difficultyN: number;
  satisfactionSum: number;
  satisfactionN: number;
  repeatYes: number;
  repeatN: number;
};

export type MentionYear = { year: string; mentionCode: string; n: number };
export type Mention = { code: string; name: string };
export type ReasonRow = { reason: string; count: number; mentionCode: string; cohort: string };
export type InterestRow = { interest: string; satisfaction: number | null; responses: number };
export type OfficialGrade = {
  subjectId: string;
  course: string;
  notPresented: number;
  failed: number;
  pass: number;
  merit: number;
  distinction: number;
  honours: number;
  sourceUrl: string;
};
export type DemoPassed = { code: string; name: string; year: number; ects: number; grade: number };
export type Demo716Payload = {
  planName: string;
  planCode: string;
  totalEcts: number;
  sourceUrl: string;
  subjects: DemoSubject[];
  mentions: Mention[];
  stats: SubjectStats[];
  mentionYears: MentionYear[];
  reasons: ReasonRow[];
  interests: InterestRow[];
  official: OfficialGrade[];
  demoPassed: DemoPassed[];
  guidesLoaded: boolean;
  syntheticStudents: number;
  syntheticResults: number;
};
