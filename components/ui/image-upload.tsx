"use client"

import { CldUploadWidget, type CloudinaryUploadWidgetResults } from "next-cloudinary"
import { ImagePlus, Trash } from "lucide-react"
import { Button } from "./button"
import { useEffect, useState } from "react"
import { env } from "@/lib/env"

interface ImageUploadProps {
  value: { url: string; publicId: string } | null
  onChange: (value: { url: string; publicId: string } | null) => void
  disabled?: boolean
}

export function ImageUpload({ disabled, onChange, value }: ImageUploadProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  const handleSuccess = (result: CloudinaryUploadWidgetResults) => {
    if (result.info && typeof result.info === "object") {
      onChange({
        url: result.info.secure_url,
        publicId: result.info.public_id,
      })
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        {value?.url && (
          <div className="relative h-[200px] w-[200px] overflow-hidden rounded-md border">
            <div className="absolute top-2 right-2 z-10">
              <Button type="button" onClick={() => onChange(null)} variant="destructive" size="icon">
                <Trash className="h-4 w-4" />
              </Button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="object-cover w-full h-full" alt="Image" src={value.url} />
          </div>
        )}
      </div>

      {!value?.url && (
        <CldUploadWidget
          uploadPreset={env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
          options={{
            singleUploadAutoClose: true,
            multiple: false,
          }}
          onSuccess={handleSuccess}
          onError={(error) => {
            console.error("Cloudinary upload error:", error)
          }}
          onOpen={() => {
            // Your Dialog sets pointer-events: none on <body> while open.
            // The Cloudinary widget iframe is appended to <body> as a sibling,
            // outside the Dialog's DOM, so it inherits that and becomes unclickable.
            // Force it back on for as long as the widget is up.
            document.body.style.pointerEvents = "auto"
          }}
          onClose={() => {
            // Hand control back to the Dialog so its modal behavior is restored.
            document.body.style.removeProperty("pointer-events")
          }}
        >
          {({ open }) => {
            const onClick = () => {
              if (disabled) return
              open()
            }

            return (
              <Button
                type="button"
                disabled={disabled}
                variant="secondary"
                onClick={onClick}
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                Upload an Image
              </Button>
            )
          }}
        </CldUploadWidget>
      )}
    </div>
  )
}