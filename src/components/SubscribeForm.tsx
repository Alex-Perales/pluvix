import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { API_URL } from '../data/weather';

type Estado = 'inicial' | 'enviando' | 'enviado' | 'error';

// Formulario "Recibir alertas por correo": llama a POST /suscribir (api/suscripciones.ts).
// Quien se suscribe recibe un correo de confirmación antes de empezar a recibir avisos.
export const SubscribeForm: React.FC = () => {
  const [correo, setCorreo] = useState('');
  const [estado, setEstado] = useState<Estado>('inicial');
  const [mensaje, setMensaje] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstado('enviando');
    try {
      const res = await fetch(`${API_URL}/suscribir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo }),
      });
      const data = (await res.json()) as { mensaje?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'No se pudo enviar la suscripción.');
      setMensaje(data.mensaje ?? 'Revisa tu correo para confirmar la suscripción.');
      setEstado('enviado');
    } catch {
      setMensaje('No se pudo enviar la suscripción. Intenta de nuevo en un momento.');
      setEstado('error');
    }
  };

  if (estado === 'enviado') {
    return (
      <div className="flex items-start gap-2 text-sm font-semibold text-[#1565C0]">
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{mensaje}</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="email"
        required
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        placeholder="tu-correo@gmail.com"
        className="w-full px-3 py-2 text-sm rounded-lg border border-[#90CAF9] bg-white text-[#111827] focus:outline-none focus:border-[#1E88E5]"
      />
      <button
        type="submit"
        disabled={estado === 'enviando'}
        className="w-full px-4 py-2 rounded-lg bg-[#1E88E5] hover:bg-[#1976D2] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
      >
        {estado === 'enviando' ? 'Enviando…' : 'Suscribirme'}
      </button>
      {estado === 'error' && <p className="text-xs text-red-600">{mensaje}</p>}
    </form>
  );
};
