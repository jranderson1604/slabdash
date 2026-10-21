import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import api from '../api/client';

/**
 * ExportButton — triggers a CSV download from an API endpoint.
 * @param {string} endpoint  e.g. '/submissions/export.csv'
 * @param {string} label     Button label (optional)
 */
export default function ExportButton({ endpoint, label = 'Export CSV' }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const resp = await api.get(endpoint, { responseType: 'blob' });
      const disposition = resp.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : 'export.csv';

      const url = URL.createObjectURL(resp.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
      style={{
        background: 'rgba(44,36,22,0.06)',
        border: '1px solid rgba(44,36,22,0.1)',
        color: 'var(--text-secondary)',
      }}
      title="Download as CSV"
    >
      {loading
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : <Download className="w-4 h-4" />
      }
      {label}
    </button>
  );
}
