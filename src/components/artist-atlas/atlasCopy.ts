import type { Lang } from '../../utils/i18n';
import type { ExperienceDepth } from '../shell/museumNavigation';

const bidiIsolate = (value: string | number) => `\u2068${String(value)}\u2069`;

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
  editorialStory: string;
  editorialStoryNote: string;
  artistIntro: (artist: string, genre: string, rank: number, plays: string, place?: string) => string;
  whyItMatters: string;
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
  genreFamily: string;
  documentedGenres: string;
  suggestedGenres: string;
  suggestedGenresNote: string;
  moreGenreSuggestions: (value: number) => string;
  genreKnowledgeLoading: string;
  genreKnowledgeUnavailable: string;
  genreUnclassified: string;
  genreStatusDocumented: string;
  genreStatusSuggested: string;
  genreStatusUnclassified: string;
  emotionalReading: string;
  emotionalReadingNote: string;
  unavailable: string;
  connectionsTitle: string;
  connectionsSubtitle: string;
  documentedConnections: string;
  sameIdentityConnection: string;
  sharedMemberConnection: (member: string) => string;
  archiveNeighbors: string;
  archiveNeighborsNote: string;
  sharedStyleConnection: (styles: string) => string;
  sharedPlaceConnection: (place: string) => string;
  openArtist: (artist: string) => string;
  musicBeeEyebrow: string;
  musicBeeTitle: string;
  musicBeeBody: (tracks: string, albums: string) => string;
  musicBeeTracks: string;
  musicBeeAlbums: string;
  musicBeePlayCount: string;
  musicBeeLastPlayed: string;
  musicBeeNoLastPlayed: string;
  musicBeeBoundary: string;
  lineupTitle: string;
  lineupSubtitle: string;
  lineupCurrent: string;
  lineupFormer: string;
  lineupFormerCount: (value: number) => string;
  lineupNoPhoto: string;
  lineupSince: (year: string) => string;
  lineupSpan: (from: string, to: string) => string;
  lineupRolesUnknown: string;
  memberAge: (value: number) => string;
  memberAlsoIn: string;
  memberAlsoInEmpty: string;
  memberClose: string;
  memberOpenHint: string;
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
    editorialStory: 'Conoce al artista',
    editorialStoryNote: 'Lectura editorial de Nova basada en el historial activo; no sustituye una biografía externa.',
    artistIntro: (artist, genre, rank, plays, place) => `${artist} ocupa el puesto #${rank} de tu historial, con ${plays} reproducciones. Para organizar el archivo, Nova lo agrupa provisionalmente en la familia analítica ${genre}${place ? ` y registra una conexión de catálogo con ${place}` : ''}; los géneros documentados y sugeridos aparecen más abajo.`,
    whyItMatters: 'Por qué importa en este mapa',
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
    genres: 'Géneros y subgéneros',
    genreFamily: 'Familia del archivo',
    documentedGenres: 'Documentados',
    suggestedGenres: 'Sugerencias por revisar',
    suggestedGenresNote: 'Estas coincidencias tienen una fuente, pero todavía no se presentan como hechos confirmados.',
    moreGenreSuggestions: value => `+${value} sugerencias adicionales en la base de datos`,
    genreKnowledgeLoading: 'Cargando la ficha de géneros…',
    genreKnowledgeUnavailable: 'La ficha de géneros no pudo cargarse. El resto del Atlas sigue disponible.',
    genreUnclassified: 'Este artista todavía no tiene géneros documentados ni sugerencias seguras.',
    genreStatusDocumented: 'Documentado',
    genreStatusSuggested: 'Con sugerencias',
    genreStatusUnclassified: 'Por investigar',
    emotionalReading: 'Lectura emocional',
    emotionalReadingNote: 'Capa exploratoria calculada por Nova; no afirma lo que sentiste al escuchar.',
    unavailable: 'No disponible',
    connectionsTitle: 'Artistas y conexiones',
    connectionsSubtitle: 'Separamos identidades documentadas, coincidencias del catálogo y parecidos encontrados en tu historial.',
    documentedConnections: 'Conexiones del catálogo',
    sameIdentityConnection: 'Es la misma identidad artística o un nombre histórico documentado.',
    sharedMemberConnection: member => `Ambas fichas del catálogo incluyen el nombre ${member}; la identidad de la persona aún requiere revisión estable.`,
    archiveNeighbors: 'Artistas cercanos en tu historial',
    archiveNeighborsNote: 'Esta cercanía usa estilos y lugares compartidos. No afirma influencia, colaboración ni parecido musical universal.',
    sharedStyleConnection: styles => `Estilos compartidos: ${styles}.`,
    sharedPlaceConnection: place => `Lugar compartido: ${place}.`,
    openArtist: artist => `Abrir territorio de ${artist}`,
    musicBeeEyebrow: 'Tu biblioteca local',
    musicBeeTitle: 'También aparece en MusicBee',
    musicBeeBody: (tracks, albums) => `${tracks} canciones y ${albums} álbumes de este artista están guardados en tu biblioteca de escritorio.`,
    musicBeeTracks: 'Canciones guardadas',
    musicBeeAlbums: 'Álbumes guardados',
    musicBeePlayCount: 'Play Count de MusicBee',
    musicBeeLastPlayed: 'Última reproducción en MusicBee',
    musicBeeNoLastPlayed: 'Sin fecha registrada',
    musicBeeBoundary: 'El Play Count de MusicBee es un contador de biblioteca. Se muestra aparte y no se suma al historial, las sesiones ni los totales de Spotify/Last.fm.',
    lineupTitle: 'Formación',
    lineupSubtitle: 'Miembros documentados en MusicBrainz y Wikidata.',
    lineupCurrent: 'Actual',
    lineupFormer: 'Anteriores',
    lineupFormerCount: (value) => `${value} ${value === 1 ? 'miembro anterior' : 'miembros anteriores'}`,
    lineupNoPhoto: 'Sin retrato libre documentado',
    lineupSince: (year) => `Desde ${year}`,
    lineupSpan: (from, to) => `${from}–${to || '?'}`,
    lineupRolesUnknown: 'Rol no documentado',
    memberAge: (value) => `${value} años`,
    memberAlsoIn: 'También en tu archivo',
    memberAlsoInEmpty: 'Sin otras bandas en tu archivo.',
    memberClose: 'Cerrar ficha del miembro',
    memberOpenHint: 'Abrir ficha del miembro',
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
    editorialStory: 'Meet the artist',
    editorialStoryNote: 'A Nova editorial reading based on the active listening history; it does not replace an external biography.',
    artistIntro: (artist, genre, rank, plays, place) => `${artist} ranks #${rank} in your listening history with ${plays} plays. To organize the archive, Nova provisionally groups this artist in the ${genre} analytical family${place ? ` and records a catalog connection to ${place}` : ''}; documented genres and suggestions appear below.`,
    whyItMatters: 'Why this artist matters here',
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
    genres: 'Genres and subgenres',
    genreFamily: 'Archive family',
    documentedGenres: 'Documented',
    suggestedGenres: 'Suggestions to review',
    suggestedGenresNote: 'These matches have a source, but are not presented as confirmed facts yet.',
    moreGenreSuggestions: value => `+${value} more suggestions in the database`,
    genreKnowledgeLoading: 'Loading the genre profile…',
    genreKnowledgeUnavailable: 'The genre profile could not load. The rest of the Atlas remains available.',
    genreUnclassified: 'This artist has no documented genres or safe suggestions yet.',
    genreStatusDocumented: 'Documented',
    genreStatusSuggested: 'Has suggestions',
    genreStatusUnclassified: 'To research',
    emotionalReading: 'Emotional reading',
    emotionalReadingNote: 'An exploratory layer calculated by Nova; it does not claim what you felt while listening.',
    unavailable: 'Unavailable',
    connectionsTitle: 'Artists and connections',
    connectionsSubtitle: 'Documented identities, catalog name matches and similarities in your history stay clearly separated.',
    documentedConnections: 'Catalog connections',
    sameIdentityConnection: 'This is the same artistic identity or a documented former name.',
    sharedMemberConnection: member => `Both catalog profiles include the member name ${member}; stable person identity still needs review.`,
    archiveNeighbors: 'Nearby artists in your history',
    archiveNeighborsNote: 'This proximity uses shared styles and places. It does not claim influence, collaboration or universal musical similarity.',
    sharedStyleConnection: styles => `Shared styles: ${styles}.`,
    sharedPlaceConnection: place => `Shared place: ${place}.`,
    openArtist: artist => `Open ${artist} territory`,
    musicBeeEyebrow: 'Your local library',
    musicBeeTitle: 'Also found in MusicBee',
    musicBeeBody: (tracks, albums) => `${tracks} tracks and ${albums} albums by this artist are stored in your desktop library.`,
    musicBeeTracks: 'Saved tracks',
    musicBeeAlbums: 'Saved albums',
    musicBeePlayCount: 'MusicBee Play Count',
    musicBeeLastPlayed: 'Last played in MusicBee',
    musicBeeNoLastPlayed: 'No date recorded',
    musicBeeBoundary: 'MusicBee Play Count is a library counter. It stays separate and is not added to the timeline, sessions or Spotify/Last.fm totals.',
    lineupTitle: 'Lineup',
    lineupSubtitle: 'Members documented in MusicBrainz and Wikidata.',
    lineupCurrent: 'Current',
    lineupFormer: 'Former',
    lineupFormerCount: (value) => `${value} former ${value === 1 ? 'member' : 'members'}`,
    lineupNoPhoto: 'No free portrait on record',
    lineupSince: (year) => `Since ${year}`,
    lineupSpan: (from, to) => `${from}–${to || '?'}`,
    lineupRolesUnknown: 'Role not documented',
    memberAge: (value) => `${value} years old`,
    memberAlsoIn: 'Also in your archive',
    memberAlsoInEmpty: 'No other bands in your archive.',
    memberClose: 'Close member card',
    memberOpenHint: 'Open member card',
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
    rank: value => `דירוג #${bidiIsolate(value)}`,
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
    editorialStory: 'היכרות עם האמן',
    editorialStoryNote: 'קריאה מערכתית של Nova המבוססת על היסטוריית ההאזנה הפעילה; היא אינה מחליפה ביוגרפיה חיצונית.',
    artistIntro: (artist, genre, rank, plays, place) => `${bidiIsolate(artist)} מדורג במקום #${bidiIsolate(rank)} בהיסטוריית ההאזנה שלך, עם ${bidiIsolate(plays)} השמעות. לצורך ארגון הארכיון, Nova משייכת את האמן באופן זמני למשפחה האנליטית ${bidiIsolate(genre)}${place ? ` ומתעדת קשר קטלוגי אל ${bidiIsolate(place)}` : ''}; ז׳אנרים מתועדים והצעות מופיעים בהמשך.`,
    whyItMatters: 'למה האמן חשוב במפה הזאת',
    biographySource: source => `תיאור מתוך ${bidiIsolate(source)}`,
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
    releasesKnown: value => `${bidiIsolate(value)} יצירות מתועדות`,
    noReleases: 'בקטלוג הלא־מקוון אין יצירות מתועדות לאמן הזה.',
    releaseTypeFallback: 'יצירה',
    dateUnavailable: 'תאריך לא זמין',
    profileSignals: 'אותות הפרופיל',
    areas: 'מקומות',
    activeYears: 'פעילות',
    members: 'חברים/תפקידים',
    genres: 'ז׳אנרים ותתי־ז׳אנרים',
    genreFamily: 'משפחת הארכיון',
    documentedGenres: 'מתועד',
    suggestedGenres: 'הצעות לבדיקה',
    suggestedGenresNote: 'להתאמות האלה יש מקור, אבל הן עדיין אינן מוצגות כעובדות מאושרות.',
    moreGenreSuggestions: value => `עוד ${bidiIsolate(value)} הצעות במסד הנתונים`,
    genreKnowledgeLoading: 'טוענים את פרופיל הז׳אנרים…',
    genreKnowledgeUnavailable: 'לא ניתן לטעון את פרופיל הז׳אנרים. שאר האטלס עדיין זמין.',
    genreUnclassified: 'עדיין אין לאמן הזה ז׳אנרים מתועדים או הצעות בטוחות.',
    genreStatusDocumented: 'מתועד',
    genreStatusSuggested: 'יש הצעות',
    genreStatusUnclassified: 'למחקר',
    emotionalReading: 'קריאה רגשית',
    emotionalReadingNote: 'שכבת חקר שחושבה על ידי Nova; היא אינה קובעת מה הרגשתם בזמן ההאזנה.',
    unavailable: 'לא זמין',
    connectionsTitle: 'אמנים וקשרים',
    connectionsSubtitle: 'זהויות מתועדות, התאמות שמות בקטלוג ודמיון בהיסטוריה שלך מוצגים בנפרד.',
    documentedConnections: 'קשרים מתוך הקטלוג',
    sameIdentityConnection: 'זו אותה זהות אמנותית או שם קודם מתועד.',
    sharedMemberConnection: member => `בשני פרופילי הקטלוג מופיע שם החבר ${bidiIsolate(member)}; זהות האדם עדיין דורשת אימות יציב.`,
    archiveNeighbors: 'אמנים קרובים בהיסטוריה שלך',
    archiveNeighborsNote: 'הקרבה מבוססת על סגנונות ומקומות משותפים. היא אינה טענה להשפעה, לשיתוף פעולה או לדמיון מוזיקלי אוניברסלי.',
    sharedStyleConnection: styles => `סגנונות משותפים: ${bidiIsolate(styles)}.`,
    sharedPlaceConnection: place => `מקום משותף: ${bidiIsolate(place)}.`,
    openArtist: artist => `פתיחת המרחב של ${bidiIsolate(artist)}`,
    musicBeeEyebrow: 'הספרייה המקומית שלך',
    musicBeeTitle: 'מופיע גם ב-MusicBee',
    musicBeeBody: (tracks, albums) => `${bidiIsolate(tracks)} שירים ו-${bidiIsolate(albums)} אלבומים של האמן שמורים בספריית המחשב שלך.`,
    musicBeeTracks: 'שירים שמורים',
    musicBeeAlbums: 'אלבומים שמורים',
    musicBeePlayCount: 'מונה ההשמעות של MusicBee',
    musicBeeLastPlayed: 'הושמע לאחרונה ב-MusicBee',
    musicBeeNoLastPlayed: 'לא נשמר תאריך',
    musicBeeBoundary: 'מונה ההשמעות של MusicBee הוא מונה ספרייה. הוא נשאר נפרד ואינו מתווסף לציר הזמן, לסשנים או לסיכומי Spotify/Last.fm.',
    lineupTitle: 'הרכב הלהקה',
    lineupSubtitle: 'חברים מתועדים ב-MusicBrainz וב-Wikidata.',
    lineupCurrent: 'נוכחי',
    lineupFormer: 'לשעבר',
    lineupFormerCount: (value) => (value === 1 ? 'חבר אחד לשעבר' : `${bidiIsolate(value)} חברים לשעבר`),
    lineupNoPhoto: 'אין תצלום חופשי מתועד',
    lineupSince: (year) => `מאז ${bidiIsolate(year)}`,
    lineupSpan: (from, to) => `${bidiIsolate(from)}–${bidiIsolate(to || '?')}`,
    lineupRolesUnknown: 'התפקיד אינו מתועד',
    memberAge: (value) => `בן ${bidiIsolate(value)}`,
    memberAlsoIn: 'גם בארכיון שלך',
    memberAlsoInEmpty: 'אין להקות נוספות בארכיון שלך.',
    memberClose: 'סגירת כרטיס החבר',
    memberOpenHint: 'פתיחת כרטיס החבר',
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
    visualAssetCount: value => `${bidiIsolate(value)} משאבים מקושרים`,
    openSource: 'פתיחת מקור',
    verifiedAt: value => `נבדק ${bidiIsolate(value)}`,
    verificationDateMissing: 'תאריך הבדיקה לא תועד',
    attribution: 'ייחוס',
    confidence: { verified: 'מאומת', curated: 'אוצר', matched: 'מותאם', unverified: 'לא מאומת' },
    license: { verified: 'רישיון מאומת', declared: 'רישיון מוצהר', unverified: 'הרישיון ממתין לבדיקה', restricted: 'שימוש מוגבל על ידי הספק' },
    assetStatus: { active: 'פעיל', review: 'בבדיקה', blocked: 'חסום' },
  },
};

const SIMPLE_COPY: Record<Lang, Partial<ArtistAtlasCopy>> = {
  es: {
    subtitle: 'Descubre quién es cada artista, qué escuchas más, sus imágenes, integrantes, álbumes y conexiones.',
    featuredArtists: 'Tus artistas más presentes',
    browseAll: 'Buscar en tus artistas',
    archiveSignal: 'En tu historial musical',
    archiveShare: 'Parte de tu escucha',
    portraitStage: 'Galería del artista',
    remoteArtwork: 'Imagen del artista',
    generatedFallback: 'Visual original creado en la app',
    documentedProfile: 'Información del artista disponible',
    archiveOnly: 'Datos de tu historial',
    archiveBiography: 'Sobre este artista',
    archiveFootprint: 'Lo que más escuchas',
    archiveFootprintBody: 'Tus canciones y álbumes más escuchados de este artista. No es un ranking de popularidad mundial.',
    discography: 'Álbumes y lanzamientos',
    discographyBody: 'Lanzamientos conocidos del catálogo local, con portada cuando existe una coincidencia revisada.',
    profileSignals: 'Datos rápidos',
    genres: 'Estilos y sonidos',
    mediaTitle: 'Escuchar y ver',
    mediaSubtitle: 'Abre Spotify, YouTube o enlaces oficiales solo cuando quieras salir de la experiencia local.',
    evidenceTitle: 'Cómo sabemos esto',
    evidenceSubtitle: 'Consulta las fuentes y límites detrás de la ficha del artista.',
    openEvidence: 'Ver fuentes',
    musicBeeBoundary: 'MusicBee se muestra aparte para no contar dos veces la misma actividad musical.',
  },
  en: {
    subtitle: 'Discover who each artist is, what you play most, their imagery, members, albums and connections.',
    featuredArtists: 'Your most present artists',
    browseAll: 'Search your artists',
    archiveSignal: 'In your listening history',
    archiveShare: 'Share of your listening',
    portraitStage: 'Artist gallery',
    remoteArtwork: 'Artist image',
    generatedFallback: 'Original visual created in the app',
    documentedProfile: 'Artist information available',
    archiveOnly: 'Listening-history facts',
    archiveBiography: 'About this artist',
    archiveFootprint: 'What you listen to most',
    archiveFootprintBody: 'Your most-played tracks and albums by this artist. This is not a global popularity ranking.',
    discography: 'Albums and releases',
    discographyBody: 'Known releases from the local catalog, with artwork when a reviewed match exists.',
    profileSignals: 'Quick facts',
    genres: 'Styles and sounds',
    mediaTitle: 'Listen and watch',
    mediaSubtitle: 'Open Spotify, YouTube or official links only when you choose to leave the local experience.',
    evidenceTitle: 'How we know this',
    evidenceSubtitle: 'See the sources and limits behind this artist profile.',
    openEvidence: 'View sources',
    musicBeeBoundary: 'MusicBee stays separate so the same listening activity is not counted twice.',
  },
  he: {
    subtitle: 'מגלים מי כל אמן, למה אתם מאזינים הכי הרבה, תמונות, חברים, אלבומים וקשרים.',
    featuredArtists: 'האמנים הבולטים אצלך',
    browseAll: 'חיפוש בין האמנים שלך',
    archiveSignal: 'בהיסטוריית ההאזנה שלך',
    archiveShare: 'חלק מתוך ההאזנה שלך',
    portraitStage: 'גלריית האמן',
    remoteArtwork: 'תמונת האמן',
    generatedFallback: 'דימוי מקורי שנוצר באפליקציה',
    documentedProfile: 'מידע על האמן זמין',
    archiveOnly: 'נתונים מהיסטוריית ההאזנה',
    archiveBiography: 'על האמן',
    archiveFootprint: 'למה אתם מאזינים הכי הרבה',
    archiveFootprintBody: 'השירים והאלבומים המושמעים ביותר אצלך מאת האמן הזה. זה אינו דירוג פופולריות עולמי.',
    discography: 'אלבומים ויצירות',
    discographyBody: 'יצירות מוכרות מן הקטלוג המקומי, עם עטיפה כאשר קיימת התאמה שנבדקה.',
    profileSignals: 'עובדות מהירות',
    genres: 'סגנונות וצלילים',
    mediaTitle: 'האזנה וצפייה',
    mediaSubtitle: 'Spotify, YouTube וקישורים רשמיים נפתחים רק כאשר בוחרים לצאת מן החוויה המקומית.',
    evidenceTitle: 'איך אנחנו יודעים',
    evidenceSubtitle: 'אפשר לראות את המקורות והמגבלות שמאחורי פרופיל האמן.',
    openEvidence: 'הצגת מקורות',
    musicBeeBoundary: 'MusicBee נשאר נפרד כדי שאותה פעילות מוזיקלית לא תיספר פעמיים.',
  },
};

export function getArtistAtlasCopy(lang: Lang, experienceDepth: ExperienceDepth): ArtistAtlasCopy {
  const copy = ARTIST_ATLAS_COPY[lang];
  return experienceDepth === 'deep-dive'
    ? copy
    : { ...copy, ...SIMPLE_COPY[lang] };
}
