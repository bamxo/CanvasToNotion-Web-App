import { describe, expect, it } from 'vitest';
import { partitionCoursesByLimit } from '../src/notion_api/classSyncLimit';

describe('partitionCoursesByLimit', () => {
  it('allows everything when the limit is null (unlimited tier)', () => {
    const courses = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
    const result = partitionCoursesByLimit([], courses, null);
    expect(result).toEqual({ allowed: courses, rejected: [] });
  });

  it('allows re-syncing an already-tracked course even at the cap', () => {
    const courses = [{ id: '1', name: 'A' }];
    const result = partitionCoursesByLimit(['1', '2', '3', '4', '5'], courses, 5);
    expect(result).toEqual({ allowed: courses, rejected: [] });
  });

  it('allows new courses up to the limit', () => {
    const courses = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
    const result = partitionCoursesByLimit(['x', 'y', 'z'], courses, 5);
    expect(result).toEqual({ allowed: courses, rejected: [] });
  });

  it('rejects new courses once the limit is reached, allowing the rest through', () => {
    const courses = [
      { id: 'new-1', name: 'New One' },
      { id: 'existing', name: 'Existing' },
      { id: 'new-2', name: 'New Two' },
    ];
    const result = partitionCoursesByLimit(
      ['existing', 'x', 'y', 'z', 'w'],
      courses,
      5
    );
    expect(result).toEqual({
      allowed: [{ id: 'existing', name: 'Existing' }],
      rejected: [{ id: 'new-1', name: 'New One' }, { id: 'new-2', name: 'New Two' }],
    });
  });

  it('fills remaining slots before rejecting, matching id types across string/number', () => {
    const courses = [{ id: 10, name: 'Ten' }, { id: 11, name: 'Eleven' }];
    const result = partitionCoursesByLimit(['1', '2', '3'], courses, 4);
    expect(result.allowed).toEqual([{ id: 10, name: 'Ten' }]);
    expect(result.rejected).toEqual([{ id: 11, name: 'Eleven' }]);
  });

  it('treats an empty existing set and a limit of 0 as fully rejecting new courses', () => {
    const courses = [{ id: 1, name: 'A' }];
    const result = partitionCoursesByLimit([], courses, 0);
    expect(result).toEqual({ allowed: [], rejected: courses });
  });
});
