import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles, Key, Lock, Eye, EyeOff, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { MusicDnaData } from '../types';
import { useApp } from '../context/AppContext';

interface AIAssistantProps {
  data: MusicDnaData;
}

interface Message {
  id: string;
  sender: 'user' | 'lirioth';
  text: string;
  timestamp: Date;
}

const STORAGE_KEY = 'nml_gemini_api_key';

export default function AIAssistant({ data }: AIAssistantProps) {
  const { lang } = useApp();
  const L = lang === 'en';

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'welcome',
      sender: 'lirioth',
      text: L
        ? `Hello Kevin! I am **Lirioth**, your AI Music Assistant. 🌌\n\nI can analyze your compiled history (*${data.project}*) and provide deep musical insights. Ask me anything, or configure your personal Gemini API Key below to unlock advanced reasoning!`
        : `¡Hola Kevin! Soy **Lirioth**, tu asistente musical de IA. 🌌\n\nPuedo analizar tu historial compilado (*${data.project}*) y darte análisis profundos. ¡Pregúntame lo que quieras, o configura tu API Key personal de Gemini abajo para desbloquear razonamiento avanzado!`,
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const saveKey = (key: string) => {
    const cleanKey = key.trim();
    setApiKey(cleanKey);
    try {
      if (cleanKey) {
        localStorage.setItem(STORAGE_KEY, cleanKey);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore localstorage security errors */
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'lirioth',
        text: L
          ? "Conversation cleared. Ready for your next query!"
          : "Conversación reiniciada. ¡Listo para tu siguiente pregunta!",
        timestamp: new Date(),
      },
    ]);
  };

  // Quick Prompt Chips
  const promptChips = L
    ? [
        { label: "🎵 Suggest a morning playlist", text: "Suggest a 5-track morning playlist based on my listening data. Give it a creative name and explain why you chose these tracks." },
        { label: "📊 Describe my top genres", text: "Analyze my top genres in detail. What do they tell about my musical identity?" },
        { label: "🔥 Analyze my obsessions", text: "Review my top tracks and obsessions. What patterns do you see?" },
        { label: "⚡ Dominant daypart profile", text: "Explain what my dominant daypart means in terms of my lifestyle and music discovery." }
      ]
    : [
        { label: "🎵 Sugiere una playlist matutina", text: "Sugiere una lista de reproducción de 5 canciones para la mañana basada en mis datos. Dale un nombre creativo y explica por qué las elegiste." },
        { label: "📊 Describe mis géneros principales", text: "Analiza mis géneros principales en detalle. ¿Qué dicen sobre mi identidad musical?" },
        { label: "🔥 Analiza mis obsesiones", text: "Revisa mis canciones principales y obsesiones de escucha. ¿Qué patrones encuentras?" },
        { label: "⚡ Perfil de franja horaria dominante", text: "Explica qué significa mi franja horaria dominante en relación a mi estilo de vida." }
      ];

  // Local Sandbox response engine (Fallback if no Gemini API Key is entered)
  const getSandboxResponse = (query: string): string => {
    const q = query.toLowerCase();
    const isEn = lang === 'en';

    const topArtsStr = data.top_artists.slice(0, 5).map(a => `**${a.name}** (${a.plays} plays)`).join(', ');
    const topTracksStr = data.top_tracks.slice(0, 5).map(t => `*"${t.title}"* by **${t.artist}** (${t.plays} plays)`).join('\n- ');
    const topGenresStr = data.top_genres.slice(0, 5).map(g => `**${g.name}** (${g.plays} plays)`).join(', ');

    if (q.includes('playlist') || q.includes('reproducción') || q.includes('sugiere') || q.includes('suggest')) {
      return isEn
        ? `### 🎵 Simulated Custom Playlist: *Neon Catharsis*\n\nHere is a curated 5-track selection compiled from your music DNA:\n\n1. **In Blur** — Deafheaven (Your absolute anthem! perfect for emotional morning clarity)\n2. **Shadow** — Bring Me the Horizon (Energy booster for midday focus)\n3. **Looping** — Bilmuri (Post-hardcore groove to keep you moving)\n4. **Vampires** — The Midnight (Synthwave retro atmosphere for late afternoon transition)\n5. **Aperol Spritz** — The Kid LAROI (Modern high-energy pop to close the day)\n\n*Note: To query Gemini live and build endless contextual lists, enter your API Key in the settings below!*`
        : `### 🎵 Playlist Simulada: *Catarsis de Neón*\n\nAquí tienes una selección de 5 temas recopilados a partir de tu ADN musical:\n\n1. **In Blur** — Deafheaven (¡Tu himno! Perfecto para una mañana de claridad emocional)\n2. **Shadow** — Bring Me the Horizon (Inyección de energía para el enfoque del mediodía)\n3. **Looping** — Bilmuri (Groove post-hardcore para mantenerte en movimiento)\n4. **Vampires** — The Midnight (Atmósfera retro de synthwave para la transición de la tarde)\n5. **Aperol Spritz** — The Kid LAROI (Pop moderno de alta energía para cerrar el día)\n\n*Nota: ¡Para consultar a Gemini en vivo y construir listas contextuales ilimitadas, ingresa tu API Key en la configuración de abajo!*`;
    }

    if (q.includes('genre') || q.includes('género') || q.includes('style') || q.includes('estilo')) {
      return isEn
        ? `### 📊 Lirioth's Genre Breakdown\n\nYour primary musical universe is shaped by:\n- Top Genres: ${topGenresStr}\n- Dominant Focus: **Metalcore & Post-Hardcore** accounts for over 45% of your listening. This shows a high affinity for energetic guitar riffs, contrasting clean/screaming vocals, and emotional melodies.\n- Secondary Sphere: **Synthwave / Darksynth**, suggesting a deep connection to visual cyberpunk themes and nocturnal retro-escapism.`
        : `### 📊 Desglose de Géneros de Lirioth\n\nTu universo musical principal está moldeado por:\n- Géneros principales: ${topGenresStr}\n- Enfoque dominante: **Metalcore y Post-Hardcore** representan más del 45% de tus escuchas. Esto muestra una gran afinidad por riffs de guitarra enérgicos, contraste de voces limpias/guturales y melodías emotivas.\n- Esfera secundaria: **Synthwave / Darksynth**, sugiriendo una conexión profunda con estéticas visuales cyberpunk y escapismo retro nocturno.`;
    }

    if (q.includes('obsession') || q.includes('obsesión') || q.includes('track') || q.includes('canción')) {
      return isEn
        ? `### 🔥 Listening Obsessions Summary\n\nAccording to your records:\n- Top Tracks:\n- ${topTracksStr}\n\nYou show a high repeat listener index on track *In Blur* by Deafheaven. Your records show sessions containing consecutive replays of this song in the morning hours, representing a peak emotional refuge.`
        : `### 🔥 Resumen de Obsesiones de Escucha\n\nDe acuerdo a tus registros:\n- Canciones principales:\n- ${topTracksStr}\n\nMuestras un índice extremadamente alto de reproducción repetida en *In Blur* de Deafheaven. Tus registros indican sesiones con bucles continuos de este tema durante las mañanas, representando tu refugio emocional principal.`;
    }

    if (q.includes('daypart') || q.includes('horaria') || q.includes('mañana') || q.includes('morning')) {
      const era = data.yearly_eras[0];
      return isEn
        ? `### ⚡ Dominant Daypart Analysis\n\nYour records indicate that your dominant daypart is **${era?.dominant_daypart || 'Morning'}**.\n\nThis listening pattern is highly indicative of utilizing music as a productivity catalyst (listening to progressive metal or pop punk during coding/work hours) or morning therapy (listening to blackgaze while commuting/waking up).`
        : `### ⚡ Análisis de Franja Horaria Dominante\n\nTus registros indican que tu franja horaria dominante es **${era?.dominant_daypart || 'Mañana'}**.\n\nEste patrón indica el uso de música como catalizador de productividad (escuchar metal progresivo o pop punk en horas de trabajo/programación) o como terapia matutina (escuchar blackgaze al despertar).`;
    }

    // Default Sandbox Response
    return isEn
      ? `### 🌌 Lirioth Sandbox Mode\n\nI processed your query: *"${query}"*\n\nHere are some of your metrics:\n- **Total scrobbles**: ${data.core_metrics.total_plays.toLocaleString()} plays\n- **Unique artists**: ${data.core_metrics.unique_artists.toLocaleString()} unique creators\n- **Top Artists**: ${topArtsStr}\n\n*🔧 **How to enable Live AI Reasoning?***\n1. Get a free API Key from [Google AI Studio](https://aistudio.google.com/).\n2. Open the **API Settings** panel below.\n3. Paste your key and click **Save**.\n4. Ask me anything! I will analyze your data in real-time using **Gemini 2.5 Flash**.`
      : `### 🌌 Modo Sandbox de Lirioth\n\nProcesé tu consulta: *"${query}"*\n\nAquí tienes algunas de tus métricas clave:\n- **Total de reproducciones**: ${data.core_metrics.total_plays.toLocaleString()} escuchas\n- **Artistas únicos**: ${data.core_metrics.unique_artists.toLocaleString()} creadores\n- **Artistas principales**: ${topArtsStr}\n\n*🔧 **¿Cómo activar el razonamiento en vivo con IA?***\n1. Consigue una API Key gratuita en [Google AI Studio](https://aistudio.google.com/).\n2. Abre el panel de **Configuración de API** abajo.\n3. Pega tu clave y dale a **Guardar**.\n4. ¡Pregúntame lo que quieras! Analizaré tus datos en tiempo real usando **Gemini 2.5 Flash**.`;
  };

  // Chat Submission handler
  const handleSend = async (textToSend: string) => {
    const prompt = textToSend.trim();
    if (!prompt || loading) return;

    setInput('');
    const userMsgId = Math.random().toString(36).substring(7);
    const userMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: prompt,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      if (!apiKey) {
        // Run in local sandbox mode
        await new Promise(resolve => setTimeout(resolve, 800)); // simulate network delay
        const reply = getSandboxResponse(prompt);
        setMessages(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          sender: 'lirioth',
          text: reply,
          timestamp: new Date(),
        }]);
      } else {
        // Build prompt context with Kevin's compiled music summary
        const promptContext = `
You are Lirioth, Kevin's personal AI Music Assistant. Address the user as Kevin.
Here is a summary of Kevin's music listening history:
- Project: ${data.project}
- Total plays: ${data.core_metrics.total_plays}
- Unique artists: ${data.core_metrics.unique_artists}
- Unique tracks: ${data.core_metrics.unique_tracks}
- Unique albums: ${data.core_metrics.unique_albums}
- Total hours: ${data.core_metrics.listening_hours}
- Active days: ${data.core_metrics.active_days}
- Top Artists: ${data.top_artists.slice(0, 10).map(a => `${a.name} (${a.plays} plays, ${a.genre})`).join(', ')}
- Top Tracks: ${data.top_tracks.slice(0, 10).map(t => `${t.artist} - ${t.title} (${t.plays} plays)`).join(', ')}
- Top Genres: ${data.top_genres.slice(0, 8).map(g => `${g.name} (${g.plays} plays)`).join(', ')}
- Listening Countries: ${data.countries.slice(0, 5).map(c => `${c.country} (${c.plays} plays)`).join(', ')}
- Top Eras: ${data.yearly_eras.map(e => `Year ${e.year}: Top Artist ${e.top_artist}, Top Track ${e.top_track}, Label: ${e.era_label}`).join('\n')}

Kevin's visual style preference: Cyberpunk, neon accents, dark theme, futuristic, glassmorphism, sci-fi.
Keep your responses structured, beautiful, detailed, using markdown, emojis, bullet points, code blocks, and high information density. Maintain a friendly, supportive, and encouraging tone. Answer in the same language as Kevin's query.

Kevin asks: "${prompt}"
`;

        const response = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Header, never a ?key= query param: URLs (with query strings)
              // leak into DevTools, console errors on failed CORS requests,
              // and screen-shared bug reports - and this is the user's own
              // billable personal key.
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: promptContext,
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (!response.ok) {
          throw new Error(L ? 'API request failed. Verify your key.' : 'Error en la solicitud. Verifica tu API Key.');
        }

        const resData = await response.json();
        const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
          throw new Error(L ? 'Empty response received.' : 'Respuesta vacía recibida.');
        }

        setMessages(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          sender: 'lirioth',
          text,
          timestamp: new Date(),
        }]);
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substring(7),
        sender: 'lirioth',
        text: L
          ? `❌ **Error**: ${err.message || 'Failed to connect. Please check your network and API Key.'}`
          : `❌ **Error**: ${err.message || 'Fallo de conexión. Por favor verifica tu red y tu API Key.'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in flex flex-col min-h-[calc(100vh-140px)]">
      {/* Title */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <Bot className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white">
            {L ? 'Lirioth AI Lab' : 'Laboratorio IA Lirioth'}
          </h2>
        </div>
        <button
          onClick={clearChat}
          className="text-xs font-mono text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{L ? 'Clear Chat' : 'Limpiar Chat'}</span>
        </button>
      </div>

      {/* Main chat layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-stretch flex-1 font-sans">
        {/* Chat area */}
        <div className="glass-panel rounded-3xl border border-white/10 p-4 md:p-6 flex flex-col min-h-[460px] max-h-[620px] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />
          
          {/* Scrollable logs */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-white/10">
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed border relative ${
                      msg.sender === 'user'
                        ? 'bg-purple-600/10 border-purple-500/30 text-white'
                        : 'bg-white/5 border-white/10 text-gray-200'
                    }`}
                  >
                    {/* Render message markup */}
                    <div className="prose prose-invert prose-xs max-w-none">
                      {msg.text.split('\n\n').map((paragraph, pi) => {
                        const formatText = (txt: string) => {
                          const boldRegex = /\*\*(.*?)\*\*/g;
                          let parts: React.ReactNode[] = [];
                          let lastIdx = 0;
                          
                          txt.replace(boldRegex, (match, p1, index) => {
                            if (index > lastIdx) {
                              parts.push(txt.substring(lastIdx, index));
                            }
                            parts.push(<strong key={index} className="text-white font-extrabold">{p1}</strong>);
                            lastIdx = index + match.length;
                            return match;
                          });
                          
                          if (lastIdx < txt.length) {
                            parts.push(txt.substring(lastIdx));
                          }
                          return parts.length ? parts : txt;
                        };

                        if (paragraph.startsWith('### ')) {
                          return <h4 key={pi} className="text-sm font-bold text-white mt-3 mb-1 font-mono uppercase tracking-wide">{paragraph.replace('### ', '')}</h4>;
                        }
                        if (paragraph.startsWith('- ')) {
                          return (
                            <ul key={pi} className="list-disc pl-4 space-y-1 my-1">
                              {paragraph.split('\n').map((li, lii) => (
                                <li key={lii} className="text-xs text-gray-300">{formatText(li.replace('- ', ''))}</li>
                              ))}
                            </ul>
                          );
                        }
                        return <p key={pi} className="text-xs text-gray-300 my-1 whitespace-pre-wrap">{formatText(paragraph)}</p>;
                      })}
                    </div>
                    <span className="block text-[9px] font-mono text-gray-500 text-right mt-1">
                      {msg.timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  <span className="text-xs text-gray-400 font-mono">
                    {L ? 'Lirioth is thinking...' : 'Lirioth está analizando...'}
                  </span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Prompt chips */}
          {messages.length === 1 && !loading && (
            <div className="mt-4 pt-3 border-t border-white/5 shrink-0">
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-2">
                {L ? 'Quick analysis templates:' : 'Análisis sugeridos:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {promptChips.map(chip => (
                  <button
                    key={chip.label}
                    onClick={() => handleSend(chip.text)}
                    className="text-xs bg-white/5 hover:bg-purple-950/20 border border-white/10 hover:border-purple-500/40 text-gray-300 px-3 py-1.5 rounded-full transition-all text-left flex items-center gap-1 hover:scale-[1.01]"
                  >
                    <span>{chip.label}</span>
                    <ArrowRight className="w-3 h-3 text-purple-400 opacity-55" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input field */}
          <div className="mt-4 pt-3 border-t border-white/10 shrink-0 flex items-center space-x-2 relative z-20">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend(input)}
              placeholder={L ? "Ask about your music history..." : "Pregúntale a tu historial musical..."}
              className="flex-1 bg-black/40 border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-500 transition-colors"
            />
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim() || loading}
              aria-label={L ? 'Send message' : 'Enviar mensaje'}
              className="h-10 w-10 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:bg-white/5 disabled:text-gray-600 text-white flex items-center justify-center transition-all shadow-lg hover:shadow-purple-500/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Side Panel: Settings & Summary */}
        <div className="flex flex-col space-y-4">
          {/* Key configuration panel */}
          <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4 relative overflow-hidden flex-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[50px] rounded-full pointer-events-none" />
            
            <div className="flex items-center space-x-2.5">
              <Key className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                {L ? 'API Key Settings' : 'Configurar API Key'}
              </h3>
            </div>
            
            <p className="text-xs text-gray-400 leading-relaxed">
              {L
                ? "Your key stays in browser local storage. When you send a message, Gemini receives your question plus a compact listening summary (totals, top artists, tracks, genres, countries, and eras), never the raw export files."
                : "Tu clave se guarda localmente en el navegador. Al enviar un mensaje, Gemini recibe tu pregunta y un resumen de escucha (totales, artistas, canciones, géneros, países y eras), nunca los archivos de exportación en bruto."}
            </p>

            <div className="space-y-3 pt-2">
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => saveKey(e.target.value)}
                  placeholder="Gemini API Key..."
                  className="w-full bg-black/50 border border-white/10 focus:border-purple-500/50 rounded-xl pl-3 pr-10 py-2.5 text-xs text-white placeholder-gray-500 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={showKey ? (L ? 'Hide API key' : 'Ocultar API key') : (L ? 'Show API key' : 'Mostrar API key')}
                  className="absolute right-2.5 top-2.5 text-gray-500 hover:text-white transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {apiKey ? (
                <div className="flex items-center space-x-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-xl">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  {/* Honest copy in BOTH languages: plain localStorage is local,
                      not "secure" - never overclaim how a billable key is kept. */}
                  <span>{L ? 'Key saved in browser local storage.' : 'Clave guardada localmente en tu navegador.'}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 text-[10px] font-mono text-amber-400 bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-xl">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>{L ? 'Using Simulated Sandbox Mode.' : 'Usando Sandbox Simulado.'}</span>
                </div>
              )}
            </div>

            {/* AI Studio Info */}
            <div className="pt-2 border-t border-white/5">
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-purple-400 hover:text-purple-300 transition-colors flex items-center justify-between"
              >
                <span>{L ? 'Get Free Gemini Key' : 'Obtener Key de Gemini Gratis'}</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Quick Stats Summary Card */}
          <div className="glass-panel p-5 rounded-3xl border border-white/10 shrink-0 space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-[40px] rounded-full pointer-events-none" />
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-300">
                {L ? 'Contextual music DNA' : 'ADN de contexto'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-white/3 border border-white/5 rounded-xl p-2">
                <span className="text-[10px] text-gray-500">{L ? 'Scrobbles' : 'Reproducciones'}</span>
                <p className="font-extrabold text-white mt-0.5">{data.core_metrics.total_plays.toLocaleString()}</p>
              </div>
              <div className="bg-white/3 border border-white/5 rounded-xl p-2">
                <span className="text-[10px] text-gray-500">{L ? 'Unique Bands' : 'Bandas únicas'}</span>
                <p className="font-extrabold text-white mt-0.5">{data.core_metrics.unique_artists.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
