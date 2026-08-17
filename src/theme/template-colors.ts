export type TemplateColor = "orange" | "blue" | "green" | "plum" | "slate";

export const TEMPLATE_COLOR_OPTIONS: {
  value: TemplateColor;
  label: string;
  primaryColor: string;
  tagline: string;
}[] = [
  { value: "orange", label: "Warm Orange", primaryColor: "#E8894A", tagline: "Warm, energetic\nand inviting." },
  { value: "blue",   label: "Slate Blue",  primaryColor: "#55718C", tagline: "Professional, trustworthy\nand reliable." },
  { value: "green",  label: "Sage Green",  primaryColor: "#668477", tagline: "Calm, balanced\nand natural." },
  { value: "plum",   label: "Muted Plum",  primaryColor: "#78677D", tagline: "Elegant, unique\nand premium." },
  { value: "slate",  label: "Platinum Slate", primaryColor: "#626B73", tagline: "Strong, modern\nand sophisticated." },
];

const TEMPLATE_COLOR_TO_PRIMARY: Record<TemplateColor, string> = {
  orange: "#E8894A",
  blue:   "#55718C",
  green:  "#668477",
  plum:   "#78677D",
  slate:  "#626B73",
};

let activeTemplateColor: TemplateColor = "orange";

export function normalizeTemplateColor(value?: string | null): TemplateColor {
  if (
    value === "orange" ||
    value === "blue" ||
    value === "green" ||
    value === "plum" ||
    value === "slate"
  ) {
    return value;
  }
  return "orange";
}

export function templateColorToPrimaryColor(value?: string | null): string {
  const normalized = normalizeTemplateColor(value);
  return TEMPLATE_COLOR_TO_PRIMARY[normalized];
}

export function primaryColorToTemplateColor(value?: string | null): TemplateColor {
  if (!value) return "orange";
  const normalized = value.trim().toUpperCase();
  const match = TEMPLATE_COLOR_OPTIONS.find(
    (option) => option.primaryColor.toUpperCase() === normalized
  );
  return match?.value || "orange";
}

export function getActiveTemplateColor(): TemplateColor {
  return activeTemplateColor;
}

export function setActiveTemplateColor(value?: string | null): TemplateColor {
  activeTemplateColor = normalizeTemplateColor(value);
  return activeTemplateColor;
}
