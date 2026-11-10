export interface LayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-elbro-950 text-elbro-100 antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-elbro-100 text-elbro-950 rounded-lg"
      >
        Aller au contenu principal
      </a>
      {children}
    </div>
  );
}