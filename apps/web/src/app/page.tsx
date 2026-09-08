import { CallToAction } from "@/components/marketing/cta";
import { Exhibit } from "@/components/marketing/exhibit";
import { SiteFooter } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { Metrics } from "@/components/marketing/metrics";
import { Narrative } from "@/components/marketing/narrative";
import { Nav } from "@/components/marketing/nav";
import { SignalRail } from "@/components/marketing/signal-rail";
import { Sources } from "@/components/marketing/sources";
import { VerdictReveal } from "@/components/marketing/verdict";

/**
 * Claim, then method, then proof.
 *
 * The hero says what this is. The four questions say how it decides. Only then
 * does a worked example appear, inside a frame that makes plain it is somebody
 * else's idea rather than ours -- an earlier version opened with that example at
 * full size and read as though we sold a dog-walking app.
 *
 * Colour is reserved: nothing outside the exhibit uses a verdict colour, so on
 * this site colour only ever means a decision was reached.
 *
 * Nothing here claims anything it cannot cite, and there is no customer logo
 * wall, because there are no customers.
 */
export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <SignalRail />
        <Exhibit>
          <Narrative />
          <VerdictReveal />
        </Exhibit>
        <Metrics />
        <Sources />
        <CallToAction />
      </main>
      <SiteFooter />
    </>
  );
}
