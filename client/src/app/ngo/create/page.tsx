"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-xl border border-gray-300 text-gray-500">
      Loading map...
    </div>
  ),
});

export default function CreateOpportunityPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Environment",
    location: "",
    date: "",
    startTime: "",
    endTime: "",
    capacity: "10",
    skills: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });

  function updateField(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api("/opportunities", {
        method: "POST",
        body: {
          title: form.title,
          description: form.description,
          category: form.category,
          location: form.location,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          capacity: Number(form.capacity),
          ...(coords.lat !== null && coords.lng !== null
            ? { latitude: coords.lat, longitude: coords.lng }
            : {}),
          skills: form.skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean),
        },
      });

      router.push("/ngo");
    } catch (err: any) {
      setError(err.message || "Unable to create opportunity");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/ngo"
            className="text-sm text-blue-100 hover:text-white"
          >
            ? Back to NGO Dashboard
          </Link>

          <h1 className="mt-6 text-4xl font-bold">
            Create Opportunity
          </h1>

          <p className="mt-3 text-blue-100">
            Publish a volunteering opportunity for the Voluntess community.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <form
          onSubmit={submit}
          className="rounded-2xl bg-white p-8 shadow-sm"
        >
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-6">

            <div>
              <label className="mb-2 block font-semibold text-gray-800">
                Opportunity Title
              </label>

              <input
                name="title"
                value={form.title}
                onChange={updateField}
                placeholder="Example: Beach Cleanup Drive"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold text-gray-800">
                Description
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="Describe what volunteers will do..."
                rows={5}
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold text-gray-800">
                Category
              </label>

              <select
                name="category"
                value={form.category}
                onChange={updateField}
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              >
                <option>Environment</option>
                <option>Education</option>
                <option>Healthcare</option>
                <option>Animal Welfare</option>
                <option>Food & Hunger</option>
                <option>Child Welfare</option>
                <option>Elderly Care</option>
                <option>Disaster Relief</option>
                <option>Community Service</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block font-semibold text-gray-800">
                Location
              </label>

              <input
                name="location"
                value={form.location}
                onChange={updateField}
                placeholder="Example: Besant Nagar, Chennai"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold text-gray-800">
                Pin on map (optional)
              </label>

              <LocationPicker
                latitude={coords.lat}
                longitude={coords.lng}
                onChange={(lat, lng) => setCoords({ lat, lng })}
              />

              <p className="mt-2 text-sm text-gray-400">
                A pin helps volunteers find you on the Map page.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">

              <div>
                <label className="mb-2 block font-semibold text-gray-800">
                  Date
                </label>

                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={updateField}
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold text-gray-800">
                  Start Time
                </label>

                <input
                  type="time"
                  name="startTime"
                  value={form.startTime}
                  onChange={updateField}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold text-gray-800">
                  End Time
                </label>

                <input
                  type="time"
                  name="endTime"
                  value={form.endTime}
                  onChange={updateField}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                />
              </div>

            </div>

            <div>
              <label className="mb-2 block font-semibold text-gray-800">
                Volunteer Capacity
              </label>

              <input
                type="number"
                name="capacity"
                min="1"
                value={form.capacity}
                onChange={updateField}
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold text-gray-800">
                Required Skills
              </label>

              <input
                name="skills"
                value={form.skills}
                onChange={updateField}
                placeholder="Example: Teamwork, Teaching, Communication"
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />

              <p className="mt-2 text-sm text-gray-400">
                Separate multiple skills with commas.
              </p>
            </div>

          </div>

          <div className="mt-8 flex gap-4">
            <Link
              href="/ngo"
              className="flex-1 rounded-xl border border-gray-300 px-5 py-4 text-center font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-blue-600 px-5 py-4 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Publishing..." : "Publish Opportunity"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
