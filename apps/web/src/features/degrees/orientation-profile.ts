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
  const interests: OrientationProfile["interests"] = Object.fromEntries(areas.map(([key]) => [key, random() < 0.5 ? "like" : "dislike"]));
  interests[pick(areas)[0]] = "like";
  const priorities = { interests: integer(0, 5), location: integer(0, 5), modality: integer(0, 5) };
  if (Object.values(priorities).every((value) => value === 0)) priorities.interests = 1;
  const activities = ["Resolver problemas", "Crear y diseñar", "Ayudar a otras personas", "Leer y argumentar", "Experimentar", "Organizar proyectos"];
  const goals = ["Investigación", "Creatividad", "Impacto social", "Autonomía", "Salario", "Estabilidad"];
  return {
    ...emptyProfile,
    interests,
    aptitudes: Object.fromEntries(["logic", "comprehension", "memory", "creativity", "communication"].map((key) => [key, integer(0, 4)])),
    activities: activities.filter(() => random() < 0.5),
    goals: goals.filter(() => random() < 0.5),
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
}
