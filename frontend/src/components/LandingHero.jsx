import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Pause, Play } from 'lucide-react';
import library from '../assets/foto landing page/landing1.jpg';
import school from '../assets/foto landing page/landing2.jpg';
import students from '../assets/foto landing page/landing3.jpg';

const photos = [
  { src: students, label: 'Siswa membaca' },
  { src: library, label: 'Ruang perpustakaan' },
  { src: school, label: 'Gedung sekolah' },
];
const reducedMotion = '(prefers-reduced-motion: reduce)';

export default function LandingHero() {
  const [slide, setSlide] = useState({ current: 0, previous: null });
  const [paused, setPaused] = useState(
    () => window.matchMedia(reducedMotion).matches,
  );
  const { current, previous } = slide;

  useEffect(() => {
    const preference = window.matchMedia(reducedMotion);
    const reduce = (event) => {
      if (event.matches) setPaused(true);
    };
    preference.addEventListener('change', reduce);
    return () => preference.removeEventListener('change', reduce);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => {
      setSlide({ current: (current + 1) % photos.length, previous: current });
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [current, paused]);

  return (
    <section className="hero" aria-labelledby="landing-title">
      <div className="hero-photos" aria-hidden="true">
        {photos.map(({ src, label }, index) => (
          <img
            key={label}
            src={src}
            alt=""
            fetchPriority={index === 0 ? 'high' : 'low'}
            className={
              index === current
                ? previous === null
                  ? 'is-current'
                  : 'is-current is-entering'
                : index === previous
                  ? 'is-previous'
                  : ''
            }
          />
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
        <div className="hero-controls" role="group" aria-label="Foto sekolah">
          {photos.map(({ label }, index) => (
            <button
              type="button"
              className="hero-dot"
              key={label}
              aria-label={label}
              aria-pressed={current === index}
              onClick={() => {
                setPaused(true);
                if (current !== index)
                  setSlide({ current: index, previous: current });
              }}
            >
              <span aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            className="hero-playback"
            aria-label={paused ? 'Putar foto otomatis' : 'Jeda foto otomatis'}
            onClick={() => setPaused(!paused)}
          >
            {paused ? (
              <Play size={16} aria-hidden="true" />
            ) : (
              <Pause size={16} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
