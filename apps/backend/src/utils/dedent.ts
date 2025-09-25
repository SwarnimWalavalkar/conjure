/**
 * Remove the shared leading indentation from a multi-line string.
 *
 * Usage as a template tag:
 *   dedent`\n    line one\n      line two\n   `
 *
 * Or as a plain function:
 *   dedent("\n    line one\n      line two\n   ")
 *
 * The algorithm preserves indentation characters (spaces/tabs) by removing
 * only the longest common leading whitespace prefix across all non-empty lines.
 */
export default function dedent(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string;
export default function dedent(input: string): string;
export default function dedent(
  stringsOrInput: TemplateStringsArray | string,
  ...values: unknown[]
): string {
  const raw = isTemplateStringsArray(stringsOrInput)
    ? buildFromTemplate(stringsOrInput, values)
    : String(stringsOrInput);

  // Normalize newlines to \n for consistent processing
  const normalized = raw.replace(/\r\n?/g, "\n");

  // Trim a single leading and trailing blank line for nicer authoring of literals
  const trimmedEdges = trimBlankEdges(normalized);

  const lines = trimmedEdges.split("\n");

  // Collect leading whitespace of all non-empty lines
  const leadingWhitespaceList = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => line.match(/^([\t ]*)/)?.[1] ?? "");

  if (leadingWhitespaceList.length === 0) {
    return trimmedEdges;
  }

  const commonPrefix = longestCommonPrefix(leadingWhitespaceList);

  if (commonPrefix === "") {
    return trimmedEdges;
  }

  const dedented = lines
    .map((line) =>
      line.startsWith(commonPrefix) ? line.slice(commonPrefix.length) : line
    )
    .join("\n");

  return dedented;
}

function isTemplateStringsArray(value: unknown): value is TemplateStringsArray {
  if (!Array.isArray(value)) return false;
  const candidate = value as { raw?: unknown };
  return typeof candidate.raw !== "undefined";
}

function buildFromTemplate(
  strings: TemplateStringsArray,
  values: unknown[]
): string {
  let result = "";
  for (let i = 0; i < strings.length; i += 1) {
    result += strings[i];
    if (i < values.length) {
      result += values[i] == null ? "" : String(values[i]);
    }
  }
  return result;
}

function trimBlankEdges(text: string): string {
  const lines = text.split("\n");
  // Remove first line if it is entirely whitespace
  if (lines.length > 0 && lines[0].trim() === "") {
    lines.shift();
  }
  // Remove last line if it is entirely whitespace
  if (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }
  return lines.join("\n");
}

function longestCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return "";
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i += 1) {
    const current = strings[i];
    let j = 0;
    const max = Math.min(prefix.length, current.length);
    while (j < max && prefix[j] === current[j]) {
      j += 1;
    }
    prefix = prefix.slice(0, j);
    if (prefix === "") break;
  }
  return prefix;
}
