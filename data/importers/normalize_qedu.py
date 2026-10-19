#!/usr/bin/env python3

"""Diagnóstico previo de normalización QEDU. No modifica PostgreSQL."""

import csv
import re
import unicodedata
from collections import defaultdict, Counter
from pathlib import Path

ROOT = Path("data")
QEDU = ROOT / "raw/qedu/qedu.csv"
ALIASES = ROOT / "mappings/qedu_istac_aliases.csv"
NEW = ROOT / "mappings/qedu_new_universities.csv"
ISTAC = Path("/tmp/aaahoraque-istac-universities.txt")


def read_csv(path):
    with path.open(encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def normalize(value):
    value = unicodedata.normalize("NFKD", value.casefold().strip())
    value = "".join(
        character for character in value
        if not unicodedata.combining(character)
    )
    value = re.sub(r"[^\w\s]", " ", value)
    return " ".join(value.split())


def main():
    rows = read_csv(QEDU)
    aliases = read_csv(ALIASES)
    new_universities = read_csv(NEW)

    assert len(rows) == 3962, "La descarga QEDU ha cambiado."
    assert len(aliases) == 7
    assert len(new_universities) == 5

    # Identificadores y denominaciones de las universidades
    # ISTAC que ya están importadas en PostgreSQL.
    istac = defaultdict(list)
    valid_codes = set()

    for line in ISTAC.read_text(encoding="utf-8").splitlines():
        code, name = line.split("|", 1)
        istac[normalize(name)].append(code)
        valid_codes.add(code)

    alias_map = {
        row["qedu_name"]: "ISTAC:CL_RUCT_UNIVERSIDADES:" + row["istac_code"]
        for row in aliases
    }

    new_map = {
        row["qedu_name"]: row["source_key"]
        for row in new_universities
    }

    assert len(alias_map) == 7, "Alias repetidos."
    assert len(new_map) == 5, "Instituciones nuevas repetidas."
    assert not set(alias_map).intersection(new_map)
    assert set(alias_map.values()).issubset(valid_codes)
    assert len(set(new_map.values())) == 5

    universities = {}
    unresolved = []

    for name in sorted({r["Universidad"].strip() for r in rows}):
        if name in alias_map:
            universities[name] = alias_map[name]
        elif name in new_map:
            universities[name] = new_map[name]
        else:
            candidates = istac.get(normalize(name), [])

            if len(candidates) == 1:
                universities[name] = candidates[0]
            else:
                unresolved.append((name, candidates))

    if unresolved:
        for name, candidates in unresolved:
            print("SIN RESOLVER:", name, candidates)
        raise SystemExit("Existen universidades sin correspondencia.")

    assert len(universities) == 94
    assert len(set(universities.values())) == 94

    # Son claves de agrupación candidatas, no códigos RUCT.
    centers = set()
    degrees = set()
    offerings = defaultdict(list)

    complete_rows = Counter()

    for row_number, row in enumerate(rows, start=1):
        university = universities[row["Universidad"].strip()]
        center = normalize(row["Centro"])
        degree = normalize(row["Titulación"])
        modality = normalize(row["Modalidad"])

        centers.add((university, center))
        degrees.add(("GRADO", degree))

        offering_key = (
            university,
            center,
            "GRADO",
            degree,
            modality,
        )

        offerings[offering_key].append((row_number, row))
        complete_rows[tuple(sorted(row.items()))] += 1

    exact_duplicates = sum(
        count - 1 for count in complete_rows.values()
    )

    # Una misma oferta puede tener varias observaciones QEDU.
    # Comprobamos qué atributos cambian dentro de cada grupo.
    differences = []

    for key, observations in offerings.items():
        if len(observations) < 2:
            continue

        fields = (
            "Provincia",
            "Comunidad Autónoma",
            "Tipo de universidad",
            "Tipo de centro",
            "Idioma extranjero",
            "Nota de corte",
        )

        changed = {
            field: sorted({
                row[field].strip()
                for _, row in observations
            })
            for field in fields
            if len({
                row[field].strip()
                for _, row in observations
            }) > 1
        }

        if changed:
            differences.append((key, observations, changed))

    print("\n=== NORMALIZACIÓN QEDU: SIMULACIÓN ===")
    print("Registros originales:", len(rows))
    print("Universidades resueltas:", len(universities))
    print("Universidades nuevas:", len(new_map))
    print("Centros candidatos:", len(centers))
    print("Titulaciones por nivel y nombre:", len(degrees))
    print("Ofertas candidatas:", len(offerings))
    print("Duplicados exactos originales:", exact_duplicates)
    print("Ofertas con atributos divergentes:", len(differences))

    assert exact_duplicates == 13

    print("\n=== PRIMERAS DISCREPANCIAS ===")

    for key, observations, changed in differences[:10]:
        print("\nOferta candidata:", key)
        print("Filas originales:", [
            number for number, _ in observations
        ])

        for field, values in changed.items():
            print(f"  {field}: {values}")

    print("\n=== VERIFICACIONES ===")

    print(
        "Filas vinculadas a una oferta candidata:",
        sum(len(group) for group in offerings.values())
    )

    assert sum(len(group) for group in offerings.values()) == 3962

    print("Curso académico: desconocido")
    print("PostgreSQL: sin modificaciones")
    print("Simulación terminada correctamente.")


if __name__ == "__main__":
    main()
