"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function extractToken(text: string) {
  const m = text.match(/checkin\/([A-Za-z0-9_-]{32})/);
  if (m) return m[1];
  const t = text.trim();
  return /^[A-Za-z0-9_-]{32}$/.test(t) ? t : "";
}

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [manual, setManual] = useState("");

  function stop() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRunning(false);
  }

  useEffect(() => stop, []);

  async function start(deviceId?: string) {
    setError("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("The camera needs a secure (HTTPS) connection. Scan the QR code with your phone's own camera app instead, or paste the link below.");
      return;
    }
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) {
      setError("This browser can't read QR codes inside the page. Scan the QR code with your phone's camera app instead, or paste the link below.");
      return;
    }
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setRunning(true);
      setCams((await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput"));

      const detector = new Detector({ formats: ["qr_code"] });
      timerRef.current = window.setInterval(async () => {
        try {
          const codes = await detector.detect(video);
          if (codes.length) {
            const t = extractToken(codes[0].rawValue || "");
            if (t) {
              stop();
              router.push(`/checkin/${t}`);
            } else {
              setError("That QR code isn't a Voluntess check-in code.");
            }
          }
        } catch {}
      }, 350);
    } catch (err: any) {
      stop();
      if (err?.name === "NotAllowedError") setError("Camera access was denied. Allow the camera in your browser's site settings, or scan the QR code with your phone's camera app.");
      else if (err?.name === "NotFoundError") setError("No camera was found on this device. Paste the check-in link below instead.");
      else setError("The camera couldn't start. Close other apps using it and try again.");
    }
  }

  function go(e: React.FormEvent) {
    e.preventDefault();
    const t = extractToken(manual);
    if (!t) return setError("That isn't a valid check-in link or code.");
    router.push(`/checkin/${t}`);
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-3xl font-extrabold text-gray-900">Scan to check in</h1>
      <p className="mt-1 text-gray-600">Point your camera at the event's QR code. The camera only starts when you tap the button.</p>

      <div className="mt-6 overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} playsInline muted className={running ? "aspect-square w-full object-cover" : "hidden"} />
        {!running && <div className="flex aspect-square items-center justify-center p-6 text-center text-gray-300">Camera is off</div>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!running ? (
          <button onClick={() => start()} className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">Open camera</button>
        ) : (
          <button onClick={stop} className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700">Stop camera</button>
        )}
        {running && cams.length > 1 && (
          <select aria-label="Choose camera" onChange={(e) => start(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900">
            {cams.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${i + 1}`}</option>)}
          </select>
        )}
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={go} className="mt-8">
        <label className="block text-sm font-semibold text-gray-700">Or paste the check-in link</label>
        <div className="mt-1 flex gap-2">
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Paste link or code" className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-3 text-gray-900" />
          <button className="rounded-lg bg-gray-900 px-4 py-3 font-semibold text-white">Go</button>
        </div>
      </form>

      <p className="mt-6 text-center text-sm"><Link href="/attendance" className="font-semibold text-blue-600 hover:underline">My attendance</Link></p>
    </main>
  );
}