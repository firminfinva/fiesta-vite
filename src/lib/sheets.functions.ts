import { createServerFn } from "@tanstack/react-start";
import { slugify } from "./slug";
import * as fs from "node:fs";
import * as path from "node:path";

const SPREADSHEET_ID = "1SkXTRTEZsSEDRdrEKShw82cKBB2Jh2BPYXsAsoipz68";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";
const DB_FILE = path.join(process.cwd(), "local_db.json");

type LocalDb = {
  message?: string;
  guests?: Array<{ rowIndex: number; status: string; timestamp: string }>;
  addedGuests?: Array<{ name: string; status: string; timestamp: string }>;
};

function hasCredentials() {
  return !!(process.env.LOVABLE_API_KEY && process.env.GOOGLE_SHEETS_API_KEY);
}

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

function readLocalDb(): LocalDb {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Failed to read local_db.json:", err);
  }
  return {};
}

function writeLocalDb(db: LocalDb) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write local_db.json:", err);
  }
}

function parseCsv(csvText: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let insideQuote = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        cell += '"';
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === "," && !insideQuote) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\r" || char === "\n") && !insideQuote) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      row.push(cell.trim());
      result.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length > 0) {
    row.push(cell.trim());
    result.push(row);
  }
  return result;
}

export type Guest = {
  rowIndex: number; // 1-indexed sheet row
  name: string;
  status: "" | "Accepté" | "Décliné" | string;
  timestamp: string;
  slug: string;
};

async function readAll(): Promise<{ guests: Guest[]; message: string }> {
  let message = "";
  let guests: Guest[] = [];

  if (hasCredentials()) {
    const data = await gw(
      `/spreadsheets/${SPREADSHEET_ID}/values:batchGet?ranges=Sheet1!A2:C1000&ranges=Sheet1!F1`,
    );
    const rows: string[][] = data.valueRanges?.[0]?.values ?? [];
    message = data.valueRanges?.[1]?.values?.[0]?.[0] ?? "";
    guests = rows
      .map((r, i) => ({
        rowIndex: i + 2,
        name: (r[0] ?? "").trim(),
        status: (r[1] ?? "").trim(),
        timestamp: (r[2] ?? "").trim(),
        slug: slugify(r[0] ?? ""),
      }))
      .filter((g) => g.name.length > 0);
  } else {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;
      const res = await fetch(csvUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch CSV: ${res.statusText}`);
      }
      const csvText = await res.text();
      const rows = parseCsv(csvText);

      message = rows[0]?.[5] ?? "";

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const name = (r[0] ?? "").trim();
        if (name) {
          guests.push({
            rowIndex: i + 1,
            name,
            status: (r[1] ?? "").trim(),
            timestamp: (r[2] ?? "").trim(),
            slug: slugify(name),
          });
        }
      }
    } catch (err) {
      console.error("Local fallback: failed to fetch public Google Sheet:", err);
      message = "Bonjour [Nom], vous êtes cordialement invité(e) à la célébration de graduation de Keza Rachel. Votre présence nous ferait un immense plaisir !";
    }

    const db = readLocalDb();
    if (db.message !== undefined) {
      message = db.message;
    }
    if (db.guests) {
      for (const override of db.guests) {
        const guest = guests.find((g) => g.rowIndex === override.rowIndex);
        if (guest) {
          guest.status = override.status;
          guest.timestamp = override.timestamp;
        }
      }
    }
    if (db.addedGuests) {
      let nextRowIndex =
        guests.length > 0 ? Math.max(...guests.map((g) => g.rowIndex)) + 1 : 2;
      for (const added of db.addedGuests) {
        guests.push({
          rowIndex: nextRowIndex++,
          name: added.name,
          status: added.status,
          timestamp: added.timestamp,
          slug: slugify(added.name),
        });
      }
    }
  }

  return { guests, message };
}

export const getInviteData = createServerFn({ method: "GET" }).handler(async () => {
  return readAll();
});

export const getGuestBySlug = createServerFn({ method: "GET" })
  .validator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const { guests, message } = await readAll();
    const guest = guests.find((g) => g.slug === data.slug) ?? null;
    return { guest, message };
  });

export const addGuest = createServerFn({ method: "POST" })
  .validator((d: { name: string }) => d)
  .handler(async ({ data }) => {
    const name = data.name.trim();
    if (!name) throw new Error("Nom requis");
    if (hasCredentials()) {
      await gw(
        `/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A:C:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        { method: "POST", body: JSON.stringify({ values: [[name, "", ""]] }) },
      );
    } else {
      const db = readLocalDb();
      if (!db.addedGuests) db.addedGuests = [];
      db.addedGuests.push({ name, status: "", timestamp: "" });
      writeLocalDb(db);
    }
    return { ok: true };
  });

export const updateMessage = createServerFn({ method: "POST" })
  .validator((d: { message: string }) => d)
  .handler(async ({ data }) => {
    if (hasCredentials()) {
      await gw(`/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!F1?valueInputOption=RAW`, {
        method: "PUT",
        body: JSON.stringify({ values: [[data.message]] }),
      });
    } else {
      const db = readLocalDb();
      db.message = data.message;
      writeLocalDb(db);
    }
    return { ok: true };
  });

export const deleteGuest = createServerFn({ method: "POST" })
  .validator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const { guests } = await readAll();
    const guest = guests.find((g) => g.slug === data.slug);
    if (!guest) throw new Error("Invité introuvable");

    if (hasCredentials()) {
      // Clear the row values (safer than deleting rows, avoids shifting indexes)
      await gw(
        `/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A${guest.rowIndex}:C${guest.rowIndex}?valueInputOption=RAW`,
        {
          method: "PUT",
          body: JSON.stringify({ values: [["", "", ""]] }),
        },
      );
    } else {
      const db = readLocalDb();

      // Prefer removing from addedGuests first (those are created when credentials are absent)
      if (db.addedGuests) {
        const addedIdx = db.addedGuests.findIndex((g) => slugify(g.name) === data.slug);
        if (addedIdx !== -1) {
          db.addedGuests.splice(addedIdx, 1);
        }
      }

      // Also remove any guest override for that rowIndex (RSVP status)
      if (db.guests) {
        db.guests = db.guests.filter((g) => g.rowIndex !== guest.rowIndex);
      }

      writeLocalDb(db);
    }

    return { ok: true };
  });

export const submitRsvp = createServerFn({ method: "POST" })
  .validator((d: { slug: string; status: "Accepté" | "Décliné" }) => d)
  .handler(async ({ data }) => {
    const { guests } = await readAll();
    const guest = guests.find((g) => g.slug === data.slug);
    if (!guest) throw new Error("Invité introuvable");
    const ts = new Date().toLocaleString("fr-FR", { timeZone: "Africa/Kigali" });

    if (hasCredentials()) {
      await gw(
        `/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!B${guest.rowIndex}:C${guest.rowIndex}?valueInputOption=RAW`,
        { method: "PUT", body: JSON.stringify({ values: [[data.status, ts]] }) },
      );
    } else {
      const db = readLocalDb();
      const addedIdx = db.addedGuests?.findIndex((g) => slugify(g.name) === data.slug);
      if (addedIdx !== undefined && addedIdx !== -1) {
        db.addedGuests![addedIdx].status = data.status;
        db.addedGuests![addedIdx].timestamp = ts;
      } else {
        if (!db.guests) db.guests = [];
        const existingIdx = db.guests.findIndex((g) => g.rowIndex === guest.rowIndex);
        if (existingIdx !== -1) {
          db.guests[existingIdx].status = data.status;
          db.guests[existingIdx].timestamp = ts;
        } else {
          db.guests.push({ rowIndex: guest.rowIndex, status: data.status, timestamp: ts });
        }
      }
      writeLocalDb(db);
    }
    return { ok: true, status: data.status, timestamp: ts };
  });

