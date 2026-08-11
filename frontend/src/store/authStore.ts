import { create } from 'zustand';

export interface UserSettings {
  fontSize: number;
  soundOn: boolean;
  caretStyle: 'line' | 'block' | 'underline';
  animationOn: boolean;
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  theme: string;
  settings: UserSettings;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  guestResults: string[];
  
  login: (loginId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateSettings: (theme: string, settings: Partial<UserSettings>) => Promise<void>;
  addGuestResult: (id: string) => void;
  clearGuestResults: () => void;
}

const getStoredGuestResults = (): string[] => {
  try {
    const saved = localStorage.getItem('typemaster-guest-results');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  guestResults: getStoredGuestResults(),

  login: async (loginId, password) => {
    try {
      const { guestResults } = get();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password, guestResults })
      });
      const data = await res.json();
      
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed.' };
      }

      set({
        user: data.user,
        accessToken: data.accessToken,
        isAuthenticated: true,
        guestResults: []
      });
      localStorage.removeItem('typemaster-guest-results');
      
      // Update theme store to match user's custom theme
      if (data.user.theme) {
        localStorage.setItem('typemaster-theme', data.user.theme);
        document.documentElement.setAttribute('data-theme', data.user.theme);
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Network error.' };
    }
  },

  register: async (email, username, password) => {
    try {
      const { guestResults } = get();
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, guestResults })
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed.' };
      }

      set({
        user: data.user,
        accessToken: data.accessToken,
        isAuthenticated: true,
        guestResults: []
      });
      localStorage.removeItem('typemaster-guest-results');

      if (data.user.theme) {
        localStorage.setItem('typemaster-theme', data.user.theme);
        document.documentElement.setAttribute('data-theme', data.user.theme);
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Network error.' };
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false
      });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        set({
          user: data.user,
          accessToken: data.accessToken,
          isAuthenticated: true,
          isLoading: false
        });
        if (data.user.theme) {
          localStorage.setItem('typemaster-theme', data.user.theme);
          document.documentElement.setAttribute('data-theme', data.user.theme);
        }
      } else {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    } catch (err) {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  },

  updateSettings: async (theme, settings) => {
    const { user, accessToken } = get();
    if (!user) {
      // Offline guest settings fallback
      const updatedSettings = { fontSize: 18, soundOn: true, caretStyle: 'line' as const, animationOn: true, ...settings } as UserSettings;
      const fakeUser: User = {
        id: 'guest-' + Math.random().toString(36).substr(2, 9),
        email: '',
        username: 'Guest',
        role: 'user',
        theme,
        settings: updatedSettings
      };
      set({ user: fakeUser });
      return;
    }

    try {
      const mergedSettings = { ...user.settings, ...settings };
      const res = await fetch('/api/users/me/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ theme, settings: mergedSettings })
      });
      const data = await res.json();
      if (res.ok) {
        set({ user: data.user });
        if (theme) {
          localStorage.setItem('typemaster-theme', theme);
          document.documentElement.setAttribute('data-theme', theme);
        }
      }
    } catch (err) {
      console.error('Update settings failed:', err);
    }
  },

  addGuestResult: (id) => {
    const { guestResults } = get();
    const updated = [...guestResults, id];
    set({ guestResults: updated });
    localStorage.setItem('typemaster-guest-results', JSON.stringify(updated));
  },

  clearGuestResults: () => {
    set({ guestResults: [] });
    localStorage.removeItem('typemaster-guest-results');
  }
}));
