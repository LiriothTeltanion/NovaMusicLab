import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  EXPERIENCE_DEPTH_STORAGE_KEY,
  resolveStoredExperienceDepth,
  type ExperienceDepth,
} from '../components/shell/museumNavigation';

interface ExperienceContextValue {
  experienceDepth: ExperienceDepth;
  setExperienceDepth: (depth: ExperienceDepth) => void;
}

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

function persistExperienceDepth(depth: ExperienceDepth) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(EXPERIENCE_DEPTH_STORAGE_KEY, depth);
  } catch {
    // The selected depth remains active for this session in private browsing.
  }
}

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const [experienceDepth, setExperienceDepthState] = useState<ExperienceDepth>(
    () => resolveStoredExperienceDepth(),
  );

  useEffect(() => {
    persistExperienceDepth(experienceDepth);
  }, [experienceDepth]);

  const setExperienceDepth = useCallback((depth: ExperienceDepth) => {
    setExperienceDepthState(depth);
  }, []);

  const value = useMemo<ExperienceContextValue>(() => ({
    experienceDepth,
    setExperienceDepth,
  }), [experienceDepth, setExperienceDepth]);

  return (
    <ExperienceContext.Provider value={value}>
      {children}
    </ExperienceContext.Provider>
  );
}

export function useExperience() {
  const context = useContext(ExperienceContext);
  if (!context) {
    throw new Error('useExperience must be used within an ExperienceProvider');
  }

  return context;
}

/**
 * Read-only consumers may render in isolated previews and tests. Explore is
 * the neutral fallback: it neither opens tutorial copy nor advanced methods.
 */
export function useExperienceDepth(): ExperienceDepth {
  return useContext(ExperienceContext)?.experienceDepth ?? 'explore';
}
