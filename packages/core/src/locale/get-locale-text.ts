import { DEFAULT_LOCALE_TEXT, type LocaleText, type LocaleTextKey } from "./locale-text.js";
import { mergeLocaleText } from "./merge-locale-text.js";

export function createLocaleResolver(
  localeText?: Partial<LocaleText>,
  bundle?: Partial<LocaleText>,
): (key: LocaleTextKey, params?: Record<string, string | number>) => string {
  const catalog = mergeLocaleText(DEFAULT_LOCALE_TEXT, bundle, localeText) as Required<LocaleText>;

  return (key, params) => {
    let text = catalog[key] ?? DEFAULT_LOCALE_TEXT[key];
    if (params) {
      for (const [param, value] of Object.entries(params)) {
        text = text.replaceAll(`{${param}}`, String(value));
      }
    }
    return text;
  };
}
