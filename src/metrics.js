export const formatBytes = n => n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(n < 10240 ? 2 : 1)} KB` : `${(n / (1024 * 1024)).toFixed(2)} MB`;
export function reportOutput(name, blob, items = []) {
  window.dispatchEvent(new CustomEvent('tool-output', { detail: { name, bytes: blob.size, items } }));
}
