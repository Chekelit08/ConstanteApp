/**
 * Real Spotify Integration with Web API and Web Playback SDK (PKCE Authorization Code Flow).
 * No Client Secret is used or requested.
 */
import { SpotifyDevice, SpotifyPlaybackState } from '../types/focus';

const TOKEN_KEY = 'constante_spotify_token';
const REFRESH_TOKEN_KEY = 'constante_spotify_refresh_token';
const EXPIRES_AT_KEY = 'constante_spotify_expires_at';
const VERIFIER_KEY = 'constante_spotify_code_verifier';

export const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
].join(' ');

export function getRedirectUri(): string {
  // Safe redirect URI without hash or query
  return window.location.origin + window.location.pathname;
}

/**
 * Parses an open.spotify.com link into type and clean ID, removing ?si= parameters
 */
export function parseSpotifyLink(link: string): {
  type: 'playlist' | 'album' | 'track' | 'show';
  id: string;
  cleanUrl: string;
} | null {
  if (!link) return null;
  const cleaned = link.trim();
  const match = cleaned.match(/spotify\.com\/(playlist|album|track|show|episode)\/([a-zA-Z0-9]+)/);
  if (match) {
    const rawType = match[1];
    const id = match[2];
    const type = (rawType === 'episode' ? 'show' : rawType) as 'playlist' | 'album' | 'track' | 'show';
    return {
      type,
      id,
      cleanUrl: `https://open.spotify.com/${type}/${id}`,
    };
  }
  return null;
}

/**
 * Generate cryptographic random string for PKCE
 */
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values).reduce((acc, x) => acc + possible[x % possible.length], '');
}

/**
 * SHA-256 hash formatted as Base64-URL for PKCE
 */
async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Initiates the PKCE Authorization Code flow
 */
export async function startSpotifyAuth(clientId: string): Promise<void> {
  if (!clientId || clientId.trim() === '') {
    throw new Error('Ingresá tu Spotify Client ID en Ajustes.');
  }

  const verifier = generateRandomString(64);
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const hashed = await sha256(verifier);
  const challenge = base64UrlEncode(hashed);

  const redirectUri = getRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId.trim(),
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

  // If in iframe, notify user or try popup
  if (window.self !== window.top) {
    const popup = window.open(authUrl, '_blank', 'width=600,height=750');
    if (!popup) {
      window.location.href = authUrl;
    }
  } else {
    window.location.href = authUrl;
  }
}

/**
 * Handles callback after redirect from Spotify
 */
export async function handleSpotifyCallback(clientId: string, code: string): Promise<boolean> {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) {
    console.warn('No code verifier found in session storage.');
    return false;
  }

  const redirectUri = getRedirectUri();
  const body = new URLSearchParams({
    client_id: clientId.trim(),
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Spotify token exchange failed:', errData);
      return false;
    }

    const data = await response.json();
    saveSpotifyTokens(data.access_token, data.refresh_token, data.expires_in);
    sessionStorage.removeItem(VERIFIER_KEY);
    return true;
  } catch (err) {
    console.error('Error exchanging Spotify code:', err);
    return false;
  }
}

export function saveSpotifyTokens(accessToken: string, refreshToken?: string, expiresInSeconds = 3600): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  const expiresAt = Date.now() + (expiresInSeconds - 60) * 1000;
  localStorage.setItem(EXPIRES_AT_KEY, expiresAt.toString());
}

export function getSpotifyToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function isSpotifyConnected(): boolean {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

export function disconnectSpotify(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
}

/**
 * Refreshes Spotify access token if expired
 */
export async function ensureFreshToken(clientId: string): Promise<string | null> {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY) || 0);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

  if (!token) return null;

  if (Date.now() < expiresAt) {
    return token;
  }

  if (!refreshToken || !clientId) {
    return token;
  }

  try {
    const body = new URLSearchParams({
      client_id: clientId.trim(),
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      return token;
    }

    const data = await response.json();
    saveSpotifyTokens(data.access_token, data.refresh_token || refreshToken, data.expires_in);
    return data.access_token;
  } catch (err) {
    console.warn('Error refreshing Spotify token:', err);
    return token;
  }
}

/**
 * Handles Web API fetch with human-friendly error messages
 */
async function spotifyFetch(clientId: string, endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await ensureFreshToken(clientId);
  if (!token) {
    throw new Error('No estás conectado a Spotify.');
  }

  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 401) {
    throw new Error('Sesión de Spotify expirada. Volvé a conectar tu cuenta en Ajustes.');
  }
  if (res.status === 403) {
    throw new Error('Spotify rechazó la solicitud (error 403). Verificá que tu cuenta tenga Spotify Premium y esté autorizada en el dashboard de Spotify.');
  }
  if (res.status === 429) {
    throw new Error('Demasiadas solicitudes a Spotify (error 429). Aguardá unos segundos.');
  }

  return res;
}

/**
 * Lists available Spotify playback devices
 */
export async function getSpotifyDevices(clientId: string): Promise<SpotifyDevice[]> {
  try {
    const res = await spotifyFetch(clientId, '/me/player/devices');
    if (!res.ok) return [];
    const data = await res.json();
    return (data.devices || []) as SpotifyDevice[];
  } catch (err) {
    console.warn('Error fetching devices:', err);
    return [];
  }
}

/**
 * Plays a context URI (playlist, album, etc.) on the designated device
 */
export async function playSpotifyContext(clientId: string, contextUri: string, deviceId?: string): Promise<void> {
  const endpoint = deviceId ? `/me/player/play?device_id=${deviceId}` : '/me/player/play';
  const body = contextUri.includes(':track:')
    ? { uris: [contextUri] }
    : { context_uri: contextUri };

  await spotifyFetch(clientId, endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * Resume or pause playback
 */
export async function pauseSpotify(clientId: string, deviceId?: string): Promise<void> {
  const endpoint = deviceId ? `/me/player/pause?device_id=${deviceId}` : '/me/player/pause';
  await spotifyFetch(clientId, endpoint, { method: 'PUT' });
}

export async function resumeSpotify(clientId: string, deviceId?: string): Promise<void> {
  const endpoint = deviceId ? `/me/player/play?device_id=${deviceId}` : '/me/player/play';
  await spotifyFetch(clientId, endpoint, { method: 'PUT' });
}

export async function nextSpotifyTrack(clientId: string, deviceId?: string): Promise<void> {
  const endpoint = deviceId ? `/me/player/next?device_id=${deviceId}` : '/me/player/next';
  await spotifyFetch(clientId, endpoint, { method: 'POST' });
}

export async function previousSpotifyTrack(clientId: string, deviceId?: string): Promise<void> {
  const endpoint = deviceId ? `/me/player/previous?device_id=${deviceId}` : '/me/player/previous';
  await spotifyFetch(clientId, endpoint, { method: 'POST' });
}

export async function setSpotifyVolume(clientId: string, volumePercent: number, deviceId?: string): Promise<void> {
  const vol = Math.max(0, Math.min(100, Math.round(volumePercent)));
  const endpoint = `/me/player/volume?volume_percent=${vol}${deviceId ? `&device_id=${deviceId}` : ''}`;
  await spotifyFetch(clientId, endpoint, { method: 'PUT' });
}

/**
 * Polls current playback state
 */
export async function getSpotifyPlaybackState(clientId: string): Promise<SpotifyPlaybackState | null> {
  try {
    const res = await spotifyFetch(clientId, '/me/player');
    if (res.status === 204 || !res.ok) return null;
    const data = await res.json();
    if (!data || !data.item) return null;

    return {
      isPlaying: Boolean(data.is_playing),
      trackName: data.item.name || '',
      artistName: (data.item.artists || []).map((a: any) => a.name).join(', '),
      albumArtUrl: data.item.album?.images?.[0]?.url,
      trackUri: data.item.uri,
      progressMs: data.progress_ms || 0,
      durationMs: data.item.duration_ms || 0,
      deviceId: data.device?.id,
    };
  } catch (err) {
    return null;
  }
}
