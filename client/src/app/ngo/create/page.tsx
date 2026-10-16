"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-lg border border-slate-300 text-sm text-slate-500">
      Loading map...
    </div>
  ),
});

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";
const hintClass = "mt-1.5 text-xs text-slate-500";

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </div>
  );
}

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
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <nav className="text-sm text-slate-500">
          <Link href="/ngo" className="hover:text-slate-900">NGO Dashboard</Link>
          <span className="px-2 text-slate-300">/</span>
          <span className="text-slate-700">Create opportunity</span>
        </nav>

        <div className="mt-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Create opportunity</h1>
            <p className="mt-1 text-sm text-slate-500">Publish a volunteering opportunity for the Voluntess community.</p>
          </div>
          <Link href="/ngo" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            &larr; Back to dashboard
          </Link>
        </div>

        <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <Card title="Basic details" subtitle="Tell volunteers what this opportunity is about.">
              <div>
                <label htmlFor="title" className={labelClass}>Opportunity title</label>
                <input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={updateField}
                  placeholder="Example: Beach Cleanup Drive"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="description" className={labelClass}>Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  placeholder="Describe what volunteers will do..."
                  rows={5}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="category" className={labelClass}>Category</label>
                <select id="category" name="category" value={form.category} onChange={updateField} className={inputClass}>
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
            </Card>

            <Card title="Location" subtitle="Where should volunteers go?">
              <div>
                <label htmlFor="location" className={labelClass}>Address or area</label>
                <input
                  id="location"
                  name="location"
                  value={form.location}
                  onChange={updateField}
                  placeholder="Example: Besant Nagar, Chennai"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Pin on map <span className="font-normal text-slate-400">(optional)</span></label>
                <div className="overflow-hidden rounded-lg border border-slate-300">
                  <LocationPicker
                    latitude={coords.lat}
                    longitude={coords.lng}
                    onChange={(lat, lng) => setCoords({ lat, lng })}
                  />
                </div>
                <p className={hintClass}>Tap the map to drop a pin. A pin helps volunteers find you on the Map page.</p>
              </div>
            </Card>

            <Card title="Schedule" subtitle="When will the event take place?">
              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label htmlFor="date" className={labelClass}>Date</label>
                  <input id="date" type="date" name="date" value={form.date} onChange={updateField} required className={inputClass} />
                </div>
                <div>
                  <label htmlFor="startTime" className={labelClass}>Start time</label>
                  <input id="startTime" type="time" name="startTime" value={form.startTime} onChange={updateField} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="endTime" className={labelClass}>End time</label>
                  <input id="endTime" type="time" name="endTime" value={form.endTime} onChange={updateField} className={inputClass} />
                </div>
              </div>
            </Card>

            <Card title="Volunteers" subtitle="How many people do you need, and what skills help?">
              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label htmlFor="capacity" className={labelClass}>Capacity</label>
                  <input
                    id="capacity"
                    type="number"
                    name="capacity"
                    min="1"
                    value={form.capacity}
                    onChange={updateField}
                    required
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="skills" className={labelClass}>Required skills</label>
                  <input
                    id="skills"
                    name="skills"
                    value={form.skills}
                    onChange={updateField}
                    placeholder="Example: Teamwork, Teaching, Communication"
                    className={inputClass}
                  />
                  <p className={hintClass}>Separate multiple skills with commas.</p>
                </div>
              </div>
            </Card>
          </div>

          <aside className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
              <h2 className="text-base font-semibold text-slate-900">Publish</h2>
              <p className="mt-1 text-sm text-slate-500">Your opportunity will be visible to volunteers on the Explore page right away.</p>

              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Publishing..." : "Publish opportunity"}
                </button>
                <Link
                  href="/ngo"
                  className="w-full rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </Link>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tips</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>Use a clear title that says what volunteers will do.</li>
                  <li>Mention what to bring and who to contact.</li>
                  <li>Add a map pin so people can find the place easily.</li>
                </ul>
              </div>
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}