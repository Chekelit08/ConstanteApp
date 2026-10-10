export type FocusModeType = 'pomodoro' | 'study' | 'deepwork' | 'custom' | 'stopwatch' | 'countdown';

export interface FocusPreset {
  id: string;
  name: string;
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLongBreak: number;
}

export interface FocusSession {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO datetime
  endTime?: string; // ISO datetime
  durationMinutes: number; // actual minutes completed
  mode: FocusModeType;
  taskName?: string;
  tag: string; // e.g. "Estudio", "Trabajo", "Lectura"
  habitId?: string; // optional linked habit
  completed: boolean;
  interrupted: boolean;
  exitCount: number; // how many times user left app
  timeOutsideSeconds: number; // total seconds spent outside
  notes?: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  emoji: string;
  url: string;
  spotifyUri: string;
  type: 'playlist' | 'album' | 'track' | 'show';
  coverUrl?: string;
}

export const INITIAL_SPOTIFY_PLAYLISTS: SpotifyPlaylist[] = [
  {
    id: '37i9dQZF1DX8Uebhn9wzrS',
    name: 'chill lofi study beats',
    emoji: '🎧',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS',
    spotifyUri: 'spotify:playlist:37i9dQZF1DX8Uebhn9wzrS',
    type: 'playlist',
  },
  {
    id: '37i9dQZF1DX3SiCzCxMDOH',
    name: 'Jazz for Study',
    emoji: '🎷',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX3SiCzCxMDOH',
    spotifyUri: 'spotify:playlist:37i9dQZF1DX3SiCzCxMDOH',
    type: 'playlist',
  },
  {
    id: '07UHFyiPyJBz3AN4tqbnba',
    name: 'Study Music',
    emoji: '📚',
    url: 'https://open.spotify.com/playlist/07UHFyiPyJBz3AN4tqbnba',
    spotifyUri: 'spotify:playlist:07UHFyiPyJBz3AN4tqbnba',
    type: 'playlist',
  },
  {
    id: '37i9dQZF1EIffdDyNXEwMb',
    name: 'Mi mezcla 1',
    emoji: '✨',
    url: 'https://open.spotify.com/playlist/37i9dQZF1EIffdDyNXEwMb',
    spotifyUri: 'spotify:playlist:37i9dQZF1EIffdDyNXEwMb',
    type: 'playlist',
  },
  {
    id: '37i9dQZF1EIgu7uyaCSpkX',
    name: 'Mi mezcla 2',
    emoji: '✨',
    url: 'https://open.spotify.com/playlist/37i9dQZF1EIgu7uyaCSpkX',
    spotifyUri: 'spotify:playlist:37i9dQZF1EIgu7uyaCSpkX',
    type: 'playlist',
  },
];

export const DEFAULT_FOCUS_PRESETS: FocusPreset[] = [
  {
    id: 'pomodoro-classic',
    name: 'Pomodoro clásico (25/5)',
    focusMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
    cyclesBeforeLongBreak: 4,
  },
  {
    id: 'study-set',
    name: 'Set de estudio (50/10)',
    focusMinutes: 50,
    breakMinutes: 10,
    longBreakMinutes: 20,
    cyclesBeforeLongBreak: 3,
  },
  {
    id: 'deep-work',
    name: 'Deep work (90/20)',
    focusMinutes: 90,
    breakMinutes: 20,
    longBreakMinutes: 30,
    cyclesBeforeLongBreak: 2,
  },
];

export interface SpotifyDevice {
  id: string;
  is_active: boolean;
  name: string;
  type: string;
  volume_percent: number;
}

export interface SpotifyPlaybackState {
  isPlaying: boolean;
  trackName: string;
  artistName: string;
  albumArtUrl?: string;
  trackUri?: string;
  progressMs: number;
  durationMs: number;
  deviceId?: string;
}
