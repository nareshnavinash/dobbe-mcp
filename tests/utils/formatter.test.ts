import { describe, it, expect } from "vitest";
import {
  formatTable,
  formatMarkdownTable,
  formatJson,
  formatReport,
} from "../../src/utils/formatter.js";

describe("formatter", () => {
  describe("formatTable", () => {
    it("formats headers and rows", () => {
      const result = formatTable(
        ["Name", "Version", "Status"],
        [
          ["lodash", "4.17.21", "healthy"],
          ["express", "4.21.0", "outdated"],
        ],
      );
      expect(result).toContain("Name");
      expect(result).toContain("lodash");
      expect(result).toContain("express");
      expect(result).toContain("---");
    });

    it("handles empty rows", () => {
      expect(formatTable(["A", "B"], [])).toBe("(no data)");
    });

    it("pads columns to max width", () => {
      const result = formatTable(
        ["Short", "LongColumnName"],
        [["a", "b"]],
      );
      expect(result).toContain("LongColumnName");
    });
  });

  describe("formatMarkdownTable", () => {
    it("formats as markdown table", () => {
      const result = formatMarkdownTable(
        ["Name", "Value"],
        [["a", "1"], ["b", "2"]],
      );
      expect(result).toContain("| Name | Value |");
      expect(result).toContain("| --- | --- |");
      expect(result).toContain("| a | 1 |");
    });

    it("handles empty rows", () => {
      expect(formatMarkdownTable(["A"], [])).toBe("_No data._");
    });
  });

  describe("formatJson", () => {
    it("formats as pretty JSON", () => {
      const result = formatJson({ key: "value", nested: { a: 1 } });
      expect(JSON.parse(result)).toEqual({ key: "value", nested: { a: 1 } });
      expect(result).toContain("\n"); // Pretty printed
    });
  });

  describe("formatReport", () => {
    const data = {
      headers: ["Name", "Count"],
      rows: [["items", "5"]],
    };

    it("formats as table by default", () => {
      const result = formatReport(data);
      expect(result).toContain("Name");
      expect(result).toContain("---");
    });

    it("formats as markdown", () => {
      const result = formatReport(data, "markdown");
      expect(result).toContain("| Name | Count |");
    });

    it("formats as JSON", () => {
      const result = formatReport(data, "json");
      expect(JSON.parse(result)).toEqual(data);
    });
  });
});
