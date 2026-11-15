# TrojanPlanner — local prototype

A USC course-planning demo that turns preferences into checked schedules, explains conflicts, and offers explicitly approved repairs. Seven Spring 2027 **graduate CSCI** offerings are cached from the [USC Schedule of Classes](https://classes.usc.edu/term/20271/program/CSCI/school/ENGV). Planning goals are illustrative, and enrollment eligibility remains unverified.

## Implemented

- Weekly calendar, searchable course catalog, degree/profile controls, and registration checklist.
- Anthropic-powered natural-language proposals with editable hard/soft constraints and confirmation before application.
- Google OR-Tools CP-SAT scheduling with real USC lecture/lab/discussion/quiz combinations, published prerequisite alternatives, completed-course exclusions, unit bounds, required courses, locked sections, and illustrative planning goals. TBA component times are flagged and omitted from time-conflict claims.
- Three distinct feasible alternatives where available, with exact-set exclusions.
- Proven-infeasible diagnosis, sufficient conflict sets, and solver-checked single-constraint repairs. No hard constraint changes without approval.
- Separate TypeScript output validator. Solver timeouts are not reported as infeasibility.
- Five courses link directly to real USC-hosted syllabi from earlier terms (CSCI 544, 561, 570, 571, and 585). Their grading details are displayed as historical and do not affect assessment preference scores.
- CSCI 546 and 572 have course-specific mock syllabus pages for the demo. Their grading details are visibly synthetic and may affect illustrative assessment preference scores. No syllabus here certifies Spring 2027 grading.
- PDF text extraction and optional browser-local OCR for scanned STARS reports; reviewed completed-course candidates remain separate from current registrations.
- Browser-local saved planner state, stale-result safeguards, reset, printable checklist, and text export.

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

1. Start with the default plan: Fridays free, Tuesday/Thursday morning work, and three illustrative graduate planning goals.
2. The illustrative Algorithms goal includes real **CSCI 570**, whose listed Spring 2027 lecture/discussion bundles also include a Friday quiz.
3. Inspect the verified Friday conflict and approve the tested repair that removes the Friday rule.
4. Compare the resulting section combinations and open their official USC course listings.

## Privacy and limits

- Uploaded report PDFs stay in the browser. OCR downloads its engine/language data from a public CDN.
- Clicking “Find course candidates” sends extracted text to this app's backend parser; it is not sent to the LLM, logged, or saved server-side.
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
5. Full browser workflow testing, especially OCR across different report scans.

The graduate-course integration is checked with workspace typechecking, a production build, and API smoke requests covering the default Friday conflict, its repair, and syllabus links. Full browser interaction testing and real-report OCR accuracy have not been verified.
