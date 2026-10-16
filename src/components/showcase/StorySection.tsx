import { useLayoutEffect, useRef } from 'react';
import { gsap, motionAllowed } from '../../lib/showcase/anim.js';
import { FeedbackMock, PlanMock, QuestionMock } from './mocks.js';

/**
 * SECTION 02 — Scroll-controlled storytelling.
 *
 * Desktop (JS + motion): the stage pins and a scrubbed timeline crossfades
 * three scenes (Practice -> Feedback -> Improvement) with a progress rail.
 * Mobile / reduced motion / no JS: scenes stack in normal flow and stay
 * fully readable - `.is-animated` is only ever added for the pinned mode.
 */

const SCENES = [
  {
    id: 'practice',
    kicker: 'Scene A - Practice',
    title: 'Answer real questions',
    copy: 'Choose a target role and start a session. A timer, question counter and response area keep the practice focused - type your answer or speak it where the browser supports it.',
    points: ['Role-specific question sets', 'Voice or typed answers', 'Drafts survive a refresh'],
    mock: <QuestionMock />,
  },
  {
    id: 'feedback',
    kicker: 'Scene B - Feedback',
    title: 'See why an answer works',
    copy: 'Each answer is scored across clear dimensions with concrete evidence, strengths to repeat and fixes to make. Scores shown here are labelled sample data - your report uses your own answers.',
    points: ['Dimension-level scores', 'Evidence-based suggestions', 'Honest AI / heuristic labelling'],
    mock: <FeedbackMock />,
  },
  {
    id: 'improvement',
    kicker: 'Scene C - Improvement',
    title: 'Leave with a plan',
    copy: 'Sessions end with prioritized next steps - which skills to drill, what difficulty to try and which question types to rehearse next until the weak spots fade.',
    points: ['Prioritized practice queue', 'Skill trends over time', 'Recommendations from real history'],
    mock: <PlanMock />,
  },
];

export default function StorySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const railFillRef = useRef<HTMLDivElement>(null);
  const railLabelsRef = useRef<(HTMLLIElement | null)[]>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage || !motionAllowed()) return;

    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      const scenes = gsap.utils.toArray<HTMLElement>('[data-scene]', stage);

      // --- Pinned mode: desktop, motion allowed -----------------------------
      mm.add('(min-width: 1024px)', () => {
        stage.classList.add('is-animated');
        gsap.set(scenes, { autoAlpha: 0, y: 36 });
        gsap.set(scenes[0], { autoAlpha: 1, y: 0 });

        const bars = scenes[1]?.querySelectorAll<HTMLElement>('[data-bar]') ?? [];
        const counters = scenes[1]?.querySelectorAll<HTMLElement>('[data-count]') ?? [];

        const setRail = (progress: number) => {
          if (railFillRef.current) {
            railFillRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0, progress)).toFixed(4)})`;
          }
          const active = progress < 0.36 ? 0 : progress < 0.68 ? 1 : 2;
          railLabelsRef.current.forEach((el, index) => {
            if (!el) return;
            el.dataset.state = index < active ? 'done' : index === active ? 'active' : 'idle';
          });
        };
        setRail(0);

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: stage,
            start: 'top top',
            end: () => '+=' + Math.round(window.innerHeight * 3.2),
            pin: true,
            pinSpacing: true,
            scrub: 0.6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => setRail(self.progress),
          },
        });

        // Hold A -> transition -> Hold B (bars grow inside hold B)
        tl.to({}, { duration: 0.9 })
          .to(scenes[0], { autoAlpha: 0, y: -36, duration: 0.35, ease: 'power1.inOut' })
          .fromTo(
            scenes[1],
            { autoAlpha: 0, y: 36 },
            { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power1.inOut' },
            '<',
          )
          .fromTo(bars, { scaleX: 0 }, { scaleX: 1, duration: 0.5, stagger: 0.12, transformOrigin: 'left center' }, '<+0.15')
          .fromTo(
            counters,
            { textContent: 0 },
            {
              textContent: (_i: number, target: HTMLElement) => target.dataset.count ?? '0',
              duration: 0.6,
              snap: { textContent: 1 },
            },
            '<',
          )
          .to({}, { duration: 0.7 })
          // Hold B -> transition -> Hold C with a gentle drift toward the next section
          .to(scenes[1], { autoAlpha: 0, y: -36, duration: 0.35, ease: 'power1.inOut' })
          .fromTo(
            scenes[2],
            { autoAlpha: 0, y: 36 },
            { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power1.inOut' },
            '<',
          )
          .fromTo(
            scenes[2].querySelectorAll('[data-plan-item]'),
            { autoAlpha: 0, y: 14 },
            { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.14 },
            '<+0.1',
          )
          .to({}, { duration: 0.5 })
          .to(scenes[2], { y: -22, duration: 0.8 });

        return () => {
          stage.classList.remove('is-animated');
          if (railFillRef.current) railFillRef.current.style.transform = 'scaleX(0)';
          railLabelsRef.current.forEach((el) => {
            if (el) delete el.dataset.state;
          });
        };
      });

      // --- Stacked mode: mobile reveals (desktop stacked users get static) --
      mm.add('(max-width: 1023.98px)', () => {
        scenes.forEach((scene) => {
          gsap.from(scene, {
            autoAlpha: 0,
            y: 34,
            duration: 0.7,
            ease: 'power2.out',
            clearProps: 'all',
            scrollTrigger: { trigger: scene, start: 'top 85%', once: true },
          });
        });
      });
    }, section);

    return () => {
      mm.revert();
      ctx.revert();
    };
  }, []);

  return (
    <section ref={sectionRef} id="story" className="sc-section overflow-hidden" aria-labelledby="story-title">
      <div ref={stageRef} className="story-stage mx-auto max-w-6xl pt-24 lg:pt-16">
        {/* Head */}
        <div className="mb-10 lg:mb-12" data-story-head>
          <p className="sc-eyebrow">The experience</p>
          <h2 id="story-title" className="sc-title-lg mt-5 max-w-2xl">
            Preparation changes everything.
          </h2>
          <p className="sc-copy mt-4 max-w-2xl">
            One session moves through three moments - practice, feedback, improvement. Scroll to walk through them.
          </p>

          {/* Progress rail (pinned mode only) */}
          <div className="story-rail mt-8 hidden lg:block" aria-hidden>
            <div className="relative h-px w-full max-w-md bg-white/10">
              <div
                ref={railFillRef}
                className="absolute inset-y-0 left-0 w-full origin-left bg-gradient-to-r from-showcase-violet to-showcase-blue"
              />
            </div>
            <ol className="mt-3 flex max-w-md justify-between text-[11px] font-semibold uppercase tracking-wider">
              <li ref={(el) => { railLabelsRef.current[0] = el; }} data-state="active" className="text-showcase-ink">
                Practice
              </li>
              <li ref={(el) => { railLabelsRef.current[1] = el; }} data-state="idle" className="text-showcase-dim/60">
                Feedback
              </li>
              <li ref={(el) => { railLabelsRef.current[2] = el; }} data-state="idle" className="text-showcase-dim/60">
                Improvement
              </li>
            </ol>
          </div>
        </div>

        {/* Scenes */}
        <div className="story-scenes grid gap-12 lg:gap-8">
          {SCENES.map((scene, index) => (
            <article
              key={scene.id}
              data-scene
              className={`story-scene grid items-center gap-8 lg:grid-cols-2 ${index === 0 ? 'is-first' : ''}`}
              aria-label={scene.title}
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-showcase-violet">{scene.kicker}</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-showcase-ink sm:text-3xl">{scene.title}</h3>
                <p className="sc-copy mt-4 max-w-md">{scene.copy}</p>
                <ul className="mt-5 space-y-2.5">
                  {scene.points.map((point) => (
                    <li key={point} className="flex items-center gap-2.5 text-sm text-showcase-dim">
                      <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-showcase-violet to-showcase-blue" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-center lg:justify-end">{scene.mock}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
