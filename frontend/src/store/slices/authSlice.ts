import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  isKids: boolean;
  pinLocked: boolean;
}

interface AuthState {
  user: User | null;
  selectedProfile: Profile | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  selectedProfile: null,
  isAuthenticated: false,
  accessToken: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    authSuccess: (
      state,
      action: PayloadAction<{ user: User; accessToken: string }>
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
    },
    authFailure: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.selectedProfile = null;
    },
    selectProfile: (state, action: PayloadAction<Profile | null>) => {
      state.selectedProfile = action.payload;
    },
    logoutSuccess: (state) => {
      state.user = null;
      state.selectedProfile = null;
      state.isAuthenticated = false;
      state.accessToken = null;
      state.loading = false;
      state.error = null;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setAuthLoading,
  authSuccess,
  authFailure,
  selectProfile,
  logoutSuccess,
  clearAuthError,
} = authSlice.actions;

export default authSlice.reducer;
