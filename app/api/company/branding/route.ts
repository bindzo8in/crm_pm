import prisma from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

function getPublicImageUrl(value: Prisma.JsonValue | null): string | null {
  let image: unknown = value;

  if (typeof image === "string") {
    try {
      image = JSON.parse(image);
    } catch {
      return null;
    }
  }

  if (
    typeof image !== "object" ||
    image === null ||
    Array.isArray(image) ||
    !("url" in image) ||
    typeof image.url !== "string"
  ) {
    return null;
  }

  const url = image.url.trim();
  if (url.startsWith("/") && !url.startsWith("//")) return url;

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:"
      ? url
      : null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const company = await prisma.company.findFirst({
      select: {
        logo: true,
        darkLogo: true,
      },
    });

    return Response.json(
      { logoUrl: getPublicImageUrl(company?.logo ?? null) ?? getPublicImageUrl(company?.darkLogo ?? null) },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("Failed to load public company branding:", error);
    return Response.json(
      { error: "Company branding could not be loaded" },
      { status: 500 },
    );
  }
}
