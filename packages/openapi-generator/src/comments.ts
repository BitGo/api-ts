import { parse as parseComment, Block } from 'comment-parser';

export function leadingComment(
  src: string,
  srcSpanStart: number,
  start: number,
  end: number,
): Block[] {
  let commentString = src.slice(start - srcSpanStart, end - srcSpanStart);

  if (commentString.trim()[0] !== '/') {
    commentString = '/' + commentString;
  }

  return parseComment(commentString);
}
