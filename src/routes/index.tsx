import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getInviteData,
  addGuest,
  updateMessage,
  deleteGuest,
} from "@/lib/sheets.functions";
import { InvitationCard } from "@/components/InvitationCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Invitations Graduation" },
      { name: "description", content: "Gérez vos invités et envoyez des invitations personnalisées." },
    ],
  }),
  loader: () => getInviteData(),
  component: AdminPage,
});

function AdminPage() {
  const initial = Route.useLoaderData();
  const router = useRouter();
  const addFn = useServerFn(addGuest);
  const saveMsgFn = useServerFn(updateMessage);
  const delFn = useServerFn(deleteGuest);


  const [message, setMessage] = useState(initial.message);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await addFn({ data: { name: newName.trim() } });
      setNewName("");
      await router.invalidate();
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveMessage() {
    setBusy(true);
    try {
      await saveMsgFn({ data: { message } });
      await router.invalidate();
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(slug: string) {
    const url = `${origin}/invitation/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 1500);
  }

  async function handleDelete(slug: string) {
    setBusy(true);
    try {
      await delFn({ data: { slug } });
      await router.invalidate();
    } finally {
      setBusy(false);
    }
  }


  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="text-center">
          <p className="font-script text-4xl text-gold">Tableau de bord</p>
          <h1 className="font-display text-4xl font-black sm:text-5xl">
            Invitations Graduation
          </h1>
          <p className="mt-2 text-muted-foreground">
            Gérez vos invités et partagez leurs liens personnalisés.
          </p>
        </header>

        <section className="rounded-lg bg-card p-6 shadow ring-1 ring-border">
          <h2 className="font-display text-2xl font-bold">Message d'invitation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Utilisez <code className="rounded bg-muted px-1">[Nom]</code> pour
            insérer automatiquement le prénom de l'invité.
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="mt-3 w-full rounded-md border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleSaveMessage}
              disabled={busy}
              className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-50"
            >
              Enregistrer le message
            </button>
          </div>
        </section>

        <section className="rounded-lg bg-card p-6 shadow ring-1 ring-border">
          <h2 className="font-display text-2xl font-bold">Ajouter un invité</h2>
          <form onSubmit={handleAdd} className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom complet de l'invité"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-50"
            >
              Ajouter
            </button>
          </form>
        </section>

        <section className="rounded-lg bg-card p-6 shadow ring-1 ring-border">
          <h2 className="font-display text-2xl font-bold">
            Invités ({initial.guests.length})
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Nom</th>
                  <th className="py-2 pr-4">Statut</th>
                  <th className="py-2 pr-4">Horodatage</th>
                  <th className="py-2 pr-4">Lien</th>
                  <th className="py-2 pr-4">Supprimer</th>
                </tr>
              </thead>
              <tbody>
                {initial.guests.map((g: typeof initial.guests[number]) => (
                  <tr key={g.slug} className="border-b border-border/60">
                    <td className="py-3 pr-4 font-medium">{g.name}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={g.status} />
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {g.timestamp || "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <button
                        onClick={() => copyLink(g.slug)}
                        className="rounded-md border border-border px-3 py-1 text-xs hover:bg-muted"
                      >
                        {copied === g.slug ? "Copié ✓" : "Copier le lien"}
                      </button>
                    </td>
                    <td className="py-3 pr-4">
                      <button
                        onClick={() => handleDelete(g.slug)}
                        disabled={busy}
                        className="rounded-md border border-destructive/40 px-3 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
                {initial.guests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      Aucun invité pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-center font-display text-2xl font-bold">Aperçu</h2>
          <InvitationCard message={message.replace("[nom]", "Prénom de l'invité")} />
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "Accepté")
    return (
      <span className="rounded-full bg-gold/20 px-2 py-1 text-xs font-medium text-ink">
        Accepté
      </span>
    );
  if (status === "Décliné")
    return (
      <span className="rounded-full bg-destructive/15 px-2 py-1 text-xs font-medium text-destructive">
        Décliné
      </span>
    );
  return (
    <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
      En attente
    </span>
  );
}
