import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  DatabaseZap,
  RotateCcw,
  Search,
  Sparkles,
  Tags,
} from 'lucide-react';
import type {
  ArtistGenreCatalogEntry,
  GenreAssignment,
  MusicDnaData,
} from '../types';
import { useApp } from '../context/AppContext';
import { loadDefaultGenreCatalog } from '../data/defaultGenreCatalog';
import {
  GENRE_FAMILY_IDS,
  genreFamilyLabel,
  sanitizeSecondaryTags,
  secondaryTagsForFamily,
} from '../utils/genreTaxonomy';
import { localeFor, pickLanguage } from '../utils/i18n';

type StudioFilter = 'review' | 'unclassified' | 'alternative' | 'curated' | 'all';

interface GenreTaggingStudioProps {
  data: MusicDnaData;
  assignments: GenreAssignment[];
  useBundledCatalog: boolean;
  onAssignmentsChange: (
    assignments: GenreAssignment[],
    catalog: ArtistGenreCatalogEntry[],
  ) => void;
}

interface EffectiveCatalogRow extends ArtistGenreCatalogEntry {
  assignment?: GenreAssignment;
  effectiveFamily: string;
  needsReview: boolean;
}

const PAGE_SIZE = 30;

function searchable(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLocaleLowerCase('en-US');
}

function assignmentMap(assignments: readonly GenreAssignment[]): Map<string, GenreAssignment> {
  return new Map(assignments.map(assignment => [assignment.artistKey, assignment]));
}

export default function GenreTaggingStudio({
  data,
  assignments,
  useBundledCatalog,
  onAssignmentsChange,
}: GenreTaggingStudioProps) {
  const { lang, tc } = useApp();
  const locale = localeFor(lang);
  const copy = pickLanguage(lang, {
    en: {
      eyebrow: 'Archive repair · local and private',
      title: '🧬 Genre Lab',
      description: 'Turn uncertainty into useful metadata. A primary family updates every chart; secondary tags add detail without double-counting listens.',
      loading: 'Loading the complete 6,413-artist catalog…',
      loadError: 'The full artist catalog is unavailable. Re-import the original exports to create a reviewable catalog for this archive.',
      search: 'Search artists',
      searchPlaceholder: 'Name, genre or tag…',
      filters: {
        review: 'Needs review',
        unclassified: 'Unclassified',
        alternative: 'Broad Alternative',
        curated: 'My corrections',
        all: 'All artists',
      },
      artists: 'artists',
      listens: 'listens',
      automatic: 'Automatic',
      manual: 'Curated by you',
      chooseArtist: 'Choose an artist to start classifying.',
      primary: 'Primary genre family',
      primaryPlaceholder: 'Choose the family that controls charts',
      primaryHint: 'Exactly one primary family receives this artist’s listens, so the archive total never changes.',
      tags: 'Secondary tags',
      tagsHint: 'Optional context for dossiers and search. Tags never inflate chart totals.',
      save: 'Save local correction',
      reset: 'Restore automatic genre',
      saved: (artist: string) => `${artist} was classified and every genre chart is now synchronized.`,
      restored: (artist: string) => `${artist} returned to its automatic classification.`,
      showMore: 'Show 30 more artists',
      noResults: 'No artists match this search and filter.',
      classifiedKpi: 'Classified listens',
      unclassifiedKpi: 'Unclassified listens',
      reviewKpi: 'Review queue',
      correctionsKpi: 'Local corrections',
      exactNote: '🔒 Mathematical guard: catalog plays always reconcile to the archive total.',
      sourceCatalog: 'metadata catalog',
      sourceUnknown: 'no automatic metadata',
    },
    es: {
      eyebrow: 'Reparación del archivo · local y privada',
      title: '🧬 Laboratorio de géneros',
      description: 'Convierte la incertidumbre en metadatos útiles. Una familia principal actualiza todos los gráficos; las etiquetas secundarias añaden detalle sin duplicar escuchas.',
      loading: 'Cargando el catálogo completo de 6.413 artistas…',
      loadError: 'El catálogo completo no está disponible. Vuelve a importar los archivos originales para crear una cola revisable para este archivo.',
      search: 'Buscar artistas',
      searchPlaceholder: 'Nombre, género o etiqueta…',
      filters: {
        review: 'Necesitan revisión',
        unclassified: 'Sin clasificar',
        alternative: 'Alternativo amplio',
        curated: 'Mis correcciones',
        all: 'Todos los artistas',
      },
      artists: 'artistas',
      listens: 'escuchas',
      automatic: 'Automático',
      manual: 'Curado por ti',
      chooseArtist: 'Elige un artista para comenzar a clasificar.',
      primary: 'Familia de género principal',
      primaryPlaceholder: 'Elige la familia que controla los gráficos',
      primaryHint: 'Exactamente una familia recibe las escuchas del artista, por lo que el total del archivo nunca cambia.',
      tags: 'Etiquetas secundarias',
      tagsHint: 'Contexto opcional para fichas y búsqueda. Las etiquetas nunca inflan los totales.',
      save: 'Guardar corrección local',
      reset: 'Restaurar género automático',
      saved: (artist: string) => `${artist} fue clasificado y todos los gráficos de género quedaron sincronizados.`,
      restored: (artist: string) => `${artist} volvió a su clasificación automática.`,
      showMore: 'Mostrar 30 artistas más',
      noResults: 'Ningún artista coincide con esta búsqueda y filtro.',
      classifiedKpi: 'Escuchas clasificadas',
      unclassifiedKpi: 'Escuchas sin clasificar',
      reviewKpi: 'Cola de revisión',
      correctionsKpi: 'Correcciones locales',
      exactNote: '🔒 Protección matemática: las escuchas del catálogo siempre reconcilian con el total del archivo.',
      sourceCatalog: 'catálogo de metadatos',
      sourceUnknown: 'sin metadatos automáticos',
    },
    he: {
      eyebrow: 'תיקון הארכיון · מקומי ופרטי',
      title: '🧬 מעבדת ז׳אנרים',
      description: 'הופכים אי־ודאות למטא־נתונים שימושיים. משפחה ראשית אחת מעדכנת את כל התרשימים; תגים משניים מוסיפים פירוט בלי לספור השמעות פעמיים.',
      loading: 'הקטלוג המלא של 6,413 אמנים נטען…',
      loadError: 'קטלוג האמנים המלא אינו זמין. יש לייבא מחדש את קובצי המקור כדי ליצור תור שניתן לסקור.',
      search: 'חיפוש אמנים',
      searchPlaceholder: 'שם, ז׳אנר או תג…',
      filters: {
        review: 'דורשים סקירה',
        unclassified: 'לא מסווג',
        alternative: 'אלטרנטיבי רחב',
        curated: 'התיקונים שלי',
        all: 'כל האמנים',
      },
      artists: 'אמנים',
      listens: 'השמעות',
      automatic: 'אוטומטי',
      manual: 'באוצרות שלך',
      chooseArtist: 'יש לבחור אמן כדי להתחיל בסיווג.',
      primary: 'משפחת ז׳אנר ראשית',
      primaryPlaceholder: 'בחירת המשפחה ששולטת בתרשימים',
      primaryHint: 'בדיוק משפחה ראשית אחת מקבלת את ההשמעות, ולכן סך הארכיון לעולם אינו משתנה.',
      tags: 'תגים משניים',
      tagsHint: 'הקשר אופציונלי לתיקים ולחיפוש. התגים אינם מנפחים את סך ההשמעות.',
      save: 'שמירת תיקון מקומי',
      reset: 'שחזור הז׳אנר האוטומטי',
      saved: (artist: string) => `${artist} סווג וכל תרשימי הז׳אנרים סונכרנו.`,
      restored: (artist: string) => `${artist} חזר לסיווג האוטומטי.`,
      showMore: 'הצגת 30 אמנים נוספים',
      noResults: 'אין אמנים שתואמים לחיפוש ולמסנן.',
      classifiedKpi: 'השמעות מסווגות',
      unclassifiedKpi: 'השמעות לא מסווגות',
      reviewKpi: 'תור סקירה',
      correctionsKpi: 'תיקונים מקומיים',
      exactNote: '🔒 הגנה מתמטית: השמעות הקטלוג תמיד מתיישבות עם סך הארכיון.',
      sourceCatalog: 'קטלוג מטא־נתונים',
      sourceUnknown: 'ללא מטא־נתונים אוטומטיים',
    },
  });

  const [catalog, setCatalog] = useState<ArtistGenreCatalogEntry[] | null>(
    data.artist_genre_catalog ?? null,
  );
  const [loading, setLoading] = useState(!data.artist_genre_catalog?.length && useBundledCatalog);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StudioFilter>('review');
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [selectedKey, setSelectedKey] = useState('');
  const [family, setFamily] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (data.artist_genre_catalog?.length) {
      setCatalog(data.artist_genre_catalog);
      setLoading(false);
      setLoadError(false);
      return;
    }
    if (!useBundledCatalog) {
      setCatalog(null);
      setLoading(false);
      setLoadError(true);
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError(false);
    void loadDefaultGenreCatalog()
      .then(rows => {
        if (active) setCatalog(rows);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [data.artist_genre_catalog, useBundledCatalog]);

  const assignmentsByArtist = useMemo(() => assignmentMap(assignments), [assignments]);
  const rows = useMemo<EffectiveCatalogRow[]>(() => (catalog ?? []).map(entry => {
    const assignment = assignmentsByArtist.get(entry.artistKey);
    const effectiveFamily = assignment?.family ?? entry.automaticFamily;
    return {
      ...entry,
      assignment,
      effectiveFamily,
      needsReview: !assignment && (entry.automaticFamily === 'Unclassified' || entry.automaticFamily === 'Alternative'),
    };
  }), [assignmentsByArtist, catalog]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = searchable(query);
    return rows
      .filter(row => {
        if (filter === 'review' && !row.needsReview) return false;
        if (filter === 'unclassified' && (row.assignment || row.automaticFamily !== 'Unclassified')) return false;
        if (filter === 'alternative' && (row.assignment || row.automaticFamily !== 'Alternative')) return false;
        if (filter === 'curated' && !row.assignment) return false;
        if (!normalizedQuery) return true;
        const haystack = searchable([
          row.name,
          row.automaticGenre,
          row.automaticFamily,
          row.assignment?.family ?? '',
          ...(row.assignment?.tags ?? []),
        ].join(' '));
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => right.plays - left.plays || left.name.localeCompare(right.name, locale));
  }, [filter, locale, query, rows]);

  const selected = rows.find(row => row.artistKey === selectedKey);
  const visibleRows = filteredRows.slice(0, visibleLimit);
  const unclassifiedPlays = rows
    .filter(row => row.effectiveFamily === 'Unclassified')
    .reduce((sum, row) => sum + row.plays, 0);
  const reviewRows = rows.filter(row => row.needsReview);
  const reviewPlays = reviewRows.reduce((sum, row) => sum + row.plays, 0);
  const totalPlays = rows.reduce((sum, row) => sum + row.plays, 0) || data.core_metrics.total_plays;
  const classifiedPlays = Math.max(0, totalPlays - unclassifiedPlays);
  const classifiedPct = totalPlays ? Math.round((classifiedPlays / totalPlays) * 1000) / 10 : 0;

  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [filter, query]);

  useEffect(() => {
    const selectedIsVisible = filteredRows.some(row => row.artistKey === selectedKey);
    if (selectedIsVisible) return;
    setSelectedKey(filteredRows[0]?.artistKey ?? '');
    setStatus('');
  }, [filteredRows, selectedKey]);

  useEffect(() => {
    if (!selected) {
      setFamily('');
      setTags([]);
      return;
    }
    setFamily(selected.assignment?.family ?? (selected.needsReview ? '' : selected.automaticFamily));
    setTags(selected.assignment?.tags ?? []);
  }, [selected]);

  const selectArtist = (artistKey: string) => {
    setSelectedKey(artistKey);
    setStatus('');
  };

  const chooseFamily = (nextFamily: string) => {
    setFamily(nextFamily);
    setTags(current => sanitizeSecondaryTags(nextFamily, current));
  };

  const toggleTag = (tag: string) => {
    setTags(current => current.includes(tag)
      ? current.filter(value => value !== tag)
      : sanitizeSecondaryTags(family, [...current, tag]));
  };

  const saveAssignment = () => {
    if (!selected || !family || !catalog) return;
    const assignment: GenreAssignment = {
      artistKey: selected.artistKey,
      artistName: selected.name,
      family,
      tags: sanitizeSecondaryTags(family, tags),
      updatedAt: new Date().toISOString(),
    };
    const next = [
      ...assignments.filter(item => item.artistKey !== selected.artistKey),
      assignment,
    ];
    onAssignmentsChange(next, catalog);
    setStatus(copy.saved(selected.name));
  };

  const restoreAutomatic = () => {
    if (!selected?.assignment || !catalog) return;
    onAssignmentsChange(
      assignments.filter(item => item.artistKey !== selected.artistKey),
      catalog,
    );
    setFamily(selected.needsReview ? '' : selected.automaticFamily);
    setTags([]);
    setStatus(copy.restored(selected.name));
  };

  const filterOptions = Object.entries(copy.filters) as Array<[StudioFilter, string]>;
  const kpis = [
    { label: copy.classifiedKpi, value: `${classifiedPct}%`, sub: classifiedPlays.toLocaleString(locale), color: '#22c55e' },
    { label: copy.unclassifiedKpi, value: unclassifiedPlays.toLocaleString(locale), sub: `${totalPlays ? ((unclassifiedPlays / totalPlays) * 100).toFixed(1) : '0.0'}%`, color: '#f59e0b' },
    { label: copy.reviewKpi, value: reviewRows.length.toLocaleString(locale), sub: reviewPlays.toLocaleString(locale), color: tc.c2 },
    { label: copy.correctionsKpi, value: assignments.length.toLocaleString(locale), sub: copy.manual, color: tc.c1 },
  ];

  return (
    <section
      data-testid="genre-tagging-studio"
      aria-labelledby="genre-lab-title"
      className="nova-surface nova-surface--analysis overflow-hidden rounded-3xl border border-white/10"
    >
      <header className="relative border-b border-white/10 p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden="true"
          style={{ background: `radial-gradient(circle at 90% 0%, ${tc.c2}20, transparent 40%), radial-gradient(circle at 5% 100%, ${tc.c1}12, transparent 40%)` }} />
        <div className="relative flex min-w-0 items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border" style={{ color: tc.c2, borderColor: `${tc.c2}35`, backgroundColor: `${tc.c2}12` }}>
            <DatabaseZap className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.24em]" style={{ color: tc.c2 }}>{copy.eyebrow}</p>
            <h2 id="genre-lab-title" className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">{copy.title}</h2>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-gray-400 sm:text-sm">{copy.description}</p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex min-h-52 items-center justify-center gap-3 p-8 text-sm text-gray-300" role="status">
          <Sparkles className="h-5 w-5 animate-pulse" style={{ color: tc.c2 }} aria-hidden="true" />
          {copy.loading}
        </div>
      ) : loadError || !catalog ? (
        <div className="p-6">
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-5 text-sm leading-relaxed text-amber-100" role="status">
            ⚠️ {copy.loadError}
          </div>
        </div>
      ) : (
        <div className="space-y-6 p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {kpis.map(kpi => (
              <div key={kpi.label} className="min-w-0 rounded-2xl border border-white/8 bg-black/20 p-3 sm:p-4">
                <p className="text-[9px] font-mono font-black uppercase tracking-wider text-gray-500">{kpi.label}</p>
                <p className="mt-1 truncate text-xl font-black font-mono sm:text-2xl" style={{ color: kpi.color }}>{kpi.value}</p>
                <p className="mt-1 truncate text-[10px] text-gray-500">{kpi.sub} {copy.listens}</p>
              </div>
            ))}
          </div>

          <p className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] px-3 py-2 text-[10px] leading-relaxed text-emerald-200/80">
            {copy.exactNote}
          </p>

          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(18rem,0.82fr)_minmax(0,1.18fr)]">
            <div className="min-w-0 space-y-3">
              <label className="block text-[10px] font-mono font-black uppercase tracking-widest text-gray-400" htmlFor="genre-artist-search">
                {copy.search}
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
                <input
                  id="genre-artist-search"
                  type="search"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 pe-3 ps-10 text-sm text-white outline-none transition focus:border-white/25 focus:ring-2 focus:ring-white/10"
                />
              </div>

              <div className="flex flex-wrap gap-2" role="group" aria-label={copy.filters.review}>
                {filterOptions.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={filter === id}
                    onClick={() => setFilter(id)}
                    className="min-h-11 rounded-xl border px-3 py-2 text-[10px] font-mono font-black transition-colors"
                    style={filter === id
                      ? { color: tc.c2, borderColor: `${tc.c2}55`, backgroundColor: `${tc.c2}15` }
                      : { color: '#9ca3af', borderColor: 'rgba(255,255,255,.08)', backgroundColor: 'rgba(255,255,255,.025)' }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <p className="text-[10px] font-mono text-gray-500">
                {filteredRows.length.toLocaleString(locale)} {copy.artists}
              </p>

              <div data-testid="genre-candidate-list" className="max-h-[660px] space-y-2 overflow-y-auto pe-1">
                {visibleRows.map(row => {
                  const selectedRow = row.artistKey === selectedKey;
                  return (
                    <button
                      key={row.artistKey}
                      type="button"
                      data-artist-key={row.artistKey}
                      aria-pressed={selectedRow}
                      onClick={() => selectArtist(row.artistKey)}
                      className="flex min-h-[68px] w-full items-center justify-between gap-3 rounded-2xl border p-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2"
                      style={selectedRow
                        ? { borderColor: `${tc.c2}55`, backgroundColor: `${tc.c2}12` }
                        : { borderColor: 'rgba(255,255,255,.07)', backgroundColor: 'rgba(0,0,0,.18)' }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-white"><bdi dir="auto">{row.name}</bdi></span>
                        <span className="mt-1 block truncate text-[10px] text-gray-500">
                          {row.assignment ? copy.manual : copy.automatic}: <bdi dir="auto">{genreFamilyLabel(row.effectiveFamily, lang)}</bdi>
                        </span>
                      </span>
                      <span className="shrink-0 text-end">
                        <span className="block font-mono text-xs font-black" style={{ color: row.assignment ? '#22c55e' : row.needsReview ? '#f59e0b' : tc.c1 }}>
                          {row.plays.toLocaleString(locale)}
                        </span>
                        <span className="block text-[9px] text-gray-600">{copy.listens}</span>
                      </span>
                    </button>
                  );
                })}
                {!visibleRows.length && (
                  <p className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-xs text-gray-500">{copy.noResults}</p>
                )}
              </div>

              {visibleLimit < filteredRows.length && (
                <button
                  type="button"
                  onClick={() => setVisibleLimit(limit => limit + PAGE_SIZE)}
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-gray-300 hover:bg-white/[0.06]"
                >
                  {copy.showMore}
                </button>
              )}
            </div>

            <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
              {!selected ? (
                <div className="flex min-h-64 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-black/15 p-8 text-center text-sm text-gray-500">
                  {copy.chooseArtist}
                </div>
              ) : (
                <fieldset className="min-w-0 space-y-5 rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
                  <legend className="sr-only">{selected.name}</legend>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/8 pb-4">
                    <div className="min-w-0">
                      <p className="text-xl font-black text-white"><bdi dir="auto">{selected.name}</bdi></p>
                      <p className="mt-1 text-[10px] text-gray-500">
                        {selected.plays.toLocaleString(locale)} {copy.listens} · {selected.source === 'catalog' ? copy.sourceCatalog : copy.sourceUnknown}
                      </p>
                    </div>
                    <span className="rounded-full border px-2.5 py-1 text-[9px] font-mono font-black"
                      style={{ color: selected.assignment ? '#22c55e' : '#f59e0b', borderColor: selected.assignment ? '#22c55e40' : '#f59e0b40', backgroundColor: selected.assignment ? '#22c55e12' : '#f59e0b12' }}>
                      {selected.assignment ? `✓ ${copy.manual}` : copy.automatic}
                    </span>
                  </div>

                  <div>
                    <label htmlFor="genre-primary-family" className="text-xs font-black text-white">{copy.primary}</label>
                    <select
                      id="genre-primary-family"
                      value={family}
                      onChange={event => chooseFamily(event.target.value)}
                      className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#0b0d18] px-3 text-sm text-white outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10"
                    >
                      <option value="">{copy.primaryPlaceholder}</option>
                      {GENRE_FAMILY_IDS.filter(id => id !== 'Unclassified').map(id => (
                        <option key={id} value={id}>{genreFamilyLabel(id, lang)}</option>
                      ))}
                    </select>
                    <p className="mt-2 text-[10px] leading-relaxed text-gray-500">{copy.primaryHint}</p>
                  </div>

                  <div>
                    <p className="text-xs font-black text-white">{copy.tags}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-gray-500">{copy.tagsHint}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {family && secondaryTagsForFamily(family).map(tag => {
                        const active = tags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggleTag(tag)}
                            className="min-h-11 rounded-xl border px-3 py-2 text-[10px] font-bold transition-colors"
                            style={active
                              ? { color: tc.c1, borderColor: `${tc.c1}55`, backgroundColor: `${tc.c1}15` }
                              : { color: '#9ca3af', borderColor: 'rgba(255,255,255,.08)', backgroundColor: 'rgba(255,255,255,.025)' }}
                          >
                            {active && <Check className="me-1 inline h-3.5 w-3.5" aria-hidden="true" />}
                            {tag}
                          </button>
                        );
                      })}
                      {family && !secondaryTagsForFamily(family).length && (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={!family}
                      onClick={saveAssignment}
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs font-black text-[#071015] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ background: `linear-gradient(135deg, ${tc.c1}, ${tc.c2})` }}
                    >
                      <Tags className="h-4 w-4" aria-hidden="true" />
                      {copy.save}
                    </button>
                    <button
                      type="button"
                      disabled={!selected.assignment}
                      onClick={restoreAutomatic}
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-xs font-bold text-gray-300 enabled:hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      {copy.reset}
                    </button>
                  </div>
                </fieldset>
              )}
            </div>
          </div>

          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{status}</p>
        </div>
      )}
    </section>
  );
}
