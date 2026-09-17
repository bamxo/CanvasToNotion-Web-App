import { describe, it, expect } from 'vitest';
import { resolveParentId } from '../src/notion_api/pageHierarchy';

describe('resolveParentId', () => {
  it('resolves a page parent to its page_id', () => {
    expect(resolveParentId({ type: 'page_id', page_id: 'page-abc' })).toBe('page-abc');
  });

  it('resolves a database parent to its database_id', () => {
    expect(resolveParentId({ type: 'database_id', database_id: 'db-abc' })).toBe('db-abc');
  });

  it('treats a workspace-level parent as root (null)', () => {
    expect(resolveParentId({ type: 'workspace', workspace: true })).toBeNull();
  });

  it('treats a block parent as root (null) since blocks are not addressable as pages', () => {
    expect(resolveParentId({ type: 'block_id', block_id: 'block-abc' })).toBeNull();
  });
});
