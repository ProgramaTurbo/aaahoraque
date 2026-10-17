from typing import Any


CRITERION_LABELS = {
    "academic_affinity": "afinidad académica",
    "professional_alignment": "alineación profesional",
    "learning_compatibility": "compatibilidad con tu forma de aprendizaje",
    "effort_compatibility": "compatibilidad con la exigencia y carga",
}


def _difference_level(difference: float | None) -> str:
    if difference is None:
        return "only"

    if difference >= 2:
        return "clear"

    if difference >= 0.75:
        return "moderate"

    return "small"


def generate_tradeoffs(
    comparison: dict[str, Any],
) -> list[dict[str, str]]:
    tradeoffs: list[dict[str, str]] = []

    criteria = comparison.get("criteria", {})

    for criterion, data in criteria.items():
        ranking = data.get("ranking", [])

        if not ranking:
            continue

        best = ranking[0]
        second = ranking[1] if len(ranking) > 1 else None

        difference = data.get("difference_to_second")
        level = _difference_level(difference)

        criterion_label = CRITERION_LABELS.get(
            criterion,
            criterion.replace("_", " "),
        )

        if level == "only":
            text = (
                f"{best['name']} es la única alternativa disponible "
                f"para analizar {criterion_label}."
            )

        elif level == "clear":
            text = (
                f"{best['name']} destaca claramente en {criterion_label}, "
                f"con una ventaja de {difference:.2f} puntos sobre "
                f"{second['name']}."
            )

        elif level == "moderate":
            text = (
                f"{best['name']} presenta una ventaja apreciable en "
                f"{criterion_label} frente a {second['name']} "
                f"({difference:.2f} puntos)."
            )

        else:
            text = (
                f"{best['name']} y {second['name']} ofrecen resultados "
                f"muy similares en {criterion_label}; la diferencia es "
                f"de solo {difference:.2f} puntos."
            )

        tradeoffs.append(
            {
                "criterion": criterion,
                "type": level,
                "text": text,
            }
        )

    return tradeoffs
def generate_global_insight(
    alternatives: list[dict[str, Any]],
    comparison: dict[str, Any],
) -> str | None:
    if len(alternatives) < 2:
        return None

    balance_ranking = comparison.get(
        "balance",
        {},
    ).get(
        "ranking",
        [],
    )

    if len(balance_ranking) < 2:
        return None

    first = balance_ranking[0]
    second = balance_ranking[1]

    balance_difference = round(
        first["score"] - second["score"],
        2,
    )

    criterion_winners: dict[str, list[str]] = {}

    for criterion, data in comparison.get(
        "criteria",
        {},
    ).items():
        winner = data["best_alternative_name"]

        criterion_winners.setdefault(
            winner,
            [],
        ).append(
            CRITERION_LABELS.get(
                criterion,
                criterion.replace("_", " "),
            )
        )

    first_strengths = criterion_winners.get(
        first["name"],
        [],
    )

    second_strengths = criterion_winners.get(
        second["name"],
        [],
    )

    if balance_difference < 0.5:
        return (
            f"{first['name']} y {second['name']} presentan un equilibrio "
            f"global muy similar. La decisión depende especialmente de qué "
            f"criterios valores más."
        )

    if first_strengths and second_strengths:
        return (
            f"{first['name']} presenta actualmente el mayor equilibrio "
            f"según tus prioridades, destacando especialmente en "
            f"{', '.join(first_strengths)}. "
            f"{second['name']} ofrece una alternativa competitiva y destaca "
            f"especialmente en {', '.join(second_strengths)}."
        )

    if first_strengths:
        return (
            f"{first['name']} presenta actualmente el mayor equilibrio "
            f"según tus prioridades y destaca especialmente en "
            f"{', '.join(first_strengths)}."
        )

    return (
        f"{first['name']} presenta actualmente el mayor equilibrio global, "
        f"pero conviene revisar los criterios individuales antes de decidir."
    )
