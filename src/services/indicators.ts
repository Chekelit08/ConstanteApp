/**
 * Indicadores vivos del Plan 2026: toman datos reales de cada módulo
 * (finanzas, facu, personas, fe, pantalla, hábitos) y los comparan con tus metas.
 */
import { Habit, HabitLog } from '../types/habit';
import { LifeStore } from '../types/life';
import { isHabitCompleted } from './dataStorage';
import { addDays, getTodayDateString, getWeekDays } from '../utils/dateUtils';
import { computeMonth, goalProgress } from '../views/FinanceView';
import { contactStatus } from '../views/PeopleView';
import { screenStreak } from '../views/TimeView';
import { currentMonthKey, formatCompactArs, formatDuration, formatMoney, getAllFocusSessions, isoToLocalDate, isStudySession, pct, txArs } from '../utils/lifeUtils';

export interface Indicator {
  roleId: string;
  label: string;
  value: string;
  ok: boolean | null; // null = sin datos
  progress?: number; // 0-100
}

function habitCountInDays(habit: Habit | undefined, logs: Record<string, HabitLog>, days: string[]): number {
  if (!habit) return 0;
  return days.filter((d) => isHabitCompleted(habit, logs[d]?.values?.[habit.id])).length;
}

export function computeIndicators(store: LifeStore, habits: Habit[], logs: Record<string, HabitLog>, userId: string): Indicator[] {
  const today = getTodayDateString();
  const week = getWeekDays(today);
  const weekSet = new Set(week);
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const out: Indicator[] = [];
  const rate = store.financeConfig.usdRate;
  const habitById = (id: string) => habits.find((h) => h.id === id && h.status === 'active');

  // ── A. Universidad
  const studyByDate: Record<string, number> = {};
  Object.values(store.studyLogs).forEach((l) => (studyByDate[l.date] = (studyByDate[l.date] || 0) + l.minutes));
  getAllFocusSessions(userId)
    .filter(isStudySession)
    .forEach((s) => (studyByDate[s.date] = (studyByDate[s.date] || 0) + (Number(s.durationMinutes) || 0)));
  const goalMin = store.prefs.dailyStudyGoalMinutes || 180;
  const avgStudy = last7.reduce((s, d) => s + (studyByDate[d] || 0), 0) / 7;
  out.push({ roleId: 'role-uni', label: 'Estudio real (prom. 7 días)', value: `${formatDuration(avgStudy)} / ${formatDuration(goalMin)}`, ok: avgStudy >= goalMin, progress: pct(avgStudy, goalMin) });
  const parciales = Object.values(store.evaluations).filter((e) => (e.type === 'parcial' || e.type === 'recuperatorio') && e.status !== 'pendiente');
  const aprob = parciales.filter((e) => e.status === 'aprobado').length;
  out.push({ roleId: 'role-uni', label: 'Parciales aprobados', value: parciales.length ? `${aprob}/${parciales.length}` : 'sin datos', ok: parciales.length ? aprob === parciales.length : null, progress: parciales.length ? pct(aprob, parciales.length) : undefined });
  const recursadas = Object.values(store.subjects).filter((s) => s.status === 'recursar').length;
  out.push({ roleId: 'role-uni', label: 'Recursadas', value: String(recursadas), ok: Object.keys(store.subjects).length ? recursadas === 0 : null });

  // ── B. Trabajo SMV
  const implemented = Object.values(store.ideas).filter((i) => i.status === 'implementada').length;
  out.push({ roleId: 'role-work', label: 'Mejoras / automatizaciones implementadas', value: `${implemented} / 1`, ok: implemented >= 1, progress: pct(Math.min(implemented, 1), 1) });
  const salaries = Object.values(store.transactions).filter((t) => t.type === 'income' && t.category === 'Sueldo SMV').sort((a, b) => b.date.localeCompare(a.date));
  const lastSalary = salaries[0] ? txArs(salaries[0], rate) : 0;
  const { salaryGoalStart, salaryGoalEnd } = store.financeConfig;
  out.push({
    roleId: 'role-work',
    label: `Sueldo (meta ${formatCompactArs(salaryGoalEnd)})`,
    value: lastSalary ? formatCompactArs(lastSalary) : 'sin datos',
    ok: lastSalary ? lastSalary >= salaryGoalEnd : null,
    progress: lastSalary ? pct(Math.max(0, lastSalary - salaryGoalStart), salaryGoalEnd - salaryGoalStart) : undefined,
  });

  // ── C. Elegidos
  const people = Object.values(store.people);
  const interactions = Object.values(store.interactions);
  const elegidos = people.filter((p) => p.group === 'elegidos');
  const weekInter = interactions.filter((i) => weekSet.has(i.date));
  const timeWithThem = weekInter.some((i) => i.kind !== 'oracion' && elegidos.some((e) => e.id === i.personId));
  const prayed = elegidos.filter((e) => weekInter.some((i) => i.personId === e.id && i.kind === 'oracion')).length;
  out.push({ roleId: 'role-service', label: 'Tiempo con uno de los chicos (semana)', value: elegidos.length ? (timeWithThem ? 'Sí ✓' : 'Todavía no') : 'cargá a tus 2–3', ok: elegidos.length ? timeWithThem : null });
  out.push({ roleId: 'role-service', label: 'Oré por cada uno (semana)', value: elegidos.length ? `${prayed}/${elegidos.length}` : '—', ok: elegidos.length ? prayed === elegidos.length : null, progress: elegidos.length ? pct(prayed, elegidos.length) : undefined });

  // ── D. Familia
  const m = computeMonth(Object.values(store.transactions), currentMonthKey(), rate);
  const momMin = store.financeConfig.momContributionMin;
  out.push({ roleId: 'role-family', label: 'Aporte a mamá (mes)', value: `${formatCompactArs(m.momContribution)} / ${formatCompactArs(momMin)}`, ok: m.momContribution >= momMin, progress: pct(m.momContribution, momMin) });
  const mama = store.people['person-mama'];
  const mamaWeek = mama ? weekInter.filter((i) => i.personId === mama.id && i.kind !== 'oracion').length : 0;
  const momHabit = habitCountInDays(habitById('plan-mama'), logs, week);
  const momMoments = Math.max(mamaWeek, momHabit);
  out.push({ roleId: 'role-family', label: 'Momentos con mamá (semana)', value: String(momMoments), ok: momMoments >= 1 });
  const papa = store.people['person-papa'];
  if (papa) {
    const st = contactStatus(papa, interactions, today);
    out.push({ roleId: 'role-family', label: 'Ver a papá cada 7–15 días', value: st.days === undefined ? 'sin registro' : `hace ${st.days} días`, ok: st.days === undefined ? null : st.days <= 15 });
  }

  // ── E. Fe
  const readingDays = new Set(Object.values(store.readings).map((r) => r.date));
  const bible = habitById('plan-biblia');
  const bibleDays = last7.filter((d) => readingDays.has(d) || (bible ? isHabitCompleted(bible, logs[d]?.values?.[bible.id]) : false)).length;
  out.push({ roleId: 'role-faith', label: 'Lectura bíblica (últimos 7 días)', value: `${bibleDays}/7`, ok: bibleDays >= 6, progress: pct(bibleDays, 7) });

  // ── F. Salud
  const gym = habitById('plan-gym');
  const gymFromTracker = new Set(
    Object.values(store.timeEntries)
      .filter((e) => e.categoryId === 'tc-gym' && weekSet.has(isoToLocalDate(e.start)))
      .map((e) => isoToLocalDate(e.start))
  ).size;
  const gymCount = Math.max(habitCountInDays(gym, logs, week), gymFromTracker);
  out.push({ roleId: 'role-health', label: 'Entrenamientos (semana)', value: `${gymCount} / 2–3`, ok: gymCount >= 2, progress: pct(Math.min(gymCount, 3), 3) });

  // ── G. Personal
  const screenLimit = store.screenConfig.dailyLimitMinutes;
  const screenLogs = last7.map((d) => store.screenLogs[d]).filter(Boolean);
  const avgScreen = screenLogs.length ? screenLogs.reduce((s, l) => s + l!.totalMinutes, 0) / screenLogs.length : 0;
  out.push({ roleId: 'role-personal', label: 'Pantalla (prom. 7 días)', value: screenLogs.length ? `${formatDuration(avgScreen)} / ${formatDuration(screenLimit)}` : 'sin registros', ok: screenLogs.length ? avgScreen <= screenLimit : null });
  out.push({ roleId: 'role-personal', label: 'Racha bajo el límite de pantalla', value: `${screenStreak(store.screenLogs, screenLimit, today)} días`, ok: null });

  // ── Finanzas (visión)
  const goals = Object.values(store.goals).filter((g) => !g.archived);
  const primary = goals.find((g) => g.isPrimary) || goals[0];
  if (primary) {
    const v = goalProgress(primary, Object.values(store.transactions), goals, rate);
    out.push({ roleId: 'finance', label: `${primary.name}`, value: `${formatMoney(v, primary.currency)} / ${formatMoney(primary.targetAmount, primary.currency)}`, ok: v >= primary.targetAmount, progress: pct(v, primary.targetAmount) });
  }
  out.push({ roleId: 'finance', label: `Tasa de ahorro del mes (meta ${store.financeConfig.savingsPercent}%)`, value: m.income ? `${Math.round(m.savingRate)}%` : 'sin ingresos', ok: m.income ? m.savingRate >= store.financeConfig.savingsPercent : null, progress: m.income ? pct(m.savingRate, store.financeConfig.savingsPercent) : undefined });

  return out;
}
