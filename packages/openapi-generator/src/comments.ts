import { parse as parseComment, Block } from 'comment-parser';
import { Schema } from './ir';

export function leadingComment(
  src: string,
  srcSpanStart: number,
  start: number,
  end: number,
): Block[] {
  let commentString = src.slice(start - srcSpanStart, end - srcSpanStart).trim();

  if (commentString.includes(' * ') && !/\/\*\*([\s\S]*?)\*\//.test(commentString)) {
    // The comment block seems to be JSDoc but was sliced incorrectly

    const beginningSubstring = '/**\n';
    const endingSubstring = '\n */';

    if (commentString.includes(beginningSubstring)) {
      commentString = beginningSubstring + commentString.split(beginningSubstring)[1];
    } else {
      switch (commentString.split('\n')[0]) {
        case '**':
          commentString = '/' + commentString;
          break;
        case '*':
          commentString = '/*' + commentString;
          break;
        case '':
          commentString = '/**' + commentString;
          break;
        default:
          commentString = beginningSubstring + commentString;
          break;
      }
    }

    if (commentString.includes(endingSubstring)) {
      commentString = commentString.split(endingSubstring)[0] as string;
    }
    commentString = commentString + endingSubstring;
  }

  const parsedComment = parseComment(commentString, { spacing: 'preserve' });

  for (const block of parsedComment) {
    block.description = block.description.trim();
    for (const tag of block.tags) {
      tag.description = tag.description.trim();
    }
  }

  return parsedComment;
}

/**
 *
 * @param schema the schema to get all comments from
 * @returns an array of all comments in the schema
 */
export function getAllSchemaComments(schema: Schema): Block[] {
  const result = [];

  /** Push the first comment */
  if (schema.comment) {
    result.push(schema.comment);
  }

  /** Push the comments of the subschemas in CombinedTypes (union, intersection, etc) */
  if ('schemas' in schema) {
    // combined type
    for (const s of schema.schemas) {
      result.push(...getAllSchemaComments(s));
    }
  }

  return result;
}

/**
 *
 * @param schema the schema to combine comments from
 * @returns a combined comment from all comments in the schema
 */
export function combineComments(schema: Schema): Block | undefined {
  const comments = getAllSchemaComments(schema);

  const tagSet = new Set<string>();

  // Empty comment block where we will build the result
  const result: Block = {
    tags: [],
    description: '',
    problems: [],
    source: [],
  };

  if (comments.length === 0) return undefined;

  // Only use the first description if it exists, we don't wanna accidentally pull a description from a lower level schema
  if (comments[0]?.description && comments[0].description !== '') {
    result.description = comments[0].description;
  }

  // Add all seen tags, problems, and source comments to the result
  for (const comment of comments) {
    for (const tag of comment.tags) {
      // Only add the tag if we haven't seen it before. Otherwise, the higher level tag is 'probably' the more relevant tag.
      if (!tagSet.has(tag.tag)) {
        result.tags.push(tag);
        tagSet.add(tag.tag);
      }
    }

    result.problems.push(...comment.problems);
    result.source.push(...comment.source);
  }

  return result;
}
