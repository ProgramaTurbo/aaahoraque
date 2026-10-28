"""Contrato y evaluación inicial de orientación; no es una prueba psicométrica."""
import unicodedata
from typing import Literal
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/degrees", tags=["Degree Decision"])

# Heurística editorial explícita: el nombre no sustituye al plan ni mide aptitudes.
AREAS = {
    "technology": ["informat", "software", "comput", "datos", "artificial", "telecom", "ciberseg"],
    "engineering": ["ingenier", "arquitect", "industrial", "electron", "robot", "mecanic"],
    "health": ["medicina", "enfermer", "fisioter", "odont", "farmacia", "terapia", "nutric", "veterin", "psicolog", "logopedia"],
    "science": ["matematic", "fisica", "quimica", "biolog", "biotec", "geolog", "ambient", "estadist"],
    "business": ["econom", "empresa", "finanz", "contab", "marketing", "comercio", "turismo"],
    "social": ["derecho", "social", "sociolog", "politic", "educa", "maestro", "pedagog", "criminolog", "relaciones internacionales"],
    "humanities": ["historia", "filolog", "filosof", "lengua", "traducc", "humanidad", "literatura", "arqueolog"],
    "arts": ["arte", "diseno", "musica", "audiovisual", "cine", "animacion", "conservacion", "publicidad"],
}

def norm(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text.lower()) if unicodedata.category(c) != "Mn")

class OrientationProfile(BaseModel):
    interests: dict[str, Literal["like", "dislike"]] = Field(default_factory=dict)
    aptitudes: dict[str, int] = Field(default_factory=dict)
    activities: list[str] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    access_route: Literal["unknown", "bachillerato", "fp_superior", "other"] = "unknown"
    previous_studies: str = Field(default="", max_length=200)
    subjects: str = Field(default="", max_length=2000)
    access_grade: float | None = Field(default=None, ge=0, le=10, allow_inf_nan=False)
    admission_grade: float | None = Field(default=None, ge=0, le=14, allow_inf_nan=False)
    origin_province: str | None = Field(default=None, max_length=100)
    allowed_provinces: list[str] = Field(default_factory=list, max_length=60)
    mobility: Literal["unknown", "anywhere", "prefer_province", "require_province", "prefer_region", "require_region"] = "unknown"
    budget: float | None = Field(default=None, ge=0, le=1000000, allow_inf_nan=False)
    budget_strict: bool = False
    institution: Literal["unknown", "public", "private", "either"] = "unknown"
    modality: Literal["unknown", "on_site", "online", "hybrid"] = "unknown"
    modality_strict: bool = False
    max_years: int | None = Field(default=None, ge=1, le=10)
    distance: str = Field(default="", max_length=150)
    priorities: dict[str, float] = Field(default_factory=lambda: {"interests": 1, "location": 1, "modality": 1})

class Candidate(BaseModel):
    id: str
    name: str
    province: str | None = None
    modality: str | None = None

class OrientationRequest(BaseModel):
    profile: OrientationProfile
    alternatives: list[Candidate] = Field(max_length=30000)


def analyze(request: OrientationRequest) -> dict:
    p = request.profile
    if any(key not in AREAS for key in p.interests):
        raise ValueError("Área de interés no válida")
    if any(not 0 <= value <= 4 for value in p.aptitudes.values()):
        raise ValueError("Autoevaluación fuera de rango")
    if any(key not in {"interests", "location", "modality"} or not 0 <= value <= 5 for key, value in p.priorities.items()):
        raise ValueError("Prioridad no válida")
    allowed = {norm(value) for value in p.allowed_provinces}
    if p.mobility in {"prefer_province", "require_province"}:
        allowed = {norm(p.origin_province)} if p.origin_province else set()
    location_active = p.mobility not in {"unknown", "anywhere"} and bool(allowed)
    active = []
    if p.interests and p.priorities.get("interests", 0) > 0: active.append("interests")
    if location_active and p.priorities.get("location", 0) > 0: active.append("location")
    if p.modality != "unknown" and p.priorities.get("modality", 0) > 0: active.append("modality")
    results, excluded = [], 0
    for candidate in request.alternatives:
        name = norm(candidate.name)
        areas = [key for key, words in AREAS.items() if any(word in name for word in words)]
        scores, reasons, pending, violations = {}, [], ["Admisión y requisitos oficiales sin verificar"], []
        if "interests" in active:
            known = [key for key in areas if key in p.interests]
            if known:
                scores["interests"] = sum(100 if p.interests[key] == "like" else 0 for key in known) / len(known)
                reasons.append("Intereses: coincidencia provisional por el nombre de la titulación, no por un análisis de su plan")
            else:
                pending.append("No hay una relación documentada entre tus intereses y esta titulación")
        if location_active:
            if candidate.province:
                matches = norm(candidate.province) in allowed
                if not matches and p.mobility.startswith("require"):
                    violations.append("Ubicación fuera de tu restricción territorial")
                if "location" in active:
                    scores["location"] = 100 if matches else 0
                    reasons.append("Centro en tu zona elegida" if matches else "Centro fuera de tu zona preferida")
            else:
                pending.append("Provincia del centro desconocida: restricción territorial sin verificar")
        elif p.mobility.startswith("require"):
            pending.append("Falta indicar el territorio para comprobar tu restricción")
        if p.modality != "unknown":
            normalized_modality = {
                "on_site": "on_site", "presencial": "on_site",
                "online": "online", "a distancia": "online", "no presencial": "online",
                "hybrid": "hybrid", "hibrida": "hybrid", "semipresencial": "hybrid",
            }.get(norm(candidate.modality or ""))
            if normalized_modality:
                matches = normalized_modality == p.modality
                if not matches and p.modality_strict: violations.append("Modalidad incompatible con tu condición obligatoria")
                if "modality" in active:
                    scores["modality"] = 100 if matches else 0
                    reasons.append("Modalidad coincidente" if matches else "Modalidad distinta de la preferida")
            else: pending.append("Modalidad desconocida o ambigua: requiere verificación")
        if violations:
            excluded += 1
            continue
        if p.budget is not None: pending.append("Costes desconocidos: presupuesto pendiente de comprobar" + (" (límite obligatorio)" if p.budget_strict else ""))
        if p.institution not in {"unknown", "either"}: pending.append("Titularidad pública/privada pendiente de comprobar")
        if p.max_years is not None: pending.append("Duración máxima pendiente de comprobar")
        if p.aptitudes: pending.append("Autoevaluación recogida; faltan perfiles de aptitud por titulación")
        if p.goals or p.activities: pending.append("Objetivos y actividades recogidos; relación con titulaciones pendiente de modelar")
        if p.access_grade is not None or p.admission_grade is not None or p.subjects or p.previous_studies:
            pending.append("Expediente recogido; no se calcula admisión sin reglas oficiales")
        if p.distance: pending.append("No se calculan kilómetros ni tiempos de desplazamiento")
        complete = bool(active) and all(key in scores for key in active)
        total = sum(p.priorities[key] for key in active)
        score = round(sum(scores[key] * p.priorities[key] for key in active) / total, 1) if complete else None
        results.append({"id": candidate.id, "score": score, "criteria": scores,
            "coverage": {"evaluated": len(scores), "requested": len(active)}, "areas": areas,
            "reasons": reasons, "pending": pending, "status": "pending_verification"})
    # No global ranking between complete and incomplete aggregates. Nulls follow with explanation.
    results.sort(key=lambda r: (r["score"] is None, -(r["score"] or 0), r["id"]))
    return {"alternatives": results, "excluded": excluded, "active_criteria": active,
        "method": "orientation-v1-name-heuristic", "partial": not bool(active)}

@router.post("/orient")
def orient(request: OrientationRequest):
    from fastapi import HTTPException
    try:
        return analyze(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
