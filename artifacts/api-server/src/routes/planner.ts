import { Router, type IRouter } from "express";
import { GetCatalogResponse, ParsePreferencesBody, ParsePreferencesResponse, ParseStarsBody, ParseStarsResponse, SolvePlannerBody } from "@workspace/api-zod";
import { catalog } from "../planner/catalog";
import { solve, validateInput } from "../planner/service";
import { parsePreferences } from "../planner/ai";
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
router.post("/planner/stars", (req, res) => {
  const parsed = ParseStarsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Provide extracted text of up to 100,000 characters." }); return; }
  res.json(ParseStarsResponse.parse(parseStarsText(parsed.data.text)));
});
router.get("/planner/sources/:id", (req, res) => {
  const course = catalog.courses.find(c => c.id === req.params.id);
  if (!course) { res.status(404).send("Source not found."); return; }
  const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  res.type("html").send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(course.code)} — Synthetic evidence</title><style>body{font:17px/1.7 system-ui;max-width:760px;margin:4rem auto;padding:1rem;background:#faf7f1;color:#29201c}header{border-left:5px solid #8d2436;padding:1rem;background:#f3e8d0}article{padding:1rem 0;border-bottom:1px solid #ddd}small{color:#665}</style><header><strong>SYNTHETIC DEMO SOURCE — NOT A USC SYLLABUS</strong><p>This fixture demonstrates traceability. All facts below were authored for this prototype. Do not use them for real course registration.</p></header><h1>${escape(course.code)} · ${escape(course.title)}</h1><p>Spring 2027 · Synthetic page 1 · Fixture version 2026-11-14</p>${course.syllabus.evidence.map(e => `<article><strong>${escape(e.label)}: ${escape(e.value)}</strong><blockquote>${escape(e.excerpt)}</blockquote><small>Page ${e.page} · ${e.status}</small></article>`).join("") || "<p>No syllabus evidence available. Unknown is not zero.</p>"}<h2>Illustrative section meetings</h2><pre>${escape(JSON.stringify(course.sections, null, 2))}</pre><p>These fixtures do not establish current USC offerings, equivalences, prerequisites, or degree eligibility.</p></html>`);
});
export default router;
