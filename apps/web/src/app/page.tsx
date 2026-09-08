import { CallToAction } from "@/components/marketing/cta";
import { SiteFooter } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { Metrics } from "@/components/marketing/metrics";
import { Narrative } from "@/components/marketing/narrative";
import { Nav } from "@/components/marketing/nav";
import { SignalRail } from "@/components/marketing/signal-rail";
import { Sources } from "@/components/marketing/sources";
import { VerdictReveal } from "@/components/marketing/verdict";

/**
 * The homepage performs one complete verdict, then hands you the input box.
 *
 * The order is the argument. Competitors first, because a crowded market is the
 * thing most people wrongly read as a no. Then what those competitors' users
 * actually say. Then the gap between that and the idea you brought. Only then a
 * verdict -- and the page stays grey until it arrives, because the tool has not
 * decided yet and neither has the page.
 *
 * Nothing here claims anything it cannot cite. There is no customer logo wall,
 * because there are no customers.
 */
export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Narrative />
        <VerdictReveal />
        <SignalRail />
        <Metrics />
        <Sources />
        <CallToAction />
      </main>
      <SiteFooter />
    </>
  );
}
