from fastapi.testclient import TestClient
from app.main import app
from app.modules.careers.orientation import OrientationProfile, OrientationRequest, Candidate, analyze


def run(profile=None, alternatives=None):
    return analyze(OrientationRequest(profile=OrientationProfile(**(profile or {})), alternatives=alternatives or [
        Candidate(id="tech", name="Grado en Ingeniería Informática", province="Zaragoza", modality="on_site"),
        Candidate(id="health", name="Grado en Enfermería", province="Madrid", modality="online"),
        Candidate(id="unknown", name="Título sin clasificación"),
    ]))


def test_unknown_answers_do_not_invent_scores():
    result = run()
    assert all(a["score"] is None for a in result["alternatives"])
    assert result["excluded"] == 0


def test_interests_rank_matching_degree_without_claiming_admission():
    result = run({"interests": {"technology": "like", "health": "dislike"}})
    assert result["alternatives"][0]["id"] == "tech"
    assert result["alternatives"][0]["score"] == 100
    assert result["alternatives"][0]["status"] == "pending_verification"
    assert result["alternatives"][-1]["score"] is None


def test_strict_province_excludes_mismatch_but_not_missing_data():
    result = run({"origin_province": "Zaragoza", "mobility": "require_province"})
    assert result["excluded"] == 1
    assert {a["id"] for a in result["alternatives"]} == {"tech", "unknown"}
    assert result["alternatives"][-1]["score"] is None


def test_preference_does_not_exclude():
    result = run({"origin_province": "Zaragoza", "mobility": "prefer_province"})
    assert result["excluded"] == 0
    assert result["alternatives"][0]["id"] == "tech"


def test_region_and_accent_matching():
    result = run({"mobility": "require_region", "allowed_provinces": ["zaragoza", "Teruel", "Huesca"]})
    assert result["excluded"] == 1


def test_missing_origin_keeps_constraint_pending():
    result = run({"mobility": "require_province"})
    assert result["excluded"] == 0
    assert all(a["score"] is None for a in result["alternatives"])
    assert any("Falta indicar" in text for text in result["alternatives"][0]["pending"])


def test_budget_and_aptitudes_are_not_fabricated():
    result = run({"budget": 1000, "budget_strict": True, "aptitudes": {"logic": 4}})
    assert result["excluded"] == 0
    assert all(a["score"] is None for a in result["alternatives"])
    assert any("Costes desconocidos" in text for text in result["alternatives"][0]["pending"])


def test_strict_modality_independent_of_weight():
    result = run({"modality": "online", "modality_strict": True, "priorities": {"modality": 0}})
    assert result["excluded"] == 1
    assert {a["id"] for a in result["alternatives"]} == {"health", "unknown"}


def test_missing_active_criterion_never_receives_aggregate():
    result = run({"interests": {"technology": "like"}, "modality": "online"})
    health = next(a for a in result["alternatives"] if a["id"] == "health")
    assert health["criteria"]["modality"] == 100
    assert health["score"] is None


def test_api_validation_and_no_answers():
    client = TestClient(app)
    assert client.post("/degrees/orient", json={"profile": {"access_grade": 99}, "alternatives": []}).status_code == 422
    assert client.post("/degrees/orient", json={"profile": {"interests": {"invented": "like"}}, "alternatives": []}).status_code == 422
    assert client.post("/degrees/orient", json={"profile": {}, "alternatives": []}).status_code == 200

def test_catalog_modality_labels_and_ambiguous_labels():
    result = run({"modality": "on_site", "modality_strict": True}, [
        Candidate(id="known", name="Ejemplo", modality="Presencial"),
        Candidate(id="ambiguous", name="Ejemplo", modality="Semi/No Presencial"),
        Candidate(id="wrong", name="Ejemplo", modality="Online"),
    ])
    assert result["excluded"] == 1
    assert result["alternatives"][0]["id"] == "known"
    assert result["alternatives"][0]["score"] == 100
    assert result["alternatives"][1]["score"] is None
