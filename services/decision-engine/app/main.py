from fastapi import FastAPI

app = FastAPI(
    title="AAAhoraQue Decision Engine",
    description=(
        "Motor de apoyo a la toma de decisiones académicas "
        "del proyecto AAAhoraQue."
    ),
    version="0.1.0",
)


@app.get("/health", tags=["System"])
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "decision-engine",
    }
