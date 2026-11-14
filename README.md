# TrojanPlanner — local prototype

A USC course-planning demo that turns preferences into checked schedules, explains conflicts, and offers explicitly approved repairs. All course offerings, degree rules, instructor names, and syllabus excerpts are **synthetic**.

## Implemented

- Weekly calendar, searchable course catalog, degree/profile controls, and registration checklist.
- Anthropic-powered natural-language proposals with editable hard/soft constraints and confirmation before application.
- Google OR-Tools CP-SAT scheduling with linked meeting bundles, known prerequisites, completed-course exclusions, unit bounds, required courses, locked sections, and illustrative requirement groups.
- Three distinct feasible alternatives where available, with exact-set exclusions.
- Proven-infeasible diagnosis, sufficient conflict sets, and solver-checked single-constraint repairs. No hard constraint changes without approval.
- Separate TypeScript output validator. Solver timeouts are not reported as infeasibility.
- Syllabus assessment breakdowns, individual/group project preferences, source excerpts, and clear unknowns. Source pages are synthetic, not purported USC syllabi.
- PDF text extraction and optional browser-local OCR for scanned STARS reports; reviewed completed-course candidates remain separate from current registrations.
- Browser-local saved planner state, stale-result safeguards, reset, printable checklist, and text export.

## Start and develop

In Replit, use the managed API Server and TrojanPlanner workflows.

For a conventional local setup, install Node.js, pnpm, Python 3.12, and uv:

```sh
pnpm install
uv sync
pnpm --filter @workspace/api-spec run codegen
```

Run the API with port 8080 and the frontend with port 25650, supplying `PORT` and frontend `BASE_PATH=/`. The Python executable used by the API must have the dependencies from `pyproject.toml` available. A local reverse proxy must route `/api` to the API and `/` to the frontend; Replit's managed preview already does this.

The API uses Replit-managed `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` and `AI_INTEGRATIONS_ANTHROPIC_API_KEY`. A non-Replit installation needs an appropriate Anthropic configuration. Never commit credentials.

```sh
pnpm run typecheck
pnpm --filter @workspace/api-spec run codegen
```

The shared Express API invokes a bounded Python CP-SAT worker, rather than introducing an additional FastAPI service. The calendar is a custom React weekly grid. No database is required for this single-browser prototype.

## Try the conflict demo

1. Start with the default plan: Fridays free, Tuesday/Thursday afternoon work, and three illustrative requirement groups.
2. In Courses, add **CSCI 270** as required. Its synthetic section includes Friday discussion.
3. Inspect the Friday/required-course conflict.
4. Approve either removing the Friday rule or removing the required-course rule. The selected requirements and other constraints remain unchanged.
5. Compare the resulting plans and open the synthetic syllabus evidence.

## Privacy and limits

- Uploaded report PDFs stay in the browser. OCR downloads its engine/language data from a public CDN.
- Clicking “Find course candidates” sends extracted text to this app's backend parser; it is not sent to the LLM, logged, or saved server-side.
- Confirmed course codes and planning state are saved in that browser's local storage. Raw documents/text are not persisted.
- Import is conservative course-row extraction, not an official STARS degree-audit parser. Repeated courses, exceptions, transfer-credit applicability, and graduate requirements require manual review.
- The sample is an undergraduate CS subset, not a reproduction of the supplied graduate report or a verified USC catalog.
- No live seat availability, registration, official requirement certification, or real syllabus ingestion pipeline is implemented.
- Registration eligibility stays explicitly unknown. Neither CP-SAT nor synthetic evidence guarantees enrollment.
- No account system is included. Before public release, add abuse/rate controls for the paid AI endpoint and review privacy/security requirements.

## Needed for a real campus pilot

1. A verified target program and catalog year, including requirement and prerequisite rules.
2. Authorized course/section data for the intended term.
3. Current syllabi with instructor/section associations and permission to process them.
4. Representative, redacted STARS samples and advisor-reviewed expected results.
5. Full browser workflow testing, especially OCR across different report scans.

The initial build was checked with workspace typechecking, API smoke requests (solve, conflict, approved repair, AI extraction, synthetic STARS parsing), and a rendered preview. Full browser interaction testing and real-report OCR accuracy have not been verified.

No Git commit or GitHub push was made for this build.
