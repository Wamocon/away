import { useState } from 'react';
import { uploadTemplate } from '@/lib/template';

export default function TemplateUpload({ organizationId }: { organizationId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
    setSuccess(false);
    setError(null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setSuccess(false);
    try {
      await uploadTemplate(organizationId, file);
      setSuccess(true);
      setFile(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <form onSubmit={handleUpload} className="bg-gray-900 border border-gray-800 shadow rounded-xl px-8 pt-6 pb-8 mb-4 w-full max-w-md flex flex-col gap-2">
      <h2 className="text-2xl font-bold mb-4 text-gray-100">Excel-Vorlage hochladen</h2>
      <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="mb-2 w-full border border-gray-700 rounded-lg px-3 py-2 bg-gray-950 text-gray-100 file:bg-gray-800 file:text-gray-200 file:border-0 file:rounded file:px-3 file:py-2 focus:outline-none focus:ring-2 focus:ring-blue-600" required />
      {error && <div className="text-red-500 mb-2 text-sm">{error}</div>}
      {success && <div className="text-green-500 mb-2 text-sm">Upload erfolgreich!</div>}
      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition" disabled={!file}>Hochladen</button>
    </form>
  );
}
