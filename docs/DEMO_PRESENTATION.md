# TrojanPlanner: 3-minute demo script

Internal only: delete this file from GitHub before submitting (see PLAN.md §14).

One storyline for the submission video. Every non-AI step below was run in the browser on the current branch in this exact order, using the AI fallback; the AI step has a no-AI fallback that leads to the same screen.

## The one idea judges should remember

**"The AI talks, the solver decides, and every fact has a receipt."**

Most AI schedulers ask a chatbot to write a timetable and hope it is right. TrojanPlanner uses AI to understand the student. A constraint solver (OR-Tools CP-SAT) builds the week from real USC Spring 2027 sections, and every grading fact links to its source: a dated USC syllabus, or a clearly labeled mock. When the student asks for something impossible, it says so, explains why, and offers tested fixes instead of silently breaking a rule.

Three moments carry the video:

1. **The solver proves the best week in a fraction of a second**, with alternatives whose names are guaranteed true.
2. **Plain English becomes a rule, and an impossible week is caught and repaired** with the real reason (every CSCI 566 section meets Monday 5:00–8:20pm).
3. **The copilot answers from data and names its sources**, and changes rules only when the student presses Apply.

## The student

**Maya, a second-semester USC MS in Computer Science (General) student.** In her first semester (Fall 2026) she took CSCI 561 and CSCI 567. For Spring 2027 she wants 8 units: she must take **CSCI 566 Deep Learning**, plus a Web/search course. She works Tue/Thu 9 AM–1 PM, and she is saving CSCI 570 for next semester.

Maya is a made-up student. Courses, sections and times are real USC Spring 2027 data. Grading comes from dated past-term USC syllabi, except CSCI 572, whose grading table is a labeled mock (the app says so everywhere it appears).

## Before recording

- [ ] Merge the branch into `main`; Replit runs the latest `main` with `ANTHROPIC_API_KEY` in Secrets.
- [ ] Press **Reset** (top-right), then **Keep demo rules**. Rules: *Work Tue/Thu · 9 AM–1 PM* (hard), *Prefer Fridays free*, *Prefer starts after 10 AM*.
- [ ] Copy this fake STARS text (never use a real transcript):

```
20263 CSCI 561 4.0 A Foundations of Artificial Intelligence
20263 CSCI 567 4.0 A- Machine Learning
```

- [ ] Run the AI step once on Replit: `I also work Mon/Wed 3-6pm` must propose a hard time block Mon/Wed 3:00–6:00pm. If it doesn't, use the fallback.
- [ ] Rehearse the whole video in this order with a timer, then press **Reset** again before the real take. Each step changes the state the next step relies on.
- [ ] Browser at 1440×900, zoom 110%, light mode, other tabs closed.
- [ ] Say the solve time that appears on screen; don't promise a number.

## Script

| Time | Screen | Say |
|---|---|---|
| **0:00–0:15** | Planner with a finished calendar. | "Registering at USC means juggling degree goals, a job, and dozens of section combinations, and one wrong pick can cost you a semester. TrojanPlanner turns that into one conversation, and it never makes things up." |
| **0:15–0:30** | **Degree**: paste the STARS rows → **Find course candidates** → **Add 2 to planning history**. **Units** stays at 8. | "Maya is starting her second semester. She pastes last semester's courses from STARS and confirms each one." |
| **0:30–0:45** | **Courses** → open **CSCI 572** (point at "Mock syllabus made for this demo"). Then open **CSCI 566** (point at "From the Fall 2026 USC syllabus") → **Add as required**. It jumps to the planner. | "Every course shows where its grading comes from. 572's is a labeled mock; 566's is the real Fall 2026 USC syllabus. Maya has to take 566, so she makes it required." |
| **0:45–1:05** | Planner: **Optimal** status, CSCI 566 + 572 on Mon/Tue evenings, Tue/Thu mornings empty, and the note *not covered this semester: Algorithms goal*. Click **Fewer graded quizzes** (566 + 571), then back. | "The solver proved there's no better combination among the loaded sections, in a fraction of a second. Her work hours are untouched, and it says plainly that 570 doesn't fit in 8 units this time. The alternatives' names are promises: this one really has fewer graded quizzes." |
| **1:05–1:25** | **Ask**: `I also work Mon/Wed 3-6pm` → proposal **Mon/Wed 3:00–6:00pm** → **Apply & update**. | "She just tells it about her other job. The AI turns that into a rule she can see and edit, and the solver re-plans." |
| **1:25–2:00** | **"No plan fits every rule"** panel → click **Explain in plain words** (reason appears: every CSCI 566 section is blocked, Mon 5:00pm–8:20pm). Point at the two repairs and their previews. Click **Approve this repair** on the one that allows changing the work rule. | "And it refuses to cheat. Every CSCI 566 section meets Monday from five to eight-twenty, right on top of that shift. It doesn't drop either rule silently; it shows both tested fixes: give up 566 and take 570 with 572, or move the Monday shift and keep 566 with 572. Maya keeps 566." |
| **2:00–2:15** | **Ask** tab: `which classes in my schedule have a midterm?` Point at the source tags under the answer. | "Answers come from the grading tables, with their sources: 566's midterm is 35% from its Fall 2026 USC syllabus, and 572's is from a labeled mock, and it says so." |
| **2:15–2:30** | **Ask**: `I don't want to take CSCI 572` → **Apply & update**. Calendar swaps to CSCI 571. | "When she changes her mind, the copilot proposes a rule, she approves it, and the week re-solves around 571." |
| **2:30–2:40** | **Ask**: `what do I need for graduation?` | "Progress is counted by code, not guessed: 570 is still open for next semester, and it's clear these are planning goals, not an official audit." |
| **2:40–3:00** | **Checklist**: the section numbers → **Download .txt**. | "Finally, the exact section numbers to register in her window. AI to understand you, a solver to get it right, and a source for every fact. That's TrojanPlanner." |

### AI fallback for 1:05–1:25 (no key, or a slow reply)

**Rules** tab → **Add a rule or time block** → **Time block** → label `Work`, days **Mon** and **Wed**, **3:00 PM–6:00 PM** → **Save rule**. The planner re-solves on its own and shows the same conflict. Say: "She adds her Monday and Wednesday shift."

## What the screens should show (checked against the API)

| Step | Expected |
|---|---|
| After 566 is required | *Best preference fit*: CSCI 566 + CSCI 572, 2 campus days, note "not covered this semester: Algorithms goal". Alternatives: *Fewer graded quizzes* (566 + 571), *Try CSCI 570* (566 + 570). |
| After the Mon/Wed job | Infeasible. Reason: every CSCI 566 section is blocked (Mon 5:00pm–8:20pm breaks the work rule). After **Explain in plain words**: "every CSCI 566 section is blocked (Mon 5:00pm–8:20pm breaks …)". Repairs: *Allow change: Take CSCI 566* (preview 570 + 572); *Allow change: Work* (preview 566 + 572; the name is whatever the work rule is called). |
| Midterm question | CSCI 566 Midterm 35% (Fall 2026 USC syllabus); CSCI 572 Midterm exam 30%, Week 9, in class (labeled mock syllabus). Citation links read "Fall 2026 USC syllabus" and "Mock syllabus (made for this demo)". |
| After excluding 572 | CSCI 566 + CSCI 571. Checklist: 566 Lecture Mon 5:00pm–8:20pm; 571 Lecture Tue/Thu 5:30pm–7:20pm. |
| Graduation question | Algorithms: not covered by this plan, option CSCI 570. AI or NLP: done (561, 567). Web or search: in this plan (571). Other goals in one line. |

## Lines to avoid

- "Guaranteed enrollment" or "official degree audit": we promise conflict-free against the loaded data only.
- "Spring 2027 grading policy": grading is from past-term syllabi or labeled mocks.
- "Checked every combination": the solver proves optimality; it doesn't enumerate.
- "Covers all of USC": the demo has 15 graduate CSCI courses.

## If there is time in Q&A or the slide deck

- **Why trust it:** the LLM never writes the schedule. Solver output is re-validated by independent code before it is shown.
- **Privacy:** STARS import is paste-only. Only the rows she pastes are sent, when she asks for course candidates; they are not stored, and nothing counts as completed until she confirms it.
- **Next:** more departments, live seat data from an official feed, and an advisor-reviewed pilot with one department.
