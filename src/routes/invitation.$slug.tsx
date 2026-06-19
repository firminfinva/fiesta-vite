import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getGuestBySlug, submitRsvp } from "@/lib/sheets.functions";
import { InvitationCard } from "@/components/InvitationCard";

export const Route = createFileRoute("/invitation/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Invitation — ${params.slug}` },
      { name: "description", content: "Votre invitation personnalisée pour la célébration de graduation." },
    ],
  }),
  loader: async ({ params }) => {
    const data = await getGuestBySlug({ data: { slug: params.slug } });
    if (!data.guest) throw notFound();
    return data;
  },
  component: InvitationPage,
  notFoundComponent: () => (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="font-display text-3xl">Invitation introuvable</h1>
        <p className="mt-2 text-muted-foreground">
          Le lien que vous avez utilisé n'est pas valide.
        </p>
      </div>
    </main>
  ),
});

function InvitationPage() {
  const { guest, message } = Route.useLoaderData();
  const rsvpFn = useServerFn(submitRsvp);
  const [status, setStatus] = useState<string>(guest!.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const personalized = message.replace("[Nom]", guest!.name);

  async function respond(s: "Accepté" | "Décliné") {
    setBusy(true);
    setError(null);
    try {
      const res = await rsvpFn({ data: { slug: guest!.slug, status: s } });
      setStatus(res.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <InvitationCard recipientName={guest!.name} message={personalized}>
        <div className="mt-10">
          {status === "Accepté" || status === "Décliné" ? (
            <div className="rounded-md bg-muted p-4 text-center">
              <p className="font-display text-lg">
                {status === "Accepté"
                  ? "Merci, votre présence est confirmée 🎉"
                  : "Merci pour votre réponse."}
              </p>
              <button
                onClick={() => setStatus("")}
                className="mt-2 text-xs text-muted-foreground underline"
              >
                Modifier ma réponse
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => respond("Accepté")}
                disabled={busy}
                className="w-full rounded-md bg-gold px-6 py-3 font-semibold text-ink shadow hover:opacity-90 disabled:opacity-50 sm:w-auto"
              >
                {busy ? "..." : "J'accepte avec joie"}
              </button>
              <button
                onClick={() => respond("Décliné")}
                disabled={busy}
                className="w-full rounded-md border border-ink/30 bg-transparent px-6 py-3 font-semibold text-ink hover:bg-ink hover:text-paper disabled:opacity-50 sm:w-auto"
              >
                Je ne pourrai pas
              </button>
            </div>
          )}
          {error && (
            <p className="mt-3 text-center text-sm text-destructive">{error}</p>
          )}
        </div>
      </InvitationCard>
    </main>
  );
}
