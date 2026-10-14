import { useState } from 'react';
import { PERU_STATIONS } from './data/stations';
import { useLiveStations } from './data/weather';
import { Navbar, NavPage, Footer } from './components/Layout';
import { AlertasPage } from './pages/Alertas';
import { InicioPage } from './pages/Inicio';
import { MapaPage } from './pages/Mapa';
import { NoticiasPage } from './pages/Noticias';

export function App() {
  const [activePage, setActivePage] = useState<NavPage>('inicio');
  // Lluvia real (Open-Meteo); la estación elegida se guarda por id
  // para que sus valores se actualicen cuando llegan datos nuevos
  const { stations, status: dataStatus, reload: reloadStations } = useLiveStations();
  const [selectedStationId, setSelectedStationId] = useState(PERU_STATIONS[0].id);
  const selectedStation = stations.find((s) => s.id === selectedStationId) ?? stations[0];

  const handleNavigate = (page: NavPage) => {
    setActivePage(page);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen bg-white text-[#111827] flex flex-col">
      {/* 1. Menú superior fijo */}
      <Navbar activePage={activePage} onNavigate={handleNavigate} />

      {/* 2. Página elegida en el menú */}
      <main className={`flex-1 bg-white ${activePage === 'inicio' ? '' : 'pt-24'}`}>
        {activePage === 'inicio' && (
          <InicioPage
            dataStatus={dataStatus}
            onRetry={reloadStations}
            stations={stations}
            selectedStation={selectedStation}
            onSelectStation={(st) => setSelectedStationId(st.id)}
            onNavigate={handleNavigate}
          />
        )}

        {activePage === 'mapa' && (
          <MapaPage
            dataStatus={dataStatus}
            stations={stations}
            selectedStation={selectedStation}
            onSelectStation={(st) => setSelectedStationId(st.id)}
          />
        )}

        {activePage === 'alertas' && (
          <AlertasPage
            stations={stations}
            dataStatus={dataStatus}
            onRefreshStations={reloadStations}
            onViewStationOnMap={(st) => {
              setSelectedStationId(st.id);
              handleNavigate('mapa');
            }}
          />
        )}

        {activePage === 'noticias' && (
          <NoticiasPage />
        )}
      </main>

      {/* 3. Pie de página */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}

export default App;
