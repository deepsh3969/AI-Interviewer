import { useEffect } from 'react';
import { ScrollTrigger } from '../lib/showcase/anim.js';
import ScrollProgress from '../components/showcase/ScrollProgress.js';
import ShowcaseNav from '../components/showcase/ShowcaseNav.js';
import HeroSection from '../components/showcase/HeroSection.js';
import StorySection from '../components/showcase/StorySection.js';
import FeaturesSection from '../components/showcase/FeaturesSection.js';
import SpotlightSection from '../components/showcase/SpotlightSection.js';
import AnalyticsSection from '../components/showcase/AnalyticsSection.js';
import ProcessSection from '../components/showcase/ProcessSection.js';
import CtaSection from '../components/showcase/CtaSection.js';
import ShowcaseFooter from '../components/showcase/ShowcaseFooter.js';

/**
 * The public landing page is the scroll-driven product showcase (dark
 * theme). The scoped `html.showcase-page` class keeps the rest of the
 * authenticated app on its light theme; it is removed on unmount so
 * /dashboard, /analytics, etc. never inherit showcase styles.
 */
export default function Landing() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('showcase-page');

    let cancelled = false;

    // Direct loads of /#section should land on the section. Runs instantly
    // (explicit behavior overrides the page's smooth scroll) and again after
    // ScrollTrigger refreshes, because pin spacers change positions.
    const scrollToHash = () => {
      const hash = window.location.hash;
      if (hash.length <= 1) return;
      try {
        document.querySelector(hash)?.scrollIntoView({ behavior: 'instant' });
      } catch {
        /* invalid selectors in the hash are ignored */
      }
    };
    const frame = requestAnimationFrame(scrollToHash);

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready
        .then(() => {
          if (cancelled) return;
          ScrollTrigger.refresh();
          scrollToHash();
        })
        .catch(() => {
          /* font readiness is best-effort */
        });
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      root.classList.remove('showcase-page');
    };
  }, []);

  return (
    <div className="showcase min-h-screen bg-showcase text-showcase-ink antialiased">
      <ScrollProgress />
      <ShowcaseNav />
      <main>
        <HeroSection />
        <StorySection />
        <FeaturesSection />
        <SpotlightSection />
        <AnalyticsSection />
        <ProcessSection />
        <CtaSection />
      </main>
      <ShowcaseFooter />
    </div>
  );
}
