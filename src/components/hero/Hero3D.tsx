// 3D Hero Component - Preserved from original elbro-hero.html
// This component maintains the exact 3D outfit composition with parallax and animations

'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui';
import '../../styles/hero.css'; // Import the preserved CSS

export interface ProductPiece {
  key: 'outfit' | 'cap' | 'hoodie' | 'pants' | 'shoes';
  name: string;
  price: number;
  image: string;
  alt: string;
  inStock: boolean;
}

interface Hero3DProps {
  pieces: ProductPiece[];
  onBuyClick: (pieceKey: ProductPiece['key']) => void;
}

export function Hero3D({ pieces, onBuyClick }: Hero3DProps) {
  const heroRef = useRef<HTMLElement>(null);
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || reducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const newMx = (e.clientX - centerX) / (rect.width / 2);
      const newMy = (e.clientY - centerY) / (rect.height / 2);
      setMx(Math.max(-1, Math.min(1, newMx)));
      setMy(Math.max(-1, Math.min(1, newMy)));
    };

    const handleMouseLeave = () => {
      setMx(0);
      setMy(0);
    };

    hero.addEventListener('mousemove', handleMouseMove);
    hero.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      hero.removeEventListener('mousemove', handleMouseMove);
      hero.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [reducedMotion]);

  const getPiece = (key: ProductPiece['key']) => pieces.find(p => p.key === key);

  const outfit = getPiece('outfit');
  const cap = getPiece('cap');
  const hoodie = getPiece('hoodie');
  const pants = getPiece('pants');
  const shoes = getPiece('shoes');

  if (!outfit) return null;

  return (
    <section
      ref={heroRef}
      id="elbro-hero"
      aria-label="ELBRO — Look complet"
      style={{
        '--mx': mx,
        '--my': my,
      } as React.CSSProperties}
      className={cn('relative', reducedMotion && 'reduce-motion')}
    >
      <div className="eb-stage">
        <div className="eb-floor" />
        <div className="eb-vignette" />

        <div
          className="eb-logo"
          style={{
            transform: `translateX(-50%) translate3d(calc(var(--mx)*-10px),calc(var(--my)*-6px),0)`,
          } as React.CSSProperties}
        >
          ELBRO
          <small>OUTFIT SERIES</small>
        </div>

        <div
          className="eb-scene"
          style={{
            transform: `rotateY(calc(var(--mx)*5deg)) rotateX(calc(var(--my)*-3.5deg))`,
          } as React.CSSProperties}
        >
          <div className="eb-halo" />
          <div className="eb-ring" />

          {/* CENTRE: Look complet */}
          <div
            className="eb-item eb-center"
            data-key="outfit"
            style={{
              '--ox': '-50%',
              '--oy': '-50%',
              '--d': '12',
              '--z': '40px',
              '--r': '4',
            } as React.CSSProperties}
          >
            <div className="eb-float" style={{ '--t': '6s', '--dl': '0s', '--en': '.2s' } as React.CSSProperties}>
              <div className="eb-shadow" />
              <button
                className="eb-card"
                type="button"
                aria-label={`Look complet ELBRO - ${outfit.name}`}
                onClick={() => onBuyClick('outfit')}
              >
                <span
                  className="eb-art"
                  data-img="outfit"
                  data-alt={outfit.alt}
                >
                  {outfit.image ? (
                    <img
                      src={outfit.image}
                      alt={outfit.alt}
                      className="eb-photo"
                    />
                  ) : (
                    <span className="eb-ph">PHOTO · LOOK COMPLET</span>
                  )}
                </span>
              </button>
            </div>
            <Button
              type="button"
              className="eb-buy"
              data-buy="outfit"
              onClick={() => onBuyClick('outfit')}
              variant="primary"
              size="md"
            >
              BUY NOW
            </Button>
          </div>

          {/* COIN HAUT-GAUCHE: Casquette */}
          {cap && (
            <div
              className="eb-item eb-p eb-tl"
              data-key="cap"
              style={{
                '--d': '34',
                '--z': '90px',
                '--r': '-7',
                '--t': '6.4s',
                '--dl': '-.6s',
                '--en': '.35s',
              } as React.CSSProperties}
            >
              <div className="eb-float">
                <div className="eb-shadow" />
                <button
                  className="eb-card"
                  type="button"
                  aria-label={cap.name}
                  onClick={() => onBuyClick('cap')}
                >
                  <span
                    className="eb-art"
                    data-img="cap"
                    data-alt={cap.alt}
                  >
                    {cap.image ? (
                      <img src={cap.image} alt={cap.alt} className="eb-photo" />
                    ) : (
                      <span className="eb-ph">PHOTO · CASQUETTE</span>
                    )}
                  </span>
                  <span className="eb-tag">01 Casquette</span>
                </button>
              </div>
              <Button
                type="button"
                className="eb-buy"
                data-buy="cap"
                onClick={() => onBuyClick('cap')}
                variant="primary"
                size="md"
                disabled={!cap.inStock}
              >
                BUY NOW
              </Button>
            </div>
          )}

          {/* COIN HAUT-DROIT: Hoodie */}
          {hoodie && (
            <div
              className="eb-item eb-p eb-tr"
              data-key="hoodie"
              style={{
                '--d': '26',
                '--z': '70px',
                '--r': '7',
                '--t': '7.2s',
                '--dl': '-2.2s',
                '--en': '.5s',
              } as React.CSSProperties}
            >
              <div className="eb-float">
                <div className="eb-shadow" />
                <button
                  className="eb-card"
                  type="button"
                  aria-label={hoodie.name}
                  onClick={() => onBuyClick('hoodie')}
                >
                  <span
                    className="eb-art"
                    data-img="hoodie"
                    data-alt={hoodie.alt}
                  >
                    {hoodie.image ? (
                      <img src={hoodie.image} alt={hoodie.alt} className="eb-photo" />
                    ) : (
                      <span className="eb-ph">PHOTO · HOODIE</span>
                    )}
                  </span>
                  <span className="eb-tag">02 Hoodie</span>
                </button>
              </div>
              <Button
                type="button"
                className="eb-buy"
                data-buy="hoodie"
                onClick={() => onBuyClick('hoodie')}
                variant="primary"
                size="md"
                disabled={!hoodie.inStock}
              >
                BUY NOW
              </Button>
            </div>
          )}

          {/* COIN BAS-GAUCHE: Cargo */}
          {pants && (
            <div
              className="eb-item eb-p eb-bl"
              data-key="pants"
              style={{
                '--d': '30',
                '--z': '80px',
                '--r': '-6',
                '--t': '6.8s',
                '--dl': '-3.4s',
                '--en': '.65s',
              } as React.CSSProperties}
            >
              <div className="eb-float">
                <div className="eb-shadow" />
                <button
                  className="eb-card"
                  type="button"
                  aria-label={pants.name}
                  onClick={() => onBuyClick('pants')}
                >
                  <span
                    className="eb-art"
                    data-img="pants"
                    data-alt={pants.alt}
                  >
                    {pants.image ? (
                      <img src={pants.image} alt={pants.alt} className="eb-photo" />
                    ) : (
                      <span className="eb-ph">PHOTO · CARGO</span>
                    )}
                  </span>
                  <span className="eb-tag">03 Cargo</span>
                </button>
              </div>
              <Button
                type="button"
                className="eb-buy"
                data-buy="pants"
                onClick={() => onBuyClick('pants')}
                variant="primary"
                size="md"
                disabled={!pants.inStock}
              >
                BUY NOW
              </Button>
            </div>
          )}

          {/* COIN BAS-DROIT: Sneakers */}
          {shoes && (
            <div
              className="eb-item eb-p eb-br"
              data-key="shoes"
              style={{
                '--d': '38',
                '--z': '105px',
                '--r': '6',
                '--t': '5.9s',
                '--dl': '-1.4s',
                '--en': '.8s',
              } as React.CSSProperties}
            >
              <div className="eb-float">
                <div className="eb-shadow" />
                <button
                  className="eb-card"
                  type="button"
                  aria-label={shoes.name}
                  onClick={() => onBuyClick('shoes')}
                >
                  <span
                    className="eb-art"
                    data-img="shoes"
                    data-alt={shoes.alt}
                  >
                    {shoes.image ? (
                      <img src={shoes.image} alt={shoes.alt} className="eb-photo" />
                    ) : (
                      <span className="eb-ph">PHOTO · SNEAKERS</span>
                    )}
                  </span>
                  <span className="eb-tag">04 Sneakers</span>
                </button>
              </div>
              <Button
                type="button"
                className="eb-buy"
                data-buy="shoes"
                onClick={() => onBuyClick('shoes')}
                variant="primary"
                size="md"
                disabled={!shoes.inStock}
              >
                BUY NOW
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}