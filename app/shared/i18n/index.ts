import en from './en.json';
import hi from './hi.json';
import mr from './mr.json';

const bundles: Record<string, Record<string, string>> = { en, hi, mr };

export function t(lang: string, key: string): string {
  const code = lang.split('-')[0];
  return bundles[code]?.[key] ?? bundles.en[key] ?? key;
}
