export type SkillCategory = "research" | "writing" | "analysis" | "transform" | "custom";

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  fileName: string;
}

export const SKILL_CATALOG: SkillDef[] = [
  { id: "lit-search", name: "/lit-search", description: "Multi-database literature search", category: "research", fileName: "lit-search.md" },
  { id: "citation-network", name: "/citation-network", description: "Citation graph analysis + visualization", category: "research", fileName: "citation-network.md" },
  { id: "research-gap", name: "/research-gap", description: "Research gap analysis + trends", category: "research", fileName: "research-gap.md" },
  { id: "peer-review", name: "/peer-review", description: "Academic peer review (8 criteria)", category: "writing", fileName: "peer-review.md" },
  { id: "cite-verify", name: "/cite-verify", description: "Citation verification via DOI/CrossRef", category: "writing", fileName: "cite-verify.md" },
  { id: "abstract", name: "/abstract", description: "Generate abstract (5 formats, bilingual)", category: "writing", fileName: "abstract.md" },
  { id: "journal-match", name: "/journal-match", description: "Journal recommendation for manuscript", category: "analysis", fileName: "journal-match.md" },
  { id: "report-template", name: "/report-template", description: "Report design system (academic book aesthetic)", category: "transform", fileName: "report-template.md" },
];

export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  research: "Research",
  writing: "Writing & editing",
  analysis: "Analysis",
  transform: "Transform",
  custom: "Custom",
};

/** SDK commands to hide from autocomplete */
export const HIDDEN_COMMANDS = new Set([
  "context", "cost", "init", "keybindings-help",
  "release-notes", "extra-usage", "insights",
  "heapdump", "debug",
]);
