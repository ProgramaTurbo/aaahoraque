import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyProfile, normalizeLevel, deriveOrientationProfile, scaleMeasure, selectExplorationAreas,
  migrateOrientationProfile, toOrientationEngineProfile, readOrientationSession, profileValidationMessages,
} from "./orientation-profile.ts";

const blank = () => structuredClone(emptyProfile);
const rated = (level) => ({ state: "answered", level });

test("five scale levels and zero, unknown, unanswered are distinct", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(normalizeLevel), [0, 25, 50, 75, 100]);
  for (const invalid of [-1, 5, 0.5, NaN, Infinity]) assert.equal(normalizeLevel(invalid), null);
  const p = blank();
  p.answers = { "interests.technology": rated(0), "interests.health": { state: "unknown" } };
  assert.equal(scaleMeasure(p, "interests.technology").value, 0);
  assert.equal(scaleMeasure(p, "interests.health").state, "unknown");
  assert.equal(scaleMeasure(p, "interests.arts").state, "unanswered");
  assert.equal(scaleMeasure(p, "interests.health").value, null);
});

test("case A: a relative science preference preserves technology interest at 100", () => {
  const p = blank();
  p.answers = { "interests.technology": rated(4), "interests.science": rated(3) };
  p.comparisons = { "science:technology": "prefer_a" };
  const derived = deriveOrientationProfile(p);
  assert.equal(derived.generalInterests.technology.value, 100);
  assert.equal(derived.comparativePreferences.technology.preference, 0);
  assert.equal(derived.comparativePreferences.science.preference, 100);
  assert.equal(toOrientationEngineProfile(p).area_interest_scores.technology, 100);
  assert.deepEqual(toOrientationEngineProfile(p).interests, {});
  assert.deepEqual(toOrientationEngineProfile(p).interest_choices, {});
});

test("case B: both provides two positive pieces of evidence and no relative preference", () => {
  const p = blank();
  p.comparisons = { "technology:arts": "both" };
  const d = deriveOrientationProfile(p);
  for (const area of ["technology", "arts"]) {
    assert.equal(d.comparativePreferences[area].positive, 1);
    assert.equal(d.comparativePreferences[area].preference, null);
    assert.equal(d.generalInterests[area].value, null);
  }
});

test("neither is negative activity evidence, never a new direct zero", () => {
  const p = blank();
  p.comparisons = { "technology:arts": "neither" };
  const d = deriveOrientationProfile(p);
  assert.equal(d.comparativePreferences.technology.negative, 1);
  assert.equal(d.generalInterests.technology.value, null);
  assert.equal(d.comparativePreferences.technology.preference, null);
});

test("cases C and D: unknown or omitted comparisons never produce zero or a fictitious 50", () => {
  const p = blank();
  p.comparisons = { "technology:arts": "unknown" };
  const d = deriveOrientationProfile(p);
  assert.equal(d.comparativePreferences.technology.unknown, 1);
  assert.equal(d.coverage.valid, 0);
  for (const evidence of Object.values(d.comparativePreferences)) assert.equal(evidence.preference, null);
  assert.deepEqual(toOrientationEngineProfile(p).area_interest_scores, {});
});

test("comparative normalization uses only relative comparisons, both/neither do not change denominator", () => {
  const p = blank();
  p.comparisons = { "technology:arts": "prefer_a", "science:technology": "prefer_a" };
  assert.equal(deriveOrientationProfile(p).comparativePreferences.technology.preference, 50);
  p.comparisons["science:technology"] = "both";
  assert.equal(deriveOrientationProfile(p).comparativePreferences.technology.preference, 100);
});

test("case E: adaptive questions have deterministic ties and preserve hidden answers without scoring them", () => {
  const p = blank();
  p.answers = {
    "interests.technology": rated(3), "interests.engineering": rated(3), "interests.health": rated(3),
    "interests.arts": rated(2), "subinterests.technology.programming": rated(4),
  };
  assert.deepEqual(selectExplorationAreas(p), ["technology", "engineering", "health"]);
  const first = deriveOrientationProfile(p);
  assert.equal(first.subinterests.technology[0].value, 100);
  assert.equal(first.generalInterests.technology.value, 75);
  p.answers["interests.technology"] = rated(0);
  const next = deriveOrientationProfile(p);
  assert.deepEqual(next.exploredAreas, ["engineering", "health", "arts"]);
  assert.equal(next.subinterests.technology, undefined);
  assert.equal(next.measures["subinterests.technology.programming"], undefined);
  assert.equal(p.answers["subinterests.technology.programming"].level, 4);
  assert.equal(next.coverage.valid, first.coverage.valid - 1);
});

test("conditional questions do not lower coverage before they apply", () => {
  const p = blank();
  const before = deriveOrientationProfile(p).coverage.applicable;
  p.answers = { "interests.technology": rated(0) };
  assert.equal(deriveOrientationProfile(p).coverage.applicable, before);
  p.answers["interests.technology"] = rated(1);
  assert.equal(deriveOrientationProfile(p).coverage.applicable, before + 4);
});

test("case F: migration preserves originals, converts direct scores and asks for checkbox intensity", () => {
  const old = {
    interests: { technology: "like", arts: "dislike" }, aptitudes: { logic: 3 },
    interest_choices: { "technology:arts": "A" }, activities: ["Resolver problemas"], goals: ["Salario"],
  };
  const p = migrateOrientationProfile(old);
  const d = deriveOrientationProfile(p);
  assert.equal(p.schemaVersion, 2);
  assert.deepEqual(p.legacyAnswers, old);
  assert.equal(d.generalInterests.technology.value, 100);
  assert.equal(d.generalInterests.arts.value, 0);
  assert.equal(d.perceivedCapacities[0].value, 75);
  assert.equal(d.activityPreferences[0].value, null);
  assert.equal(d.comparativePreferences.technology.preference, 100);
  assert.deepEqual(p.activities, old.activities);
  assert.deepEqual(migrateOrientationProfile(p), p);
});

test("session recovery preserves incomplete answers, current step and completed snapshot independently", () => {
  const p = blank();
  p.answers = { "interests.technology": rated(4), "activities.help": { state: "unknown" } };
  const saved = readOrientationSession(JSON.stringify({ draft: p, profile: blank(), step: 4 }));
  assert.equal(saved.step, 4);
  assert.deepEqual(saved.draft.answers, p.answers);
  assert.equal(saved.profile.answers["interests.technology"], undefined);
  assert.deepEqual(readOrientationSession("invalid"), {});
  assert.equal(readOrientationSession(JSON.stringify({ draft: { interests: null }, step: 100 })).step, 6);
  assert.deepEqual(readOrientationSession(JSON.stringify({ draft: { answers: { bad: null } } })).draft.answers, {});
});

test("engine adapter keeps mobility, priorities and mandatory restrictions unchanged", () => {
  const p = blank();
  p.mobility = "require_region";
  p.allowed_provinces = ["Zaragoza", "Huesca", "Teruel"];
  p.modality_strict = true; p.modality = "online";
  p.priorities = { interests: 5, location: 0, modality: 3 };
  const adapted = toOrientationEngineProfile(p);
  assert.equal(adapted.mobility, p.mobility);
  assert.deepEqual(adapted.allowed_provinces, p.allowed_provinces);
  assert.deepEqual(adapted.priorities, p.priorities);
  assert.equal(adapted.modality_strict, true);
});

test("validation reports inconsistent academic, budget and location answers", () => {
  const p = blank();
  p.access_grade = 8; p.admission_grade = 7; p.budget_strict = true;
  p.locationPreferences = { preferred: ["Madrid"], acceptable: [], unavailable: ["Madrid"], moving: "unknown", commuting: "unknown" };
  assert.equal(profileValidationMessages(p).length, 3);
});

test("legacy checkbox mappings preserve the original selection without inventing intensity", () => {
  const migrated = migrateOrientationProfile({ activities: ["Resolver problemas", "Leer y argumentar"], goals: ["Salario"] });
  const d = deriveOrientationProfile(migrated);
  assert.deepEqual(d.legacySelections, [
    { label: "Resolver problemas", questionId: "activities.problem_solving" },
    { label: "Leer y argumentar", questionId: null },
    { label: "Salario", questionId: "motivations.salary" },
  ]);
  assert.equal(d.measures["activities.problem_solving"].state, "unanswered");
});

test("migration leaves the supplied snapshot untouched", () => {
  const old = { academicStatus: { access_grade: "invalid" }, answers: { "interests.arts": { state: "answered", level: 7 } }, priorities: { interests: 4 } };
  const before = structuredClone(old);
  const migrated = migrateOrientationProfile(old);
  assert.deepEqual(old, before);
  assert.equal(migrated.academicStatus.access_grade, "unknown");
  assert.equal(migrated.answers["interests.arts"], undefined);
  assert.equal(migrated.priorities.interests, 4);
  assert.equal(migrated.priorities.location, 1);
});
