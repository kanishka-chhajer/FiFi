"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Stage from "@/components/Stage";
import { Footer, PrimaryButton } from "@/components/ui";
import { routeFor, useSession } from "@/lib/session";

export default function Welcome() {
  const router = useRouter();
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A returning visitor is already signed in — send them wherever they left
  // off rather than making them press Begin again.
  useEffect(() => {
    if (session.loading || !session.signedIn) return;
    router.replace(routeFor(session));
  }, [session, router]);

  const begin = async () => {
    setError(null);
    setBusy(true);
    try {
      await session.signIn();
      // The effect above takes it from here once the session catches up.
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "";
      setError(
        code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request"
          ? null
          : "Could not sign in. Try again?",
      );
      setBusy(false);
    }
  };

  return (
    <Stage bg="welcome" veil={0.82}>
      {/* Figma: Hanken Grotesk SemiBold 30, 4px tracking, y=109 */}
      <p
        className="absolute inset-x-0 text-center font-body text-[30px] font-semibold tracking-[4px] text-text-dim"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 109px)" }}
      >
        FiFi
      </p>

      {/*
        The jar is baked into welcome-bg.svg and sits under the scrim, so only
        these two fireflies read as lit — matching Figma's "Group 1".
      */}
      <span
        className="pointer-events-none absolute"
        style={{ left: "45.4%", top: "51.8%", width: "4.1%" }}
      >
        <span className="welcome-ff">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/art/firefly.svg" alt="" draggable={false} className="w-full" />
        </span>
      </span>
      <span
        className="pointer-events-none absolute"
        style={{ left: "50.3%", top: "57.5%", width: "3.85%" }}
      >
        <span className="welcome-ff welcome-ff--mint" style={{ animationDelay: "1.1s" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/art/firefly.svg" alt="" draggable={false} className="w-full" />
        </span>
      </span>

      {/* Figma: italic 14, y=604 */}
      <p
        className="absolute text-center font-body text-[14px] italic leading-[1.5] text-text-quiet"
        style={{ left: "14.1%", right: "14.1%", top: "71.6%" }}
      >
        Tap it whenever you miss them. A firefly drifts out and their forest
        lights up too.
      </p>

      <Footer>
        <PrimaryButton onClick={begin} disabled={busy || session.loading}>
          {busy ? "Signing in…" : "Begin"}
        </PrimaryButton>
        {error && (
          <p className="text-center font-body text-[12.5px] text-[#FF9E8F]">
            {error}
          </p>
        )}
        {!session.configured && (
          <p className="text-center font-body text-[12.5px] text-text-dim">
            Firebase isn&rsquo;t configured yet.
          </p>
        )}
      </Footer>
    </Stage>
  );
}
