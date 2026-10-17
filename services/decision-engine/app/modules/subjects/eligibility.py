from typing import Any

from app.modules.subjects.academic_state import StudentAcademicState
from app.modules.subjects.models import Subject


def evaluate_subject_eligibility(
    subject: Subject,
    academic_state: StudentAcademicState,
) -> dict[str, Any]:
    violations = []

    # Una asignatura superada no debe recomendarse para volver a cursarla.
    if subject.id in academic_state.completed_subject_ids:
        violations.append(
            {
                "type": "already_completed",
                "value": subject.id,
                "description": "Ya has superado esta asignatura.",
            }
        )

    # Comprobamos los prerrequisitos de la asignatura.
    for prerequisite in subject.prerequisites:

        if prerequisite.type == "subject":
            if prerequisite.value not in academic_state.completed_subject_ids:
                violations.append(
                    {
                        "type": "missing_subject",
                        "value": prerequisite.value,
                        "description": (
                            prerequisite.description
                            or f"Debes haber superado {prerequisite.value}."
                        ),
                    }
                )

        elif prerequisite.type == "credits":
            try:
                required_credits = float(prerequisite.value)
            except ValueError:
                violations.append(
                    {
                        "type": "invalid_prerequisite",
                        "value": prerequisite.value,
                        "description": "El requisito de créditos no es válido.",
                    }
                )
                continue

            if academic_state.earned_credits < required_credits:
                violations.append(
                    {
                        "type": "insufficient_credits",
                        "value": prerequisite.value,
                        "description": (
                            f"Necesitas {required_credits:g} créditos superados. "
                            f"Actualmente tienes {academic_state.earned_credits:g}."
                        ),
                    }
                )

        elif prerequisite.type == "other":
            violations.append(
                {
                    "type": "requires_verification",
                    "value": prerequisite.value,
                    "description": (
                        prerequisite.description
                        or "Este requisito requiere comprobación adicional."
                    ),
                }
            )

    return {
        "subject_id": subject.id,
        "eligible": len(violations) == 0,
        "violations": violations,
    }
