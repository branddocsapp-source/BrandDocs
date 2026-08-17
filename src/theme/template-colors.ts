export type TemplateColor = "blue" | "green" | "orange";

export const TEMPLATE_COLOR_OPTIONS: { value: TemplateColor; label: string; primaryColor: string }[] = [
  { value: "blue", label: "Blue", primaryColor: "#2563EB" },
  { value: "green", label: "Green", primaryColor: "#16A34A" },
  { value: "orange", label: "Orange", primaryColor: "#FF7A00" },
];

const TEMPLATE_COLOR_TO_PRIMARY: Record<TemplateColor, string> = {
  blue: "#2563EB",
  green: "#16A34A",
  orange: "#FF7A00",
};

let activeTemplateColor: TemplateColor = "orange";

export function normalizeTemplateColor(value?: string | null): TemplateColor {
  if (value === "blue" || value === "green" || value === "orange") return value;
  return "orange";
}

export function templateColorToPrimaryColor(value?: string | null): string {
  const normalized = normalizeTemplateColor(value);
  return TEMPLATE_COLOR_TO_PRIMARY[normalized];
}

export function primaryColorToTemplateColor(value?: string | null): TemplateColor {
  if (!value) return "orange";
  const normalized = value.trim().toUpperCase();
  const match = TEMPLATE_COLOR_OPTIONS.find((option) => option.primaryColor.toUpperCase() === normalized);
  return match?.value || "orange";
}

export function getActiveTemplateColor(): TemplateColor {
  return activeTemplateColor;
}

export function setActiveTemplateColor(value?: string | null): TemplateColor {
  activeTemplateColor = normalizeTemplateColor(value);
  return activeTemplateColor;
}
