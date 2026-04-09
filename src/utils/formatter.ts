/**
 * Report formatter -- converts pipeline results to table, JSON, or Markdown.
 */

export type OutputFormat = "table" | "json" | "markdown";

/**
 * Format data as a table string.
 */
export function formatTable(
  headers: string[],
  rows: string[][],
): string {
  if (rows.length === 0) return "(no data)";

  // Calculate column widths
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)),
  );

  const sep = widths.map((w) => "-".repeat(w + 2)).join("+");
  const headerRow = headers
    .map((h, i) => ` ${h.padEnd(widths[i])} `)
    .join("|");
  const dataRows = rows
    .map((row) =>
      row.map((cell, i) => ` ${(cell ?? "").padEnd(widths[i])} `).join("|"),
    )
    .join("\n");

  return [headerRow, sep, dataRows].join("\n");
}

/**
 * Format data as a Markdown table.
 */
export function formatMarkdownTable(
  headers: string[],
  rows: string[][],
): string {
  if (rows.length === 0) return "_No data._";

  const headerRow = `| ${headers.join(" | ")} |`;
  const sepRow = `| ${headers.map(() => "---").join(" | ")} |`;
  const dataRows = rows
    .map((row) => `| ${row.join(" | ")} |`)
    .join("\n");

  return [headerRow, sepRow, dataRows].join("\n");
}

/**
 * Format an object as pretty JSON.
 */
export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Auto-format based on the specified output format.
 */
export function formatReport(
  data: { headers: string[]; rows: string[][] },
  format: OutputFormat = "table",
): string {
  switch (format) {
    case "table":
      return formatTable(data.headers, data.rows);
    case "markdown":
      return formatMarkdownTable(data.headers, data.rows);
    case "json":
      return formatJson(data);
  }
}
