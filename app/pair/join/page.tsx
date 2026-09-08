"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
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
import { InviteError } from "@/lib/repo";
import { useSession } from "@/lib/session";

/** MOTH-7429 → four letters, four digits. */
const LETTERS = 4;
const DIGITS = 4;
const MAX = LETTERS + DIGITS;

function clean(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .split("")
    .filter((ch, i) => (i < LETTERS ? /[A-Z]/.test(ch) : /[0-9]/.test(ch)))
    .slice(0, MAX)
    .join("");
}

const MESSAGES: Record<string, string> = {
  "not-found": "No jar with that code. Check the letters and numbers?",
  "already-claimed": "That jar already has two people in it.",
  "own-invite": "That's your own code — send it to them instead.",
  duplicate: "You two already share a jar. Open it from your shelf.",
};

export default function PairJoinPage() {
  return (
    <Suspense fallback={<Stage veil={0.82}>{null}</Stage>}>
      <PairJoin />
    </Suspense>
  );
}

function PairJoin() {
  const router = useRouter();
  const session = useSession();
  const params = useSearchParams();

  // Prefilled when they arrived by shared link.
  const [code, setCode] = useState(() => clean(params.get("code") ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const cells = Array.from({ length: MAX }, (_, i) => code[i] ?? "");
  const complete = code.length === MAX;

  const connect = async () => {
    if (!complete || busy) return;
    if (!session.signedIn) {
      try {
        await session.signIn();
      } catch {
        setError("Sign in to join a jar.");
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      const id = await session.join(
        `${code.slice(0, LETTERS)}-${code.slice(LETTERS)}`,
      );
      router.push(`/jar/${id}/firefly`);
    } catch (e) {
      const key = e instanceof InviteError ? e.code : "";
      setError(MESSAGES[key] ?? "Could not join that jar. Try again?");
      setBusy(false);
    }
  };

  return (
    <Stage veil={0.82}>
      <BackButton />
      <Content>
        <Overline>STEP 1 OF 2</Overline>
        <Title>Enter their code</Title>
        <Body>Type the invite code your person sent you.</Body>

        <div className="relative mt-7" onClick={() => inputRef.current?.focus()}>
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => {
              setCode(clean(e.target.value));
              setError(null);
            }}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="one-time-code"
            aria-label="Invite code"
            className="absolute inset-0 z-10 w-full opacity-0"
          />
          <div className="flex items-center gap-2">
            {cells.slice(0, LETTERS).map((ch, i) => (
              <Cell key={`l${i}`} char={ch} active={code.length === i} />
            ))}
            <span className="px-0.5 font-serif text-[19px] text-text-dim">–</span>
            {cells.slice(LETTERS).map((ch, i) => (
              <Cell
                key={`d${i}`}
                char={ch}
                active={code.length === LETTERS + i}
              />
            ))}
          </div>
        </div>

        <p className="mt-4 font-body text-[12.5px] text-text-dim">
          {error ?? "Codes look like MOTH-7429"}
        </p>
      </Content>

      <Footer>
        <PrimaryButton disabled={!complete || busy} onClick={connect}>
          {busy ? "Connecting…" : "Connect"}
        </PrimaryButton>
        <TextLink href="/pair">Create a new jar instead</TextLink>
      </Footer>
    </Stage>
  );
}

function Cell({ char, active }: { char: string; active: boolean }) {
  return (
    <span
      className={`grid h-[52px] flex-1 place-items-center rounded-chip border bg-white/[0.05] font-serif text-[19px] text-text-primary transition-colors ${
        active ? "border-gold/80" : "border-white/16"
      }`}
    >
      {char}
    </span>
  );
}
