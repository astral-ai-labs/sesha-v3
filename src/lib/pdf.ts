// lib/pdf.ts
import puppeteer from "puppeteer";

/**
 * Generate PDF from HTML string
 */
export async function generatePDFBuffer(html: string): Promise<Uint8Array> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    margin: { top: "1in", bottom: "1in", left: "1in", right: "1in" },
    printBackground: true,
  });

  await browser.close();
  return Buffer.from(pdfBuffer);
}
