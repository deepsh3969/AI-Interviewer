import { useLayoutEffect, useRef } from 'react';
import { ArrowUp, MessageSquareText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap, motionAllowed } from '../../lib/showcase/anim.js';

/**
 * SECTION 07 — Conversion stage.
 * One clear promise, two real actions (start the interview flow / back to
 * the top). Ambient glows are decorative and static; only the content
 * receives a short entrance.
 */

export default function CtaSection() {
  const rootRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !motionAllowed()) return;
    const ctx = gsap.context(() => {
      gsap.from('[data-cta-reveal]', {
        autoAlpha: 0,
        y: 34,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.12,
        clearProps: 'all',
        scrollTrigger: { trigger: root, start: 'top 72%', once: true },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  function backToTop() {
    window.scrollTo({ top: 0, behavior: motionAllowed() ? 'smooth' : 'auto' });
  }

  return (
    <section ref={rootRef} id="cta" className="sc-section relative overflow-hidden" aria-labelledby="cta-title">
      <div className="sc-glow-violet absolute -top-24 left-1/2 h-80 w-[560px] -translate-x-1/2" aria-hidden />
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="sc-grid-bg absolute inset-0 opacity-60" />
      </div>

      <div className="relative mx-auto max-w-3xl text-center">
        <p className="sc-eyebrow" data-cta-reveal>
          Start today
        </p>
        <h2 id="cta-title" className="sc-title-xl mt-6" data-cta-reveal>
          Your next interview is a chance to <span className="sc-gradient-text">improve</span>.
        </h2>
        <p className="sc-copy mx-auto mt-6 max-w-xl" data-cta-reveal>
          Pick a role, answer a few realistic questions, and get structured feedback you can act on before the real
          conversation.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row" data-cta-reveal>
          <button
            type="button"
            onClick={() => navigate('/interview/new')}
            className="sc-btn-primary inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5"
          >
            <MessageSquareText size={17} aria-hidden />
            Start an interview
          </button>
          <button
            type="button"
            onClick={backToTop}
            className="sc-btn-ghost inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5"
          >
            <ArrowUp size={16} aria-hidden />
            Back to top
          </button>
        </div>

        <p className="mt-8 text-xs text-showcase-dim" data-cta-reveal>
          Sessions are saved in this browser · no fabricated outcomes, just your practice data.{' '}
          <Link to="/help" className="font-semibold text-showcase-blue transition-colors hover:text-showcase-ink">
            See limitations
          </Link>
        </p>
      </div>
    </section>
  );
}
