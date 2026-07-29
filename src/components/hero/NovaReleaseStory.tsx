import { ChevronDown, History, Sparkles } from 'lucide-react';

import {
  CURRENT_NOVA_RELEASE,
  NOVA_RELEASE_HISTORY,
  type NovaReleaseStatus,
} from '../../releases/releaseHistory';
import { directionFor, localeFor, pickLanguage, type Lang } from '../../utils/i18n';
import './NovaReleaseStory.css';

interface NovaReleaseStoryProps {
  lang: Lang;
}

export const NOVA_RELEASE_STORY_ID = 'nova-release-story';

export default function NovaReleaseStory({ lang }: NovaReleaseStoryProps) {
  const copy = pickLanguage(lang, {
    en: {
      eyebrow: 'A museum that keeps learning',
      title: 'The story of Nova',
      body: 'Each edition adds something a listener can feel or use. Technical details stay in the repository; this is the human story.',
      current: 'Current version',
      previous: 'Explore earlier chapters',
      status: {
        'private-candidate': 'Private candidate',
        'private-checkpoint': 'Private checkpoint',
        deployed: 'Deployed',
        published: 'Published',
        superseded: 'Superseded',
      } satisfies Record<NovaReleaseStatus, string>,
    },
    es: {
      eyebrow: 'Un museo que sigue aprendiendo',
      title: 'La historia de Nova',
      body: 'Cada edición añade algo que una persona puede sentir o utilizar. Los detalles técnicos quedan en el repositorio; esta es la historia humana.',
      current: 'Versión actual',
      previous: 'Explorar capítulos anteriores',
      status: {
        'private-candidate': 'Candidata privada',
        'private-checkpoint': 'Checkpoint privado',
        deployed: 'Desplegada',
        published: 'Publicada',
        superseded: 'Superada',
      } satisfies Record<NovaReleaseStatus, string>,
    },
    he: {
      eyebrow: 'מוזיאון שממשיך ללמוד',
      title: 'הסיפור של Nova',
      body: 'כל מהדורה מוסיפה משהו שמאזינים יכולים להרגיש או להשתמש בו. הפרטים הטכניים נשארים במאגר; זה הסיפור האנושי.',
      current: 'גרסה נוכחית',
      previous: 'פרקים קודמים',
      status: {
        'private-candidate': 'גרסה מועמדת פרטית',
        'private-checkpoint': 'נקודת ביקורת פרטית',
        deployed: 'נפרסה',
        published: 'פורסמה',
        superseded: 'הוחלפה',
      } satisfies Record<NovaReleaseStatus, string>,
    },
  });
  const currentStory = CURRENT_NOVA_RELEASE.story[lang];
  const previousReleases = NOVA_RELEASE_HISTORY.filter(release => !release.current);
  const dateFormatter = new Intl.DateTimeFormat(localeFor(lang), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const formatDate = (date: string) => dateFormatter.format(new Date(`${date}T00:00:00Z`));

  return (
    <section
      id={NOVA_RELEASE_STORY_ID}
      className="nova-release-story"
      dir={directionFor(lang)}
      aria-labelledby="nova-release-story-title"
    >
      <header className="nova-release-story__heading">
        <span>
          <History className="h-4 w-4" aria-hidden="true" />
          {copy.eyebrow}
        </span>
        <h2 id="nova-release-story-title">{copy.title}</h2>
        <p>{copy.body}</p>
      </header>

      <article className="nova-release-story__current">
        <div className="nova-release-story__version">
          <span>{copy.current}</span>
          <strong>v{CURRENT_NOVA_RELEASE.version}</strong>
        </div>
        <div className="nova-release-story__current-copy">
          <div className="nova-release-story__meta">
            <span>{copy.status[CURRENT_NOVA_RELEASE.status]}</span>
            <time dateTime={CURRENT_NOVA_RELEASE.date}>{formatDate(CURRENT_NOVA_RELEASE.date)}</time>
          </div>
          <h3>{currentStory.name}</h3>
          <p>{currentStory.summary}</p>
          <ul>
            {currentStory.highlights.map(highlight => (
              <li key={highlight}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      </article>

      <details className="nova-release-story__previous">
        <summary>
          <span>{copy.previous}</span>
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </summary>
        <ol>
          {previousReleases.map(release => {
            const story = release.story[lang];
            return (
              <li key={release.version}>
                <div>
                  <strong>v{release.version}</strong>
                  <time dateTime={release.date}>{formatDate(release.date)}</time>
                </div>
                <div>
                  <span>
                    {copy.status[release.status]}
                    {release.secondaryStatus ? ` · ${copy.status[release.secondaryStatus]}` : ''}
                  </span>
                  <h3>{story.name}</h3>
                  <p>{story.summary}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </details>
    </section>
  );
}
