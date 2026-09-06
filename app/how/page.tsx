import Stage from "@/components/Stage";
import { Content, Footer, Overline, PrimaryButton } from "@/components/ui";
import { PARTNER_NAME } from "@/lib/constants";

const STEPS = [
  {
    title: "Think of them",
    body: `Double-tap the jar whenever ${PARTNER_NAME} crosses your mind. No message to write.`,
  },
  {
    title: "A firefly drifts out",
    body: "One light floats into the forest — and her jar lights up in the same moment.",
  },
  {
    title: "The forest fills",
    body: "By dawn it holds every time you missed each other. Then it clears for a new night.",
  },
];

export default function HowItWorks() {
  return (
    <Stage veil={0.86}>
      <Content>
        <Overline>THE RITUAL</Overline>
        <h1 className="mt-3 font-display text-[26px] font-bold leading-tight text-text-primary">
          How the jar works
        </h1>

        <ol className="mt-6 space-y-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3.5">
              <span className="mt-0.5 grid size-[30px] shrink-0 place-items-center rounded-full bg-gradient-to-b from-gold-top to-gold-bottom font-display text-[15px] font-medium text-ink">
                {i + 1}
              </span>
              <div>
                <h2 className="font-display text-[16px] font-bold text-text-primary">
                  {s.title}
                </h2>
                <p className="mt-1 font-body text-[13.5px] leading-[1.5] text-text-muted">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Content>

      <div className="absolute left-1/2 top-[63%] w-[27%] -translate-x-1/2">
        <span className="jar-halo pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/art/jar.svg"
          alt=""
          draggable={false}
          className="no-select relative w-full"
        />
      </div>

      <Footer>
        <PrimaryButton href="/jar">Light the first one</PrimaryButton>
      </Footer>
    </Stage>
  );
}
