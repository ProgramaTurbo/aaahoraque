from app.modules.subjects.models import Subject
from app.modules.subjects.student_profile import SubjectDecisionProfile


def _top_matches(
    student_values: dict[str, float],
    alternative_profile: dict[str, float],
    limit: int = 2,
) -> list[tuple[str, float]]:
    matches = []

    for key, alternative_weight in alternative_profile.items():
        student_value = student_values.get(key, 0.0)

        match_strength = student_value * alternative_weight

        matches.append(
            (key, match_strength)
        )

    matches.sort(
        key=lambda item: item[1],
        reverse=True,
    )

    return matches[:limit]


def _humanize(value: str) -> str:
    return value.replace("_", " ").capitalize()


def explain_academic_affinity(
    student: SubjectDecisionProfile,
    subject: Subject,
) -> list[str]:
    matches = _top_matches(
        student.academic_interests,
        subject.area_profile,
    )

    explanations = []

    for area, strength in matches:
        if strength >= 6:
            explanations.append(
                f"La asignatura tiene una relación elevada con "
                f"{_humanize(area)}, una de las áreas que más te interesan."
            )

    if not explanations:
        explanations.append(
            "La asignatura no coincide especialmente con tus principales "
            "intereses académicos actuales."
        )

    return explanations


def explain_professional_alignment(
    student: SubjectDecisionProfile,
    subject: Subject,
) -> list[str]:
    matches = _top_matches(
        student.professional_interests,
        subject.professional_profile,
    )

    explanations = []

    for profession, strength in matches:
        if strength >= 6:
            explanations.append(
                f"Sus contenidos están relacionados con perfiles como "
                f"{_humanize(profession)}, que has marcado entre tus "
                f"intereses profesionales."
            )

    if not explanations:
        explanations.append(
            "Su orientación profesional tiene poca relación con los perfiles "
            "que actualmente has indicado como prioritarios."
        )

    return explanations
def explain_learning_compatibility(
    student: SubjectDecisionProfile,
    subject: Subject,
) -> list[str]:
    explanations = []

    comparisons = [
        (
            "contenido práctico",
            student.practice_preference,
            subject.practical_component,
        ),
        (
            "contenido teórico",
            student.theory_preference,
            subject.theoretical_component,
        ),
        (
            "trabajo mediante proyectos",
            student.project_preference,
            subject.project_component,
        ),
        (
            "trabajo en equipo",
            student.teamwork_preference,
            subject.teamwork_component,
        ),
    ]

    for label, preference, subject_value in comparisons:
        difference = abs(preference - subject_value)

        if difference <= 1:
            explanations.append(
                f"El nivel de {label} encaja muy bien con tus preferencias."
            )
        elif difference >= 4:
            explanations.append(
                f"El nivel de {label} se aleja de lo que has indicado "
                f"que prefieres."
            )

    return explanations
def explain_effort_compatibility(
    student: SubjectDecisionProfile,
    subject: Subject,
) -> list[str]:
    explanations = []

    difficulty_difference = (
        subject.estimated_difficulty
        - student.difficulty_tolerance
    )

    workload_difference = (
        subject.estimated_workload
        - student.workload_tolerance
    )

    if abs(difficulty_difference) <= 1:
        explanations.append(
            "La dificultad estimada se ajusta bien al nivel que has indicado "
            "estar dispuesto a asumir."
        )
    elif difficulty_difference > 1:
        explanations.append(
            "La dificultad estimada es superior a la que has indicado "
            "preferir actualmente."
        )
    else:
        explanations.append(
            "La dificultad estimada está por debajo del nivel de exigencia "
            "que has indicado estar dispuesto a asumir."
        )

    if abs(workload_difference) <= 1:
        explanations.append(
            "La carga estimada encaja con la dedicación que has indicado."
        )
    elif workload_difference > 1:
        explanations.append(
            "La carga estimada supera la dedicación que has indicado "
            "como preferible."
        )
    else:
        explanations.append(
            "La carga estimada es inferior a la que has indicado poder asumir."
        )

    return explanations
def explain_subject(
    student: SubjectDecisionProfile,
    subject: Subject,
) -> dict[str, list[str]]:
    return {
        "academic_affinity": explain_academic_affinity(
            student,
            subject,
        ),
        "professional_alignment": explain_professional_alignment(
            student,
            subject,
        ),
        "learning_compatibility": explain_learning_compatibility(
            student,
            subject,
        ),
        "effort_compatibility": explain_effort_compatibility(
            student,
            subject,
        ),
    }
