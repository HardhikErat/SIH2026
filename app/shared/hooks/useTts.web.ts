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

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang.startsWith(lang.split('-')[0])) ??
    voices.find((v) => v.lang.includes('IN'))
  );
}

function utter(text: string, language: string) {
  const lang = toBcp47(language);
  const synth = window.speechSynthesis;
  synth.cancel();

  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.92;
  const voice = pickVoice(lang);
  if (voice) u.voice = voice;
  synth.speak(u);
}

/** Web Speech Synthesis — avoids expo-speech cancel/speak race on browsers. */
export function speak(text: string, language: string) {
  if (typeof window === 'undefined' || !text.trim()) return;
  if (!('speechSynthesis' in window)) return;

  const synth = window.speechSynthesis;
  if (synth.getVoices().length === 0) {
    const onVoices = () => {
      synth.removeEventListener('voiceschanged', onVoices);
      utter(text, language);
    };
    synth.addEventListener('voiceschanged', onVoices);
    return;
  }

  // Chrome can swallow speak() if called in the same tick as cancel()
  requestAnimationFrame(() => utter(text, language));
}
