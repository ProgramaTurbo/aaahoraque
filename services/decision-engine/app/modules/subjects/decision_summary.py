from typing import Any


def generate_decision_summary(
    alternatives: list[dict[str, Any]],
) -> dict[str, Any]:

    if not alternatives:
        return {
            "status": "no_alternatives",
            "message": "No existen alternativas para analizar.",
            "best_eligible": None,
            "ineligible_alternatives": [],
        }

    eligible = [
        alternative
        for alternative in alternatives
        if alternative["eligibility"]["eligible"]
    ]

    ineligible = [
        alternative
        for alternative in alternatives
        if not alternative["eligibility"]["eligible"]
    ]

    eligible.sort(
        key=lambda item: item["balance_score"],
        reverse=True,
    )

    best_eligible = eligible[0] if eligible else None

    if best_eligible:
        message = (
            f"{best_eligible['name']} presenta el mayor equilibrio "
            f"entre las alternativas académicamente viables, "
            f"con {best_eligible['balance_score']}/10 puntos."
        )
        status = "eligible_alternatives_available"
    else:
        message = (
            "Ninguna de las alternativas analizadas cumple "
            "actualmente todas las restricciones académicas."
        )
        status = "no_eligible_alternatives"

    ineligible_details = []

    for alternative in ineligible:
        violations = alternative["eligibility"]["violations"]

        ineligible_details.append(
            {
                "id": alternative["id"],
                "name": alternative["name"],
                "balance_score": alternative["balance_score"],
                "reasons": [
                    violation["description"]
                    for violation in violations
                ],
            }
        )

    return {
        "status": status,
        "message": message,
        "best_eligible": (
            {
                "id": best_eligible["id"],
                "name": best_eligible["name"],
                "balance_score": best_eligible["balance_score"],
            }
            if best_eligible
            else None
        ),
        "ineligible_alternatives": ineligible_details,
    }
