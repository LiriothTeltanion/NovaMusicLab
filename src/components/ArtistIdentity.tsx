import React from 'react';
import {
  AudioWaveform,
  Clapperboard,
  Disc,
  Image as ImageIcon,
  Layers3,
  Mic2,
  Music,
  Rocket,
  Sparkles,
  Users,
} from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';
import ArtistAvatar from './ArtistAvatar';
import ExpandableInsightCard from './ExpandableInsightCard';
import SectionNarrative from './SectionNarrative';
import SectionQuickRead from './SectionQuickRead';
import { localizeArtistProfile } from '../utils/localizedDatasetText';

interface ArtistIdentityProps {
  data: MusicDnaData;
}

const ARTIST_DOSSIER_COPY = {
  es: {
    quick: {
      thesisLabel: 'Tesis sonora',
      thesisTitle: 'Blackgaze luminoso + synthwave cyberpunk + post-hardcore melódico',
      thesisBody: 'La identidad no copia a tus artistas favoritos: combina sus funciones emocionales para imaginar un proyecto propio, intenso y visual.',
      personaLabel: 'Personaje',
      personaTitle: 'Lirioth como arquitecto emocional digital',
      personaBody: 'El alias funciona como una figura entre exilio, reconstrucción y diseño de mundos: vulnerable, futurista y dramática sin perder groove.',
      stageLabel: 'Escenario',
      stageTitle: 'Un show de luces, batería real y visuales reactivos',
      stageBody: 'La propuesta en vivo debería sentirse como concierto, instalación audiovisual y ritual de catarsis al mismo tiempo.',
    },
    evidenceTitle: 'Evidencia de ADN artístico',
    evidenceIntro: 'Estos nombres sostienen la identidad imaginada: no como copias, sino como ingredientes de energía, textura y narrativa.',
    influenceLabel: 'Influencia',
    playsLabel: 'plays en el archivo',
    sonicGenesTitle: 'Matriz de genes sonoros',
    sonicGenes: [
      { label: 'Blackgaze', value: '92%', body: 'Guitarras enormes, melancolía luminosa y sensación de ascenso emocional.' },
      { label: 'Synthwave', value: '88%', body: 'Neón, movimiento nocturno, pads retro y textura cinematográfica.' },
      { label: 'Post-Hardcore', value: '84%', body: 'Voz frontal, catarsis, tensión melódica y energía de reconstrucción.' },
      { label: 'Groove Pop/R&B', value: '71%', body: 'Ritmo corporal, hooks más limpios y espacio para hacer que lo pesado respire.' },
    ],
    dossierTitle: 'Dossier expandible del artista',
    dossierIntro: 'Cada tarjeta abre una capa distinta: sonido, imagen, historia, escenario, colaboraciones y próximos pasos.',
    cards: [
      {
        eyebrow: 'Capa 01',
        title: 'Arquitectura sonora',
        summary: 'La música debería tener contraste: belleza shoegaze arriba, percusión pesada abajo y sintetizadores como arquitectura de neón.',
        lines: [
          { label: 'Guitarras', value: 'Muros shoegaze brillantes, acordes abiertos y distorsión que suena más celestial que agresiva.' },
          { label: 'Batería', value: 'Pulso rápido de metalcore/blackgaze con fills energéticos, pero mezclado con claridad moderna.' },
          { label: 'Sintetizadores', value: 'Pads oscuros, arpegios cyberpunk y bajos nocturnos que conectan con The Midnight y Carpenter Brut.' },
          { label: 'Voz', value: 'Voz limpia post-hardcore con momentos íntimos tipo R&B para que la emoción tenga rostro humano.' },
        ],
      },
      {
        eyebrow: 'Capa 02',
        title: 'Identidad visual',
        summary: 'La estética debe sentirse como una interfaz emocional: vidrio, neón, runas tecnológicas y ciudades internas.',
        lines: [
          { label: 'Paleta', value: 'Cian, rosa neón, negro profundo y blanco frío para crear contraste entre ternura y peligro.' },
          { label: 'Vestuario', value: 'Ropa negra técnica, detalles reflectantes, accesorios cromados y símbolos que parezcan lenguaje de sistema.' },
          { label: 'Mundo', value: 'Carreteras nocturnas, ruinas digitales, montañas de vidrio y pantallas holográficas con lluvia de datos.' },
          { label: 'Portadas', value: 'Primer plano del alias como silueta o avatar, rodeado de UI rota, luces y arquitectura emocional.' },
        ],
      },
      {
        eyebrow: 'Capa 03',
        title: 'Narrativa del EP',
        summary: 'El EP puede leerse como una transición: aislamiento, choque, memoria, bucle y renacimiento.',
        lines: [
          { label: 'Acto I', value: 'Entrada sintética: la carretera y el olvido abren un viaje fuera de un lugar anterior.' },
          { label: 'Acto II', value: 'Choque de bandas: blackgaze, metalcore y synthwave pelean hasta convertirse en idioma propio.' },
          { label: 'Acto III', value: 'Reconstrucción: el alias deja de ser máscara y se vuelve proyecto, rito y futuro.' },
          { label: 'Tema central', value: 'No se trata solo de tristeza; se trata de convertir la intensidad en identidad creativa.' },
        ],
      },
      {
        eyebrow: 'Capa 04',
        title: 'Show en vivo',
        summary: 'La puesta en escena debe explicar el proyecto antes de que empiece la primera canción.',
        lines: [
          { label: 'Pantalla', value: 'Visuales 3D reactivos con montañas geométricas, lluvia digital, autopistas y símbolos del alias.' },
          { label: 'Luces', value: 'Gradientes cian/rosa sincronizados a golpes de batería y explosiones blancas en los clímax.' },
          { label: 'Banda', value: 'Batería real al frente, guitarras amplias a los lados y sintetizadores como centro atmosférico.' },
          { label: 'Público', value: 'Momentos de grito y movimiento, pero también secciones contemplativas para respirar dentro del mundo.' },
        ],
      },
      {
        eyebrow: 'Capa 05',
        title: 'ADN de colaboraciones',
        summary: 'Las colaboraciones deberían sumar funciones, no solo nombres: luz, groove, tensión y coro.',
        lines: [
          { label: 'Deafheaven', value: 'Aporta escala emocional, guitarras infinitas y el sentido de belleza herida.' },
          { label: 'Bilmuri', value: 'Aporta groove, humor sonoro, hooks raros y una forma más humana de reconstruirse.' },
          { label: 'The Midnight', value: 'Aporta noche, carretera, nostalgia y sintetizadores que hacen que la memoria parezca cine.' },
          { label: 'BMTH', value: 'Aporta pegada moderna, producción grande y puente entre metal, pop y catarsis digital.' },
        ],
      },
      {
        eyebrow: 'Capa 06',
        title: 'Próximos pasos artísticos',
        summary: 'La identidad ya tiene base; lo siguiente es convertirla en material publicable y visualmente coherente.',
        lines: [
          { label: 'Single 1', value: 'Elegir una canción ancla: la más directa, con hook fuerte y visualizer de autopista nocturna.' },
          { label: 'Single 2', value: 'Publicar una pieza más atmosférica para mostrar profundidad, no solo energía.' },
          { label: 'Arte', value: 'Definir portada, fotos, avatar y visualizers en una misma biblia visual para que todo parezca del mismo universo.' },
          { label: 'Performance', value: 'Diseñar un set corto de 18-22 minutos que pueda funcionar como demo en vivo del concepto completo.' },
        ],
      },
    ],
    trackLoreTitle: 'Lectura track por track',
    trackNotes: [
      'Portal de entrada: sintetizadores, carretera y sensación de dejar atrás una versión anterior de ti.',
      'El choque central: blackgaze y groove emocional se encuentran con una voz más abierta y directa.',
      'La canción pesada del EP: ciudad, migración emocional y guitarras como arquitectura en ruinas.',
      'La pista nocturna: synthwave retro, memoria venezolana y pulso de carretera a medianoche.',
      'El loop psicológico: post-hardcore vulnerable para hablar de repetición, ansiedad y reconstrucción.',
      'Cierre instrumental: el alias deja de ser fantasía y aparece como nueva identidad artística.',
    ],
  },
  en: {
    quick: {
      thesisLabel: 'Sonic thesis',
      thesisTitle: 'Luminous blackgaze + cyberpunk synthwave + melodic post-hardcore',
      thesisBody: 'The identity does not copy your favorite artists: it combines their emotional functions into a personal, intense and visual project.',
      personaLabel: 'Persona',
      personaTitle: 'Lirioth as a digital emotional architect',
      personaBody: 'The alias works as a figure between exile, reconstruction and world-building: vulnerable, futuristic and dramatic without losing groove.',
      stageLabel: 'Stage',
      stageTitle: 'A light-driven show with live drums and reactive visuals',
      stageBody: 'The live concept should feel like concert, audiovisual installation and cathartic ritual at the same time.',
    },
    evidenceTitle: 'Artist DNA Evidence',
    evidenceIntro: 'These names support the imagined identity: not as copies, but as ingredients of energy, texture and narrative.',
    influenceLabel: 'Influence',
    playsLabel: 'archive plays',
    sonicGenesTitle: 'Sonic Gene Matrix',
    sonicGenes: [
      { label: 'Blackgaze', value: '92%', body: 'Huge guitars, luminous melancholy and the feeling of emotional ascent.' },
      { label: 'Synthwave', value: '88%', body: 'Neon, nocturnal motion, retro pads and cinematic texture.' },
      { label: 'Post-Hardcore', value: '84%', body: 'Forward vocals, catharsis, melodic tension and reconstruction energy.' },
      { label: 'Groove Pop/R&B', value: '71%', body: 'Body rhythm, cleaner hooks and space for the heavy parts to breathe.' },
    ],
    dossierTitle: 'Expandable Artist Dossier',
    dossierIntro: 'Each card opens a different layer: sound, image, story, stage, collaborations and next steps.',
    cards: [
      {
        eyebrow: 'Layer 01',
        title: 'Sound Architecture',
        summary: 'The music should live in contrast: shoegaze beauty above, heavy percussion below and synthesizers as neon architecture.',
        lines: [
          { label: 'Guitars', value: 'Bright shoegaze walls, open chords and distortion that feels more celestial than aggressive.' },
          { label: 'Drums', value: 'Fast metalcore/blackgaze pulse with energetic fills, mixed with modern clarity.' },
          { label: 'Synths', value: 'Dark pads, cyberpunk arpeggios and nocturnal basses connected to The Midnight and Carpenter Brut.' },
          { label: 'Voice', value: 'Clean post-hardcore vocals with intimate R&B moments so the emotion has a human face.' },
        ],
      },
      {
        eyebrow: 'Layer 02',
        title: 'Visual Identity',
        summary: 'The aesthetic should feel like an emotional interface: glass, neon, technological runes and inner cities.',
        lines: [
          { label: 'Palette', value: 'Cyan, neon pink, deep black and cold white to create contrast between tenderness and danger.' },
          { label: 'Wardrobe', value: 'Technical black clothing, reflective details, chrome accessories and symbols that feel like system language.' },
          { label: 'World', value: 'Nocturnal highways, digital ruins, glass mountains and holographic screens under data rain.' },
          { label: 'Covers', value: 'The alias as silhouette or avatar, surrounded by broken UI, lights and emotional architecture.' },
        ],
      },
      {
        eyebrow: 'Layer 03',
        title: 'EP Narrative',
        summary: 'The EP can be read as a transition: isolation, collision, memory, loop and rebirth.',
        lines: [
          { label: 'Act I', value: 'Synthetic entrance: the highway and forgetting open a journey out of a previous place.' },
          { label: 'Act II', value: 'Band collision: blackgaze, metalcore and synthwave fight until they become a personal language.' },
          { label: 'Act III', value: 'Reconstruction: the alias stops being a mask and becomes project, ritual and future.' },
          { label: 'Core theme', value: 'This is not only sadness; it is the conversion of intensity into creative identity.' },
        ],
      },
      {
        eyebrow: 'Layer 04',
        title: 'Live Show',
        summary: 'The stage design should explain the project before the first song even starts.',
        lines: [
          { label: 'Screen', value: 'Reactive 3D visuals with geometric mountains, digital rain, highways and alias symbols.' },
          { label: 'Lights', value: 'Cyan/pink gradients synchronized to drum hits and white explosions at the climaxes.' },
          { label: 'Band', value: 'Live drums upfront, wide guitars on the sides and synthesizers as the atmospheric center.' },
          { label: 'Audience', value: 'Moments for shouting and movement, plus contemplative sections to breathe inside the world.' },
        ],
      },
      {
        eyebrow: 'Layer 05',
        title: 'Collaboration DNA',
        summary: 'Collaborations should add functions, not just names: light, groove, tension and chorus.',
        lines: [
          { label: 'Deafheaven', value: 'Adds emotional scale, infinite guitars and the feeling of wounded beauty.' },
          { label: 'Bilmuri', value: 'Adds groove, sonic humor, strange hooks and a more human way to rebuild.' },
          { label: 'The Midnight', value: 'Adds night, highway, nostalgia and synthesizers that make memory feel cinematic.' },
          { label: 'BMTH', value: 'Adds modern impact, big production and a bridge between metal, pop and digital catharsis.' },
        ],
      },
      {
        eyebrow: 'Layer 06',
        title: 'Artistic Next Steps',
        summary: 'The identity has a base; the next step is turning it into publishable and visually coherent material.',
        lines: [
          { label: 'Single 1', value: 'Choose an anchor song: the most direct one, with a strong hook and nocturnal highway visualizer.' },
          { label: 'Single 2', value: 'Release a more atmospheric piece to show depth, not only energy.' },
          { label: 'Art', value: 'Define cover, photos, avatar and visualizers inside one visual bible so everything belongs to the same universe.' },
          { label: 'Performance', value: 'Design a short 18-22 minute set that works as a live demo of the full concept.' },
        ],
      },
    ],
    trackLoreTitle: 'Track-By-Track Reading',
    trackNotes: [
      'Opening portal: synthesizers, highway imagery and the feeling of leaving an older self behind.',
      'The central collision: blackgaze and emotional groove meet a more open, direct vocal identity.',
      'The heavy song of the EP: city, emotional migration and guitars as ruined architecture.',
      'The nocturnal track: retro synthwave, Venezuelan memory and a midnight-highway pulse.',
      'The psychological loop: vulnerable post-hardcore about repetition, anxiety and reconstruction.',
      'Instrumental ending: the alias stops being fantasy and appears as a new artistic identity.',
    ],
  },
};

export default function ArtistIdentity({ data }: ArtistIdentityProps) {
  const { tc, t, lang } = useApp();
  const profile = localizeArtistProfile(data.artist_profile, lang);
  const ep = profile.ep_concept;
  const copy = ARTIST_DOSSIER_COPY[lang];
  const colors = [tc.c1, tc.c2, tc.c3, tc.c4, '#10b981', '#fb923c'];
  const topInfluences = profile.influences.map(name => ({
    name,
    plays: data.top_artists.find(artist => artist.name === name)?.plays,
  }));
  const formatNum = (value: number) => value.toLocaleString(lang === 'en' ? 'en-US' : 'es-ES');

  const quickReadItems = [
    {
      icon: <AudioWaveform className="w-4 h-4" />,
      label: copy.quick.thesisLabel,
      title: copy.quick.thesisTitle,
      body: copy.quick.thesisBody,
      color: tc.c1,
    },
    {
      icon: <Mic2 className="w-4 h-4" />,
      label: copy.quick.personaLabel,
      title: copy.quick.personaTitle,
      body: copy.quick.personaBody,
      color: tc.c2,
    },
    {
      icon: <Clapperboard className="w-4 h-4" />,
      label: copy.quick.stageLabel,
      title: copy.quick.stageTitle,
      body: copy.quick.stageBody,
      color: tc.c3,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center space-x-3 mb-6">
        <Sparkles className="w-6 h-6 animate-pulse" style={{ color: tc.c1 }} />
        <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">
          {t.artistIdentity.title}</h2>
      </div>

      <SectionNarrative content={t.deepNarratives.artist} accent="c1" />

      <SectionQuickRead items={quickReadItems} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Branding and Sound Profile */}
        <div className="glass-panel p-8 rounded-3xl lg:col-span-7 space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold text-cyberCyan uppercase tracking-widest block">
              {t.artistIdentity.suggestedAlias}</span>
            <h3 className="text-3xl font-black text-white text-neon-glow">{profile.alias}</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-cyberPink uppercase tracking-wider block">
                {t.artistIdentity.possibleSound}</span>
              <p className="text-sm text-gray-300 font-sans leading-relaxed">{profile.sound}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-[#0a0f1d] border border-cyan-500/10 rounded-xl">
                <span className="text-[10px] font-mono text-gray-400 uppercase">{t.artistIdentity.idealTempo}</span>
                <p className="text-sm font-bold text-white mt-1">{profile.tempo}</p>
              </div>
              <div className="p-3 bg-[#0a0f1d] border border-cyan-500/10 rounded-xl">
                <span className="text-[10px] font-mono text-gray-400 uppercase">{t.artistIdentity.keyInfluences}</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex items-center -space-x-1.5 shrink-0">
                    {profile.influences.slice(0, 3).map(name => (
                      <ArtistAvatar key={name} name={name} size={22} className="ring-1 ring-black" />
                    ))}
                  </div>
                  <p className="text-xs font-bold text-cyberCyan truncate">{profile.influences.slice(0, 3).join(', ')}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-xs font-mono font-bold text-cyberPurple uppercase tracking-wider block">
                {t.artistIdentity.visualAesthetic}
              </span>
              <p className="text-xs text-gray-400 font-sans leading-relaxed">
                <strong className="text-white">{t.artistIdentity.outfitAndLights}</strong>{' '}
                {t.artistIdentity.outfitAndLightsDesc}
              </p>
              <p className="text-xs text-gray-400 font-sans leading-relaxed">
                <strong className="text-white">{t.artistIdentity.concertConcept}</strong>{' '}
                {t.artistIdentity.concertConceptDesc(profile.live_show)}
              </p>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: tc.c1 }} />
                <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                  {copy.evidenceTitle}
                </span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{copy.evidenceIntro}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {topInfluences.map(({ name, plays }) => (
                  <div key={name} className="rounded-2xl border border-white/5 bg-white/3 p-3 flex items-center gap-3 hover:bg-white/5 transition-colors">
                    <ArtistAvatar name={name} size={34} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{name}</p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        {copy.influenceLabel}
                        {plays ? ` · ${formatNum(plays)} ${copy.playsLabel}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: First EP Concept & Album Art Mockup */}
        <div className="glass-panel p-6 rounded-3xl lg:col-span-5 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center space-x-2 mb-4" style={{ color: tc.c2 }}>
              <Disc className="w-5 h-5" />
              <h4 className="font-mono text-sm font-bold uppercase tracking-wider">
                {t.artistIdentity.firstEpConcept}
              </h4>
            </div>
            <h4 className="text-xl font-bold text-white font-mono tracking-wide mb-1">"{ep.title}"</h4>
            <p className="text-xs text-gray-400 mb-4">{ep.description}</p>
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">
                {copy.trackLoreTitle}
              </span>
              <div className="space-y-1.5">
                {ep.tracklist.map((track, i) => (
                  <div key={track} className="p-3 rounded-xl text-xs font-mono border border-white/5 bg-white/3 hover:bg-white/5 transition-all group">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="text-[10px] font-mono font-bold shrink-0" style={{ color: tc.c1 }}>{String(i + 1).padStart(2, '0')}</span>
                      <Music className="w-3 h-3 shrink-0" style={{ color: tc.c2 }} />
                      <span className="truncate text-gray-300 group-hover:text-white transition-colors">{track}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-relaxed mt-1.5 pl-8 font-sans">
                      {copy.trackNotes[i]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Album art mockup */}
          <div className="mt-6 p-6 rounded-2xl flex flex-col items-center justify-center text-center py-10 relative overflow-hidden group cursor-default"
            style={{ background: `linear-gradient(135deg, #0a192f, ${tc.c3}30)`, border: `1px solid ${tc.c1}30` }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `${tc.c1}08` }} />
            <div className="relative z-10 space-y-2">
              <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${tc.c1}20, ${tc.c3}20)`, border: `1px solid ${tc.c1}30` }}>
                <ImageIcon className="w-8 h-8 animate-pulse" style={{ color: tc.c1 }} />
              </div>
              <p className="text-xs font-mono font-bold text-white tracking-widest uppercase">{ep.title}</p>
              <p className="text-[9px] font-mono font-semibold mt-1" style={{ color: tc.c2 }}>LIRIOTH TELTANION</p>
              <p className="text-[9px] text-gray-600 font-mono">{t.artistIdentity.albumArtConcept}</p>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers3 className="w-5 h-5" style={{ color: tc.c2 }} />
          <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
            {copy.sonicGenesTitle}
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {copy.sonicGenes.map((gene, index) => {
            const color = colors[index % colors.length];
            return (
              <article key={gene.label} className="glass-panel p-5 rounded-2xl border relative overflow-hidden group"
                style={{ borderColor: `${color}25` }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: `radial-gradient(circle at top right, ${color}12, transparent 68%)` }} />
                <div className="relative z-10 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-white">{gene.label}</p>
                    <p className="text-lg font-black font-mono" style={{ color }}>{gene.value}</p>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: gene.value, backgroundColor: color }} />
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{gene.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5" style={{ color: tc.c1 }} />
              <h3 className="text-sm font-mono font-black uppercase tracking-widest text-white">
                {copy.dossierTitle}
              </h3>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">{copy.dossierIntro}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {copy.cards.map((card, index) => (
            <ExpandableInsightCard
              key={card.title}
              eyebrow={card.eyebrow}
              title={card.title}
              summary={card.summary}
              lines={card.lines}
              color={colors[index % colors.length]}
              defaultOpen={index === 0}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
