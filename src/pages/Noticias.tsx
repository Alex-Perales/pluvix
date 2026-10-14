import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { NewsItem } from '../data/stations';
import { ErrorNote, LoadingNote, NewsCardSkeleton, TextSkeleton } from '../components/ui';
import { API_URL } from '../data/weather';

export const NoticiasPage: React.FC = () => {
  // Comunicado abierto: se despliega dentro de la misma página, a la izquierda de las tarjetas
  const [openNews, setOpenNews] = useState<NewsItem | null>(null);
  const detailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (openNews) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [openNews]);

  // Texto completo de la nota abierta, leído de gob.pe por la función intermediaria
  const [fullText, setFullText] = useState<{ url: string; parrafos: string[] | null } | null>(null);
  const openUrl = openNews?.url;

  useEffect(() => {
    if (!openUrl) return;
    let vigente = true;
    setFullText({ url: openUrl, parrafos: null });
    fetch(`${API_URL}/nota?url=${encodeURIComponent(openUrl)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Respuesta ${res.status}`);
        return res.json();
      })
      .then((data: { parrafos: string[] }) => {
        if (vigente) setFullText({ url: openUrl, parrafos: data.parrafos });
      })
      .catch(() => {
        // Sin texto completo se muestra el resumen
        if (vigente) setFullText({ url: openUrl, parrafos: [] });
      });
    return () => {
      vigente = false;
    };
  }, [openUrl]);

  const loadingFullText = fullText?.url === openUrl && fullText?.parrafos === null;
  const paragraphs =
    fullText?.url === openUrl && fullText?.parrafos?.length ? fullText.parrafos : openNews?.fullText ?? [];
  // El resumen de gob.pe a veces es el inicio cortado del primer párrafo: en ese caso no se repite
  const summaryStart = (openNews?.summary ?? '').replace(/(\.\.\.|…)\s*$/, '').trim();
  const showSummary =
    paragraphs !== openNews?.fullText && summaryStart !== '' && !paragraphs[0]?.startsWith(summaryStart);

  // Noticias reales de SENAMHI e INDECI, entregadas por la función intermediaria
  const [news, setNews] = useState<NewsItem[]>([]);
  const [status, setStatus] = useState<'cargando' | 'listo' | 'error'>('cargando');

  // Cambia para volver a pedir las noticias con el botón «Reintentar»
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let vigente = true;
    setStatus('cargando');
    fetch(`${API_URL}/noticias`)
      .then((res) => {
        if (!res.ok) throw new Error(`Respuesta ${res.status}`);
        return res.json();
      })
      .then((items: Omit<NewsItem, 'fullText'>[]) => {
        if (!vigente) return;
        setNews(items.map((n) => ({ ...n, fullText: [n.summary] })));
        setStatus('listo');
      })
      .catch(() => {
        if (vigente) setStatus('error');
      });
    return () => {
      vigente = false;
    };
  }, [attempt]);

  const filteredNews = news;

  return (
    <div className="w-full bg-white">
      {/* Encabezado de la página */}
      <section className="max-w-[1320px] mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <h1 className="text-2xl font-bold text-[#111827]">Noticias oficiales</h1>
        <p className="text-sm text-[#111827] mt-1">Comunicados de SENAMHI, INDECI y otras instituciones del Estado sobre lluvias, inundaciones y El Niño.</p>
      </section>

      {/* =====================================================================
          GRID DE NOTICIAS CON PARALLAX Y RESPONSIVE
          ===================================================================== */}
      <section className="py-6 sm:py-10 max-w-[1320px] mx-auto px-3 sm:px-6 lg:px-8">
        {status === 'cargando' && (
          <>
            <LoadingNote className="mb-5">Buscando los comunicados oficiales más recientes…</LoadingNote>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {Array.from({ length: 6 }, (_, i) => (
                <NewsCardSkeleton key={i} />
              ))}
            </div>
          </>
        )}
        {status === 'error' && (
          <ErrorNote
            message="No se pudieron cargar las noticias oficiales en este momento."
            onRetry={() => setAttempt((n) => n + 1)}
          />
        )}
        {status === 'listo' && filteredNews.length === 0 && (
          <p className="py-10 text-center text-sm text-[#111827]">No hay noticias sobre lluvias en este momento.</p>
        )}

        {/* Grid de Tarjetas de Noticias (1 col móvil, 2 tablet, 3 desktop) */}
        <div className={openNews ? 'grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 items-start' : ''}>
        {openNews && (
          <aside
            ref={detailRef}
            aria-label="Comunicado completo"
            className="scroll-mt-20 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-6 lg:border-r border-[#111827]/70"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#E3F2FD] pb-3 sm:pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs sm:text-xs text-[#1565C0] font-medium">
                  <span>{openNews.date}</span>
                </div>
                <h3 className="text-base sm:text-xl font-bold text-[#111827] mt-1 leading-snug">
                  {openNews.title}
                </h3>
                <p className="text-xs text-[#1565C0] mt-0.5">{openNews.source}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpenNews(null)}
                className="p-1.5 sm:p-2 rounded-lg text-[#111827] hover:bg-[#E3F2FD] transition-colors cursor-pointer shrink-0"
                aria-label="Cerrar comunicado"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3.5 rounded-lg overflow-hidden border border-[#BBDEFB] h-44 sm:h-52 bg-[#E3F2FD]">
              <img
                src={openNews.imageUrl}
                alt={openNews.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Resumen destacado y, debajo, la nota completa */}
            {showSummary && (
              <p className="mt-4 text-sm sm:text-base font-semibold text-[#111827] leading-relaxed">
                {openNews.summary}
              </p>
            )}
            <div className="mt-3 space-y-3 text-sm text-[#111827] leading-relaxed">
              {paragraphs.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
              {loadingFullText && (
                <div className="pt-1 space-y-3">
                  <TextSkeleton />
                  <LoadingNote>Cargando la nota completa de gob.pe…</LoadingNote>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-[#E3F2FD] flex flex-col sm:flex-row sm:justify-end gap-2">
              {openNews.url && (
                <a
                  href={openNews.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2 rounded-lg border border-[#42A5F5] hover:bg-[#E3F2FD] text-[#1565C0] text-xs font-semibold transition-colors text-center inline-flex items-center justify-center gap-1"
                >
                  <span>Ver nota oficial en gob.pe</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setOpenNews(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#1E88E5] hover:bg-[#1976D2] text-white text-xs font-semibold transition-colors cursor-pointer text-center"
              >
                Cerrar Comunicado
              </button>
            </div>
          </aside>
        )}

        <div
          className={`grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 ${
            openNews ? '' : 'lg:grid-cols-3'
          }`}
        >
          {filteredNews.map((news) => {
            return (
              <article
                key={news.id}
                className={`bg-white rounded-xl border overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between ${
                  openNews?.id === news.id ? 'border-[#1E88E5] ring-2 ring-[#BBDEFB]' : 'border-[#BBDEFB]'
                }`}
              >
                <div>
                  {/* Imagen rectangular pequeña en la parte superior de la tarjeta */}
                  <div className="relative h-40 sm:h-44 overflow-hidden bg-[#E3F2FD] border-b border-[#E3F2FD]">
                    <img
                      src={news.imageUrl}
                      alt={news.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>

                  <div className="p-4 sm:p-5">
                    {/* Fecha en azul medio (#2196F3) */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#1565C0]">
                      <time>{news.date}</time>
                      <span>·</span>
                      <span>{news.regionTag}</span>
                    </div>

                    {/* Título en negro (#111827) */}
                    <h3 className="text-base sm:text-lg font-bold text-[#111827] mt-1.5 leading-snug">
                      {news.title}
                    </h3>

                    {/* Breve resumen */}
                    <p className="text-xs sm:text-sm text-[#111827] mt-2 leading-relaxed">
                      {news.summary}
                    </p>
                  </div>
                </div>

                <div className="px-4 sm:px-5 pb-4 pt-2 border-t border-[#E3F2FD] flex items-center justify-between">
                  <span className="text-xs text-[#1565C0] truncate max-w-[170px]">
                    {news.source}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenNews(news)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#1565C0] hover:text-[#1565C0] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>Leer completo</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        </div>
      </section>
    </div>
  );
};
