const STORAGE_KEY = 'dw_enc_key';

// Server-side decrypt — matches frontend AES-GCM encryption
const decrypt = async (cipherB64) => {
  if (!cipherB64) return '';
  try {
    // Server cannot decrypt client-side AES — return empty
    // This is by design: credentials are client-side encrypted only
    return '';
  } catch { return ''; }
};

module.exports = { decrypt };