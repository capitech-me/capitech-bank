/**
 * Statement generation - branded PDF (pdf-lib, serverless-safe) + CSV export.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatMoney, formatDateTime, humanize } from "@capitech/lib";

export interface StatementTx {
  id: string;
  date: string;
  type: string;
  description: string;
  reference: string;
  amount: string; // signed: negative = out
  currency: string;
  balanceAfter?: string | null;
}

export interface StatementData {
  accountLabel: string;
  accountNo: string;
  iban: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: string;
  closingBalance: string;
  transactions: StatementTx[];
}

const NAVY = rgb(0.043, 0.071, 0.125);
const BLUE = rgb(0.145, 0.34, 0.92);
const MUTED = rgb(0.39, 0.45, 0.55);
const GRAY = rgb(0.58, 0.64, 0.72);
const LIGHT = rgb(0.945, 0.96, 0.975);
const WHITE = rgb(1, 1, 1);
const RED = rgb(0.72, 0.11, 0.11);
const GREEN = rgb(0.02, 0.37, 0.22);

/** Build a CSV string from statement data. */
export function buildCsv(data: StatementData): string {
  const header = ["Date", "Type", "Description", "Reference", "Amount", "Currency", "Balance"];
  const rows = data.transactions.map((t) => [
    formatDateTime(t.date),
    humanize(t.type),
    t.description.replace(/"/g, '""'),
    t.reference,
    t.amount,
    t.currency,
    t.balanceAfter ?? "",
  ]);
  const escape = (cells: string[]) => cells.map((c) => `"${c}"`).join(",");
  return [escape(header), ...rows.map(escape)].join("\r\n");
}

const PAGE_W = 595; // A4 width (pt)
const PAGE_H = 842;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

/** Build a branded PDF buffer via pdf-lib (standard fonts, no asset files). */
export async function buildPdf(data: StatementData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([PAGE_W, PAGE_H]);
  const width = page.getWidth();
  const height = page.getHeight();

  /* ---- Header band ---- */
  page.drawRectangle({ x: 0, y: height - 92, width, height: 92, color: NAVY });
  page.drawText("Capitech Bank", { x: MARGIN, y: height - 66, size: 20, font: bold, color: WHITE });
  page.drawText("Banking beyond borders · capitech.me", { x: MARGIN, y: height - 44, size: 9, font, color: rgb(0.53, 0.59, 0.68) });
  page.drawText("Account Statement", { x: width - MARGIN - 180, y: height - 62, size: 14, font: bold, color: WHITE });
  page.drawText(`Period: ${data.periodStart} - ${data.periodEnd}`, { x: width - MARGIN - 180, y: height - 44, size: 8, font, color: rgb(0.53, 0.59, 0.68) });

  /* ---- Account summary ---- */
  let y = height - 130;
  page.drawText(`Account: ${data.accountLabel}`, { x: MARGIN, y, size: 11, font: bold, color: NAVY });
  page.drawText(`Number ${data.accountNo} · ${data.iban} · ${data.currency}`, { x: MARGIN, y: y - 16, size: 9, font, color: MUTED });

  const balY = y - 52;
  page.drawText("Opening balance", { x: MARGIN, y: balY, size: 9, font, color: MUTED });
  page.drawText(formatMoney(data.openingBalance, data.currency), { x: MARGIN, y: balY - 15, size: 12, font: bold, color: NAVY });
  page.drawText("Closing balance", { x: width - MARGIN - 130, y: balY, size: 9, font, color: MUTED });
  const closingText = formatMoney(data.closingBalance, data.currency);
  page.drawText(closingText, { x: width - MARGIN - 130 - (bold.widthOfTextAtSize(closingText, 12) - 0), y: balY - 15, size: 12, font: bold, color: NAVY });

  /* ---- Transactions table ---- */
  const top = balY - 58;
  const rowH = 20;
  // Right-align helper: compute text width and subtract from the column's right edge.
  const drawRight = (xRight: number, text: string, size: number, f: typeof font, c: typeof NAVY, yPos: number) => {
    const w = f.widthOfTextAtSize(text, size);
    page.drawText(text, { x: xRight - w, y: yPos, size, font: f, color: c });
  };
  const cols: Record<string, number> = {
    date: MARGIN,
    type: MARGIN + 88,
    desc: MARGIN + 150,
    ref: MARGIN + 250,
    amount: width - MARGIN - 34,
    balance: width - MARGIN - 112 + 78,
  };

  // header row
  page.drawRectangle({ x: MARGIN, y: top, width: CONTENT_W, height: rowH, color: LIGHT });
  const headers: Array<[string, number, boolean]> = [
    ["Date", cols.date, false],
    ["Type", cols.type, false],
    ["Description", cols.desc, false],
    ["Reference", cols.ref, false],
    ["Amount", cols.amount, true],
    ["Balance", cols.balance, true],
  ];
  for (const [label, x, align] of headers) {
    if (align) drawRight(x, label, 8, bold, MUTED, top + 6);
    else page.drawText(label, { x, y: top + 6, size: 8, font: bold, color: MUTED });
  }

  let rowY = top - rowH;
  if (data.transactions.length === 0) {
    page.drawText("No transactions in this period.", { x: MARGIN, y: rowY - 12, size: 9, font, color: MUTED });
  }

  for (const t of data.transactions) {
    // page break handling
    if (rowY < 70) {
      page.drawText("- continued -", { x: MARGIN, y: 30, size: 8, font, color: GRAY });
      break;
    }
    const amount = Number(t.amount);
    page.drawText(formatDateTime(t.date), { x: cols.date, y: rowY + 6, size: 8, font, color: MUTED });
    page.drawText(humanize(t.type).slice(0, 14), { x: cols.type, y: rowY + 6, size: 8, font, color: MUTED });
    page.drawText(t.description.slice(0, 34), { x: cols.desc, y: rowY + 6, size: 8, font, color: NAVY });
    page.drawText(t.reference.slice(0, 22), { x: cols.ref, y: rowY + 6, size: 7.5, font, color: GRAY });
    drawRight(cols.amount, `${amount < 0 ? "-" : "+"}${formatMoney(Math.abs(amount), t.currency)}`, 8.5, bold, amount < 0 ? RED : GREEN, rowY + 6);
    if (t.balanceAfter) drawRight(cols.balance, formatMoney(t.balanceAfter, t.currency), 8, font, NAVY, rowY + 6);
    page.drawLine({ start: { x: MARGIN, y: rowY + rowH - 2 }, end: { x: width - MARGIN, y: rowY + rowH - 2 }, thickness: 0.5, color: rgb(0.89, 0.92, 0.95) });
    rowY -= rowH;
  }

  /* ---- Footer ---- */
  page.drawText(
    "This statement was generated by Capitech Bank (sandbox). Transactions are simulated. Generated " +
      new Date().toISOString().slice(0, 10),
    { x: MARGIN, y: 40, size: 7, font, color: GRAY }
  );

  return doc.save();
}
