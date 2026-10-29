
from .schemas import PerfilErasmus, ResultadoDestino
from .service import analizar_erasmus


def comparar_destinos(
    perfil: PerfilErasmus,
    destinos_ids: list[int],
) -> list[ResultadoDestino]:
    """
    Compara entre 2 y 3 destinos Erasmus,
    tanto actuales como condicionados por idioma.
    """

    if not 2 <= len(destinos_ids) <= 3:
        raise ValueError(
            "Debes seleccionar entre 2 y 3 destinos."
        )

    if len(set(destinos_ids)) != len(destinos_ids):
        raise ValueError(
            "No puedes seleccionar destinos repetidos."
        )

    analisis = analizar_erasmus(perfil)

    # Unimos los dos grupos para permitir compararlos entre sí.
    destinos_disponibles = (
        analisis.destinos_actuales
        + analisis.destinos_condicionados_idioma
    )

    resultados_por_id = {
        resultado.destino.id: resultado
        for resultado in destinos_disponibles
    }

    ids_desconocidos = [
        destino_id
        for destino_id in destinos_ids
        if destino_id not in resultados_por_id
    ]

    if ids_desconocidos:
        raise ValueError(
            f"Destinos no disponibles: {ids_desconocidos}"
        )

    return [
        resultados_por_id[destino_id]
        for destino_id in destinos_ids
    ]

def explicar_comparacion(
    resultados: list[ResultadoDestino],
) -> list[str]:
    """
    Genera explicaciones objetivas de la comparación.
    No decide automáticamente qué destino es mejor.
    """

    if not resultados:
        return []

    explicaciones = []

    # Destino o destinos más económicos
    coste_minimo = min(
        resultado.indicadores.coste_neto_mensual
        for resultado in resultados
    )

    mas_economicos = [
        resultado.destino.ciudad
        for resultado in resultados
        if resultado.indicadores.coste_neto_mensual == coste_minimo
    ]

    explicaciones.append(
        f"Menor coste neto mensual: "
        f"{', '.join(mas_economicos)} "
        f"({coste_minimo:.0f} €)."
    )

    # Destino o destinos con más ECTS reconocibles
    max_ects = max(
        resultado.destino.ects_reconocibles
        for resultado in resultados
    )

    mejores_ects = [
        resultado.destino.ciudad
        for resultado in resultados
        if resultado.destino.ects_reconocibles == max_ects
    ]

    explicaciones.append(
        f"Mayor número de ECTS reconocibles: "
        f"{', '.join(mejores_ects)} "
        f"({max_ects} ECTS)."
    )

    # Situación del idioma
    for resultado in resultados:
        if resultado.indicadores.cumple_idioma:
            explicaciones.append(
                f"{resultado.destino.ciudad}: "
                f"cumple actualmente el requisito de idioma."
            )
        else:
            explicaciones.append(
                f"{resultado.destino.ciudad}: "
                f"necesita acreditar "
                f"{resultado.destino.nivel_idioma_requerido} "
                f"de {resultado.destino.idioma_docencia}."
            )

    # Advertencias particulares
    for resultado in resultados:
        for advertencia in resultado.advertencias:
            explicaciones.append(
                f"{resultado.destino.ciudad}: {advertencia}"
            )

    return explicaciones
