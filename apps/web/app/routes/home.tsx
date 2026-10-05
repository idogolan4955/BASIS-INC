import { Structure, Wordmark } from '@basis/ui';

// Holding page. The flagship is designed in phase B3 and built in B4 from the
// published catalog; until then the site states what BASIS is, in the brand's
// own words from the booklet, over the material drawn from its construction.

export function meta() {
  return [
    { title: 'BASIS INC. Foundation Fabrics' },
    {
      name: 'description',
      content: 'BASIS INC. supplies foundation fabrics for bridal construction: powermesh, stretch mesh, lining and tulle.',
    },
  ];
}

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-[78%] text-nude [mask-image:linear-gradient(to_left,black_10%,transparent_95%)] md:w-[62%]"
      >
        <Structure kind="mesh" scale={3.2} />
      </div>

      <header className="relative px-5 pt-6 md:px-12 md:pt-10">
        <Wordmark className="text-base md:text-lg" />
      </header>

      <section className="relative flex flex-1 flex-col justify-end px-5 pb-10 md:px-12 md:pb-16">
        <h1 className="font-display text-[3rem] leading-[0.95] tracking-[-0.02em] sm:text-[4.5rem] md:text-[7rem] lg:text-[9rem]">
          Foundation
          <br />
          fabrics.
        </h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-ink-soft md:mt-8 md:text-lg">
          The materials a bridal gown is built on: powermesh, stretch mesh, lining and tulle, in one shade language.
        </p>
        <p className="caps mt-10 text-ink-muted md:mt-14">Website in preparation</p>
      </section>
    </main>
  );
}
