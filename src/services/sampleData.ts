import { Habit } from '../types/habit';
import { getTodayDateString, addDays } from '../utils/dateUtils';
import { JournalEntry } from '../types/journal';

export const INITIAL_DEFAULT_HABITS: Omit<Habit, 'userId'>[] = [
  {
    id: 'habit-agua',
    name: 'Tomar 2L de agua',
    description: '8 vasos distribuidos a lo largo del día para mantenerte hidratado.',
    emoji: '💧',
    color: '#0284C7',
    category: 'Salud & Bienestar',
    type: 'counter',
    targetValue: 8,
    targetUnit: 'vasos',
    frequencyType: 'daily',
    status: 'active',
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'habit-lectura',
    name: 'Lectura sin pantallas',
    description: '30 minutos dedicados a un libro físico o Kindle antes de dormir.',
    emoji: '📖',
    color: '#D97706',
    category: 'Estudio & Mente',
    type: 'duration',
    targetValue: 30,
    targetUnit: 'minutos',
    frequencyType: 'daily',
    status: 'active',
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'habit-entrenamiento',
    name: 'Movimiento o entrenamiento',
    description: 'Gimnasio, trote o caminata enérgica para activar el cuerpo.',
    emoji: '🏃',
    color: '#E11D48',
    category: 'Salud & Bienestar',
    type: 'boolean',
    frequencyType: 'specific_days',
    specificDays: [0, 2, 4], // Lun, Mié, Vie
    status: 'active',
    sortOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'habit-meditacion',
    name: 'Respiración & Silencio',
    description: '10 minutos al despertar para pausar la mente y enfocar el día.',
    emoji: '🧘',
    color: '#059669',
    category: 'Espiritualidad & Calma',
    type: 'duration',
    targetValue: 10,
    targetUnit: 'minutos',
    frequencyType: 'daily',
    status: 'active',
    sortOrder: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'habit-no-azucar',
    name: 'Cero ultraprocesados / azúcar',
    description: 'Hábito de eliminación: marcar cada día que lograste evitar dulces industriales.',
    emoji: '🚫',
    color: '#7C3AED',
    category: 'Salud & Bienestar',
    type: 'boolean',
    isNegative: true,
    frequencyType: 'daily',
    status: 'active',
    sortOrder: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'habit-bitacora',
    name: 'Bitácora y balance diario',
    description: 'Grabar un audio de 2 minutos reflexionando sobre lo vivido hoy.',
    emoji: '🎙️',
    color: '#E11D48',
    category: 'Personal & Creativo',
    type: 'boolean',
    frequencyType: 'daily',
    status: 'active',
    sortOrder: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Generates 90 days (3 months) of rich realistic historical data for testing all views.
 */
export function generateThreeMonthsDemoData(userId: string) {
  const todayStr = getTodayDateString();
  const habits: Habit[] = INITIAL_DEFAULT_HABITS.map((h) => ({
    ...h,
    userId,
  }));

  const logs: Record<string, { values: Record<string, boolean | number> }> = {};
  const entries: JournalEntry[] = [];

  const sampleVoiceNotes = [
    {
      note: 'Hoy fue un día muy productivo en el laburo. Me levanté temprano, tomé unos buenos mates amargos y pude cerrar las entregas antes del mediodía.',
      summary: 'Día de trabajo enfocado con buen ritmo de avance y satisfacción personal.',
      tags: ['Trabajo', 'Foco', 'Productividad'],
      mood: 5 as const,
      score: 9,
    },
    {
      note: 'Terminé cansado pero contento. Salí a caminar una hora al atardecer para despejar un poco la cabeza. La lectura de la noche me bajó mil cambios.',
      summary: 'Caminata relajante al final de la jornada y momento de calma con lectura.',
      tags: ['Caminata', 'Lectura', 'Descanso'],
      mood: 4 as const,
      score: 8,
    },
    {
      note: 'Día complicado, hubo imprevistos en la oficina y se me complicó entrenar. Pero mantuve la hidratación y no caí en la comida chatarra.',
      summary: 'Día desafiante con imprevistos pero con disciplina alimentaria intacta.',
      tags: ['Desafío', 'Disciplina', 'Hábitos'],
      mood: 3 as const,
      score: 6,
    },
    {
      note: 'Hermoso domingo en familia. Asado al mediodía, charla larga y mateada en el patio. Me siento muy agradecido.',
      summary: 'Jornada familiar distendida con asado y recarga de energía afectiva.',
      tags: ['Familia', 'Gratitud', 'Domingo'],
      mood: 5 as const,
      score: 10,
    },
  ];

  // Go back 90 days up to today
  for (let i = 90; i >= 0; i--) {
    const dateStr = addDays(todayStr, -i);
    const dayValues: Record<string, boolean | number> = {};

    // Simulate completion with realistic streaks and variations (approx 75-85% success)
    const seed = (i * 37 + 19) % 100;

    // Agua (target 8)
    dayValues['habit-agua'] = seed > 20 ? (seed > 60 ? 8 : 6) : 4;

    // Lectura (target 30)
    dayValues['habit-lectura'] = seed > 25 ? (seed > 55 ? 30 : 20) : 0;

    // Entrenamiento (Mon, Wed, Fri)
    const dayOfWeek = (new Date(dateStr + 'T12:00:00').getDay() + 6) % 7;
    if (dayOfWeek === 0 || dayOfWeek === 2 || dayOfWeek === 4) {
      dayValues['habit-entrenamiento'] = seed > 30;
    }

    // Meditación (target 10)
    dayValues['habit-meditacion'] = seed > 35 ? 10 : 0;

    // No azúcar
    dayValues['habit-no-azucar'] = seed > 25;

    // Bitácora
    dayValues['habit-bitacora'] = seed > 40;

    logs[dateStr] = { values: dayValues };

    // Create journal entries for approx every 3-4 days
    if (i % 3 === 0 || i === 0) {
      const sample = sampleVoiceNotes[(i / 3) % sampleVoiceNotes.length];
      entries.push({
        id: dateStr,
        userId,
        date: dateStr,
        blocks: [
          {
            id: `block-${dateStr}-voice`,
            type: 'voice',
            time: '21:30',
            durationSeconds: 75 + (i % 45),
            transcriptOriginal: sample.note,
            transcriptEdited: sample.note,
            status: 'completed',
          },
          {
            id: `block-${dateStr}-text`,
            type: 'text',
            time: '21:35',
            text: `Reflexión del día: cerramos con ánimo ${sample.mood}/5 y foco en lo importante.`,
          },
        ],
        durationSeconds: 75 + (i % 45),
        transcriptOriginal: sample.note,
        transcriptEdited: sample.note,
        status: 'completed',
        mood: sample.mood,
        score: sample.score,
        tags: sample.tags,
        summary: sample.summary,
        additionalNote: 'Grabado desde el celular al final de la jornada.',
        recordedAt: `${dateStr}T21:30:00Z`,
        updatedAt: `${dateStr}T21:30:00Z`,
      });
    }
  }

  return { habits, logs, entries };
}
