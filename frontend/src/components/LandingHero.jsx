import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { reducedMotionQuery } from '../services/reducedMotion';
import library from '../assets/foto landing page/landing1.jpg';
import school from '../assets/foto landing page/landing2.jpg';
import students from '../assets/foto landing page/landing3.jpg';

const photos = [
  { src: students, scene: 'students' },
  { src: library, scene: 'library' },
  { src: school, scene: 'school' },
];

export default function LandingHero() {
  const [slide, setSlide] = useState({ current: 0, previous: null });
  const photoTrack = useRef(null);
  const animator = useRef(null);
  const { current, previous } = slide;

  useLayoutEffect(() => {
    const preference = window.matchMedia(reducedMotionQuery);
    if (previous === null || preference.matches || !animator.current) return;
    const tween = animator.current.fromTo(
      photoTrack.current.children[current],
      { xPercent: 100 },
      { xPercent: 0, duration: 0.65, ease: 'power3.out' },
    );
    const finishIfReduced = () => {
      if (preference.matches) tween.progress(1);
    };
    preference.addEventListener('change', finishIfReduced);
    return () => {
      preference.removeEventListener('change', finishIfReduced);
      tween.revert();
    };
  }, [current, previous]);

  useEffect(() => {
    const preference = window.matchMedia(reducedMotionQuery);
    let mounted = true;
    import('gsap')
      .then(({ gsap }) => {
        if (mounted) animator.current = gsap;
      })
      .catch((error) => console.error('Animasi foto gagal dimuat.', error));
    const timer = window.setInterval(() => {
      if (!preference.matches) {
        setSlide(({ current: index }) => ({
          current: (index + 1) % photos.length,
          previous: index,
        }));
      }
    }, 5000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="hero" aria-labelledby="landing-title">
      <div ref={photoTrack} className="hero-photos" aria-hidden="true">
        {photos.map(({ src, scene }, index) => (
          <div
            key={src}
            style={scene === 'library' ? { '--hero-photo-backdrop': 'url("' + src + '")' } : undefined}
            className={'hero-photo hero-photo-' + scene + ' ' + (
              index === current ? 'is-current' : index === previous ? 'is-previous' : ''
            )}
          >
            <img src={src} alt="" fetchPriority={index === 0 ? 'high' : 'low'} />
          </div>
        ))}
      </div>
      <div className="hero-inner">
        <div className="hero-copy">
          <h1 id="landing-title">
            Perpustakaan
            <br />
            SMK Mutiara Ilmu
          </h1>
          <p>
            Temukan inspirasi tanpa batas melalui koleksi buku digital yang
            kaya, layanan sirkulasi yang efisien, dan ruang belajar modern yang
            dirancang untuk mendukung setiap langkah akademikmu.
          </p>
          <div className="hero-actions">
            <Link className="btn" to="/katalog">
              Buka katalog <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link className="btn hero-secondary" to="/#aturan">
              Cara meminjam
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
