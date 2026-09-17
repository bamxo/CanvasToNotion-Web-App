type NotionParent =
  | { type: 'page_id'; page_id: string }
  | { type: 'database_id'; database_id: string }
  | { type: 'workspace'; workspace: true }
  | { type: 'block_id'; block_id: string };

// A page/database nested under a block (rather than another page or database)
// has no addressable parent page in our tree, so it is treated as root —
// same as a true workspace-level item.
export const resolveParentId = (parent: NotionParent): string | null => {
  if (parent.type === 'page_id') return parent.page_id;
  if (parent.type === 'database_id') return parent.database_id;
  return null;
};
