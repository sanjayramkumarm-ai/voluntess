"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const FILE_BASE = API_URL.replace(/\/api\/?$/, "");

export function photoSrc(path?: string) {
  return path ? `${FILE_BASE}${path}` : "";
}

function clean(value: string | null) {
  return (value || "").replace(/^"|"$/g, "");
}

function findToken(): string {
  const stores = [localStorage, sessionStorage];
  const keys = ["token", "accessToken", "access_token", "jwt", "authToken", "voluntess_token"];

  for (const store of stores) {
    for (const key of keys) {
      const value = clean(store.getItem(key));
      if (value) return value;
    }
  }

  for (const store of stores) {
    try {
      const user = JSON.parse(store.getItem("user") || "null");
      if (user?.token) return user.token;
    } catch {}
  }

  for (const store of stores) {
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (!key) continue;
      const value = clean(store.getItem(key));
      if (/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(value)) return value;
    }
  }

  return "";
}

type ProfilePhotoProps = {
  name?: string;
  photo?: string;
  onUpdated: (newPath: string) => void;
};

export function ProfilePhoto({ name, photo, onUpdated }: ProfilePhotoProps) {
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setMessage("");
    if (!f) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setMessage("Please choose a JPEG, PNG or WebP image.");
      return;
    }
    if (f.size > 3 * 1024 * 1024) {
      setMessage("Image must be 3 MB or smaller.");
      return;
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setMessage("");

    try {
      const token = findToken();
      if (!token) {
        throw new Error("Login token not found. Please log out and log in again.");
      }

      const form = new FormData();
      form.append("photo", file);

      const res = await fetch(`${API_URL}/auth/profile-photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {}

      if (!data) {
        throw new Error(
          `Server returned an unexpected response (status ${res.status}). Check that the backend is running and POST /api/auth/profile-photo exists.`
        );
      }
      if (!res.ok) throw new Error(data.message || "Upload failed");

      onUpdated(data.profilePhoto);
      setFile(null);
      setPreview("");
      setMessage("Profile photo updated.");
    } catch (err: any) {
      setMessage(err.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const shown = preview || photoSrc(photo);
  const initial = (name || "V").charAt(0).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      {shown ? (
        <img
          src={shown}
          alt="Profile"
          className="h-24 w-24 rounded-full object-cover ring-2 ring-blue-100"
        />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-3xl font-bold text-white">
          {initial}
        </div>
      )}

      <div className="text-center sm:text-left">
        <label className="inline-block cursor-pointer rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50">
          Choose photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={choose}
            className="hidden"
          />
        </label>

        {file && (
          <button
            onClick={upload}
            disabled={busy}
            className="ml-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? "Uploading..." : "Save photo"}
          </button>
        )}

        <p className="mt-2 text-xs text-gray-500">
          JPEG, PNG or WebP, up to 3 MB.
        </p>
        {message && <p className="mt-1 text-sm text-gray-700">{message}</p>}
      </div>
    </div>
  );
}

export default ProfilePhoto;
