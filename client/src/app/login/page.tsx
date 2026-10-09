"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, saveSession } from "@/lib/api";

function Form() {
  const searchParams = useSearchParams();
  const register = searchParams.get("mode") === "register";

  const [f, setF] = useState({
    name: "",
    email: "",
    password: "",
    role: "volunteer"
  });

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");

    try {
      const result = await api(
        register ? "/auth/register" : "/auth/login",
        {
          method: "POST",
          body: f
        }
      );

      saveSession(result);

      if (register && f.role === "volunteer") {
        location.href = "/explore";
      } else {
        location.href = "/dashboard";
      }
    } catch (e: any) {
      setErr(e.message || "Request failed");
      setBusy(false);
    }
  };

  const set = (key: string) => (e: any) => {
    setF({
      ...f,
      [key]: e.target.value
    });
  };

  return (
    <form
      onSubmit={submit}
      className="card mx-auto flex max-w-sm flex-col gap-3"
    >
      <h1 className="text-xl font-bold">
        {register ? "Create your account" : "Welcome back"}
      </h1>

      {register && (
        <input
          className="input"
          placeholder="Full or organization name"
          value={f.name}
          onChange={set("name")}
          required
        />
      )}

      <input
        className="input"
        type="email"
        placeholder="Email"
        value={f.email}
        onChange={set("email")}
        required
      />

      <input
        className="input"
        type="password"
        placeholder="Password (8+ characters)"
        value={f.password}
        onChange={set("password")}
        required
      />

      {register && (
        <select
          className="input"
          value={f.role}
          onChange={set("role")}
        >
          <option value="volunteer">
            I want to volunteer
          </option>

          <option value="ngo">
            I represent an NGO
          </option>
        </select>
      )}

      {err && (
        <p className="text-sm text-red-600">
          {err}
        </p>
      )}

      <button
        className="btn"
        disabled={busy}
      >
        {busy
          ? "Please wait..."
          : register
          ? "Create account"
          : "Log in"}
      </button>

      <a
        className="text-center text-sm text-brand-600"
        href={register ? "/login" : "/login?mode=register"}
      >
        {register
          ? "Have an account? Log in"
          : "New here? Join free"}
      </a>
    </form>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <Form />
    </Suspense>
  );
}
