import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]

subjects_path = (
    ROOT / "data/subjects/computer_science.sample.json"
)

output_path = (
    ROOT / "examples/subjects/example_analysis.json"
)


with subjects_path.open(encoding="utf-8") as file:
    subjects = json.load(file)


request = {
    "student": {
        "academic_interests": {
            "artificial_intelligence": 9,
            "data_science": 8,
            "software_engineering": 7,
            "cybersecurity": 5,
            "systems": 6,
            "networks": 3,
        },
        "professional_interests": {
            "machine_learning_engineer": 10,
            "data_scientist": 8,
            "software_engineer": 7,
            "security_engineer": 4,
            "systems_engineer": 5,
            "cloud_engineer": 6,
            "software_architect": 7,
        },
        "theory_preference": 6,
        "practice_preference": 9,
        "project_preference": 8,
        "teamwork_preference": 6,
        "difficulty_tolerance": 8,
        "workload_tolerance": 8,
    },
    "academic_state": {
        "completed_subject_ids": [
            "programming-1",
            "programming-2",
        ],
        "earned_credits": 150,
    },
    "priorities": {
        "academic_affinity": 35,
        "professional_alignment": 30,
        "learning_compatibility": 20,
        "effort_compatibility": 15,
    },
    "subjects": subjects,
}


with output_path.open("w", encoding="utf-8") as file:
    json.dump(
        request,
        file,
        indent=2,
        ensure_ascii=False,
    )

print(f"Ejemplo generado: {output_path}")
print(f"Asignaturas incluidas: {len(subjects)}")
