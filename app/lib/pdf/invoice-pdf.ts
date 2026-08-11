import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

/**
 * Generic invoice/receipt layout shared by both retail sales and
 * tailor order invoices — same approach proven in the Rayan Solutions
 * travel agency project. Each caller supplies a title, party details,
 * and line items; the header/footer/table chrome stays consistent.
 */

export interface InvoicePdfLineItem {
  label: string;
  detail?: string;
  amount: number;
}

export interface InvoicePdfInput {
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  shopEmail?: string;
  logoUrl?: string;

  documentTypeLabel: string; // "Sales Receipt", "Tailor Order Invoice"
  documentNo: string;
  documentDate: string;
  status: string;

  partyLabel: string; // "Customer"
  partyName: string;
  partyPhone?: string;
  partyEmail?: string;

  fields: { label: string; value: string }[];
  lineItems: InvoicePdfLineItem[];
  subtotal?: number;
  discount?: number;
  taxAmount?: number;
  totalAmount: number;
  amountPaid?: number;
  balanceDue?: number;
  notes?: string;
  currencyCode?: string;
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;

function money(n: number, currencyCode?: string) {
  const formatted = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currencyCode ? `${currencyCode} ${formatted}` : formatted;
}

function pdfText(value: string | number | null | undefined) {
  return String(value ?? "").replace(/[^\x20-\x7E]/g, "?");
}

export async function generateInvoicePdf(input: InvoicePdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const slate900 = rgb(0.06, 0.09, 0.16);
  const slate600 = rgb(0.28, 0.34, 0.45);
  const slate400 = rgb(0.58, 0.64, 0.72);
  const slate100 = rgb(0.95, 0.96, 0.97);
  const emerald700 = rgb(0.02, 0.4, 0.34);
  const emerald50 = rgb(0.92, 0.98, 0.96);
  const amber700 = rgb(0.57, 0.25, 0.02);
  const amber50 = rgb(1, 0.97, 0.9);

  const drawWrapped = (text: string, x: number, startY: number, maxWidth: number, size: number, fontFace = font, color = slate900) => {
    const safeText = pdfText(text);
    const words = safeText.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (fontFace.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
      else if (line) { lines.push(line); line = word; }
      else lines.push(word.slice(0, Math.max(1, Math.floor(maxWidth / (size * 0.55)))));
    }
    if (line) lines.push(line);
    lines.forEach((value, index) => page.drawText(pdfText(value), { x, y: startY - index * (size + 3), size, font: fontFace, color }));
    return Math.max(1, lines.length) * (size + 3);
  };

  // Try remote logo first, then fall back to local public logo files if configured or available
  let logoEmbedded = false;
  if (input.logoUrl) {
    try {
      const response = await fetch(input.logoUrl);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const image = /\.jpe?g($|\?)/i.test(input.logoUrl) ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes);
      page.drawImage(image, { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 42, width: 42, height: 42 });
      logoEmbedded = true;
    } catch {
      // continue to local fallback
    }
  }

  if (!logoEmbedded) {
    const candidates = [
      path.join(process.cwd(), "app", "public", "rayan-logo.png"),
      path.join(process.cwd(), "public", "rayan-logo.png"),
      path.join(process.cwd(), "app", "public", "logo.png"),
      path.join(process.cwd(), "public", "logo.png"),
    ];
    for (const pth of candidates) {
      try {
        const file = await fs.readFile(pth);
        const bytes = new Uint8Array(file.buffer);
        // detect by extension
        const image = /\.jpe?g$/i.test(pth) ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes);
        page.drawImage(image, { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 42, width: 42, height: 42 });
        logoEmbedded = true;
        break;
      } catch {
        // ignore and try next
      }
    }
  }

  function ensureSpace(needed: number) {
    if (y - needed < MARGIN + 60) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  }

  // --- Header ---
  const brandX = logoEmbedded ? MARGIN + 52 : MARGIN;
  page.drawText(pdfText(input.shopName), { x: brandX, y, size: 18, font: fontBold, color: slate900 });
  y -= 16;
  if (input.shopAddress) {
    page.drawText(pdfText(input.shopAddress).slice(0, 90), { x: brandX, y, size: 9, font, color: slate600 });
    y -= 12;
  }
  const contactBits = [input.shopPhone, input.shopEmail].filter(Boolean).join("  ·  ");
  if (contactBits) {
    page.drawText(pdfText(contactBits).slice(0, 90), { x: brandX, y, size: 9, font, color: slate600 });
  }

  const rightX = PAGE_WIDTH - MARGIN;
  let ry = PAGE_HEIGHT - MARGIN;
  const rightText = (str: string, size: number, bold = false, color = slate900) => {
    const safeStr = pdfText(str);
    const f = bold ? fontBold : font;
    const w = f.widthOfTextAtSize(safeStr, size);
    page.drawText(safeStr, { x: rightX - w, y: ry, size, font: f, color });
    ry -= size + 4;
  };
  rightText(input.documentTypeLabel.toUpperCase(), 12, true);
  rightText(`No. ${input.documentNo}`, 10);
  rightText(input.documentDate, 10);
  rightText(input.status.toUpperCase(), 9, false, input.status === "completed" || input.status === "delivered" || input.status === "posted" ? emerald700 : slate400);

  y = Math.min(y, ry) - 20;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color: slate100 });
  y -= 24;

  // --- Party block ---
  page.drawText(pdfText(input.partyLabel.toUpperCase()), { x: MARGIN, y, size: 8, font: fontBold, color: slate400 });
  y -= 14;
  y -= drawWrapped(input.partyName, MARGIN, y, 220, 12, fontBold, slate900);
  y -= 15;
  for (const line of [input.partyPhone, input.partyEmail].filter(Boolean) as string[]) {
    page.drawText(pdfText(line), { x: MARGIN, y, size: 9, font, color: slate600 });
    y -= 12;
  }
  y -= 10;

  // --- Fields grid ---
  if (input.fields.length > 0) {
    const colWidth = (PAGE_WIDTH - 2 * MARGIN) / 3;
    let col = 0;
    let rowStartY = y;
    for (const f of input.fields) {
      const x = MARGIN + col * colWidth;
      if (col === 0) rowStartY = y;
      page.drawText(pdfText(f.label.toUpperCase()), { x, y: rowStartY, size: 7, font: fontBold, color: slate400 });
      drawWrapped(f.value || "-", x, rowStartY - 11, colWidth - 12, 9, font, slate900);
      col++;
      if (col === 3) {
        col = 0;
        y = rowStartY - 30;
      }
    }
    if (col !== 0) y -= 30;
    y -= 10;
  }

  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color: slate100 });
  y -= 20;

  // --- Line items table ---
  page.drawText("DESCRIPTION", { x: MARGIN, y, size: 8, font: fontBold, color: slate400 });
  page.drawText("AMOUNT", { x: PAGE_WIDTH - MARGIN - 90, y, size: 8, font: fontBold, color: slate400 });
  y -= 8;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color: slate100 });
  y -= 16;

  for (const item of input.lineItems) {
    ensureSpace(28);
    page.drawText(pdfText(item.label).slice(0, 55), { x: MARGIN, y, size: 10, font, color: slate900 });
    const amountStr = pdfText(money(item.amount, input.currencyCode));
    const amountW = fontBold.widthOfTextAtSize(amountStr, 10);
    page.drawText(amountStr, { x: PAGE_WIDTH - MARGIN - amountW, y, size: 10, font: fontBold, color: slate900 });
    y -= 13;
    if (item.detail) {
      y -= drawWrapped(item.detail, MARGIN, y, PAGE_WIDTH - 2 * MARGIN - 90, 8, font, slate600);
    }
    y -= 5;
  }

  y -= 6;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color: slate100 });
  y -= 18;

  // --- Subtotal / discount / tax breakdown, if provided ---
  const summaryRow = (label: string, value: number) => {
    ensureSpace(16);
    const valStr = pdfText(money(value, input.currencyCode));
    const valW = font.widthOfTextAtSize(valStr, 9);
    page.drawText(label, { x: PAGE_WIDTH - MARGIN - 190, y, size: 9, font, color: slate600 });
    page.drawText(valStr, { x: PAGE_WIDTH - MARGIN - valW, y, size: 9, font, color: slate900 });
    y -= 14;
  };
  if (input.subtotal !== undefined) summaryRow("Subtotal", input.subtotal);
  if (input.discount) summaryRow("Discount", -input.discount);
  if (input.taxAmount) summaryRow("Tax", input.taxAmount);

  // --- Total ---
  ensureSpace(60);
  page.drawRectangle({ x: PAGE_WIDTH - MARGIN - 190, y: y - 8, width: 190, height: 30, color: emerald50 });
  page.drawText("TOTAL", { x: PAGE_WIDTH - MARGIN - 180, y: y + 2, size: 9, font: fontBold, color: emerald700 });
  const totalStr = pdfText(money(input.totalAmount, input.currencyCode));
  const totalW = fontBold.widthOfTextAtSize(totalStr, 13);
  page.drawText(totalStr, { x: PAGE_WIDTH - MARGIN - 10 - totalW, y: y - 1, size: 13, font: fontBold, color: emerald700 });
  y -= 40;

  // --- Paid / balance due, if provided (tailor orders can be partly paid) ---
  const paidExists = input.amountPaid !== undefined;
  const balanceExists = input.balanceDue !== undefined && input.balanceDue > 0;
  if (paidExists || balanceExists) {
    // Reserve a safe block for paid/balance area
    ensureSpace(80);
    const boxX = PAGE_WIDTH - MARGIN - 190;
    // If paid exists, draw it as a simple right-aligned row above the balance box
    if (paidExists) {
      const paidStr = pdfText(money(input.amountPaid as number, input.currencyCode));
      const paidW = font.widthOfTextAtSize(paidStr, 9);
      page.drawText("Paid", { x: boxX + 8, y: y, size: 9, font: font, color: slate600 });
      page.drawText(paidStr, { x: PAGE_WIDTH - MARGIN - paidW, y: y, size: 9, font: fontBold, color: slate900 });
      y -= 18;
    }

    if (balanceExists) {
      // Balance is emphasized in an amber box
      page.drawRectangle({ x: boxX, y: y - 8, width: 190, height: 36, color: amber50 });
      page.drawText("BALANCE DUE", { x: boxX + 8, y: y + 6, size: 9, font: fontBold, color: amber700 });
      const balStr = pdfText(money(input.balanceDue as number, input.currencyCode));
      const balW = fontBold.widthOfTextAtSize(balStr, 11);
      page.drawText(balStr, { x: PAGE_WIDTH - MARGIN - 10 - balW, y: y - 2, size: 13, font: fontBold, color: amber700 });
      y -= 44;
    }
  }

  // --- Notes ---
  if (input.notes) {
    ensureSpace(40);
    page.drawText("NOTES", { x: MARGIN, y, size: 8, font: fontBold, color: slate400 });
    y -= 12;
    drawWrapped(input.notes.slice(0, 200), MARGIN, y, PAGE_WIDTH - 2 * MARGIN, 9, font, slate600);
    y -= 20;
  }

  page.drawText(
    `Generated on ${new Date().toISOString().slice(0, 10)}. This is a system-generated document.`,
    { x: MARGIN, y: MARGIN - 20, size: 7, font, color: slate400 }
  );

  return pdfDoc.save();
}
