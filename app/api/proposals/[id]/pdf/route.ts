import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";
import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import prisma from "@/lib/prisma";
import { PDFDocument, rgb } from "pdf-lib";
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

  // Fetch company data to build the footer
  const company = await prisma.company.findFirst();

  // Parse logo JSON if present
  let logoUrl: string | null = null;
  if (company?.logo) {
    try {
      const logoData = typeof company.logo === "string"
        ? JSON.parse(company.logo)
        : company.logo as { url?: string };
      logoUrl = logoData?.url ?? null;
    } catch {
      // ignore parse error
    }
  }

  const companyName = company?.displayName || company?.legalName || "";
  const websiteRaw = company?.website || "";
  const websiteDisplay = websiteRaw.replace(/^https?:\/\//, "");

  // Pre-fetch logo as ArrayBuffer for pdf-lib embedding.
  // pdf-lib uses binary data directly — no base64 or external URLs needed.
  let logoBuffer: ArrayBuffer | null = null;
  let logoMimeType = "image/png";
  if (logoUrl) {
    try {
      const imgRes = await fetch(logoUrl);
      logoMimeType = imgRes.headers.get("content-type") || "image/png";
      logoBuffer = await imgRes.arrayBuffer();
    } catch {
      // logo fetch failed — footer will show text only
    }
  }

  // Build the URL Puppeteer will navigate to.
  const baseUrl = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
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
    
    // ── DEBUG: Forward browser console logs to the Node terminal ──
    page.on('console', (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()} - ${msg.text()}`);
    });
    page.on('pageerror', (err:any) => {
      console.error(`[BROWSER ERROR] ${err.toString()}`);
    });

    console.log(`[PDF] Setting viewport...`);
    // Set a large viewport to prevent a vertical scrollbar from reducing the 
    // available width. This eliminates the horizontal overflow that causes 
    // Chromium to generate a blank ghost page at the end of the document.
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 1 });

    console.log(`[PDF] Navigating to ${targetUrl}...`);
    // Navigate and wait until all network requests (fonts, images) have settled.
    await page.goto(targetUrl, { waitUntil: "networkidle0", timeout: 30_000 });
    console.log(`[PDF] Navigation complete.`);

    console.log(`[PDF] Waiting for .pdf-renderer-document...`);
    // Explicitly wait for the proposal document to render to avoid hydration race conditions.
    // ProposalPdfRenderer uses "pdf-renderer-document" as its root class.
    await page.waitForSelector(".pdf-renderer-document", { timeout: 10_000 }).catch(() => {
      console.log(`[PDF] waitForSelector timeout, proceeding anyway.`);
    });
    console.log(`[PDF] .pdf-renderer-document found.`);

    // ── CRITICAL: Reset html/body margin before printing ──────────────────
    // Chromium's default body margin (8px) creates trailing whitespace that
    // overflows the last page boundary and generates a ghost blank page.
    // This must be injected AFTER page load so it overrides any framework CSS.
    // NOTE: We do NOT set overflow:hidden here — that can clip tall content
    //       pages (pricing tables, long terms) in edge cases. The margin reset
    //       alone is sufficient to eliminate the ghost page.
    await page.addStyleTag({
      content: `
        html, body {
          margin: 0 !important;
          padding: 0 !important;
        }
      `,
    });

    // Detect exact number of cover and signature pages to accurately
    // skip them when stamping page numbers via pdf-lib.
    const { coverPageCount, signaturePageCount } = await page.evaluate(() => {
      return {
        coverPageCount: document.querySelectorAll(".pdf-cover-page").length,
        signaturePageCount: document.querySelectorAll(".pdf-signature-page").length
      };
    });
    console.log(`[PDF] Pages detected: ${coverPageCount} cover, ${signaturePageCount} signature`);

    console.log(`[PDF] Generating PDF buffer...`);
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });
    console.log(`[PDF] PDF generated successfully. Buffer size: ${pdfBuffer.length} bytes.`);

    await browser.close();

    // ── Post-process PDF to stamp page numbers ───────────────────────────────
    // The visual footer is rendered natively via CSS position: fixed, but 
    // page numbers must be stamped post-render to ensure they are correct
    // and skip the cover and signature pages.
    console.log(`[PDF] Stamping page numbers...`);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    
    // Start after cover pages, end before signature pages
    for (let i = coverPageCount; i < pages.length - signaturePageCount; i++) {
      const page = pages[i];
      // Format: "1 / X" where X is total content pages
      const totalContentPages = pages.length - coverPageCount - signaturePageCount;
      const currentPage = i - coverPageCount + 1;
      const text = `${currentPage} / ${totalContentPages}`;
      
      page.drawText(text, {
        x: page.getWidth() - 110, // right aligned
        y: 28, // 10mm from bottom (inside the 20mm footer)
        size: 8,
        color: rgb(0.419, 0.447, 0.501), // #6b7280 (gray-500) matching CSS
      });
    }

    const finalPdfBytes = await pdfDoc.save();

    return new Response(Buffer.from(finalPdfBytes), {
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
      JSON.stringify({ error: "PDF generation failed", details: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
