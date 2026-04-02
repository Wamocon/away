import { useState } from "react";

export default function UserSettings({
  email,
  onSave,
}: {
  email: string;
  onSave: (settings: { email: string }) => Promise<void>;
}) {
  const [userEmail, setUserEmail] = useState(email);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ email: userEmail });
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-900 border border-gray-800 shadow rounded-xl px-8 pt-6 pb-8 mb-4 w-full max-w-md flex flex-col gap-2"
    >
      <h2 className="text-2xl font-bold mb-4 text-gray-100">
        Benutzereinstellungen
      </h2>
      <label className="block mb-1 text-gray-300">E-Mail Postfach</label>
      <input
        type="email"
        value={userEmail}
        onChange={(e) => setUserEmail(e.target.value)}
        className="mb-2 w-full border border-gray-700 rounded-lg px-3 py-2 bg-gray-950 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
        required
      />
      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition"
      >
        Speichern
      </button>
      {success && (
        <div className="text-green-500 mt-2 text-sm">Gespeichert!</div>
      )}
    </form>
  );
}
