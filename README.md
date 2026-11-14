# TrojanPlanner

AI course registration copilot for USC students · AI@USC Hackathon, November 14–15, 2026.

**When your courses, degree requirements, and life conflict, see what must change—and choose the trade-off yourself.**

> Status: project plan / pre-implementation. The features below describe the intended MVP, not verified working functionality or confirmed USC integrations.

## The experience

Tell TrojanPlanner what next semester needs to look like: “Protect my Tuesday/Thursday work hours, cover these requirements, and prefer individual projects over exam-heavy classes.”

1. Review the AI's interpretation as editable hard constraints and soft preferences.
2. See a weekly calendar checked against the loaded course data and confirmed constraints.
3. If the request is infeasible, inspect the conflicting requirements and solver-checked repairs. Nothing hard is relaxed without your approval.
4. Compare genuinely different feasible schedules by campus days, start times, requirements, and evidence-backed assessment preferences.
5. Open the source behind a claim, then use a registration checklist to continue in USC's official system.

## What “checked” means

| Check | Scope |
|---|---|
| Schedule fit | Meeting overlaps, confirmed blocked times, linked meetings, and unit bounds |
| Degree fit | Verified rules for the supported major and catalog year |
| Registration eligibility | Prerequisites, restrictions, and availability when verified; otherwise explicitly unknown |

**Conflict-free against the loaded data and confirmed constraints—not a guarantee of enrollment or a replacement for academic advising.** Show the semester, source timestamp, and unchecked rules. A solver guarantees only the model it receives.

## Syllabus-based course fit

Use factual assessment information rather than invented study hours or grade-based difficulty estimates:

- Grading percentages and assessment formats: exams, quizzes, projects, participation.
- Explicit individual versus group projects and stated assignment cadence.
- Attendance and participation policies, distinguished from one another.
- Source syllabus, page, supporting excerpt, instructor, and term for each extracted claim.

Labels such as “project-heavy” are transparent derived interpretations, not syllabus quotations; always show the underlying breakdown and labeling rule. Missing information is **Not specified**, not zero. Historical syllabi are labeled historical and do not establish next semester's policies. Ambiguous or contradictory facts need review before ranking.

For the demo, manually verify a small set of legitimately available syllabi. Use exam/project emphasis, solo/group work, and assessment frequency as soft preferences. Missing syllabi must not make a course look better. Do not invent an overall semester difficulty score.

## Focused hackathon MVP

**One major, one catalog year, one semester, and a verified course subset.** Start with a synthetic student profile or manual completed-course selection.

- Natural language → editable constraints → deterministic solver → independent validation → grounded explanation.
- One feasible schedule first; additional options only when genuinely distinct.
- Conflict explanation, explicit approval of a repair, and a visible calendar update.
- Small, evidence-backed syllabus comparison and course-level source links.
- Instructor links and official syllabus links; no scraping of third-party reviews.
- Registration checklist with unknown eligibility checks clearly marked.

Defer general STARS parsing, broad major coverage, the browser extension, and calendar integrations. Dated exam-cluster alerts and backup sections are stretch features. Grade-distribution-based difficulty prediction is outside this MVP.

## Technical approach and safeguards

- React + Tailwind + FullCalendar frontend; FastAPI + Google OR-Tools CP-SAT backend; Claude API for structured extraction and explanations; JSON or SQLite data.
- Validate extracted schemas and references. Treat syllabus content as untrusted data, not agent instructions.
- Preserve confirmed hard constraints and locked courses during edits; approval changes only the selected constraint.
- Require explicit solution diversity instead of assuming new objective weights produce different schedules.
- Distinguish feasible, optimal, proven infeasible, timeout/unknown, and invalid-model results. A timeout is not proof of impossibility.
- Explain a sufficient verified conflict without claiming the mathematically smallest conflict set.
- Independently validate solver output and test linked sections, overlaps, prerequisites, infeasible requests, repairs, and missing syllabus data.

## Demo and adoption

Lead with a scheduling conflict, compare verified repairs, approve one, then compare assessment styles and open their source evidence. End with a realistic one-department, advisor-reviewed pilot—not a promise of campus-wide integration.

See [docs/PLAN.md](docs/PLAN.md) for the detailed scope, data contracts, acceptance checks, risks, and three-minute demo.
