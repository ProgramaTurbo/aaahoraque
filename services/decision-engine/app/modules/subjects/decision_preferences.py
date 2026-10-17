from pydantic import BaseModel, Field


class SubjectDecisionPriorities(BaseModel):
    academic_affinity: float = Field(ge=0)
    professional_alignment: float = Field(ge=0)
    learning_compatibility: float = Field(ge=0)
    effort_compatibility: float = Field(ge=0)

    def normalized(self) -> dict[str, float]:
        values = {
            "academic_affinity": self.academic_affinity,
            "professional_alignment": self.professional_alignment,
            "learning_compatibility": self.learning_compatibility,
            "effort_compatibility": self.effort_compatibility,
        }

        total = sum(values.values())

        if total == 0:
            return {
                key: 0.25
                for key in values
            }

        return {
            key: value / total
            for key, value in values.items()
        }
