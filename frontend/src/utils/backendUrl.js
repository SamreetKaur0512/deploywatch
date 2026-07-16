export function getBackendUrl() {
  const candidates = [
    import.meta.env.VITE_API_URL,
    import.meta.env.VITE_SOCKET_URL,
    import.meta.env.VITE_BACKEND_URL,
  ].filter(Boolean);

  for (const raw of candidates) {
    const cleaned = raw.replace(/\/+$/, '').replace(/\/api$/, '');
    if (cleaned) return cleaned;
  }

  if (import.meta.env.PROD) {
    // In production we'd rather be loud than silently hand out a
    // localhost URL that will quietly break tracking on live sites.
    console.error(
      '[DeployWatch] No VITE_API_URL / VITE_SOCKET_URL set in this build — ' +
      'tracking scripts shown to users will point at localhost and will NOT work on their deployed projects.'
    );
  }

  return 'http://localhost:5000';
}