import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";
import { NextRequest } from "next/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

// Find a locally-installed Chrome for development.
// Returns undefined if not found (will fall back to sparticuz in prod).
async function getLocalChromePath(): Promise<string | undefined> {
  const { execSync } = await import("child_process");
  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        ]
      : process.platform === "darwin"
        ? [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
          ]
        : ["/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/usr/bin/chromium"];

  const { existsSync } = await import("fs");
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }

  // Try `which` on unix
  try {
    const result = execSync("which google-chrome || which chromium", { encoding: "utf8" }).trim();
    if (result) return result.split("\n")[0];
  } catch {
    // ignore
  }

  return undefined;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Build the URL Puppeteer will navigate to.
  // In production NEXT_PUBLIC_BASE_URL must be set (e.g. https://your-app.vercel.app).
  // Locally it defaults to localhost:3000.
  const baseUrl =
    env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const targetUrl = `${baseUrl}/p/${id}?pdf=1`;

  let executablePath: string;
  let browser;

  try {
    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
      // In local development use installed Chrome so there is no download delay.
      const localChrome = await getLocalChromePath();
      if (!localChrome) {
        return new Response(
          JSON.stringify({ error: "No local Chrome found. Install Google Chrome to generate PDFs in dev." }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      executablePath = localChrome;
      browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    } else {
      // Production: download Chromium from the remote URL at runtime.
      // This avoids Vercel's 50 MB function bundle size limit.
      const remoteExecPath = env.CHROMIUM_REMOTE_EXEC_PATH;
      if (!remoteExecPath) {
        return new Response(
          JSON.stringify({ error: "CHROMIUM_REMOTE_EXEC_PATH env variable is not set." }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      executablePath = await chromium.executablePath(remoteExecPath);
      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath,
        headless: true,
      });
    }

    const page = await browser.newPage();

    // Set viewport to exact A4 width at 96dpi so the renderer uses the right layout.
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    // Navigate and wait until all network requests (fonts, images) have settled.
    await page.goto(targetUrl, { waitUntil: "networkidle0", timeout: 30_000 });

    // Give JS components a moment to finish any client-side hydration.
    await new Promise((resolve) => setTimeout(resolve, 500));

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      // No explicit margin — CSS @page rules in proposal-renderer.css handle margins:
      //   @page              { margin: 20mm 0 }  → all pages including continuation pages
      //   @page cover-page   { margin: 0 }       → cover stays full-bleed
      // This ensures continuation pages (auto-broken by Chromium) also get the top margin.
    });

    await browser.close();

    // Use pdf-lib to add page numbers starting from 1 after the cover page
    const { PDFDocument, rgb } = require("pdf-lib");
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    
    // Start looping from index 1 (skip the cover page)
    for (let i = 1; i < pages.length; i++) {
      const p = pages[i];
      const { width, height } = p.getSize();
      
      p.drawText(`Page ${i}`, {
        x: width - 56.7, // roughly 20mm from right edge
        y: 28.35,        // 10mm from bottom edge
        size: 9,
        color: rgb(0.42, 0.45, 0.50), // #6b7280 (gray-500) equivalent
      });
    }

    const modifiedPdfBytes = await pdfDoc.save();

    // page.pdf() returns a Uint8Array in puppeteer v25+; wrap in a Node.js
    // Buffer so it is a valid BodyInit for the Response constructor.
    const pdfBody = Buffer.from(modifiedPdfBytes);

    return new Response(pdfBody, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="proposal-${id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[PDF] generation failed:", err);
    // Ensure browser is closed even on error
    try {
      await browser?.close();
    } catch {
      // ignore
    }
    return new Response(
      JSON.stringify({ error: "PDF generation failed. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
