import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ASSIGNMENT_PROPERTIES,
  resolveAssignmentPropertyKeys,
  resolveCoursePropertyKeys,
} from '../src/notion_api/assignmentSchema';

describe('resolveAssignmentPropertyKeys', () => {
  it('resolves the default property names by their Notion type', () => {
    const properties = {
      Name: { id: 'title', type: 'title' },
      'Due Date': { id: 'abc1', type: 'date' },
      Points: { id: 'abc2', type: 'number' },
      URL: { id: 'abc3', type: 'url' },
      Status: { id: 'abc4', type: 'select' },
      Course: { id: 'abc5', type: 'relation' },
    };

    expect(resolveAssignmentPropertyKeys(properties)).toEqual({
      name: 'Name',
      dueDate: 'Due Date',
      points: 'Points',
      url: 'URL',
      status: 'Status',
      course: 'Course',
    });
  });

  it('still resolves correctly after every column has been renamed by the user', () => {
    const properties = {
      Assignment: { id: 'title', type: 'title' },
      'When is it due': { id: 'abc1', type: 'date' },
      Score: { id: 'abc2', type: 'number' },
      Link: { id: 'abc3', type: 'url' },
      Progress: { id: 'abc4', type: 'select' },
      Class: { id: 'abc5', type: 'relation' },
    };

    expect(resolveAssignmentPropertyKeys(properties)).toEqual({
      name: 'Assignment',
      dueDate: 'When is it due',
      points: 'Score',
      url: 'Link',
      status: 'Progress',
      course: 'Class',
    });
  });

  it('throws a descriptive error when a required property type is missing', () => {
    const properties = {
      Name: { id: 'title', type: 'title' },
      Points: { id: 'abc2', type: 'number' },
    };

    expect(() => resolveAssignmentPropertyKeys(properties)).toThrow(/date/);
  });
});

describe('resolveCoursePropertyKeys', () => {
  it('resolves the title property regardless of its name', () => {
    expect(resolveCoursePropertyKeys({ 'Course Name': { id: 'title', type: 'title' } })).toEqual({
      name: 'Course Name',
    });
  });

  it('throws when no title property exists', () => {
    expect(() => resolveCoursePropertyKeys({ Notes: { id: 'x', type: 'rich_text' } })).toThrow(/title/);
  });
});

describe('DEFAULT_ASSIGNMENT_PROPERTIES', () => {
  it('uses "Due Date" (not "DueDate") as the default due-date column name', () => {
    expect(DEFAULT_ASSIGNMENT_PROPERTIES.dueDate).toBe('Due Date');
  });
});
