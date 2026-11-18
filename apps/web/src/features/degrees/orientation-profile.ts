export const interestChoices = [
  [
    "technology:arts",
    "Programar una aplicación",
    "Diseñar la imagen de una campaña"
  ],
  [
    "arts:health",
    "Producir un cortometraje",
    "Preparar un programa de salud"
  ],
  [
    "health:business",
    "Ayudar a recuperar movilidad",
    "Planificar un nuevo negocio"
  ],
  [
    "business:engineering",
    "Financiar un proyecto",
    "Construir un prototipo"
  ],
  [
    "engineering:humanities",
    "Diseñar un puente",
    "Investigar la historia de una lengua"
  ],
  [
    "humanities:social",
    "Interpretar textos antiguos",
    "Mejorar la convivencia escolar"
  ],
  [
    "social:science",
    "Estudiar el efecto de una política",
    "Comprobar una hipótesis en el laboratorio"
  ],
  [
    "science:technology",
    "Investigar las propiedades de un material",
    "Programar una herramienta para analizar datos"
  ]
] as const;
export const orientationReviewStep = 6;

export const areas = [
  ["technology", "Informática y tecnología"], ["engineering", "Ingeniería y arquitectura"],
  ["health", "Salud y bienestar"], ["science", "Ciencias y matemáticas"],
  ["business", "Economía y empresa"], ["social", "Educación, derecho y sociedad"],
  ["humanities", "Lenguas y humanidades"], ["arts", "Arte, diseño y comunicación"],
] as const;
export const regions: Record<string, string[]> = {
  "Andalucía": ["Almería", "Cádiz", "Córdoba", "Granada", "Huelva", "Jaén", "Málaga", "Sevilla"],
  "Aragón": ["Huesca", "Teruel", "Zaragoza"], "Asturias": ["Asturias"], "Illes Balears": ["Illes Balears"],
  "Canarias": ["Las Palmas", "Santa Cruz de Tenerife"], "Cantabria": ["Cantabria"],
  "Castilla-La Mancha": ["Albacete", "Ciudad Real", "Cuenca", "Guadalajara", "Toledo"],
  "Castilla y León": ["Ávila", "Burgos", "León", "Palencia", "Salamanca", "Segovia", "Soria", "Valladolid", "Zamora"],
  "Cataluña": ["Barcelona", "Girona", "Lleida", "Tarragona"],
  "Comunitat Valenciana": ["Alicante/Alacant", "Castellón/Castelló", "Valencia/València"],
  "Extremadura": ["Badajoz", "Cáceres"], "Galicia": ["A Coruña", "Lugo", "Ourense", "Pontevedra"],
  "Madrid": ["Madrid"], "Murcia": ["Murcia"], "Navarra": ["Navarra"],
  "País Vasco": ["Araba/Álava", "Bizkaia", "Gipuzkoa"], "La Rioja": ["La Rioja"], "Ceuta": ["Ceuta"], "Melilla": ["Melilla"],
};
export type OrientationProfile = {
  schemaVersion?: 2;
  answers?: Record<string, ScaleAnswer>;
  comparisons?: Partial<Record<(typeof interestChoices)[number][0], ComparisonAnswer>>;
  academicStatus?: { access_grade: DataStatus; admission_grade: DataStatus; previous_studies: DataStatus; subjects: DataStatus };
  locationPreferences?: { preferred: string[]; acceptable: string[]; unavailable: string[]; moving: Feasibility; commuting: Feasibility };
  requirements?: Partial<Record<"budget" | "institution" | "modality" | "duration", RequirementLevel>>;
  legacyAnswers?: Record<string, unknown>;
  origin_region?: string;
  interest_choices?: Partial<Record<(typeof interestChoices)[number][0], "A" | "B">>;
  interests: Record<string, "like" | "dislike">;
  aptitudes: Record<string, number>;
  activities: string[]; goals: string[];
  access_route: "unknown" | "bachillerato" | "fp_superior" | "other";
  previous_studies: string; subjects: string;
  access_grade: number | null; admission_grade: number | null;
  origin_province: string | null; allowed_provinces: string[];
  mobility: "unknown" | "anywhere" | "prefer_province" | "require_province" | "prefer_region" | "require_region";
  budget: number | null; budget_strict: boolean;
  institution: "unknown" | "public" | "private" | "either";
  modality: "unknown" | "on_site" | "online" | "hybrid";
  modality_strict: boolean; max_years: number | null; distance: string;
  priorities: Record<string, number>;
};
export const emptyProfile: OrientationProfile = {
  schemaVersion: 2, answers: {}, comparisons: {},
  interests: {}, aptitudes: {}, activities: [], goals: [], access_route: "unknown",
  previous_studies: "", subjects: "", access_grade: null, admission_grade: null,
  origin_province: null, allowed_provinces: [], mobility: "unknown", budget: null,
  budget_strict: false, institution: "unknown", modality: "unknown", modality_strict: false,
  max_years: null, distance: "", priorities: { interests: 1, location: 1, modality: 1 },
};

/** Creates simulated questionnaire answers for exercising the existing results flow. */
export function createRandomProfile(random: () => number = Math.random): OrientationProfile {
  const pick = <T,>(values: readonly T[]): T => values[Math.floor(random() * values.length)];
  const integer = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const region = pick(Object.keys(regions));
  const province = pick(regions[region]);
  const accessRoute = pick(["bachillerato", "fp_superior", "other"] as const);
  const accessGrade = integer(500, 1000) / 100;
  const admissionGrade = Math.round(Math.min(14, accessGrade + random() * 4) * 100) / 100;
  const priorities = { interests: integer(0, 5), location: integer(0, 5), modality: integer(0, 5) };
  if (Object.values(priorities).every((value) => value === 0)) priorities.interests = 1;
  const profile: OrientationProfile = {
    ...structuredClone(emptyProfile),
    answers: Object.fromEntries(baseScaleQuestions.map(({ id }) => [id, { state: "answered", level: integer(0, 4) as Level }])),
    comparisons: Object.fromEntries(interestChoices.map(([id]) => [id, pick(comparisonOptions)[0]])),
    academicStatus: { access_grade: "estimated", admission_grade: "estimated", previous_studies: "confirmed", subjects: "confirmed" },
    access_route: accessRoute,
    previous_studies: accessRoute === "bachillerato" ? `Bachillerato: ${pick(["Ciencias y Tecnología", "Humanidades y Ciencias Sociales", "Artes"])} (simulado)`
      : accessRoute === "fp_superior" ? "Ciclo formativo de grado superior (simulado)" : "Otros estudios previos (simulados)",
    subjects: `Ejemplo simulado: ${pick(["Matemáticas", "Lengua", "Inglés"])} ${integer(5, 10)}`,
    access_grade: accessGrade,
    admission_grade: admissionGrade,
    origin_province: province,
    allowed_provinces: [...regions[region]],
    mobility: pick(["anywhere", "prefer_province", "require_province", "prefer_region", "require_region"] as const),
    budget: integer(10, 250) * 100,
    budget_strict: random() < 0.5,
    institution: pick(["public", "private", "either"] as const),
    modality: pick(["on_site", "online", "hybrid"] as const),
    modality_strict: random() < 0.5,
    max_years: integer(3, 6),
    distance: `Preferencia simulada: hasta ${pick([30, 60, 90])} minutos de desplazamiento`,
    priorities,
  };
  for (const area of selectExplorationAreas(profile)) {
    for (const [id] of subinterests[area]) profile.answers!["subinterests." + area + "." + id] = { state: "answered", level: integer(0, 4) as Level };
  }
  return profile;
}

export type Level = 0 | 1 | 2 | 3 | 4;
export type ScaleAnswer = { state: "answered"; level: Level } | { state: "unknown" };
export type ComparisonAnswer = "prefer_a" | "prefer_b" | "both" | "neither" | "unknown";
export type DataStatus = "confirmed" | "estimated" | "unknown";
export type Feasibility = "unknown" | "possible" | "conditional" | "impossible";
export type RequirementLevel = "mandatory" | "important" | "flexible" | "none";
export type AreaId = typeof areas[number][0];
export const calculationVersion = "orientation-profile-v2";
export const scaleLabels = ["Nada", "Poco", "Algo", "Bastante", "Muchísimo"] as const;
export const comparisonOptions = [
  ["prefer_a", "Prefiero claramente A"], ["prefer_b", "Prefiero claramente B"],
  ["both", "Me gustan ambas"], ["neither", "No me atrae ninguna"],
  ["unknown", "No conozco suficientemente alguna de ellas"],
] as const;
export const subinterests: Record<AreaId, readonly (readonly [string, string])[]> = {
  technology: [["programming", "Programación"], ["ai", "Inteligencia artificial"], ["security", "Ciberseguridad"], ["digital_design", "Diseño digital"]],
  engineering: [["robotics", "Robótica"], ["construction", "Construcción"], ["energy", "Energía"], ["products", "Diseño y desarrollo de productos"]],
  health: [["patients", "Atención a pacientes"], ["biomedical", "Investigación biomédica"], ["rehabilitation", "Rehabilitación"], ["wellbeing", "Prevención y bienestar"]],
  science: [["experiments", "Experimentación"], ["mathematics", "Matemáticas"], ["environment", "Medioambiente"], ["scientific_data", "Análisis científico de datos"]],
  business: [["marketing", "Marketing"], ["finance", "Finanzas"], ["enterprise", "Emprendimiento"], ["management", "Gestión de organizaciones"]],
  social: [["education", "Educación"], ["psychology", "Psicología"], ["law", "Derecho"], ["international", "Relaciones internacionales"]],
  humanities: [["history", "Historia"], ["languages", "Idiomas"], ["philosophy", "Filosofía"], ["heritage", "Patrimonio cultural"]],
  arts: [["graphic_design", "Diseño gráfico"], ["music", "Música"], ["visual", "Artes visuales"], ["audiovisual", "Creación audiovisual"]],
};
export const capacityQuestions = [
  ["logic", "Razonamiento lógico"], ["comprehension", "Comprensión de textos"], ["memory", "Memoria"],
  ["creativity", "Creatividad"], ["communication", "Comunicación"],
] as const;
export const activityQuestions = [
  ["problem_solving", "Resolver problemas"], ["research", "Investigar"], ["design", "Crear y diseñar"],
  ["help", "Ayudar a personas"], ["build", "Construir o desarrollar cosas"], ["analysis", "Analizar información"],
  ["teach", "Comunicar y enseñar"], ["lead", "Organizar o liderar"],
] as const;
export const motivationQuestions = [
  ["stability", "Estabilidad laboral"], ["social_impact", "Impacto social"], ["creativity", "Creatividad"],
  ["research", "Investigación y descubrimiento"], ["autonomy", "Autonomía"],
  ["technology", "Desarrollo tecnológico"], ["people", "Contacto con personas"], ["enterprise", "Emprendimiento"],
  ["salary", "Salario"],
] as const;
export const legacyQuestionMapping: Record<string, string> = {
  "Resolver problemas": "activities.problem_solving", "Crear y diseñar": "activities.design",
  "Ayudar a otras personas": "activities.help", "Experimentar": "activities.research",
  "Organizar proyectos": "activities.lead", "Investigación": "motivations.research",
  "Creatividad": "motivations.creativity", "Impacto social": "motivations.social_impact",
  "Autonomía": "motivations.autonomy", "Salario": "motivations.salary", "Estabilidad": "motivations.stability",
};
export const requirementLabels: Record<RequirementLevel, string> = {
  mandatory: "Requisito obligatorio", important: "Preferencia importante",
  flexible: "Preferencia flexible", none: "Sin preferencia",
};
export const baseScaleQuestions = [
  ...areas.map(([key, label]) => ({ id: "interests." + key, label, dimension: "interests" })),
  ...capacityQuestions.map(([key, label]) => ({ id: "capacities." + key, label, dimension: "capacities" })),
  ...activityQuestions.map(([key, label]) => ({ id: "activities." + key, label, dimension: "activities" })),
  ...motivationQuestions.map(([key, label]) => ({ id: "motivations." + key, label, dimension: "motivations" })),
];
export function normalizeLevel(level: number): number | null {
  return Number.isInteger(level) && level >= 0 && level <= 4 ? level * 25 : null;
}
export type ProfileMeasure = {
  questionId: string; dimension: string; state: "answered" | "unknown" | "unanswered";
  value: number | null; raw: ScaleAnswer | null;
};
export function scaleMeasure(profile: OrientationProfile, id: string): ProfileMeasure {
  const raw = profile.answers?.[id];
  const value = raw?.state === "answered" ? normalizeLevel(raw.level) : null;
  return { questionId: id, dimension: id.split(".")[0],
    state: value !== null ? "answered" : raw?.state === "unknown" ? "unknown" : "unanswered",
    value, raw: raw ?? null };
}
// Ties retain the fixed order in areas, independent of clicks or object insertion.
export function selectExplorationAreas(profile: OrientationProfile): AreaId[] {
  return areas.map(([id], order) => ({ id, order, value: scaleMeasure(profile, "interests." + id).value }))
    .filter((entry): entry is { id: AreaId; order: number; value: number } => entry.value !== null && entry.value > 0)
    .sort((a, b) => b.value - a.value || a.order - b.order).slice(0, 3).map(({ id }) => id);
}
export function deriveOrientationProfile(profile: OrientationProfile) {
  const exploredAreas = selectExplorationAreas(profile);
  const questions = [...baseScaleQuestions, ...exploredAreas.flatMap((area) => subinterests[area].map(([id, label]) => ({
    id: "subinterests." + area + "." + id, label, dimension: "subinterests",
  })))];
  const measures = Object.fromEntries(questions.map(({ id }) => [id, scaleMeasure(profile, id)]));
  const generalInterests = Object.fromEntries(areas.map(([id]) => [id, measures["interests." + id]])) as Record<AreaId, ProfileMeasure>;
  const comparisons = Object.fromEntries(areas.map(([id]) => [id, {
    relativeSum: 0, relativeCount: 0, preference: null as number | null,
    positive: 0, negative: 0, unknown: 0, unanswered: 0,
  }]));
  const activityEvidence: {
    questionId: string; area: string; activity: string; relative: number | null; absolute: number | null;
    state: "answered" | "unknown" | "unanswered";
  }[] = [];
  for (const [id, activityA, activityB] of interestChoices) {
    const [a, b] = id.split(":");
    const answer = profile.comparisons?.[id];
    const relative = answer === "prefer_a" ? 1 : answer === "prefer_b" ? -1 : null;
    const absolute = answer === "both" ? 1 : answer === "neither" ? -1 : null;
    const state = answer === undefined ? "unanswered" : answer === "unknown" ? "unknown" : "answered";
    activityEvidence.push(
      { questionId: id, area: a, activity: activityA, relative, absolute, state },
      { questionId: id, area: b, activity: activityB, relative: relative === null ? null : -relative, absolute, state },
    );
    if (relative !== null) {
      comparisons[a].relativeSum += relative;
      comparisons[b].relativeSum -= relative;
      comparisons[a].relativeCount++;
      comparisons[b].relativeCount++;
    } else {
      const field = answer === "both" ? "positive" : answer === "neither" ? "negative" : answer === "unknown" ? "unknown" : "unanswered";
      comparisons[a][field]++;
      comparisons[b][field]++;
    }
  }
  for (const evidence of Object.values(comparisons)) {
    if (evidence.relativeCount) evidence.preference = 50 + 50 * evidence.relativeSum / evidence.relativeCount;
  }
  const areaCoverage = Object.fromEntries(areas.map(([area]) => {
    const detailQuestions = exploredAreas.includes(area) ? subinterests[area] : [];
    const validDetails = detailQuestions.filter(([id]) => measures["subinterests." + area + "." + id].value !== null).length;
    const evidence = comparisons[area];
    const valid = (generalInterests[area].value !== null ? 1 : 0) + evidence.relativeCount + evidence.positive + evidence.negative + validDetails;
    return [area, { valid, applicable: 3 + detailQuestions.length, limited: valid < 2 }];
  }));
  const answeredScales = Object.values(measures).filter(({ state }) => state === "answered").length;
  const answeredComparisons = interestChoices.filter(([id]) => {
    const answer = profile.comparisons?.[id];
    return answer !== undefined && answer !== "unknown";
  }).length;
  const applicable = questions.length + interestChoices.length;
  const valid = answeredScales + answeredComparisons;
  return {
    generalInterests, measures, exploredAreas, activityEvidence, areaCoverage,
    legacySelections: [...profile.activities, ...profile.goals].map((label) => ({
      label, questionId: legacyQuestionMapping[label] ?? null,
    })),
    rankedAreas: areas.map(([id], order) => ({ id, order, value: generalInterests[id].value }))
      .filter((entry): entry is { id: AreaId; order: number; value: number } => entry.value !== null)
      .sort((a, b) => b.value - a.value || a.order - b.order),
    comparativePreferences: comparisons,
    subinterests: Object.fromEntries(exploredAreas.map((area) => [area, subinterests[area].map(([id, label]) => ({
      label, ...measures["subinterests." + area + "." + id],
    }))])),
    activityPreferences: activityQuestions.map(([id, label]) => ({ label, ...measures["activities." + id] })),
    perceivedCapacities: capacityQuestions.map(([id, label]) => ({ label, ...measures["capacities." + id] })),
    motivations: motivationQuestions.map(([id, label]) => ({ label, ...measures["motivations." + id] })),
    constraints: { mobility: profile.mobility, budget: profile.budget, budgetStrict: profile.budget_strict,
      modality: profile.modality, modalityStrict: profile.modality_strict, requirements: profile.requirements,
      location: profile.locationPreferences },
    priorities: { ...profile.priorities },
    coverage: { valid, applicable, percent: applicable ? Math.round(100 * valid / applicable) : null,
      scope: "Perfil de intereses, comparaciones, actividades, capacidades y motivaciones" },
    calculationVersion,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
// Legacy answers are retained verbatim. Only semantically safe values become new answers.
export function migrateOrientationProfile(value: unknown): OrientationProfile {
  if (!isRecord(value)) return structuredClone(emptyProfile);
  const profile = { ...structuredClone(emptyProfile), ...value } as OrientationProfile;
  const answers: Record<string, ScaleAnswer> = {};
  if (isRecord(value.answers)) {
    for (const [id, answer] of Object.entries(value.answers)) {
      if (!isRecord(answer)) continue;
      if (answer.state === "unknown") answers[id] = { state: "unknown" };
      if (answer.state === "answered" && typeof answer.level === "number" && normalizeLevel(answer.level) !== null) {
        answers[id] = { state: "answered", level: answer.level as Level };
      }
    }
  }
  const comparisons: NonNullable<OrientationProfile["comparisons"]> = {};
  if (isRecord(value.comparisons)) {
    for (const [id] of interestChoices) {
      const answer = value.comparisons[id];
      if (comparisonOptions.some(([key]) => key === answer)) comparisons[id] = answer as ComparisonAnswer;
    }
  }
  const legacy = value.schemaVersion !== 2;
  if (legacy) {
    profile.legacyAnswers = { ...value };
    if (isRecord(value.interests)) for (const [id] of areas) {
      const answer = value.interests[id];
      if (answer === "like" || answer === "dislike") answers["interests." + id] = { state: "answered", level: answer === "like" ? 4 : 0 };
    }
    if (isRecord(value.aptitudes)) for (const [id] of capacityQuestions) {
      const level = value.aptitudes[id];
      if (typeof level === "number" && normalizeLevel(level) !== null) answers["capacities." + id] = { state: "answered", level: level as Level };
    }
    // The old choices expressed a relative preference, never an absolute rejection.
    if (isRecord(value.interest_choices)) for (const [id] of interestChoices) {
      const answer = value.interest_choices[id];
      if (answer === "A" || answer === "B") comparisons[id] = answer === "A" ? "prefer_a" : "prefer_b";
    }
    // Checkbox selections have no intensity. Keep the originals for the review, request a new rating.
  }
  if (isRecord(value.locationPreferences)) {
    const location = value.locationPreferences;
    const list = (key: string) => Array.isArray(location[key]) ? location[key].filter((item): item is string => typeof item === "string" && Object.values(regions).flat().includes(item)) : [];
    const feasibility = (input: unknown): Feasibility => ["possible", "conditional", "impossible"].includes(String(input)) ? input as Feasibility : "unknown";
    profile.locationPreferences = { preferred: list("preferred"), acceptable: list("acceptable"), unavailable: list("unavailable"),
      moving: feasibility(location.moving), commuting: feasibility(location.commuting) };
  } else profile.locationPreferences = undefined;
  if (isRecord(value.requirements)) {
    profile.requirements = Object.fromEntries(Object.entries(value.requirements)
      .filter(([key, level]) => ["budget", "institution", "modality", "duration"].includes(key) && ["mandatory", "important", "flexible", "none"].includes(String(level))));
  } else profile.requirements = undefined;
  const defaults = emptyProfile as unknown as Record<string, unknown>;
  const enumValues: Record<string, readonly string[]> = {
    access_route: ["unknown", "bachillerato", "fp_superior", "other"],
    mobility: ["unknown", "anywhere", "prefer_province", "require_province", "prefer_region", "require_region"],
    institution: ["unknown", "public", "private", "either"], modality: ["unknown", "on_site", "online", "hybrid"],
  };
  for (const [key, options] of Object.entries(enumValues)) {
    if (!options.includes(String(value[key]))) Object.assign(profile, { [key]: defaults[key] });
  }
  profile.origin_province = typeof value.origin_province === "string" ? value.origin_province : null;
  profile.origin_region = typeof value.origin_region === "string" && regions[value.origin_region] ? value.origin_region : undefined;
  for (const key of ["access_grade", "admission_grade", "budget", "max_years"] as const) {
    profile[key] = typeof value[key] === "number" && Number.isFinite(value[key]) ? value[key] : null;
  }
  profile.budget_strict = value.budget_strict === true;
  profile.modality_strict = value.modality_strict === true;
  if (!isRecord(profile.academicStatus)) profile.academicStatus = undefined;
  profile.academicStatus ??= {
    access_grade: profile.access_grade == null ? "unknown" : "estimated",
    admission_grade: profile.admission_grade == null ? "unknown" : "estimated",
    previous_studies: "unknown", subjects: "unknown",
  };
  profile.academicStatus = { ...profile.academicStatus };
  for (const key of ["access_grade", "admission_grade", "previous_studies", "subjects"] as const) {
    if (!["confirmed", "estimated", "unknown"].includes(profile.academicStatus[key])) profile.academicStatus[key] = "unknown";
  }
  profile.answers = answers;
  profile.comparisons = comparisons;
  profile.schemaVersion = 2;
  for (const key of ["interests", "aptitudes", "priorities"] as const) {
    if (!isRecord(profile[key])) Object.assign(profile, { [key]: structuredClone(emptyProfile[key]) });
  }
  for (const key of ["activities", "goals", "allowed_provinces"] as const) {
    profile[key] = Array.isArray(profile[key]) ? profile[key].filter((entry) => typeof entry === "string") : [];
  }
  profile.priorities = Object.fromEntries(Object.entries(emptyProfile.priorities).map(([key, fallback]) => {
    const value = profile.priorities[key];
    return [key, typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 5 ? value : fallback];
  }));
  profile.previous_studies = typeof profile.previous_studies === "string" ? profile.previous_studies : "";
  profile.subjects = typeof profile.subjects === "string" ? profile.subjects : "";
  profile.distance = typeof profile.distance === "string" ? profile.distance : "";
  return profile;
}

// The ranking consumes declared area interest only. All other profile dimensions stay separate.
export function toOrientationEngineProfile(input: OrientationProfile) {
  const profile = migrateOrientationProfile(input);
  const derived = deriveOrientationProfile(profile);
  const areaScores = Object.fromEntries(Object.entries(derived.generalInterests)
    .filter(([, measure]) => measure.value !== null).map(([id, measure]) => [id, measure.value]));
  const { answers, comparisons, legacyAnswers, ...original } = profile;
  void answers; void comparisons; void legacyAnswers;
  return { ...original, interests: {}, interest_choices: {}, area_interest_scores: areaScores, calculation_version: calculationVersion };
}
export function profileValidationMessages(profile: OrientationProfile): string[] {
  const messages: string[] = [];
  for (const [key, maximum] of [["access_grade", 10], ["admission_grade", 14]] as const) {
    const value = profile[key];
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > maximum)) messages.push("Revisa la nota de " + (key === "access_grade" ? "acceso (0–10)." : "admisión (0–14)."));
  }
  if (profile.access_grade !== null && profile.admission_grade !== null && profile.admission_grade < profile.access_grade) {
    messages.push("La nota de admisión indicada es menor que la de acceso. Revisa ambas estimaciones.");
  }
  if (profile.budget !== null && (!Number.isFinite(profile.budget) || profile.budget < 0 || profile.budget > 1000000)) messages.push("Revisa el presupuesto anual indicado.");
  if (profile.max_years !== null && (!Number.isInteger(profile.max_years) || profile.max_years < 1 || profile.max_years > 10)) messages.push("Indica una duración máxima de 1 a 10 años.");
  if (profile.budget_strict && profile.budget === null) messages.push("Indica el presupuesto máximo o cambia su nivel de exigencia.");
  if (profile.modality_strict && profile.modality === "unknown") messages.push("Elige una modalidad para establecerla como obligatoria.");
  for (const key of ["institution", "duration"] as const) {
    const missing = key === "institution" ? ["unknown", "either"].includes(profile.institution) : profile.max_years === null;
    if (profile.requirements?.[key] === "mandatory" && missing) messages.push("Completa el requisito obligatorio de " + (key === "institution" ? "tipo de universidad." : "duración."));
  }
  if (profile.requirements?.modality === "none" && profile.modality !== "unknown") messages.push("Has elegido una modalidad y marcado «Sin preferencia». Revisa su importancia.");
  for (const key of ["access_grade", "admission_grade", "previous_studies", "subjects"] as const) {
    if (profile.academicStatus?.[key] !== undefined && profile.academicStatus[key] !== "unknown" && (profile[key] === null || profile[key] === "")) {
      messages.push("Completa el dato académico marcado como confirmado o estimado, o indica que es desconocido.");
    }
  }
  const location = profile.locationPreferences;
  if (location) {
    const overlap = [...location.preferred, ...location.acceptable].some((name) => location.unavailable.includes(name));
    if (overlap) messages.push("Hay provincias marcadas como aceptables y como imposibles. Revisa la ubicación.");
    if (location.moving === "impossible" && profile.mobility === "anywhere") messages.push("Has indicado cualquier provincia y que mudarte es imposible. Revisa tus condiciones de desplazamiento.");
  }
  return messages;
}
export const orientationStorageKey = "aaahoraque.degrees.orientation";
export function readOrientationSession(raw: string | null) {
  try {
    const saved: unknown = JSON.parse(raw ?? "null");
    if (!isRecord(saved)) return {};
    if (!("draft" in saved) && !("profile" in saved) && ("interests" in saved || "answers" in saved)) {
      return { draft: migrateOrientationProfile(saved), step: 0, isRandomProfile: false };
    }
    return {
      draft: saved.draft ? migrateOrientationProfile(saved.draft) : undefined,
      profile: saved.profile ? migrateOrientationProfile(saved.profile) : undefined,
      step: typeof saved.step === "number" && Number.isInteger(saved.step) ? Math.max(0, Math.min(orientationReviewStep, saved.step)) : 0,
      isRandomProfile: saved.isRandomProfile === true,
    };
  } catch { return {}; }
}
