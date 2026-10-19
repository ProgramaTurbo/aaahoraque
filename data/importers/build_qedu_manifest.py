#!/usr/bin/env python3

"""Genera identidades QEDU reproducibles. No escribe en PostgreSQL."""

import csv
import hashlib
import json
import re
import unicodedata
import uuid
from collections import defaultdict, Counter
from pathlib import Path

ROOT = Path("data")
INPUT = ROOT / "raw/qedu/qedu.csv"
ALIASES = ROOT / "mappings/qedu_istac_aliases.csv"
NEW = ROOT / "mappings/qedu_new_universities.csv"
ISTAC = Path("/tmp/aaahoraque-istac-universities.txt")
OUTPUT = Path("/tmp/aaahoraque-qedu-manifest.json")

NAMESPACE = uuid.UUID("d85d4d30-5c13-4ce8-9a0d-38f6e7a3a14a")
PREFIX = "ISTAC:CL_RUCT_UNIVERSIDADES:"


def normalize(value):
    value = unicodedata.normalize("NFKD", value.casefold().strip())
    value = "".join(
        c for c in value
        if not unicodedata.combining(c)
    )
    value = re.sub(r"[^\w\s]", " ", value)
    return " ".join(value.split())


def stable_id(kind, key):
    payload = json.dumps(
        [kind, key],
        ensure_ascii=False,
        separators=(",", ":"),
    )
    return str(uuid.uuid5(NAMESPACE, payload))


def read_csv(path):
    with path.open(encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def main():
    raw = INPUT.read_bytes()
    file_hash = hashlib.sha256(raw).hexdigest()

    rows = read_csv(INPUT)
    aliases = read_csv(ALIASES)
    new_universities = read_csv(NEW)

    assert len(rows) == 3962
    assert len(aliases) == 7
    assert len(new_universities) == 5

    istac = defaultdict(list)
    valid_codes = set()

    for line in ISTAC.read_text(encoding="utf-8").splitlines():
        code, name = line.split("|", 1)
        istac[normalize(name)].append(code)
        valid_codes.add(code)

    alias_map = {
        row["qedu_name"]: PREFIX + row["istac_code"]
        for row in aliases
    }

    new_map = {
        row["qedu_name"]: row["source_key"]
        for row in new_universities
    }

    assert len(alias_map) == 7
    assert len(new_map) == 5
    assert set(alias_map.values()).issubset(valid_codes)
    assert not set(alias_map).intersection(new_map)
    assert len(set(new_map.values())) == 5

    university_names = sorted({
        row["Universidad"].strip() for row in rows
    })

    university_codes = {}

    for name in university_names:
        if name in alias_map:
            code = alias_map[name]
        elif name in new_map:
            code = new_map[name]
        else:
            matches = istac.get(normalize(name), [])
            if len(matches) != 1:
                raise ValueError(
                    f"Universidad sin correspondencia única: {name}"
                )
            code = matches[0]

        university_codes[name] = code

    assert len(university_codes) == 94
    assert len(set(university_codes.values())) == 94

    centers = {}
    degrees = {}
    offerings = {}
    links = []
    original_rows = Counter()

    for row_number, row in enumerate(rows, start=1):
        university = university_codes[row["Universidad"].strip()]

        # La provincia forma parte de la identidad provisional del centro.
        center_key = [
            university,
            normalize(row["Provincia"]),
            normalize(row["Centro"]),
        ]

        degree_key = [
            "bachelor",
            normalize(row["Titulación"]),
        ]

        center_id = stable_id("qedu-center", center_key)
        degree_id = stable_id("qedu-degree", degree_key)

        centers.setdefault(center_id, {
            "id": center_id,
            "universityCode": university,
            "name": row["Centro"].strip(),
            "province": row["Provincia"].strip(),
            "identity": center_key,
        })

        degrees.setdefault(degree_id, {
            "id": degree_id,
            "name": row["Titulación"].strip(),
            "academicLevel": "bachelor",
            "identity": degree_key,
        })

        language = row["Idioma extranjero"].strip()

        if language not in ("Sí", "No"):
            raise ValueError(
                f"Idioma extranjero desconocido en fila {row_number}"
            )

        offering_key = [
            university,
            center_id,
            degree_id,
            normalize(row["Modalidad"]),
            language,
        ]

        identity_hash = hashlib.sha256(
            json.dumps(
                offering_key,
                ensure_ascii=False,
                separators=(",", ":"),
            ).encode("utf-8")
        ).hexdigest()

        offering_id = stable_id("qedu-offering", offering_key)

        offerings.setdefault(offering_id, {
            "id": offering_id,
            "centerId": center_id,
            "degreeId": degree_id,
            "universityCode": university,
            "modality": row["Modalidad"].strip(),
            "foreignLanguage": language == "Sí",
            "identityHash": identity_hash,
            "officialReference": "QEDU:" + identity_hash,
            "rowNumbers": [],
        })

        offerings[offering_id]["rowNumbers"].append(row_number)

        links.append({
            "rowNumber": row_number,
            "offeringId": offering_id,
        })

        original_rows[tuple(sorted(row.items()))] += 1

    duplicates = sum(
        count - 1 for count in original_rows.values()
    )

    new_names = set(new_map)
    new_entities = [
        {
            "id": stable_id("qedu-university", new_map[name]),
            "officialCode": new_map[name],
            "name": name,
            "countryCode": "ES",
        }
        for name in sorted(new_names)
    ]

    manifest = {
        "source": "QEDU_GRADO_CSV",
        "fileName": INPUT.name,
        "fileSha256": file_hash,
        "referenceAcademicYear": None,
        "rowCount": len(rows),
        "universities": new_entities,
        "universityMappings": [
            {"qeduName": name, "officialCode": code}
            for name, code in sorted(university_codes.items())
        ],
        "centers": list(centers.values()),
        "degrees": list(degrees.values()),
        "offerings": list(offerings.values()),
        "rowLinks": links,
        "exactDuplicateRows": duplicates,
    }

    assert len(new_entities) == 5
    assert len(centers) == 1119
    assert len(degrees) == 887
    assert len(offerings) == 3933
    assert len(links) == 3962
    assert duplicates == 13

    assert len({
        item["identityHash"] for item in offerings.values()
    }) == 3933

    assert len({
        item["officialReference"] for item in offerings.values()
    }) == 3933

    OUTPUT.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print("MANIFIESTO QEDU GENERADO")
    print("SHA-256:", file_hash)
    print("Universidades nuevas:", len(new_entities))
    print("Correspondencias institucionales:", len(university_codes))
    print("Centros:", len(centers))
    print("Titulaciones:", len(degrees))
    print("Ofertas:", len(offerings))
    print("Relaciones con filas originales:", len(links))
    print("Duplicados originales:", duplicates)
    print("Archivo:", OUTPUT)
    print("PostgreSQL: sin modificaciones")


if __name__ == "__main__":
    main()
