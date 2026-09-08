"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Dots } from "@/components/Loading";
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
import { InviteError, peekInvite } from "@/lib/repo";
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
  "already-claimed": "This invite has already been used. Ask them to send you a new one.",
  "own-invite": "That's your own code — send it to them instead.",
  duplicate: "You two already share a jar. Open it from your shelf.",
};

/** What a peeked invite means for the person looking at it. */
const STATE_MESSAGES: Record<string, string> = {
  "not-found": MESSAGES["not-found"],
  claimed: MESSAGES["already-claimed"],
  own: MESSAGES["own-invite"],
};

/** The button says why it can't be pressed. */
const STATE_LABELS: Record<string, string> = {
  "not-found": "No such code",
  claimed: "Code already used",
  own: "This is your code",
};

/** A failed claim tells us the same thing a peek would have. */
const ERROR_STATES: Record<string, string> = {
  "not-found": "not-found",
  "already-claimed": "claimed",
  "own-invite": "own",
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
  const typed = complete
    ? `${code.slice(0, LETTERS)}-${code.slice(LETTERS)}`
    : null;

  /*
   * Reopening your own invite link should just open the jar.
   *
   * Both people keep the link — it sits in the chat they sent it through — so
   * tapping it again after pairing is the normal thing to do, not a mistake.
   * Before this it ran the claim, which failed as "already claimed" and left
   * you staring at a code entry screen with no way forward.
   */
  const alreadyMine = typed
    ? session.jars.find((j) => j.inviteCode === typed)
    : undefined;

  useEffect(() => {
    if (alreadyMine) router.replace(`/jar/${alreadyMine.id}`);
  }, [alreadyMine, router]);

  /*
   * Check a spent code before anyone taps Connect.
   *
   * Reading an invite needs a signed-in user, so a visitor arriving cold still
   * signs in first — but from then on the screen knows the code is used and
   * says so, instead of letting them press a live button and answering with a
   * failure afterwards.
   */
  const [peek, setPeek] = useState<{ code: string; state: string } | null>(
    null,
  );
  const uid = session.uid;

  useEffect(() => {
    if (!typed || !uid || alreadyMine) return;
    let cancelled = false;
    peekInvite(typed, uid)
      .then((state) => {
        if (!cancelled) setPeek({ code: typed, state });
      })
      .catch(() => {
        /* offline or refused — leave the button live and let Connect answer */
      });
    return () => {
      cancelled = true;
    };
  }, [typed, uid, alreadyMine]);

  // Tagged with the code it describes, so an answer about a previous code is
  // discarded the moment a digit changes.
  const state = peek?.code === typed ? peek.state : null;
  const spent = state != null && state !== "free";
  // A complete code with no verdict yet, and someone signed in to fetch one.
  const checking = Boolean(typed && uid && !alreadyMine && state === null);

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
      const id = await session.join(typed!);
      router.push(`/jar/${id}/firefly`);
    } catch (e) {
      const key = e instanceof InviteError ? e.code : "";
      setError(MESSAGES[key] ?? "Could not join that jar. Try again?");
      // Signed-out visitors can't be checked up front, so a refusal here is
      // the first news of a spent code — record it so the button stops
      // inviting another attempt that can only fail the same way.
      if (typed && ERROR_STATES[key]) {
        setPeek({ code: typed, state: ERROR_STATES[key] });
      }
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

        {/* Errors were rendering in the same dim grey as the hint, so a
            refusal read as nothing having happened at all. */}
        <p
          className={`mt-4 font-body text-[12.5px] leading-[1.5] ${
            error || spent ? "text-[#FF9E8F]" : "text-text-dim"
          }`}
        >
          {alreadyMine
            ? "You're already in this jar — opening it…"
            : spent
              ? STATE_MESSAGES[state!]
              : checking
                ? "Checking that code…"
                : (error ?? "Codes look like MOTH-7429")}
        </p>

        {(checking || alreadyMine) && (
          <div className="mt-5 flex justify-center">
            <Dots />
          </div>
        )}
      </Content>

      <Footer>
        {/* A spent code can't be connected, so the button says so rather than
            staying live and failing on tap. */}
        <PrimaryButton disabled={!complete || busy || spent || checking} onClick={connect}>
          {busy ? "Connecting…" : checking ? "Checking…" : spent ? STATE_LABELS[state!] : "Connect"}
        </PrimaryButton>
        <TextLink href={spent ? "/jars" : "/pair"}>
          {spent ? "Go to your jars" : "Create a new jar instead"}
        </TextLink>
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
