from copy import deepcopy
from typing import Any

from app.modules.subjects.decision_preferences import SubjectDecisionPriorities
from app.modules.subjects.models import Subject
from app.modules.subjects.scoring import analyze_subject_with_priorities
from app.modules.subjects.student_profile import SubjectDecisionProfile


def apply_profile_changes(
    student: SubjectDecisionProfile,
    changes: dict[str, Any],
) -> SubjectDecisionProfile:
    data = student.model_dump()

    for field, value in changes.items():
        if field in {
            "theory_preference",
            "practice_preference",
            "project_preference",
            "teamwork_preference",
            "difficulty_tolerance",
            "workload_tolerance",
        }:
            data[field] = value

        elif field.startswith("academic_interests."):
            key = field.split(".", 1)[1]
            data["academic_interests"][key] = value

        elif field.startswith("professional_interests."):
            key = field.split(".", 1)[1]
            data["professional_interests"][key] = value

        else:
            raise ValueError(
                f"Unsupported profile field: {field}"
            )

    return SubjectDecisionProfile(**data)

def run_scenario(
    student: SubjectDecisionProfile,
    subjects: list[Subject],
    priorities: SubjectDecisionPriorities,
    changes: dict[str, Any],
) -> dict[str, Any]:
    modified_student = apply_profile_changes(
        student,
        changes,
    )

    alternatives = []

    for subject in subjects:
        analysis = analyze_subject_with_priorities(
            modified_student,
            subject,
            priorities,
        )

        alternatives.append(
            {
                "id": subject.id,
                "name": subject.name,
                "criteria": analysis["criteria"],
                "balance_score": analysis["balance_score"],
                "explanations": analysis["explanations"],
            }
        )

    alternatives.sort(
        key=lambda item: item["balance_score"],
        reverse=True,
    )

    return {
        "changes": changes,
        "student": modified_student.model_dump(),
        "alternatives": alternatives,
    }

def compare_scenario(
    base_alternatives: list[dict[str, Any]],
    scenario_alternatives: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    base_by_id = {
        alternative["id"]: alternative
        for alternative in base_alternatives
    }

    comparison = []

    for scenario_alternative in scenario_alternatives:
        alternative_id = scenario_alternative["id"]

        if alternative_id not in base_by_id:
            continue

        base = base_by_id[alternative_id]

        delta = round(
            scenario_alternative["balance_score"]
            - base["balance_score"],
            2,
        )

        comparison.append(
            {
                "id": alternative_id,
                "name": scenario_alternative["name"],
                "base_score": base["balance_score"],
                "scenario_score": scenario_alternative["balance_score"],
                "delta": delta,
            }
        )

    comparison.sort(
        key=lambda item: item["scenario_score"],
        reverse=True,
    )

    return comparison
