from app.modules.subjects.models import Subject
from app.modules.subjects.student_profile import SubjectDecisionProfile
from app.modules.subjects.decision_preferences import SubjectDecisionPriorities
from app.modules.subjects.explanation import explain_subject


def weighted_profile_match(
    student_values: dict[str, float],
    alternative_profile: dict[str, float],
) -> float:
    """
    Calcula el ajuste entre las preferencias/intereses del estudiante
    y el perfil de una alternativa.

    student_values usa escala 0-10.
    alternative_profile usa intensidades 0-1.

    Devuelve una puntuación 0-10.
    """

    total_weight = sum(alternative_profile.values())

    if total_weight == 0:
        return 0.0

    weighted_score = sum(
        student_values.get(key, 0.0) * weight
        for key, weight in alternative_profile.items()
    )

    return weighted_score / total_weight


def academic_affinity(
    student: SubjectDecisionProfile,
    subject: Subject,
) -> float:
    return weighted_profile_match(
        student.academic_interests,
        subject.area_profile,
    )


def professional_alignment(
    student: SubjectDecisionProfile,
    subject: Subject,
) -> float:
    return weighted_profile_match(
        student.professional_interests,
        subject.professional_profile,
    )


def learning_compatibility(
    student: SubjectDecisionProfile,
    subject: Subject,
) -> float:
    differences = [
        abs(student.theory_preference - subject.theoretical_component),
        abs(student.practice_preference - subject.practical_component),
        abs(student.project_preference - subject.project_component),
        abs(student.teamwork_preference - subject.teamwork_component),
    ]

    average_difference = sum(differences) / len(differences)

    return max(0.0, 10.0 - average_difference)


def effort_compatibility(
    student: SubjectDecisionProfile,
    subject: Subject,
) -> float:
    difficulty_difference = abs(
        student.difficulty_tolerance - subject.estimated_difficulty
    )

    workload_difference = abs(
        student.workload_tolerance - subject.estimated_workload
    )

    average_difference = (
        difficulty_difference + workload_difference
    ) / 2

    return max(0.0, 10.0 - average_difference)

def analyze_subject(
    student: SubjectDecisionProfile,
    subject: Subject,
) -> dict[str, float]:
    return {
        "academic_affinity": round(
            academic_affinity(student, subject), 2
        ),
        "professional_alignment": round(
            professional_alignment(student, subject), 2
        ),
        "learning_compatibility": round(
            learning_compatibility(student, subject), 2
        ),
        "effort_compatibility": round(
            effort_compatibility(student, subject), 2
        ),
    }

def calculate_balance_score(
    criteria: dict[str, float],
    priorities: SubjectDecisionPriorities,
) -> float:
    weights = priorities.normalized()

    score = sum(
        criteria[criterion] * weight
        for criterion, weight in weights.items()
    )

    return round(score, 2)


def analyze_subject_with_priorities(
    student: SubjectDecisionProfile,
    subject: Subject,
    priorities: SubjectDecisionPriorities,
) -> dict:
    criteria = analyze_subject(
        student,
        subject,
    )

    return {
        "criteria": criteria,
        "balance_score": calculate_balance_score(
            criteria,
            priorities,
        ),
        "explanations": explain_subject(
            student,
            subject,
        ),
    }
