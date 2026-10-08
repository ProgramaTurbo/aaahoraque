from pydantic import BaseModel, Field


class Subject(BaseModel):
    id: str
    name: str
    ects: float = Field(gt=0)

    area: str

    difficulty: float = Field(ge=0, le=10)
    workload: float = Field(ge=0, le=10)

    theoretical_component: float = Field(ge=0, le=10)
    practical_component: float = Field(ge=0, le=10)

    professional_relevance: float = Field(ge=0, le=10)

    prerequisites: list[str] = []
class Specialization(BaseModel):
    id: str
    name: str

    areas: list[str]

    theoretical_component: float = Field(ge=0, le=10)
    practical_component: float = Field(ge=0, le=10)

    software_orientation: float = Field(ge=0, le=10)
    hardware_orientation: float = Field(ge=0, le=10)
    data_orientation: float = Field(ge=0, le=10)
    management_orientation: float = Field(ge=0, le=10)
