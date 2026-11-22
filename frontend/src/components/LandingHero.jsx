import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import library from '../assets/foto landing page/landing1.jpg';
import school from '../assets/foto landing page/landing2.jpg';
import students from '../assets/foto landing page/landing3.jpg';

const photos = [
  { src: students, scene: 'students' },
  { src: library, scene: 'library' },
  { src: school, scene: 'school' },
];
const reducedMotion = '(prefers-reduced-motion: reduce)';

export default function LandingHero() {
  const [slide, setSlide] = useState({ current: 0, previous: null });
  const { current, previous } = slide;

  useEffect(() => {
    const preference = window.matchMedia(reducedMotion);
    const timer = window.setInterval(() => {
      if (!preference.matches) {
        setSlide(({ current: index }) => ({
          current: (index + 1) % photos.length,
          previous: index,
        }));
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="hero" aria-labelledby="landing-title">
      <div className="hero-photos" aria-hidden="true">
        {photos.map(({ src, scene }, index) => (
          <div
            key={src}
            style={scene === 'library' ? { '--hero-photo-backdrop': 'url("' + src + '")' } : undefined}
            className={'hero-photo hero-photo-' + scene + ' ' + (
              index === current
                ? previous === null
                  ? 'is-current'
                  : 'is-current is-entering'
                : index === previous
                  ? 'is-previous'
                  : ''
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
            <a className="btn hero-secondary" href="#aturan">
              Cara meminjam
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
