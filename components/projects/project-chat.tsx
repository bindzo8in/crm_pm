"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCheck, FileText, Paperclip, Reply, Send, SmilePlus, X } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { getProjectConversationAction, markProjectChatReadAction, sendProjectMessageAction, toggleProjectMessageReactionAction } from "@/actions/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { ChatMedia, ChatMediaItem } from "@/components/chat/chat-media";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const chatSchema = z.object({ body: z.string().trim().max(5000) });
type ChatInput = z.input<typeof chatSchema>;
type ChatMessage = Awaited<ReturnType<typeof getProjectConversationAction>> extends { messages: infer T } ? T : never;
type ProjectChatMessage = ChatMessage[number];
type PendingAttachment = Omit<ChatMediaItem, "id">;

function isUploadCancellation(error: unknown) {
  const candidate = error as { name?: unknown; message?: unknown };
  return candidate?.name === "AbortError"
    || candidate?.message === "Upload cancelled."
    || candidate?.message === "signal is aborted without reason";
}
type LocalAttachmentPreview = {
  key: string;
  file: File;
  previewUrl: string | null;
  uploading: boolean;
};

export function ProjectChat({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<ChatMessage>([]);
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [localAttachments, setLocalAttachments] = useState<LocalAttachmentPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<ProjectChatMessage | null>(null);
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null);
  const [openReactionMessageId, setOpenReactionMessageId] = useState<string | null>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const refreshSequenceRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const refreshQueuedRef = useRef(false);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const realtimeReadyRef = useRef(false);
  const pendingPublishRef = useRef(false);
  const uploadControllersRef = useRef(new Map<string, AbortController>());
  const cancelledUploadKeysRef = useRef(new Set<string>());
  const realtimeSocketRef = useRef<WebSocket | null>(null);
  const form = useForm<ChatInput>({ resolver: zodResolver(chatSchema), defaultValues: { body: "" } });
  const messageBody = useWatch({ control: form.control, name: "body" });

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      refreshQueuedRef.current = true;
      return;
    }

    refreshInFlightRef.current = true;
    const requestSequence = ++refreshSequenceRef.current;
    try {
      const result = await getProjectConversationAction(projectId);
      if (requestSequence === refreshSequenceRef.current && "messages" in result) {
        startRefresh(() => {
          setMessages(result.messages);
          setConversationId(result.conversationId);
        });
      }
    } catch (error) {
      if (requestSequence === refreshSequenceRef.current) {
        console.error("Failed to refresh project conversation", error);
        toast.error("Unable to refresh project conversation.");
      }
    } finally {
      refreshInFlightRef.current = false;
      if (refreshQueuedRef.current) {
        refreshQueuedRef.current = false;
        void refreshRef.current();
      }
    }
  }, [projectId, startRefresh]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
    let reconnectTimer: number | null = null;
    let stopped = false;

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(`${protocol}//${window.location.host}/api/chat/ws`);
      realtimeSocketRef.current = socket;

      socket.addEventListener("open", () => {
        if (realtimeSocketRef.current !== socket) return;
        realtimeReadyRef.current = true;
        socket.send(JSON.stringify({ type: "subscribe", projectId }));
        if (pendingPublishRef.current) {
          pendingPublishRef.current = false;
          socket.send(JSON.stringify({ type: "publish", projectId }));
        }
      });
      socket.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(event.data as string) as {
            type?: string;
            projectId?: string;
            message?: string;
          };
          if (payload.type === "subscribed" && payload.projectId === projectId) {
            realtimeReadyRef.current = true;
            if (pendingPublishRef.current && socket.readyState === WebSocket.OPEN) {
              pendingPublishRef.current = false;
              socket.send(JSON.stringify({ type: "publish", projectId }));
            }
            return;
          }
          if (payload.type === "refresh" && payload.projectId === projectId) void refresh();
          if (payload.type === "error") {
            console.error("Project chat realtime error:", payload.message ?? "Unknown WebSocket error");
          }
        } catch {
          // Ignore malformed realtime frames.
        }
      });
      socket.addEventListener("error", () => {
        if (realtimeSocketRef.current !== socket) return;
        realtimeReadyRef.current = false;
      });
      socket.addEventListener("close", () => {
        if (realtimeSocketRef.current !== socket) return;
        realtimeReadyRef.current = false;
        realtimeSocketRef.current = null;
        if (!stopped) reconnectTimer = window.setTimeout(connect, 2000);
      });
    };

    connect();
    const fallbackRefreshTimer = window.setInterval(() => {
      if (!realtimeReadyRef.current) void refresh();
    }, 1500);
    const handleVisibilityChange = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      stopped = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      window.clearInterval(fallbackRefreshTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      const socket = realtimeSocketRef.current;
      realtimeSocketRef.current = null;
      realtimeReadyRef.current = false;
      socket?.close();
    };
  }, [projectId, refresh]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(values: ChatInput) {
    if (!values.body.trim() && attachments.length === 0) return;
    try {
      const result = await sendProjectMessageAction({
        projectId,
        body: values.body,
        attachments,
        replyToId: replyTo?.id,
      });
      if (!result.success) return;
      setMessages((current) => {
        if (current.some((message) => message.id === result.message.id)) return current;
        return [...current, result.message].sort((left, right) =>
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
        );
      });
      form.reset();
      setReplyTo(null);
      setAttachments([]);
      localAttachments.forEach((preview) => {
        if (preview.previewUrl) URL.revokeObjectURL(preview.previewUrl);
      });
      setLocalAttachments([]);
      if (realtimeSocketRef.current?.readyState === WebSocket.OPEN) {
        realtimeSocketRef.current.send(JSON.stringify({ type: "publish", projectId }));
      } else {
        pendingPublishRef.current = true;
      }
      void refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send message.");
    }
  }

  async function toggleReaction(message: ProjectChatMessage, emoji: string) {
    if (reactingMessageId) return;
    setReactingMessageId(message.id);
    try {
      const result = await toggleProjectMessageReactionAction({ projectId, messageId: message.id, emoji });
      setMessages((current) => current.map((item) =>
        item.id === message.id ? { ...item, reactions: result.reactions } : item,
      ));
      if (realtimeSocketRef.current?.readyState === WebSocket.OPEN) {
        realtimeSocketRef.current.send(JSON.stringify({ type: "publish", projectId }));
      } else {
        pendingPublishRef.current = true;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update reaction.");
    } finally {
      setReactingMessageId(null);
    }
  }

  async function uploadMedia(files: FileList | null) {
    if (!files?.length || !conversationId) return;
    setUploading(true);
    try {
      const selectedFiles = Array.from(files).slice(0, 10);
      const previews = selectedFiles.map((file) => ({
        key: crypto.randomUUID(),
        file,
        previewUrl: file.type.startsWith("image/") || file.type.startsWith("video/")
          ? URL.createObjectURL(file)
          : null,
        uploading: true,
      }));
      previews.forEach((preview) => cancelledUploadKeysRef.current.delete(preview.key));
      setLocalAttachments((current) => [...current, ...previews].slice(0, 10));
      for (const preview of previews) {
        if (cancelledUploadKeysRef.current.has(preview.key)) continue;
        const body = new FormData();
        body.set("conversationId", conversationId);
        body.set("file", preview.file);
        const controller = new AbortController();
        uploadControllersRef.current.set(preview.key, controller);
        const response = await fetch("/api/chat/uploads", { method: "POST", body, signal: controller.signal });
        uploadControllersRef.current.delete(preview.key);
        if (cancelledUploadKeysRef.current.has(preview.key)) continue;
        const payload = await response.json() as { asset?: PendingAttachment; message?: string };
        const asset = payload.asset;
        if (!response.ok || !asset) throw new Error(payload.message ?? "Media upload failed.");
        setAttachments((current) => [...current, asset].slice(0, 10));
        cancelledUploadKeysRef.current.delete(preview.key);
        if (preview.previewUrl) URL.revokeObjectURL(preview.previewUrl);
        setLocalAttachments((current) => current.filter((item) => item.key !== preview.key));
      }
    } catch (error) {
      if (!isUploadCancellation(error)) {
        toast.error(error instanceof Error ? error.message : "Media upload failed.");
      }
    } finally {
      uploadControllersRef.current.clear();
      setUploading(false);
    }
  }

  function cancelPreview(preview: LocalAttachmentPreview) {
      cancelledUploadKeysRef.current.add(preview.key);
      const controller = uploadControllersRef.current.get(preview.key);
      if (controller && !controller.signal.aborted) {
        try {
          controller.abort(new Error("Upload cancelled."));
        } catch {
          controller.abort();
        }
      }
      if (preview.previewUrl) URL.revokeObjectURL(preview.previewUrl);
      setLocalAttachments((current) => current.filter((item) => item.key !== preview.key));
  }

  return (
    <section className="flex h-[calc(100dvh-210px)] min-h-[560px] flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center border-b/0 px-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">Project conversation</h2>
          <p className="text-xs text-muted-foreground">{isRefreshing ? "Checking updates..." : "Visible to project members"}</p>
        </div>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => void markProjectChatReadAction(projectId)}><CheckCheck className="mr-2 size-4" />Mark read</Button>
      </header>
      <div aria-live="polite" className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="mx-auto max-w-3xl px-4 pt-8">{[0, 1, 2].map((item) => <div key={item} className="mb-5 h-14 animate-pulse rounded-lg bg-muted/40" />)}</div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center"><div><p className="text-lg font-medium">How can we help with this project?</p><p className="mt-1 text-sm text-muted-foreground">Start a conversation with project members.</p></div></div>
        ) : (
          <div className="mx-auto max-w-3xl pb-8 pt-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 px-4 py-3 sm:px-0 ${message.mine ? "justify-end" : "justify-start"}`}>
                {!message.mine && <Avatar className="mt-0.5 size-7 shrink-0"><AvatarImage src={message.sender.image ?? undefined} alt="" /><AvatarFallback className="text-[10px]">{message.sender.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>}
                <div className={`group min-w-[80px] ${message.mine ? "max-w-[85%]" : "max-w-[82%]"}`}>
                  <div className={`text-[15px] leading-7 ${message.mine ? "rounded-[22px] bg-muted px-4 py-2.5" : "px-1 py-1"}`}>
                    {!message.mine && <p className="mb-0.5 text-xs font-medium">{message.sender.name}</p>}
                    {message.replyTo && (
                      <div className="mb-2 border-l-2 border-primary/60 pl-2 text-xs leading-5 text-muted-foreground">
                        <p className="font-medium text-foreground/80">{message.replyTo.sender.name}</p>
                        <p className="line-clamp-2">
                          {message.replyTo.deletedAt
                            ? "Message unavailable"
                            : message.replyTo.body || message.replyTo.attachments[0]?.fileName || "Attachment"}
                        </p>
                      </div>
                    )}
                    {message.body && <p className="whitespace-pre-wrap break-words leading-relaxed">{message.body}</p>}
                    {message.attachments.length > 0 && <ChatMedia items={message.attachments as ChatMediaItem[]} compact />}
                  </div>
                  <div className={`mt-1 flex flex-wrap items-center gap-1 ${message.mine ? "justify-end" : "justify-start"}`}>
                    {message.reactions.map((reaction) => (
                      <button
                        key={reaction.emoji}
                        type="button"
                        disabled={reactingMessageId === message.id}
                        aria-label={`${reaction.emoji}, ${reaction.count} reactions${reaction.reacted ? ", remove your reaction" : ", add your reaction"}`}
                        aria-pressed={reaction.reacted}
                        onClick={() => void toggleReaction(message, reaction.emoji)}
                        className={`rounded-full border px-2 py-0.5 text-xs transition-colors disabled:opacity-50 ${reaction.reacted ? "border-primary/40 bg-primary/10" : "bg-background hover:bg-muted"}`}
                      >
                        {reaction.emoji} {reaction.count}
                      </button>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                      onClick={() => {
                        setReplyTo(message);
                        window.requestAnimationFrame(() => form.setFocus("body"));
                      }}
                    >
                      <Reply className="mr-1 size-3.5" /> Reply
                    </Button>
                    <Popover
                      open={openReactionMessageId === message.id}
                      onOpenChange={(open) => setOpenReactionMessageId(open ? message.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                          aria-label="Add or change reaction"
                        >
                          <SmilePlus className="size-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align={message.mine ? "end" : "start"} className="w-[min(20rem,calc(100vw-2rem))] gap-0 overflow-hidden p-0">
                        <EmojiPicker
                          colorScheme="auto"
                          width="min(320px, calc(100vw - 2rem))"
                          height={380}
                          previewConfig={{ showPreview: false }}
                          searchPlaceHolder="Search emoji"
                          aria-label="Choose a reaction"
                          onEmojiClick={(emojiData) => {
                            setOpenReactionMessageId(null);
                            void toggleReaction(message, emojiData.emoji);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {message.mine && <Avatar className="mt-0.5 size-7 shrink-0"><AvatarImage src={message.sender.image ?? undefined} alt="" /><AvatarFallback className="text-[10px]">{message.sender.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>}
              </div>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>
      {(localAttachments.length > 0 || attachments.length > 0) && (
        <div className="flex gap-3 overflow-x-auto px-3 py-2">
          {localAttachments.map((preview) => (
            <div key={preview.key} className="relative size-20 shrink-0 overflow-hidden rounded-xl border bg-muted">
              {preview.previewUrl && preview.file.type.startsWith("image/")
                ? <img src={preview.previewUrl} alt="" className="size-full object-cover" />
                : preview.previewUrl && preview.file.type.startsWith("video/")
                  ? <video src={preview.previewUrl} muted preload="metadata" className="size-full object-cover" />
                  : <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground"><FileText className="size-6" /><span className="max-w-16 truncate text-[10px]">{preview.file.name}</span></div>}
              {preview.uploading && <span className="absolute inset-x-0 bottom-0 h-1 bg-primary/20"><span className="block h-full w-2/3 animate-pulse bg-primary" /></span>}
              <button type="button" className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/70 text-white" aria-label={`Cancel upload of ${preview.file.name}`} onClick={() => cancelPreview(preview)}><X className="size-3" /></button>
            </div>
          ))}
          {attachments.map((attachment) => (
            <div key={attachment.publicId} className="relative size-20 shrink-0 overflow-hidden rounded-xl border bg-muted">
              {attachment.resourceType === "image" && attachment.mimeType.startsWith("image/")
                ? <img src={attachment.url} alt={attachment.fileName} className="size-full object-cover" />
                : <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground"><FileText className="size-6" /><span className="max-w-16 truncate text-[10px]">{attachment.fileName}</span></div>}
              <button type="button" className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/70 text-white" aria-label={`Remove ${attachment.fileName}`} onClick={() => setAttachments((current) => current.filter((item) => item.publicId !== attachment.publicId))}><X className="size-3" /></button>
            </div>
          ))}
        </div>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit((values) => send(values))(event);
        }}
        className="mx-auto w-full max-w-3xl shrink-0 px-3 pb-4 pt-2 sm:px-4"
      >
        {replyTo && (
          <div className="mb-2 flex items-center gap-3 rounded-xl border-l-2 border-primary bg-muted/50 px-3 py-2">
            <div className="min-w-0 flex-1 text-xs">
              <p className="font-medium">Replying to {replyTo.sender.name}</p>
              <p className="truncate text-muted-foreground">
                {replyTo.body || replyTo.attachments[0]?.fileName || "Attachment"}
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" aria-label="Cancel reply" onClick={() => setReplyTo(null)}>
              <X className="size-4" />
            </Button>
          </div>
        )}
        <div className="flex items-end gap-1 rounded-[26px] border bg-background px-2 py-2 shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
          <input id="project-chat-media" className="hidden" type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" onChange={(event) => { void uploadMedia(event.currentTarget.files); event.currentTarget.value = ""; }} />
          <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0 rounded-full" disabled={uploading} asChild><label htmlFor="project-chat-media" aria-label="Attach media"><Paperclip /></label></Button>
          <Controller control={form.control} name="body" render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="min-w-0 flex-1"><FieldLabel htmlFor={field.name} className="sr-only">Message</FieldLabel><Textarea {...field} id={field.name} rows={1} aria-invalid={fieldState.invalid} className="max-h-32 min-h-9 resize-none border-0 bg-transparent py-2 shadow-none focus-visible:ring-0" placeholder={uploading ? "Uploading..." : "Message project members..."} disabled={uploading} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void form.handleSubmit(send)(); } }} />{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</Field>
          )} />
          <Button type="submit" size="icon" className="size-9 shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground" disabled={form.formState.isSubmitting || uploading || (!messageBody?.trim() && attachments.length === 0)} aria-label="Send message"><Send className="size-4" /></Button>
        </div>
      </form>
    </section>
  );
}
