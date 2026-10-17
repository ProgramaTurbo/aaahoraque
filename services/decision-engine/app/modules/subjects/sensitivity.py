from typing import Any

from app.modules.subjects.decision_preferences import SubjectDecisionPriorities


CRITERIA = [
    "academic_affinity",
    "professional_alignment",
    "learning_compatibility",
    "effort_compatibility",
]


def _priorities_to_dict(
    priorities: SubjectDecisionPriorities,
) -> dict[str, float]:
    return priorities.normalized()


def _rebalance_other_priorities(
    priorities: dict[str, float],
    target_criterion: str,
    new_value: float,
) -> dict[str, float]:
    """
    Recibe pesos normalizados y modifica uno de ellos.

    new_value se expresa como porcentaje entre 0 y 100.
    Los demás pesos se redistribuyen proporcionalmente.
    """
    if target_criterion not in CRITERIA:
        raise ValueError("Criterio desconocido.")

    if not 0 <= new_value <= 100:
        raise ValueError("El nuevo peso debe estar entre 0 y 100.")

    target_weight = new_value / 100

    other_criteria = [
        criterion
        for criterion in CRITERIA
        if criterion != target_criterion
    ]

    other_total = sum(
        priorities[criterion]
        for criterion in other_criteria
    )

    remaining = 1 - target_weight

    result = {
        target_criterion: target_weight,
    }

    for criterion in other_criteria:
        if other_total > 0:
            result[criterion] = (
                remaining * priorities[criterion] / other_total
            )
        else:
            result[criterion] = remaining / len(other_criteria)

    return result


def _calculate_score(
    criteria: dict[str, float],
    weights: dict[str, float],
) -> float:
    """
    Calcula el equilibrio sin redondeo intermedio.
    """
    return sum(
        criteria[criterion] * weights[criterion]
        for criterion in CRITERIA
    )


def simulate_priority_change(
    alternatives: list[dict[str, Any]],
    priorities: SubjectDecisionPriorities,
    criterion: str,
    new_value: float,
) -> dict[str, Any]:
    base_weights = _priorities_to_dict(priorities)

    modified_weights = _rebalance_other_priorities(
        base_weights,
        criterion,
        new_value,
    )

    ranking = []

    for alternative in alternatives:
        exact_score = _calculate_score(
            alternative["criteria"],
            modified_weights,
        )

        ranking.append(
            {
                "id": alternative["id"],
                "name": alternative["name"],
                "score": round(exact_score, 2),
                "_exact_score": exact_score,
            }
        )

    ranking.sort(
        key=lambda item: (-item["_exact_score"], item["id"])
    )

    # El valor exacto es interno; la API devuelve el redondeado.
    for item in ranking:
        del item["_exact_score"]

    return {
        "criterion": criterion,
        "new_value": round(new_value, 2),
        "priorities": {
            key: round(value * 100, 2)
            for key, value in modified_weights.items()
        },
        "ranking": ranking,
    }


def classify_robustness(
    base_weight: float,
    change_weight: float | None,
) -> str:
    """
    Clasificación descriptiva según distancia explorada.

    No equivale a robustez matemática global.
    """
    if change_weight is None:
        return "no_change_detected"

    distance = abs(change_weight - base_weight)

    if distance >= 25:
        return "high"

    if distance >= 10:
        return "medium"

    return "low"


def analyze_criterion_sensitivity(
    alternatives: list[dict[str, Any]],
    priorities: SubjectDecisionPriorities,
    criterion: str,
    step: float = 5.0,
) -> dict[str, Any]:

    if not 0 < step <= 100:
        raise ValueError("step debe ser mayor que 0 y como máximo 100.")

    base_weights = _priorities_to_dict(priorities)
    base_value = base_weights[criterion] * 100

    base_ranking = simulate_priority_change(
        alternatives,
        priorities,
        criterion,
        base_value,
    )["ranking"]

    base_winner = base_ranking[0]["id"]

    # Evaluamos una malla porcentual e incluimos el peso original.
    grid = [
        min(index * step, 100.0)
        for index in range(int(100 / step) + 1)
    ]

    grid.extend([0.0, 100.0, base_value])

    values = sorted(
        set(round(value, 8) for value in grid),
        key=lambda value: (
            abs(value - base_value),
            value,
        ),
    )

    first_change = None
    scenarios = []

    for value in values:
        scenario = simulate_priority_change(
            alternatives,
            priorities,
            criterion,
            value,
        )

        ranking = scenario["ranking"]
        winner = ranking[0]

        scenarios.append(
            {
                "weight": round(value, 2),
                "winner_id": winner["id"],
                "scores": {
                    item["id"]: item["score"]
                    for item in ranking
                },
            }
        )

        if (
            first_change is None
            and winner["id"] != base_winner
        ):
            first_change = {
                "weight": round(value, 2),
                "new_winner_id": winner["id"],
                "new_winner_name": winner["name"],
                "score": winner["score"],
                "direction": (
                    "increase"
                    if value > base_value
                    else "decrease"
                ),
                "distance": round(
                    abs(value - base_value),
                    2,
                ),
            }

    scenarios.sort(key=lambda item: item["weight"])

    change_weight = (
        first_change["weight"]
        if first_change is not None
        else None
    )

    return {
        "criterion": criterion,
        "base_weight": round(base_value, 2),
        "base_winner": base_winner,
        "first_change": first_change,
        "robustness": classify_robustness(
            base_value,
            change_weight,
        ),
        "step": step,
        "scenarios": scenarios,
    }


def analyze_sensitivity(
    alternatives: list[dict[str, Any]],
    priorities: SubjectDecisionPriorities,
    step: float = 5.0,
) -> dict[str, Any]:

    if len(alternatives) < 2:
        return {
            "status": "insufficient_alternatives",
            "message": (
                "Se necesitan al menos dos alternativas "
                "para evaluar la sensibilidad de la decisión."
            ),
            "criteria": {},
        }

    results = {}

    for criterion in CRITERIA:
        results[criterion] = analyze_criterion_sensitivity(
            alternatives,
            priorities,
            criterion,
            step,
        )

    return results
