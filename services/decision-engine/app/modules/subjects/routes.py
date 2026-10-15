from fastapi import APIRouter
from pydantic import BaseModel

from app.modules.subjects.models import Subject
from app.modules.subjects.scoring import analyze_subject_with_priorities
from app.modules.subjects.student_profile import SubjectDecisionProfile
from app.modules.subjects.decision_preferences import SubjectDecisionPriorities
from app.modules.subjects.comparison import compare_alternatives
from app.modules.subjects.tradeoffs import (
    generate_global_insight,
    generate_tradeoffs,
)


router = APIRouter(
    prefix="/subjects",
    tags=["Subjects Decision"],
)


class SubjectAnalysisRequest(BaseModel):
    student: SubjectDecisionProfile
    priorities: SubjectDecisionPriorities
    subjects: list[Subject]


class SubjectAnalysisResult(BaseModel):
    id: str
    name: str
    criteria: dict[str, float]
    balance_score: float
    explanations: dict[str, list[str]]


class SubjectAnalysisResponse(BaseModel):
    alternatives: list[SubjectAnalysisResult]
    comparison: dict
    tradeoffs: list[dict[str, str]]
    global_insight: str | None


@router.post("/analyze", response_model=SubjectAnalysisResponse)
def analyze_subjects(
    request: SubjectAnalysisRequest,
) -> SubjectAnalysisResponse:
    alternatives = []

    comparison_input = []

    for subject in request.subjects:
        analysis = analyze_subject_with_priorities(
            request.student,
            subject,
            request.priorities,
        )

        result = SubjectAnalysisResult(
            id=subject.id,
            name=subject.name,
            criteria=analysis["criteria"],
            balance_score=analysis["balance_score"],
            explanations=analysis["explanations"],
        )

        alternatives.append(result)

        comparison_input.append(
            {
                "id": subject.id,
                "name": subject.name,
                "criteria": analysis["criteria"],
                "balance_score": analysis["balance_score"],
            }
        )

    comparison = compare_alternatives(
        comparison_input
    )

    tradeoffs = generate_tradeoffs(
        comparison
    )

    global_insight = generate_global_insight(
        comparison_input,
        comparison,
    )

    return SubjectAnalysisResponse(
        alternatives=alternatives,
        comparison=comparison,
        tradeoffs=tradeoffs,
        global_insight=global_insight,
    )