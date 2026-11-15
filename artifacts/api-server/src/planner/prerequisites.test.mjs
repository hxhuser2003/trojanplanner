import assert from "node:assert/strict";
import test from "node:test";
import { formatPrerequisiteGroups, unmetPrerequisiteGroups } from "./prerequisites.ts";

test("one completed course satisfies an alternatives group", () => {
  const groups = [["CSCI-104", "CSCI-114"]];

  assert.deepEqual(unmetPrerequisiteGroups(groups, ["CSCI-104"]), []);
  assert.deepEqual(unmetPrerequisiteGroups(groups, ["CSCI-114"]), []);
});

test("separate prerequisite groups must each be satisfied", () => {
  const groups = [["CSCI-104", "CSCI-114"], ["CSCI-170"]];

  assert.deepEqual(
    unmetPrerequisiteGroups(groups, ["CSCI-104"]),
    [["CSCI-170"]],
  );
  assert.deepEqual(
    unmetPrerequisiteGroups(groups, ["CSCI-170"]),
    [["CSCI-104", "CSCI-114"]],
  );
  assert.deepEqual(unmetPrerequisiteGroups(groups, ["CSCI-114", "CSCI-170"]), []);
});

test("explanations identify unmet groups without implying every alternative is required", () => {
  const missing = unmetPrerequisiteGroups(
    [["CSCI-104", "CSCI-114"], ["CSCI-170"]],
    ["CSCI-170"],
  );

  assert.equal(formatPrerequisiteGroups(missing), "one of (CSCI-104 or CSCI-114)");
  assert.equal(
    formatPrerequisiteGroups([["CSCI-104", "CSCI-114"], ["CSCI-170", "EE-250"]]),
    "one of (CSCI-104 or CSCI-114) and one of (CSCI-170 or EE-250)",
  );
});
