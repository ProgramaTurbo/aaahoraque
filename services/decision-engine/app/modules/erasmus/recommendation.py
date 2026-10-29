
from .schemas import PerfilErasmus, ResultadoDestino
from .service import analizar_erasmus


def recomendar_destinos(
    perfil: PerfilErasmus,
) -> list[dict]:
    """
    Propone hasta 3 destinos Erasmus diferentes.

    Prioriza los destinos que cumplen actualmente
    el idioma, pero también puede incluir destinos
    condicionados.

    No toma la decisión final por el estudiante.
    """

    analisis = analizar_erasmus(perfil)

    # Primero los destinos actuales y después los
    # que requieren mejorar el idioma.
    candidatos = (
        analisis.destinos_actuales
        + analisis.destinos_condicionados_idioma
    )

    if not candidatos:
        return []

    recomendaciones = []
    ids_seleccionados = set()

    def agregar(
        resultado: ResultadoDestino,
        motivo: str,
    ):
        if resultado.destino.id not in ids_seleccionados:
            recomendaciones.append({
                "destino": resultado.destino,
                "indicadores": resultado.indicadores,
                "elegible_actualmente": resultado.elegible,
                "advertencias": resultado.advertencias,
                "motivo_recomendacion": motivo,
            })
            ids_seleccionados.add(resultado.destino.id)

    # 1. Alternativa más económica.
    economico = min(
        candidatos,
        key=lambda r: (
            not r.elegible,
            r.indicadores.coste_neto_mensual,
        ),
    )

    agregar(
        economico,
        "Destaca por su menor coste mensual neto "
        "entre las opciones de su grupo de elegibilidad.",
    )

    # 2. Alternativa con más ECTS reconocibles.
    academico = max(
        candidatos,
        key=lambda r: (
            r.elegible,
            r.destino.ects_reconocibles,
        ),
    )

    agregar(
        academico,
        "Destaca por su compatibilidad académica.",
    )

    # 3. Alternativa equilibrada.
    # Normalizamos el coste entre los candidatos.
    costes = [
        r.indicadores.coste_neto_mensual
        for r in candidatos
    ]

    coste_min = min(costes)
    coste_max = max(costes)

    def puntuacion_equilibrio(
        resultado: ResultadoDestino,
    ) -> float:

        coste = resultado.indicadores.coste_neto_mensual

        if coste_max == coste_min:
            puntuacion_coste = 100.0
        else:
            puntuacion_coste = (
                (coste_max - coste)
                / (coste_max - coste_min)
            ) * 100

        puntuacion_academica = (
            resultado.indicadores.compatibilidad_academica_pct
        )

        # Ponderaciones provisionales del prototipo.
        return (
            0.5 * puntuacion_coste
            + 0.5 * puntuacion_academica
        )

    restantes = [
        r for r in candidatos
        if r.destino.id not in ids_seleccionados
    ]

    if restantes:
        equilibrado = max(
            restantes,
            key=lambda r: (
                r.elegible,
                puntuacion_equilibrio(r),
            ),
        )

        agregar(
            equilibrado,
            "Ofrece un equilibrio entre coste mensual "
            "y compatibilidad académica.",
        )

    return recomendaciones[:3]
