export function stripDistPrefix(text: string, distName: string): string {
  return text.replaceAll(`./${distName}/`, './').replaceAll(`"${distName}/`, '"');
}

export function stripDistPrefixWithCount(
  text: string,
  distName: string,
): { readonly text: string; readonly replacedCount: number } {
  const dotPattern = `./${distName}/`;
  const quotePattern = `"${distName}/`;
  const dotCount = countOccurrences(text, dotPattern);
  const quoteCount = countOccurrences(text, quotePattern);
  return {
    text: text.replaceAll(dotPattern, './').replaceAll(quotePattern, '"'),
    replacedCount: dotCount + quoteCount,
  };
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let position = 0;
  while ((position = haystack.indexOf(needle, position)) !== -1) {
    count++;
    position += needle.length;
  }
  return count;
}
