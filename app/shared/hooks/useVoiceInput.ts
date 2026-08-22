import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

import { api } from '../api/client';
import { stopSpeaking } from './useTts';

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

function pickRecorderMime(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type;
  }
  return 'audio/webm';
}

type Options = {
  language: string;
  token?: string | null;
};

export function useVoiceInput({ language, token }: Options) {
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const releaseWebMic = useCallback(() => {
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    stopSpeaking();

    if (Platform.OS === 'web') {
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('VOICE_UNSUPPORTED');
      }
      if (mediaRecorderRef.current?.state === 'recording') return;

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } catch {
        throw new Error('MIC_DENIED');
      }

      const mime = pickRecorderMime();
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType: mime });
      } catch {
        recorder = new MediaRecorder(stream);
      }
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recorder.start(200);
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
  }, []);

  const stop = useCallback(async (): Promise<string> => {
    if (Platform.OS === 'web') {
      const recorder = mediaRecorderRef.current;
      if (!recorder) return '';

      const blob = await new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }));
        };
        try {
          if (recorder.state === 'recording') recorder.stop();
          else resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }));
        } catch {
          resolve(new Blob(chunksRef.current, { type: 'audio/webm' }));
        }
      });

      releaseWebMic();
      setIsRecording(false);

      if (!blob.size || !token) return '';
      const audioBase64 = await blobToBase64(blob);
      const result = await api.transcribe(token, audioBase64, language);
      return (result.text ?? '').trim();
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
  }, [language, token, releaseWebMic]);

  const cancel = useCallback(async () => {
    if (Platform.OS === 'web') {
      try {
        if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      } catch {
        /* ignore */
      }
      chunksRef.current = [];
      releaseWebMic();
      setIsRecording(false);
      return;
    }
    const recording = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);
    if (recording) {
      await recording.stopAndUnloadAsync();
    }
  }, [releaseWebMic]);

  return { isRecording, start, stop, cancel };
}
