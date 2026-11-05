// The list of document templates. Each phase adds its templates here.
export type TemplateKey = "lod" | "holding-letter";

export const TEMPLATES: Record<TemplateKey, { name: string; description: string; kind: "letter" | "court"; version: number }> = {
  lod: {
    name: "Letter of Demand",
    description: "Demands the principal sum within a set number of days, with the background drawn from the chronology.",
    kind: "letter",
    version: 1,
  },
  "holding-letter": {
    name: "Holding Letter",
    description: "Acknowledges the other side's letter, says we're taking instructions, and reserves our client's rights.",
    kind: "letter",
    version: 1,
  },
};

export function isTemplateKey(k: string): k is TemplateKey {
  return Object.prototype.hasOwnProperty.call(TEMPLATES, k);
}

export function templateName(k: string) {
  return isTemplateKey(k) ? TEMPLATES[k].name : k;
}
