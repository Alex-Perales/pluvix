import React, { useEffect, useState } from 'react';
import { Menu, X, Ambulance, ArrowUpRight, Flame, ShieldAlert, Siren } from 'lucide-react';
import { EMERGENCY_SITES, openOfficialSiteOnDesktop } from '../data/stations';

export type NavPage = 'inicio' | 'mapa' | 'alertas' | 'noticias';

interface NavbarProps {
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
}

const NAV_LINKS: { id: NavPage; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'mapa', label: 'Mapa' },
  { id: 'alertas', label: 'Alertas' },
  { id: 'noticias', label: 'Noticias' },
];

export const Navbar: React.FC<NavbarProps> = ({ activePage, onNavigate }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // El menú desplegable se cierra al cambiar de página por cualquier vía (menú, footer, botones)
  useEffect(() => setMenuOpen(false), [activePage]);

  // Al bajar, la barra se pega al borde superior
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed left-0 right-0 z-40 bg-black h-16 shadow-sm transition-[top] duration-200 ${
        scrolled ? 'top-0' : 'top-8'
      }`}
    >
      <div className="h-full px-4 sm:px-8 lg:px-10 flex items-center justify-between gap-3 sm:gap-6">
        <div className="flex items-center gap-5 sm:gap-10 min-w-0">
          {/* Logo: lleva al inicio */}
          <button
            type="button"
            onClick={() => onNavigate('inicio')}
            className="flex items-center gap-2 shrink-0 cursor-pointer"
            aria-label="Pluvix, ir al inicio"
          >
            <img src="/media/logo-pluvix.png" alt="" className="h-10 w-auto" />
            <span className="text-[1.375rem] font-bold text-white">Pluvix</span>
          </button>

          {/* Menú de navegación (pantallas grandes) */}
          <nav aria-label="Navegación de Páginas" className="hidden lg:flex items-center gap-6 text-[1.375rem] text-white">
            {NAV_LINKS.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`transition-colors whitespace-nowrap cursor-pointer hover:text-[#90CAF9] focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-sm ${
                    isActive ? 'underline decoration-white decoration-2 underline-offset-8' : ''
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Botón de menú: solo en celular y tablet, en la esquina derecha */}
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="lg:hidden p-1 text-white hover:text-[#90CAF9] transition-colors cursor-pointer shrink-0"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
        </button>
      </div>

      {/* Menú desplegable (celular y tablet) */}
      {menuOpen && (
        <nav
          aria-label="Menú desplegable"
          className="lg:hidden bg-black border-t border-white/20 px-4 sm:px-8 py-3 flex flex-col gap-1 shadow-lg text-[1.375rem] md:max-w-xs md:ml-auto"
        >
          {NAV_LINKS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  setMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-lg transition-colors cursor-pointer ${
                  isActive ? 'bg-white/15 text-white' : 'text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
};

// ---------------------------------------------------------------------------
// Pie de página
// ---------------------------------------------------------------------------

interface FooterProps {
  onNavigate: (page: NavPage) => void;
}

const FOOTER_LINKS: { id: NavPage; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'mapa', label: 'Mapa' },
  { id: 'alertas', label: 'Alertas' },
  { id: 'noticias', label: 'Noticias' },
];

const OFFICIAL_SOURCES = [
  {
    name: 'SENAMHI',
    detail: 'Servicio Nacional de Meteorología e Hidrología',
    href: 'https://www.gob.pe/senamhi',
  },
  {
    name: 'INDECI',
    detail: 'Instituto Nacional de Defensa Civil',
    href: 'https://www.gob.pe/indeci',
  },
  {
    name: 'ENFEN',
    detail: 'Comisión Multisectorial del Fenómeno El Niño',
    href: 'https://enfen.imarpe.gob.pe/',
  },
];

const EMERGENCY_LINES = [
  { number: '115', label: 'Defensa Civil', href: EMERGENCY_SITES['115'], Icon: ShieldAlert },
  { number: '116', label: 'Bomberos', href: EMERGENCY_SITES['116'], Icon: Flame },
  { number: '105', label: 'Policía', href: EMERGENCY_SITES['105'], Icon: Siren },
  { number: '106', label: 'SAMU', href: EMERGENCY_SITES['106'], Icon: Ambulance },
];

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-black text-white border-t border-[#4FC3F7] mt-auto">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-9">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.7fr_1.2fr_1.3fr] gap-6 lg:gap-8 pb-6 border-b border-white/15">
          {/* Identidad */}
          <div>
            <div className="flex items-start gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Pluvix: tu alerta antes de la lluvia
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-white mt-2 leading-relaxed">
              Plataforma de alerta temprana ante el Fenómeno de El Niño. Monitoreamos las lluvias en
              la Costa, Sierra y Selva para avisar a tiempo a la población.
            </p>
          </div>

          {/* Navegación */}
          <nav aria-label="Navegación del Footer">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-2">
              Navegación
            </h4>
            <ul className="space-y-2 text-sm text-white">
              {FOOTER_LINKS.map((link) => (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(link.id)}
                    className="hover:underline transition-colors cursor-pointer"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Fuentes oficiales */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-2">
              Fuentes Oficiales
            </h4>
            <ul className="space-y-3">
              {OFFICIAL_SOURCES.map((source) => (
                <li key={source.name}>
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-block"
                  >
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-white group-hover:underline transition-colors">
                      {source.name}
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                    <span className="block text-xs text-white">{source.detail}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Líneas de emergencia */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-2">
              Líneas de Emergencia
            </h4>
            <div className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2 text-xs">
              {EMERGENCY_LINES.map(({ number, label, href, Icon }) => (
                <a
                  key={number}
                  href={`tel:${number}`}
                  onClick={(e) => openOfficialSiteOnDesktop(e, href)}
                  className="px-2.5 py-2 rounded-lg bg-[#262626] hover:bg-[#1565C0] text-white font-bold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {label} {number}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Fila final limpia */}
        <div className="pt-4 text-xs sm:text-xs text-white text-center">
          <span>
            &copy; Pluvix · La información mostrada es referencial y no reemplaza los
            avisos oficiales del SENAMHI ni del INDECI.
          </span>
        </div>
      </div>
    </footer>
  );
};
