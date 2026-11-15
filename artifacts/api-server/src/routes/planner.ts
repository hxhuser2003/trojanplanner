import { Router, type IRouter } from "express";
import { GetCatalogResponse, ParsePreferencesBody, ParsePreferencesResponse, ParseStarsBody, ParseStarsResponse, SolvePlannerBody } from "@workspace/api-zod";
import { catalog } from "../planner/catalog";
import { mockSyllabi, renderMockSyllabus } from "../planner/syllabi";
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
  res.redirect(302, course.sourceUrl);
});
router.get("/planner/mock-syllabi/:id", (req, res) => {
  const id = req.params.id;
  if (!id || !Object.prototype.hasOwnProperty.call(mockSyllabi, id)) { res.status(404).send("Mock syllabus not found."); return; }
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");
  res.type("html").send(renderMockSyllabus(id as keyof typeof mockSyllabi));
});
export default router;
