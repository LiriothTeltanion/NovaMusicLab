import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '../context/AppContext';
import musicData from '../data/music_dna_compiled.json';
import type { MusicDnaData } from '../types';
import ArtistIdentity from './ArtistIdentity';
import CulturalMap from './CulturalMap';
import DataQualityCenter from './DataQualityCenter';
import EmotionalMap from './EmotionalMap';
import EraExplorer from './EraExplorer';
import HiddenInsights from './HiddenInsights';
import PersonalityRadar from './PersonalityRadar';
import SpotifyVsLastfm from './SpotifyVsLastfm';
import TopHistorico from './TopHistorico';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('html-to-image', () => ({ toPng: vi.fn() }));

const data = musicData as unknown as MusicDnaData;

function renderInLang(ui: React.ReactElement, lang: 'es' | 'en') {
  localStorage.setItem('nml_lang', lang);
  return render(<AppProvider>{ui}</AppProvider>);
}

describe('bilingual dataset text', () => {
  beforeAll(() => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });

    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('translates deep dataset prose in English mode', () => {
    renderInLang(<EraExplorer data={data} />, 'en');
    expect(screen.getByText(/alternative rap-pop and modern high-energy sounds/i)).toBeInTheDocument();
    expect(screen.queryByText(/rap-pop alternativo/i)).not.toBeInTheDocument();

    cleanup();
    renderInLang(<PersonalityRadar data={data} />, 'en');
    expect(screen.getByText('Sensitivity (92)')).toBeInTheDocument();
    expect(screen.getByText(/Strong presence of Deafheaven/i)).toBeInTheDocument();
    expect(screen.queryByText(/Gran presencia de Deafheaven/i)).not.toBeInTheDocument();

    cleanup();
    renderInLang(<ArtistIdentity data={data} />, 'en');
    expect(screen.getByText(/A fusion of blackgaze/i)).toBeInTheDocument();
    expect(screen.getByText(/Highway of Forgetting/i)).toBeInTheDocument();
    expect(screen.getByText('Sonic Gene Matrix')).toBeInTheDocument();
    expect(screen.getByText('Expandable Artist Dossier')).toBeInTheDocument();
    expect(screen.queryByText(/Fusión de Blackgaze/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Autopista del Olvido/i)).not.toBeInTheDocument();
  });

  it('renders the expanded artist dossier in Spanish', () => {
    renderInLang(<ArtistIdentity data={data} />, 'es');

    expect(screen.getByText('Matriz de genes sonoros')).toBeInTheDocument();
    expect(screen.getByText('Dossier expandible del artista')).toBeInTheDocument();
    expect(screen.getByText('Arquitectura sonora')).toBeInTheDocument();
    expect(screen.queryByText('Expandable Artist Dossier')).not.toBeInTheDocument();
  });

  it('renders the expanded Emotional Map observatory in both languages', () => {
    renderInLang(<EmotionalMap data={data} />, 'en');

    expect(screen.getByText('Emotional engine mix')).toBeInTheDocument();
    expect(screen.getByText('Dominant mode')).toBeInTheDocument();
    expect(screen.getByText('Mood distribution')).toBeInTheDocument();
    expect(screen.getByText('Emotional Quadrant Guide')).toBeInTheDocument();
    expect(screen.getByText('Selected Emotional Dossier')).toBeInTheDocument();
    expect(screen.getByText('Recommended Rituals')).toBeInTheDocument();
    expect(screen.getByText('Worldbuilding')).toBeInTheDocument();

    cleanup();
    renderInLang(<EmotionalMap data={data} />, 'es');

    expect(screen.getByText('Mezcla del motor emocional')).toBeInTheDocument();
    expect(screen.getByText('Modo dominante')).toBeInTheDocument();
    expect(screen.getByText('Distribución por mood')).toBeInTheDocument();
    expect(screen.getByText('Guía de cuadrantes emocionales')).toBeInTheDocument();
    expect(screen.getByText('Dossier emocional seleccionado')).toBeInTheDocument();
    expect(screen.getByText('Rituales recomendados')).toBeInTheDocument();
    expect(screen.getByText('Construcción de mundos')).toBeInTheDocument();
  });

  // This integration case mounts the full chart-heavy artist dossier twice.
  // Keep its budget local so parallel full-suite runs do not become flaky.
  it('renders the enriched artist encyclopedia in Top Historico in both languages', () => {
    renderInLang(<TopHistorico data={data} />, 'en');

    expect(screen.getByText('Artist Dossier')).toBeInTheDocument();
    expect(screen.getByText('Emotional filter')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Archive role')).toBeInTheDocument();
    expect(screen.getByText('Emotional engine')).toBeInTheDocument();
    expect(screen.getByText('Extended emotional biography')).toBeInTheDocument();
    expect(screen.getByText('Catalog footprint')).toBeInTheDocument();
    expect(screen.getByText('Deep listening path')).toBeInTheDocument();
    expect(screen.getByText('Archive anchor')).toBeInTheDocument();
    expect(screen.getByText('Legal listening station')).toBeInTheDocument();
    expect(screen.getByText('Source status')).toBeInTheDocument();
    expect(screen.getByText('Quick actions')).toBeInTheDocument();
    expect(screen.getByText('Connected artists in your archive')).toBeInTheDocument();
    expect(screen.getByText('Sheffield, England')).toBeInTheDocument();
    expect(screen.getByText('Sempiternal')).toBeInTheDocument();
    expect(screen.getByText('2013')).toBeInTheDocument();

    cleanup();
    renderInLang(<TopHistorico data={data} />, 'es');

    expect(screen.getByText('Dossier de artista')).toBeInTheDocument();
    expect(screen.getByText('Filtro emocional')).toBeInTheDocument();
    expect(screen.getByText('Todos')).toBeInTheDocument();
    expect(screen.getByText('Rol en el archivo')).toBeInTheDocument();
    expect(screen.getByText('Motor emocional')).toBeInTheDocument();
    expect(screen.getByText('Biografía emocional extendida')).toBeInTheDocument();
    expect(screen.getByText('Huella de catálogo')).toBeInTheDocument();
    expect(screen.getByText('Ruta de escucha profunda')).toBeInTheDocument();
    expect(screen.getByText('Ancla del archivo')).toBeInTheDocument();
    expect(screen.getByText('Estación de escucha legal')).toBeInTheDocument();
    expect(screen.getByText('Estado de fuentes')).toBeInTheDocument();
    expect(screen.getByText('Accesos rápidos')).toBeInTheDocument();
    expect(screen.getByText('Artistas conectados en tu archivo')).toBeInTheDocument();
    expect(screen.getByText('Sheffield, Inglaterra')).toBeInTheDocument();
    expect(screen.queryByText('Artist Dossier')).not.toBeInTheDocument();
  }, 15_000);

  it('renders the album dossier in Top Historico in both languages', async () => {
    const user = userEvent.setup();
    renderInLang(<TopHistorico data={data} />, 'en');

    await user.click(screen.getByRole('button', { name: 'Albums' }));
    expect(await screen.findByText('Album Dossier')).toBeInTheDocument();
    expect(screen.getByText('Emotional lens')).toBeInTheDocument();
    expect(screen.getByText('Suggested ritual')).toBeInTheDocument();
    expect(screen.getByText('Extended album reading')).toBeInTheDocument();
    expect(screen.getByText('Album context')).toBeInTheDocument();
    expect(screen.getByText('Artist tracks in your archive')).toBeInTheDocument();
    expect(screen.getByText('Open artist dossier')).toBeInTheDocument();

    cleanup();
    localStorage.clear();
    const spanishUser = userEvent.setup();
    renderInLang(<TopHistorico data={data} />, 'es');

    await spanishUser.click(screen.getByRole('button', { name: 'Álbumes' }));
    expect(await screen.findByText('Dossier de álbum')).toBeInTheDocument();
    expect(screen.getByText('Lente emocional')).toBeInTheDocument();
    expect(screen.getByText('Ritual sugerido')).toBeInTheDocument();
    expect(screen.getByText('Lectura extendida del álbum')).toBeInTheDocument();
    expect(screen.getByText('Contexto del álbum')).toBeInTheDocument();
    expect(screen.getByText('Canciones del artista en tu archivo')).toBeInTheDocument();
    expect(screen.getByText('Abrir dossier de artista')).toBeInTheDocument();
  }, 10000);

  it('renders the track dossier in Top Historico in both languages', async () => {
    const user = userEvent.setup();
    renderInLang(<TopHistorico data={data} />, 'en');

    await user.click(screen.getByRole('button', { name: 'Tracks' }));
    expect(await screen.findByText('Track Dossier')).toBeInTheDocument();
    expect(screen.getByText('Emotional lens')).toBeInTheDocument();
    expect(screen.getByText('Suggested ritual')).toBeInTheDocument();
    expect(screen.getByText('Extended track reading')).toBeInTheDocument();
    expect(screen.getByText('Track reading')).toBeInTheDocument();
    expect(screen.getByText('Replay role')).toBeInTheDocument();
    expect(screen.getByText('More tracks by this artist')).toBeInTheDocument();
    expect(screen.getByText('Artist albums in your archive')).toBeInTheDocument();

    cleanup();
    localStorage.clear();
    const spanishUser = userEvent.setup();
    renderInLang(<TopHistorico data={data} />, 'es');

    await spanishUser.click(screen.getByRole('button', { name: 'Canciones' }));
    expect(await screen.findByText('Dossier de canción')).toBeInTheDocument();
    expect(screen.getByText('Lente emocional')).toBeInTheDocument();
    expect(screen.getByText('Ritual sugerido')).toBeInTheDocument();
    expect(screen.getByText('Lectura extendida de canción')).toBeInTheDocument();
    expect(screen.getByText('Lectura de la canción')).toBeInTheDocument();
    expect(screen.getByText('Rol de repetición')).toBeInTheDocument();
    expect(screen.getByText('Más canciones de este artista')).toBeInTheDocument();
    expect(screen.getByText('Álbumes del artista en tu archivo')).toBeInTheDocument();
  }, 10000);

  it('localizes Cultural DNA labels and scene chips in both languages', () => {
    renderInLang(<CulturalMap data={data} />, 'en');
    expect(screen.getAllByText('English').length).toBeGreaterThan(0);
    expect(screen.getByText(/Synthwave France\/USA/i)).toBeInTheDocument();
    expect(screen.queryByText('Inglés')).not.toBeInTheDocument();

    cleanup();
    renderInLang(<CulturalMap data={data} />, 'es');
    expect(screen.getAllByText('Estados Unidos').length).toBeGreaterThan(0);
    expect(screen.getByText(/Synthwave Francia\/USA/i)).toBeInTheDocument();
    expect(screen.queryByText(/Internet Culture/i)).not.toBeInTheDocument();
  });

  it('shows the source quality note in Spanish wherever it appears', () => {
    const spanishNote = /Last\.fm es la línea temporal verificada principal/i;
    const englishLeak = /primary verified timeline/i;

    renderInLang(<DataQualityCenter data={data} />, 'es');
    expect(screen.getByText(spanishNote)).toBeInTheDocument();
    expect(screen.getByText('🧠 Cobertura del Cerebro Offline')).toBeInTheDocument();
    expect(screen.queryByText('🧠 Offline Brain Coverage')).not.toBeInTheDocument();
    expect(screen.queryByText(englishLeak)).not.toBeInTheDocument();

    cleanup();
    renderInLang(<HiddenInsights data={data} />, 'es');
    expect(screen.getByText(spanishNote)).toBeInTheDocument();
    expect(screen.queryByText(englishLeak)).not.toBeInTheDocument();

    cleanup();
    renderInLang(<SpotifyVsLastfm data={data} />, 'es');
    expect(screen.getByText(spanishNote)).toBeInTheDocument();
    expect(screen.queryByText(englishLeak)).not.toBeInTheDocument();
  });
});
