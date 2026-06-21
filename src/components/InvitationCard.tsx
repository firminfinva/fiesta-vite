import type { ReactNode } from "react";

export function InvitationCard({
  message,
  children,
}: {
  message?: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-lg bg-card shadow-2xl ring-1 ring-border">

      {/* Bunting */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between px-4 pt-3 text-gold opacity-80">
        <Bunting />
        <Bunting flip />
      </div>

      <div className="relative px-8 pt-24 pb-10 sm:px-12">
        <div className="mb-2 flex justify-center text-3xl">🎓</div>
        <p className="text-center font-display text-2xl italic text-ink">Invitation</p>
        <h1 className="text-center font-display text-5xl font-black tracking-tight text-ink sm:text-6xl">
          Graduation
        </h1>
        <p className="-mt-1 text-center font-script text-5xl text-gold sm:text-6xl">
          Celebration
        </p>

        <div className="mt-10 text-center">
          <p className="font-display text-xl text-ink">De la part de</p>
          <p className="mt-2 font-script text-5xl text-gold">Keza rachel</p>
        </div>

        <div className="my-8 flex items-center justify-center gap-2 text-gold">
          <span className="h-px w-16 bg-gold/50" />
          <span>✦</span>
          <span className="h-px w-16 bg-gold/50" />
        </div>

        {message && (
          <p className="mx-auto max-w-md text-center text-base leading-relaxed text-ink/85">
            {message}
          </p>
        )}

        <div className="mt-10 space-y-1 text-center">
          <p className="font-display text-2xl font-bold text-ink">Vendredi 26/06/2026</p>
        </div>

        <div className="mt-6 space-y-1 text-center">
          <p className="font-display text-lg font-semibold text-ink">Première partie</p>
          <p className="font-display text-xl text-ink">Lieu : ISC Goma</p>
          <p className="font-display text-xl text-ink">Heure : 8h00</p>
        </div>

        <div className="my-8 flex items-center justify-center gap-2 text-gold">
          <span className="h-px w-8 bg-gold/50" />
          <span>✦</span>
          <span className="h-px w-8 bg-gold/50" />
        </div>

        <div className="space-y-1 text-center">
          <p className="font-display text-lg font-semibold text-ink">Deuxième partie</p>
          <p className="font-display text-xl text-ink">Lieu : Chez les Banquiers</p>
          <p className="font-display text-xl text-ink">Heure : 16h00</p>
        </div>

        {children}
      </div>

      <div className="relative h-24 bg-ink">
        <svg
          className="absolute -top-6 left-0 w-full text-ink"
          viewBox="0 0 1200 60"
          preserveAspectRatio="none"
        >
          <path
            d="M0,60 C200,0 400,60 600,20 C800,-10 1000,50 1200,10 L1200,60 Z"
            fill="currentColor"
          />
        </svg>
        <div className="absolute inset-0 flex items-end justify-end px-8 pb-4">
          <p className="font-display text-lg font-semibold text-paper">
            Soyez les Bienvenus !
          </p>
        </div>
        <div className="absolute bottom-2 left-6 text-3xl">🎓</div>
      </div>
    </div>
  );
}

function Bunting({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      width="180"
      height="80"
      viewBox="0 0 180 80"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        d="M5,10 Q90,55 175,10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {[0, 1, 2, 3, 4].map((i) => {
        const x = 15 + i * 35;
        const y = 14 + Math.sin((i / 4) * Math.PI) * 18;
        return (
          <polygon
            key={i}
            points={`${x},${y} ${x + 18},${y} ${x + 9},${y + 22}`}
            fill="currentColor"
            opacity={i % 2 === 0 ? 0.9 : 0.55}
          />
        );
      })}
    </svg>
  );
}
