"use client";

import MessageOrganizerButton from "@/components/MessageOrganizerButton";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function OpportunityDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [opportunity, setOpportunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState("");

  useEffect(() => {
    if (!id) return;

    const loadOpportunity = async () => {
      try {
        setLoading(true);
        const data = await api(`/opportunities/${id}`);
        setOpportunity(data);
      } catch (err: any) {
        setError(err.message || "Unable to load opportunity");
      } finally {
        setLoading(false);
      }
    };

    loadOpportunity();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-gray-600">Loading opportunity...</p>
        </div>
      </main>
    );
  }

  if (error || !opportunity) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-12 text-center shadow-sm">
          <div className="text-5xl">😕</div>

          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Opportunity not found
          </h1>

          <p className="mt-2 text-gray-600">
            {error || "This volunteering opportunity may no longer exist."}
          </p>

          <Link
            href="/explore"
            className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            ← Back to Explore
          </Link>
        </div>
      </main>
    );
  }

  const formattedDate = opportunity.date
    ? new Date(opportunity.date).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Date not specified";

  const time =
    opportunity.startTime || opportunity.endTime
      ? `${opportunity.startTime || "—"} ${
          opportunity.endTime ? `- ${opportunity.endTime}` : ""
        }`
      : "Time not specified";

  const skills = opportunity.skills || [];

  const handleApply = async () => {
    setError("");
    setApplicationMessage("");

    const token = localStorage.getItem("voluntess_token");
    const savedUser = localStorage.getItem("voluntess_user");

    if (!token || !savedUser) {
      window.location.href = "/login";
      return;
    }

    try {
      const user = JSON.parse(savedUser);

      if (user?.role !== "volunteer") {
        setError("Only volunteers can apply for opportunities.");
        return;
      }

      setApplying(true);

      await api(`/opportunities/${id}/apply`, {
        method: "POST",
      });

      setApplicationMessage(
        "Application submitted successfully! 🎉"
      );
    } catch (err: any) {
      setError(err.message || "Unable to submit application.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">

        {/* Back */}
        <Link
          href="/explore"
          className="mb-6 inline-flex items-center text-sm font-semibold text-gray-600 hover:text-gray-900"
        >
          ← Back to Explore
        </Link>

        {/* Header */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white shadow-lg md:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur">
              🏷️ {opportunity.category}
            </span>

            <span className="rounded-full bg-green-400/20 px-4 py-1.5 text-sm font-semibold backdrop-blur">
              🟢 {opportunity.status || "Open"}
            </span>
          </div>

          <h1 className="mt-6 text-3xl font-bold md:text-5xl">
            {opportunity.title}
          </h1>

          <p className="mt-4 text-lg text-blue-100">
            Make a difference by volunteering for this opportunity.
          </p>
        </section>

        <div className="mt-6 grid gap-6 md:grid-cols-3">

          {/* Main Content */}
          <section className="md:col-span-2 space-y-6">

            {/* Description */}
            <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-bold text-gray-900">
                📝 About this opportunity
              </h2>

              <p className="mt-4 whitespace-pre-line leading-7 text-gray-600">
                {opportunity.description}
              </p>
            </div>

            {/* Opportunity Information */}
            <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
<h2 className="text-2xl font-bold text-gray-900">
                📋 Opportunity Details
              </h2>
<MessageOrganizerButton />
</div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">

                <div className="rounded-2xl bg-gray-50 p-5">
                  <p className="text-sm text-gray-400">📍 Location</p>
                  <p className="mt-2 font-semibold text-gray-900">
                    {opportunity.location}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-5">
                  <p className="text-sm text-gray-400">📅 Date</p>
                  <p className="mt-2 font-semibold text-gray-900">
                    {formattedDate}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-5">
                  <p className="text-sm text-gray-400">⏰ Time</p>
                  <p className="mt-2 font-semibold text-gray-900">
                    {time}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-5">
                  <p className="text-sm text-gray-400">👥 Volunteer Capacity</p>
                  <p className="mt-2 font-semibold text-gray-900">
                    {opportunity.capacity} volunteers
                  </p>
                </div>

              </div>
            </div>

            {/* Skills */}
            <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-bold text-gray-900">
                🛠️ Required Skills
              </h2>

              {skills.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  {skills.map((skill: string, index: number) => (
                    <span
                      key={`${skill}-${index}`}
                      className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-gray-500">
                  No specific skills required.
                </p>
              )}
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-6">

            {/* NGO */}
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">
                🏢 Organized by
              </h2>

              <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                <p className="font-semibold text-gray-900">
                  {opportunity.organizer?._id ? (<Link href={"/ngos/" + opportunity.organizer._id} className="hover:text-blue-600 hover:underline">{opportunity.organizer?.name || "NGO"}</Link>) : (opportunity.organizer?.name || "NGO")}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  NGO Organizer
                </p>
              </div>
            </div>

            {/* Apply Card */}
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">
                🤝 Ready to volunteer?
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Join this volunteering opportunity and make a positive
                difference in your community.
              </p>

              <button
                onClick={handleApply}
                disabled={applying || !!applicationMessage}
                className={`mt-6 w-full rounded-xl px-5 py-3 font-bold text-white transition ${
                  applicationMessage
                    ? "cursor-default bg-green-600"
                    : applying
                    ? "cursor-wait bg-blue-400"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {applicationMessage
                  ? "✅ Applied Successfully"
                  : applying
                  ? "⏳ Applying..."
                  : "🤝 Apply Now"}
              </button>

              {applicationMessage && (
                <p className="mt-3 text-center text-sm font-semibold text-green-600">
                  {applicationMessage}
                </p>
              )}

              {error && (
                <p className="mt-3 text-center text-sm font-semibold text-red-600">
                  {error}
                </p>
              )}
            </div>

            {/* Capacity */}
            <div className="rounded-3xl bg-blue-50 p-6">
              <p className="text-sm font-semibold text-blue-600">
                👥 Volunteer Capacity
              </p>

              <p className="mt-2 text-3xl font-bold text-blue-900">
                {opportunity.capacity}
              </p>

              <p className="mt-1 text-sm text-blue-700">
                volunteers needed
              </p>
            </div>

          </aside>
        </div>
      </div>
    </main>
  );
}