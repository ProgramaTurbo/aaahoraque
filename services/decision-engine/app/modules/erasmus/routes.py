
from pydantic import BaseModel, Field
from fastapi import HTTPException

from .comparison import comparar_destinos
from .schemas import ResultadoDestino

from fastapi import APIRouter

from .schemas import (
    PerfilErasmus,
    ResultadoAnalisisErasmus,
)
from .service import analizar_erasmus
from .data import obtener_destinos


router = APIRouter(
    prefix="/erasmus",
    tags=["Erasmus"],
)


@router.get("/destinos")
def listar_destinos():
    """Devuelve el catálogo de prueba."""
    return obtener_destinos()


@router.post(
    "/analizar",
    response_model=ResultadoAnalisisErasmus,
)
def analizar_perfil(perfil: PerfilErasmus):
    """
    Devuelve destinos actuales y destinos
    condicionados por el nivel de idioma.
    """
    return analizar_erasmus(perfil)


class SolicitudComparacion(BaseModel):
    perfil: PerfilErasmus
    destinos_ids: list[int] = Field(min_length=2, max_length=3)


@router.post(
    "/comparar",
    response_model=list[ResultadoDestino],
)
def comparar_destinos_erasmus(
    solicitud: SolicitudComparacion,
):
    try:
        return comparar_destinos(
            perfil=solicitud.perfil,
            destinos_ids=solicitud.destinos_ids,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error
