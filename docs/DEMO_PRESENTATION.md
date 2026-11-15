# TrojanPlanner: 3-minute demo script

Internal only: delete this file from GitHub before submitting (see PLAN.md §14).

One storyline for the submission video. Start from a reset planner with the three-question setup open. Rehearse the full sequence on the deployed build before recording; the setup answers replace the demo's default time and grading rules.

## The one idea judges should remember

**"The AI talks, the solver decides, and every fact has a receipt."**

TrojanPlanner turns three setup answers into editable scheduling rules. A constraint solver (OR-Tools CP-SAT) builds the week from real USC Spring 2027 sections, while the copilot handles open-ended course questions. Grading facts link to dated USC syllabi or clearly labeled mocks. When the student's rules cannot all fit, the planner explains why and offers tested fixes instead of silently breaking a rule.

Three moments carry the video:

1. **Three setup answers become visible rules**, and the solver builds an optimal week from them.
2. **A required course exposes an impossible week**, with the real reason (every CSCI 566 section meets Monday 5:00–8:20pm) and solver-tested repairs.
3. **The copilot connects an interest to catalog courses and answers grading questions from sources**; course rule changes still need the student's approval.

## The student

**Maya, a second-semester USC MS in Computer Science (General) student.** In her first semester (Fall 2026) she took CSCI 561 and CSCI 567. For Spring 2027 she wants 8 units: she must take **CSCI 566 Deep Learning**, plus a Web/search course. She works Monday and Wednesday 3–6 PM, would like Fridays free, prefers projects, and is saving CSCI 570 for next semester.

Maya is a made-up student. Courses, sections and times are real USC Spring 2027 data. Grading comes from dated past-term USC syllabi, except CSCI 572, whose grading table is a labeled mock (the app says so everywhere it appears).

## Before recording

- [ ] Merge the branch into `main`; Replit runs the latest `main` with `ANTHROPIC_API_KEY` in Secrets.
- [ ] Press **Reset** (top-right), confirm **Reset**, and leave the three-question setup open. Do not choose **Keep demo rules**.
- [ ] Have these setup answers ready: **Yes** → **Work**, **Mon/Wed**, **3:00–6:00 PM**; **Fri** → **Nice to have**; **More projects**, with no avoidance chips selected → **Build my plan**. The work block is hard; the other two are soft.
- [ ] Copy this fake STARS text (never use a real transcript):

```
20263 CSCI 561 4.0 A Foundations of Artificial Intelligence
20263 CSCI 567 4.0 A- Machine Learning
```

- [ ] Try the course-interest question once on Replit: `I'm interested in natural language processing. What should I take next semester?` It should point to courses whose descriptions actually cover language technology, such as CSCI 544, without changing the plan. If AI is unavailable, use the catalog-lookup fallback below.
- [ ] Rehearse the whole video in this order with a timer, then press **Reset** again before the real take. Each step changes the state the next step relies on.
- [ ] Browser at 1440×900, zoom 110%, light mode, other tabs closed.
- [ ] Say the solve time that appears on screen; don't promise a number.

## Script

| Time | Screen | Say |
|---|---|---|
| **0:00–0:30** | Reset planner with the first setup question open. **Yes** → Work **Mon/Wed, 3:00–6:00 PM** → **Next**; choose **Fri**, **Nice to have** → **Next**; choose **More projects**, leave avoid chips clear → **Next**. Show **Here are your rules** → **Build my plan**. | "Maya starts with three questions: when she's busy, which day she'd like free, and how she prefers to be graded. Her answers become rules she can inspect and change. The planner builds an eight-unit week around them." |
| **0:30–0:45** | **Degree**: paste the STARS rows → **Find course candidates** → **Add 2 to planning history**. **Units** stays at 8. | "She's starting her second semester. She pastes last semester's courses from STARS and confirms each one." |
| **0:45–1:05** | **Courses** → open **CSCI 572** (point at "Mock syllabus made for this demo"). Then open **CSCI 566** (point at "From the Fall 2026 USC syllabus") → **Add as required**. Return to the planner if needed. | "Every course shows where its grading comes from. 572's is a labeled mock; 566's is from a real, dated USC syllabus. Maya needs 566, so she makes it required." |
| **1:05–1:35** | **No plan fits every rule** → **Explain in plain words**. Point at the two solver-tested repairs and their previews. Approve **Allow change: Work Mon/Wed · 3 PM–6 PM** after Maya decides she can change that shift. | "Every 566 section meets Monday from five to eight-twenty, overlapping her shift. The planner won't quietly ignore either hard rule. It shows what happens if she gives up 566 or changes the shift. Maya chooses to change the shift so she can keep 566." |
| **1:35–1:50** | Planner: **Optimal**, CSCI 566 + 572. Briefly show an alternative schedule, then return to the best fit. | "With that change approved, the solver finds a valid eight-unit week and shows the trade-offs between its options." |
| **1:50–2:05** | **Ask**: `I'm interested in natural language processing. What should I take next semester?` Point at the course recommendation; do not apply a rule. | "The setup handles scheduling preferences. For an open course question, the copilot looks at the loaded course descriptions and suggests a relevant next course, such as 544." |
| **2:05–2:20** | **Ask**: `which classes in my schedule have a midterm?` Point at the source tags under the answer. | "The grading answer comes from source-linked tables: 566's 35% midterm is in its Fall 2026 USC syllabus, while 572's is in a labeled mock." |
| **2:20–2:35** | **Ask**: `I don't want to take CSCI 572` → **Apply & update**. Calendar swaps to CSCI 571. | "When she changes her mind, the copilot proposes a course rule. Only after she approves it does the solver re-plan around 571." |
| **2:35–3:00** | **Checklist**: section numbers → **Download .txt**. | "Finally, the section numbers for registration. Three answers to start, a solver to check the plan, and sources behind its facts. That's TrojanPlanner." |

### AI fallback for 1:50–2:05 (no key, or a slow reply)

Ask `tell me about CSCI 544` instead. The catalog lookup shows its course and section facts even without the AI key. Say: "Maya can still inspect the loaded course information and its sources." Keep the conflict and repair sequence unchanged.

## Expected screens (verify on the deployed build)

| Step | Expected |
|---|---|
| After the three setup answers and STARS import | *Best preference fit*: CSCI 570 + CSCI 572. The Mon/Wed work block is hard; Friday free and more projects are soft. |
| After 566 is required | Infeasible. Every CSCI 566 section meets Mon 5:00pm–8:20pm and overlaps the work block. Repairs include *Allow change: Take CSCI 566* (preview 570 + 572) and *Allow change: Work Mon/Wed · 3 PM–6 PM* (preview 566 + 572). The latter disables that work rule only after approval. |
| After approving the work-rule repair | *Best preference fit*: CSCI 566 + CSCI 572. |
| NLP course-interest question | With AI configured, expect a recommendation grounded in course descriptions; CSCI 544 covers human language technologies. It should not change the plan. Without AI, `tell me about CSCI 544` returns a direct catalog lookup. |
| Midterm question | CSCI 566 Midterm 35% (Fall 2026 USC syllabus); CSCI 572 Midterm exam 30%, Week 9, in class (labeled mock syllabus). Citation links read "Fall 2026 USC syllabus" and "Mock syllabus (made for this demo)". |
| After excluding 572 | CSCI 566 + CSCI 571. Checklist: 566 Lecture Mon 5:00pm–8:20pm; 571 Lecture Tue/Thu 5:30pm–7:20pm. |

## Lines to avoid

- "Guaranteed enrollment" or "official degree audit": we promise conflict-free against the loaded data only.
- "Spring 2027 grading policy": grading is from past-term syllabi or labeled mocks.
- "Checked every combination": the solver proves optimality; it doesn't enumerate.
- "Covers all of USC": the demo has 15 graduate CSCI courses.

## If there is time in Q&A or the slide deck

- **Why trust it:** the LLM never writes the schedule. Solver output is re-validated by independent code before it is shown.
- **Privacy:** STARS import is paste-only. Only the rows she pastes are sent, when she asks for course candidates; they are not stored, and nothing counts as completed until she confirms it.
- **Next:** more departments, live seat data from an official feed, and an advisor-reviewed pilot with one department.
