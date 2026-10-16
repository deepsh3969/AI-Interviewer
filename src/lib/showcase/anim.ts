import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Showcase animation runtime.
 *
 * One stack only: GSAP + ScrollTrigger for scroll-controlled storytelling
 * (pinning, scrubbed progress, staged reveals). Ordinary interface feedback
 * stays on CSS transitions. Every section owns its lifecycle:
 *
 *   useLayoutEffect(() => {
 *     if (!motionAllowed()) return;          // markup stays visible & static
 *     const ctx = gsap.context(() => { ... }, root);
 *     return () => ctx.revert();             // kills tweens + ScrollTriggers
 *   }, []);
 *
 * matchMedia groups must be reverted explicitly via mm.revert() as well.
 */

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

/** True when the OS does not ask for reduced motion. */
export function motionAllowed(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
