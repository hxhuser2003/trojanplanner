# Copilot chatbot: test checklist

Everything the chatbot in the planner's **Ask** tab can do, with a prompt to try and what you should see.
Tick each box as you test, and note anything odd next to it.

## Before you start

- [ ] Pull the latest `main` and restart the app.
- [ ] Press **Reset** (top-right) once so old saved state is cleared. The default plan should be **CSCI 570 + CSCI 572, 8 units**.
- [ ] Optional: add `ANTHROPIC_API_KEY` in Replit Secrets. Without it, sections A and B still work, and section C shows "The AI copilot is unavailable".

## How it answers

1. **Code first.** Questions the catalog can answer exactly (progress, grading, excluding, locking, switching options) are answered by code. Their footer reads *Computed from catalog and solver facts*.
2. **AI for the rest.** Interests, open questions and new time rules go to Claude.
3. **If AI is down.** Naming a course still returns a plain catalog lookup (*Catalog lookup*). Otherwise the bot says AI is unavailable, and your rules are never changed.

The chatbot never changes your rules by itself. Rule changes appear as a proposal you accept with **Apply** or **Apply & update** (or ignore).

## A. Answered by code (no API key needed)

### Degree progress
- [ ] `what do I still need?` → each goal marked done / in this plan / still needed, with options and the plan's units.

### Why is a course in my plan
- [ ] `why is CSCI 570 in my plan?` → which goal it covers, when its section meets, whether it overlaps anything, which preferences it fits or breaks, and other sections that were ruled out or are equal swaps (described by meeting time, never by section number).
- [ ] `why is CSCI 571 in my schedule?` (a course *not* in the plan) → says it is not in the plan, then gives a short catalog summary.

### Grading questions (from the grading tables)
- [ ] `which classes in my schedule have a midterm?` → lists each planned course with a midterm, its weight and timing, with citations.
- [ ] `when is the CSCI 572 midterm?` → "Midterm exam: 30% of the grade, Week 9, in class".
- [ ] `how is CSCI 570 graded?` → full breakdown (Homework 24%, Midterm (Exam 1) 36%, Final (Exam 2) 40%).
- [ ] `does anything in my plan grade attendance?` → yes/no per course.
- [ ] Where a syllabus says "Exam 1 / Exam 2" (CSCI 570, 571, 585), Exam 1 is treated as the midterm and Exam 2 as the final, and both names are shown.
- [ ] Answers say whether the source is a past-term USC syllabus or a labeled mock.

### Excluding a course
- [ ] `I don't want to take CSCI 572` → proposes the rule **Don't take CSCI 572**. Apply it, and the plan replaces 572 with another course.
- [ ] If the course was previously required, the proposal replaces that rule instead of creating a conflict.

### Avoiding kinds of assessment (soft preferences)
- [ ] `I want to avoid midterms and finals` → proposes **Avoid midterms** and **Avoid final exams**.
- [ ] `no quizzes please` → proposes **Avoid graded quizzes**. (Attendance works the same way.)
- [ ] These are soft: the solver favors courses without them but never fails because of them.

### Locking a section
- [ ] `keep CSCI 570 where it is` → proposes **Keep CSCI 570 · Fri 2:00pm** (a hard rule), so the course stays put when other rules change.
- [ ] Asking again after applying → "already locked".

### Switching between plan options
- [ ] `switch to the second option` / `show option 3` → switches the calendar to that option.
- [ ] `go with No midterms` (an option's name) → switches to it.
- [ ] `show me the one with the fewest campus days` → picks the best option for that number, or says you're already on it.
- [ ] `use the first one` while already on it → "You're already viewing …".

## B. Catalog lookup (shown when AI is unavailable)
- [ ] `tell me about CSCI 585` → grading weights from the dated source, plus when each section meets, with a warning that it is a direct lookup.

## C. Needs AI (`ANTHROPIC_API_KEY` set)

### Recommendations by topic, using course descriptions
- [ ] `I really like NLP, what should I take?` → recommends matching courses (e.g. CSCI 544) and explains why from the description.
- [ ] `I don't want to learn databases` → suggests excluding the matching course (CSCI 585/587) as a rule proposal.

### Time rules in plain English
- [ ] `I work Mon/Wed 2-6pm` → proposes a time block for Mon/Wed 2:00–6:00pm.
- [ ] `no classes before 11am` → proposes an earliest-start rule.
- [ ] `keep Thursdays free` → proposes a no-class-day rule.

### Open questions about courses
- [ ] Free-form questions (e.g. `which of my courses is more project-based?`) get answers grounded in the loaded catalog and grading tables. They must not invent difficulty, workload hours or instructor quality.
- [ ] When AI writes about sections, it uses meeting times, never section numbers like 29936.

## D. Things that should never happen
- [ ] The chatbot changes a rule without you pressing Apply.
- [ ] A reply shows section-number strings like `29936+30030+30035` (these appear only on the Checklist page, where you register with them).
- [ ] A reply states a grading fact that is not in the course's grading table.
- [ ] A chat error leaves your rules or plan different from before.

## Related things to try while testing
- [ ] Set **Units** on the Degree page to 4, 8, 12 or 16. Lower targets cover as many goals as fit and say which goal is not covered; 2 units says no mix of courses adds up to that.
- [ ] Option labels such as **No graded quizzes** or **No final exams** must be true for every course in that option; check them against the Grading section on the Courses page.
- [ ] Switch **Prefer Fridays free** to **Hard** in the Rules tab → "No plan fits every rule" with a one-click repair, because every CSCI 570 section has a Friday exam slot (midterms and finals).
