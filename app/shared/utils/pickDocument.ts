import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

export type PickedDocument = {
  name: string;
  mimeType: string;
  size: number | null;
  base64: string;
};

const MAX_BYTES = 8 * 1024 * 1024;

const ACCEPT_TYPES = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/*',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/*',
];

function stripDataUrl(base64: string): string {
  const raw = (base64 || '').trim();
  if (raw.includes(',') && raw.toLowerCase().startsWith('data:')) {
    return raw.split(',', 1)[1] ?? raw;
  }
  return raw;
}

async function readUriAsBase64(uri: string): Promise<string> {
  // Expo SDK 57 File API
  try {
    const file = new File(uri);
    const b64 = await file.base64();
    return stripDataUrl(b64);
  } catch {
    // Fallback for environments where the new File API cannot open the picker URI
    const legacy = await import('expo-file-system/legacy');
    const b64 = await legacy.readAsStringAsync(uri, {
      encoding: legacy.EncodingType.Base64,
    });
    return stripDataUrl(b64);
  }
}

/**
 * Opens the system document picker and returns a base64 payload for the API.
 * Returns null if the user cancels.
 */
export async function pickIntakeDocument(): Promise<PickedDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ACCEPT_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
    // Web: prefer base64 on the asset when available
    ...(Platform.OS === 'web' ? { base64: true } : {}),
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const asset = result.assets[0];
  const name = asset.name || 'document';
  const mimeType = asset.mimeType || 'application/octet-stream';
  const size = typeof asset.size === 'number' ? asset.size : null;

  if (size != null && size > MAX_BYTES) {
    throw new Error('DOCUMENT_TOO_LARGE');
  }

  let base64 = '';
  if (typeof asset.base64 === 'string' && asset.base64.length > 0) {
    base64 = stripDataUrl(asset.base64);
  } else if (asset.uri) {
    base64 = await readUriAsBase64(asset.uri);
  }

  if (!base64) {
    throw new Error('DOCUMENT_READ_FAILED');
  }

  // Approximate size from base64 if picker did not report it
  const approxBytes = Math.floor((base64.length * 3) / 4);
  if (approxBytes > MAX_BYTES) {
    throw new Error('DOCUMENT_TOO_LARGE');
  }

  return { name, mimeType, size: size ?? approxBytes, base64 };
}
