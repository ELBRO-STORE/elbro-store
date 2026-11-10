import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Truck, Shield, RefreshCw, Headphones, Globe, Users, MessageSquare } from 'lucide-react';

interface FooterProps {
  storeName?: string;
  whatsappNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
}

export function Footer({
  storeName = 'ELBRO STORE',
  whatsappNumber = '212783865276',
  email,
  phone,
  address,
  instagramUrl,
  facebookUrl,
  youtubeUrl,
}: FooterProps) {
  const formattedWhatsApp = `+${whatsappNumber.replace(/(\d{3})(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5 $6')}`;

  const footerLinks = {
    'Service Client': [
      { href: '/contact', label: 'Contactez-nous' },
      { href: '/faq', label: 'FAQ' },
      { href: '/livraison', label: 'Livraison & Retours' },
      { href: '/suivi', label: 'Suivre ma commande' },
    ],
    'Informations': [
      { href: '/a-propos', label: 'À propos d\'ELBRO' },
      { href: '/magasins', label: 'Nos magasins' },
      { href: '/carrieres', label: 'Carrières' },
      { href: '/presse', label: 'Presse' },
    ],
    'Mentions Légales': [
      { href: '/cgv', label: 'CGV' },
      { href: '/mentions-legales', label: 'Mentions légales' },
      { href: '/confidentialite', label: 'Politique de confidentialité' },
      { href: '/cookies', label: 'Gestion des cookies' },
    ],
  };

  const benefits = [
    { icon: Truck, title: 'Livraison gratuite', desc: 'Dès 500 MAD d\'achat' },
    { icon: RefreshCw, title: 'Retours 30 jours', desc: 'Satisfait ou remboursé' },
    { icon: Shield, title: 'Paiement sécurisé', desc: '100% sécurisé' },
    { icon: Headphones, title: 'Support 7j/7', desc: 'Équipe dédiée' },
  ];

  const socialLinks = [
    { url: instagramUrl, icon: Globe, label: 'Instagram' },
    { url: facebookUrl, icon: Users, label: 'Facebook' },
    { url: youtubeUrl, icon: MessageSquare, label: 'YouTube' },
  ].filter((link) => link.url);

  return (
    <footer className="bg-elbro-950 border-t border-elbro-400/10" role="contentinfo">
      {/* Benefits Bar */}
      <div className="border-b border-elbro-400/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-elbro-900 border border-elbro-400/10">
                  <benefit.icon className="w-5 h-5 text-elbro-100" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-elbro-100">{benefit.title}</p>
                  <p className="text-sm text-elbro-400">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1 lg:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-6" aria-label={`${storeName} - Accueil`}>
                <span className="font-bold text-2xl lg:text-3xl tracking-wider text-elbro-100">
                  ELBRO
                </span>
                <span className="hidden sm:block text-xs font-medium tracking-widest text-elbro-400 uppercase">
                  STORE
                </span>
              </Link>
              <p className="text-elbro-400 text-sm leading-relaxed mb-6 max-w-xs">
                Streetwear premium marocain. Des pièces uniques,
                conçues pour durer et s\'affirmer.
              </p>

              {/* Contact Info */}
              <div className="space-y-3 text-sm">
                {email && (
                  <a href={`mailto:${email}`} className="flex items-center gap-2 text-elbro-400 hover:text-elbro-100 transition-colors">
                    <Mail className="w-4 h-4" /> {email}
                  </a>
                )}
                {phone && (
                  <a href={`tel:${phone}`} className="flex items-center gap-2 text-elbro-400 hover:text-elbro-100 transition-colors">
                    <Phone className="w-4 h-4" /> {phone}
                  </a>
                )}
                {address && (
                  <a href="#" className="flex items-center gap-2 text-elbro-400 hover:text-elbro-100 transition-colors">
                    <MapPin className="w-4 h-4" /> {address}
                  </a>
                )}
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-elbro-400 hover:text-elbro-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403c-.792.075-2.218-.15-3.25-.65-1.032-.5-2.178-1.476-3.19-2.64-.606-.693-1.112-1.64-1.393-2.367-.281-.728-.263-1.462.099-2.081.362-.618.936-1.522 1.848-2.479.96-.956 1.798-1.575 2.395-1.89.57-.312 1.139-.474 1.722-.5.58-.026 2.459-.863 2.714-.915.255-.05.434-.1.585-.2.173-.1.173-.2.11-.313-.063-.11-.263-.272-.554-.508-.29-.234-1.493-.93-3.29-2.577-1.798-1.648-2.838-2.68-3.548-3.146-.71-.463-1.42-.827-2.11-.996-.69-.173-1.423-.123-2.082.123-.658.248-1.293.728-1.737 1.353-.444.625-.748 1.289-.873 1.653-.124.362-.11.729-.04 1.102.056.36.3.72.673 1.062.896.82 1.904 1.35 3.35 1.463l.563.027c1.234.027 2.258.055 3.218.297.96.24 1.79.618 2.448 1.148.658.53 1.234 1.16 1.653 1.91.418.75.562 1.62.497 2.103-.063.463-.272.873-.554 1.213l-.915.84-.328.25c-.54.418-1.112.768-1.62 1.062-.51.29-.9.542-1.16.729-.26.187-.52.3-.729.343-.3.04-.842.026-1.213.043-.37.016-.74-.054-1.075-.134-.333-.08-.64-.205-.93-.333m11.18-10.534c0-.474-.264-.875-.792-.875-.528 0-.955.401-.955.875 0 .475.427.874.955.874.527 0 .792-.399.792-.874z"/>
                  </svg>
                  WhatsApp: {formattedWhatsApp}
                </a>
              </div>
            </div>

            {/* Links Columns */}
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h3 className="font-semibold text-elbro-100 mb-4 tracking-wide text-sm uppercase">
                  {category}
                </h3>
                <ul className="space-y-3" role="list">
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className="text-elbro-400 hover:text-elbro-100 transition-colors text-sm"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Social */}
            {socialLinks.length > 0 && (
              <div>
                <h3 className="font-semibold text-elbro-100 mb-4 tracking-wide text-sm uppercase">
                  Suivez-nous
                </h3>
                <div className="flex gap-4">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-elbro-900 border border-elbro-400/10 text-elbro-400 hover:text-elbro-100 hover:border-elbro-400/30 transition-colors"
                      aria-label={social.label}
                    >
                      <social.icon className="w-5 h-5" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-elbro-400/10 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-elbro-400 text-sm">
              © {new Date().getFullYear()} {storeName}. Tous droits réservés.
            </p>
            <div className="flex items-center gap-6 text-sm text-elbro-400">
              <span>Fait avec passion au Maroc</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}