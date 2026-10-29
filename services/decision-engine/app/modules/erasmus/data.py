
from .schemas import DestinoErasmus


# Catálogo sintético de destinos Erasmus.
# Los datos son ficticios y se utilizan únicamente para pruebas.

DESTINOS_ERASMUS = [
    DestinoErasmus(
        id=1,
        universidad="Universidade de Coimbra",
        pais="Portugal",
        ciudad="Coímbra",
        idioma_docencia="ingles",
        nivel_idioma_requerido="B2",
        coste_mensual_estimado=750,
        beca_mensual_estimada=300,
        ects_reconocibles=27,
        convenio_activo=True,
        clima="templado",
        tipo_ciudad="mediana",
    ),

    DestinoErasmus(
        id=2,
        universidad="Università di Bologna",
        pais="Italia",
        ciudad="Bolonia",
        idioma_docencia="ingles",
        nivel_idioma_requerido="B2",
        coste_mensual_estimado=1100,
        beca_mensual_estimada=350,
        ects_reconocibles=30,
        convenio_activo=True,
        clima="templado",
        tipo_ciudad="grande",
    ),

    DestinoErasmus(
        id=3,
        universidad="AGH University of Krakow",
        pais="Polonia",
        ciudad="Cracovia",
        idioma_docencia="ingles",
        nivel_idioma_requerido="B1",
        coste_mensual_estimado=650,
        beca_mensual_estimada=300,
        ects_reconocibles=24,
        convenio_activo=True,
        clima="frio",
        tipo_ciudad="grande",
    ),
]


def obtener_destinos() -> list[DestinoErasmus]:
    """Devuelve el catálogo de destinos Erasmus de prueba."""
    return DESTINOS_ERASMUS.copy()
