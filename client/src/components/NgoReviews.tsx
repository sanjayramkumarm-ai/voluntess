"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { StarDisplay } from "./Stars";

export default function NgoReviews({ ngoId }: { ngoId: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!ngoId) return;
    api(`/ngos/${ngoId}/reviews`)
      .then(setData)
      .catch(() => setData({ average: 0, count: 0, reviews: [] }));
  }, [ngoId]);

  if (!data) return null;

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-gray-900">Reviews</h2>
        {data.count > 0 && (
          <span className="flex items-center gap-2 text-sm text-gray-700">
            <StarDisplay value={data.average} />
            <strong>{data.average.toFixed(1)}</strong>
            <span className="text-gray-500">({data.count})</span>
          </span>
        )}
      </div>

      {data.count === 0 ? (
        <p className="mt-2 text-sm text-gray-500">No reviews yet.</p>
      ) : (
        <div className="mt-3 grid gap-3">
          {data.reviews.map((r: any) => (
            <div key={r._id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StarDisplay value={r.rating} />
                  <span className="text-sm font-semibold text-gray-900">{r.reviewerName}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
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
  );
}