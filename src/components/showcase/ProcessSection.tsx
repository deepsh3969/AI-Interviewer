import { useLayoutEffect, useRef } from 'react';
import { BarChart3, MessagesSquare, RotateCcw, Settings, Sparkles, Target } from 'lucide-react';
import { gsap, motionAllowed } from '../../lib/showcase/anim.js';

/**
 * SECTION 06 — Interactive process timeline.
 * Horizontal on desktop, vertical on mobile. The rail fills with scroll
 * progress; `data-state` moves each step between idle / active / done.
 * Without JS the steps render fully visible in their neutral state.
 */

const STEPS = [
  { icon: Target, title: 'Choose your target role', copy: 'Software, data, product, design, marketing, support - or your own title.' },
  { icon: Settings, title: 'Configure your interview', copy: 'Type, difficulty, question count and duration. Optional JD context.' },
  { icon: MessagesSquare, title: 'Answer realistic questions', copy: 'Type or speak under a timer, with drafts saved as you go.' },
  { icon: Sparkles, title: 'Receive actionable feedback', copy: 'Dimension scores with evidence, strengths and concrete fixes.' },
  { icon: BarChart3, title: 'Review your progress', copy: 'Reports, trends and recurring weaknesses across sessions.' },
  { icon: RotateCcw, title: 'Practice again', copy: 'Take the recommendations and run the next, harder loop.' },
];

export default function ProcessSection() {
  const rootRef = useRef<HTMLElement>(null);
  const fillHRef = useRef<HTMLDivElement>(null);
  const fillVRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !motionAllowed()) return;

    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      const stepEls = () => Array.from(root.querySelectorAll<HTMLElement>('[data-process-step]'));

      const applyState = (progress: number) => {
        const active = Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length));
        stepEls().forEach((el) => {
          const index = Number(el.dataset.index ?? '0');
          el.dataset.state = index < active ? 'done' : index === active ? 'active' : 'idle';
        });
      };

      // Reveal the steps once, short stagger.
      gsap.from('[data-process-step]', {
        autoAlpha: 0,
        y: 26,
        duration: 0.55,
        ease: 'power2.out',
        stagger: 0.08,
        clearProps: 'transform,opacity,visibility',
        scrollTrigger: { trigger: root, start: 'top 78%', once: true },
      });

      // Desktop: horizontal rail fill. Starts once the section head reaches
      // the top and completes as the CTA approaches - so the sweep matches
      // the time the steps are actually being read.
      mm.add('(min-width: 1024px)', () => {
        applyState(0);
        if (fillHRef.current) {
          gsap.fromTo(
            fillHRef.current,
            { scaleX: 0 },
            {
              scaleX: 1,
              ease: 'none',
              transformOrigin: 'left center',
              scrollTrigger: {
                trigger: root,
                start: 'top top',
                end: 'bottom top',
                scrub: 0.4,
                invalidateOnRefresh: true,
                onUpdate: (self) => applyState(self.progress),
              },
            },
          );
        }
        return () => {
          if (fillHRef.current) fillHRef.current.style.transform = '';
          stepEls().forEach((el) => delete el.dataset.state);
        };
      });

      // Mobile: vertical rail fill sweeps as the list scrolls by.
      mm.add('(max-width: 1023.98px)', () => {
        applyState(0);
        if (fillVRef.current) {
          gsap.fromTo(
            fillVRef.current,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: 'none',
              transformOrigin: 'top center',
              scrollTrigger: {
                trigger: root,
                start: 'top top',
                end: 'bottom 45%',
                scrub: 0.4,
                invalidateOnRefresh: true,
                onUpdate: (self) => applyState(self.progress),
              },
            },
          );
        }
        return () => {
          if (fillVRef.current) fillVRef.current.style.transform = '';
          stepEls().forEach((el) => delete el.dataset.state);
        };
      });
    }, root);

    return () => {
      mm.revert();
      ctx.revert();
    };
  }, []);

  const renderStep = (step: (typeof STEPS)[number], index: number, variant: 'h' | 'v') => {
    const Icon = step.icon;
    return (
      <li
        key={`${variant}-${step.title}`}
        data-process-step
        data-index={index}
        className={`process-step ${variant === 'h' ? 'flex flex-col items-center text-center' : 'relative flex gap-4'}`}
      >
        <span className="process-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-showcase-line bg-showcase-2 transition-all duration-300">
          <Icon size={17} aria-hidden />
        </span>
        <div className={variant === 'h' ? 'mt-4' : ''}>
          <p className="process-title text-sm font-semibold transition-colors duration-300">{step.title}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-showcase-dim">{step.copy}</p>
        </div>
      </li>
    );
  };

  return (
    <section ref={rootRef} id="process" className="sc-section" aria-labelledby="process-title">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="sc-eyebrow">The loop</p>
          <h2 id="process-title" className="sc-title-lg mt-5">
            From practice to progress.
          </h2>
          <p className="sc-copy mt-4">Six steps, repeatable in minutes - the preparation loop the whole product is built around.</p>
        </div>

        {/* Desktop: horizontal */}
        <div className="relative mt-16 hidden lg:block">
          <div className="absolute top-[22px] right-6 left-6 h-px bg-white/10" aria-hidden>
            <div ref={fillHRef} data-process-fill-h className="h-full origin-left bg-gradient-to-r from-showcase-violet to-showcase-blue" />
          </div>
          <ol className="relative grid grid-cols-6 gap-5">
            {STEPS.map((step, index) => renderStep(step, index, 'h'))}
          </ol>
        </div>

        {/* Mobile: vertical */}
        <div className="relative mt-12 lg:hidden">
          <div className="absolute top-3 bottom-3 left-[21px] w-px bg-white/10" aria-hidden>
            <div ref={fillVRef} data-process-fill-v className="w-full origin-top bg-gradient-to-b from-showcase-violet to-showcase-blue" />
          </div>
          <ol className="relative space-y-8 pl-0">
            {STEPS.map((step, index) => renderStep(step, index, 'v'))}
          </ol>
        </div>
      </div>
    </section>
  );
}
