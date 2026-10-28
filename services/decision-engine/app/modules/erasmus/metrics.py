
from .schemas import (
    PerfilErasmus,
    DestinoErasmus,
    IndicadoresErasmus,
)


NIVELES_IDIOMA = {
    "A1": 1,
    "A2": 2,
    "B1": 3,
    "B2": 4,
    "C1": 5,
    "C2": 6,
}


def calcular_coste_neto(destino: DestinoErasmus) -> float:
    """Calcula el coste mensual después de descontar la beca."""

    return max(
        0,
        destino.coste_mensual_estimado - destino.beca_mensual_estimada,
    )


def calcular_compatibilidad_academica(
    perfil: PerfilErasmus,
    destino: DestinoErasmus,
) -> float:
    """Calcula el porcentaje de ECTS objetivo reconocibles."""

    porcentaje = (
        destino.ects_reconocibles / perfil.ects_objetivo
    ) * 100

    return round(min(100, porcentaje), 2)


def cumple_requisito_idioma(
    perfil: PerfilErasmus,
    destino: DestinoErasmus,
) -> bool:
    """Comprueba si el estudiante cumple el idioma requerido."""

    for idioma in perfil.idiomas:
        if idioma.idioma.strip().lower() == destino.idioma_docencia.strip().lower():
            return (
                NIVELES_IDIOMA[idioma.nivel]
                >= NIVELES_IDIOMA[destino.nivel_idioma_requerido]
            )

    return False


def calcular_indicadores(
    perfil: PerfilErasmus,
    destino: DestinoErasmus,
) -> IndicadoresErasmus:
    """Calcula los indicadores principales de un destino."""

    return IndicadoresErasmus(
        coste_neto_mensual=calcular_coste_neto(destino),
        compatibilidad_academica_pct=calcular_compatibilidad_academica(
            perfil, destino
        ),
        cumple_idioma=cumple_requisito_idioma(perfil, destino),
    )

