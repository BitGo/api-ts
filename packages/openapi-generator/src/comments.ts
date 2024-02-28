import { parse as parseComment, Block } from 'comment-parser';

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

  const parsedComment = parseComment(commentString);
  return parsedComment;
}
