# TrojanPlanner (working name): AI Course Registration Copilot

AI@USC Hackathon · Nov 14–15, 2026 · Track: Academic Success

## 1. One-liner
Tell it what you want next semester ("no Friday classes, light workload, cover my core requirements"), and it builds a conflict-free schedule that fits your degree requirements, with the reasons and trade-offs explained.

## 2. Problem
Every semester, USC students spend hours before Web Registration jumping between the Schedule of Classes, their STARS degree progress report, professor reviews, and spreadsheets. They have to:
- figure out which courses actually count toward their degree,
- find sections that don't conflict with each other or with work, internships, or commutes,
- balance workload without any reliable data.

The result is stress, bad schedules, and missed requirements that can delay graduation.

## 3. Target Users
- **Primary:** USC undergraduate and graduate students choosing courses for next semester.
- **Secondary:** academic advisors, who get better-prepared students in advising appointments.

## 4. Solution
A web app focused on **next semester's course selection**, with a **visual weekly calendar** as the main view and an **AI copilot in a sidebar**.
1. The student states their preferences in plain language.
2. The AI turns them into constraints.
3. A constraint solver builds schedules that are guaranteed to be valid.
4. The AI explains each option and its trade-offs.

**Key principle:** the LLM understands and explains; the solver guarantees correctness. The LLM never invents course times or rules.

## 5. Core Features
1. **Natural-language preferences.** Examples: "No classes on Friday", "Keep workload light", "Nothing before 10 AM", "I work Tue/Thu 2–6 PM". The AI classifies each one:
   - **Hard constraint:** must be satisfied (e.g. no Friday, work hours).
   - **Soft constraint:** satisfied as much as possible (e.g. light workload, later start times).
2. **Degree-aware course selection.** Upload a STARS report → see remaining requirements → the solver only picks next-semester courses that count toward the degree.
3. **Guaranteed conflict-free schedules.** The solver enforces no time overlaps, unit limits, and requirement coverage.
4. **2–3 distinct schedule options, compared side by side:**
   - 🎯 Most requirements covered
   - 😌 Lightest workload
   - 📅 Best fit for your time preferences

   Each option shows total units, estimated weekly study hours, requirements covered, and how many preferences it satisfies.
5. **Conflict detection and explanation.** When the student's requests can't all be met, the copilot doesn't fail silently or return a broken schedule. It pinpoints exactly which requests clash and why. Example:
   > "You asked for no Friday classes and CSCI 270 this semester, but CSCI 270's only section meets on Friday."
6. **Smart alternatives.** For every conflict, the copilot offers concrete ways forward and shows what each one costs; the student picks one and the calendar updates. Example:
   > "Option A: keep CSCI 270 and accept one Friday class. Option B: keep Fridays free and take a different course that fills the same requirement; save CSCI 270 for a later semester."
7. **Explainable trade-offs.** Every course in a schedule comes with a reason and its cost. Example: "Fills your Core requirement and has a highly rated instructor, but it's your only class on Monday, so it adds a commute day."
8. **Live editing via chat.** "Swap the 8 AM class for something later" → the solver re-runs and the calendar updates instantly.
9. **Instructor and syllabus links.** Each section card links out for its instructor(s) and syllabus. Links only; no third-party data is scraped or rehosted.
   - **RateMyProfessors:** every instructor gets a search link limited to USC; the 10–20 demo instructors get hand-curated direct profile links. Co-taught sections show one link per instructor; "TBA" shows none.
   - **Syllabus:** the official link from the Schedule of Classes when available, otherwise a "Search syllabus" link limited to usc.edu.

## 6. Stretch Features
- **AI syllabus insights:** pre-parse syllabi for demo courses into JSON (grading breakdown, exam dates, workload signals). They feed the workload soft constraint and enable **exam-week clash alerts** (e.g. "3 midterms in week 8"). Pluggable: courses without a syllabus skip this.
- **Browser extension mode:** overlay fit badges (✅ fits requirements / ⚠️ conflict / 📊 difficulty) directly on the Schedule of Classes pages.
- Backup sections for when a section fills up during registration.
- Export to Google Calendar, or generate a registration checklist.

## 7. UI Layout
- **Left:** profile, preferences, and requirement progress bars.
- **Center:** weekly calendar, with option tabs A / B / C.
- **Right:** AI copilot chat sidebar.

## 8. System Architecture
```
Student (chat / profile / STARS upload)
        │
        ▼
LLM agent (Claude API, tool use)
  ├─ parse_preferences(text)     → hard and soft constraints (JSON)
  ├─ get_requirements(profile)   → remaining degree requirements
  ├─ search_courses(filters)     → next-semester courses and sections
  ├─ solve_schedule(constraints) → CP-SAT solver → top-k valid schedules
  ├─ explain_conflict(result)    → which requests clash + alternatives
  ├─ get_syllabus_info(id)       → grading, exam dates, workload (pluggable)
  └─ get_course_stats(id)        → workload / grade data (pluggable)
        │
        ▼
Calendar UI + explanations + trade-off comparison
```

- **Solver:** Google OR-Tools CP-SAT.
  - Hard constraints: no time overlap, hard preferences, unit cap, prerequisites (if available).
  - Objective: maximize requirement coverage + weighted soft-preference satisfaction − workload penalty.
  - Generate diverse top-k solutions by changing the objective weights.
- **Conflict handling:** if the solver finds no solution, relax constraints one at a time to find the smallest set of clashing requests, then let the LLM explain it in plain language and propose alternatives.
- **Grounding:** every course fact shown to the user comes from the dataset; the copilot cites the section number.

## 9. Data Sources
| Data | Source | Notes |
|---|---|---|
| Courses and sections | USC Schedule of Classes (public), next semester | Confirm access method on-site; cache a subset (1–2 majors) early on Saturday |
| Degree requirements | Program requirements for 1–2 majors | Encoded as rules for the demo |
| Student progress | STARS report upload or manual entry | Parsed locally; no sensitive data stored |
| Instructor reviews | RateMyProfessors (outbound links only) | Search link by default; direct links hand-curated for demo instructors |
| Syllabi | Official links where available; pre-parsed JSON for demo courses | Link out, never rehost |
| Workload / grade distribution | Sample data | Clearly labeled "sample"; no scraping of third-party sites |

## 10. Tech Stack
- **Frontend:** React + Tailwind, FullCalendar.
- **Backend:** FastAPI (Python), OR-Tools.
- **LLM:** Claude API with tool use.
- **Data:** JSON or SQLite.
- **Deploy:** Vercel (frontend) + Render or Replit (backend). Using Replit makes the team eligible for Best Use of Replit.

## 11. Demo Script (3 minutes)
1. **Hook (20s):** "It's the night before registration. Six tabs open, and you still don't know if this class counts toward your degree."
2. **Setup (20s):** upload a STARS report → remaining requirements appear.
3. **Ask (40s):** "Cover my core requirements, no Friday classes, keep it light; I work Tue/Thu afternoons." → three schedule options appear, compared side by side.
4. **Wow moment (40s):** "I also want CSCI 270 this semester." → the copilot explains the conflict and offers two alternatives → the student picks one → the calendar updates.
5. **Trust (20s):** click a course to see its reason, trade-off, and source section; show the sample grade-distribution module.
6. **Adoption (20s):** "It works with USC's public data today. With Student Government, it can integrate official data and reach every Trojan next semester."

## 12. Judging Criteria Fit
| Criterion | How we score |
|---|---|
| Impact (30%) | Every Trojan registers every semester; saves hours and prevents missed requirements |
| Technical & AI (25%) | LLM + constraint solver: accurate, explainable, never hallucinates schedules; real trade-off reasoning |
| Feasibility (25%) | Core features run on public USC data today; grade data is an optional module unlocked through Student Government |
| UX (20%) | Visual calendar + conversational sidebar + side-by-side option comparison |

## 13. Differentiation (vs. other course-planner teams)
| | Typical team | Us |
|---|---|---|
| Scheduling | LLM generates a schedule directly | LLM understands preferences + solver guarantees validity |
| Conflicting requests | Wrong output or ignored | Pinpoints the conflict and offers alternatives with their costs |
| Output | One schedule | 2–3 distinct options, compared side by side |
| Data | Made up or minimal | Real USC data + degree requirements |

## 14. Risks and Mitigations
| Risk | Mitigation |
|---|---|
| Many course-planner teams | Win on correctness, conflict handling, and trade-off reasoning |
| Data access issues | Cache the demo dataset early Saturday; limit to 1–2 majors |
| STARS report hard to parse | Fallback: manual entry of completed courses |
| Solver too slow or complex | Small dataset; simple objective first, add weights later |
| LLM mis-parses preferences | Show parsed constraints as editable chips the user can confirm |
| Policy and terms of service | No scraping of third-party review sites; sample data clearly labeled |

## 15. Future Implementation
- Partner with the Registrar and academic advising for official data access.
- Expand from next-semester selection to multi-semester planning.
- Expand to all majors; add advisor review and sharing; ship a browser extension.

## 16. Extension Module: Grade Distribution & Semester Difficulty Balance
*Unlocked by Student Government · demo with sample data*

- Per-instructor grade distributions, plus an overall difficulty check for the semester. Example: "You have 3 historically tough courses this semester. Consider swapping one."
- Framed as **balancing workload**, not hunting for easy A's.
- **Pluggable data layer:** the app works fully without this data.
- Pitch line: "Students at UIUC and UT can already see grade distributions. If Student Government pushes for anonymized USC data, it plugs right in."
