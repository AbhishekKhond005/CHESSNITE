import { useEffect, useRef, useState, useCallback } from 'react';
let key = '';
export async function request(path, body) {
  const response = await fetch(`/api/${path}`, body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Chessnite-Key': key }, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The local service could not complete the request.');
  return data;
}
export function useWorkspace() {
  const [data, setData] = useState(null), [status, setStatus] = useState('Loading'), [error, setError] = useState('');
  const current = useRef(null), pending = useRef(null), revision = useRef(0), saving = useRef(false), timer = useRef(null);
  const save = useCallback(async () => {
    if (saving.current || !pending.current) return;
    saving.current = true;
    setStatus('Saving');
    try {
      while (pending.current) {
        const snapshot = pending.current;
        const result = await request('state', { state: snapshot, revision: revision.current });
        revision.current = result.revision;
        if (pending.current === snapshot) pending.current = null;
      }
      setStatus('Saved on this device'); setError('');
    } catch (err) { setError(err.message); setStatus('Not saved'); }
    finally { saving.current = false; }
  }, []);
  useEffect(() => {
    request('state').then(result => { key = result.key; revision.current = result.revision; current.current = result.state; setData(result.state); setStatus('Saved on this device'); }).catch(err => setError(err.message));
    const unload = event => { if (pending.current || saving.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', unload);
    return () => { clearTimeout(timer.current); window.removeEventListener('beforeunload', unload); };
  }, []);
  const change = useCallback(updater => {
    const next = updater(structuredClone(current.current));
    current.current = next; pending.current = next; setData(next); setStatus('Saving');
    clearTimeout(timer.current); timer.current = setTimeout(save, 250);
  }, [save]);
  return { data, change, status, error, retry: save };
}
export function downloadJSON(name, value) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
