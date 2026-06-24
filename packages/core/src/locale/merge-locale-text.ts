import type { LocaleText } from "./locale-text.js";

export function mergeLocaleText(
  base: LocaleText,
  ...overrides: Array<Partial<LocaleText> | undefined>
): LocaleText {
  const merged: LocaleText = { ...base };
  // Later overrides win; undefined values are skipped to preserve prior keys.
  for (const override of overrides) {
    if (!override) continue;
    for (const [key, value] of Object.entries(override)) {
      if (value !== undefined) {
        (merged as Record<string, string>)[key] = value;
      }
    }
  }
  return merged;
}
