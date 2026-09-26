import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { LanguageCode } from '../types';

export type Role = 'admin' | 'user';

interface SessionState {
  role: Role | null;
  name: string;
  /** Index into the synthetic dataset when logged in as a resident. */
  personIndex: number | null;
  language: LanguageCode;
  loginAdmin: (name: string) => void;
  loginUser: (personIndex: number, name: string, language: LanguageCode) => void;
  logout: () => void;
}

/** Demo login. Stored per browser tab (sessionStorage) so one tab can be Admin and another a Resident. */
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      role: null,
      name: '',
      personIndex: null,
      language: 'en',
      loginAdmin: (name) => set({ role: 'admin', name, personIndex: null }),
      loginUser: (personIndex, name, language) => set({ role: 'user', personIndex, name, language }),
      logout: () => set({ role: null, name: '', personIndex: null }),
    }),
    { name: 'lastmile-session', storage: createJSONStorage(() => sessionStorage) },
  ),
);
