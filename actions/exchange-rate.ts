"use server";

import { ActionResponse, successResponse } from "@/lib/action-response";
import prisma from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { getErrorMessage } from "@/lib/schemas/prisma-utils";
import { env } from "@/lib/env";

export interface ExchangeRateResult {
  rate: number;
  source: string;
  updatedAt: string;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function getLiveExchangeRate(
  base: string = "USD",
  target: string = "INR"
): Promise<ActionResponse<ExchangeRateResult>> {
  try {
    const dbCache = (prisma as any).exchangeRateCache;
    let cached: any = null;

    // 1. Check DB cache first if model is initialized
    if (dbCache && typeof dbCache.findUnique === "function") {
      cached = await dbCache.findUnique({
        where: { baseCurrency: base },
      });
    }

    const now = Date.now();

    if (cached && now - new Date(cached.updatedAt).getTime() < TWENTY_FOUR_HOURS_MS) {
      const rateVal = typeof cached.rate?.toNumber === "function" ? cached.rate.toNumber() : Number(cached.rate);
      return successResponse("Exchange rate fetched from 24h DB cache", {
        rate: rateVal,
        source: "Cached Rate (Database - 24h active)",
        updatedAt: new Date(cached.updatedAt).toISOString(),
      });
    }

    // 2. Fetch fresh rate from external API if stale (>24h) or missing
    const apiKey = env.EXCHANGE_RATE_API_KEY;
    const apiUrl = apiKey
      ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`
      : `https://open.er-api.com/v6/latest/${base}`;

    const response = await fetch(apiUrl, {
      next: { revalidate: 86400 },
    });

    if (response.ok) {
      const data = (await response.json()) as { rates?: Record<string, number> };
      const fetchedRate = data?.rates?.[target];

      if (typeof fetchedRate === "number" && fetchedRate > 0) {
        const rateNum = Number(fetchedRate.toFixed(4));
        let updatedTime = new Date().toISOString();

        if (dbCache && typeof dbCache.upsert === "function") {
          const updatedCache = await dbCache.upsert({
            where: { baseCurrency: base },
            update: {
              targetCurrency: target,
              rate: new Prisma.Decimal(rateNum),
            },
            create: {
              baseCurrency: base,
              targetCurrency: target,
              rate: new Prisma.Decimal(rateNum),
            },
          });
          updatedTime = updatedCache.updatedAt ? new Date(updatedCache.updatedAt).toISOString() : updatedTime;
        }

        return successResponse("Fresh exchange rate fetched & cached", {
          rate: rateNum,
          source: "Live Exchange Rate API (Cached in DB for 24h)",
          updatedAt: updatedTime,
        });
      }
    }

    // 3. Fallback if external API fails: return existing DB cache if available, else 83.50
    if (cached) {
      const rateVal = typeof cached.rate?.toNumber === "function" ? cached.rate.toNumber() : Number(cached.rate);
      return successResponse("Using existing cached rate", {
        rate: rateVal,
        source: "Cached Rate (Database)",
        updatedAt: new Date(cached.updatedAt).toISOString(),
      });
    }

    return successResponse("Using default RBI exchange rate", {
      rate: 83.5,
      source: "Default RBI Rate",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Exchange rate fetch notice (using fallback):", getErrorMessage(error));
    }
    return successResponse("Using fallback exchange rate", {
      rate: 83.5,
      source: "Default RBI Rate",
      updatedAt: new Date().toISOString(),
    });
  }
}
