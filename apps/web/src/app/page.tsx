import { CallToAction } from "@/components/marketing/cta";
import { Exhibit } from "@/components/marketing/exhibit";
import { SiteFooter } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { Metrics } from "@/components/marketing/metrics";
import { Narrative } from "@/components/marketing/narrative";
import { Nav } from "@/components/marketing/nav";
import { SignalRail } from "@/components/marketing/signal-rail";
import { Sources } from "@/components/marketing/sources";
import { IdeaTimeline } from "@/components/marketing/timeline";
import { VerdictReveal } from "@/components/marketing/verdict";
import { WorldImpact } from "@/components/marketing/world";

/**
 * Claim, then method, then proof -- and underneath it, one continuous picture.
 *
 * One particle field runs behind the entire app from the root layout, fixed so
 * it holds still while the page moves over it. Everything on top of it is
 * either type or an opaque block, so the texture shows in the gaps rather than
 * behind the words. The globe at the end is the one large visual moment, and it
 * is the only place the page stops being a document.
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

        <SignalRail />
        <IdeaTimeline />

        <Exhibit>
          <Narrative />
          <VerdictReveal />
        </Exhibit>

        <Metrics />
        <WorldImpact />

        <Sources />
        <CallToAction />
      </main>
      <SiteFooter />
    </>
  );
}
