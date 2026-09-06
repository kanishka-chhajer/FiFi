"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Stage from "@/components/Stage";
import {
  BackButton,
  Body,
  Content,
  Footer,
  Overline,
  PrimaryButton,
  Title,
} from "@/components/ui";
import { colourById, FIREFLY_COLOURS, FireflyColourId } from "@/lib/constants";
import { useSession } from "@/lib/session";

export default function ChooseFirefly() {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session.loading) return;
    if (!session.signedIn) router.replace("/");
    else if (!session.hasJar) router.replace("/pair");
  }, [session, router]);

  // Nothing is taken until the other person has actually picked. While
  // they're still accepting the invite, all six are on offer.
  const takenId = session.partnerColour;
  const taken = colourById(takenId);
  const valid = session.myColour !== null && session.myColour !== takenId;

  return (
    <Stage veil={0.82}>
      <BackButton />
      <Content>
        <Overline>STEP 2 OF 2</Overline>
        <Title>Choose your firefly</Title>
        <Body>
          This is how {session.partnerName} will know a light is you thinking of
          them.
        </Body>

        <div className="mt-7 grid grid-cols-3 gap-x-4 gap-y-6">
          {FIREFLY_COLOURS.map((c) => (
            <Swatch
              key={c.id}
              hex={c.hex}
              name={c.name}
              taken={c.id === takenId}
              selected={c.id !== takenId && session.myColour === c.id}
              onSelect={() => {
                void session.chooseColour(c.id as FireflyColourId);
              }}
            />
          ))}
        </div>

        {taken && (
          <p className="mt-7 font-body text-[12px] text-text-dim">
            {taken.name} is already {session.partnerName}&rsquo;s
          </p>
        )}
      </Content>

      <Footer>
        <PrimaryButton disabled={!valid} onClick={() => router.push("/how")}>
          This one
        </PrimaryButton>
      </Footer>
    </Stage>
  );
}

function Swatch({
  hex,
  name,
  selected,
  taken,
  onSelect,
}: {
  hex: string;
  name: string;
  selected: boolean;
  taken: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={taken ? undefined : onSelect}
      disabled={taken}
      aria-pressed={taken ? undefined : selected}
      aria-label={taken ? `${name} — already taken` : name}
      className={`flex flex-col items-center gap-2 ${
        taken ? "cursor-not-allowed" : ""
      }`}
    >
      <span
        className={`grid size-[72px] shrink-0 place-items-center rounded-full transition-transform ${
          taken ? "opacity-25 saturate-50" : "active:scale-95"
        } ${
          selected
            ? "ring-2 ring-white/85 ring-offset-4 ring-offset-transparent"
            : ""
        }`}
        style={{
          background: `radial-gradient(circle, ${hex}cc 0%, ${hex}55 45%, ${hex}00 72%)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/art/firefly.svg"
          alt=""
          draggable={false}
          className="no-select w-[42%]"
        />
      </span>

      <span
        className={`font-body text-[11px] leading-none ${
          taken
            ? "text-text-dim opacity-50 line-through"
            : selected
              ? "text-text-primary"
              : "text-text-muted"
        }`}
      >
        {name}
      </span>
    </button>
  );
}
