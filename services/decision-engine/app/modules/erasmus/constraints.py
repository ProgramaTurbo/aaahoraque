
from .schemas import PerfilErasmus, DestinoErasmus


NIVELES_IDIOMA = {
    "A1": 1,
    "A2": 2,
    "B1": 3,
    "B2": 4,
    "C1": 5,
    "C2": 6,
}


def comprobar_idioma(
    perfil: PerfilErasmus,
    destino: DestinoErasmus,
) -> bool:
    """Comprueba si el alumno cumple el idioma requerido."""

    for idioma in perfil.idiomas:
        if (
            idioma.idioma.strip().lower()
            == destino.idioma_docencia.strip().lower()
        ):
            return (
                NIVELES_IDIOMA[idioma.nivel]
                >= NIVELES_IDIOMA[destino.nivel_idioma_requerido]
            )

    return False


def comprobar_restricciones(
    perfil: PerfilErasmus,
    destino: DestinoErasmus,
) -> list[str]:
    """Devuelve los requisitos obligatorios incumplidos."""

    motivos = []

    if not destino.convenio_activo:
        motivos.append("No existe un convenio Erasmus activo.")

    if not comprobar_idioma(perfil, destino):
        motivos.append(
            f"No cumple el nivel "
            f"{destino.nivel_idioma_requerido} "
            f"de {destino.idioma_docencia} requerido."
        )

    return motivos


def comprobar_advertencias(
    perfil: PerfilErasmus,
    destino: DestinoErasmus,
) -> list[str]:
    """Detecta aspectos que conviene tener en cuenta."""

    advertencias = []

    coste_neto = max(
        0,
        destino.coste_mensual_estimado
        - destino.beca_mensual_estimada,
    )

    if coste_neto > perfil.presupuesto_mensual:
        advertencias.append(
            f"El coste neto mensual estimado "
            f"({coste_neto:.0f} €) supera el presupuesto "
            f"({perfil.presupuesto_mensual:.0f} €)."
        )

    if destino.ects_reconocibles < perfil.ects_objetivo:
        advertencias.append(
            f"Solo se estiman {destino.ects_reconocibles} "
            f"ECTS reconocibles frente a los "
            f"{perfil.ects_objetivo} ECTS deseados."
        )

    return advertencias
