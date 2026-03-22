"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, Info, AlertTriangle, Clock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  created_at: string;
  is_read: boolean;
};

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = async (uid: string) => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
    }
  };

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchNotifications(user.id);
      }
    };
    getUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime Subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("realtime_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 1000);

          // Play notification sound (optional)
          // const audio = new Audio('/notification.mp3');
          // audio.play().catch(() => {});
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Periodic Shake if unread
  useEffect(() => {
    if (unreadCount > 0) {
      const interval = setInterval(() => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [unreadCount]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    if (!userId) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-full hover:bg-gray-100 transition-all relative ${isShaking ? "animate-bounce" : ""}`}
      >
        <Bell className="h-5 w-5 text-gray-600" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed top-[5.25rem] left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-sm z-[200] sm:absolute sm:fixed-none sm:top-auto sm:left-auto sm:translate-x-0 sm:right-0 sm:mt-2 sm:w-80 bg-white rounded-[6px] shadow-2xl border border-gray-300 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-300 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-sm font-medium text-gray-900">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-brand-blue hover:text-brand-dark font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`p-4 border-b border-gray-100 flex gap-4 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.is_read ? "bg-brand-sand/20" : ""}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-[6px] flex-shrink-0 flex items-center justify-center ${
                        notif.type === "success"
                          ? "bg-brand-sand/30 text-brand-gold"
                          : notif.type === "error"
                            ? "bg-red-100 text-red-600"
                            : notif.type === "warning"
                              ? "bg-amber-100 text-amber-600"
                              : "bg-brand-sand/30 text-brand-blue"
                      }`}
                    >
                      {notif.type === "success" ? (
                        <Check size={18} strokeWidth={1.5} />
                      ) : notif.type === "error" ? (
                        <X size={18} strokeWidth={1.5} />
                      ) : notif.type === "warning" ? (
                        <AlertTriangle size={18} strokeWidth={1.5} />
                      ) : (
                        <Info size={18} strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium text-gray-900 truncate`}
                      >
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400">
                        <Clock size={10} strokeWidth={1.5} />
                        {formatTime(notif.created_at)}
                      </div>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 bg-brand-gold rounded-full mt-1 flex-shrink-0" />
                    )}
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <Bell className="mx-auto h-8 w-8 text-gray-200 mb-3" />
                  <p className="text-gray-500 text-xs">No notifications yet</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
