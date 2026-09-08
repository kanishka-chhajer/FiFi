"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import Stage from "@/components/Stage";
import { PrimaryButton, TextLink } from "@/components/ui";
import { useJar, useSession } from "@/lib/session";

export default function Waiting() {
  const router = useRouter();
  const id = String(useParams().id);
  const session = useSession();
  const jar = useJar(id);

  // The couple document is live, so the moment they claim the invite this
  // fires on its own — no polling, no refresh.
  useEffect(() => {
    if (session.loading) return;
    if (!session.signedIn) router.replace("/");
    else if (!jar.found) router.replace("/jars");
    else if (jar.paired) router.replace(`/jar/${id}`);
  }, [session, jar, id, router]);

  const code = jar.inviteCode ?? "————————";

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
      {/*
        Laid out as a column rather than positioned at percentages of the
        frame. The Figma frame is 844 tall; Safari on a phone is shorter than
        that and changes height as its toolbars collapse, which was pushing the
        invite code underneath the button. Here the jar gives up space first
        and nothing can ever land on top of the footer.
      */}
      <div
        className="absolute inset-0 flex flex-col items-center px-7"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 28px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 30px)",
        }}
      >
        {/* The jar breathes slowly rather than spinning — no spinners here. */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          <span className="waiting-halo pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/art/jar.svg"
            alt=""
            draggable={false}
            // Height-bound so it shrinks on a short screen instead of
            // shouldering the text off the bottom.
            className="no-select waiting-jar relative h-full max-h-[240px] w-auto object-contain"
          />
        </div>

        <div className="w-full shrink-0 text-center">
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

        <div className="mt-7 flex w-full shrink-0 flex-col items-center gap-3">
          <PrimaryButton onClick={shareAgain}>Send it again</PrimaryButton>
          <TextLink href="/pair/join">I have a code instead</TextLink>
        </div>
      </div>
    </Stage>
  );
}
