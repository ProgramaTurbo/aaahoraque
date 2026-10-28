#!/usr/bin/env bash

set -euo pipefail

: "${DATABASE_URL:?Carga primero .env.mv.local}"

SQL_FILE="data/generators/synthetic_results_v4.sql"
LOG_DIR="$HOME/aaahoraque-import-logs"

START=375001
TARGET=1000000
BATCH_SIZE=25000

mkdir -p "$LOG_DIR"

test -f "$SQL_FILE" || {
    echo "ERROR: no existe el generador V4."
    exit 1
}

echo "AAAHORAQUE - CARGA ACADÉMICA"
echo "Objetivo: 1.000.000 estudiantes / 40.000.000 resultados"
echo "Logs: $LOG_DIR"
echo

for (( FIRST=START; FIRST<=TARGET; FIRST+=BATCH_SIZE )); do

    LAST=$((FIRST + BATCH_SIZE - 1))

    if (( LAST > TARGET )); then
        LAST=$TARGET
    fi

    EXPECTED=$((LAST - FIRST + 1))
    EXPECTED_RESULTS=$((EXPECTED * 40))

    LOG="$LOG_DIR/batch-${FIRST}-${LAST}.log"

    # Evita sobrescribir silenciosamente un registro anterior.
    if [[ -e "$LOG" ]]; then
        echo "ERROR: ya existe $LOG"
        echo "Revisa el estado de ese lote antes de continuar."
        exit 1
    fi

    echo
    echo "======================================"
    echo "LOTE: $FIRST - $LAST"
    echo "Inicio: $(date)"
    echo "Esperados: $EXPECTED estudiantes"
    echo "Resultados: $EXPECTED_RESULTS"
    echo "======================================"

    if ! psql "$DATABASE_URL" \
        -X \
        -v ON_ERROR_STOP=1 \
        -v start="$FIRST" \
        -v end="$LAST" \
        -f "$SQL_FILE" \
        >"$LOG" 2>&1
    then
        cat "$LOG"
        echo "ERROR: lote $FIRST-$LAST detenido."
        exit 1
    fi

    # Verificamos que la ejecución haya insertado lo previsto
    # y que PostgreSQL haya confirmado la transacción.
    if ! grep -qx "INSERT 0 $EXPECTED" "$LOG" ||
       ! grep -qx "INSERT 0 $EXPECTED_RESULTS" "$LOG" ||
       ! grep -qx "COMMIT" "$LOG"
    then
        cat "$LOG"
        echo "ERROR: salida inesperada en $FIRST-$LAST."
        echo "No se iniciará el siguiente lote."
        exit 1
    fi

    echo "LOTE CONFIRMADO: $FIRST-$LAST"
    echo "Finalizado: $(date)"

done

echo
echo "======================================"
echo "TODOS LOS LOTES CONFIRMADOS"
echo "Finalización: $(date)"
echo "======================================"
