# TrojanPlanner: 3-minute demo script

Internal only: delete this file from GitHub before submitting (see PLAN.md §14).

One storyline for the submission video. Every step below was dry-run against the current branch; the AI step is marked and has a fallback.

## The one idea judges should remember

**"The AI talks, the solver decides, and every fact has a receipt."**

Most AI schedulers ask a chatbot to write a timetable and hope it is right. TrojanPlanner uses AI only to understand the student. A constraint solver (OR-Tools CP-SAT) builds the week from real USC Spring 2027 sections, and every grading fact links back to a syllabus. When the student asks for something impossible, it says so, explains why, and offers a tested fix instead of silently breaking a rule.

Three moments carry the video. Everything else is connective tissue.

1. **The solver finds the best week in about 0.1 s**, with alternatives whose names are guaranteed true.
2. **An impossible request is caught and repaired**, with the real reason (every CSCI 570 section meets on Friday).
3. **The copilot answers from data, with citations**, and changes rules only when the student presses Apply.

## The student

**Maya, a second-semester USC MS in Computer Science (General) student.** In her first semester (Fall 2026) she took CSCI 561 and CSCI 567. CSCI 570 is required for her degree and she hasn't taken it yet. She works Tue/Thu 9 AM–1 PM. For Spring 2027 she wants 8 units: CSCI 570 plus a Web/search course, and she'd love Fridays free.

Why this student: almost every General MS student hits this exact semester, with the required algorithms course still to fit in around a job.

Maya is a made-up student. The courses, sections, times and syllabi are real USC data (Spring 2027 Schedule of Classes; dated past-term syllabi or labeled mocks).

## Before recording

- [ ] Replit is on the latest `main`, and `ANTHROPIC_API_KEY` is set in Secrets (needed only for step 5c).
- [ ] Press **Reset** (top-right), then **Keep demo rules** in the setup dialog. Rules: *Work Tue/Thu · 9 AM–1 PM* (hard), *Prefer Fridays free*, *Prefer starts after 10 AM*.
- [ ] Copy this fake STARS text to the clipboard (never use a real transcript):

```
20263 CSCI 561 4.0 A Foundations of Artificial Intelligence
20263 CSCI 567 4.0 A- Machine Learning
```

- [ ] Browser at 1440×900, zoom 110%, dark mode off, other tabs closed.
- [ ] Test step 5c once with the key. If the AI reply is slow or odd, use the fallback.
- [ ] Do one full rehearsal with a timer. Narration is about 400 words; speak at a calm pace.

## Script

| Time | Screen | Say |
|---|---|---|
| **0:00–0:15** | Planner page with the finished calendar. | "Registering at USC means juggling a degree plan, a job, and dozens of section combinations, and one wrong pick costs you a semester. TrojanPlanner turns that into one conversation, and it never makes things up." |
| **0:15–0:40** | **Degree** page → paste the STARS text → **Find course candidates** → **Add 2 as completed**. Show the Algorithms and Web goals and **Units: 8**. Click **Re-solve with these**. | "Maya is starting her second semester of the General MS. She pastes her first-semester courses from STARS and confirms each one. She still needs CSCI 570, which is required, plus a web course, in 8 units, and re-solves." |
| **0:40–1:10** | Lands on the planner. Point at **Optimal · ~100 ms**, the empty Tue/Thu mornings, and the option tabs. Click **No graded quizzes**, then back. Open **Compare** for one second. | "A constraint solver checked every real section combination and found the best week in a tenth of a second. Work hours are untouched. It also offers truly different alternatives, and their names are promises: *No graded quizzes* means every course in it has no graded quizzes in its syllabus." |
| **1:10–1:45** | **Rules** tab → click **Soft** on *Prefer Fridays free* to make it **Hard** (label becomes *Keep Fri free*). Conflict panel appears. Point at the reason and the preview, then click **Approve this repair**. | "Now Maya insists on Fridays off. Instead of quietly breaking a rule, it tells her no plan fits, and why: every CSCI 570 section meets on Friday, including the exam slot. It offers a tested repair with a preview, and nothing changes until she approves." |
| **1:45–2:00** | **Ask** tab: `what do I need for graduation?` | "She can just ask. Progress is counted by code, not guessed: done, in this plan, or still open. And it's clear these are planning goals, not an official audit." |
| **2:00–2:15** | `which classes in my schedule have a midterm?` | "Grading answers come straight from the syllabi, with the weight and the week, and every one links to its source." |
| **2:15–2:30** | `I don't want to take CSCI 572` → **Apply & update**. Calendar swaps to CSCI 571. | "When she changes her mind, the copilot proposes a rule. She stays in control: one click applies it and the week re-solves." |
| **2:30–2:45** | **Courses** → CSCI 570: grading bar, *Course at a glance*, the source link. | "Every course comes with receipts: the grading breakdown, key dates, workload and team format, each tied to a dated USC syllabus." |
| **2:45–3:00** | **Checklist** page → section numbers → **Download .txt**. | "Finally, the exact section numbers to register, ready for her enrollment window. AI to understand you, a solver to get it right, and sources for every fact. That's TrojanPlanner." |

### Optional AI moment (swap with 2:15–2:30 if the key works well)

Type `I work Mon/Wed 3-6pm too` → the copilot proposes a **Time block Mon/Wed 3:00–6:00pm** → **Apply & update**. Say: "Plain English becomes a rule she can see and edit, and the solver re-plans around it."

**Fallback:** if the AI reply is slow or unclear, cut it and keep the CSCI 572 step, which runs without AI.

## What to show and what to skip

**Show** (strongest for judges):
- Solver speed and **Optimal** status; real USC sections.
- The Friday conflict with a real reason and a previewed one-click repair.
- Option names that are guaranteed true.
- Code-first chat answers with citations; rules change only on **Apply**.
- Syllabus "receipts" on the Courses page.
- The registration checklist as the concrete end result.

**Skip** (true, but costs seconds):
- The full rule editor dialog, Compare details, the explain panel.
- Unit ranges and the "unreachable units" hint.
- Any claim about seats, eligibility, or official degree audits.

## Lines to avoid

- "Guaranteed enrollment" or "official degree audit": we only promise conflict-free against the loaded data.
- "Spring 2027 grading policy": syllabi are past-term or labeled mocks.
- "Covers all of USC": the demo covers 15 graduate CSCI courses.

## If there is time left in Q&A or the slide deck

- **Why trust it:** the LLM never writes the schedule. Solver output is re-validated by independent code before it is shown.
- **Privacy:** STARS import is paste-only. Only the rows she pastes are sent, when she asks for course candidates; they are not stored, and nothing counts as completed until she confirms it.
- **Next:** more departments, live seat data via an official feed, and an advisor-reviewed pilot with one department.
