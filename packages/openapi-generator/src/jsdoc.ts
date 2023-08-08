import type { Block } from 'comment-parser';

export type JSDoc = {
  summary?: string;
  description?: string;
  tags?: Record<string, string>;
};

export function parseCommentBlock(comment: Block): JSDoc {
  let summary: string = '';
  let description: string = '';
  let tags: Record<string, string> = {};

  for (const line of comment.source) {
    if (summary.length === 0) {
      if (line.tokens.description === '') {
        continue;
      }
      summary = line.tokens.description;
    } else {
      if (line.tokens.tag !== undefined && line.tokens.tag.length > 0) {
        tags[line.tokens.tag.slice(1)] =
          `${line.tokens.name} ${line.tokens.description}`.trim();
      } else {
        description = `${description ?? ''}\n${line.tokens.description}`;
      }
    }
  }

  if (description !== undefined) {
    description = description.trim();
  }

  return {
    ...(summary.length > 0 ? { summary } : {}),
    ...(description.length > 0 ? { description } : {}),
    ...(Object.keys(tags).length > 0 ? { tags } : {}),
  };
}
