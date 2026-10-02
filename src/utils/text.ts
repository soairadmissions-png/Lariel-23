/**
 * Helper to convert any text from ALL CAPS to Title Case (only the first letter of each word capitalized).
 * e.g., "BRIDAL ROBES" -> "Bridal Robes"
 */
export function toTitleCase(str: string): string {
  if (!str) return '';
  return str.replace(/\b([a-zA-Z])([a-zA-Z0-9]*)\b/g, (_, first, rest) => {
    return first.toUpperCase() + rest.toLowerCase();
  });
}
