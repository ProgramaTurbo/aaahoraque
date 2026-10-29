
from typing import Literal

from pydantic import BaseModel, Field


# 1. IDIOMAS DEL ESTUDIANTE

NivelIdioma = Literal["A1", "A2", "B1", "B2", "C1", "C2"]


class IdiomaEstudiante(BaseModel):
    idioma: str
    nivel: NivelIdioma

# 2. PERFIL DEL ESTUDIANTE

class PerfilErasmus(BaseModel):
    estudiante_id: int | None = None
    titulacion_id: int

    idiomas: list[IdiomaEstudiante]

    presupuesto_mensual: float = Field(gt=0)
    duracion_meses: int = Field(ge=3, le=12)
    ects_objetivo: int = Field(gt=0, le=60)

    clima_preferido: str | None = None
    tipo_ciudad_preferido: str | None = None
    tipo_experiencia: Literal[
    "tranquilo",
    "equilibrado",
    "fiesta"
    ] = "equilibrado"

# 3. DESTINO ERASMUS


class DestinoErasmus(BaseModel):
    # Identificación
    id: int
    universidad: str
    pais: str
    ciudad: str

    # Requisitos académicos
    idioma_docencia: str
    nivel_idioma_requerido: NivelIdioma
    ects_reconocibles: int = Field(ge=0)
    convenio_activo: bool

    # Economía
    coste_mensual_estimado: float = Field(ge=0)
    beca_mensual_estimada: float = Field(ge=0)

    # Vida social Erasmus (escala 0-10)
    comunidad_internacional: float | None = Field(
        default=None, ge=0, le=10
    )
    actividades_erasmus: float | None = Field(
        default=None, ge=0, le=10
    )
    ocio_nocturno: float | None = Field(
        default=None, ge=0, le=10
    )
    ambiente_universitario: float | None = Field(
        default=None, ge=0, le=10
    )

    # Seguridad (escala 0-10: mayor = más seguridad)
    seguridad: float | None = Field(
        default=None, ge=0, le=10
    )

    # Transporte (escala 0-10)
    transporte_publico: float | None = Field(
        default=None, ge=0, le=10
    )
    facilidad_viajar: float | None = Field(
        default=None, ge=0, le=10
    )

    # Clima
    clima: str | None = None
    temperatura_media: float | None = None

    # Alojamiento
    coste_alojamiento: float | None = Field(
        default=None, ge=0
    )
    facilidad_alojamiento: float | None = Field(
        default=None, ge=0, le=10
    )

    # Características de la ciudad
    tipo_ciudad: str | None = None



# 4. KPIs CALCULADOS

class IndicadoresErasmus(BaseModel):
    coste_neto_mensual: float
    compatibilidad_academica_pct: float = Field(ge=0, le=100)
    cumple_idioma: bool


# 5. RESULTADO DE UN DESTINO


class ResultadoDestino(BaseModel):
    destino: DestinoErasmus
    elegible: bool
    motivos_exclusion: list[str] = Field(default_factory=list)
    advertencias: list[str] = Field(default_factory=list)
    indicadores: IndicadoresErasmus
    explicaciones: list[str] = Field(default_factory=list)


# 6. RESULTADO DEL ANALISIS


class ResultadoAnalisisErasmus(BaseModel):
    destinos_actuales: list[ResultadoDestino]
    destinos_condicionados_idioma: list[ResultadoDestino]
    total_actuales: int
    total_condicionados: int

