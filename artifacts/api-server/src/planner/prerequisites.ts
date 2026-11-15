export type PrerequisiteGroups = string[][];

/** Each group is required, but any one course inside a group is sufficient. */
export function unmetPrerequisiteGroups(groups: PrerequisiteGroups, completedCourses: Iterable<string>) {
  const completed = new Set(completedCourses);
  return groups.filter(group => !group.some(courseId => completed.has(courseId)));
}

/** Makes the OR-within / AND-between relationship explicit for students. */
export function formatPrerequisiteGroups(groups: PrerequisiteGroups) {
  return groups
    .map(group => group.length > 1 ? `one of (${group.join(" or ")})` : group[0] ?? "")
    .filter(Boolean)
    .join(" and ");
}
