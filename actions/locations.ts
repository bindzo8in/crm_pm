"use server";

import { auth } from "@/lib/auth";
import { ActionResponse, errorResponse, successResponse } from "@/lib/action-response";
import { env } from "@/lib/env";
import { isOrganizationSetupOwner } from "@/lib/organization-setup-access";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";
import countriesData from "../data/countries.json";
import statesData from "../data/states.json";

export interface LocationItem {
  id: number;
  name: string;
  code?: string;
}

export interface MapPlaceResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

const mapPlaceSearchSchema = z.string().trim().min(2).max(160);
const nominatimPlaceSchema = z.array(
  z.object({
    place_id: z.number(),
    lat: z.string(),
    lon: z.string(),
    display_name: z.string(),
    name: z.string().nullable().optional(),
  }),
);

let placeSearchRequestQueue: Promise<void> = Promise.resolve();
let lastPlaceProviderRequestAt = 0;

function fetchPlaceSearch(url: URL) {
  const request = placeSearchRequestQueue.then(async () => {
    const waitMs = Math.max(0, 1000 - (Date.now() - lastPlaceProviderRequestAt));
    if (waitMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
    }

    lastPlaceProviderRequestAt = Date.now();
    return fetch(url, {
      headers: {
        "User-Agent": `${env.NEXT_PUBLIC_APP_NAME}/1.0 (${env.NEXT_PUBLIC_SITE_URL})`,
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 86400 },
    });
  });
  placeSearchRequestQueue = request.then(
    () => undefined,
    () => undefined,
  );
  return request;
}

export async function searchMapPlaces(
  rawQuery: string,
): Promise<ActionResponse<MapPlaceResult[]>> {
  const parsedQuery = mapPlaceSearchSchema.safeParse(rawQuery);
  if (!parsedQuery.success) {
    return errorResponse("Enter at least 2 characters to search for a place.");
  }

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const organizationId = session?.session.activeOrganizationId;
  if (!session?.user || !organizationId) {
    return errorResponse("Sign in and select an organization to search places.");
  }

  const membership = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: session.user.id,
      },
    },
    select: { role: true },
  });
  if (!isOrganizationSetupOwner(membership?.role)) {
    return errorResponse("Only the organization owner can search setup locations.");
  }

  const searchUrl = new URL(
    `${env.PLACE_SEARCH_BASE_URL.replace(/\/+$/, "")}/search`,
  );
  searchUrl.searchParams.set("q", parsedQuery.data);
  searchUrl.searchParams.set("format", "jsonv2");
  searchUrl.searchParams.set("limit", "5");
  searchUrl.searchParams.set("addressdetails", "1");

  try {
    const response = await fetchPlaceSearch(searchUrl);
    if (!response.ok) {
      console.error("Place search provider returned an error.", {
        status: response.status,
      });
      return errorResponse("Place search is temporarily unavailable. Try again.");
    }

    const results = nominatimPlaceSchema.safeParse(await response.json());
    if (!results.success) {
      console.error("Place search provider returned an invalid response.");
      return errorResponse("Place search returned invalid results. Try again.");
    }

    const places = results.data.flatMap((result): MapPlaceResult[] => {
      const latitude = Number(result.lat);
      const longitude = Number(result.lon);
      if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        return [];
      }

      const name =
        result.name?.trim() || result.display_name.split(",")[0]?.trim();
      return name
        ? [{
            id: String(result.place_id),
            name,
            address: result.display_name,
            latitude,
            longitude,
          }]
        : [];
    });

    return successResponse("Places searched.", places);
  } catch (error) {
    console.error("Could not search for map places.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return errorResponse("Place search is temporarily unavailable. Try again.");
  }
}

export async function getCountries(query: string = ""): Promise<ActionResponse<LocationItem[]>> {
  try {
    const q = query.toLowerCase().trim();
    const filtered = q
      ? (countriesData as any[]).filter((c: any) => c.name.toLowerCase().includes(q))
      : (countriesData as any[]);

    const list = filtered.slice(0, 40).map((c: any) => ({
      id: c.id,
      name: c.name,
      code: c.iso2,
    }));

    return successResponse("Countries fetched", list);
  } catch (error) {
    console.error("Error fetching countries:", error);
    return successResponse("Fallback countries", []);
  }
}

export async function getStates(
  query: string = "",
  countryNameOrCode?: string
): Promise<ActionResponse<LocationItem[]>> {
  try {
    const q = query.toLowerCase().trim();
    const cInput = countryNameOrCode ? countryNameOrCode.toLowerCase().trim() : null;

    let filtered = statesData as any[];

    if (cInput) {
      const matchedCountry = (countriesData as any[]).find(
        (c: any) => c.iso2.toLowerCase() === cInput || c.name.toLowerCase() === cInput
      );
      if (matchedCountry) {
        filtered = filtered.filter(
          (s: any) =>
            s.country_id === matchedCountry.id ||
            s.country_code.toLowerCase() === matchedCountry.iso2.toLowerCase()
        );
      }
    }

    if (q) {
      filtered = filtered.filter((s: any) => s.name.toLowerCase().includes(q));
    }

    const list = filtered.slice(0, 50).map((s: any) => ({
      id: s.id,
      name: s.name,
      code: s.country_code,
    }));

    return successResponse("States fetched", list);
  } catch (error) {
    console.error("Error fetching states:", error);
    return successResponse("Fallback states", []);
  }
}
