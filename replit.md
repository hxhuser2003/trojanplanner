# TrojanPlanner

A local USC course-planning prototype with synthetic offerings, CP-SAT scheduling, explicit conflict repairs, and syllabus-based assessment fit.

## User instructions and scope

- Do not create Git commits or push to GitHub for this build. Keep implementation local unless the user subsequently authorizes otherwise.
- Synthetic data is allowed and must be clearly labeled. Do not represent fixtures as USC course or degree facts.
- Syllabus assessment structure (grading weights, exams/projects, individual/group work) is useful factual evidence; do not substitute grade distributions or invented difficulty estimates.
- Uploaded STARS documents are private format references, not public assets or seeded demo profiles. Never copy their personal details into fixtures, memory, logs, or source files.

## Running

- Managed API workflow: `artifacts/api-server: API Server`.
- Managed frontend workflow: `artifacts/trojan-planner: web`.
- `pnpm run typecheck` checks the workspace.
- `pnpm --filter @workspace/api-spec run codegen` regenerates hooks and validation schemas.
- Python 3.12 and dependencies in `pyproject.toml` / `uv.lock` provide OR-Tools.
- AI preference extraction uses Replit-managed Anthropic access; secrets are managed through the integration.

## Implementation

- React/Vite frontend in `artifacts/trojan-planner`; API in `artifacts/api-server`.
- `lib/api-spec/openapi.yaml` is the API contract.
- Planner modules in `artifacts/api-server/src/planner`: synthetic catalog, CP-SAT worker, independent output validator, AI extraction, and conservative STARS course-row parsing.
- The shared Express server invokes a bounded Python solver process rather than adding a separate FastAPI server. This keeps one API service while retaining CP-SAT.
- Browser storage holds planner inputs and results; no database or account is required for the local demo. Raw PDF and report text are not persisted.
- PDF text extraction/OCR runs in the browser. OCR engine/language assets download from CDN; extracted text is explicitly sent to the API for parsing, not to an LLM.
- No general degree-audit inference from STARS. The supported catalog is a synthetic undergraduate subset, not the user's degree audit.

## Trust boundaries

- Confirm all parsed constraints before applying; never relax a hard rule without explicit approval.
- Distinguish model correctness, degree fit, and unknown registration eligibility.
- Re-solve and independently validate repairs. Timeout is not infeasibility.
- Historical/missing syllabus data must remain visibly incomplete; every synthetic fact links to an explicitly synthetic source page.
- Assessment preferences are soft; time/required-course constraints may be hard.
- Run the root typecheck after cross-package changes. The generated API client requires `dom.iterable`.
- Do not deploy this prototype publicly without adding appropriate abuse controls for the paid AI endpoint and reconsidering sensitive report processing.
