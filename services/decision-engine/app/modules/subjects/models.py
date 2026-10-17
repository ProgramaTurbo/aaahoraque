from typing import Literal

from pydantic import BaseModel, Field, field_validator
from typing import Any


class Prerequisite(BaseModel):
    type: Literal["subject", "credits", "other"]
    value: str
    description: str | None = None


class Subject(BaseModel):
    id: str
    name: str

    ects: float = Field(gt=0)

    academic_year: int = Field(ge=1)
    semester: Literal[1, 2, "annual"]

    specialization_ids: list[str] = []

    area_profile: dict[str, float]
    professional_profile: dict[str, float]

    theoretical_component: float = Field(ge=0, le=10)
    practical_component: float = Field(ge=0, le=10)
    project_component: float = Field(ge=0, le=10)
    teamwork_component: float = Field(ge=0, le=10)

    estimated_difficulty: float = Field(ge=0, le=10)
    estimated_workload: float = Field(ge=0, le=10)

    competencies: list[str] = []
    prerequisites: list[Prerequisite] = []

    @field_validator("area_profile", "professional_profile")
    @classmethod
    def validate_profile(cls, profile: dict[str, float]) -> dict[str, float]:
        for key, value in profile.items():
            if not 0 <= value <= 1:
                raise ValueError(
                    f"Profile value for '{key}' must be between 0 and 1."
                )
        return profile


class Specialization(BaseModel):
    id: str
    name: str

    subject_ids: list[str]

    area_profile: dict[str, float]
    professional_profile: dict[str, float]

    theoretical_component: float = Field(ge=0, le=10)
    practical_component: float = Field(ge=0, le=10)
    project_component: float = Field(ge=0, le=10)

    competencies: list[str] = []

    @field_validator("area_profile", "professional_profile")
    @classmethod
    def validate_profile(cls, profile: dict[str, float]) -> dict[str, float]:
        for key, value in profile.items():
            if not 0 <= value <= 1:
                raise ValueError(
                    f"Profile value for '{key}' must be between 0 and 1."
                )
        return profile

class SubjectScenarioRequest(BaseModel):
    student: SubjectDecisionProfile
    priorities: SubjectDecisionPriorities
    subjects: list[Subject]
    changes: dict[str, Any]


class SubjectScenarioResponse(BaseModel):
    changes: dict[str, Any]
    alternatives: list[dict]
    comparison: list[dict]


