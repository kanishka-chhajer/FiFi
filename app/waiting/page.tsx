"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Stage from "@/components/Stage";
import { Footer, PrimaryButton, TextLink } from "@/components/ui";
import { useSession } from "@/lib/session";

export default function Waiting() {
  const router = useRouter();
  const session = useSession();

  // The couple document is live, so the moment they claim the invite this
  // fires on its own — no polling, no refresh.
  useEffect(() => {
    if (session.loading) return;
    if (!session.signedIn) router.replace("/");
    else if (!session.hasJar) router.replace("/pair");
    else if (session.paired) router.replace("/jar");
  }, [session, router]);

  const code = session.inviteCode ?? "————————";

  const shareAgain = async () => {
    const url = `${window.location.origin}/pair/join?code=${code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "FIFI",
          text: "Share a jar of fireflies with me.",
          url,
        });
        return;
      } catch {
        /* dismissed — fall through to copying */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* the code below is selectable */
    }
  };

  return (
    <Stage veil={0.86}>
      {/* The jar breathes slowly rather than spinning — no spinners here. */}
      <div className="absolute left-[33.08%] top-[34%] w-[30.77%]">
        <span className="waiting-halo pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/art/jar.svg"
          alt=""
          draggable={false}
          className="no-select waiting-jar relative w-full"
        />
      </div>

      <div className="absolute inset-x-7 top-[62%] text-center">
        <span className="mx-auto mb-4 flex w-fit items-center gap-1.5">
          <i className="wait-dot" />
          <i className="wait-dot" style={{ animationDelay: "0.28s" }} />
          <i className="wait-dot" style={{ animationDelay: "0.56s" }} />
        </span>

        <h1 className="font-display text-[24px] font-bold leading-tight text-text-primary">
          Waiting for your person
        </h1>
        <p className="mt-3 font-body text-[14px] italic leading-[1.5] text-text-quiet">
          The forest stays dark until they open the jar.
        </p>

        <p className="mt-6 font-body text-[11px] font-semibold tracking-[0.27em] text-text-dim">
          YOUR INVITE CODE
        </p>
        {/* Selectable, so the code survives a dismissed share sheet. */}
        <p className="mt-1 select-all font-serif text-[22px] font-medium tracking-[0.13em] text-gold-moon">
          {code}
        </p>
      </div>

      <Footer>
        <PrimaryButton onClick={shareAgain}>Send it again</PrimaryButton>
        <TextLink href="/pair/join">I have a code instead</TextLink>
      </Footer>
    </Stage>
  );
}
