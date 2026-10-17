from pydantic import BaseModel, Field


class SubjectDecisionProfile(BaseModel):
    """
    Perfil del estudiante utilizado por el módulo de decisión
    de asignaturas y especializaciones.
    """

    academic_interests: dict[str, float]
    professional_interests: dict[str, float]

    theory_preference: float = Field(ge=0, le=10)
    practice_preference: float = Field(ge=0, le=10)
    project_preference: float = Field(ge=0, le=10)
    teamwork_preference: float = Field(ge=0, le=10)

    difficulty_tolerance: float = Field(ge=0, le=10)
    workload_tolerance: float = Field(ge=0, le=10)
