"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, getUser } from "@/lib/api";

type Conv = {
  _id: string;
  otherName: string;
  opportunityTitle: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
};

type Msg = { _id: string; text: string; createdAt: string; mine: boolean };

type Meta = { otherName: string; opportunityTitle: string; canSend: boolean };

function formatTime(value: string) {
  const d = new Date(value);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function MessagesPage() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastCount = useRef(0);

  const loadList = useCallback(async () => {
    try {
      const data = await api("/conversations");
      setConvs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Could not load conversations");
    }
  }, []);

  const loadThread = useCallback(async (id: string) => {
    try {
      const data = await api(`/conversations/${id}/messages`);
      setMsgs(Array.isArray(data?.messages) ? data.messages : []);
      setMeta({
        otherName: data.otherName,
        opportunityTitle: data.opportunityTitle,
        canSend: Boolean(data.canSend),
      });
    } catch (err: any) {
      setError(err.message || "Could not load messages");
    }
  }, []);

  // First load, plus ?application=ID from the "Message" buttons
  useEffect(() => {
    const current = getUser();
    setUser(current);
    if (!current) {
      setReady(true);
      return;
    }

    (async () => {
      const appId = new URLSearchParams(window.location.search).get("application");
      const openId = new URLSearchParams(window.location.search).get("open");
      if (openId) {
        setActive(openId);
        window.history.replaceState(null, "", "/messages");
      }
      if (appId) {
        try {
          const r = await api(`/applications/${appId}/conversation`, { method: "POST" });
          setActive(r._id);
        } catch (err: any) {
          setError(err.message || "Could not open the conversation");
        }
        window.history.replaceState(null, "", "/messages");
      }
      await loadList();
      setReady(true);
    })();
  }, [loadList]);

  // Poll the open thread and the list
  useEffect(() => {
    if (!active) return;
    lastCount.current = 0;
    loadThread(active).then(loadList);
    const t = setInterval(() => loadThread(active), 5000);
    return () => clearInterval(t);
  }, [active, loadThread, loadList]);

  useEffect(() => {
    if (!user) return;
    const t = setInterval(loadList, 15000);
    return () => clearInterval(t);
  }, [user, loadList]);

  useEffect(() => {
    if (msgs.length !== lastCount.current) {
      lastCount.current = msgs.length;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [msgs]);

  async function send() {
    if (!active || sending || !text.trim()) return;
    setSending(true);
    setError("");
    try {
      await api(`/conversations/${active}/messages`, { method: "POST", body: { text } });
      setText("");
      await loadThread(active);
      loadList();
    } catch (err: any) {
      setError(err.message || "Could not send message");
    } finally {
      setSending(false);
    }
  }

  if (!ready) {
    return <main className="mx-auto max-w-5xl px-4 py-16 text-center text-gray-500">Loading...</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-gray-700">Log in to see your messages.</p>
        <Link href="/login" className="mt-4 inline-block font-semibold text-blue-600">
          Log in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-extrabold text-gray-900">Messages</h1>
      <p className="mt-1 text-gray-600">Chat about an application. Open a chat from the dashboard or applicants list.</p>

      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mt-5 grid gap-4 md:grid-cols-[300px_1fr]">
        {/* Conversation list */}
        <section className={`${active ? "hidden md:block" : ""} rounded-2xl border border-gray-200 bg-white shadow-sm`}>
          {convs.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">
              No conversations yet. Use the Message button on an application to start one.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {convs.map((c) => (
                <li key={c._id}>
                  <button
                    onClick={() => setActive(c._id)}
                    className={`w-full p-4 text-left hover:bg-gray-50 ${active === c._id ? "bg-blue-50" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-gray-900">{c.otherName}</span>
                      {c.unread > 0 && (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                          {c.unread}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-gray-500">{c.opportunityTitle}</p>
                    <p className="mt-1 truncate text-sm text-gray-600">{c.lastMessage || "No messages yet"}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Thread */}
        <section
          className={`${active ? "flex" : "hidden md:flex"} h-[70vh] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm`}
        >
          {!active || !meta ? (
            <p className="m-auto text-sm text-gray-500">Select a conversation.</p>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-gray-100 p-4">
                <button onClick={() => setActive(null)} className="text-sm font-semibold text-blue-600 md:hidden">
                  Back
                </button>
                <div className="min-w-0">
                  <p className="truncate font-bold text-gray-900">{meta.otherName}</p>
                  <p className="truncate text-xs text-gray-500">{meta.opportunityTitle}</p>
                </div>
              </header>

              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {msgs.length === 0 && (
                  <p className="text-center text-sm text-gray-500">Say hello to start the conversation.</p>
                )}
                {msgs.map((m) => (
                  <div key={m._id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        m.mine ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      <p className={`mt-1 text-[10px] ${m.mine ? "text-blue-100" : "text-gray-500"}`}>
                        {formatTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {meta.canSend ? (
                <div className="flex gap-2 border-t border-gray-100 p-3">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    maxLength={1000}
                    rows={2}
                    placeholder="Type a message (Enter to send)"
                    className="flex-1 resize-none rounded-lg border border-gray-300 p-2 text-gray-900"
                  />
                  <button
                    onClick={send}
                    disabled={sending || !text.trim()}
                    className="self-end rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {sending ? "..." : "Send"}
                  </button>
                </div>
              ) : (
                <p className="border-t border-gray-100 p-3 text-center text-sm text-gray-500">
                  This conversation is read-only because the application is no longer active.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}