"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export function EditProfile({
  user,
  onSaved,
}: {
  user: any;
  onSaved: (updated: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [city, setCity] = useState(user?.city || "");
  const [skills, setSkills] = useState(
    Array.isArray(user?.skills) ? user.skills.join(", ") : ""
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const inputClass =
    "w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError(false);

    try {
      const list = skills
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);

      const updated = await api("/auth/profile", {
        method: "PATCH",
        body: { name, city, skills: list },
      });

      onSaved(updated);
      setMessage("Profile saved.");
      setOpen(false);
    } catch (err: any) {
      setError(true);
      setMessage(err.message || "Could not save profile");
    } finally {
      setBusy(false);
    }
  }

  const savedSkills: string[] = Array.isArray(user?.skills) ? user.skills : [];

  return (
    <div className="mt-6 rounded-xl bg-gray-50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">City</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {user?.city || "Not added yet"}
          </p>

          <p className="mt-4 text-sm text-gray-500">Skills</p>
          {savedSkills.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {savedSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-gray-700">No skills added yet</p>
          )}
        </div>

        {!open && (
          <button
            onClick={() => {
              setName(user?.name || "");
              setCity(user?.city || "");
              setSkills(savedSkills.join(", "));
              setMessage("");
              setOpen(true);
            }}
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-100"
          >
            Edit profile
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={save} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              City
            </label>
            <input
              className={inputClass}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Chennai"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Skills (separate with commas)
            </label>
            <input
              className={inputClass}
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. Teaching, First aid, Photography"
            />
          </div>

          <div className="flex gap-3">
            <button
              disabled={busy}
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {message && (
        <p className={`mt-3 text-sm ${error ? "text-red-600" : "text-green-700"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export default EditProfile;
