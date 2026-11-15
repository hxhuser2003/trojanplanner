# TrojanPlanner — local prototype

A USC course-planning demo that turns preferences into checked schedules, explains conflicts, and offers explicitly approved repairs. Fifteen Spring 2027 **graduate CSCI** offerings are cached from the [USC Schedule of Classes](https://classes.usc.edu/term/20271/program/CSCI/school/ENGV). Planning goals are illustrative, and enrollment eligibility remains unverified.

## Implemented

- Weekly calendar, searchable course catalog, degree/profile controls, and registration checklist.
- Anthropic-powered natural-language proposals with editable hard/soft constraints and confirmation before application.
- Google OR-Tools CP-SAT scheduling with real USC lecture/lab/discussion/quiz combinations, published prerequisite alternatives, completed-course exclusions, unit bounds, required courses, locked sections, and illustrative planning goals. TBA component times are flagged and omitted from time-conflict claims.
- Three distinct feasible alternatives where available, with exact-set exclusions.
- Proven-infeasible diagnosis, sufficient conflict sets, and solver-checked single-constraint repairs. No hard constraint changes without approval.
- Separate TypeScript output validator. Solver timeouts are not reported as infeasibility.
- Thirteen courses link to real USC-hosted syllabi or instructor course pages from earlier terms (CSCI 530, 531, 544, 545, 551, 561, 566, 567, 570, 571, 580, 585, and 587). Their grading details are displayed as historical and do not affect assessment preference scores. Missing or ambiguous grading weights stay unknown.
- CSCI 546 and 572 have course-specific mock syllabus pages for the demo. Their grading details are visibly synthetic and may affect illustrative assessment preference scores. No syllabus here certifies Spring 2027 grading.
- The default example uses two four-unit courses. USC's [MS CS new student guide](https://www.cs.usc.edu/ms-cs-new-student-guide/) limits traditional MS students who started in Spring 2020 or later to two four-unit CSCI/DSCI courses per semester, with stated exceptions. Check your own program and start term before using this as a registration rule.
- Paste STARS course rows to find completed-course candidates; the student confirms each one, and current registrations are never counted as completed.
- Browser-local saved planner state, stale-result safeguards, reset, printable checklist, and text export.

## Course and syllabus sources

Each course is a listed Spring 2027 offering. The linked syllabus material is from the term shown and may describe a different instructor or grading policy. The two mock syllabi are served by the app at the paths shown below.

| Course | Syllabus source |
| --- | --- |
| CSCI 530 Security Systems | [Fall 2026 USC course site](https://ccss.usc.edu/530/) |
| CSCI 531 Applied Cryptography | [Spring 2022 USC syllabus](https://web-app.usc.edu/soc/syllabus/20221/30321.pdf) |
| CSCI 544 Applied Natural Language Processing | [Fall 2024 USC syllabus](https://web-app.usc.edu/soc/syllabus/20243/30249.pdf) |
| CSCI 545 Robotics | [Spring 2024 USC syllabus](https://web-app.usc.edu/soc/syllabus/20241/30398.pdf) |
| CSCI 546 Distributed Systems | Mock syllabus at `/api/planner/mock-syllabi/CSCI-546` |
| CSCI 551 Computer Networking | [Fall 2025 USC/ISI syllabus](https://ant.isi.edu/~johnh/TEACHING/CS651/FA2025/csci551_csci651_fa2025_syllabus_251110.pdf) |
| CSCI 561 Foundations of Artificial Intelligence | [Spring 2023 USC syllabus](https://web-app.usc.edu/soc/syllabus/20231/30071.pdf) |
| CSCI 566 Deep Learning and Its Applications | [Fall 2026 USC lab syllabus](https://usc-fortis.github.io/CSCI566-F26/syllabus.pdf) |
| CSCI 567 Machine Learning | [Summer 2025 USC syllabus](https://web-app.usc.edu/soc/syllabus/20252/29922.pdf) |
| CSCI 570 Analysis of Algorithms | [Spring 2025 USC syllabus](https://web-app.usc.edu/soc/syllabus/20251/30395.pdf) |
| CSCI 571 Web Technologies | [Spring 2025 USC syllabus](https://web-app.usc.edu/soc/syllabus/20251/30378.pdf) |
| CSCI 572 Information Retrieval and Web Search Engines | Mock syllabus at `/api/planner/mock-syllabi/CSCI-572` |
| CSCI 580 3-D Graphics and Rendering | [Spring 2021 USC syllabus overview](https://web-app.usc.edu/soc/syllabus/20211/30390.pdf); grading weights unavailable |
| CSCI 585 Database Systems | [Fall 2024 USC syllabus](https://web-app.usc.edu/soc/syllabus/20243/30150.pdf) |
| CSCI 587 Geospatial Data Analysis | [Spring 2026 USC course site](https://infolab.usc.edu/teaching/csci587/S26/); project weight unclear |

## Start and develop

In Replit, use the managed API Server and TrojanPlanner workflows.

For a conventional local setup, install Node.js, pnpm, Python 3.12, and uv:

```sh
pnpm install
uv sync
pnpm --filter @workspace/api-spec run codegen
python scripts/sync_usc_courses.py  # refresh the checked-in Spring 2027 snapshot
```

Run the API with port 8080 and the frontend with port 25650, supplying `PORT` and frontend `BASE_PATH=/`. The API uses the local `.venv` Python when present, or `PYTHON_BIN` if set. A local reverse proxy must route `/api` to the API and `/` to the frontend; Replit's managed preview already does this.

The API uses Replit-managed `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` and `AI_INTEGRATIONS_ANTHROPIC_API_KEY`. A non-Replit installation needs an appropriate Anthropic configuration. Never commit credentials.

```sh
pnpm run typecheck
pnpm --filter @workspace/api-spec run codegen
```

The shared Express API invokes a bounded Python CP-SAT worker, rather than introducing an additional FastAPI service. The calendar is a custom React weekly grid. No database is required for this single-browser prototype.

## Try the conflict demo

1. Start with the default eight-unit plan: Fridays free, Tuesday/Thursday morning work, and two illustrative graduate planning goals.
2. The illustrative Algorithms goal includes real **CSCI 570**, whose listed Spring 2027 lecture/discussion bundles also include a Friday quiz.
3. Inspect the verified Friday conflict and approve the tested repair that removes the Friday rule.
4. Compare the resulting section combinations and open their official USC course listings.

## Privacy and limits

- STARS import is paste-only; no PDF is uploaded.
- Clicking “Find course candidates” sends the pasted text to this app's backend parser; it is not sent to the LLM, logged, or saved server-side.
- Confirmed course codes and planning state are saved in that browser's local storage. Raw documents/text are not persisted.
- Import is conservative course-row extraction, not an official STARS degree-audit parser. Repeated courses, exceptions, transfer-credit applicability, and graduate requirements require manual review.
- The sample is a selected graduate CSCI subset, not a reproduction of the supplied graduate report or a degree audit. The checked-in snapshot can become stale; refresh it and recheck official listings before registration.
- No live seat availability, registration, official requirement certification, or automated syllabus ingestion pipeline is implemented. Historical syllabi may not match the Spring 2027 instructor or section; mock syllabi are hypothetical.
- Registration eligibility stays explicitly unknown. Neither CP-SAT nor published section times guarantee enrollment. TBA quiz times prevent a full conflict check for affected combinations.
- No account system is included. Before public release, add abuse/rate controls for the paid AI endpoint and review privacy/security requirements.

## Needed for a real campus pilot

1. A verified target program and catalog year, including requirement and prerequisite rules.
2. A maintained data source or refresh process for the intended term, including change review and enrollment restrictions.
3. Current syllabi with instructor/section associations and permission to process them.
4. Representative, redacted STARS samples and advisor-reviewed expected results.
5. Full browser workflow testing, including STARS rows pasted from different report layouts.

The graduate-course integration is checked with workspace typechecking, a production build, and API smoke requests covering the default Friday conflict, its repair, and syllabus links. Full browser interaction testing and parsing of real pasted reports have not been verified.
