# TrojanPlanner: AI Course Registration Copilot

AI@USC Hackathon · November 14–15, 2026

> Planning document. Features and safeguards below are requirements, not claims of implemented functionality. Data access, the supported major/catalog year/semester, and syllabus availability still need verification. Confirm any named event track, judging weights, and sponsor-prize eligibility against official rules.

## 1. Product promise

**When your courses, degree requirements, and life conflict, see what must change—and choose the trade-off yourself.**

A next-semester planning assistant with a visual weekly calendar and conversational sidebar. The LLM interprets preferences and explains grounded results; deterministic code validates facts, solves constraints, and checks output. It does not invent course times, rules, syllabus facts, or eligibility.

Promise: **Conflict-free against the loaded data and confirmed constraints.** Not guaranteed enrollment, universal degree certification, or a replacement for an advisor.

## 2. Problem and initial audience

Students must reconcile course offerings, degree progress, work hours, and assessment preferences across multiple sources. The core problem is not merely creating a timetable: it is understanding and repairing incompatible requests without silently sacrificing something important.

Initial scope: **one graduate program example, one semester, and a selected course/section subset**. Use an illustrative profile or manual completed-course selection. Broader program coverage is future work. Academic advisors are potential pilot partners, not assumed endorsers.

Before building broadly, ask three students to walk through their last registration experience. Establish whether choosing courses, interpreting requirements, or repairing conflicts is the strongest pain point.

## 3. Core workflow

1. Load the supported student profile, completed courses, and verified remaining requirements.
2. Parse natural language into editable hard-constraint and soft-preference chips. Let the student confirm the interpretation; “prefer” must not silently become “must.”
3. Solve and independently validate a schedule against the loaded data.
4. If proven infeasible, show a verified conflicting set and individually tested repairs. Never silently relax hard constraints.
5. The student approves a specific repair. Re-solve while preserving all other hard constraints and locked courses; show what changed and what stayed protected.
6. Compare genuinely distinct schedules by measurable benefits and syllabus evidence.
7. Open course sources and produce a registration checklist for use in USC's official system. No automatic registration.

## 4. Three separate validation claims

| Check | Evidence and limitations |
|---|---|
| Schedule fit | Check all required meeting intervals, linked lecture/lab/discussion combinations, confirmed blocked times, and minimum/maximum units |
| Degree fit | Apply only verified requirement rules for the supported catalog year; track assignment of courses to requirements and prevent disallowed double counting |
| Registration eligibility | Verify prerequisites, co-requisites, restrictions, and availability where data supports it; mark missing checks unknown |

Every result displays the semester, source links, retrieval timestamp, supported scope, and unchecked rules. Cached seat counts do not guarantee availability. Unknown or TBA meeting times prevent a complete conflict-free claim for the affected schedule. A mathematically valid solution may still rely on incomplete data.

Alternative courses must be verified to satisfy the intended requirement. Do not infer equivalence from similar names. If postponing a course, disclose that downstream prerequisite and graduation effects are unverified unless explicitly modeled.

## 5. Syllabus-based course fit

Replace grade-derived difficulty predictions and invented study-hour estimates with evidence about how a course is assessed and organized.

### Extracted facts

| Dimension | Examples | Guardrail |
|---|---|---|
| Grading breakdown | Exams 60%, projects 30%, participation 10% | Preserve actual weights; do not invent missing percentages |
| Assessment format | Two midterms, final, weekly quizzes | Frequency is not difficulty |
| Project structure | Individual assignments, semester-long group project | Separate individual, group, mixed, and unspecified |
| Assignment cadence | Weekly problem sets | Use only explicitly supported frequency |
| Attendance policy | Required attendance, graded participation | Distinguish obligations from grade contributions |
| Assessment dates | Explicit dated exams/deadlines | Stretch use only; retain tentative status and term |

Store each fact with the course/section association, instructor, term, syllabus source URL, page, brief supporting excerpt, extraction status, and review status. Preserve exceptions such as optional finals, dropped scores, or alternative grading schemes rather than flattening them into misleading percentages.

### Facts versus interpretations

“Projects account for 60% of the grade” can be a sourced fact. “Project-heavy” is a derived label: define and display its rule and show the underlying weights. Prefer neutral “mixed assessments” to “well-rounded.” Define thresholds before use and test boundary cases; do not imply pedagogical quality.

Historical syllabi must be labeled historical and cannot establish current-offering facts. Verify instructor/term matches. Missing values remain **Not specified**, never zero or an inferred absence of exams/group work. Flag ambiguous tables, contradictory text, or unexpected totals for manual review. Do not force percentages to total 100 when bonus or conditional policies explain otherwise.

### Ranking and UI

For the demo, manually verify a small set of legitimately available syllabi. Support three soft preferences: exam/project emphasis, solo/group work, and assessment frequency. Display course-level evidence rather than an unexplained semester difficulty score. Missing or unverified data must not earn a favorable score; show evidence coverage and avoid definitive comparisons when coverage is insufficient.

Example request: “Protect my work hours and prefer individual projects over exam-heavy courses.” Both output schedules must still satisfy the confirmed hard constraints. Explain assessment trade-offs with the verified course facts and visible scoring rules.

## 6. Meaningfully different options

Return one valid schedule first. Offer a second or third only when genuinely distinct. Changing objective weights alone does not ensure diversity: add exclusion constraints and, where useful, a minimum difference in selected courses/sections or meaningful schedule attributes.

Label alternatives by observed benefits: “Fewest campus days,” “Later mornings,” or “Better match for assessment preferences.” Report units, requirement coverage, campus days, earliest/latest meetings, scheduled class hours, gaps, and preference matches. Scheduled class hours are not estimated study hours.

If only one feasible option is established, show one. Do not claim uniqueness unless the search proves it; if search was limited, say no further alternatives were found within the search budget.

## 7. Syllabus links

Preserve outbound links alongside evidence-backed syllabus facts:

- Syllabus: official Schedule of Classes link where available; otherwise a clearly labeled usc.edu-limited search link. A search result is not verified evidence.
- Link to original syllabi; do not rehost full documents. Process only legitimately accessible or authorized materials, retain minimal supporting excerpts as permitted, and verify association with the intended offering.
- No instructor ratings or review links. The tool compares courses by published facts (times, units, syllabus structure), not by opinions about instructors.

## 8. Architecture

Use a bounded pipeline rather than an open-ended agent loop:

Student input → structured preference extraction → schema/reference validation → user-confirmed constraints → CP-SAT solve → independent result validation → grounded explanation → calendar and comparison UI.

Syllabus pipeline: authorized source → structured extraction with evidence → deterministic checks → manual review for the demo → confirmed course attributes → transparent soft-preference scoring.

Suggested functions:
- parse_preferences(text): typed hard/soft constraints and proposed edits.
- get_requirements(profile): supported, sourced requirement rules.
- search_courses(filters): verified course/section records.
- get_syllabus_info(section): sourced, reviewed facts and unknowns.
- solve_schedule(constraints): status, candidate schedules, objective values, and diagnostics.
- validate_schedule(result): independent invariant checks.
- diagnose_conflict(constraints): verified sufficient conflict and tested repair candidates.
- explain_result(validated_result): source-bound explanations, differences, and limitations.

Treat retrieved documents and syllabi as untrusted data, not tool instructions. Validate model-produced JSON, IDs, enums, dates, and numeric values. Unknown course IDs or unsupported claims must be rejected, not filled in by the model. Explanations may only use validated facts and solver results.

### Solver requirements

- Enforce all modeled hard constraints: meeting compatibility, linked components, blocked times, unit bounds, confirmed requirements, locked selections, and verified eligibility rules.
- Optimize transparent requirement priorities and soft time/assessment preferences. Avoid a workload penalty based on invented data.
- Keep hard constraints separate from preferences; repair approval changes only the explicitly approved constraints.
- Distinguish optimal, feasible, proven infeasible, unknown/time-limit, and model-invalid outcomes. A timeout is not proof of infeasibility; a feasible incumbent is not necessarily optimal. Validate incumbents before display.
- For conflict diagnosis, compute and verify a sufficient conflicting set. One-at-a-time relaxation does not generally establish a minimum-cardinality conflict. Do not claim the “smallest” conflict or repair unless proven.
- Re-solve every proposed repair before offering it as feasible. If no verified repair is found within budget, say so. Protect non-negotiable constraints; user approval is required before changing any hard constraint.

## 9. Data and privacy

| Data | Source | MVP policy |
|---|---|---|
| Offerings and sections | USC Schedule of Classes | Verify access method, cache supported subset, retain term/source/timestamp |
| Degree rules | Official program requirements | One major/catalog year; manually reviewed rules |
| Student progress | Synthetic profile or manual selection | Minimal information needed for the demo |
| Syllabus facts | Legitimately available or authorized syllabi | Small manually verified set, provenance per fact, no full-document rehosting |

General STARS upload is deferred. If added, show extracted requirements for student confirmation before solving; minimize/redact identifiers, define retention/deletion, prevent sensitive content in logs, and disclose any external model transmission. Do not claim “local-only” or “no sensitive data stored” without verifying the full processing path.

## 10. Stack and implementation order

- Frontend: React, Tailwind, FullCalendar.
- Backend: FastAPI/Python and Google OR-Tools CP-SAT.
- LLM: Claude API for constrained extraction and grounded explanation.
- Data: JSON or SQLite.
- Hosting: choose the simplest deployment the team can verify; existing candidates are Vercel plus Render/Replit, or a consolidated Replit deployment. Hosting does not establish sponsor-prize eligibility.

Build order:
1. Verify the bounded course dataset, requirement rules, and demo syllabus availability.
2. Produce and independently validate a schedule from structured inputs.
3. Implement proven-infeasible handling, tested repairs, and approval-driven updates.
4. Add natural-language parsing and editable chips.
5. Add a genuinely distinct option and evidence-backed assessment comparison.
6. Polish sources, checklist, deployed demo, recording, and submission materials.

## 11. MVP versus stretch

Must ship: supported profile and course subset; editable constraints; calendar; a validated schedule; verified conflict explanation and approved repair; meaningful alternative where feasible; small syllabus comparison; source links; registration checklist.

Defer: general STARS parsing, broad major coverage, browser extension, Google Calendar integration, and multi-semester planning. Grade-distribution-based difficulty estimation is outside the MVP and not a dependency.

Stretch: backup sections and exam/deadline clustering from explicit current-term dates. Historical or tentative dates cannot support confident current-term clash alerts; missing dates do not imply no clashes.

## 12. Verification and acceptance checks

- Overlapping meetings and blocked work periods cannot pass validation.
- Required lecture/lab/discussion combinations are selected together and checked.
- Unit minimums/maximums and modeled requirement allocation are respected.
- Known unmet prerequisites are rejected; unknown eligibility is visibly flagged.
- Infeasible requests produce a verified explanation, not an invented schedule.
- Timeouts and invalid models do not produce claims of impossibility.
- Every offered repair is checked, requires approval, and preserves all other hard constraints/locked courses.
- Distinct options differ meaningfully; duplicate solutions are suppressed.
- Edits preserve prior confirmed constraints unless explicitly changed.
- Syllabus claims resolve to the correct source/page/term/instructor and supporting excerpt.
- Missing, historical, contradictory, and conditional syllabus facts are displayed accurately and cannot falsely improve ranking.
- Derived labels have visible rules; no grade-derived difficulty or fabricated study-hour claims.
- Unsupported course IDs and prompt-like instructions inside source documents are rejected/ignored.
- End-to-end demo works with the cached dataset and clearly discloses stale or unchecked information.

## 13. Three-minute demo

1. 0:00–0:25: Introduce one student, a required course, and fixed work hours using the verified demo data.
2. 0:25–0:50: Enter preferences; show editable hard/soft interpretation.
3. 0:50–1:20: Reveal a genuine conflict in the demo dataset and open its supporting source.
4. 1:20–2:00: Compare tested repairs; approve one and show the calendar change without silently changing other constraints.
5. 2:00–2:30: Compare assessment styles for feasible alternatives and open syllabus evidence; show checks and unknowns.
6. 2:30–3:00: Show the registration checklist and propose a one-department, advisor-reviewed pilot.

Do not present hypothetical course meeting patterns as actual USC facts. Use a synthetic student but verified course information, or label fixtures explicitly. Do not promise campus-wide integration next semester.

## 14. Event fit and submission

Emphasize campus impact, useful AI, feasible adoption, and clear UX without asserting unverified rubric percentages or claims about competing teams. Differentiation: transparent conflict repair, validated scheduling, student-controlled trade-offs, and evidence-backed assessment fit.

The supplied event brief requires a working prototype link, public GitHub repository, project description, video of at most three minutes, short slide deck, and at least one screenshot, with teammates added. The listed deadline is November 15, 2026 at 11:00 AM PT. Verify official rules and any changes before submission. Do not change repository visibility without explicit owner approval.

## 15. Risks and adoption

| Risk | Mitigation |
|---|---|
| Missing course or syllabus access | Verify early; use a visibly labeled mock syllabus only for demo behavior, never as USC evidence |
| Incomplete eligibility/degree rules | Bound claims, show unknowns, seek advisor review |
| Solver complexity or slow search | Small dataset, time limits, honest status handling, validated incumbents |
| Misparsed preferences | Editable chips and confirmation before use |
| Historical or ambiguous syllabus | Visible provenance, manual review, no unsupported ranking |
| Demo overreach | One conflict-repair workflow before optional features |
| Privacy and source permissions | Minimal data, documented processing, authorized sources |

Pilot with one department and advisor-reviewed requirements. Measure time to a usable schedule, manual corrections required, and whether students understand the trade-offs. Seek Registrar/advising collaboration for maintained official data rather than assuming access or endorsement. Expand majors, advisor sharing, multi-semester reasoning, and integrations only after validating the core workflow.

## 16. Current data status

Seven graduate Spring 2027 CSCI courses are cached in `artifacts/api-server/src/planner/usc-spring-2027.json` from USC's public Schedule of Classes course API. Run `python scripts/sync_usc_courses.py` to refresh them. The snapshot records a UTC retrieval timestamp and each course links to its official listing.

The loader creates complete lecture/lab/discussion/quiz combinations for matching USC link codes and sessions, and the solver checks their published meeting times. TBA components remain attached to each combination and are disclosed as unchecked times. Prerequisite alternatives are modeled as groups in which at least one listed course must be completed. Seat counts are deliberately not treated as enrollment guarantees.

The default planning goals are illustrative and clearly labeled. No official degree requirement has been encoded. Five courses link to dated USC-hosted historical syllabi; two have clearly labeled mock syllabus pages. The solver excludes historical assessment weights from preference scoring and uses mock weights only for demonstration. Before a campus pilot, confirm degree rules, registration eligibility, and current syllabi with the relevant USC offices.
