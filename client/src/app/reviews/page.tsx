"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, getUser } from "@/lib/api";
import { StarDisplay, StarPicker } from "@/components/Stars";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function PendingCard({ item, onDone }: { item: any; onDone: (id: string) => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!rating) {
      setError("Please choose a star rating.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/applications/${item.applicationId}/review`, {
        method: "POST",
        body: { rating, comment },
      });
      onDone(item.applicationId);
    } catch (err: any) {
      setError(err.message || "Could not submit review");
    } finally {
      setBusy(false);
    }
  }

  const toNgo = item.direction === "volunteer_to_ngo";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">
        {toNgo ? "How was your experience with" : "How was this volunteer at"}
      </p>
      <h3 className="text-lg font-bold text-gray-900">{item.target.name}</h3>
      <p className="text-sm text-gray-600">
        {item.opportunity.title}
        {item.opportunity.date ? " - " + formatDate(item.opportunity.date) : ""}
      </p>

      <div className="mt-3">
        <StarPicker value={rating} onChange={setRating} />
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="Add a comment (optional)"
        className="mt-3 w-full rounded-lg border border-gray-300 p-3 text-gray-900"
      />
      <p className="text-xs text-gray-500">{comment.length}/500</p>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? "Submitting..." : "Submit review"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <p className="mt-2 text-xs text-gray-500">Reviews can't be edited after you submit them.</p>
    </div>
  );
}

export default function ReviewsPage() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<any[]>([]);
  const [received, setReceived] = useState<any>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const current = getUser();
    setUser(current);

    if (!current || (current.role !== "volunteer" && current.role !== "ngo")) {
      setReady(true);
      return;
    }

    Promise.all([api("/reviews/pending"), api("/reviews/received")])
      .then(([p, r]) => {
        setPending(Array.isArray(p) ? p : []);
        setReceived(r);
      })
      .catch((err: any) => setError(err.message || "Could not load reviews"))
      .finally(() => setReady(true));
  }, []);

  function handleDone(applicationId: string) {
    setPending((items) => items.filter((i) => i.applicationId !== applicationId));
    setNotice("Thanks! Your review was submitted.");
  }

  if (!ready) {
    return <main className="mx-auto max-w-2xl px-4 py-16 text-center text-gray-500">Loading...</main>;
  }

  if (!user || (user.role !== "volunteer" && user.role !== "ngo")) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-gray-700">Log in as a volunteer or NGO to leave and view reviews.</p>
        <Link href="/login" className="mt-4 inline-block font-semibold text-blue-600">
          Log in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-gray-900">Reviews</h1>
      <p className="mt-1 text-gray-600">
        {user.role === "ngo"
          ? "Rate the volunteers who helped at your finished opportunities."
          : "Rate the NGOs whose opportunities you took part in."}
      </p>

      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">{notice}</p>}

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-bold text-gray-900">Waiting for your review</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nothing to review right now. Reviews open the day after an opportunity you took part in ends.
          </p>
        ) : (
          <div className="grid gap-4">
            {pending.map((item) => (
              <PendingCard key={item.applicationId} item={item} onDone={handleDone} />
            ))}
          </div>
        )}
      </section>

      {received && (
        <section className="mt-10">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">Reviews about you</h2>
            {received.count > 0 && (
              <span className="flex items-center gap-2 text-sm text-gray-700">
                <StarDisplay value={received.average} />
                <strong>{received.average.toFixed(1)}</strong>
                <span className="text-gray-500">({received.count})</span>
              </span>
            )}
          </div>

          {received.count === 0 ? (
            <p className="text-sm text-gray-500">No reviews yet.</p>
          ) : (
            <div className="grid gap-3">
              {received.reviews.map((r: any) => (
                <div key={r._id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StarDisplay value={r.rating} />
                      <span className="text-sm font-semibold text-gray-900">{r.reviewerName}</span>
                    </div>
                    <span className="text-xs text-gray-500">{formatDate(r.createdAt)}</span>
                  </div>
                  {r.opportunityTitle && <p className="mt-1 text-xs text-gray-500">For: {r.opportunityTitle}</p>}
                  {r.comment && (
                    <p className="mt-2 whitespace-pre-line break-words text-sm text-gray-700">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}