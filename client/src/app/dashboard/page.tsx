"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getUser, logout } from "@/lib/api";
import { ProfilePhoto } from "@/components/ProfilePhoto";

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [applicationError, setApplicationError] = useState("");

  useEffect(() => {
    const currentUser = getUser();

    if (!currentUser) {
      router.replace("/login");
      return;
    }

    setUser(currentUser);

    if (currentUser.role === "ngo") {
      router.replace("/ngo");
      return;
    }

    if (currentUser.role === "admin") {
      router.replace("/admin");
      return;
    }

    // Fetch fresh user data from the server (email, profile photo)
    api("/auth/me")
      .then((freshUser) => {
        const merged = { ...currentUser, ...freshUser };
        setUser(merged);
        localStorage.setItem("voluntess_user", JSON.stringify(merged));
      })
      .catch(() => {
        // Keep the localStorage user if /auth/me fails
      });

    loadApplications(false);

    const interval = setInterval(() => {
      loadApplications(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [router]);

  async function loadApplications(silent = false) {
    try {
      if (!silent) setApplicationsLoading(true);
      setApplicationError("");

      const data = await api("/applications/mine");

      setApplications(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setApplicationError(error.message || "Failed to load applications");
    } finally {
      setApplicationsLoading(false);
    }
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading dashboard...</p>
      </main>
    );
  }

  if (user.role === "ngo" || user.role === "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Opening your dashboard...</p>
      </main>
    );
  }

  const pendingCount = applications.filter(
    (item) => item.status === "pending"
  ).length;

  const acceptedCount = applications.filter(
    (item) => item.status === "accepted"
  ).length;

  const rejectedCount = applications.filter(
    (item) => item.status === "rejected"
  ).length;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <section className="mb-10 bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-12 text-white">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide">
            VOLUNTESS VOLUNTEER DASHBOARD
          </p>

          <h1 className="text-4xl font-bold">
            Welcome, {user.name || "Volunteer"}!
          </h1>

          <p className="mt-3 text-lg text-blue-100">
            Manage your volunteering activities and discover new opportunities.
          </p>
        </section>

        {/* Dashboard Cards */}
        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">
              Explore Opportunities
            </h2>

            <p className="mt-3 text-gray-600">
              Find volunteering opportunities that match your interests.
            </p>

            <Link
              href="/explore"
              className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Explore Opportunities
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">
              My Applications
            </h2>

            <p className="mt-3 text-gray-600">
              Track your volunteering applications and their status.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-yellow-50 p-3">
                <p className="text-xl font-bold text-yellow-600">
                  {pendingCount}
                </p>
                <p className="text-xs text-yellow-700">Pending</p>
              </div>

              <div className="rounded-xl bg-green-50 p-3">
                <p className="text-xl font-bold text-green-600">
                  {acceptedCount}
                </p>
                <p className="text-xs text-green-700">Accepted</p>
              </div>

              <div className="rounded-xl bg-red-50 p-3">
                <p className="text-xl font-bold text-red-600">
                  {rejectedCount}
                </p>
                <p className="text-xs text-red-700">Rejected</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">My Impact</h2>

            <p className="mt-3 text-gray-600">
              Track your volunteer hours, achievements, and certificates.
            </p>

            <Link
              href="/quests"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              Open Voluntess Quest
            </Link>
          </div>
        </section>

        {/* Applications */}
        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                My Applications
              </h2>
              <p className="mt-1 text-gray-500">
                Track the status of your volunteering applications.
              </p>
            </div>
            <button
              onClick={() => loadApplications(false)}
              className="rounded-lg bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-800"
            >
              Refresh status
            </button>
          </div>

          {applicationsLoading ? (
            <div className="mt-8 rounded-xl bg-gray-50 p-8 text-center text-gray-500">
              Loading your applications...
            </div>
          ) : applicationError ? (
            <div className="mt-8 rounded-xl bg-red-50 p-6 text-center text-red-600">
              {applicationError}
            </div>
          ) : applications.length === 0 ? (
            <div className="mt-8 rounded-xl bg-gray-50 p-10 text-center">
              <h3 className="text-xl font-bold text-gray-800">
                No applications yet
              </h3>
              <p className="mt-2 text-gray-500">
                Explore opportunities and apply for your first volunteering
                activity.
              </p>
              <Link
                href="/explore"
                className="mt-5 inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Explore Opportunities
              </Link>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {applications.map((application) => {
                const opportunity = application.opportunity;
                const status = application.status || "pending";

                const statusLabel =
                  status === "accepted"
                    ? "Approved"
                    : status === "rejected"
                      ? "Not accepted"
                      : "Pending review";

                const statusClass =
                  status === "accepted"
                    ? "bg-green-100 text-green-700"
                    : status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700";

                const messageClass =
                  status === "accepted"
                    ? "bg-green-50 text-green-800"
                    : status === "rejected"
                      ? "bg-red-50 text-red-800"
                      : "bg-amber-50 text-amber-800";

                return (
                  <article
                    key={application._id}
                    className="rounded-2xl border border-gray-200 p-5 sm:p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl font-bold text-gray-900">
                          {opportunity?.title ||
                            "Opportunity no longer available"}
                        </h3>

                        {!opportunity && (
                          <p className="mt-2 text-sm text-gray-500">
                            This opportunity has been removed by the NGO. Your
                            application record is kept for your history.
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                          {opportunity?.location && (
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                              Location: {opportunity.location}
                            </span>
                          )}

                          {opportunity?.date && (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                              {new Date(opportunity.date).toLocaleDateString()}
                            </span>
                          )}

                          {opportunity?.startTime && (
                            <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">
                              Time: {opportunity.startTime}
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className={`inline-flex shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className={`mt-5 rounded-xl p-4 ${messageClass}`}>
                      {status === "accepted"
                        ? "Your participation has been approved. Thank you for volunteering!"
                        : status === "rejected"
                          ? "This application was not accepted. You can explore other opportunities."
                          : "Your application is awaiting the NGO's decision."}
                    </div>

                    {opportunity?._id && (
                      <div className="mt-4">
                        <Link
                          href={`/opportunities/${opportunity._id}`}
                          className="inline-flex rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          View opportunity
                        </Link>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Account */}
        <section className="mt-8 rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Account</h2>

          <div className="mt-6">
            <ProfilePhoto
              name={user.name}
              photo={user.profilePhoto}
              onUpdated={(path) => {
                const updated = { ...user, profilePhoto: path };
                setUser(updated);
                localStorage.setItem("voluntess_user", JSON.stringify(updated));
              }}
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-5">
              <p className="text-sm text-gray-500">Name</p>
              <p className="mt-1 text-lg font-semibold">
                {user.name || "Not available"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-5">
              <p className="text-sm text-gray-500">Email</p>
              <p className="mt-1 text-lg font-semibold">
                {user.email || "Not available"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-5">
              <p className="text-sm text-gray-500">Role</p>
              <p className="mt-1 text-lg font-semibold capitalize">
                {user.role || "Volunteer"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-5">
              <p className="text-sm text-gray-500">Account Status</p>
              <p className="mt-1 text-lg font-semibold text-green-600">
                Active
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="mt-8 rounded-lg bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700"
          >
            Logout
          </button>
        </section>
      </div>
    </main>
  );
}