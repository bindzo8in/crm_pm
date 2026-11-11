"use client";

import Image from "next/image";
import { Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceNotePlayer } from "@/components/chat/voice-note-player";

export type ChatMediaItem = {
  id: string;
  url: string;
  publicId: string;
  resourceType: "IMAGE" | "VIDEO" | "AUDIO" | "RAW" | string;
  mimeType: string;
  fileName: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  duration: number | null;
};

function fileSizeLabel(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatMedia({ items, compact = false }: { items: ChatMediaItem[]; compact?: boolean }) {
  if (!items.length) return null;
  return (
    <div className={cn("mt-2 grid w-full gap-2", items.length > 1 && "grid-cols-1 sm:grid-cols-2")}>
      {items.map((item) => {
        const isImage = item.resourceType === "IMAGE" || item.mimeType.startsWith("image/");
        const isVideo = item.resourceType === "VIDEO" || item.mimeType.startsWith("video/");
        const isAudio = item.resourceType === "AUDIO" || item.mimeType.startsWith("audio/");

        if (isImage) {
          return (
            <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="group relative block aspect-[4/5] w-full max-w-[280px] overflow-hidden rounded-xl border bg-muted">
              <Image src={item.url} alt={item.fileName} fill sizes={compact ? "280px" : "(max-width: 768px) 75vw, 320px"} className="object-contain transition-transform duration-300 group-hover:scale-[1.01]" />
            </a>
          );
        }
        if (isVideo) {
          return (
            <div key={item.id} className="w-full max-w-[280px] overflow-hidden rounded-xl border bg-black">
              <video controls preload="metadata" className="max-h-72 w-full" aria-label={item.fileName}>
                <source src={item.url} type={item.mimeType} />
              </video>
            </div>
          );
        }
        if (isAudio) {
          const audioUrl = item.resourceType === "RAW"
            ? `/api/chat/attachments/${encodeURIComponent(item.id)}/download?inline=1`
            : item.url;
          return (
            <VoiceNotePlayer
              key={item.id}
              src={audioUrl}
              mimeType={item.mimeType}
              fileName={item.fileName}
              duration={item.duration}
              downloadHref={`/api/chat/attachments/${encodeURIComponent(item.id)}/download`}
            />
          );
        }
        return (
          <a
            key={item.id}
            href={`/api/chat/attachments/${encodeURIComponent(item.id)}/download`}
            download={item.fileName}
            className="flex items-center gap-3 rounded-xl border bg-background/70 p-3 transition-colors hover:bg-background"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted"><FileText className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{item.fileName}</span>
              <span className="text-xs text-muted-foreground">{fileSizeLabel(item.fileSize)}</span>
            </span>
            <Download className="size-4 shrink-0 text-muted-foreground" />
          </a>
        );
      })}
    </div>
  );
}
