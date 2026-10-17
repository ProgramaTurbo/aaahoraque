from typing import Any

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
from app.modules.subjects.sensitivity import analyze_sensitivity
from app.modules.subjects.scenarios import (
    compare_scenario,
    run_scenario,
)
from app.modules.subjects.academic_state import StudentAcademicState
from app.modules.subjects.eligibility import evaluate_subject_eligibility
from app.modules.subjects.decision_summary import generate_decision_summary


router = APIRouter(
    prefix="/subjects",
    tags=["Subjects Decision"],
)


class SubjectAnalysisRequest(BaseModel):
    student: SubjectDecisionProfile
    academic_state: StudentAcademicState
    priorities: SubjectDecisionPriorities
    subjects: list[Subject]


class SubjectAnalysisResult(BaseModel):
    id: str
    name: str
    criteria: dict[str, float]
    balance_score: float
    explanations: dict[str, list[str]]
    eligibility: dict


class SubjectAnalysisResponse(BaseModel):
    alternatives: list[SubjectAnalysisResult]
    comparison: dict
    tradeoffs: list[dict[str, str]]
    global_insight: str | None
    sensitivity: dict
    decision_summary: dict

class SubjectScenarioRequest(BaseModel):
    student: SubjectDecisionProfile
    priorities: SubjectDecisionPriorities
    subjects: list[Subject]
    changes: dict[str, Any]


class SubjectScenarioResponse(BaseModel):
    changes: dict[str, Any]
    alternatives: list[dict]
    comparison: list[dict]


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

        eligibility = evaluate_subject_eligibility(
            subject,
            request.academic_state,
        )

        result = SubjectAnalysisResult(
            id=subject.id,
            name=subject.name,
            criteria=analysis["criteria"],
            balance_score=analysis["balance_score"],
            explanations=analysis["explanations"],
            eligibility=eligibility,
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

    sensitivity = analyze_sensitivity(
        comparison_input,
        request.priorities,
    )

    decision_summary = generate_decision_summary(
        [alternative.model_dump() for alternative in alternatives]
    )

    return SubjectAnalysisResponse(
        alternatives=alternatives,
        comparison=comparison,
        tradeoffs=tradeoffs,
        global_insight=global_insight,
        sensitivity=sensitivity,
        decision_summary=decision_summary,
    )

@router.post(
    "/scenario",
    response_model=SubjectScenarioResponse,
)
def analyze_subject_scenario(
    request: SubjectScenarioRequest,
) -> SubjectScenarioResponse:
    base_alternatives = []

    for subject in request.subjects:
        analysis = analyze_subject_with_priorities(
            request.student,
            subject,
            request.priorities,
        )

        base_alternatives.append(
            {
                "id": subject.id,
                "name": subject.name,
                "criteria": analysis["criteria"],
                "balance_score": analysis["balance_score"],
                "explanations": analysis["explanations"],
            }
        )

    scenario = run_scenario(
        request.student,
        request.subjects,
        request.priorities,
        request.changes,
    )

    comparison = compare_scenario(
        base_alternatives,
        scenario["alternatives"],
    )

    return SubjectScenarioResponse(
        changes=request.changes,
        alternatives=scenario["alternatives"],
        comparison=comparison,
    )

