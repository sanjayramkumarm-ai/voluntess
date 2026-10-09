"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, getUser, logout } from "@/lib/api";

export default function AdminDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);

    if (currentUser?.role !== "admin") {
      setMessage("Access denied. Admin account required.");
      setLoading(false);
      return;
    }

    loadOpportunities();
  }, []);

  async function loadOpportunities() {
    try {
      setLoading(true);
      const data = await api("/opportunities");
      setOpportunities(data?.items || []);
    } catch (error: any) {
      setMessage(error.message || "Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  }

  async function deleteOpportunity(id: string) {
    if (!window.confirm("Are you sure you want to delete this opportunity?")) {
      return;
    }

    try {
      setMessage("");

      await api(`/opportunities/${id}`, {
        method: "DELETE",
      });

      setOpportunities((current) =>
        current.filter((item) => item._id !== id)
      );

      setMessage("Opportunity deleted successfully.");
    } catch (error: any) {
      setMessage(error.message || "Failed to delete opportunity");
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p className="text-center text-gray-500">
          Loading admin dashboard...
        </p>
      </main>
    );
  }

  if (user?.role !== "admin") {
    return (
      <main className="min-h-screen bg-gray-50">
        <header className="border-b bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <Link
              href="/"
              className="text-xl font-bold text-gray-900 sm:text-2xl"
            >
              Voluntess
            </Link>

            <Link
              href="/dashboard"
              className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white sm:px-4"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:py-20">
          <div className="text-5xl sm:text-6xl">🔒</div>

          <h1 className="mt-5 text-2xl font-bold text-gray-900 sm:text-3xl">
            Admin Access Required
          </h1>

          <p className="mt-3 text-sm text-gray-500 sm:text-base">
            Only an administrator can access this page.
          </p>

          {message && (
            <p className="mt-5 font-semibold text-red-600">
              {message}
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-gray-50">

      {/* Admin Header */}
      <header className="border-b bg-white px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/"
              className="text-xl font-bold text-gray-900 sm:text-2xl"
            >
              Voluntess
            </Link>

            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
              Admin Dashboard
            </p>
          </div>

          <button
            onClick={logout}
            className="shrink-0 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 sm:px-4"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Welcome Section */}
      <section className="bg-gradient-to-r from-gray-900 to-gray-700 px-5 py-10 text-white sm:px-6 sm:py-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-300 sm:text-sm">
            Administrator
          </p>

          <h1 className="mt-3 max-w-full break-words text-3xl font-bold leading-tight sm:text-4xl">
            Welcome, {user?.name || "Admin"} 👋
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-gray-300 sm:text-base">
            Manage all volunteering opportunities on Voluntess.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">

        {message && (
          <div className="mb-6 rounded-xl bg-blue-50 p-4 text-sm font-medium text-blue-700">
            {message}
          </div>
        )}

        {/* Statistics */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">

          <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold text-gray-400 sm:text-sm">
              TOTAL OPPORTUNITIES
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
              {opportunities.length}
            </p>
          </div>

          <div className="min-w-0 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold text-gray-400 sm:text-sm">
              ADMIN
            </p>

            <p className="mt-2 break-words text-lg font-bold capitalize text-gray-900 sm:text-xl">
              {user?.name || "Administrator"}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold text-gray-400 sm:text-sm">
              ACCESS LEVEL
            </p>

            <p className="mt-2 text-lg font-bold text-green-600 sm:text-xl">
              Full Management
            </p>
          </div>

        </div>

        {/* Opportunities */}
        <div className="overflow-hidden rounded-2xl bg-white p-4 shadow-sm sm:p-6 md:p-8">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                All Opportunities
              </h2>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Admin can delete any opportunity from the platform.
              </p>
            </div>

            <button
              onClick={loadOpportunities}
              className="w-full shrink-0 rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 sm:w-auto"
            >
              Refresh
            </button>
          </div>

          {opportunities.length === 0 ? (
            <div className="mt-8 rounded-xl bg-gray-50 p-8 text-center sm:p-10">
              <div className="text-4xl">📭</div>

              <p className="mt-3 text-lg font-semibold text-gray-700">
                No opportunities found.
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-4">

              {opportunities.map((opportunity) => (
                <div
                  key={opportunity._id}
                  className="overflow-hidden rounded-xl border border-gray-200 p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start gap-2 sm:items-center sm:gap-3">

                        <h3 className="min-w-0 break-words text-lg font-bold text-gray-900 sm:text-xl">
                          {opportunity.title}
                        </h3>

                        <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {opportunity.category}
                        </span>

                      </div>

                      <p className="mt-2 break-words text-sm leading-6 text-gray-500 sm:text-base">
                        {opportunity.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-sm">

                        <span className="max-w-full break-words rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                          📍 {opportunity.location}
                        </span>

                        <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                          📅{" "}
                          {opportunity.date
                            ? new Date(
                                opportunity.date
                              ).toLocaleDateString()
                            : "No date"}
                        </span>

                        <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                          👥 {opportunity.capacity} volunteers
                        </span>

                      </div>

                      {opportunity.organizer?.name && (
                        <p className="mt-3 break-words text-sm text-gray-400">
                          Created by:{" "}
                          <span className="font-semibold text-gray-600">
                            {opportunity.organizer.name}
                          </span>
                        </p>
                      )}

                    </div>

                    <div className="flex w-full shrink-0 gap-2 sm:w-auto">

                      <Link
                        href={`/opportunities/${opportunity._id}`}
                        className="flex-1 rounded-lg bg-gray-100 px-4 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-gray-200 sm:flex-none"
                      >
                        View
                      </Link>

                      <button
                        onClick={() =>
                          deleteOpportunity(opportunity._id)
                        }
                        className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 sm:flex-none"
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

      </section>
    </main>
  );
}