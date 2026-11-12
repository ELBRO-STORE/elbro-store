import { cn } from '../../lib/utils';
import type { LayoutProps } from './MainLayout';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingBag, Settings, LogOut, Tag, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function AdminLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-elbro-950 text-elbro-100 antialiased">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-elbro-100 text-elbro-950 rounded-lg"
      >
        Aller au contenu principal
      </a>
      <div className="flex">
        <aside className="fixed inset-y-0 left-0 z-30 w-64 bg-elbro-900 border-r border-elbro-400/10 hidden lg:block">
          <AdminSidebar />
        </aside>
        <main id="admin-content" className="flex-1 lg:ml-64 min-h-screen">
          <div className="p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function AdminSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const navItems = [
    { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/admin/produits', label: 'Produits', icon: Package },
    { href: '/admin/commandes', label: 'Commandes', icon: ShoppingBag },
    { href: '/admin/coupons', label: 'Coupons', icon: Tag },
    { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
    { href: '/admin/parametres', label: 'Paramètres', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full p-4">
      <div className="mb-8">
        <Link to="/admin" className="flex items-center gap-2">
          <span className="font-bold text-xl tracking-wider text-elbro-100">ELBRO</span>
          <span className="text-xs font-medium tracking-widest text-elbro-400 uppercase">ADMIN</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1" aria-label="Navigation administration">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-elbro-950 text-elbro-100'
                  : 'text-elbro-400 hover:bg-elbro-950/50 hover:text-elbro-100'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-elbro-400/10 pt-4">
        <div className="flex items-center gap-3 px-3 py-2 text-sm">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-elbro-100 truncate">{user?.email}</p>
            <p className="text-xs text-elbro-400">Administrateur</p>
          </div>
          <button
            onClick={signOut}
            className="p-2 rounded-lg text-elbro-400 hover:text-elbro-100 hover:bg-elbro-950 transition-colors"
            aria-label="Déconnexion"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}