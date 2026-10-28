import test from "node:test";
import assert from "node:assert/strict";
import { numericScore, overallChartValue, criterionChartValue, pageChartRows, offeringChartLabel } from "./chart-data.ts";

function offer(id, score, criteria = {}, center = "Centro A") {
  return { id, modality: null, degree: { id: "same-degree", name: "Grado de prueba", academicLevel: "bachelor" },
    university: { id: `university-${id}`, name: `Universidad ${id}` }, center: center ? { id: `center-${id}`, name: center } : null,
    evaluation: { id, score, criteria, coverage: { evaluated: Object.keys(criteria).length, requested: 3 }, areas: [], reasons: [], pending: [], status: "pending_verification" } };
}

test("zero is a valid score; null, invalid numbers and missing values are not zero", () => {
  assert.equal(numericScore(0), 0);
  assert.equal(numericScore(100), 100);
  for (const value of [null, undefined, NaN, Infinity, -1, 101, "80"]) assert.equal(numericScore(value), null);
  assert.deepEqual(overallChartValue(offer("A", 0)), { value: 0, label: "0/100" });
  assert.deepEqual(overallChartValue(offer("A", null)), { value: null, label: "Sin puntuación global" });
});

test("missing, inactive and zero criteria stay distinct", () => {
  const o = offer("A", null, { location: 0 });
  assert.equal(criterionChartValue(o, "location", ["location"]).value, 0);
  assert.deepEqual(criterionChartValue(o, "interests", ["interests", "location"]), { value: null, label: "Sin datos suficientes" });
  assert.deepEqual(criterionChartValue(o, "modality", ["location"]), { value: null, label: "No utilizado en este perfil" });
  assert.equal(criterionChartValue(o, "modality").label, "Sin datos suficientes");
});

test("null aggregate does not hide available partial criteria", () => {
  const o = offer("A", null, { interests: 50, location: 100 });
  assert.equal(overallChartValue(o).value, null);
  assert.equal(criterionChartValue(o, "interests", ["interests", "location", "modality"]).value, 50);
});

test("page rows preserve engine order, ties, nulls and distinct offering identities", () => {
  const input = [offer("B", 90), offer("A", 90), offer("C", 0), offer("D", null, {}, null)];
  const rows = pageChartRows(input);
  assert.deepEqual(rows.map((r) => r.id), ["B", "A", "C", "D"]);
  assert.deepEqual(rows.map((r) => r.value), [90, 90, 0, null]);
  assert.match(rows[0].offeringLabel, /Universidad B/);
  assert.match(rows[1].offeringLabel, /Universidad A/);
  assert.match(offeringChartLabel(input[3]), /Centro sin especificar/);
  assert.deepEqual(input.map((o) => o.id), ["B", "A", "C", "D"]);
});

test("empty page and a page of only unknown scores do not produce numeric scores", () => {
  assert.deepEqual(pageChartRows([]), []);
  assert.ok(pageChartRows([offer("A", null), offer("B", null)]).every((r) => r.value === null));
  const noEvaluation = offer("C", null); delete noEvaluation.evaluation;
  assert.equal(overallChartValue(noEvaluation).value, null);
  assert.equal(criterionChartValue(noEvaluation, "interests", ["interests"]).value, null);
});
