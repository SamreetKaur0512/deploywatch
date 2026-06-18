// Client-side AES-GCM encryption using Web Crypto API
// The server NEVER sees plain text — only encrypted blobs

const STORAGE_KEY = 'dw_enc_key';

// Generate or retrieve encryption key (stored in localStorage per user)
const getKey = async () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
    return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }
  // Generate new key
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const exported = await crypto.subtle.exportKey('raw', key);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
  localStorage.setItem(STORAGE_KEY, b64);
  return key;
};

// Encrypt a string → base64 ciphertext
export const encrypt = async (plainText) => {
  if (!plainText) return '';
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  // Combine iv + ciphertext → base64
  const combined = new Uint8Array(iv.byteLength + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
};

// Decrypt base64 ciphertext → plain string
export const decrypt = async (cipherB64) => {
  if (!cipherB64) return '';
  try {
    const key = await getKey();
    const combined = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const cipher = combined.slice(12);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    return new TextDecoder().decode(plain);
  } catch {
    return ''; // decryption failed (wrong key or corrupted)
  }
};

// Check if a string looks like a MongoDB URI
export const isValidMongoUri = (uri) => {
  return uri && (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'));
};
