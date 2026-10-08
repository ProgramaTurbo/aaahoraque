import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.modules.subjects.models import Subject


DATA_FILE = (
    Path(__file__).resolve().parents[4]
    / "data"
    / "subjects"
    / "computer_science.sample.json"
)


def test_sample_subjects_are_valid() -> None:
    with DATA_FILE.open(encoding="utf-8") as file:
        data = json.load(file)

    subjects = [Subject(**item) for item in data]

    assert len(subjects) == 3
    assert subjects[0].name == "Inteligencia Artificial"


def test_subject_rejects_invalid_profile_value() -> None:
    with pytest.raises(ValidationError):
        Subject(
            id="invalid-subject",
            name="Invalid Subject",
            ects=6,
            academic_year=4,
            semester=1,
            specialization_ids=[],
            area_profile={"artificial_intelligence": 1.5},
            professional_profile={},
            theoretical_component=5,
            practical_component=5,
            project_component=5,
            teamwork_component=5,
            estimated_difficulty=5,
            estimated_workload=5,
            competencies=[],
            prerequisites=[],
        )


def test_subject_rejects_invalid_component_value() -> None:
    with pytest.raises(ValidationError):
        Subject(
            id="invalid-subject",
            name="Invalid Subject",
            ects=6,
            academic_year=4,
            semester=1,
            specialization_ids=[],
            area_profile={},
            professional_profile={},
            theoretical_component=11,
            practical_component=5,
            project_component=5,
            teamwork_component=5,
            estimated_difficulty=5,
            estimated_workload=5,
            competencies=[],
            prerequisites=[],
        )
