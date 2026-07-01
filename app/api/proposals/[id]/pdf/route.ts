import { NextResponse } from "next/server";
import puppeteer from "puppeteer";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Determine the base URL dynamically based on the request URL
    const { origin } = new URL(request.url);
    const targetUrl = `${origin}/dashboard/proposals/${id}/preview`;

    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1536, height: 1024 });

    // Navigate to the preview page and wait for network idle to ensure everything is loaded (fonts, images)
    await page.goto(targetUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Generate the PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0',
        bottom: '0',
        left: '0',
        right: '0'
      }
    });

    await browser.close();

    return new Response(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="proposal-${id}.pdf"`
      }
    });

  } catch (error) {
    console.error("PDF Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
