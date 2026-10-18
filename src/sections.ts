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
  | 'time'
  | 'purpose'
  | 'settings';

export interface SectionMeta {
  id: Section;
  label: string;
  group: 'Día' | 'Áreas' | 'Rumbo';
  key: string; // atajo de teclado
}

export const SECTIONS: SectionMeta[] = [
  { id: 'today', label: 'Hoy', group: 'Día', key: 'H' },
  { id: 'agenda', label: 'Agenda', group: 'Día', key: 'C' },
  { id: 'habits', label: 'Hábitos', group: 'Día', key: 'M' },
  { id: 'focus', label: 'Enfoque', group: 'Día', key: 'T' },
  { id: 'journal', label: 'Diario', group: 'Día', key: 'D' },
  { id: 'university', label: 'Facultad', group: 'Áreas', key: 'U' },
  { id: 'work', label: 'Trabajo', group: 'Áreas', key: 'W' },
  { id: 'finance', label: 'Plata', group: 'Áreas', key: 'F' },
  { id: 'people', label: 'Personas', group: 'Áreas', key: 'R' },
  { id: 'faith', label: 'Fe', group: 'Áreas', key: 'V' },
  { id: 'books', label: 'Libros', group: 'Áreas', key: 'L' },
  { id: 'time', label: 'Tiempo y pantalla', group: 'Rumbo', key: 'P' },
  { id: 'purpose', label: 'Brújula', group: 'Rumbo', key: 'O' },
  { id: 'settings', label: 'Ajustes', group: 'Rumbo', key: 'A' },
];
