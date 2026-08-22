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
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
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

function collectTranscript(event: SpeechRecognitionEvent): string {
  const parts: string[] = [];
  for (let i = 0; i < event.results.length; i += 1) {
    parts.push(event.results[i][0]?.transcript ?? '');
  }
  return parts.join(' ').trim();
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
  const manualStopRef = useRef(false);
  const stopResolverRef = useRef<((text: string) => void) | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const releaseMicStream = useCallback(() => {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    transcriptRef.current = '';
    manualStopRef.current = false;

    if (Platform.OS === 'web') {
      if (recognitionRef.current) return;

      const SpeechRecognition = getWebSpeechRecognition();
      if (!SpeechRecognition) {
        throw new Error('VOICE_UNSUPPORTED');
      }

      // Keep mic stream open while listening — prevents Chrome from ending recognition early.
      try {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        throw new Error('MIC_DENIED');
      }

      const recognition = new SpeechRecognition();
      recognition.lang = toBcp47(language);
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const text = collectTranscript(event);
        if (text) transcriptRef.current = text;
      };

      recognition.onerror = (event) => {
        // Benign errors while the user is still speaking — do not kill the session.
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          manualStopRef.current = true;
          recognitionRef.current = null;
          releaseMicStream();
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        if (manualStopRef.current) {
          recognitionRef.current = null;
          releaseMicStream();
          setIsRecording(false);
          stopResolverRef.current?.(transcriptRef.current);
          stopResolverRef.current = null;
          return;
        }

        // Chrome ends the session after silence — restart until the user taps stop.
        if (recognitionRef.current) {
          try {
            recognition.start();
          } catch {
            recognitionRef.current = null;
            releaseMicStream();
            setIsRecording(false);
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
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
  }, [language, releaseMicStream]);

  const stop = useCallback(async (): Promise<string> => {
    if (Platform.OS === 'web') {
      const recognition = recognitionRef.current;
      if (!recognition) return transcriptRef.current;

      manualStopRef.current = true;

      return new Promise<string>((resolve) => {
        stopResolverRef.current = resolve;

        try {
          recognition.stop();
        } catch {
          recognitionRef.current = null;
          releaseMicStream();
          setIsRecording(false);
          stopResolverRef.current = null;
          resolve(transcriptRef.current);
        }

        // Fallback if onend never fires
        setTimeout(() => {
          if (stopResolverRef.current) {
            stopResolverRef.current = null;
            recognitionRef.current = null;
            releaseMicStream();
            setIsRecording(false);
            resolve(transcriptRef.current);
          }
        }, 800);
      });
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
  }, [language, token, releaseMicStream]);

  const cancel = useCallback(async () => {
    if (Platform.OS === 'web') {
      manualStopRef.current = true;
      stopResolverRef.current = null;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      releaseMicStream();
      setIsRecording(false);
      return;
    }
    const recording = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);
    if (recording) {
      await recording.stopAndUnloadAsync();
    }
  }, [releaseMicStream]);

  return { isRecording, start, stop, cancel };
}
