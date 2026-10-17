from pydantic import BaseModel, Field


class StudentAcademicState(BaseModel):
    completed_subject_ids: list[str] = Field(default_factory=list)
    earned_credits: float = Field(default=0, ge=0)
