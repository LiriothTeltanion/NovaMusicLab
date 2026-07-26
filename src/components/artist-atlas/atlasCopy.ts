import type { Lang } from '../../utils/i18n';

export interface ArtistAtlasCopy {
  eyebrow: string;
  title: string;
  subtitle: string;
  featuredArtists: string;
  browseAll: string;
  chooseArtist: string;
  rank: (value: number) => string;
  archiveSignal: string;
  archivePlays: string;
  archiveShare: string;
  knownTracks: string;
  knownAlbums: string;
  portraitStage: string;
  remoteArtwork: string;
  remoteArtworkNote: string;
  generatedFallback: string;
  documentedProfile: string;
  archiveOnly: string;
  noGallery: string;
  previousPhoto: string;
  nextPhoto: string;
  selectPhoto: (value: number) => string;
  photoCount: (current: number, total: number) => string;
  archiveBiography: string;
  biographySource: (source: string) => string;
  noBiography: string;
  officialSite: string;
  wikipedia: string;
  archiveFootprint: string;
  archiveFootprintBody: string;
  topTracks: string;
  topAlbums: string;
  noTracks: string;
  noAlbums: string;
  plays: string;
  discography: string;
  discographyBody: string;
  releasesKnown: (value: number) => string;
  noReleases: string;
  releaseTypeFallback: string;
  dateUnavailable: string;
  profileSignals: string;
  areas: string;
  activeYears: string;
  members: string;
  genres: string;
  unavailable: string;
  mediaTitle: string;
  mediaSubtitle: string;
  mediaPrivacyTitle: string;
  mediaPrivacyBody: string;
  loadMedia: string;
  hideMedia: string;
  loadingMedia: string;
  verifiedMedia: string;
  searchFallback: string;
  evidenceTitle: string;
  evidenceSubtitle: string;
  openEvidence: string;
  closeEvidence: string;
  evidenceLoading: string;
  evidenceError: string;
  noEvidence: string;
  knowledgeSources: string;
  visualAssets: string;
  visualAssetCount: (value: number) => string;
  openSource: string;
  verifiedAt: (value: string) => string;
  verificationDateMissing: string;
  attribution: string;
  confidence: Record<'verified' | 'curated' | 'matched' | 'unverified', string>;
  license: Record<'verified' | 'declared' | 'unverified' | 'restricted', string>;
  assetStatus: Record<'active' | 'review' | 'blocked', string>;
}

export const ARTIST_ATLAS_COPY: Record<Lang, ArtistAtlasCopy> = {
  es: {
    eyebrow: 'Expedition Console · Sala viva',
    title: 'Territorios de artistas',
    subtitle: 'Explora cada artista como un territorio: peso en el archivo, imágenes, canciones, álbumes, discografía, media oficial y evidencia.',
    featuredArtists: 'Señales destacadas',
    browseAll: 'Explorar todo el archivo',
    chooseArtist: 'Elegir artista',
    rank: value => `Rango #${value}`,
    archiveSignal: 'Señal del archivo',
    archivePlays: 'Reproducciones',
    archiveShare: 'Peso del archivo',
    knownTracks: 'Canciones registradas',
    knownAlbums: 'Álbumes registrados',
    portraitStage: 'Escenario visual',
    remoteArtwork: 'Imagen remota',
    remoteArtworkNote: 'Las fotografías provienen del proveedor indicado y generan una solicitud de red de terceros.',
    generatedFallback: 'Cartografía generativa local',
    documentedProfile: 'Perfil offline documentado',
    archiveOnly: 'Solo datos del archivo',
    noGallery: 'No hay una galería verificada para esta identidad. Mostramos una composición local determinística, sin inventar una fotografía.',
    previousPhoto: 'Fotografía anterior',
    nextPhoto: 'Fotografía siguiente',
    selectPhoto: value => `Mostrar fotografía ${value}`,
    photoCount: (current, total) => `${current} de ${total}`,
    archiveBiography: 'Perfil documentado',
    biographySource: source => `Descripción de ${source}`,
    noBiography: 'Todavía no existe una biografía editorial verificada para esta identidad. Conservamos únicamente los datos confirmados del archivo.',
    officialSite: 'Sitio oficial',
    wikipedia: 'Wikipedia',
    archiveFootprint: 'Huella en tu archivo',
    archiveFootprintBody: 'Canciones y álbumes ordenados por reproducciones dentro del conjunto activo. No representa popularidad global.',
    topTracks: 'Canciones esenciales',
    topAlbums: 'Álbumes esenciales',
    noTracks: 'Este archivo no contiene canciones agregadas para el artista seleccionado.',
    noAlbums: 'Este archivo no contiene álbumes agregados para el artista seleccionado.',
    plays: 'reproducciones',
    discography: 'Constelación discográfica',
    discographyBody: 'Lanzamientos documentados por el catálogo offline. Las portadas usan arte verificado cuando existe y una cubierta determinística cuando falta.',
    releasesKnown: value => `${value} lanzamientos documentados`,
    noReleases: 'No hay lanzamientos documentados en el catálogo offline.',
    releaseTypeFallback: 'Lanzamiento',
    dateUnavailable: 'Fecha no disponible',
    profileSignals: 'Señales del perfil',
    areas: 'Lugares',
    activeYears: 'Actividad',
    members: 'Miembros/roles',
    genres: 'Etiquetas documentadas',
    unavailable: 'No disponible',
    mediaTitle: 'Portal de media oficial',
    mediaSubtitle: 'Spotify, YouTube y enlaces externos permanecen separados de la experiencia local hasta que decidas abrirlos.',
    mediaPrivacyTitle: 'Control de privacidad',
    mediaPrivacyBody: 'Al cargar el portal, los reproductores oficiales pueden conectar con Spotify o YouTube. Nova Music Lab no aloja ni descarga audio.',
    loadMedia: 'Cargar media oficial',
    hideMedia: 'Cerrar portal de media',
    loadingMedia: 'Preparando reproductores oficiales…',
    verifiedMedia: 'Enlace curado',
    searchFallback: 'Búsqueda segura disponible',
    evidenceTitle: 'Evidencia y procedencia',
    evidenceSubtitle: 'Consulta qué fuentes sostienen el perfil y el estado real de licencia, atribución y privacidad de cada recurso visual.',
    openEvidence: 'Abrir evidencia',
    closeEvidence: 'Cerrar evidencia',
    evidenceLoading: 'Cargando manifiesto de evidencia…',
    evidenceError: 'No se pudo abrir el manifiesto local. El resto del museo sigue disponible.',
    noEvidence: 'No existe un registro de conocimiento para esta identidad.',
    knowledgeSources: 'Fuentes de conocimiento',
    visualAssets: 'Recursos visuales',
    visualAssetCount: value => `${value} recursos vinculados`,
    openSource: 'Abrir fuente',
    verifiedAt: value => `Revisado ${value}`,
    verificationDateMissing: 'Fecha de revisión no registrada',
    attribution: 'Atribución',
    confidence: { verified: 'Verificado', curated: 'Curado', matched: 'Coincidencia', unverified: 'No verificado' },
    license: { verified: 'Licencia verificada', declared: 'Licencia declarada', unverified: 'Licencia por revisar', restricted: 'Uso restringido por proveedor' },
    assetStatus: { active: 'Activo', review: 'En revisión', blocked: 'Bloqueado' },
  },
  en: {
    eyebrow: 'Expedition Console · Living room',
    title: 'Artist territories',
    subtitle: 'Explore each artist as a territory: archive weight, imagery, tracks, albums, discography, official media and evidence.',
    featuredArtists: 'Featured signals',
    browseAll: 'Explore the full archive',
    chooseArtist: 'Choose artist',
    rank: value => `Rank #${value}`,
    archiveSignal: 'Archive signal',
    archivePlays: 'Archive plays',
    archiveShare: 'Archive weight',
    knownTracks: 'Recorded tracks',
    knownAlbums: 'Recorded albums',
    portraitStage: 'Visual stage',
    remoteArtwork: 'Remote artwork',
    remoteArtworkNote: 'Photographs come from the named provider and create a third-party network request.',
    generatedFallback: 'Local generative cartography',
    documentedProfile: 'Documented offline profile',
    archiveOnly: 'Archive facts only',
    noGallery: 'No verified gallery exists for this identity. A deterministic local composition is shown instead of inventing a photograph.',
    previousPhoto: 'Previous photograph',
    nextPhoto: 'Next photograph',
    selectPhoto: value => `Show photograph ${value}`,
    photoCount: (current, total) => `${current} of ${total}`,
    archiveBiography: 'Documented profile',
    biographySource: source => `Description from ${source}`,
    noBiography: 'No verified editorial biography exists for this identity yet. Only confirmed archive facts are retained.',
    officialSite: 'Official site',
    wikipedia: 'Wikipedia',
    archiveFootprint: 'Footprint in your archive',
    archiveFootprintBody: 'Tracks and albums are ranked by plays inside the active dataset. This is not a claim about global popularity.',
    topTracks: 'Essential tracks',
    topAlbums: 'Essential albums',
    noTracks: 'The active archive has no aggregated tracks for this artist.',
    noAlbums: 'The active archive has no aggregated albums for this artist.',
    plays: 'plays',
    discography: 'Discography constellation',
    discographyBody: 'Releases documented by the offline catalog. Covers use known artwork when available and a deterministic cover when missing.',
    releasesKnown: value => `${value} documented releases`,
    noReleases: 'The offline catalog has no documented releases for this artist.',
    releaseTypeFallback: 'Release',
    dateUnavailable: 'Date unavailable',
    profileSignals: 'Profile signals',
    areas: 'Places',
    activeYears: 'Activity',
    members: 'Members/roles',
    genres: 'Documented tags',
    unavailable: 'Unavailable',
    mediaTitle: 'Official media portal',
    mediaSubtitle: 'Spotify, YouTube and external links stay separate from the local experience until you choose to open them.',
    mediaPrivacyTitle: 'Privacy control',
    mediaPrivacyBody: 'Loading the portal may connect official players to Spotify or YouTube. Nova Music Lab does not host or download audio.',
    loadMedia: 'Load official media',
    hideMedia: 'Close media portal',
    loadingMedia: 'Preparing official players…',
    verifiedMedia: 'Curated link',
    searchFallback: 'Safe search available',
    evidenceTitle: 'Evidence and provenance',
    evidenceSubtitle: 'Inspect the sources behind the profile and the real license, attribution and privacy state of each visual asset.',
    openEvidence: 'Open evidence',
    closeEvidence: 'Close evidence',
    evidenceLoading: 'Loading evidence manifest…',
    evidenceError: 'The local manifest could not be opened. The rest of the museum remains available.',
    noEvidence: 'No knowledge record exists for this identity.',
    knowledgeSources: 'Knowledge sources',
    visualAssets: 'Visual assets',
    visualAssetCount: value => `${value} linked assets`,
    openSource: 'Open source',
    verifiedAt: value => `Checked ${value}`,
    verificationDateMissing: 'Review date not recorded',
    attribution: 'Attribution',
    confidence: { verified: 'Verified', curated: 'Curated', matched: 'Matched', unverified: 'Unverified' },
    license: { verified: 'Verified license', declared: 'Declared license', unverified: 'License review pending', restricted: 'Provider-restricted use' },
    assetStatus: { active: 'Active', review: 'Under review', blocked: 'Blocked' },
  },
  he: {
    eyebrow: 'Expedition Console · חדר חי',
    title: 'מרחבי אמנים',
    subtitle: 'כל אמן כמקום לחקור: משקל בארכיון, דימויים, שירים, אלבומים, דיסקוגרפיה, מדיה רשמית וראיות.',
    featuredArtists: 'אותות נבחרים',
    browseAll: 'עיון בכל הארכיון',
    chooseArtist: 'בחירת אמן',
    rank: value => `דירוג #${value}`,
    archiveSignal: 'אות הארכיון',
    archivePlays: 'השמעות בארכיון',
    archiveShare: 'משקל בארכיון',
    knownTracks: 'שירים מתועדים',
    knownAlbums: 'אלבומים מתועדים',
    portraitStage: 'במה חזותית',
    remoteArtwork: 'דימוי מרוחק',
    remoteArtworkNote: 'התצלומים מגיעים מהספק המצוין ויוצרים בקשת רשת לצד שלישי.',
    generatedFallback: 'קרטוגרפיה גנרטיבית מקומית',
    documentedProfile: 'פרופיל לא־מקוון מתועד',
    archiveOnly: 'עובדות מן הארכיון בלבד',
    noGallery: 'אין גלריה מאומתת לזהות הזאת. מוצגת קומפוזיציה מקומית ודטרמיניסטית במקום להמציא תצלום.',
    previousPhoto: 'התצלום הקודם',
    nextPhoto: 'התצלום הבא',
    selectPhoto: value => `הצגת תצלום ${value}`,
    photoCount: (current, total) => `${current} מתוך ${total}`,
    archiveBiography: 'פרופיל מתועד',
    biographySource: source => `תיאור מתוך ${source}`,
    noBiography: 'עדיין אין ביוגרפיה ערוכה ומאומתת לזהות הזאת. נשמרים רק פרטים מאושרים מן הארכיון.',
    officialSite: 'אתר רשמי',
    wikipedia: 'ויקיפדיה',
    archiveFootprint: 'החותם בארכיון שלך',
    archiveFootprintBody: 'השירים והאלבומים מדורגים לפי השמעות במאגר הפעיל. זו אינה טענה על פופולריות עולמית.',
    topTracks: 'שירים מרכזיים',
    topAlbums: 'אלבומים מרכזיים',
    noTracks: 'בארכיון הפעיל אין שירים מצטברים עבור האמן הזה.',
    noAlbums: 'בארכיון הפעיל אין אלבומים מצטברים עבור האמן הזה.',
    plays: 'השמעות',
    discography: 'קונסטלציית דיסקוגרפיה',
    discographyBody: 'יצירות המתועדות בקטלוג הלא־מקוון. עטיפה מוכרת מוצגת כשישנה, ואחרת נוצרת עטיפה דטרמיניסטית.',
    releasesKnown: value => `${value} יצירות מתועדות`,
    noReleases: 'בקטלוג הלא־מקוון אין יצירות מתועדות לאמן הזה.',
    releaseTypeFallback: 'יצירה',
    dateUnavailable: 'תאריך לא זמין',
    profileSignals: 'אותות הפרופיל',
    areas: 'מקומות',
    activeYears: 'פעילות',
    members: 'חברים/תפקידים',
    genres: 'תגיות מתועדות',
    unavailable: 'לא זמין',
    mediaTitle: 'שער מדיה רשמית',
    mediaSubtitle: 'Spotify, YouTube וקישורים חיצוניים נשארים מופרדים מהחוויה המקומית עד לבחירתך לפתוח אותם.',
    mediaPrivacyTitle: 'בקרת פרטיות',
    mediaPrivacyBody: 'טעינת השער עשויה לחבר נגנים רשמיים ל־Spotify או YouTube. Nova Music Lab אינה מארחת או מורידה שמע.',
    loadMedia: 'טעינת מדיה רשמית',
    hideMedia: 'סגירת שער המדיה',
    loadingMedia: 'מכין נגנים רשמיים…',
    verifiedMedia: 'קישור שנבדק',
    searchFallback: 'חיפוש בטוח זמין',
    evidenceTitle: 'ראיות ומקור',
    evidenceSubtitle: 'אפשר לבדוק את מקורות הפרופיל ואת מצב הרישיון, הייחוס והפרטיות האמיתי של כל משאב חזותי.',
    openEvidence: 'פתיחת ראיות',
    closeEvidence: 'סגירת ראיות',
    evidenceLoading: 'טוען את מניפסט הראיות…',
    evidenceError: 'לא ניתן לפתוח את המניפסט המקומי. שאר המוזיאון ממשיך להיות זמין.',
    noEvidence: 'אין רשומת ידע לזהות הזאת.',
    knowledgeSources: 'מקורות ידע',
    visualAssets: 'משאבים חזותיים',
    visualAssetCount: value => `${value} משאבים מקושרים`,
    openSource: 'פתיחת מקור',
    verifiedAt: value => `נבדק ${value}`,
    verificationDateMissing: 'תאריך הבדיקה לא תועד',
    attribution: 'ייחוס',
    confidence: { verified: 'מאומת', curated: 'אוצר', matched: 'מותאם', unverified: 'לא מאומת' },
    license: { verified: 'רישיון מאומת', declared: 'רישיון מוצהר', unverified: 'הרישיון ממתין לבדיקה', restricted: 'שימוש מוגבל על ידי הספק' },
    assetStatus: { active: 'פעיל', review: 'בבדיקה', blocked: 'חסום' },
  },
};
