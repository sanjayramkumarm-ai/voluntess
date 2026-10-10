"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, getUser } from "@/lib/api";

type Team = {
  _id: string;
  name: string;
  isLeader: boolean;
  leaderId: string;
  inviteCode?: string;
  members: { _id: string; name: string }[];
};

function TeamCard({
  team,
  opportunities,
  reload,
  setNotice,
}: {
  team: Team;
  opportunities: any[];
  reload: () => void;
  setNotice: (m: string) => void;
}) {
  const [oppId, setOppId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const apply = () =>
    run(async () => {
      if (!oppId) throw new Error("Choose an opportunity first");
      const r = await api(`/teams/${team._id}/apply`, { method: "POST", body: { opportunityId: oppId, message } });
      setNotice(
        `Applied for ${r.applied} member${r.applied === 1 ? "" : "s"}` +
          (r.skipped ? ` (${r.skipped} already had an application).` : ".")
      );
      setOppId("");
      setMessage("");
    });

  const leave = () =>
    run(async () => {
      if (!window.confirm(`Leave ${team.name}?`)) return;
      await api(`/teams/${team._id}/leave`, { method: "DELETE" });
      reload();
    });

  const disband = () =>
    run(async () => {
      if (!window.confirm(`Disband ${team.name}? This removes the team for everyone.`)) return;
      await api(`/teams/${team._id}`, { method: "DELETE" });
      reload();
    });

  const remove = (m: { _id: string; name: string }) =>
    run(async () => {
      if (!window.confirm(`Remove ${m.name} from the team?`)) return;
      await api(`/teams/${team._id}/members/${m._id}`, { method: "DELETE" });
      reload();
    });

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(team.inviteCode || "");
      setNotice("Invite code copied.");
    } catch {
      setNotice(`Invite code: ${team.inviteCode}`);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-gray-900">{team.name}</h3>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {team.isLeader ? "You lead this team" : "Member"} - {team.members.length} member
          {team.members.length === 1 ? "" : "s"}
        </span>
      </div>

      {team.isLeader && team.inviteCode && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-gray-50 p-3">
          <span className="text-sm text-gray-600">Invite code</span>
          <strong className="font-mono text-lg tracking-widest text-gray-900">{team.inviteCode}</strong>
          <button onClick={copyCode} className="text-sm font-semibold text-blue-600">
            Copy
          </button>
        </div>
      )}

      <ul className="mt-3 divide-y divide-gray-100">
        {team.members.map((m) => (
          <li key={m._id} className="flex items-center justify-between py-2 text-sm text-gray-800">
            <span>
              {m._id === team.leaderId ? "Leader: " : ""}
              {m.name}
            </span>
            {team.isLeader && m._id !== team.leaderId && (
              <button onClick={() => remove(m)} disabled={busy} className="text-xs font-semibold text-red-600">
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {team.isLeader && (
        <div className="mt-4 rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-900">Apply as a team</p>
          <select
            value={oppId}
            onChange={(e) => setOppId(e.target.value)}
            className="mt-2 w-full rounded-lg border border-gray-300 p-2 text-gray-900"
          >
            <option value="">Choose an opportunity</option>
            {opportunities.map((o) => (
              <option key={o._id} value={o._id}>
                {o.title} - {new Date(o.date).toLocaleDateString("en-IN")}
              </option>
            ))}
          </select>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="Message to the NGO (optional)"
            className="mt-2 w-full rounded-lg border border-gray-300 p-2 text-gray-900"
          />
          <button
            onClick={apply}
            disabled={busy}
            className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? "Working..." : `Apply for all ${team.members.length} members`}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4">
        {team.isLeader ? (
          <button onClick={disband} disabled={busy} className="text-sm font-semibold text-red-600">
            Disband team
          </button>
        ) : (
          <button onClick={leave} disabled={busy} className="text-sm font-semibold text-red-600">
            Leave team
          </button>
        )}
      </div>
    </div>
  );
}

export default function TeamsPage() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    try {
      const [t, o] = await Promise.all([api("/teams/mine"), api("/opportunities")]);
      setTeams(Array.isArray(t) ? t : []);
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const list: any[] = Array.isArray(o?.items) ? o.items : [];
      setOpportunities(list.filter((i) => !i.date || new Date(i.date) >= start));
    } catch (err: any) {
      setError(err.message || "Could not load teams");
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    const current = getUser();
    setUser(current);
    if (!current || current.role !== "volunteer") {
      setReady(true);
      return;
    }
    load();
  }, []);

  async function create() {
    setError("");
    setNotice("");
    try {
      await api("/teams", { method: "POST", body: { name } });
      setName("");
      setNotice("Team created. Share the invite code with your members.");
      await load();
    } catch (err: any) {
      setError(err.message || "Could not create team");
    }
  }

  async function join() {
    setError("");
    setNotice("");
    try {
      const r = await api("/teams/join", { method: "POST", body: { code } });
      setCode("");
      setNotice(`You joined ${r.name}.`);
      await load();
    } catch (err: any) {
      setError(err.message || "Could not join team");
    }
  }

  if (!ready) {
    return <main className="mx-auto max-w-2xl px-4 py-16 text-center text-gray-500">Loading...</main>;
  }

  if (!user || user.role !== "volunteer") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-gray-700">Teams are for volunteer accounts.</p>
        <Link href="/login" className="mt-4 inline-block font-semibold text-blue-600">
          Log in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-gray-900">Teams</h1>
      <p className="mt-1 text-gray-600">
        Volunteer together with friends, classmates or colleagues. The leader applies for everyone at once.
      </p>

      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">{notice}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Create a team</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Team name"
            className="mt-3 w-full rounded-lg border border-gray-300 p-2 text-gray-900"
          />
          <button
            onClick={create}
            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Create team
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Join with a code</h2>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
            placeholder="8-character code"
            className="mt-3 w-full rounded-lg border border-gray-300 p-2 font-mono tracking-widest text-gray-900"
          />
          <button
            onClick={join}
            className="mt-3 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Join team
          </button>
        </div>
      </div>

      <section className="mt-8 grid gap-4">
        <h2 className="text-lg font-bold text-gray-900">Your teams</h2>
        {teams.length === 0 ? (
          <p className="text-sm text-gray-500">You are not in a team yet.</p>
        ) : (
          teams.map((t) => (
            <TeamCard key={t._id} team={t} opportunities={opportunities} reload={load} setNotice={setNotice} />
          ))
        )}
      </section>
    </main>
  );
}