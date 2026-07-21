import { useState } from 'react';
import { X, ShieldCheck, Copy, Check, Download, KeyRound, Eye, Unlock } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

// ---- base64 <-> ArrayBuffer helpers ----
const bufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};
const base64ToBuffer = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

// Decrypts one ciphertext blob (produced by tracking.js's encryptIdentity)
// using the developer's private key. Everything happens in this browser —
// the private key is never sent anywhere.
async function decryptBlob(privateKey, blobJson) {
  const parsed = JSON.parse(blobJson);
  const rawAesKey = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, base64ToBuffer(parsed.k));
  const aesKey = await crypto.subtle.importKey('raw', rawAesKey, { name: 'AES-GCM' }, false, ['decrypt']);
  const plaintextBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuffer(parsed.iv) },
    aesKey,
    base64ToBuffer(parsed.d)
  );
  return JSON.parse(new TextDecoder().decode(plaintextBuf));
}

const PrivacyKeysModal = ({ project, onClose }) => {
  const [generating, setGenerating] = useState(false);
  const [privateKeyB64, setPrivateKeyB64] = useState('');
  const [hasPublicKey, setHasPublicKey] = useState(!!project?.visitorEncryptionPublicKey);
  const [copied, setCopied] = useState(false);

  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [decrypting, setDecrypting] = useState(false);
  const [decryptedRows, setDecryptedRows] = useState(null);
  const [decryptError, setDecryptError] = useState('');

  const handleGenerateKeys = async () => {
    if (hasPublicKey) {
      const confirmed = window.confirm(
        'This project already has encryption set up. Generating a new key pair means any ' +
        'identities encrypted with the OLD key can no longer be decrypted with the new private key. Continue?'
      );
      if (!confirmed) return;
    }

    setGenerating(true);
    try {
      const keyPair = await crypto.subtle.generateKey(
        { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
        true,
        ['encrypt', 'decrypt']
      );

      const publicKeyRaw = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const privateKeyRaw = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      const publicKeyB64 = bufferToBase64(publicKeyRaw);
      const privateKeyB64Local = bufferToBase64(privateKeyRaw);

      // Only the public key ever leaves this browser.
      await api.patch(`/projects/${project._id}/public-key`, { publicKey: publicKeyB64 });

      setPrivateKeyB64(privateKeyB64Local);
      setHasPublicKey(true);
      toast.success('Encryption keys generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate keys.');
    } finally {
      setGenerating(false);
    }
  };

  const copyPrivateKey = () => {
    navigator.clipboard.writeText(privateKeyB64);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPrivateKey = () => {
    const blob = new Blob([privateKeyB64], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}-deploywatch-private-key.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDecrypt = async () => {
    setDecryptError('');
    setDecryptedRows(null);
    if (!privateKeyInput.trim()) {
      setDecryptError('Paste your private key first.');
      return;
    }

    setDecrypting(true);
    try {
      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        base64ToBuffer(privateKeyInput.trim()),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['decrypt']
      );

      const { data } = await api.get(`/analytics/encrypted-views/${project._id}`);

      const rows = await Promise.all(
        data.views.map(async (v) => {
          if (v.encryptedVisitorData) {
            try {
              const { name, email } = await decryptBlob(privateKey, v.encryptedVisitorData);
              return { name, email, country: v.country, city: v.city, device: v.device, viewedAt: v.viewedAt };
            } catch {
              return { name: '(could not decrypt — wrong key?)', email: '', country: v.country, city: v.city, device: v.device, viewedAt: v.viewedAt };
            }
          }
          // Older views captured before encryption was set up — already plaintext.
          return { name: v.visitorName, email: v.visitorEmail, country: v.country, city: v.city, device: v.device, viewedAt: v.viewedAt };
        })
      );

      setDecryptedRows(rows);
    } catch (err) {
      setDecryptError('Could not decrypt — check that this is the correct private key for this project.');
    } finally {
      setDecrypting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sgm-box" style={{ maxWidth: '560px' }}>
        <div className="sgm-header">
          <div className="sgm-title-row">
            <ShieldCheck size={18} style={{ color: 'var(--accent)' }} />
            <div>
              <h2 className="sgm-title">Visitor Data Encryption</h2>
              <p className="sgm-subtitle">{project?.name}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="sgm-body">
          <div className="sgm-step-content">

            <div className="sgm-info-box">
              <div className="sgm-info-title">🔐 How this works</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem', lineHeight: 1.6 }}>
                A key pair is generated right here in your browser. Only the <strong>public key</strong> is sent to
                DeployWatch — visitors' names/emails get encrypted with it in their own browser before ever reaching
                our server. The <strong>private key</strong> needed to decrypt them is shown to you once, right now,
                and is never sent anywhere. Save it somewhere safe — if you lose it, that data can't be recovered by
                anyone, including us.
              </p>
            </div>

            <h3 className="sgm-step-title" style={{ marginTop: '1rem' }}>
              <KeyRound size={16} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
              1. Generate keys
            </h3>
            <p className="sgm-step-desc">
              {hasPublicKey
                ? 'This project already has encryption keys set up.'
                : 'This project has no encryption keys yet — visitor names/emails are currently stored as plaintext.'}
            </p>
            <button className="btn btn-primary btn-sm" onClick={handleGenerateKeys} disabled={generating}>
              {generating ? 'Generating…' : hasPublicKey ? 'Regenerate Keys' : 'Generate Keys'}
            </button>

            {privateKeyB64 && (
              <div className="sgm-code-block" style={{ marginTop: '0.75rem' }}>
                <div className="sgm-code-label">
                  ⚠️ Your private key — copy or download this NOW, it will not be shown again
                </div>
                <pre className="sgm-code mono" style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{privateKeyB64}</pre>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="btn btn-secondary btn-sm" onClick={copyPrivateKey}>
                    {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={downloadPrivateKey}>
                    <Download size={12} /> Download
                  </button>
                </div>
              </div>
            )}

            <h3 className="sgm-step-title" style={{ marginTop: '1.25rem' }}>
              <Unlock size={16} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
              2. Decrypt visitor data
            </h3>
            <p className="sgm-step-desc">
              Paste your private key to decrypt captured visitor names/emails — this also happens entirely in your
              browser; the key is never sent to DeployWatch.
            </p>
            <textarea
              className="input"
              rows={3}
              placeholder="Paste your private key here…"
              value={privateKeyInput}
              onChange={(e) => setPrivateKeyInput(e.target.value)}
              style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginBottom: '0.5rem' }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleDecrypt} disabled={decrypting}>
              <Eye size={12} /> {decrypting ? 'Decrypting…' : 'Decrypt Visitor Data'}
            </button>
            {decryptError && <p style={{ color: 'var(--red)', fontSize: '0.78rem', marginTop: '0.5rem' }}>{decryptError}</p>}

            {decryptedRows && (
              <div className="sgm-info-box" style={{ marginTop: '0.75rem', maxHeight: '260px', overflowY: 'auto' }}>
                {decryptedRows.length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No visitor identities captured yet.</p>
                )}
                {decryptedRows.map((r, i) => (
                  <div key={i} className="sgm-info-row" style={{ display: 'block', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{r.name || '(no name)'}</strong>
                    {r.email && <span style={{ color: 'var(--text-secondary)' }}> — {r.email}</span>}
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {r.city !== 'Unknown' ? r.city + ', ' : ''}{r.country} · {r.device} · {new Date(r.viewedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sgm-footer">
          <span />
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyKeysModal;