import { useCallback, useMemo, useState } from 'react';
import { getCVs, getLetters, getUser } from './lib/store.js';

export function useStore() {
  const [v, setV] = useState(0);
  const refresh = useCallback(() => setV((x) => x + 1), []);
  const data = useMemo(() => {
    let cvs = [];
    let letters = [];
    let user = {};
    try {
      cvs = getCVs();
      letters = getLetters();
      user = getUser();
    } catch (e) { /* ignore */ }
    return { cvs, letters, user };
  }, [v]);
  return { ...data, refresh };
}
