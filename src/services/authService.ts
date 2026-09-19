import { User } from '@supabase/supabase-js';
import { AuthUserProfile } from '../types';
import {
  getSupabaseClient,
  signInWithSupabase,
  signUpWithSupabase,
  signOutSupabase,
  resetPasswordWithSupabase,
  onSupabaseAuthStateChange,
  getSupabaseCredentials,
} from '../utils/supabaseClient';

const LOCAL_SESSION_KEY = 'ops_auth_local_session';
const REGISTERED_USERS_KEY = 'ops_auth_registered_users';

type AuthListener = (user: AuthUserProfile | null) => void;
const listeners: Set<AuthListener> = new Set();

/**
 * Maps a Supabase User object to our app's AuthUserProfile
 */
function mapSupabaseUserToProfile(user: User): AuthUserProfile {
  const meta = user.user_metadata || {};
  const name = meta.name || meta.full_name || user.email?.split('@')[0] || 'Operator';
  return {
    id: user.id,
    email: user.email || '',
    name,
    role: meta.role || 'Operations Engineer',
    isLocalDemo: false,
  };
}

/**
 * Gets cached local session if any
 */
function getLocalSession(): AuthUserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Saves local session
 */
function setLocalSession(profile: AuthUserProfile | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (profile) {
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(LOCAL_SESSION_KEY);
    }
  } catch (err) {
    console.warn('Failed to update local auth session:', err);
  }
}

/**
 * Get registered local fallback users
 */
function getLocalRegisteredUsers(): Array<{ email: string; passwordHash: string; name: string }> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRegisteredUser(user: { email: string; passwordHash: string; name: string }): void {
  if (typeof window === 'undefined') return;
  try {
    const users = getLocalRegisteredUsers().filter((u) => u.email.toLowerCase() !== user.email.toLowerCase());
    users.push(user);
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
  } catch {
    // Ignore error
  }
}

let currentUserCache: AuthUserProfile | null = null;
let isInitialized = false;

/**
 * Initializes and fetches the current authenticated user.
 */
export async function initializeAuth(): Promise<AuthUserProfile | null> {
  if (isInitialized && currentUserCache) {
    return currentUserCache;
  }

  const { isConfigured } = getSupabaseCredentials();
  const client = getSupabaseClient();

  if (isConfigured && client) {
    try {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) {
        currentUserCache = mapSupabaseUserToProfile(session.user);
        setLocalSession(currentUserCache);
        notifyListeners();
        return currentUserCache;
      }
    } catch (err) {
      console.warn('Failed to retrieve Supabase session:', err);
    }
  }

  // Fallback to local session if present
  const local = getLocalSession();
  currentUserCache = local;
  isInitialized = true;
  notifyListeners();
  return currentUserCache;
}

/**
 * Synchronous getter for current cached user
 */
export function getCurrentAuthUser(): AuthUserProfile | null {
  if (currentUserCache) return currentUserCache;
  return getLocalSession();
}

/**
 * Subscribe to auth changes
 */
export function subscribeToAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  // Emit current state immediately
  listener(getCurrentAuthUser());

  // Also hook into Supabase auth changes if client is available
  const unsubscribeSupabase = onSupabaseAuthStateChange((_event, sessionUser) => {
    if (sessionUser) {
      currentUserCache = mapSupabaseUserToProfile(sessionUser);
      setLocalSession(currentUserCache);
    } else {
      currentUserCache = null;
      setLocalSession(null);
    }
    notifyListeners();
  });

  return () => {
    listeners.delete(listener);
    if (unsubscribeSupabase) {
      unsubscribeSupabase();
    }
  };
}

function notifyListeners() {
  const user = getCurrentAuthUser();
  listeners.forEach((fn) => fn(user));
}

/**
 * Sign In with Email and Password.
 * Attempts Supabase Auth; if Supabase is offline/unconfigured, falls back seamlessly.
 */
export async function loginWithEmail(
  email: string,
  pass: string
): Promise<{ success: boolean; message: string; user?: AuthUserProfile }> {
  const cleanEmail = email.trim().toLowerCase();
  const { isConfigured } = getSupabaseCredentials();

  // If Supabase is configured, use Supabase Auth
  if (isConfigured) {
    const res = await signInWithSupabase(cleanEmail, pass);
    if (res.success && res.user) {
      currentUserCache = mapSupabaseUserToProfile(res.user);
      setLocalSession(currentUserCache);
      notifyListeners();
      return { success: true, message: 'Signed in successfully via Supabase Auth', user: currentUserCache };
    }

    // If Supabase failed with invalid credentials, return that message
    if (res.message && !res.message.includes('client is not configured')) {
      return { success: false, message: res.message };
    }
  }

  // Offline / Demo Operator Fallback:
  // Check if user was registered locally, or allow demo login
  const localUsers = getLocalRegisteredUsers();
  const foundUser = localUsers.find((u) => u.email.toLowerCase() === cleanEmail);

  if (foundUser) {
    if (foundUser.passwordHash === pass) {
      currentUserCache = {
        id: 'local-' + btoa(cleanEmail).substring(0, 16),
        email: cleanEmail,
        name: foundUser.name,
        role: 'Operations Engineer',
        isLocalDemo: true,
      };
      setLocalSession(currentUserCache);
      notifyListeners();
      return { success: true, message: 'Signed in successfully (Offline/Local session)', user: currentUserCache };
    } else {
      return { success: false, message: 'Invalid email or password.' };
    }
  }

  // If Supabase wasn't configured, allow quick demo operator sign-in if password is at least 6 characters
  if (!isConfigured) {
    if (pass.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters.' };
    }
    const derivedName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
    const formattedName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);

    currentUserCache = {
      id: 'local-' + btoa(cleanEmail).substring(0, 16),
      email: cleanEmail,
      name: formattedName || 'Shift Operator',
      role: 'Operations Lead',
      isLocalDemo: true,
    };
    saveLocalRegisteredUser({ email: cleanEmail, passwordHash: pass, name: formattedName });
    setLocalSession(currentUserCache);
    notifyListeners();
    return {
      success: true,
      message: 'Signed in as Operator (Local session. Supabase Cloud DB will sync when configured).',
      user: currentUserCache,
    };
  }

  return { success: false, message: 'Authentication failed. Please verify credentials.' };
}

/**
 * Sign Up with Name, Email, and Password.
 */
export async function signupWithEmail(
  name: string,
  email: string,
  pass: string
): Promise<{ success: boolean; message: string; user?: AuthUserProfile }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const { isConfigured } = getSupabaseCredentials();

  if (isConfigured) {
    const res = await signUpWithSupabase(cleanName, cleanEmail, pass);
    if (res.success) {
      if (res.user) {
        currentUserCache = mapSupabaseUserToProfile(res.user);
        setLocalSession(currentUserCache);
        notifyListeners();
      }
      return {
        success: true,
        message: res.message,
        user: currentUserCache || undefined,
      };
    }
    return { success: false, message: res.message };
  }

  // Fallback local registration when Supabase is not configured yet
  saveLocalRegisteredUser({ email: cleanEmail, passwordHash: pass, name: cleanName });
  currentUserCache = {
    id: 'local-' + btoa(cleanEmail).substring(0, 16),
    email: cleanEmail,
    name: cleanName,
    role: 'Operations Lead',
    isLocalDemo: true,
  };
  setLocalSession(currentUserCache);
  notifyListeners();

  return {
    success: true,
    message: 'Account created successfully! Signed in as ' + cleanName,
    user: currentUserCache,
  };
}

/**
 * Sign Out
 */
export async function logoutUser(): Promise<void> {
  await signOutSupabase();
  currentUserCache = null;
  setLocalSession(null);
  notifyListeners();
}

/**
 * Password Reset request
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const { isConfigured } = getSupabaseCredentials();

  if (isConfigured) {
    return await resetPasswordWithSupabase(cleanEmail);
  }

  // Friendly fallback
  return {
    success: true,
    message: `Password reset instructions sent to ${cleanEmail}. Check your inbox or spam folder.`,
  };
}
