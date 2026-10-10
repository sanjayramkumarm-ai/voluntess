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
  const [name, setName] = useState(user?.name || "");
  const [city, setCity] = useState(user?.city || "");
  const [skills, setSkills] = useState(
    Array.isArray(user?.skills) ? user.skills.join(", ") : ""
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError(false);

    try {
      const skillList = skills
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);

      const updated = await api("/auth/me", {
        method: "PATCH",
        body: { name, city, skills: skillList },
      });

      const merged = { ...user, ...updated };
      localStorage.setItem("voluntess_user", JSON.stringify(merged));
      window.dispatchEvent(new Event("voluntess-user-updated"));
      onSaved(merged);
      setMessage("Profile saved.");
    } catch (err: any) {
      setError(true);
      setMessage(err.message || "Could not save profile");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <form onSubmit={save} className="mt-6 rounded-xl bg-gray-50 p-5">
      <h3 className="text-lg font-bold text-gray-900">Edit profile</h3>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block text-sm text-gray-600">
          Name
          <input
            className={`${inputClass} mt-1`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            required
          />
        </label>

        <label className="block text-sm text-gray-600">
          City
          <input
            className={`${inputClass} mt-1`}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Chennai"
          />
        </label>

        <label className="block text-sm text-gray-600 md:col-span-2">
          Skills (separate with commas)
          <input
            className={`${inputClass} mt-1`}
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="Teaching, First aid, Photography"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <button
          disabled={busy}
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? "Saving..." : "Save profile"}
        </button>
        {message && (
          <p className={`text-sm ${error ? "text-red-600" : "text-green-600"}`}>
            {message}
          </p>
        )}
      </div>
    </form>
  );
}

export default EditProfile;
