"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, saveSession } from "@/lib/api";
import { firebaseConfigured, getFirebaseAuth } from "@/lib/firebase";

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

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

function PhoneIcon() {
  return (
    <svg {...iconProps} className="h-5 w-5">
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.6 5.9c4.4-4.1 6.9-10.1 6.9-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
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

const cardClass =
  "mx-auto w-full max-w-md rounded-3xl border border-white bg-white/80 p-8 shadow-xl shadow-blue-100/60 backdrop-blur";

const primaryBtn =
  "mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-60";

const outlineBtn =
  "flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-800 transition hover:bg-gray-50 disabled:opacity-60";

function normalizePhone(raw: string) {
  const cleaned = raw.replace(/[\s()-]/g, "");
  return /^\+\d{8,15}$/.test(cleaned) ? cleaned : "";
}

function friendlyError(e: any) {
  switch (e?.code) {
    case "auth/invalid-phone-number":
      return "That phone number is not valid.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a while and try again.";
    case "auth/invalid-verification-code":
      return "Incorrect code. Please try again.";
    case "auth/code-expired":
      return "This code has expired. Request a new one.";
    case "auth/captcha-check-failed":
      return "Security check failed. Refresh the page and try again.";
    default:
      return e?.message || "Something went wrong. Please try again.";
  }
}

function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      // delete the digit in this box
      onChange(value.slice(0, i) + value.slice(i + 1));
      return;
    }
    const next = (value.slice(0, i) + digits + value.slice(i + 1)).slice(0, 6);
    onChange(next);
    refs.current[Math.min(i + digits.length, 5)]?.focus();
  };

  return (
    <div className="flex justify-between gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={value[i] || ""}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={6}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          className="h-14 w-12 rounded-xl border border-gray-300 bg-white text-center text-2xl font-semibold text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      ))}
    </div>
  );
}

function Form() {
  const searchParams = useSearchParams();
  const register = searchParams.get("mode") === "register";

  const [view, setView] = useState<"form" | "verify" | "phone">("form");
  const [f, setF] = useState({
    name: "",
    email: "",
    password: "",
    role: "volunteer",
  });
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  // email code
  const [verifyEmailAddr, setVerifyEmailAddr] = useState("");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // phone
  const [phone, setPhone] = useState("+91 ");
  const [phoneStep, setPhoneStep] = useState<"enter" | "code">("enter");
  const [phoneCode, setPhoneCode] = useState("");
  const confirmationRef = useRef<any>(null);
  const verifierRef = useRef<any>(null);

  // google
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleHandler = useRef<(cred: string) => void>(() => {});

  const set = (key: string) => (e: any) => {
    setF({ ...f, [key]: e.target.value });
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const finish = (result: any) => {
    saveSession(result);
    if (register && result?.user?.role === "volunteer") {
      location.href = "/explore";
    } else {
      location.href = "/dashboard";
    }
  };

  const goVerify = (email: string) => {
    setVerifyEmailAddr(email);
    setCode("");
    setCooldown(60);
    setErr("");
    setInfo("");
    setView("verify");
  };

  /* ---------- email + password ---------- */
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (register && !agree) {
      setErr("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setBusy(true);
    setErr("");

    try {
      if (register) {
        await api("/auth/register", { method: "POST", body: f });
        goVerify(f.email.trim().toLowerCase());
        setBusy(false);
      } else {
        const result = await api("/auth/login", {
          method: "POST",
          body: { email: f.email, password: f.password },
        });
        finish(result);
      }
    } catch (e: any) {
      if (e?.code === "EMAIL_NOT_VERIFIED" || e?.data?.needsVerification) {
        goVerify((e?.data?.email || f.email).trim().toLowerCase());
      } else {
        setErr(e.message || "Request failed");
      }
      setBusy(false);
    }
  };

  const verifyEmailCode = async () => {
    if (code.length !== 6) {
      setErr("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const result = await api("/auth/verify-email", {
        method: "POST",
        body: { email: verifyEmailAddr, code },
      });
      finish(result);
    } catch (e: any) {
      setErr(e.message || "Verification failed");
      setBusy(false);
    }
  };

  const resendEmailCode = async () => {
    if (cooldown > 0) return;
    setErr("");
    setInfo("");
    try {
      await api("/auth/resend-code", {
        method: "POST",
        body: { email: verifyEmailAddr },
      });
      setInfo("A new code has been sent.");
      setCooldown(60);
    } catch (e: any) {
      setErr(e.message || "Could not resend the code");
      if (e?.data?.wait) setCooldown(e.data.wait);
    }
  };

  /* ---------- google ---------- */
  googleHandler.current = async (credential: string) => {
    if (register && !agree) {
      setErr("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const result = await api("/auth/google", {
        method: "POST",
        body: { idToken: credential, role: f.role },
      });
      finish(result);
    } catch (e: any) {
      setErr(e.message || "Google sign-in failed");
      setBusy(false);
    }
  };

  useEffect(() => {
    if (view !== "form" || !GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    const init = () => {
      if (cancelled || !window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (r: any) => googleHandler.current(r.credential),
      });
      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: 384,
        text: "continue_with",
      });
    };

    if (window.google) {
      init();
      return () => {
        cancelled = true;
      };
    }

    let script = document.getElementById("gsi-script") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    const el = script;
    el.addEventListener("load", init);
    return () => {
      cancelled = true;
      el.removeEventListener("load", init);
    };
  }, [view]);

  /* ---------- phone ---------- */
  const resetVerifier = () => {
    try {
      verifierRef.current?.clear();
    } catch {}
    verifierRef.current = null;
  };

  const sendPhoneOtp = async () => {
    setErr("");
    setInfo("");
    const number = normalizePhone(phone);
    if (!number) {
      setErr("Enter your number with country code, e.g. +91 98765 43210");
      return;
    }
    if (register && f.name.trim().length < 2) {
      setErr("Please enter your name.");
      return;
    }
    if (register && !agree) {
      setErr("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setBusy(true);
    try {
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import("firebase/auth");
      const auth = getFirebaseAuth();
      if (!verifierRef.current) {
        verifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
        });
      }
      confirmationRef.current = await signInWithPhoneNumber(auth, number, verifierRef.current);
      setPhoneCode("");
      setPhoneStep("code");
      setCooldown(60);
      setInfo(`We sent a code to ${number}.`);
    } catch (e: any) {
      resetVerifier();
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const verifyPhoneOtp = async () => {
    if (phoneCode.length !== 6) {
      setErr("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const cred = await confirmationRef.current.confirm(phoneCode);
      const idToken = await cred.user.getIdToken();
      const result = await api("/auth/phone", {
        method: "POST",
        body: {
          idToken,
          ...(register ? { name: f.name.trim(), role: f.role } : {}),
        },
      });
      finish(result);
    } catch (e: any) {
      setErr(friendlyError(e));
      setBusy(false);
    }
  };

  const openPhone = () => {
    setErr("");
    setInfo("");
    setPhoneStep("enter");
    setView("phone");
  };

  const backToForm = () => {
    resetVerifier();
    setErr("");
    setInfo("");
    setView("form");
  };

  const showPhoneOption = firebaseConfigured;
  const showGoogle = !!GOOGLE_CLIENT_ID;

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

        {/* Right: card */}
        <section className="order-1 lg:order-2">
          {/* ===== VIEW: email verification ===== */}
          {view === "verify" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                verifyEmailCode();
              }}
              className={cardClass}
            >
              <h2 className="text-3xl font-bold text-gray-900">Verify your email</h2>
              <p className="mt-2 text-gray-600">
                We sent a 6-digit code to{" "}
                <span className="font-semibold text-gray-900">{verifyEmailAddr}</span>. Enter it
                below to continue.
              </p>

              <div className="mt-6">
                <OtpInput value={code} onChange={setCode} disabled={busy} />
              </div>

              {info && (
                <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{info}</p>
              )}
              {err && (
                <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>
              )}

              <button disabled={busy || code.length !== 6} className={primaryBtn}>
                {busy ? "Please wait..." : "Verify & continue"}
                {!busy && <ArrowIcon />}
              </button>

              <p className="mt-6 text-center text-sm text-gray-600">
                Did not get the code?{" "}
                {cooldown > 0 ? (
                  <span className="text-gray-500">Resend in {cooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={resendEmailCode}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    Resend code
                  </button>
                )}
              </p>
              <p className="mt-2 text-center text-sm text-gray-600">
                <button
                  type="button"
                  onClick={backToForm}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Use a different email
                </button>
              </p>
            </form>
          )}

          {/* ===== VIEW: phone ===== */}
          {view === "phone" && (
            <div className={cardClass}>
              <h2 className="text-3xl font-bold text-gray-900">
                {register ? "Sign up with phone" : "Log in with phone"}
              </h2>
              <p className="mt-2 text-gray-600">
                {phoneStep === "enter"
                  ? "We will text you a 6-digit code to confirm your number."
                  : "Enter the code we sent to your phone."}
              </p>

              {phoneStep === "enter" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendPhoneOtp();
                  }}
                  className="mt-6 space-y-4"
                >
                  {register && (
                    <>
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
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                          <GroupIcon />
                        </span>
                        <select className={inputClass} value={f.role} onChange={set("role")}>
                          <option value="volunteer">I want to volunteer</option>
                          <option value="ngo">I represent an NGO</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      <PhoneIcon />
                    </span>
                    <input
                      className={inputClass}
                      type="tel"
                      inputMode="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  {register && (
                    <label className="flex items-start gap-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={agree}
                        onChange={(e) => setAgree(e.target.checked)}
                        className="mt-0.5 h-5 w-5 rounded border-gray-300 text-blue-600"
                      />
                      <span>
                        I agree to the <span className="text-blue-600">Terms of Service</span> and{" "}
                        <span className="text-blue-600">Privacy Policy</span>.
                      </span>
                    </label>
                  )}

                  {err && (
                    <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>
                  )}

                  <button disabled={busy} className={primaryBtn}>
                    {busy ? "Sending..." : "Send OTP"}
                    {!busy && <ArrowIcon />}
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    verifyPhoneOtp();
                  }}
                  className="mt-6"
                >
                  <OtpInput value={phoneCode} onChange={setPhoneCode} disabled={busy} />

                  {info && (
                    <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{info}</p>
                  )}
                  {err && (
                    <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>
                  )}

                  <button disabled={busy || phoneCode.length !== 6} className={primaryBtn}>
                    {busy ? "Please wait..." : "Verify & continue"}
                    {!busy && <ArrowIcon />}
                  </button>

                  <p className="mt-6 text-center text-sm text-gray-600">
                    Did not get the code?{" "}
                    {cooldown > 0 ? (
                      <span className="text-gray-500">Resend in {cooldown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          resetVerifier();
                          sendPhoneOtp();
                        }}
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        Resend code
                      </button>
                    )}
                  </p>
                  <p className="mt-2 text-center text-sm text-gray-600">
                    <button
                      type="button"
                      onClick={() => {
                        resetVerifier();
                        setErr("");
                        setInfo("");
                        setPhoneStep("enter");
                      }}
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      Change number
                    </button>
                  </p>
                </form>
              )}

              <p className="mt-6 text-center text-sm text-gray-600">
                <button
                  type="button"
                  onClick={backToForm}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Back to email sign in
                </button>
              </p>
            </div>
          )}

          {/* ===== VIEW: email + password form ===== */}
          {view === "form" && (
            <form onSubmit={submit} className={cardClass}>
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
                    <select className={inputClass} value={f.role} onChange={set("role")}>
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
                      I agree to the <span className="text-blue-600">Terms of Service</span> and{" "}
                      <span className="text-blue-600">Privacy Policy</span>.
                    </span>
                  </label>
                )}
              </div>

              {err && (
                <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>
              )}

              <button disabled={busy} className={primaryBtn}>
                {busy ? "Please wait..." : register ? "Create account" : "Log in"}
                {!busy && <ArrowIcon />}
              </button>

              {true && (
                <>
                  <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400">
                    <span className="h-px flex-1 bg-gray-200" />
                    or
                    <span className="h-px flex-1 bg-gray-200" />
                  </div>

                  <div className="space-y-3">
                    <div className="relative h-10">
                      <div className={outlineBtn + " pointer-events-none !h-10 !py-0"}>
                        <GoogleIcon />
                        Continue with Google
                      </div>
                      {showGoogle ? (
                        <div className="absolute inset-0 overflow-hidden opacity-0">
                          <div ref={googleBtnRef} />
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-label="Continue with Google"
                          onClick={() => setErr("Google sign-in is not set up yet. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to client/.env.local and restart.")}
                          className="absolute inset-0"
                        />
                      )}
                    </div>
                    {showPhoneOption && (
                      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400">
                        <span className="h-px flex-1 bg-gray-200" />
                        or
                        <span className="h-px flex-1 bg-gray-200" />
                      </div>
                    )}
                    {showPhoneOption && (
                      <button type="button" onClick={openPhone} className={outlineBtn}>
                        <PhoneIcon />
                        Continue with phone number
                      </button>
                    )}
                  </div>
                </>
              )}

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
          )}

          {/* invisible reCAPTCHA anchor for phone OTP */}
          <div id="recaptcha-container" />
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