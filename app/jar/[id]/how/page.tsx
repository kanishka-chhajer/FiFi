"use client";

import { SceneForest, SceneRelease, SceneTap } from "@/components/HowScenes";
import Stage from "@/components/Stage";
import { Content, Footer, Overline, PrimaryButton } from "@/components/ui";
import {
  colourById,
  DEFAULT_COLOUR,
  PARTNER_FALLBACK_COLOUR,
} from "@/lib/constants";
import { useParams } from "next/navigation";
import { useJar } from "@/lib/session";

export default function HowItWorks() {
  const id = String(useParams().id);
  const jar = useJar(id);

  // Drawn in the colour chosen one screen ago, so the explainer is visibly
  // about this jar rather than a generic one.
  const mine = colourById(jar.myColour)?.hex ?? DEFAULT_COLOUR;
  const theirs = colourById(jar.partnerColour)?.hex ?? PARTNER_FALLBACK_COLOUR;
  const them = jar.partnerName;

  const steps = [
    {
      title: "Think of them",
      body: `Double-tap the jar whenever ${them} crosses your mind. Nothing to write.`,
      scene: <SceneTap mine={mine} />,
    },
    {
      title: "A firefly drifts out",
      body: "One light leaves your jar and lands in the forest you both share.",
      scene: <SceneRelease mine={mine} />,
    },
    {
      title: "The forest fills",
      body: "By morning it holds every time you thought of each other. Then it clears.",
      scene: <SceneForest mine={mine} theirs={theirs} />,
    },
  ];

  return (
    <Stage veil={0.86}>
      <Content>
        <Overline>THE RITUAL</Overline>
        <h1 className="mt-3 font-display text-[26px] font-bold leading-tight text-text-primary">
          How the jar works
        </h1>

        <ol className="relative mt-7 space-y-6">
          {/* Threads the three scenes together so they read as one sequence. */}
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-[92px] left-[46px] top-[92px] w-px"
            style={{
              background:
                "linear-gradient(to bottom, transparent, rgba(255,255,255,0.13), transparent)",
            }}
          />

          {steps.map((s) => (
            <li key={s.title} className="flex items-center gap-4">
              <span className="relative grid size-[92px] shrink-0 place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.03]">
                {s.scene}
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-[16px] font-bold text-text-primary">
                  {s.title}
                </h2>
                <p className="mt-1 font-body text-[13px] leading-[1.5] text-text-muted">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Content>

      <Footer>
        <PrimaryButton href={`/jar/${id}`}>Light the first one</PrimaryButton>
      </Footer>
    </Stage>
  );
}
