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
