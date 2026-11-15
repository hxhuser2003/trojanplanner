import assert from "node:assert/strict";
import test from "node:test";
import { parseStarsText } from "./stars.ts";

test("in-progress and registered courses are included as completed planning candidates", () => {
  const result = parseStarsText([
    "20271 CSCI 561 0.0 IP Information Retrieval",
    "20271 CSCI 570 0.0 RG Analysis of Algorithms",
    "20261 CSCI 544 4.0 A Machine Learning",
  ].join("\n"));

  assert.deepEqual(result.completedCandidates, ["CSCI-544", "CSCI-561", "CSCI-570"]);
  assert.deepEqual(result.inProgressCandidates, ["CSCI-561", "CSCI-570"]);
});

test("incomplete and failed courses are not counted as completed", () => {
  const result = parseStarsText([
    "20271 CSCI 546 0.0 MG Deep Learning",
    "20261 CSCI 585 4.0 F Database Systems",
  ].join("\n"));

  assert.deepEqual(result.completedCandidates, []);
  assert.deepEqual(result.inProgressCandidates, []);
});
