"use server";

import { ActionResponse, successResponse } from "@/lib/action-response";
import countriesData from "@/data/countries.json";
import statesData from "@/data/states.json";

export interface LocationItem {
  id: number;
  name: string;
  code?: string;
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
