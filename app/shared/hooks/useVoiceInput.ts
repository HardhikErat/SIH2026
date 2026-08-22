import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

import { api } from '../api/client';

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

type WebSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getWebSpeechRecognition(): (new () => WebSpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as typeof window & {
    SpeechRecognition?: new () => WebSpeechRecognition;
    webkitSpeechRecognition?: new () => WebSpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result ?? '');
      resolve(dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read audio'));
    reader.readAsDataURL(blob);
  });
}

type Options = {
  language: string;
  token?: string | null;
};

export function useVoiceInput({ language, token }: Options) {
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const transcriptRef = useRef('');

  const start = useCallback(async () => {
    transcriptRef.current = '';

    if (Platform.OS === 'web') {
      const SpeechRecognition = getWebSpeechRecognition();
      if (!SpeechRecognition) {
        throw new Error('VOICE_UNSUPPORTED');
      }
      const recognition = new SpeechRecognition();
      recognition.lang = toBcp47(language);
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const results = event.results as unknown as ArrayLike<{ [index: number]: { transcript: string } }>;
        const parts: string[] = [];
        for (let i = 0; i < results.length; i += 1) {
          parts.push(results[i][0]?.transcript ?? '');
        }
        transcriptRef.current = parts.join(' ').trim();
      };
      recognition.onerror = () => {
        setIsRecording(false);
      };
      recognition.onend = () => {
        setIsRecording(false);
        recognitionRef.current = null;
      };
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();
    recordingRef.current = recording;
    setIsRecording(true);
  }, [language]);

  const stop = useCallback(async (): Promise<string> => {
    if (Platform.OS === 'web') {
      const recognition = recognitionRef.current;
      if (!recognition) return transcriptRef.current;
      recognition.stop();
      setIsRecording(false);
      return transcriptRef.current;
    }

    const recording = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);
    if (!recording) return '';

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (!uri || !token) return '';

    const response = await fetch(uri);
    const blob = await response.blob();
    const audioBase64 = await blobToBase64(blob);
    const result = await api.transcribe(token, audioBase64, language);
    return (result.text ?? '').trim();
  }, [language, token]);

  const cancel = useCallback(async () => {
    if (Platform.OS === 'web') {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      setIsRecording(false);
      return;
    }
    const recording = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);
    if (recording) {
      await recording.stopAndUnloadAsync();
    }
  }, []);

  return { isRecording, start, stop, cancel };
}
