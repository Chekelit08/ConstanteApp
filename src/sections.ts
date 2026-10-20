export type Section =
  | 'today'
  | 'agenda'
  | 'habits'
  | 'focus'
  | 'journal'
  | 'university'
  | 'work'
  | 'finance'
  | 'people'
  | 'faith'
  | 'books'
  | 'courses'
  | 'time'
  | 'purpose'
  | 'settings';

export interface SectionMeta {
  id: Section;
  label: string;
  group: 'Día' | 'Áreas' | 'Rumbo';
  key: string; // atajo de teclado
  color: string; // la "estrella" de cada sección: se ve en el menú, el encabezado y la barra
}

export const SECTIONS: SectionMeta[] = [
  { id: 'today', label: 'Hoy', group: 'Día', key: 'H', color: '#ff8a5b' },
  { id: 'agenda', label: 'Agenda', group: 'Día', key: 'C', color: '#8fb3ff' },
  { id: 'habits', label: 'Hábitos', group: 'Día', key: 'M', color: '#ffb35c' },
  { id: 'focus', label: 'Enfoque', group: 'Día', key: 'T', color: '#ff7a8a' },
  { id: 'journal', label: 'Diario', group: 'Día', key: 'D', color: '#c3a6ff' },
  { id: 'university', label: 'Facultad', group: 'Áreas', key: 'U', color: '#6aa5ff' },
  { id: 'work', label: 'Trabajo', group: 'Áreas', key: 'W', color: '#f0b45a' },
  { id: 'finance', label: 'Plata', group: 'Áreas', key: 'F', color: '#5fd4a8' },
  { id: 'people', label: 'Personas', group: 'Áreas', key: 'R', color: '#ff8fb1' },
  { id: 'faith', label: 'Fe', group: 'Áreas', key: 'V', color: '#b69cff' },
  { id: 'books', label: 'Libros', group: 'Áreas', key: 'L', color: '#e8c06a' },
  { id: 'courses', label: 'Cursos', group: 'Áreas', key: 'K', color: '#59d1d6' },
  { id: 'time', label: 'Tiempo y pantalla', group: 'Rumbo', key: 'P', color: '#7fd3f7' },
  { id: 'purpose', label: 'Brújula', group: 'Rumbo', key: 'O', color: '#ffc861' },
  { id: 'settings', label: 'Ajustes', group: 'Rumbo', key: 'A', color: '#a3a5c2' },
];
