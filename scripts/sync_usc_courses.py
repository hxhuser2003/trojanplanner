"""Cache a bounded Spring 2027 CSCI subset from USC's public Schedule of Classes.

Run from the repository root: python scripts/sync_usc_courses.py
The checked-in snapshot keeps the planner usable without a live USC request.
"""

import itertools
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

TERM = "20271"
COURSES = ("CSCI-544", "CSCI-546", "CSCI-561", "CSCI-570", "CSCI-571", "CSCI-572", "CSCI-585")
OUTPUT = Path(__file__).resolve().parents[1] / "artifacts/api-server/src/planner/usc-spring-2027.json"
DAY = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4}


def fetch_course(code):
    url = "https://classes.usc.edu/api/Courses/Course?" + urlencode({"termCode": TERM, "courseCode": code})
    with urlopen(Request(url, headers={"User-Agent": "TrojanPlanner course snapshot (academic demo)"}), timeout=20) as response:
        data = json.load(response)
    if data.get("scheduledCourseCode", {}).get("courseHyphen") != code or str(data.get("termCode")) != TERM:
        raise ValueError(f"Unexpected course response for {code}")
    return data


def meetings(section):
    result = []
    unknown = []
    for item in section.get("schedule") or []:
        days = item.get("days") or []
        start, end = item.get("startTime"), item.get("endTime")
        if not days or start in (None, "TBA") or end in (None, "TBA"):
            unknown.append(f"{section['rnrMode']} {section['sisSectionId']} time TBA")
            continue
        start_min = int(start[:2]) * 60 + int(start[3:5])
        end_min = int(end[:2]) * 60 + int(end[3:5])
        if not 0 <= start_min < end_min <= 1440:
            raise ValueError(f"Invalid time in {section['sisSectionId']}")
        for day in days:
            if day not in DAY:
                unknown.append(f"{section['rnrMode']} {section['sisSectionId']} meets {day}")
                continue
            result.append({"day": DAY[day], "start": start_min, "end": end_min,
                           "kind": section["rnrMode"], "location": "See USC Schedule of Classes"})
    if not section.get("schedule"):
        unknown.append(f"{section['rnrMode']} {section['sisSectionId']} time not listed")
    return result, unknown


def prereq_groups(data):
    groups = []
    for group in data.get("prerequisiteCourseCodes") or []:
        options = group.get("courseOptions") or []
        if group.get("requiredCourses") != 1 or not options or any(o.get("ands") for o in options):
            raise ValueError(f"Unsupported prerequisite expression for {data['fullCourseName']}")
        groups.append(sorted({o["courseHyphen"] for o in options}))
    if data.get("corequisiteCourseCodes"):
        raise ValueError(f"Corequisites need separate modeling: {data['fullCourseName']}")
    return groups


def bundles(data):
    sections = [s for s in data.get("sections") or [] if not s.get("isCancelled")]
    rows = []
    for lecture in (s for s in sections if s.get("rnrMode") == "Lecture"):
        linked = [s for s in sections if s.get("rnrMode") != "Lecture" and s.get("linkCode")
                  and s.get("linkCode") == lecture.get("linkCode")
                  and s.get("rnrSessionId") == lecture.get("rnrSessionId")]
        kinds = sorted({s["rnrMode"] for s in linked})
        choices = [[s for s in linked if s["rnrMode"] == kind] for kind in kinds]
        for selected in itertools.product(*choices) if choices else [()]:
            parts = [lecture, *selected]
            component_ids = [str(s["sisSectionId"]) for s in parts]
            all_meetings, unknown = [], []
            for part in parts:
                m, u = meetings(part)
                all_meetings.extend(m)
                unknown.extend(u)
            if not all_meetings:
                continue
            instructors = [" ".join(filter(None, (i.get("firstName"), i.get("lastName"))))
                           for i in lecture.get("instructors") or []]
            eligibility = "Confirm seats, restrictions, and registration eligibility in USC Web Registration"
            if any(s.get("hasDClearance") for s in parts):
                eligibility += "; D-clearance required"
            if unknown:
                eligibility += "; some meeting times are TBA"
            rows.append({"id": "+".join(component_ids), "componentIds": component_ids,
                         "instructor": ", ".join(instructors) or "Not listed", "meetings": all_meetings,
                         "unknownScheduleComponents": unknown, "eligibility": eligibility,
                         "syllabusUrl": lecture.get("syllabus") or ""})
    covered = {part for row in rows for part in row["componentIds"]}
    omitted = {str(s["sisSectionId"]) for s in sections if s.get("rnrMode") != "Lecture"} - covered
    if omitted:
        raise ValueError(f"Unmatched linked components for {data['fullCourseName']}: {sorted(omitted)}")
    if not rows:
        raise ValueError(f"No schedulable lecture bundles for {data['fullCourseName']}")
    return rows


def main():
    rows = []
    for code in COURSES:
        data = fetch_course(code)
        units = data.get("courseUnits") or []
        if len(units) != 1 or int(units[0]) != units[0] or units[0] <= 0:
            raise ValueError(f"Unsupported unit value for {code}: {units}")
        rows.append({"id": code, "code": data["fullCourseName"], "title": data["name"],
                     "units": int(units[0]), "description": data.get("description") or "",
                     "prerequisiteGroups": prereq_groups(data), "sections": bundles(data),
                     "sourceUrl": f"https://classes.usc.edu/term/{TERM}/catalogue/course/{code.replace('-', '')}"})
    snapshot = {"term": "Spring 2027", "termCode": TERM,
                "retrievedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "source": "USC Schedule of Classes public course API", "courses": rows}
    OUTPUT.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Cached {len(rows)} USC courses and {sum(len(c['sections']) for c in rows)} section bundles in {OUTPUT}")


if __name__ == "__main__":
    main()
