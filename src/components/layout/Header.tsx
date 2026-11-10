import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';

export function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { itemCount } = useCart();
  const { user, isAdmin, signOut } = useAuth();

  const navLinks = [
    { href: '/', label: 'Accueil' },
    { href: '/produits', label: 'Produits' },
    { href: '/produits?category=ensembles', label: 'Ensembles' },
    { href: '/produits?category=vetements', label: 'Vêtements' },
    { href: '/produits?category=accessoires', label: 'Accessoires' },
    { href: '/produits?category=chaussures', label: 'Chaussures' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-elbro-950/95 backdrop-blur-md border-b border-elbro-400/10">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Navigation principale">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" aria-label="ELBRO STORE - Accueil">
            <span className="font-bold text-2xl lg:text-3xl tracking-wider text-elbro-100">
              ELBRO
            </span>
            <span className="hidden sm:block text-xs font-medium tracking-widest text-elbro-400 uppercase">
              STORE
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'text-sm font-medium tracking-wide transition-colors',
                  'hover:text-elbro-400',
                  location.pathname === link.href ||
                  (link.href !== '/' && location.pathname.startsWith(link.href))
                    ? 'text-elbro-100'
                    : 'text-elbro-400'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Cart */}
            <Link to="/panier" className="relative p-2 text-elbro-400 hover:text-elbro-100 transition-colors" aria-label="Panier">
              <ShoppingBag className="w-6 h-6" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-elbro-100 text-elbro-950 text-xs font-bold">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>

            {/* User/Admin */}
            {user ? (
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <Link to="/admin" className="text-sm font-medium text-elbro-400 hover:text-elbro-100 transition-colors">
                    Administration
                  </Link>
                )}
                <button
                  onClick={signOut}
                  className="text-sm font-medium text-elbro-400 hover:text-elbro-100 transition-colors"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <Link to="/connexion" className="text-sm font-medium text-elbro-400 hover:text-elbro-100 transition-colors">
                Connexion
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-elbro-400 hover:text-elbro-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden py-4 border-t border-elbro-400/10 animate-slide-down">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    'px-3 py-2 text-base font-medium rounded-lg transition-colors',
                    location.pathname === link.href ||
                    (link.href !== '/' && location.pathname.startsWith(link.href))
                      ? 'bg-elbro-900 text-elbro-100'
                      : 'text-elbro-400 hover:bg-elbro-900/50 hover:text-elbro-100'
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-elbro-400/10 flex items-center gap-4">
                <Link to="/panier" className="flex items-center gap-2 text-elbro-400 hover:text-elbro-100" onClick={() => setMobileMenuOpen(false)}>
                  <ShoppingBag className="w-5 h-5" />
                  Panier {itemCount > 0 && `(${itemCount})`}
                </Link>
                {user ? (
                  <>
                    {isAdmin && (
                      <Link to="/admin" className="text-elbro-400 hover:text-elbro-100" onClick={() => setMobileMenuOpen(false)}>
                        Administration
                      </Link>
                    )}
                    <button onClick={() => { signOut(); setMobileMenuOpen(false); }} className="text-elbro-400 hover:text-elbro-100">
                      Déconnexion
                    </button>
                  </>
                ) : (
                  <Link to="/connexion" className="text-elbro-400 hover:text-elbro-100" onClick={() => setMobileMenuOpen(false)}>
                    Connexion
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}