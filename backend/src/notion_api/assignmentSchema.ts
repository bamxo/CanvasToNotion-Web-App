// Notion addresses database properties by name, but users can freely rename
// columns in the Notion UI. Because our schema has exactly one property of
// each underlying Notion type, we resolve the *current* property name by
// type instead of relying on a hardcoded name — so a sync keeps working
// after a user renames "Due Date" to anything else.

export const DEFAULT_ASSIGNMENT_PROPERTIES = {
  name: 'Name',
  dueDate: 'Due Date',
  points: 'Points',
  url: 'URL',
  status: 'Status',
  course: 'Course',
} as const;

export interface ResolvedAssignmentProperties {
  name: string;
  dueDate: string;
  points: string;
  url: string;
  status: string;
  course: string;
}

export interface ResolvedCourseProperties {
  name: string;
}

type PropertySchema = Record<string, { type: string }>;

const findKeyByType = (properties: PropertySchema, type: string): string => {
  const entry = Object.entries(properties).find(([, prop]) => prop.type === type);
  if (!entry) {
    throw new Error(`No property of type "${type}" found in Notion database schema`);
  }
  return entry[0];
};

export const resolveAssignmentPropertyKeys = (properties: PropertySchema): ResolvedAssignmentProperties => ({
  name: findKeyByType(properties, 'title'),
  dueDate: findKeyByType(properties, 'date'),
  points: findKeyByType(properties, 'number'),
  url: findKeyByType(properties, 'url'),
  status: findKeyByType(properties, 'select'),
  course: findKeyByType(properties, 'relation'),
});

export const resolveCoursePropertyKeys = (properties: PropertySchema): ResolvedCourseProperties => ({
  name: findKeyByType(properties, 'title'),
});
