/**
 * Auth slice — manages JWT and user state
 * For MVP: supports auto-login with test user credentials
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { AuthState, LoginCredentials, RegisterCredentials, LoginResponse, StrapiUser } from '../types';

const STRAPI_BASE_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';

// Check localStorage for persisted auth
const persistedJwt = localStorage.getItem('community_jwt');
const persistedUser = localStorage.getItem('community_user');

const initialState: AuthState = {
  jwt: persistedJwt,
  user: persistedUser ? JSON.parse(persistedUser) : null,
  isAuthenticated: !!persistedJwt,
  schoolEmail: null,
  schoolEmailVerified: false,
  schoolDomain: null,
  organizations: [],
};

/**
 * Login via Strapi's auth endpoint
 */
export const login = createAsyncThunk<LoginResponse, LoginCredentials>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await fetch(`${STRAPI_BASE_URL}/api/auth/local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error?.error?.message || 'Login failed');
      }

      return await response.json();
    } catch (err) {
      return rejectWithValue('Network error — is Strapi running?');
    }
  }
);

/**
 * Register via Strapi's auth endpoint
 */
export const registerUser = createAsyncThunk<LoginResponse, RegisterCredentials>(
  'auth/register',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await fetch(`${STRAPI_BASE_URL}/api/auth/local/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error?.error?.message || 'Registration failed');
      }

      return await response.json();
    } catch (err) {
      return rejectWithValue('Network error — is Strapi running?');
    }
  }
);

/**
 * Fetch current user profile using JWT token
 */
export const fetchUserProfile = createAsyncThunk<StrapiUser, string>(
  'auth/fetchUserProfile',
  async (token, { rejectWithValue }) => {
    try {
      const response = await fetch(`${STRAPI_BASE_URL}/api/users/me?populate=*`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        return rejectWithValue('Failed to fetch user profile');
      }

      const userData = await response.json();
      
      // Normalize profile picture to avatar
      let avatarUrl = userData.avatar || userData.picture;
      if (!avatarUrl) {
        if (userData.profilePic && !Array.isArray(userData.profilePic) && userData.profilePic.url) {
          avatarUrl = userData.profilePic.url;
        } else if (userData.profilePicUrl) {
          avatarUrl = userData.profilePicUrl;
        }
      }

      return {
        ...userData,
        avatar: avatarUrl
      };
    } catch (err) {
      return rejectWithValue('Network error');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.jwt = null;
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem('community_jwt');
      localStorage.removeItem('community_user');
    },
    /** Set auth state directly (useful for dev/testing) */
    setAuth(state, action) {
      state.jwt = action.payload.jwt;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      localStorage.setItem('community_jwt', action.payload.jwt);
      localStorage.setItem('community_user', JSON.stringify(action.payload.user));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.fulfilled, (state, action) => {
        state.jwt = action.payload.jwt;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        localStorage.setItem('community_jwt', action.payload.jwt);
        localStorage.setItem('community_user', JSON.stringify(action.payload.user));
      })
      .addCase(login.rejected, (state) => {
        state.jwt = null;
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.jwt = action.payload.jwt;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        localStorage.setItem('community_jwt', action.payload.jwt);
        localStorage.setItem('community_user', JSON.stringify(action.payload.user));
      })
      .addCase(registerUser.rejected, (state) => {
        state.jwt = null;
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        localStorage.setItem('community_user', JSON.stringify(action.payload));
      });
  },
});

export const { logout, setAuth } = authSlice.actions;
export default authSlice.reducer;
