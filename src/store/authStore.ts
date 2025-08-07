import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';

interface AuthState {
  token: string | null;
  role: string | null;
  setToken: (token: string | null) => void;
  clearToken: () => void;
}

interface DecodedToken {
  userId: string;
  role: string;
}

const getInitialTokenAndRole = () => {
  if (typeof window !== 'undefined') {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        const decoded = jwtDecode<DecodedToken>(storedToken);
        return { token: storedToken, role: decoded.role };
      } catch (error) {
        console.error("Failed to decode token from localStorage", error);
        localStorage.removeItem('token');
      }
    }
  }
  return { token: null, role: null };
};

export const useAuthStore = create<AuthState>((set) => ({
  ...getInitialTokenAndRole(),
  setToken: (token) => {
    let role = null;
    if (token) {
      localStorage.setItem('token', token);
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        role = decoded.role;
      } catch (error) {
        console.error("Failed to decode token", error);
      }
    } else {
      localStorage.removeItem('token');
    }
    set({ token, role });
  },
  clearToken: () => {
    localStorage.removeItem('token');
    set({ token: null, role: null });
  },
}));