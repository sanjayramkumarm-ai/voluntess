"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ExplorePage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selectedCategory = params.get("category") || "";

    setCategory(selectedCategory);

    const query = selectedCategory
      ? `/opportunities?category=${encodeURIComponent(selectedCategory)}`
      : "/opportunities";

    api(query)
      .then((data) => {
        setOpportunities(data.items || []);
      })
      .catch((err) => {
        setError(err.message || "Unable to load opportunities");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const title = category
    ? `${category} Opportunities`
    : "Explore Volunteer Opportunities";

  const description = category
    ? `Find meaningful ${category.toLowerCase()} opportunities and make an impact.`
    : "Find meaningful opportunities, connect with NGOs, and make a difference in your community.";

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/"
            className="mb-5 inline-block text-sm font-medium text-blue-100 hover:text-white"
          >
            ← Back to Home
          </Link>

          <p className="mb-3 text-sm font-semibold uppercase tracking-wider">
            {category ? `🌱 ${category}` : "Make an impact"}
          </p>

          <h1 className="text-4xl font-bold md:text-5xl">
            {title}
          </h1>

          <p className="mt-4 max-w-2xl text-blue-100">
            {description}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {loading && (
          <div className="rounded-xl bg-white p-8 text-center shadow">
            Loading opportunities...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && opportunities.length === 0 && (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <div className="text-5xl">🌱</div>

            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              No opportunities yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-gray-500">
              {category
                ? `There are no ${category.toLowerCase()} opportunities available right now.`
                : "New volunteering opportunities will appear here when NGOs publish them."}
            </p>

            <Link
              href="/explore"
              className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              View All Opportunities
            </Link>
          </div>
        )}

        {!loading && !error && opportunities.length > 0 && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {opportunities.length}{" "}
                {opportunities.length === 1
                  ? "opportunity"
                  : "opportunities"}{" "}
                found
              </p>

              {category && (
                <Link
                  href="/explore"
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  View all →
                </Link>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {opportunities.map((item) => (
                <article
                  key={item._id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="h-2 bg-blue-600" />

                  <div className="p-6">
                    <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {item.category}
                    </span>

                    <h2 className="mt-4 text-xl font-bold text-gray-900">
                      {item.title}
                    </h2>

                    <p className="mt-3 line-clamp-3 text-sm text-gray-600">
                      {item.description}
                    </p>

                    <div className="mt-5 space-y-2 text-sm text-gray-600">
                      <p>📍 {item.location}</p>

                      <p>
                        📅{" "}
                        {item.date
                          ? new Date(item.date).toLocaleDateString()
                          : "Date not specified"}
                      </p>

                      {item.startTime && (
                        <p>⏰ {item.startTime}</p>
                      )}
                    </div>

                    <Link
                      href={`/opportunities/${item._id}`}
                      className="mt-6 block rounded-lg bg-blue-600 px-4 py-3 text-center font-semibold text-white hover:bg-blue-700"
                    >
                      View Opportunity
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}