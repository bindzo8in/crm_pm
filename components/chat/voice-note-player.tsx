"use client";

import { useRef, useState } from "react";
import { AudioLines, Download, Pause, Play } from "lucide-react";

function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

export function VoiceNotePlayer({
  src,
  mimeType,
  fileName,
  duration: initialDuration,
  downloadHref,
}: {
  src: string;
  mimeType: string;
  fileName: string;
  duration: number | null;
  downloadHref: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration ?? 0);
  const [hasError, setHasError] = useState(false);
  const playableDuration = duration || initialDuration || 0;

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || hasError) return;

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch {
      setIsPlaying(false);
      setHasError(true);
    }
  }

  return (
    <div className="flex w-[min(320px,70vw)] max-w-full items-center gap-3 rounded-xl border bg-background/80 px-3 py-2.5">
      <audio
        ref={audioRef}
        preload="metadata"
        className="sr-only"
        aria-hidden="true"
        onLoadedMetadata={(event) => {
          if (Number.isFinite(event.currentTarget.duration)) {
            setDuration(event.currentTarget.duration);
          }
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => {
          setIsPlaying(false);
          setHasError(true);
        }}
      >
        <source src={src} type={mimeType.split(";")[0].trim()} />
      </audio>

      {hasError ? (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <AudioLines className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            Voice note unavailable
          </span>
          <a
            href={downloadHref}
            download={fileName}
            aria-label={`Download ${fileName}`}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Download className="size-4" aria-hidden="true" />
          </a>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => void togglePlayback()}
            aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isPlaying
              ? <Pause className="size-4 fill-current" aria-hidden="true" />
              : <Play className="ml-0.5 size-4 fill-current" aria-hidden="true" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">Voice note</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {formatTime(currentTime)} / {playableDuration ? formatTime(playableDuration) : "--:--"}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(playableDuration, 1)}
              step={0.1}
              value={Math.min(currentTime, Math.max(playableDuration, 1))}
              aria-label="Seek voice note"
              disabled={!playableDuration}
              onChange={(event) => {
                const nextTime = Number(event.currentTarget.value);
                if (audioRef.current) audioRef.current.currentTime = nextTime;
                setCurrentTime(nextTime);
              }}
              className="block h-1.5 w-full cursor-pointer accent-primary disabled:cursor-default"
            />
          </div>
          <AudioLines className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </>
      )}
    </div>
  );
}
