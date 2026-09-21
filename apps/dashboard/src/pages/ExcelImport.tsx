import { useState } from 'react';
import type { ExcelImportResult } from '@komorebi/shared-types';
import { templateDownloadUrl, uploadExcel } from '../api';

export default function ExcelImport() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ExcelImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await uploadExcel(file);
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>Import Excel (MVP content source)</h2>
      <p className="muted">
        Soạn kịch bản tuần trong file Excel mẫu rồi upload — bỏ qua bước gọi Claude API. Xem
        TICKET-003b.
      </p>

      <div className="card">
        <a className="button" href={templateDownloadUrl()}>
          ⬇ Tải mẫu Excel
        </a>
      </div>

      <div className="card">
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button className="button" disabled={!file || busy} onClick={handleUpload}>
          {busy ? 'Đang upload...' : 'Upload file tuần'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="card">
          <p>
            ✅ Thành công: <strong>{result.successCount}</strong> &nbsp;|&nbsp; ❌ Lỗi:{' '}
            <strong>{result.errorCount}</strong>
          </p>
          {result.errors.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th>Dòng</th>
                  <th>Lỗi</th>
                </tr>
              </thead>
              <tbody>
                {result.errors.map((e, i) => (
                  <tr key={i}>
                    <td>{e.row}</td>
                    <td>{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
