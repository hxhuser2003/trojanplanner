import assert from "node:assert/strict";
import test from "node:test";
import { diffSchedules, formatSectionMeetings, latestEndTime } from "./format.ts";

const catalog = {
  courses: [{
    id: "CSCI-561",
    code: "CSCI-561",
    sections: [{
      id: "lecture-discussion-quiz",
      meetings: [
        { day: 0, start: 1080, end: 1220, kind: "Lecture" },
        { day: 0, start: 1230, end: 1280, kind: "Discussion" },
      ],
      unknownScheduleComponents: ["Quiz 30034 time TBA"],
    }, {
      id: "new-section",
      meetings: [
        { day: 1, start: 1080, end: 1220, kind: "Lecture" },
        { day: 1, start: 1230, end: 1300, kind: "Discussion" },
      ],
      unknownScheduleComponents: ["Quiz 30035 time TBA"],
    }],
  }],
};

const schedule = (sectionId, overrides = {}) => ({
  id: sectionId,
  title: sectionId,
  selections: [{ courseId: "CSCI-561", sectionId, reason: "" }],
  units: 4,
  campusDays: 1,
  classHours: 2.5,
  gapMinutes: 0,
  earliestStart: 1080,
  score: 0,
  assessmentSummary: "",
  checks: [],
  warnings: [],
  ...overrides,
});

test("section meetings are listed by type with time ranges and TBA components", () => {
  assert.deepEqual(formatSectionMeetings(catalog, "CSCI-561", "lecture-discussion-quiz"), [
    { kind: "Lecture", time: "Mon 6:00pm–8:20pm" },
    { kind: "Discussion", time: "Mon 8:30pm–9:20pm" },
    { kind: "Quiz", time: "TBA" },
  ]);
});

test("latest scheduled end time is derived from selected section meetings", () => {
  assert.equal(latestEndTime(catalog, schedule("lecture-discussion-quiz")), 1280);
  assert.equal(latestEndTime(catalog, null), null);
});

test("schedule stat changes include units, days, class hours, and latest end labels", () => {
  const before = schedule("lecture-discussion-quiz", { units: 11, campusDays: 3, classHours: 10, earliestStart: 600 });
  const after = schedule("new-section", { units: 12, campusDays: 5, classHours: 12, earliestStart: 630 });
  const diff = diffSchedules(before, after, catalog);

  assert.deepEqual(diff.stats.map((item) => item.label), ["Units", "Campus days", "Class hours", "First class", "Latest scheduled end"]);
  assert.deepEqual(diff.stats.slice(0, 3).map(({ before, after }) => [before, after]), [
    ["11 units", "12 units"],
    ["3 days", "5 days"],
    ["10.0 hours", "12.0 hours"],
  ]);
  assert.deepEqual(diff.stats.at(-1), {
    label: "Latest scheduled end",
    before: "9:20pm",
    after: "9:40pm",
  });
});
