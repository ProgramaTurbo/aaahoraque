from typing import Literal

from pydantic import BaseModel, Field, field_validator


AccessRoute = Literal[
    "bachillerato",
    "fp_superior",
    "other",
    "unknown",
]

FeasibilityStatus = Literal[
    "viable",
    "no_viable",
    "pending_verification",
    "insufficient_data",
]


class DegreeDecisionProfile(BaseModel):
    """Perfil académico y preferencias del estudiante."""

    access_route: AccessRoute = "unknown"
    baccalaureate_modality: str | None = None
    vocational_family: str | None = None
    previous_qualification: str | None = None

    overall_grade: float | None = Field(
        default=None,
        ge=0,
        le=10,
    )
    access_grade: float | None = Field(
        default=None,
        ge=0,
    )
    subject_grades: dict[str, float] = Field(
        default_factory=dict,
    )

    academic_interests: dict[str, float] = Field(
        default_factory=dict,
    )
    professional_interests: dict[str, float] = Field(
        default_factory=dict,
    )

    @field_validator("subject_grades")
    @classmethod
    def validate_subject_grades(
        cls,
        grades: dict[str, float],
    ) -> dict[str, float]:
        for subject, grade in grades.items():
            if not 0 <= grade <= 10:
                raise ValueError(
                    f"Grade for '{subject}' must be between 0 and 10."
                )
        return grades

    @field_validator("academic_interests", "professional_interests")
    @classmethod
    def validate_interest_profiles(
        cls,
        profile: dict[str, float],
    ) -> dict[str, float]:
        for key, value in profile.items():
            if not 0 <= value <= 1:
                raise ValueError(
                    f"Interest value for '{key}' must be between 0 and 1."
                )
        return profile


class DegreeDecisionPriorities(BaseModel):
    """Pesos de los criterios flexibles de decisión."""

    academic_affinity: float = Field(ge=0)
    professional_alignment: float = Field(ge=0)
    study_plan_alignment: float = Field(ge=0)
    location_compatibility: float = Field(ge=0)
    cost_compatibility: float = Field(ge=0)

    def normalized(self) -> dict[str, float]:
        values = {
            "academic_affinity": self.academic_affinity,
            "professional_alignment": self.professional_alignment,
            "study_plan_alignment": self.study_plan_alignment,
            "location_compatibility": self.location_compatibility,
            "cost_compatibility": self.cost_compatibility,
        }

        total = sum(values.values())

        if total == 0:
            return {
                key: 1 / len(values)
                for key in values
            }

        return {
            key: value / total
            for key, value in values.items()
        }


class DegreeAlternative(BaseModel):
    """Datos de una oferta concreta para evaluar una alternativa."""

    offering_id: str
    degree_id: str
    university_id: str
    academic_year: str | None = None

    previous_cutoff_grade: float | None = Field(
        default=None,
        ge=0,
    )
    available_places: int | None = Field(
        default=None,
        ge=0,
    )
    tuition_cost: float | None = Field(
        default=None,
        ge=0,
    )
    teaching_language: str | None = None
    location: str | None = None


class ConstraintIssue(BaseModel):
    """Restricción incumplida o requisito que necesita verificación."""

    type: str
    description: str
    value: str | None = None


class DegreeEligibilityResult(BaseModel):
    """Resultado explicable de la evaluación de viabilidad."""

    offering_id: str
    status: FeasibilityStatus
    violations: list[ConstraintIssue] = Field(
        default_factory=list,
    )
    pending_checks: list[ConstraintIssue] = Field(
        default_factory=list,
    )
    missing_data: list[str] = Field(
        default_factory=list,
    )
