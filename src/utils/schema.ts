import { z } from "zod";

/**
 * Zod schemas for each pipeline step's expected results.
 * These validate what Claude submits back to the MCP server.
 */

// ─── Vuln Scan Schemas ───

export const VulnAlertSchema = z.object({
  number: z.number().describe("Dependabot alert number"),
  package_name: z.string().describe("Package name"),
  current_version: z.string().describe("Current vulnerable version"),
  patched_version: z.string().optional().describe("Version with the fix"),
  severity: z.enum(["critical", "high", "medium", "low"]),
  cve: z.string().optional().describe("CVE identifier"),
  title: z.string().describe("Alert title"),
});

export const VulnGroupSchema = z.object({
  package_name: z.string(),
  ecosystem: z.string().describe("npm, pip, maven, etc."),
  current_version: z.string(),
  target_version: z.string(),
  alerts: z.array(VulnAlertSchema),
  risk_assessment: z.string().describe("AI assessment of actual risk"),
  action: z.enum(["fix", "skip", "manual"]).describe("Recommended action"),
  reason: z.string().describe("Why this action was chosen"),
});

export const VulnScanResultSchema = z.object({
  groups: z.array(VulnGroupSchema),
  total_alerts: z.number(),
  fixable: z.number(),
  skipped: z.number(),
  summary: z.string().describe("One-paragraph triage summary"),
});

export const VulnScanReportSchema = z.object({
  report: z.string().describe("Formatted report text"),
});

// ─── Vuln Resolve Schemas ───

export const FixChangeSchema = z.object({
  file: z.string().describe("File that was modified"),
  package_name: z.string(),
  from_version: z.string(),
  to_version: z.string(),
});

export const FixResultSchema = z.object({
  changes: z.array(FixChangeSchema),
  description: z.string().describe("Summary of what was fixed"),
});

export const CommitResultSchema = z.object({
  committed: z.boolean(),
  message: z.string().optional(),
});

export const VerifyResultSchema = z.object({
  passed: z.boolean(),
  errors: z.string().optional().describe("Error output if tests failed"),
  test_count: z.number().optional(),
});

export const ReportResultSchema = z.object({
  pr_url: z.string().optional(),
  summary: z.string().describe("Final pipeline summary"),
});

// ─── Vuln Resolve Expanded Schemas ───

export const FixDetailSchema = z.object({
  package_name: z.string(),
  file_modified: z.string(),
  old_version: z.string(),
  new_version: z.string(),
  alerts_addressed: z.array(z.number()),
  status: z.string().describe("applied, lockfile_updated, partial"),
});

export const FixSkipSchema = z.object({
  package_name: z.string(),
  reason: z.string(),
  alerts_skipped: z.array(z.number()),
});

export const FullFixResultSchema = z.object({
  fixes: z.array(FixDetailSchema),
  skipped: z.array(FixSkipSchema),
  diff_summary: z.string(),
});

export const FullVerifyResultSchema = z.object({
  passed: z.boolean().describe("TRUE only if all tests pass + no breaking changes + lockfile consistent"),
  issues: z.array(z.object({
    category: z.enum(["breaking_change", "test_failure", "lockfile_inconsistency", "code_quality"]),
    severity: z.enum(["critical", "high", "medium", "low"]),
    description: z.string(),
    suggestion: z.string(),
  })),
  test_output: z.string(),
  feedback: z.string().describe("Actionable feedback for next fix iteration"),
});

export const ResolveReportSchema = z.object({
  summary: z.string().describe("Executive summary of the entire resolve pipeline"),
});

export const PrResultSchema = z.object({
  pr_url: z.string(),
  pr_number: z.number().optional(),
  branch: z.string(),
});

// ─── Review Schemas ───

export const PrInfoSchema = z.object({
  number: z.number(),
  title: z.string(),
  author: z.string(),
  repo: z.string().optional(),
  url: z.string().optional(),
  description: z.string().optional(),
  labels: z.array(z.string()).optional(),
  created_at: z.string().optional(),
  draft: z.boolean().optional(),
});

export const PrListSchema = z.object({
  prs: z.array(PrInfoSchema),
  total: z.number(),
});

export const ConcernSchema = z.object({
  category: z.enum(["security", "testing", "breaking_change", "code_quality", "complexity"]),
  severity: z.enum(["critical", "high", "medium", "low"]),
  description: z.string(),
  file_path: z.string().optional(),
  line_number: z.number().optional(),
  suggestion: z.string(),
});

export const PrReviewSchema = z.object({
  risk_level: z.enum(["critical", "high", "medium", "low"]),
  summary: z.string(),
  concerns: z.array(ConcernSchema),
  recommendations: z.array(z.string()),
  estimated_review_time: z.string().optional(),
  approval_recommendation: z.enum(["approve", "request_changes", "comment"]),
});

export const ReviewDigestSchema = z.object({
  reviews: z.array(z.object({
    pr: PrInfoSchema,
    review: PrReviewSchema,
  })),
  summary: z.string().describe("Overall digest summary"),
});

// ─── Incident Triage Schemas ───

export const TriagedIssueSchema = z.object({
  issue_id: z.string(),
  title: z.string(),
  culprit: z.string().optional().describe("Function/module where error originates"),
  level: z.enum(["error", "warning", "fatal"]).optional(),
  first_seen: z.string().optional(),
  last_seen: z.string().optional(),
  count: z.number().optional(),
  project: z.string().optional(),
  platform: z.string().optional(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  root_cause: z.string(),
  affected_file: z.string().optional(),
  affected_function: z.string().optional(),
  recommendation: z.string(),
  fixable: z.boolean(),
  evidence: z.string().optional(),
});

export const IncidentTriageResultSchema = z.object({
  triaged: z.array(TriagedIssueSchema),
  total_issues: z.number(),
  summary: z.string(),
});

export const IncidentRcaSchema = z.object({
  issue_id: z.string(),
  root_cause: z.string(),
  affected_file: z.string().optional(),
  affected_function: z.string().optional(),
  blast_radius: z.string().optional(),
  fix_recommendation: z.string(),
  tests_to_add: z.array(z.string()).optional(),
  safe_to_deploy: z.boolean().optional(),
  evidence: z.string().optional(),
});

export const IncidentResolveResultSchema = z.object({
  root_cause: z.string(),
  fix_description: z.string(),
  files_modified: z.array(z.string()),
  tests_added: z.array(z.string()),
  verified: z.boolean(),
  pr_title: z.string().optional(),
  pr_body: z.string().optional(),
});

// ─── Review Post Schemas ───

export const PostResultSchema = z.object({
  posted: z.array(z.object({
    pr_number: z.number(),
    repo: z.string(),
    comment_url: z.string().optional(),
    risk_level: z.enum(["critical", "high", "medium", "low"]),
  })),
  skipped: z.array(z.object({
    pr_number: z.number(),
    reason: z.string(),
  })),
  summary: z.string(),
});

// ─── Audit Report Schemas ───

export const AuditFindingSchema = z.object({
  check_type: z.enum(["vuln", "license", "secrets", "quality"]),
  severity: z.enum(["critical", "high", "medium", "low"]),
  title: z.string(),
  description: z.string(),
  file_path: z.string().optional(),
  recommendation: z.string(),
});

export const AuditReportSchema = z.object({
  risk_score: z.enum(["critical", "high", "medium", "low"]),
  findings: z.array(AuditFindingSchema),
  summary: z.string(),
});

// ─── Deps Analyze Schemas ───

export const DepsFindingSchema = z.object({
  package: z.string(),
  ecosystem: z.string(),
  current_version: z.string(),
  latest_version: z.string().optional(),
  health: z.enum(["healthy", "outdated", "unmaintained", "deprecated"]),
  license: z.string().optional(),
  license_risk: z.enum(["high", "medium", "low", "unknown"]).optional(),
  is_unused: z.boolean(),
  evidence: z.string().optional(),
  recommendation: z.string(),
});

export const DepsReportSchema = z.object({
  findings: z.array(DepsFindingSchema),
  summary: z.string(),
});

// ─── Test Gen Schemas ───

export const CoverageGapSchema = z.object({
  file_path: z.string(),
  function_name: z.string().optional(),
  line_range: z.string().optional(),
  reason: z.string(),
});

export const TestGenAnalyzeSchema = z.object({
  coverage_gaps: z.array(CoverageGapSchema),
  framework: z.string().describe("pytest, jest, mocha, go, etc."),
  total_source_files: z.number().optional(),
  total_test_files: z.number().optional(),
});

export const TestGenResultSchema = z.object({
  generated_tests: z.array(z.object({
    test_file: z.string(),
    target_file: z.string(),
    test_count: z.number(),
    description: z.string(),
  })),
  description: z.string(),
});

export const TestGenVerifySchema = z.object({
  passed: z.boolean(),
  test_output: z.string(),
  feedback: z.string(),
  new_tests_count: z.number().optional(),
});

// ─── Changelog Gen Schemas ───

export const ChangelogEntrySchema = z.object({
  description: z.string(),
  author: z.string().optional(),
  pr_number: z.number().optional(),
  breaking: z.boolean().optional(),
});

export const ChangelogSectionSchema = z.object({
  category: z.enum(["feature", "fix", "breaking", "deprecation", "performance", "documentation", "chore", "security"]),
  entries: z.array(ChangelogEntrySchema),
});

export const ChangelogSchema = z.object({
  summary: z.string(),
  sections: z.array(ChangelogSectionSchema),
});

// ─── Migration Plan Schemas ───

export const MigrationStepSchema = z.object({
  description: z.string(),
  file_path: z.string().optional(),
  breaking_change: z.boolean().optional(),
  notes: z.string().optional(),
});

export const MigrationPlanSchema = z.object({
  steps: z.array(MigrationStepSchema),
  estimated_complexity: z.enum(["low", "medium", "high"]),
  risks: z.array(z.string()),
  summary: z.string(),
});

export const MigrationApplySchema = z.object({
  files_modified: z.array(z.string()),
  changes_description: z.string(),
});

export const MigrationVerifySchema = z.object({
  passed: z.boolean(),
  test_output: z.string(),
  feedback: z.string(),
});

// ─── Metrics Schemas ───

export const VelocityMetricsSchema = z.object({
  period: z.string(),
  total_prs_merged: z.number(),
  avg_cycle_time_hours: z.number(),
  median_cycle_time_hours: z.number().optional(),
  median_review_time_hours: z.number().optional(),
  merge_cadence_prs_per_day: z.number(),
});

export const DoraMetricsSchema = z.object({
  period: z.string(),
  deploy_frequency_per_day: z.number(),
  lead_time_for_changes_hours: z.number(),
  change_failure_rate: z.number(),
  mttr_hours: z.number(),
});

export const MetricsReportSchema = z.object({
  velocity: VelocityMetricsSchema.optional(),
  dora: DoraMetricsSchema.optional(),
  summary: z.string(),
});

export const DoraReportSchema = z.object({
  dora: DoraMetricsSchema,
  velocity: VelocityMetricsSchema.optional(),
  summary: z.string(),
});

export const VelocityReportSchema = z.object({
  velocity: VelocityMetricsSchema,
  dora: DoraMetricsSchema.optional(),
  summary: z.string(),
});

// ─── Scan Secrets Schemas ───

export const SecretFindingSchema = z.object({
  rule_id: z.string().optional(),
  file: z.string(),
  line: z.number().optional(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  is_false_positive: z.boolean(),
  description: z.string(),
});

export const SecretsResultSchema = z.object({
  total_findings: z.number(),
  false_positives: z.number(),
  findings: z.array(SecretFindingSchema),
  summary: z.string(),
});

// ─── Generic Schemas ───

export const AcknowledgeSchema = z.object({
  ok: z.boolean(),
});

export type VulnScanResult = z.infer<typeof VulnScanResultSchema>;
export type VulnGroup = z.infer<typeof VulnGroupSchema>;
export type VulnAlert = z.infer<typeof VulnAlertSchema>;
export type FixResult = z.infer<typeof FixResultSchema>;
export type VerifyResult = z.infer<typeof VerifyResultSchema>;
export type CommitResult = z.infer<typeof CommitResultSchema>;
export type PrReview = z.infer<typeof PrReviewSchema>;
export type TriagedIssue = z.infer<typeof TriagedIssueSchema>;
export type IncidentRca = z.infer<typeof IncidentRcaSchema>;
