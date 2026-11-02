"use client";

import { useState, type PointerEvent } from "react";
import { Eraser, ImagePlus, PenLine, Type } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { uploadImageToServer } from "@/lib/upload-client";
import type { ClientProposalSignature } from "@/lib/schemas/public-proposal-schema";

export type ClientSignatureData = ClientProposalSignature;

type SignatureMode = "upload" | "draw" | "type";
type Point = { x: number; y: number };
type Stroke = Point[];

const SIGNATURE_WIDTH = 600;
const SIGNATURE_HEIGHT = 180;

function getPoint(event: PointerEvent<SVGSVGElement>): Point {
  const bounds = event.currentTarget.getBoundingClientRect();
  return {
    x: ((event.clientX - bounds.left) / bounds.width) * SIGNATURE_WIDTH,
    y: ((event.clientY - bounds.top) / bounds.height) * SIGNATURE_HEIGHT,
  };
}

function getStrokePath(stroke: Stroke) {
  return stroke
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

async function createSignatureFile(strokes: Stroke[]) {
  const paths = strokes
    .map((stroke) => `<path d="${getStrokePath(stroke)}" />`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIGNATURE_WIDTH}" height="${SIGNATURE_HEIGHT}" viewBox="0 0 ${SIGNATURE_WIDTH} ${SIGNATURE_HEIGHT}"><g fill="none" stroke="#111827" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
  const imageUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));

  try {
    const image = new Image();
    image.src = imageUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = SIGNATURE_WIDTH * 2;
    canvas.height = SIGNATURE_HEIGHT * 2;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare your signature image.");

    context.scale(2, 2);
    context.drawImage(image, 0, 0, SIGNATURE_WIDTH, SIGNATURE_HEIGHT);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("Could not create your signature image."));
      }, "image/png");
    });

    return new File([blob], "signature.png", { type: "image/png" });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function ClientSignatureInput({
  proposalId,
  value,
  onChange,
}: {
  proposalId: string;
  value: ClientSignatureData | null;
  onChange: (signature: ClientSignatureData | null) => void;
}) {
  const [mode, setMode] = useState<SignatureMode>("upload");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [signerName, setSignerName] = useState("");
  const [isUploadingDrawing, setIsUploadingDrawing] = useState(false);

  const changeMode = (nextMode: SignatureMode) => {
    setMode(nextMode);
    onChange(null);
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    const point = getPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    onChange(null);
    setStrokes((current) => [...current, [point]]);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = getPoint(event);
    setStrokes((current) => {
      const next = [...current];
      const lastStroke = next.at(-1);
      if (lastStroke) next[next.length - 1] = [...lastStroke, point];
      return next;
    });
  };

  const saveDrawing = async () => {
    if (strokes.length === 0) return;

    setIsUploadingDrawing(true);
    try {
      const file = await createSignatureFile(strokes);
      const asset = await uploadImageToServer(file, "proposal-signature", {
        ownerId: proposalId,
      });
      onChange({ method: "DRAWN", url: asset.url, publicId: asset.publicId });
      toast.success("Signature saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your signature.");
    } finally {
      setIsUploadingDrawing(false);
    }
  };

  const modes: Array<{ value: SignatureMode; label: string; icon: typeof ImagePlus }> = [
    { value: "upload", label: "Upload", icon: ImagePlus },
    { value: "draw", label: "Draw", icon: PenLine },
    { value: "type", label: "Type", icon: Type },
  ];

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-label="Choose a signature method"
        className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
      >
        {modes.map(({ value: modeValue, label, icon: Icon }) => (
          <button
            key={modeValue}
            type="button"
            aria-pressed={mode === modeValue}
            onClick={() => changeMode(modeValue)}
            className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {mode === "upload" && (
        <div
          id="signature-panel-upload"
          aria-label="Upload a signature image"
          className="space-y-2"
        >
          <ImageUpload
            value={value && "url" in value ? value : null}
            onChange={(image) => {
              onChange(image ? { ...image, method: "IMAGE" } : null);
            }}
            scope="proposal-signature"
            ownerId={proposalId}
          />
          <p className="text-xs text-muted-foreground">
            Upload a clear JPG, PNG, or WebP image, up to 10 MB.
          </p>
        </div>
      )}

      {mode === "draw" && (
        <div
          id="signature-panel-draw"
          aria-label="Draw a signature"
          className="space-y-3"
        >
          <div className="overflow-hidden rounded-lg border bg-white">
            <svg
              viewBox={`0 0 ${SIGNATURE_WIDTH} ${SIGNATURE_HEIGHT}`}
              role="img"
              aria-label="Draw your signature in this box"
              className="h-32 w-full touch-none cursor-crosshair"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
              }}
              onPointerCancel={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
              }}
            >
              {strokes.map((stroke, index) => (
                <path
                  key={index}
                  d={getStrokePath(stroke)}
                  fill="none"
                  stroke="#111827"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </svg>
          </div>
          <p className="text-xs text-muted-foreground">
            Draw with your finger, stylus, or mouse.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={strokes.length === 0 || isUploadingDrawing}
              onClick={() => {
                setStrokes([]);
                onChange(null);
              }}
            >
              <Eraser aria-hidden="true" />
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={strokes.length === 0 || isUploadingDrawing}
              onClick={() => void saveDrawing()}
            >
              {isUploadingDrawing ? "Saving..." : "Use this signature"}
            </Button>
          </div>
          {value?.method === "DRAWN" && (
            <p role="status" className="text-sm font-medium text-green-700">
              Signature ready
            </p>
          )}
        </div>
      )}

      {mode === "type" && (
        <div
          id="signature-panel-type"
          aria-label="Type a signature"
          className="space-y-3"
        >
          <label htmlFor="typed-signature-name" className="text-sm font-medium">
            Type your full name
          </label>
          <Input
            id="typed-signature-name"
            autoComplete="name"
            maxLength={120}
            value={signerName}
            onChange={(event) => {
              const name = event.target.value;
              setSignerName(name);
              onChange(name.trim().length >= 2 ? { method: "TYPED", name } : null);
            }}
            placeholder="Your full name"
          />
          {signerName.trim() && (
            <div className="rounded-lg border bg-white px-4 py-3" aria-label="Signature preview">
              <p className="font-serif text-2xl italic text-slate-900">{signerName.trim()}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Your typed name will be recorded as your electronic signature.
          </p>
        </div>
      )}
    </div>
  );
}
