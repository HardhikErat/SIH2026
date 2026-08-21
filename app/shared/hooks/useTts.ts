import * as Speech from 'expo-speech';

export function speak(text: string, language: string) {
  Speech.stop();
  Speech.speak(text, { language: language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN' });
}
