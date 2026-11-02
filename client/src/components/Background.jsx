import { prefersReducedMotion } from '../lib/hooks.js';

export default function Background() {
  return (
    <div className="bg-wrap" aria-hidden="true">
      <video className="bg-video" autoPlay={!prefersReducedMotion()} loop={!prefersReducedMotion()} muted playsInline preload="metadata">
        <source src="/defendiq-intro-landscape.mp4" type="video/mp4" />
      </video>
      <div className="bg-video-scrim" />
    </div>
  );
}
