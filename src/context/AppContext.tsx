/**
 * AppContext: Language (ES/EN) + Theme (4 themes) unified context.
 * Usage: const { lang, t, theme, setTheme, themeColors } = useAppContext();
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type Lang  = 'es' | 'en';
export type Theme = 'cyber' | 'aurora' | 'crimson' | 'nebula' | 'ocean' | 'gold' | 'midnight';

export interface ThemeColors {
  c1: string; c2: string; c3: string; c4: string; bg: string; name: string; label: string;
}

// ─── Translations ─────────────────────────────────────────────────────────────
const STRINGS = {
  es: {
    appTitle: 'NOVA MUSIC LAB',
    appSubtitle: 'El Universo Musical de Lirioth',
    user: 'Usuario',
    loadData: 'Cargar Datos',
    nav: {
      dashboard:   'Dashboard',
      eras:        'Eras Musicales',
      top:         'Top Histórico',
      personality: 'Personalidad',
      emotions:    'Mapa Emocional',
      obsessions:  'Obsesiones',
      cultural:    'ADN Cultural',
      inner:       'Mundo Interior',
      artist:      'Si fuera Artista',
      insights:    'Insights Ocultos',
      compare:     'Spotify vs Last.fm',
      report:      'Ensayo Final',
      upload:      'Subir Archivos',
    },
    kpi: {
      totalPlays:    'Plays Totales',
      hours:         'Horas Escuchadas',
      artists:       'Artistas Únicos',
      activeDays:    'Días Activos',
      bestYear:      'Mejor Año',
      avgPerDay:     'Promedio / Día',
      nightRatio:    'Escucha Nocturna',
      peakHour:      'Hora Pico',
      uniqueTracks:  'Canciones Únicas',
      uniqueAlbums:  'Álbumes Únicos',
    },
    records: {
      title:          'Récords Personales',
      longestStreak:  'Racha más larga',
      maxInDay:       'Máx. en un día',
      longestSession: 'Sesión más larga',
      bestSession:    'Mejor sesión',
    },
    sections: {
      topArtists:       'Top 10 Artistas Históricos',
      genreDna:         'ADN de Géneros',
      hourDensity:      'Mapa de Densidad Horaria',
      hourRhythm:       'Ritmo de Escucha por Hora',
      yearlyEvolution:  'Evolución Musical 2015–2026',
      topHistoric:      'Top Histórico',
      musicalEras:      'Línea de Tiempo Musical',
      emotionalMap:     'Mapa Emocional Galáctico',
      personalityTitle: 'Perfil de Personalidad Musical',
      obsessionsTitle:  'Obsesiones Musicales & Loops',
      culturalTitle:    'ADN Cultural & Geográfico',
      innerTitle:       'Tu Universo Interior',
      artistTitle:      'Tu Perfil Artístico: Si Fueras Artista',
      insightsTitle:    'Lo que Revelan tus Datos',
      compareTitle:     'Spotify vs Last.fm',
      reportTitle:      'Tu Vida en Canciones',
      uploadTitle:      'Subir archivos reales',
    },
    hero: {
      years:     '11 Años de Biografía Sonora',
      enter:     'ENTRAR AL MUSEO SONORO',
      scrobbles: 'Scrobbles',
      hours:     'Horas',
      artists:   'Artistas',
      tracks:    'Canciones',
      days:      'Días Escuchados',
    },
    tabs: {
      artists:  'Artistas',
      tracks:   'Canciones',
      albums:   'Álbumes',
      genres:   'Géneros',
      years:    'Años',
    },
    misc: {
      plays:        'plays',
      printPdf:     'Imprimir / PDF',
      allEras:      'Todas las Eras',
      records:      'Récords',
      days:         'días',
      minutes:      'minutos',
      songs:        'canciones',
      less:         'Menos',
      more:         'Más',
      loading:      'Cargando...',
    },
  },
  en: {
    appTitle: 'NOVA MUSIC LAB',
    appSubtitle: "Lirioth's Musical Universe",
    user: 'User',
    loadData: 'Load Data',
    nav: {
      dashboard:   'Dashboard',
      eras:        'Musical Eras',
      top:         'All-Time Top',
      personality: 'Personality',
      emotions:    'Emotional Map',
      obsessions:  'Obsessions',
      cultural:    'Cultural DNA',
      inner:       'Inner World',
      artist:      'If I Were an Artist',
      insights:    'Hidden Insights',
      compare:     'Spotify vs Last.fm',
      report:      'Final Essay',
      upload:      'Upload Files',
    },
    kpi: {
      totalPlays:    'Total Plays',
      hours:         'Hours Listened',
      artists:       'Unique Artists',
      activeDays:    'Active Days',
      bestYear:      'Best Year',
      avgPerDay:     'Avg / Day',
      nightRatio:    'Night Listening',
      peakHour:      'Peak Hour',
      uniqueTracks:  'Unique Tracks',
      uniqueAlbums:  'Unique Albums',
    },
    records: {
      title:          'Personal Records',
      longestStreak:  'Longest streak',
      maxInDay:       'Max in one day',
      longestSession: 'Longest session',
      bestSession:    'Best session',
    },
    sections: {
      topArtists:       'Top 10 All-Time Artists',
      genreDna:         'Genre DNA',
      hourDensity:      'Hourly Density Map',
      hourRhythm:       'Listening Rhythm by Hour',
      yearlyEvolution:  'Musical Evolution 2015–2026',
      topHistoric:      'All-Time Top',
      musicalEras:      'Musical Timeline',
      emotionalMap:     'Galactic Emotional Map',
      personalityTitle: 'Musical Personality Profile',
      obsessionsTitle:  'Musical Obsessions & Loops',
      culturalTitle:    'Cultural & Geographic DNA',
      innerTitle:       'Your Inner Universe',
      artistTitle:      'Your Artist Profile: If You Were an Artist',
      insightsTitle:    'What Your Data Reveals',
      compareTitle:     'Spotify vs Last.fm',
      reportTitle:      'Your Life in Songs',
      uploadTitle:      'Upload real files',
    },
    hero: {
      years:     '11 Years of Musical Biography',
      enter:     'ENTER THE SOUND MUSEUM',
      scrobbles: 'Scrobbles',
      hours:     'Hours',
      artists:   'Artists',
      tracks:    'Tracks',
      days:      'Listening Days',
    },
    tabs: {
      artists:  'Artists',
      tracks:   'Tracks',
      albums:   'Albums',
      genres:   'Genres',
      years:    'Years',
    },
    misc: {
      plays:        'plays',
      printPdf:     'Print / PDF',
      allEras:      'All Eras',
      records:      'Records',
      days:         'days',
      minutes:      'minutes',
      songs:        'songs',
      less:         'Less',
      more:         'More',
      loading:      'Loading...',
    },
  },
} as const;

export type TranslationKeys = typeof STRINGS.es;

// ─── Themes ───────────────────────────────────────────────────────────────────
export const THEMES: Record<Theme, ThemeColors> = {
  cyber: {
    c1: '#00f2fe', c2: '#f72585', c3: '#7209b7', c4: '#4cc9f0',
    bg: '#050b14', name: 'cyber', label: '⚡ Cyber',
  },
  aurora: {
    c1: '#10b981', c2: '#34d399', c3: '#059669', c4: '#6ee7b7',
    bg: '#050f0a', name: 'aurora', label: '🌿 Aurora',
  },
  crimson: {
    c1: '#ef4444', c2: '#f97316', c3: '#b91c1c', c4: '#fb923c',
    bg: '#0f0505', name: 'crimson', label: '🔥 Crimson',
  },
  nebula: {
    c1: '#8b5cf6', c2: '#a78bfa', c3: '#7c3aed', c4: '#c4b5fd',
    bg: '#06050f', name: 'nebula', label: '🔮 Nebula',
  },
  ocean: {
    c1: '#06b6d4', c2: '#0284c7', c3: '#0e7490', c4: '#67e8f9',
    bg: '#03080f', name: 'ocean', label: '🌊 Ocean',
  },
  gold: {
    c1: '#f59e0b', c2: '#f97316', c3: '#d97706', c4: '#fcd34d',
    bg: '#0a0700', name: 'gold', label: '🌕 Gold',
  },
  midnight: {
    c1: '#60a5fa', c2: '#818cf8', c3: '#3b82f6', c4: '#93c5fd',
    bg: '#020509', name: 'midnight', label: '🌙 Midnight',
  },
};

function isLang(value: string | null): value is Lang {
  return value === 'es' || value === 'en';
}

function isTheme(value: string | null): value is Theme {
  return Boolean(value && value in THEMES);
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface AppContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TranslationKeys;
  theme: Theme;
  setTheme: (th: Theme) => void;
  tc: ThemeColors;
}

const AppContext = createContext<AppContextValue>({
  lang: 'es',
  setLang: () => {},
  t: STRINGS.es,
  theme: 'cyber',
  setTheme: () => {},
  tc: THEMES.cyber,
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('nml_lang');
    return isLang(stored) ? stored : 'es';
  });
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('nml_theme');
    return isTheme(stored) ? stored : 'cyber';
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('nml_lang', l);
  }, []);

  const setTheme = useCallback((th: Theme) => {
    setThemeState(th);
    localStorage.setItem('nml_theme', th);
  }, []);

  // Apply CSS variables to :root whenever theme changes
  useEffect(() => {
    const tc = THEMES[theme];
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.setProperty('--c1', tc.c1);
    root.style.setProperty('--c2', tc.c2);
    root.style.setProperty('--c3', tc.c3);
    root.style.setProperty('--c4', tc.c4);
    root.style.setProperty('--bg', tc.bg);
  }, [theme]);

  return (
    <AppContext.Provider value={{
      lang, setLang,
      t: STRINGS[lang] as TranslationKeys,
      theme, setTheme,
      tc: THEMES[theme],
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
