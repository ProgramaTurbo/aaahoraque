
from .schemas import (
    PerfilErasmus,
    DestinoErasmus,
    ResultadoDestino,
    ResultadoAnalisisErasmus,
)
from .data import obtener_destinos
from .constraints import (
    comprobar_idioma,
    comprobar_restricciones,
    comprobar_advertencias,
)
from .metrics import calcular_indicadores


def analizar_destino(
    perfil: PerfilErasmus,
    destino: DestinoErasmus,
) -> ResultadoDestino:

    motivos = comprobar_restricciones(perfil, destino)
    advertencias = comprobar_advertencias(perfil, destino)
    indicadores = calcular_indicadores(perfil, destino)

    elegible = len(motivos) == 0

    explicaciones = [
        f"Coste neto mensual estimado: {indicadores.coste_neto_mensual:.0f} €.",
        f"Compatibilidad académica estimada: {indicadores.compatibilidad_academica_pct:.0f} %.",
    ]

    if indicadores.cumple_idioma:
        explicaciones.append(
            "Cumple el nivel de idioma requerido."
        )
    else:
        explicaciones.append(
            f"Para solicitar este destino necesita acreditar "
            f"un nivel {destino.nivel_idioma_requerido} "
            f"de {destino.idioma_docencia}."
        )

    return ResultadoDestino(
        destino=destino,
        elegible=elegible,
        motivos_exclusion=motivos,
        advertencias=advertencias,
        indicadores=indicadores,
        explicaciones=explicaciones,
    )


def analizar_erasmus(
    perfil: PerfilErasmus,
) -> ResultadoAnalisisErasmus:

    destinos_actuales = []
    destinos_condicionados_idioma = []

    for destino in obtener_destinos():

        # Los destinos sin convenio no se recomiendan.
        if not destino.convenio_activo:
            continue

        resultado = analizar_destino(perfil, destino)

        if comprobar_idioma(perfil, destino):
            destinos_actuales.append(resultado)
        else:
            destinos_condicionados_idioma.append(resultado)

    return ResultadoAnalisisErasmus(
        destinos_actuales=destinos_actuales,
        destinos_condicionados_idioma=destinos_condicionados_idioma,
        total_actuales=len(destinos_actuales),
        total_condicionados=len(destinos_condicionados_idioma),
    )
