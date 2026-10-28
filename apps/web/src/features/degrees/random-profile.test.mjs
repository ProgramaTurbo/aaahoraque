import test from "node:test";
import assert from "node:assert/strict";
import { createRandomProfile, emptyProfile, regions, areas } from "./orientation-profile.ts";

test("random profiles respect questionnaire ranges and coherent locations", () => {
  let seed = 123;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 200; i++) {
    const profile = createRandomProfile(random);
    assert.equal(Object.keys(profile.interests).length, areas.length);
    assert.ok(Object.values(profile.interests).includes("like"));
    assert.ok(Object.values(profile.interests).every((v) => ["like", "dislike"].includes(v)));
    assert.ok(Object.values(profile.aptitudes).every((v) => Number.isInteger(v) && v >= 0 && v <= 4));
    assert.ok(Object.values(profile.priorities).every((v) => Number.isInteger(v) && v >= 0 && v <= 5));
    assert.ok(Object.values(profile.priorities).some((v) => v > 0));
    assert.ok(profile.access_grade >= 0 && profile.access_grade <= 10);
    assert.ok(profile.admission_grade >= profile.access_grade && profile.admission_grade <= 14);
    assert.ok(profile.allowed_provinces.includes(profile.origin_province));
    assert.ok(Object.values(regions).some((list) => JSON.stringify(list) === JSON.stringify(profile.allowed_provinces)));
    assert.ok(profile.budget >= 0);
    assert.ok(profile.max_years >= 1 && profile.max_years <= 10);
    assert.match(profile.previous_studies, /simulad/);
  }
});

test("generation does not mutate defaults or share editable answers between profiles", () => {
  const before = JSON.stringify(emptyProfile);
  const first = createRandomProfile(() => 0);
  const second = createRandomProfile(() => 0.999);
  assert.ok(first.priorities.interests > 0);
  first.interests.technology = "dislike";
  first.allowed_provinces.push("test");
  assert.ok(!second.allowed_provinces.includes("test"));
  assert.equal(JSON.stringify(emptyProfile), before);
  assert.notEqual(first.origin_province, second.origin_province);
});
