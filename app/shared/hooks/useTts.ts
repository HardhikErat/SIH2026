import * as Speech from 'expo-speech';

function toBcp47(language: string): string {
  const base = language.split('-')[0];
  const map: Record<string, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    mr: 'mr-IN',
    bn: 'bn-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    gu: 'gu-IN',
    pa: 'pa-IN',
    or: 'or-IN',
    as: 'as-IN',
    ur: 'ur-IN',
  };
  return map[base] ?? `${base}-IN`;
}

export function speak(text: string, language: string) {
  if (!text.trim()) return;
  Speech.stop();
  Speech.speak(text, { language: toBcp47(language), rate: 0.92 });
}
