"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Stage from "@/components/Stage";
import {
  BackButton,
  Body,
  Content,
  Footer,
  Overline,
  PrimaryButton,
  TextLink,
  Title,
} from "@/components/ui";
import { useSession } from "@/lib/session";

/**
 * The async clipboard API throws NotAllowedError without a transient user
 * activation or clipboard permission — common on desktop. Fall back to the
 * legacy execCommand path so the button always does something.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function PairInvite() {
  const router = useRouter();
  const session = useSession();
  const minting = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.loading) return;
    if (!session.signedIn) {
      router.replace("/");
      return;
    }
    // One jar per person. The ref guard matters because React runs effects
    // twice in development, and without it you'd get two couples.
    if (!session.hasJar && !minting.current) {
      minting.current = true;
      session.createJar().catch(() => {
        minting.current = false;
        setError("Could not create your jar. Check your connection?");
      });
    }
  }, [session, router]);

  const code = session.inviteCode ?? "————————";
  const ready = Boolean(session.inviteCode);

  const shareAndContinue = async () => {
    if (!ready) return;
    const url = `${window.location.origin}/pair/join?code=${code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "FIFI",
          text: "Share a jar of fireflies with me.",
          url,
        });
        router.push("/firefly");
        return;
      } catch {
        /* dismissed — fall through to copying */
      }
    }
    await copyText(url);
    router.push("/firefly");
  };

  return (
    <Stage bg="pair" veil={0.82}>
      <BackButton />
      <Content>
        <Overline>STEP 1 OF 2</Overline>
        <Title>Invite your person</Title>
        <Body>
          One jar connects the two of you. Send this code to the person you want
          to share it with.
        </Body>

        <div className="mt-6 rounded-card border border-white/12 bg-[#0A1220]/60 px-5 py-6 text-center">
          <p className="font-body text-[11px] font-semibold tracking-[0.27em] text-text-dim">
            YOUR INVITE CODE
          </p>
          {/* Selectable, so the code is still reachable if copying fails. */}
          <p className="mt-2 select-all font-serif text-[30px] font-medium tracking-[0.13em] text-gold-moon">
            {code}
          </p>
        </div>

        {error && (
          <p className="mt-4 text-center font-body text-[12.5px] text-[#FF9E8F]">
            {error}
          </p>
        )}
      </Content>

      <Footer>
        <PrimaryButton onClick={shareAndContinue} disabled={!ready}>
          Share invite
        </PrimaryButton>
        <TextLink href="/pair/join">I have a code instead</TextLink>
      </Footer>
    </Stage>
  );
}
