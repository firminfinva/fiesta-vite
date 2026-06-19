import { createServerFn } from "@tanstack/react-start";
import { slugify } from "./slug";

const SPREADSHEET_ID = "1SkXTRTEZsSEDRdrEKShw82cKBB2Jh2BPYXsAsoipz68";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

function headers() {
  const lov = process.env.LOVABLE_API_KEY;
  const key = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lov || !key) throw new Error("Missing Google Sheets credentials");
  return {
    Authorization: `Bearer ${lov}`,
    "X-Connection-Api-Key": key,
    "Content-Type": "application/json",
  };
}

async function gw(path: string, init?: RequestInit) {
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets API ${res.status}: ${text}`);
  }
  return res.json();
}

export type Guest = {
  rowIndex: number; // 1-indexed sheet row
  name: string;
  status: "" | "Accepté" | "Décliné" | string;
  timestamp: string;
  slug: string;
};

async function readAll(): Promise<{ guests: Guest[]; message: string }> {
  const data = await gw(
    `/spreadsheets/${SPREADSHEET_ID}/values:batchGet?ranges=Sheet1!A2:C1000&ranges=Sheet1!F1`,
  );
  const rows: string[][] = data.valueRanges?.[0]?.values ?? [];
  const message: string = data.valueRanges?.[1]?.values?.[0]?.[0] ?? "";
  const guests: Guest[] = rows
    .map((r, i) => ({
      rowIndex: i + 2,
      name: (r[0] ?? "").trim(),
      status: (r[1] ?? "").trim(),
      timestamp: (r[2] ?? "").trim(),
      slug: slugify(r[0] ?? ""),
    }))
    .filter((g) => g.name.length > 0);
  return { guests, message };
}

export const getInviteData = createServerFn({ method: "GET" }).handler(async () => {
  return readAll();
});

export const getGuestBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const { guests, message } = await readAll();
    const guest = guests.find((g) => g.slug === data.slug) ?? null;
    return { guest, message };
  });

export const addGuest = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string }) => d)
  .handler(async ({ data }) => {
    const name = data.name.trim();
    if (!name) throw new Error("Nom requis");
    await gw(
      `/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A:C:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { method: "POST", body: JSON.stringify({ values: [[name, "", ""]] }) },
    );
    return { ok: true };
  });

export const updateMessage = createServerFn({ method: "POST" })
  .inputValidator((d: { message: string }) => d)
  .handler(async ({ data }) => {
    await gw(
      `/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!F1?valueInputOption=RAW`,
      { method: "PUT", body: JSON.stringify({ values: [[data.message]] }) },
    );
    return { ok: true };
  });

export const submitRsvp = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; status: "Accepté" | "Décliné" }) => d)
  .handler(async ({ data }) => {
    const { guests } = await readAll();
    const guest = guests.find((g) => g.slug === data.slug);
    if (!guest) throw new Error("Invité introuvable");
    const ts = new Date().toLocaleString("fr-FR", { timeZone: "Africa/Kigali" });
    await gw(
      `/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!B${guest.rowIndex}:C${guest.rowIndex}?valueInputOption=RAW`,
      { method: "PUT", body: JSON.stringify({ values: [[data.status, ts]] }) },
    );
    return { ok: true, status: data.status, timestamp: ts };
  });
