"""Bounded CP-SAT scheduling worker. No networking or persistence of student data."""
import json
import sys
import time
from ortools.sat.python import cp_model


def overlaps(a, b):
    return a["day"] == b["day"] and a["start"] < b["end"] and b["start"] < a["end"]


def matches(section, constraint):
    meetings = section["meetings"]
    days = constraint["days"]
    kind = constraint["kind"]
    if kind == "no_day":
        return not any(m["day"] in days for m in meetings)
    if kind == "earliest":
        return all(m["start"] >= constraint["start"] for m in meetings if not days or m["day"] in days)
    if kind == "latest":
        return all(m["end"] <= constraint["end"] for m in meetings if not days or m["day"] in days)
    if kind == "blocked":
        return not any(m["day"] in days and m["start"] < constraint["end"] and constraint["start"] < m["end"] for m in meetings)
    return True


def run_solver(catalog, request, excluded=None):
    model = cp_model.CpModel()
    rows = [(c, s) for c in catalog["courses"] for s in c["sections"]]
    variables = [model.new_bool_var(s["id"]) for _, s in rows]
    completed = set(request["completedCourses"])
    active = [c for c in request["constraints"] if c["enabled"]]
    for course in catalog["courses"]:
        indexes = [i for i, (c, _) in enumerate(rows) if c["id"] == course["id"]]
        model.add(sum(variables[i] for i in indexes) <= 1)
        if course["id"] in completed or not set(course["prerequisites"]).issubset(completed):
            for i in indexes:
                model.add(variables[i] == 0)
    for i, (_, section) in enumerate(rows):
        meetings = section["meetings"]
        if any(overlaps(a, b) for k, a in enumerate(meetings) for b in meetings[k+1:]):
            model.add(variables[i] == 0)
        for j in range(i):
            if any(overlaps(a, b) for a in meetings for b in rows[j][1]["meetings"]):
                model.add(variables[i] + variables[j] <= 1)
        for constraint in active:
            if constraint["hard"] and not matches(section, constraint):
                model.add(variables[i] == 0)
    for constraint in active:
        if constraint["hard"] and constraint["kind"] in ("require_course", "lock_section"):
            target = constraint["value"]
            ids = [i for i, (c, s) in enumerate(rows)
                   if (c["id"] if constraint["kind"] == "require_course" else s["id"]) == target]
            model.add(sum(variables[i] for i in ids) == 1)
    units = sum(c["units"] * variables[i] for i, (c, _) in enumerate(rows))
    model.add(units >= request["minUnits"])
    model.add(units <= request["maxUnits"])
    for requirement in catalog["requirements"]:
        if requirement["id"] in request["requirementIds"]:
            satisfied = len(completed.intersection(requirement["courseIds"]))
            needed = max(0, requirement["needed"] - satisfied)
            model.add(sum(variables[i] for i, (c, _) in enumerate(rows)
                          if c["id"] in requirement["courseIds"]) >= needed)
    for previous in excluded or []:
        # Exclude the exact set, including unselected variables. Works with variable course counts.
        model.add(sum((1-variables[i]) if s["id"] in previous else variables[i]
                      for i, (_, s) in enumerate(rows)) >= 1)
    campus = []
    for day in range(5):
        present = model.new_bool_var(f"day-{day}")
        indexes = [i for i, (_, s) in enumerate(rows) if any(m["day"] == day for m in s["meetings"])]
        if indexes:
            model.add_max_equality(present, [variables[i] for i in indexes])
        else:
            model.add(present == 0)
        campus.append(present)
    costs = []
    for i, (course, section) in enumerate(rows):
        # Do not add unnecessary courses merely to collect assessment rewards.
        # Maximum assessment reward is 130 per course; 300 keeps unit load lean.
        cost = 300
        for constraint in active:
            if constraint["hard"]:
                continue
            kind = constraint["kind"]
            if not matches(section, constraint):
                cost += 120
            if kind == "require_course" and course["id"] == constraint["value"]:
                cost -= 150
            if kind == "lock_section" and section["id"] == constraint["value"]:
                cost -= 150
            syllabus = course["syllabus"]
            known = syllabus["status"] == "synthetic"
            # Neutral missing values must not outperform positively evidenced matches.
            if kind == "prefer_projects" and known:
                cost -= int((syllabus.get("projectPercent") or 0) / 2)
            if kind == "prefer_individual" and known and syllabus["projectMode"] == "individual":
                cost -= 45
            if kind == "prefer_less_frequent" and known and "milestone" in syllabus["cadence"].lower():
                cost -= 35
        costs.append(cost * variables[i])
    day_weight = 40 if any(c["kind"] == "prefer_fewer_days" for c in active) else 4
    model.minimize(sum(costs) + day_weight * sum(campus))
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 1.0
    solver.parameters.num_search_workers = 1
    solver.parameters.random_seed = 7
    status = solver.solve(model)
    names = {cp_model.OPTIMAL: "optimal", cp_model.FEASIBLE: "feasible",
             cp_model.INFEASIBLE: "infeasible", cp_model.UNKNOWN: "unknown", cp_model.MODEL_INVALID: "invalid"}
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return names.get(status, "unknown"), None
    selected = [(c, s) for i, (c, s) in enumerate(rows) if solver.value(variables[i])]
    return names[status], {"selected": selected, "score": -solver.objective_value}


def main():
    payload = json.load(sys.stdin)
    catalog, request = payload["catalog"], payload["input"]
    start = time.monotonic()
    status, result = run_solver(catalog, request)
    output = {"status": status, "solutions": [], "repairs": [], "conflicts": []}
    if result is not None:
        output["solutions"].append(result)
        excluded = [{s["id"] for _, s in result["selected"]}]
        for _ in range(2):
            _, additional = run_solver(catalog, request, excluded)
            if additional is None:
                break
            output["solutions"].append(additional)
            excluded.append({s["id"] for _, s in additional["selected"]})
    elif status == "infeasible":
        active = [c for c in request["constraints"] if c["hard"] and c["enabled"]]
        # Verify a sufficient conflict by deletion. Base requirements/eligibility always remain.
        core = list(active)
        for constraint in active:
            candidate = [c for c in core if c["id"] != constraint["id"]]
            probe = {**request, "constraints": candidate}
            check, _ = run_solver(catalog, probe)
            if check == "infeasible":
                core = candidate
        output["conflicts"] = [c["label"] for c in core]
        if not core:
            output["conflicts"] = ["Selected requirements, unit bounds, completed courses, and available section combinations are incompatible even without user preferences."]
        # Only propose one-constraint, solver-checked changes. Never mutate original request.
        for constraint in active:
            changed = {**request, "constraints": [
                {**c, "enabled": False} if c["id"] == constraint["id"] else c for c in request["constraints"]]}
            repaired_status, solution = run_solver(catalog, changed)
            if solution is not None:
                output["repairs"].append({"constraint": constraint, "input": changed, "solution": solution,
                                          "status": repaired_status})
            if len(output["repairs"]) >= 3:
                break
    output["elapsedMs"] = round((time.monotonic() - start) * 1000)
    json.dump(output, sys.stdout)


if __name__ == "__main__":
    main()
