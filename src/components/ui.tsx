import React from 'react';
import { Loader2, RefreshCw, WifiOff } from 'lucide-react';

interface AlertIconProps {
  className?: string;
  color?: string;
}

// Triángulo de alerta relleno, con el signo de exclamación en blanco
export const AlertIcon: React.FC<AlertIconProps> = ({ className, color = '#1565C0' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M12 4.5 20.5 19.5H3.5Z"
      fill={color}
      stroke={color}
      strokeWidth="3.5"
      strokeLinejoin="round"
    />
    <path d="M12 8.6v5.6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="17.6" r="1.15" fill="#FFFFFF" />
  </svg>
);

// ---------------------------------------------------------------------------
// Estados de espera
// ---------------------------------------------------------------------------

// Estados de espera compartidos: mientras llegan los datos se muestra la forma del
// contenido (esqueleto) con un mensaje corto; si falla, un aviso con botón para reintentar.

export const Bone: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <div className={`rounded-md bg-[#E3F2FD] animate-pulse ${className}`} style={style} aria-hidden="true" />
);

export const LoadingNote: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`inline-flex items-center gap-2 text-sm text-[#1565C0] ${className}`} role="status">
    <Loader2 className="w-4 h-4 animate-spin" />
    {children}
  </p>
);

interface ErrorNoteProps {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export const ErrorNote: React.FC<ErrorNoteProps> = ({ message, onRetry, retrying }) => (
  <div className="rounded-xl border border-[#BBDEFB] bg-[#F8FBFF] p-5 flex flex-col sm:flex-row sm:items-center gap-3" role="alert">
    <WifiOff className="w-6 h-6 text-[#1565C0] shrink-0" />
    <p className="flex-1 text-sm text-[#111827]">{message}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1565C0] hover:bg-[#0D47A1] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
      >
        <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
        Reintentar
      </button>
    )}
  </div>
);

// Gráfico de barras en espera
const BAR_HEIGHTS = [20, 45, 35, 60, 30, 50, 40, 70, 55, 38, 48];
export const ChartSkeleton: React.FC = () => (
  <div className="h-72 ml-8 sm:ml-10 flex items-end gap-1.5 sm:gap-2.5 border-b border-[#E3F2FD]" aria-hidden="true">
    {BAR_HEIGHTS.map((h, i) => (
      <Bone key={i} className="flex-1 rounded-b-none" style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }} />
    ))}
  </div>
);

// Tarjeta de noticia en espera
export const NewsCardSkeleton: React.FC = () => (
  <div className="rounded-xl border border-[#E3F2FD] overflow-hidden" aria-hidden="true">
    <Bone className="h-40 sm:h-44 rounded-none" />
    <div className="p-4 sm:p-5 space-y-3">
      <Bone className="h-3 w-1/3" />
      <Bone className="h-5 w-full" />
      <Bone className="h-5 w-4/5" />
      <Bone className="h-3 w-full" />
      <Bone className="h-3 w-2/3" />
    </div>
  </div>
);

// Párrafos de texto en espera
export const TextSkeleton: React.FC<{ lines?: number }> = ({ lines = 6 }) => (
  <div className="space-y-2.5" aria-hidden="true">
    {Array.from({ length: lines }, (_, i) => (
      <Bone key={i} className="h-3.5" style={{ width: i % 3 === 2 ? '70%' : '100%' }} />
    ))}
  </div>
);
