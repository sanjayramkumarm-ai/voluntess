"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, saveSession } from "@/lib/api";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function UserIcon() {
  return (
    <svg {...iconProps} className="h-5 w-5">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg {...iconProps} className="h-5 w-5">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg {...iconProps} className="h-5 w-5">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg {...iconProps} className="h-5 w-5">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 21c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15.5c2.5.6 4 2.2 4 5" />
    </svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg {...iconProps} className="h-5 w-5">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg {...iconProps} className="h-5 w-5">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg {...iconProps} className="h-7 w-7">
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
      <path d="M8.5 12l2.5 2.5L16 9.5" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg {...iconProps} className="h-7 w-7">
      <path d="M5 20V12M12 20V5M19 20V9" />
    </svg>
  );
}

function CommunityIcon() {
  return (
    <svg {...iconProps} className="h-7 w-7">
      <circle cx="12" cy="8" r="3" />
      <circle cx="5" cy="10" r="2.2" />
      <circle cx="19" cy="10" r="2.2" />
      <path d="M6.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5M1.5 19c0-2 1.5-3.5 3.5-3.7M22.5 19c0-2-1.5-3.5-3.5-3.7" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-gray-900 placeholder-gray-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function Form() {
  const searchParams = useSearchParams();
  const register = searchParams.get("mode") === "register";

  const [f, setF] = useState({
    name: "",
    email: "",
    password: "",
    role: "volunteer",
  });
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);


  const set = (key: string) => (e: any) => {
    setF({ ...f, [key]: e.target.value });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (register && !agree) {
      setErr("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setBusy(true);
    setErr("");

    try {
      const result = await api(register ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: f,
      });

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

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-2 xl:py-16">
        {/* Left: headline */}
        <section className="order-2 lg:order-1">
          <p className="inline-block rounded-full border border-gray-200 bg-white/70 px-4 py-2 text-sm text-gray-600">
            People &middot; Communities &middot; A Better Tomorrow
          </p>

          <h1 className="mt-8 text-5xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-6xl">
            Make your
            <span className="block text-blue-600">time matter.</span>
          </h1>

          <p className="mt-6 max-w-md text-lg text-gray-600">
            Find meaningful volunteer opportunities, connect with communities
            and create real change &mdash; together.
          </p>

          <p className="mt-8 text-sm font-medium text-gray-500">
            Join a community creating real change.
          </p>
        </section>

        {/* Right: form card */}
        <section className="order-1 lg:order-2">
          <form
            onSubmit={submit}
            className="mx-auto w-full max-w-md rounded-3xl border border-white bg-white/80 p-8 shadow-xl shadow-blue-100/60 backdrop-blur"
          >
            <h2 className="text-3xl font-bold text-gray-900">
              {register ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-2 text-gray-600">
              {register
                ? "Join thousands of changemakers and start your volunteering journey today."
                : "Log in to continue your volunteering journey."}
            </p>

            <div className="mt-6 space-y-4">
              {register && (
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <UserIcon />
                  </span>
                  <input
                    className={inputClass}
                    placeholder="Full name or organization name"
                    value={f.name}
                    onChange={set("name")}
                    required
                  />
                </div>
              )}

              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <MailIcon />
                </span>
                <input
                  className={inputClass}
                  type="email"
                  placeholder="Email address"
                  value={f.email}
                  onChange={set("email")}
                  required
                />
              </div>

              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <LockIcon />
                </span>
                <input
                  className={`${inputClass} !pr-12`}
                  type={showPassword ? "text" : "password"}
                  placeholder={register ? "Password (8+ characters)" : "Password"}
                  value={f.password}
                  onChange={set("password")}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>

              {register && (
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <GroupIcon />
                  </span>
                  <select
                    className={inputClass}
                    value={f.role}
                    onChange={set("role")}
                  >
                    <option value="volunteer">I want to volunteer</option>
                    <option value="ngo">I represent an NGO</option>
                  </select>
                </div>
              )}

              {register && (
                <label className="flex items-start gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="mt-0.5 h-5 w-5 rounded border-gray-300 text-blue-600"
                  />
                  <span>
                    I agree to the{" "}
                    <span className="text-blue-600">Terms of Service</span> and{" "}
                    <span className="text-blue-600">Privacy Policy</span>.
                  </span>
                </label>
              )}
            </div>

            {err && (
              <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {err}
              </p>
            )}

            <button
              disabled={busy}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-60"
            >
              {busy
                ? "Please wait..."
                : register
                  ? "Create account"
                  : "Log in"}
              {!busy && <ArrowIcon />}
            </button>

            <p className="mt-6 text-center text-sm text-gray-600">
              {register ? "Have an account? " : "New here? "}
              <a
                className="font-semibold text-blue-600 hover:underline"
                href={register ? "/login" : "/login?mode=register"}
              >
                {register ? "Log in" : "Join free"}
              </a>
            </p>
          </form>
        </section>
      </div>

      {/* Bottom feature strip */}
      <section className="border-t border-gray-100 bg-white/60">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 md:grid-cols-3">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <ShieldIcon />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Verified opportunities</h3>
              <p className="text-sm text-gray-600">
                Explore genuine and verified volunteer opportunities.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <ChartIcon />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Track your impact</h3>
              <p className="text-sm text-gray-600">
                See your contributions and measure the difference you make.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <CommunityIcon />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Trusted communities</h3>
              <p className="text-sm text-gray-600">
                Join a safe and supportive community of changemakers.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<p className="p-8">Loading...</p>}>
      <Form />
    </Suspense>
  );
}
