// src/notion_api/classSyncLimit.ts
//
// Pure policy for the free-tier class-sync cap. A "synced class" is a Canvas
// course the user has ever synced to their Notion Courses database, tracked
// by course id (see classSyncStore.ts for persistence).
//
// Already-synced courses are always allowed through (re-syncing assignments
// for a class you already have must keep working). New courses are allowed
// until the tier's limit is reached; anything past that is rejected so the
// caller can skip creating those courses and surface a clear error.
export interface CourseRef {
  id: string | number;
  name: string;
}

export interface PartitionResult<T extends CourseRef> {
  allowed: T[];
  rejected: T[];
}

export function partitionCoursesByLimit<T extends CourseRef>(
  existingCourseIds: readonly (string | number)[],
  requestedCourses: readonly T[],
  limit: number | null
): PartitionResult<T> {
  if (limit === null) {
    return { allowed: [...requestedCourses], rejected: [] };
  }

  const existing = new Set(existingCourseIds.map(String));
  const allowed: T[] = [];
  const rejected: T[] = [];
  let usedSlots = existing.size;

  for (const course of requestedCourses) {
    const idStr = String(course.id);
    if (existing.has(idStr)) {
      allowed.push(course);
      continue;
    }
    if (usedSlots < limit) {
      allowed.push(course);
      existing.add(idStr);
      usedSlots++;
    } else {
      rejected.push(course);
    }
  }

  return { allowed, rejected };
}
