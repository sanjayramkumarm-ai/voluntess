"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, getUser, logout } from "../lib/api";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [unread, setUnread] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const currentUser = getUser();
      setUser(currentUser);

      if (currentUser) {
        try {
          const data = await api("/notifications/unread-count");
          setUnread(data.count || 0);
        } catch {}
      }
    };

    load();
  }, []);

  const openNotifications = async () => {
    if (!user) return;

    setShowNotifications((value) => !value);

    if (!showNotifications) {
      try {
        const data = await api("/notifications");
        setNotifications(data || []);
      } catch {}
    }
  };

  const markRead = async (id: string) => {
    try {
      await api(`/notifications/${id}/read`, {
        method: "PATCH",
      });

      setNotifications((items) =>
        items.map((item) =>
          item._id === id ? { ...item, read: true } : item
        )
      );

      setUnread((value) => Math.max(0, value - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api("/notifications/read-all", {
        method: "PATCH",
      });

      setNotifications((items) =>
        items.map((item) => ({ ...item, read: true }))
      );

      setUnread(0);
    } catch {}
  };

  const closeMobile = () => {
    setMobileOpen(false);
    setShowNotifications(false);
  };

  return (
    <nav className="absolute left-0 top-0 z-50 w-full border-b border-white/20 bg-white/10 backdrop-blur-md">
      <div className="mx-3 flex h-20 items-center justify-between rounded-2xl px-4 md:mx-6 md:px-8">
        
        {/* Logo */}
        <Link
          href="/"
          onClick={closeMobile}
          className="text-2xl font-extrabold tracking-tight text-gray-900 drop-shadow-sm"
        >
          Voluntess
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="/explore"
            className="text-gray-900 transition hover:text-white"
          >
            Explore
          </Link>

          {user && (
            <Link
              href={
                user.role === "ngo"
                  ? "/ngo"
                  : user.role === "admin"
                    ? "/admin"
                    : "/dashboard"
              }
              className="text-gray-900 transition hover:text-white"
            >
              Dashboard
            </Link>
          )}

          {user && (
            <div className="relative">
              <button
                onClick={openNotifications}
                className="relative rounded-xl p-2 text-2xl text-white transition hover:bg-white/20"
                aria-label="Notifications"
              >
                🔔

                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </button>

              {showNotifications && (
                <NotificationPanel
                  notifications={notifications}
                  unread={unread}
                  markRead={markRead}
                  markAllRead={markAllRead}
                />
              )}
            </div>
          )}

          {user?.role === "admin" && (
            <Link
              href="/admin"
              className="font-medium text-gray-900 transition hover:text-white"
            >
              👑 Admin
            </Link>
          )}

          {user && (
            <span className="max-w-[140px] truncate text-sm text-gray-800">
              {user.name}
            </span>
          )}

          {user ? (
            <button
              onClick={logout}
              className="rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white transition hover:bg-gray-800"
            >
              Logout
            </button>
          ) : (
            <>
              <Link
                href="/login"
                className="text-gray-700 hover:text-blue-600"
              >
                Log in
              </Link>

              <Link
                href="/login"
                className="rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white"
              >
                Join free
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen((value) => !value)}
          className="rounded-xl p-2 text-2xl text-white transition hover:bg-white/20 md:hidden"
          aria-label="Open menu"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-white/20 bg-white/10 px-5 pb-5 pt-3 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-2">
            
            <Link
              href="/explore"
              onClick={closeMobile}
              className="rounded-xl px-4 py-3 font-medium text-gray-900 hover:bg-black/5"
            >
              🔎 Explore
            </Link>

            {user && (
              <Link
                href={
                  user.role === "ngo"
                    ? "/ngo"
                    : user.role === "admin"
                      ? "/admin"
                      : "/dashboard"
                }
                onClick={closeMobile}
                className="rounded-xl px-4 py-3 font-medium text-gray-900 hover:bg-black/5"
              >
                📊 Dashboard
              </Link>
            )}

            {user && (
              <button
                onClick={openNotifications}
                className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left font-medium text-gray-700 hover:bg-gray-50"
              >
                <span>🔔 Notifications</span>

                {unread > 0 && (
                  <span className="rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>
            )}

            {showNotifications && user && (
              <NotificationPanel
                notifications={notifications}
                unread={unread}
                markRead={markRead}
                markAllRead={markAllRead}
                mobile
              />
            )}

            {user?.role === "admin" && (
              <Link
                href="/admin"
                onClick={closeMobile}
                className="rounded-xl px-4 py-3 font-medium text-gray-900 hover:bg-black/5"
              >
                👑 Admin
              </Link>
            )}

            {user && (
              <div className="mt-2 border-t border-gray-100 px-4 pt-4">
                <p className="text-sm text-gray-700">Signed in as</p>
                <p className="mt-1 font-semibold text-white">
                  {user.name}
                </p>
              </div>
            )}

            {user ? (
              <button
                onClick={logout}
                className="mt-2 rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white"
              >
                Logout
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={closeMobile}
                  className="rounded-xl px-4 py-3 font-medium text-gray-900 hover:bg-black/5"
                >
                  Log in
                </Link>

                <Link
                  href="/login"
                  onClick={closeMobile}
                  className="rounded-xl bg-gray-900 px-4 py-3 text-center font-semibold text-white"
                >
                  Join free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function NotificationPanel({
  notifications,
  unread,
  markRead,
  markAllRead,
  mobile = false,
}: {
  notifications: any[];
  unread: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  mobile?: boolean;
}) {
  return (
    <div
      className={
        mobile
          ? "mt-2 max-h-80 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-3"
          : "absolute right-0 top-14 w-80 rounded-2xl border border-gray-100 bg-white p-4 shadow-xl"
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <strong className="text-sm">🔔 Notifications</strong>

        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs font-semibold text-blue-600"
          >
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">
          No notifications yet 🔕
        </p>
      ) : (
        notifications.map((item) => (
          <div
            key={item._id}
            onClick={() => !item.read && markRead(item._id)}
            className={`mb-2 rounded-xl border p-3 ${
              item.read ? "bg-white" : "bg-blue-50"
            }`}
          >
            <p className="text-sm font-bold text-gray-900">
              {item.title}
            </p>

            <p className="mt-1 text-xs leading-5 text-gray-600">
              {item.message}
            </p>

            {!item.read && (
              <p className="mt-2 text-[10px] font-bold text-blue-600">
                NEW
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}