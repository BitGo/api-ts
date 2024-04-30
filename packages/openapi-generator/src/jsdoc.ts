import type { Block } from 'comment-parser';

export type JSDoc = {
  summary?: string;
  description?: string;
  tags?: Record<string, string> & { example?: unknown };
};

export function parseCommentBlock(comment: Block): JSDoc {
  let summary: string = '';
  let description: string = '';
  let tags: Record<string, string> & { example?: any } = {};
  let writingExample = false;

  for (const line of comment.source) {
    if (writingExample) {
      tags['example'] = `${tags['example']}\n${line.source.split('*')[1]?.trim()}`;
      try {
        tags['example'] = JSON.parse(tags['example']);
        writingExample = false;
      } catch (e) {
        if (line.source.endsWith('*/'))
          throw new Error('@example contains invalid JSON');
        else continue;
      }
    } else {
      if (summary.length === 0) {
        if (line.tokens.description === '') {
          continue;
        }
        summary = line.tokens.description;
      } else {
        if (line.tokens.tag !== undefined && line.tokens.tag.length > 0) {
          if (line.tokens.tag === '@example') {
            tags['example'] = line.source.split('@example')[1]?.trim();
            if (tags['example'].startsWith('{') || tags['example'].startsWith('[')) {
              try {
                tags['example'] = JSON.parse(tags['example']);
              } catch (e) {
                writingExample = true;
              }
            }
          } else
            tags[line.tokens.tag.slice(1)] =
              `${line.tokens.name} ${line.tokens.description}`.trim();
        } else {
          description = `${description ?? ''}\n${line.tokens.description}`;
        }
      }
    }
  }

  description = description.trim();

  return {
    ...(summary.length > 0 ? { summary } : {}),
    ...(description.length > 0 ? { description } : {}),
    ...(Object.keys(tags).length > 0 ? { tags } : {}),
  };
}
