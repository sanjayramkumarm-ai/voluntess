"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, getUser, logout } from "@/lib/api";

export default function NgoDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState<string | null>(null);

  useEffect(() => {
    setUser(getUser());
    loadOpportunities();
  }, []);

  async function loadOpportunities() {
    try {
      setLoading(true);
      const data = await api("/opportunities/mine");
      setOpportunities(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setMessage(error.message || "Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  }

  async function deleteOpportunity(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this opportunity?"
    );

    if (!confirmed) return;

    try {
      setMessage("");

      await api(`/opportunities/${id}`, {
        method: "DELETE",
      });

      setOpportunities((current) =>
        current.filter((item) => item._id !== id)
      );

      if (selectedOpportunity?._id === id) {
        setSelectedOpportunity(null);
        setApplications([]);
      }

      setMessage("Opportunity deleted successfully.");
    } catch (error: any) {
      setMessage(error.message || "Failed to delete opportunity");
    }
  }

  async function viewApplications(opportunity: any) {
    try {
      setSelectedOpportunity(opportunity);
      setApplicationsLoading(true);
      setMessage("");

      const data = await api(
        `/opportunities/${opportunity._id}/applications`
      );

      setApplications(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setApplications([]);
      setMessage(error.message || "Failed to load applications");
    } finally {
      setApplicationsLoading(false);
    }
  }

  async function decideApplication(
    applicationId: string,
    status: "accepted" | "rejected"
  ) {
    try {
      setDecisionLoading(applicationId);
      setMessage("");

      const updated = await api(`/applications/${applicationId}`, {
        method: "PATCH",
        body: { status },
      });

      setApplications((current) =>
        current.map((application) =>
          application._id === applicationId
            ? { ...application, ...updated }
            : application
        )
      );

      setMessage(
        status === "accepted"
          ? "Volunteer accepted successfully! 🎉"
          : "Volunteer application rejected."
      );
    } catch (error: any) {
      setMessage(error.message || "Failed to update application");
    } finally {
      setDecisionLoading(null);
    }
  }

  async function acceptTeam(teamId: string) {
    if (!selectedOpportunity) return;
    if (!window.confirm("Accept every pending member of this team?")) return;

    try {
      setMessage("");
      await api(
        `/opportunities/${selectedOpportunity._id}/teams/${teamId}/accept`,
        { method: "POST" }
      );
      await viewApplications(selectedOpportunity);
      setMessage("Whole team accepted.");
    } catch (error: any) {
      setMessage(error.message || "Failed to accept team");
    }
  }

  function closeApplications() {
    setSelectedOpportunity(null);
    setApplications([]);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">
            NGO Dashboard
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Welcome{user?.name ? ", " + user.name : ""}! 👋
          </h1>

          <p className="mt-3 text-blue-100">
            Create opportunities and manage your volunteers.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {message && (
          <div className="mb-6 rounded-xl bg-blue-50 p-4 font-medium text-blue-700">
            {message}
          </div>
        )}

        {user && (
          <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Your public profile
              </h2>
              <p className="mt-1 text-gray-500">
                Add your logo and description so volunteers can learn about your NGO.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                href="/ngo/profile"
                className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Edit public profile
              </Link>

              <Link
                href={`/ngos/${user.id || user._id}`}
                className="rounded-lg bg-gray-100 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-200"
              >
                View public page
              </Link>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="text-3xl">➕</div>

            <h2 className="mt-4 text-xl font-bold text-gray-900">
              Create Opportunity
            </h2>

            <p className="mt-2 text-gray-500">
              Publish a new volunteering opportunity for volunteers.
            </p>

            <Link
              href="/ngo/create"
              className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Create Opportunity
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="text-3xl">📋</div>

            <h2 className="mt-4 text-xl font-bold text-gray-900">
              My Opportunities
            </h2>

            <p className="mt-2 text-gray-500">
              {opportunities.length} opportunity
              {opportunities.length !== 1 ? "ies" : ""} created by your NGO.
            </p>

            <button
              onClick={loadOpportunities}
              className="mt-5 rounded-lg bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-800"
            >
              Refresh
            </button>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="text-3xl">👥</div>

            <h2 className="mt-4 text-xl font-bold text-gray-900">
              Applications
            </h2>

            <p className="mt-2 text-gray-500">
              Review volunteers who apply to your opportunities.
            </p>

            <p className="mt-5 font-semibold text-blue-600">
              Select an opportunity below
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-8 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Your Opportunities
              </h2>

              <p className="mt-1 text-gray-500">
                Manage opportunities and review volunteer applications.
              </p>
            </div>

            <Link
              href="/ngo/create"
              className="rounded-lg bg-blue-600 px-5 py-3 text-center font-semibold text-white hover:bg-blue-700"
            >
              + New Opportunity
            </Link>
          </div>

          {loading ? (
            <div className="mt-8 rounded-xl bg-gray-50 p-8 text-center text-gray-500">
              Loading opportunities...
            </div>
          ) : opportunities.length === 0 ? (
            <div className="mt-8 rounded-xl bg-gray-50 p-8 text-center">
              <p className="font-semibold text-gray-700">
                No opportunities yet.
              </p>

              <p className="mt-2 text-gray-500">
                Create your first volunteering opportunity.
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {opportunities.map((opportunity) => (
                <div
                  key={opportunity._id}
                  className="rounded-xl border border-gray-200 p-5"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {opportunity.title}
                      </h3>

                      <p className="mt-2 text-gray-500">
                        {opportunity.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-sm">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                          📍 {opportunity.location}
                        </span>

                        <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">
                          📅{" "}
                          {opportunity.date
                            ? new Date(
                                opportunity.date
                              ).toLocaleDateString()
                            : "No date"}
                        </span>

                        <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">
                          👥 Capacity: {opportunity.capacity}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-3">
                      <Link
                        href={`/opportunities/${opportunity._id}`}
                        className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200"
                      >
                        View
                      </Link>

                      <button
                        onClick={() => viewApplications(opportunity)}
                        className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                      >
                        👥 Applicants
                      </button>

                      <button
                        onClick={() =>
                          deleteOpportunity(opportunity._id)
                        }
                        className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedOpportunity && (
          <div className="mt-8 rounded-2xl bg-white p-8 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                  Volunteer Applications
                </p>

                <h2 className="mt-1 text-2xl font-bold text-gray-900">
                  {selectedOpportunity.title}
                </h2>
              </div>

              <button
                onClick={closeApplications}
                className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200"
              >
                ✕ Close
              </button>
            </div>

            {applicationsLoading ? (
              <div className="mt-8 rounded-xl bg-gray-50 p-8 text-center text-gray-500">
                Loading applicants...
              </div>
            ) : applications.length === 0 ? (
              <div className="mt-8 rounded-xl bg-gray-50 p-8 text-center">
                <div className="text-4xl">📭</div>

                <p className="mt-3 font-semibold text-gray-700">
                  No applications yet
                </p>

                <p className="mt-2 text-gray-500">
                  Volunteers who apply will appear here.
                </p>
              </div>
            ) : (
              <div className="mt-8 space-y-4">
                {applications.map((application) => {
                  const applicant = application.volunteer;
                  const status = application.status || "pending";

                  return (
                    <div
                      key={application._id}
                      className="rounded-2xl border border-gray-200 p-5"
                    >
                      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-900">
                              👤 {applicant?.name || "Volunteer"}
                            </h3>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                                status === "accepted"
                                  ? "bg-green-100 text-green-700"
                                  : status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {status === "accepted"
                                ? "🟢 Accepted"
                                : status === "rejected"
                                ? "🔴 Rejected"
                                : "🟡 Pending"}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-gray-600">
                            📧 {applicant?.email || "No email"}
                          </p>

                          {applicant?.city && (
                            <p className="mt-1 text-sm text-gray-600">
                              📍 {applicant.city}
                            </p>
                          )}

                          {Array.isArray(applicant?.skills) &&
                            applicant.skills.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {applicant.skills.map(
                                  (skill: string, index: number) => (
                                    <span
                                      key={`${skill}-${index}`}
                                      className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                                    >
                                      {skill}
                                    </span>
                                  )
                                )}
                              </div>
                            )}

                          {application.team && status === "pending" && (
                            <div className="mt-3">
                              <button
                                onClick={() =>
                                  acceptTeam(
                                    String(application.team?._id || application.team)
                                  )
                                }
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                              >
                                Accept whole team
                              </button>
                            </div>
                          )}

                          {(status === "pending" || status === "accepted") && (
                            <div className="mt-3">
                              <a
                                href={`/messages?application=${application._id}`}
                                className="inline-block rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                              >
                                Message volunteer
                              </a>
                            </div>
                          )}

                          {application.message && (
                            <div className="mt-4 rounded-xl bg-gray-50 p-4">
                              <p className="text-xs font-semibold text-gray-400">
                                Volunteer message
                              </p>

                              <p className="mt-1 text-sm text-gray-700">
                                {application.message}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 gap-3">
                          <button
                            onClick={() =>
                              decideApplication(
                                application._id,
                                "accepted"
                              )
                            }
                            disabled={
                              decisionLoading === application._id ||
                              status === "accepted"
                            }
                            className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                          >
                            {decisionLoading === application._id
                              ? "Updating..."
                              : "✅ Accept"}
                          </button>

                          <button
                            onClick={() =>
                              decideApplication(
                                application._id,
                                "rejected"
                              )
                            }
                            disabled={
                              decisionLoading === application._id ||
                              status === "rejected"
                            }
                            className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                          >
                            {decisionLoading === application._id
                              ? "Updating..."
                              : "❌ Reject"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">
            NGO Account
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-5">
              <p className="text-sm text-gray-400">
                Organization / Name
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {user?.name || "NGO"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-5">
              <p className="text-sm text-gray-400">
                Account Type
              </p>

              <p className="mt-1 font-semibold capitalize text-gray-900">
                {user?.role || "NGO"}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="mt-6 rounded-lg border border-red-200 px-5 py-3 font-semibold text-red-600 hover:bg-red-50"
          >
            Log out
          </button>
        </div>
      </section>
    </main>
  );
}