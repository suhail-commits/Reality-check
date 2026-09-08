import { CallToAction } from "@/components/marketing/cta";
import { Exhibit } from "@/components/marketing/exhibit";
import { SiteFooter } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { Metrics } from "@/components/marketing/metrics";
import { Narrative } from "@/components/marketing/narrative";
import { Nav } from "@/components/marketing/nav";
import { NeuralBackground } from "@/components/marketing/neural-bg";
import { SignalRail } from "@/components/marketing/signal-rail";
import { Sources } from "@/components/marketing/sources";
import { IdeaTimeline } from "@/components/marketing/timeline";
import { VerdictReveal } from "@/components/marketing/verdict";
import { WorldImpact } from "@/components/marketing/world";

/**
 * Claim, then method, then proof -- and underneath it, one continuous picture.
 *
 * The illustrations are a single argument told in three parts. A brain in the
 * hero, where ideas start. A timeline where one grows. A globe at the end,
 * where it lands. They share a vocabulary of nodes and connections on purpose,
 * so they read as the same thing at three sizes rather than as three separate
 * decorations.
 *
 * The written content is unchanged. The order is unchanged. What moved is the
 * amount of air around it: every section is now given room to be read rather
 * than packed against the next one.
 */
export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />

        {/*
         * The quiet sections carry the network layer. It sits behind the sparse
         * parts of the page, where there is room for depth, and stays out of the
         * dense ones, where it would only add noise.
         */}
        <div className="relative">
          <NeuralBackground />
          <div className="relative">
            <SignalRail />
            <IdeaTimeline />
          </div>
        </div>

        <Exhibit>
          <Narrative />
          <VerdictReveal />
        </Exhibit>

        <div className="relative">
          <NeuralBackground />
          <div className="relative">
            <Metrics />
            <WorldImpact />
          </div>
        </div>

        <Sources />
        <CallToAction />
      </main>
      <SiteFooter />
    </>
  );
}
