export function bem(base: string | undefined, modifiers: Record<string, boolean>): string {
  if (!base) return "";
  const firstClass = base.split(/\s+/)[0];
  const parts = [base];
  for (const [mod, active] of Object.entries(modifiers)) {
    if (active) parts.push(`${firstClass}--${mod}`);
  }
  return parts.join(" ");
}