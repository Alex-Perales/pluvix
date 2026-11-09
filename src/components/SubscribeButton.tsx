import React, { useEffect, useRef, useState } from 'react';
import { Mail, X } from 'lucide-react';
import { SubscribeForm } from './SubscribeForm';

// Ícono de correo junto a "Actualizar": al hacer clic abre un panel flotante
// con el formulario de suscripción (ver SubscribeForm.tsx).
export const SubscribeButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const alHacerClicAfuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) setOpen(false);
    };
    const alPresionarTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', alHacerClicAfuera);
    document.addEventListener('keydown', alPresionarTecla);
    return () => {
      document.removeEventListener('mousedown', alHacerClicAfuera);
      document.removeEventListener('keydown', alPresionarTecla);
    };
  }, [open]);

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Recibir alertas por correo"
        title="Recibir alertas por correo"
        className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg border cursor-pointer transition-colors ${
          open ? 'bg-[#1E88E5] border-[#1E88E5] text-white' : 'border-[#90CAF9] text-[#1565C0] hover:bg-[#E3F2FD]'
        }`}
      >
        <Mail className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-[#BBDEFB] bg-white shadow-xl p-4 z-50">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Recibe estas alertas por correo</h3>
              <p className="text-xs text-[#111827] mt-0.5">
                Te avisamos apenas una estación entre en Precaución o Peligro.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="shrink-0 p-1 rounded text-[#111827] hover:bg-[#E3F2FD] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <SubscribeForm />
        </div>
      )}
    </div>
  );
};
