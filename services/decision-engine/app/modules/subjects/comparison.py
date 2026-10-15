from typing import Any


def compare_alternatives(
    alternatives: list[dict[str, Any]],
) -> dict[str, Any]:
    if not alternatives:
        return {
            "criteria": {},
            "balance": {},
        }

    criteria_names = list(
        alternatives[0]["criteria"].keys()
    )

    criteria_comparison: dict[str, dict[str, Any]] = {}

    for criterion in criteria_names:
        ordered = sorted(
            alternatives,
            key=lambda alternative: alternative["criteria"][criterion],
            reverse=True,
        )

        best = ordered[0]

        second = ordered[1] if len(ordered) > 1 else None

        difference_to_second = (
            round(
                best["criteria"][criterion]
                - second["criteria"][criterion],
                2,
            )
            if second
            else None
        )

        criteria_comparison[criterion] = {
            "best_alternative_id": best["id"],
            "best_alternative_name": best["name"],
            "best_score": best["criteria"][criterion],
            "difference_to_second": difference_to_second,
            "ranking": [
                {
                    "id": alternative["id"],
                    "name": alternative["name"],
                    "score": alternative["criteria"][criterion],
                }
                for alternative in ordered
            ],
        }

    balance_ordered = sorted(
        alternatives,
        key=lambda alternative: alternative["balance_score"],
        reverse=True,
    )

    return {
        "criteria": criteria_comparison,
        "balance": {
            "ranking": [
                {
                    "id": alternative["id"],
                    "name": alternative["name"],
                    "score": alternative["balance_score"],
                }
                for alternative in balance_ordered
            ]
        },
    }
