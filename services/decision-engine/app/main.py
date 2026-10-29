
from fastapi import FastAPI

from app.modules.subjects.routes import router as subjects_router
from app.modules.erasmus.routes import router as erasmus_router
from app.modules.careers.orientation import router as degrees_router

app = FastAPI(
    title="AAAhoraQue Decision Engine",
    description=(
        "Motor de apoyo a la toma de decisiones académicas "
        "del proyecto AAAhoraQue."
    ),
    version="0.1.0",
)

app.include_router(subjects_router)
app.include_router(erasmus_router)
app.include_router(degrees_router)


@app.get("/health", tags=["System"])
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "decision-engine",
    }

