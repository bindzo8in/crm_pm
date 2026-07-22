import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";
import { NextRequest } from "next/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  const baseUrl = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const targetUrl = `${baseUrl}/i/${id}?pdf=1`;

  let executablePath: string;
  let browser;

  try {
    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
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

    await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
    await page.goto(targetUrl, { waitUntil: "networkidle0", timeout: 30_000 });

    await page.waitForSelector(".pdf-renderer-document", { timeout: 10_000 }).catch(() => {});

    await page.addStyleTag({
      content: `
        @page {
          size: A4 portrait;
          margin: 6mm;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          -webkit-print-color-adjust: exact;
        }
        .pdf-renderer-document {
          padding: 0 !important;
          margin: 0 !important;
          background: white !important;
        }
        #invoice-printable-card {
          padding: 1rem !important;
          border: none !important;
          box-shadow: none !important;
        }
      `,
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: "6mm", bottom: "6mm", left: "6mm", right: "6mm" },
    });

    await browser.close();

    return new Response(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[PDF] generation failed:", err);
    try {
      await browser?.close();
    } catch {}
    return new Response(
      JSON.stringify({ error: "PDF generation failed", details: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
