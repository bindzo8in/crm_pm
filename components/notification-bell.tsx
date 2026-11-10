"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import {
  getMyNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

const notificationsQueryKey = ["my-notifications"];

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const realtimeSocketRef = useRef<WebSocket | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: getMyNotificationsAction,
    staleTime: 30_000,
    refetchInterval: realtimeConnected ? false : 30_000,
  });
  const markReadMutation = useMutation({
    mutationFn: markNotificationReadAction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
    onError: (error: Error) => toast.error(error.message || "Unable to update notifications."),
  });
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsReadAction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
    onError: (error: Error) => toast.error(error.message || "Unable to update notifications."),
  });
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const notifications = notificationsQuery.data?.notifications ?? [];

  useEffect(() => {
    let reconnectTimer: number | null = null;
    let stopped = false;

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(`${protocol}//${window.location.host}/api/chat/ws`);
      realtimeSocketRef.current = socket;

      socket.addEventListener("open", () => {
        if (realtimeSocketRef.current !== socket) return;
        socket.send(JSON.stringify({ type: "subscribe-notifications" }));
      });
      socket.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(event.data as string) as { type?: string };
          if (payload.type === "notifications-subscribed") {
            setRealtimeConnected(true);
            void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
          } else if (payload.type === "notifications-refresh") {
            void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
          }
        } catch {
          console.error("Received an invalid notifications realtime message.");
        }
      });
      socket.addEventListener("error", () => {
        if (realtimeSocketRef.current !== socket) return;
        setRealtimeConnected(false);
      });
      socket.addEventListener("close", () => {
        if (realtimeSocketRef.current !== socket) return;
        realtimeSocketRef.current = null;
        setRealtimeConnected(false);
        if (!stopped) reconnectTimer = window.setTimeout(connect, 2000);
      });
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      const socket = realtimeSocketRef.current;
      realtimeSocketRef.current = null;
      socket?.close();
    };
  }, [queryClient]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
          className="relative size-9 shrink-0"
        >
          <Bell aria-hidden="true" className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex min-w-4 translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))] gap-0 p-0">
        <PopoverHeader className="flex-row items-center justify-between border-b p-4">
          <div>
            <PopoverTitle>Notifications</PopoverTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {unreadCount ? `${unreadCount} unread` : "You’re all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={markAllReadMutation.isPending}
              onClick={() => markAllReadMutation.mutate()}
            >
              <CheckCheck aria-hidden="true" />
              Mark all read
            </Button>
          )}
        </PopoverHeader>
        <div className="max-h-[min(24rem,65vh)] overflow-y-auto">
          {notificationsQuery.isPending ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Loading notifications…</p>
          ) : notificationsQuery.isError ? (
            <div className="p-6 text-center">
              <p className="text-sm text-destructive">Notifications could not be loaded.</p>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => void notificationsQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">New updates will appear here.</p>
          ) : (
            <ul className="divide-y">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <Link
                    href={notification.href}
                    onClick={(event) => {
                      if (notification.readAt) return;
                      event.preventDefault();
                      markReadMutation.mutate(notification.id, {
                        onSuccess: () => {
                          setOpen(false);
                          router.push(notification.href);
                        },
                      });
                    }}
                    className={`block px-4 py-3 transition-colors hover:bg-muted/60 ${
                      notification.readAt ? "" : "bg-primary/[0.035]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${
                        notification.readAt ? "bg-transparent" : "bg-primary"
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{notification.message}</p>
                        <time className="mt-2 block text-[11px] text-muted-foreground" dateTime={notification.createdAt.toISOString()}>
                          {new Intl.DateTimeFormat("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "Asia/Kolkata",
                          }).format(notification.createdAt)}
                        </time>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
