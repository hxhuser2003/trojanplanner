import { Router, type IRouter } from "express";
import { ChatCopilotBody, ChatCopilotResponse, ExplainPlannerBody, ExplainPlannerResponse, GetCatalogResponse, ParsePreferencesBody, ParsePreferencesResponse, ParseStarsBody, ParseStarsResponse, SolvePlannerBody } from "@workspace/api-zod";
import { catalog } from "../planner/catalog";
import { mockSyllabi, renderMockSyllabus } from "../planner/syllabi";
import { solve, validateInput } from "../planner/service";
import { catalogLookup, chat, parsePreferences, rephrase } from "../planner/ai";
import { explainCompare, explainConflict, explainSection } from "../planner/explain";
import { avoidIntent, excludeIntent, gradingIntent, lockIntent, progressIntent, selectIntent } from "../planner/intents";
import { parseStarsText } from "../planner/stars";

const router: IRouter = Router();
router.use("/planner", (_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
router.get("/planner/catalog", (_req, res) => { res.json(GetCatalogResponse.parse(catalog)); });
router.post("/planner/solve", async (req, res): Promise<void> => {
  const parsed = SolvePlannerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid planner input. Check all constraints and unit bounds." }); return; }
  const error = validateInput(parsed.data);
  if (error) { res.status(400).json({ error }); return; }
  try { res.json(await solve(parsed.data)); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "SOLVER_TIMEOUT") {
      res.json({ status: "unknown", message: "The search budget expired. This does not establish infeasibility.", schedules: [], repairs: [], conflicts: [], elapsedMs: 15000, engine: "Google OR-Tools CP-SAT" }); return;
    }
    req.log.error({ kind: message === "BUSY" ? "busy" : "solver_error" }, "Planner request failed");
    res.status(message === "BUSY" ? 429 : 503).json({ error: message === "BUSY" ? "Solver busy. Please try again shortly." : "The solver could not validate a result. No schedule was accepted. Please retry." });
  }
});
router.post("/planner/preferences", async (req, res): Promise<void> => {
  const parsed = ParsePreferencesBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Enter a request of up to 2,000 characters with valid current constraints." }); return; }
  const error = validateInput(parsed.data.current);
  if (error) { res.status(400).json({ error }); return; }
  try { res.json(ParsePreferencesResponse.parse(await parsePreferences(parsed.data.text, parsed.data.current))); }
  catch {
    req.log.warn({ kind: "preference_parse_error" }, "AI extraction unavailable");
    res.status(503).json({ error: "AI preference extraction is unavailable or returned an invalid proposal. Your constraints have not changed. Please retry or use Rules & blocks." });
  }
});
// Without AI, lead with the reason plus the most informative trade-off rather than the first two lines.
function deterministicSummary(mode: string, facts: string[]) {
  if (mode !== "section") return facts.slice(0, 2).join(" ");
  const tradeoff = facts.find(f => / was ruled out| also fits | could also cover /.test(f));
  return [facts[0], tradeoff ?? facts[1]].filter(Boolean).join(" ");
}
router.post("/planner/explain", async (req, res): Promise<void> => {
  const parsed = ExplainPlannerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid explanation request." }); return; }
  const { mode, input, selections, otherSelections = [], courseId, useAi = true } = parsed.data;
  const error = validateInput(input);
  if (error) { res.status(400).json({ error }); return; }
  let facts: string[];
  try {
    if (mode === "section") {
      if (!courseId) { res.status(400).json({ error: "Choose a course to explain." }); return; }
      facts = explainSection(input, selections, courseId);
    } else if (mode === "compare") {
      if (!otherSelections.length) { res.status(400).json({ error: "Choose a second option to compare." }); return; }
      facts = explainCompare(input, selections, otherSelections);
    } else facts = explainConflict(input);
  } catch {
    res.status(400).json({ error: "That selection is not in the loaded catalog. Re-solve and try again." }); return;
  }
  const topic = mode === "section" ? "why this section is in the plan" : mode === "compare" ? "how two schedule options differ" : "why the rules conflict";
  const ai = useAi ? await rephrase(facts, topic) : null;
  res.json(ExplainPlannerResponse.parse({
    summary: ai ?? deterministicSummary(mode, facts), facts,
    provider: ai ? "Claude, rephrased from the facts below" : "Computed from catalog and solver facts",
  }));
});
router.post("/planner/chat", async (req, res): Promise<void> => {
  const parsed = ChatCopilotBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Enter a message of up to 2,000 characters with valid current rules." }); return; }
  const { message, history, current, selections = [], scheduleOptions = [], chosenScheduleId } = parsed.data;
  const error = validateInput(current);
  if (error) { res.status(400).json({ error }); return; }
  // Code answers first; the model handles only what code cannot. Degree progress is a counting problem.
  const direct = progressIntent(message, current, selections);
  if (direct) {
    res.json(ChatCopilotResponse.parse({ proposedConstraints: [], removeConstraintIds: [], updatedConstraints: [], options: [], citations: [], warnings: [],
      ...direct, provider: "Computed from catalog and solver facts" }));
    return;
  }
  // "Why is CSCI 570 in my plan?" is answered from solver facts, not by the model.
  const named = /\bwhy\b/i.test(message) ? catalog.courses.find(c => new RegExp(`\\b${c.id.replace("-", "[- ]?")}\\b`, "i").test(message)) : undefined;
  const asked = named && selections.some(s => s.courseId === named.id) ? named : undefined;
  if (named && !asked && /\b(plan|schedule|picked|chose|chosen)\b/i.test(message)) {
    const lookup = catalogLookup(named.id)!;
    res.json(ChatCopilotResponse.parse({ ...lookup, message: `${named.code} is not in your current plan, so there is no placement to explain. ${lookup.message}`, warnings: [], provider: "Computed from catalog and solver facts" }));
    return;
  }
  if (asked) {
    try {
      const facts = explainSection(current, selections, asked.id);
      const ai = await rephrase(facts, "why this section is in the plan");
      res.json(ChatCopilotResponse.parse({ kind: "answer", message: `${ai ? `${ai}\n\n` : ""}${facts.map(f => `• ${f}`).join("\n")}`,
        proposedConstraints: [], removeConstraintIds: [], updatedConstraints: [], options: [], citations: [], warnings: [],
        provider: ai ? "Claude, rephrased from solver facts" : "Computed from catalog and solver facts" }));
      return;
    } catch { /* unknown selection: fall through to the model */ }
  }
  // Requests code can answer from the catalog go first: grading questions, excluding or avoiding, locking, switching options.
  const fromData = gradingIntent(message, selections) ?? excludeIntent(message, current) ?? avoidIntent(message, current)
    ?? lockIntent(message, current, selections) ?? selectIntent(message, scheduleOptions, chosenScheduleId);
  if (fromData) {
    res.json(ChatCopilotResponse.parse({ proposedConstraints: [], removeConstraintIds: [], updatedConstraints: [], options: [], citations: [], warnings: [], ...fromData,
      provider: "Computed from catalog and solver facts" }));
    return;
  }
  // Everything else (topics you like or dislike, open questions, new time rules) goes to the model.
  try { res.json(ChatCopilotResponse.parse(await chat(message, history, current, selections, scheduleOptions, chosenScheduleId))); }
  catch (e) {
    const kind = e instanceof Error ? e.message : "";
    const fallback = catalogLookup(message);
    if (fallback && kind !== "BUSY") { res.json(ChatCopilotResponse.parse(fallback)); return; }
    req.log.warn({ kind: kind.startsWith("INVALID_PROPOSAL") ? "invalid_proposal" : kind === "AI_UNCONFIGURED" ? "ai_unconfigured" : "chat_error" }, "Copilot chat unavailable");
    res.status(kind === "BUSY" ? 429 : 503).json({ error: kind === "BUSY" ? "The copilot is busy. Please retry in a moment."
      : kind.startsWith("INVALID_PROPOSAL") ? "The AI proposed rules that failed validation, so nothing changed. Try rephrasing with days and times."
      : "The AI copilot is unavailable. Your rules have not changed. Edit them in the Rules tab." });
  }
});
router.post("/planner/stars", (req, res) => {
  const parsed = ParseStarsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Provide extracted text of up to 100,000 characters." }); return; }
  res.json(ParseStarsResponse.parse(parseStarsText(parsed.data.text)));
});
router.get("/planner/sources/:id", (req, res) => {
  const course = catalog.courses.find(c => c.id === req.params.id);
  if (!course) { res.status(404).send("Source not found."); return; }
  res.redirect(302, course.sourceUrl);
});
router.get("/planner/mock-syllabi/:id", (req, res) => {
  const id = req.params.id;
  if (!id || !Object.prototype.hasOwnProperty.call(mockSyllabi, id)) { res.status(404).send("Mock syllabus not found."); return; }
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");
  res.type("html").send(renderMockSyllabus(id as keyof typeof mockSyllabi));
});
export default router;
