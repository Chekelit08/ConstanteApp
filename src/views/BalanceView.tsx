import React, { useState, useMemo } from 'react';
import { Habit, HabitLog } from '../types/habit';
import {
  JournalEntry,
  normalizeJournalEntry,
  getCombinedEntryText,
  hasActualJournalContent,
} from '../types/journal';
import { UserSettings } from '../types/settings';
import { MonthlyBalanceData } from '../types/balance';
import { FocusSession } from '../types/focus';
import {
  MONTH_NAMES,
  getTodayDateString,
  getDaysInMonth,
  parseDateString,
  formatArgentineDate,
} from '../utils/dateUtils';
import { calculateHabitExpectedAndCompleted } from '../utils/statsCalculator';
import { generateMonthlyBalanceApi } from '../services/geminiClient';
import { getLocalData, setLocalData } from '../services/dataStorage';
import {
  Compass,
  Sparkles,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer,
  Share2,
  Plus,
  RefreshCw,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Layers,
  Quote,
} from 'lucide-react';

interface BalanceViewProps {
  habits: Habit[];
  logs: Record<string, HabitLog>;
  entries: Record<string, JournalEntry>;
  settings: UserSettings;
  onSaveSettings: (settings: Partial<UserSettings>) => void;
  onOpenCreateHabitWithData: (habitData: Partial<Habit>) => void;
  userId: string;
}

export const BalanceView: React.FC<BalanceViewProps> = ({
  habits,
  logs,
  entries,
  settings,
  onSaveSettings,
  onOpenCreateHabitWithData,
  userId,
}) => {
  const todayStr = getTodayDateString();
  const today = useMemo(() => parseDateString(todayStr), [todayStr]);

  // Current year & month
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());

  // Privacy notice consent
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState<boolean>(
    Boolean(settings.balancePrivacyAccepted)
  );

  // Balances history stored locally & in cloud
  const [balanceHistory, setBalanceHistory] = useState<Record<string, MonthlyBalanceData>>(() => {
    return getLocalData<Record<string, MonthlyBalanceData>>(`balances_${userId}`, {});
  });

  // UI state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const currentBalance = balanceHistory[monthKey] || null;

  const isCurrentMonth =
    selectedYear === today.getFullYear() && selectedMonth === today.getMonth();

  // Days in selected month
  const daysInSelectedMonth = useMemo(() => {
    const allDays = getDaysInMonth(selectedYear, selectedMonth);
    // If current month, only up to today!
    if (isCurrentMonth) {
      return allDays.filter((d) => d <= todayStr);
    }
    return allDays;
  }, [selectedYear, selectedMonth, isCurrentMonth, todayStr]);

  // Previous month key & days for comparison
  const previousMonthInfo = useMemo(() => {
    const prevDate = new Date(selectedYear, selectedMonth - 1, 1);
    const pYear = prevDate.getFullYear();
    const pMonth = prevDate.getMonth();
    const pKey = `${pYear}-${String(pMonth + 1).padStart(2, '0')}`;
    const pDays = getDaysInMonth(pYear, pMonth);
    return { year: pYear, month: pMonth, key: pKey, days: pDays };
  }, [selectedYear, selectedMonth]);

  // Count days with data in selected month
  const daysWithDataCount = useMemo(() => {
    let count = 0;
    daysInSelectedMonth.forEach((d) => {
      const hasLog =
        logs[d] &&
        logs[d].values &&
        Object.values(logs[d].values).some((v) => v !== false && v !== 0 && v !== undefined);
      const hasEntry = hasActualJournalContent(entries[d]);
      if (hasLog || hasEntry) {
        count++;
      }
    });
    return count;
  }, [daysInSelectedMonth, logs, entries]);

  // Calculate current month statistics
  const currentMonthStats = useMemo(() => {
    const active = habits.filter((h) => h.status !== 'archived');
    let totalScheduled = 0;
    let totalCompleted = 0;

    const habitBreakdown = active.map((h) => {
      const { expected, completed, rate } = calculateHabitExpectedAndCompleted(
        h,
        logs,
        daysInSelectedMonth,
        todayStr
      );
      totalScheduled += expected;
      totalCompleted += completed;

      // Previous month performance
      const prevStats = calculateHabitExpectedAndCompleted(
        h,
        logs,
        previousMonthInfo.days,
        todayStr
      );

      return {
        habitId: h.id,
        name: h.name,
        emoji: h.emoji,
        rate,
        completed,
        scheduled: expected,
        previousRate: prevStats.expected > 0 ? prevStats.rate : null,
      };
    });

    const overallRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

    // Previous month overall
    let prevTotalScheduled = 0;
    let prevTotalCompleted = 0;
    active.forEach((h) => {
      const p = calculateHabitExpectedAndCompleted(h, logs, previousMonthInfo.days, todayStr);
      prevTotalScheduled += p.expected;
      prevTotalCompleted += p.completed;
    });

    const previousMonthRate =
      prevTotalScheduled > 0 ? Math.round((prevTotalCompleted / prevTotalScheduled) * 100) : null;

    return {
      overallRate,
      previousMonthRate,
      habitBreakdown,
      totalScheduled,
      totalCompleted,
    };
  }, [habits, logs, daysInSelectedMonth, previousMonthInfo, todayStr]);

  // Extract journal entries for the month using normalized entries and getCombinedEntryText
  const monthJournalEntries = useMemo(() => {
    const list: any[] = [];
    daysInSelectedMonth.forEach((d) => {
      const entry = entries[d];
      if (entry) {
        const norm = normalizeJournalEntry(entry);
        const text = getCombinedEntryText(norm);
        if (text.trim().length > 0 || entry.mood || entry.score) {
          list.push({
            date: d,
            text: text.trim(),
            mood: entry.mood,
            rating: entry.score,
            tags: entry.tags || [],
          });
        }
      }
    });
    return list;
  }, [daysInSelectedMonth, entries]);

  // Focus statistics for selected month
  const monthFocusStats = useMemo(() => {
    const allSessions = getLocalData<FocusSession[]>(`focus_sessions_${userId}`, []);
    const inMonth = allSessions.filter((s) => daysInSelectedMonth.includes(s.date));
    const totalMinutes = inMonth.reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0);

    const tagDist: Record<string, number> = {};
    inMonth.forEach((s) => {
      const tag = s.tag || 'General';
      tagDist[tag] = (tagDist[tag] || 0) + (Number(s.durationMinutes) || 0);
    });

    return {
      totalFocusMinutes: totalMinutes,
      sessionsCount: inMonth.length,
      tagDistribution: tagDist,
    };
  }, [daysInSelectedMonth, userId]);

  // Handle privacy consent
  const handleAcceptPrivacy = () => {
    setHasAcceptedPrivacy(true);
    onSaveSettings({ balancePrivacyAccepted: true });
  };

  // Generate balance with Gemini API
  const handleGenerateBalance = async () => {
    if (daysWithDataCount < 7) {
      setGenerationError(
        'Faltan datos suficientes: se requieren al menos 7 días con hábitos o diario registrados en el mes para generar un balance honesto y fundamentado.'
      );
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const result = await generateMonthlyBalanceApi({
        monthStats: {
          period: `${MONTH_NAMES[selectedMonth]} ${selectedYear}`,
          isPartial: isCurrentMonth,
          overallRate: `${currentMonthStats.overallRate}%`,
          previousMonthRate:
            currentMonthStats.previousMonthRate !== null
              ? `${currentMonthStats.previousMonthRate}%`
              : 'Sin datos previos',
          daysWithData: daysWithDataCount,
          habits: currentMonthStats.habitBreakdown,
        },
        journalEntries: monthJournalEntries,
        focusStats: monthFocusStats,
        mission: settings.mission || '',
        vision: settings.vision || '',
        customApiKey: settings.geminiApiKey,
      });

      const newBalance: MonthlyBalanceData = {
        id: monthKey,
        year: selectedYear,
        month: selectedMonth,
        monthName: MONTH_NAMES[selectedMonth],
        isPartial: isCurrentMonth,
        generatedAt: new Date().toISOString(),
        overallRate: currentMonthStats.overallRate,
        previousMonthRate: currentMonthStats.previousMonthRate,
        habitRates: currentMonthStats.habitBreakdown,
        resumen: result.resumen,
        logros: result.logros || [],
        a_mejorar: result.a_mejorar || [],
        patrones: result.patrones || [],
        temas_del_diario: result.temas_del_diario || [],
        sugerencias: result.sugerencias || [],
        habito_foco: result.habito_foco || '',
        frase_final: result.frase_final || '',
      };

      const updatedHistory = {
        ...balanceHistory,
        [monthKey]: newBalance,
      };

      setBalanceHistory(updatedHistory);
      setLocalData(`balances_${userId}`, updatedHistory);
    } catch (err: any) {
      console.error('Error generating monthly balance:', err);
      setGenerationError(
        err?.message || 'Ocurrió un error al comunicarse con Gemini. Revisá tu conexión o clave de API.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Navigation between months
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(11);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    const isFuture =
      selectedYear > today.getFullYear() ||
      (selectedYear === today.getFullYear() && selectedMonth >= today.getMonth());
    if (isFuture) return;

    if (selectedMonth === 11) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(0);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Copy to clipboard
  const handleCopy = () => {
    if (!currentBalance) return;
    const textToCopy = `BALANCE MENSUAL · ${currentBalance.monthName.toUpperCase()} ${currentBalance.year}
Cumplimiento Global: ${currentBalance.overallRate}%

RESUMEN:
${currentBalance.resumen}

LOGROS:
${currentBalance.logros.map((l) => `• ${l}`).join('\n')}

A MEJORAR:
${currentBalance.a_mejorar.map((a) => `• ${a}`).join('\n')}

PATRONES HABITOS/ANIMO:
${currentBalance.patrones.map((p) => `• ${p}`).join('\n')}

TEMAS DEL DIARIO:
${currentBalance.temas_del_diario.map((t) => `• ${t}`).join('\n')}

SUGERENCIAS PARA EL PRÓXIMO MES:
${currentBalance.sugerencias.map((s) => `• ${s}`).join('\n')}

HÁBITO FOCO:
${currentBalance.habito_foco}

"${currentBalance.frase_final}"
`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // Print PDF
  const handlePrint = () => {
    window.print();
  };

  // Share
  const handleShare = async () => {
    if (!currentBalance) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Balance de ${currentBalance.monthName} - CONSTANTE`,
          text: `Mi balance mensual de ${currentBalance.monthName} en CONSTANTE. Cumplimiento: ${currentBalance.overallRate}%.`,
        });
      } catch (e) {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-app">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-muted">
            ANÁLISIS EDITORIAL CON GEMINI
          </span>
          <h2 className="font-['Oswald'] text-3xl sm:text-4xl font-bold uppercase tracking-wider text-main mt-0.5 flex items-center gap-2.5">
            <Compass className="w-8 h-8 text-accent shrink-0" />
            <span>Balance Mensual</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Cruce reflexivo entre tus hábitos diarios, transcripciones de voz y bitácora íntima.
          </p>
        </div>

        {/* Month Selector Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface-elevated rounded-xl p-1 border border-app">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-muted hover:text-main hover:bg-surface transition cursor-pointer"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-main uppercase font-['Oswald'] tracking-wider">
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isCurrentMonth}
              className="p-1.5 rounded-lg text-muted hover:text-main hover:bg-surface transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* PRIVACY NOTICE CARD (Shown before first generation or if not accepted) */}
      {!hasAcceptedPrivacy && (
        <div className="p-6 rounded-3xl bg-surface border border-app space-y-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-['Oswald'] text-lg font-bold uppercase tracking-wider text-main">
                Aviso de Privacidad y Procesamiento con Gemini
              </h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Antes de generar tu primer balance mensual, te contamos con total transparencia qué datos se analizan:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-surface-elevated border border-app space-y-1">
              <span className="font-bold text-main block">1. Hábitos del mes</span>
              <p className="text-muted text-[11px]">
                Porcentajes de cumplimiento, rachas, días perfectos y rendimiento por día de la semana.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-surface-elevated border border-app space-y-1">
              <span className="font-bold text-main block">2. Entradas del diario</span>
              <p className="text-muted text-[11px]">
                Transcripciones y notas del mes, estado de ánimo calificado y etiquetas temáticas.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-surface-elevated border border-app space-y-1">
              <span className="font-bold text-main block">3. Misión & Visión</span>
              <p className="text-muted text-[11px]">
                Si las cargaste en Ajustes, el coach alineará sus reflexiones con tus objetivos de vida.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-app">
            <span className="text-[11px] text-muted font-mono">
              Los datos se envían de forma segura y no se comparten con terceros.
            </span>
            <button
              type="button"
              onClick={handleAcceptPrivacy}
              className="px-5 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 transition cursor-pointer shadow-xs shrink-0"
            >
              Entendido y Aceptar
            </button>
          </div>
        </div>
      )}

      {/* MONTH PREVIEW / GENERATION ACTION BAR */}
      <div className="p-6 rounded-3xl bg-surface border border-app shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
                {isCurrentMonth ? 'BALANCE PARCIAL EN CURSO' : 'BALANCE MENSUAL CERRADO'}
              </span>
              {isCurrentMonth && (
                <span className="px-2 py-0.5 rounded-full bg-accent-subtle text-accent text-[10px] font-bold">
                  Mes en curso
                </span>
              )}
            </div>
            <h3 className="font-['Oswald'] text-2xl font-bold uppercase tracking-wider text-main mt-1">
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Registros disponibles: <strong className="text-main font-semibold">{daysWithDataCount} días con datos</strong> en el período (mínimo 7 requeridos).
            </p>
          </div>

          <button
            type="button"
            disabled={isGenerating || !hasAcceptedPrivacy}
            onClick={handleGenerateBalance}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 transition shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Analizando con Gemini…</span>
              </>
            ) : currentBalance ? (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Regenerar Balance</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generar Balance de {MONTH_NAMES[selectedMonth]}</span>
              </>
            )}
          </button>
        </div>

        {/* Error message */}
        {generationError && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{generationError}</p>
              <p className="text-[11px] opacity-80 mt-1">
                Asegurate de haber registrado al menos 7 días de hábitos o notas en este mes.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* BALANCE REPORT CONTENT */}
      {currentBalance ? (
        <div className="space-y-6 animate-in fade-in">
          {/* Top Editorial Bar: Action buttons & comparison */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-surface border border-app shadow-xs">
            {/* Global rate & previous month comparison */}
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted">
                  CUMPLIMIENTO GLOBAL
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-mono text-3xl font-black text-main">
                    {currentBalance.overallRate}%
                  </span>
                  {currentBalance.previousMonthRate !== null ? (
                    <div className="flex items-center gap-1 text-xs font-semibold">
                      {currentBalance.overallRate >= currentBalance.previousMonthRate ? (
                        <span className="text-accent flex items-center gap-0.5">
                          <TrendingUp className="w-3.5 h-3.5" />
                          +{currentBalance.overallRate - currentBalance.previousMonthRate}%
                        </span>
                      ) : (
                        <span className="text-muted flex items-center gap-0.5">
                          <TrendingDown className="w-3.5 h-3.5" />
                          {currentBalance.overallRate - currentBalance.previousMonthRate}%
                        </span>
                      )}
                      <span className="text-muted font-normal">vs mes anterior</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted font-mono">— (primer mes)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Editorial Action buttons: Copiar, Exportar PDF, Compartir */}
            <div className="flex items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-elevated border border-app text-xs font-semibold text-main hover:bg-surface transition cursor-pointer"
                title="Copiar balance al portapapeles"
              >
                <Copy className="w-3.5 h-3.5 text-muted" />
                <span>{copiedNotification ? '¡Copiado!' : 'Copiar'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-elevated border border-app text-xs font-semibold text-main hover:bg-surface transition cursor-pointer"
                title="Imprimir o exportar como PDF"
              >
                <Printer className="w-3.5 h-3.5 text-muted" />
                <span>Exportar PDF</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 transition cursor-pointer shadow-xs"
                title="Compartir balance"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Compartir</span>
              </button>
            </div>
          </div>

          {/* 1. Resumen Editorial */}
          <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-app shadow-xs space-y-3">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-accent">
              DIAGNÓSTICO DEL COACH
            </span>
            <p className="text-base sm:text-lg text-main leading-relaxed font-serif italic">
              «{currentBalance.resumen}»
            </p>
          </div>

          {/* 2. Grid: Logros (con tildes) y A Mejorar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logros */}
            <div className="p-6 rounded-3xl bg-surface border border-app shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <h3 className="font-['Oswald'] text-xl font-bold uppercase tracking-wider text-main">
                  Logros del Mes
                </h3>
              </div>
              <ul className="space-y-3">
                {currentBalance.logros.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-main leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* A Mejorar */}
            <div className="p-6 rounded-3xl bg-surface border border-app shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-muted" />
                <h3 className="font-['Oswald'] text-xl font-bold uppercase tracking-wider text-main">
                  Puntos a Ajustar
                </h3>
              </div>
              <ul className="space-y-3">
                {currentBalance.a_mejorar.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-main leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 3. Patrones Conductuales & Temas del Diario */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patrones */}
            <div className="p-6 rounded-3xl bg-surface border border-app shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-accent" />
                <h3 className="font-['Oswald'] text-xl font-bold uppercase tracking-wider text-main">
                  Patrones & Relaciones
                </h3>
              </div>
              <p className="text-xs text-muted -mt-2">
                Vínculos detectados entre tus hábitos, tu estado de ánimo y tu nivel de energía.
              </p>
              <ul className="space-y-3 pt-1">
                {currentBalance.patrones.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-main leading-relaxed">
                    <span className="text-accent font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Temas del Diario */}
            <div className="p-6 rounded-3xl bg-surface border border-app shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Quote className="w-5 h-5 text-muted" />
                <h3 className="font-['Oswald'] text-xl font-bold uppercase tracking-wider text-main">
                  Temas Recurrentes en la Bitácora
                </h3>
              </div>
              <p className="text-xs text-muted -mt-2">
                Asuntos, preocupaciones y emociones reiteradas en tus grabaciones.
              </p>
              <ul className="space-y-3 pt-1">
                {currentBalance.temas_del_diario.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-main leading-relaxed">
                    <span className="text-muted font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 4. Sugerencias con botón "Convertir en hábito" */}
          <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-app shadow-xs space-y-4">
            <div>
              <h3 className="font-['Oswald'] text-2xl font-bold uppercase tracking-wider text-main flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                <span>Sugerencias para el Próximo Mes</span>
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Acciones concretas y dosificadas que podés transformar en hábitos con un solo clic.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {currentBalance.sugerencias.map((sug, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-surface-elevated border border-app flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <p className="text-xs text-main leading-relaxed flex-1">
                    {sug}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenCreateHabitWithData({
                        name: sug.slice(0, 40),
                        description: sug,
                        category: 'Salud & Bienestar',
                        emoji: '✨',
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 transition cursor-pointer shadow-2xs self-start sm:self-auto shrink-0"
                    title="Crear un hábito a partir de esta sugerencia"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Convertir en Hábito</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Hábito Foco Destacado & Frase Final */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-6 sm:p-8 rounded-3xl bg-surface border border-app shadow-xs space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-accent">
                HÁBITO FOCO PRIORITARIO
              </span>
              <h4 className="font-['Oswald'] text-xl font-bold uppercase tracking-wider text-main">
                {currentBalance.habito_foco}
              </h4>
            </div>

            <div className="p-6 rounded-3xl bg-surface-elevated border border-app shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
                MENSAJE DE CIERRE
              </span>
              <p className="font-serif italic text-sm text-main my-2">
                «{currentBalance.frase_final}»
              </p>
              <span className="text-[10px] font-mono text-muted">
                Generado: {new Date(currentBalance.generatedAt).toLocaleDateString('es-AR')}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center rounded-3xl bg-surface border border-app space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface-elevated text-accent mx-auto flex items-center justify-center">
            <Compass className="w-6 h-6" />
          </div>
          <h3 className="font-['Oswald'] text-xl font-bold uppercase tracking-wider text-main">
            Sin balance generado para {MONTH_NAMES[selectedMonth]} {selectedYear}
          </h3>
          <p className="text-xs text-muted max-w-md mx-auto">
            {daysWithDataCount < 7
              ? `Este mes cuenta con ${daysWithDataCount} días registrados. Necesitás al menos 7 días con datos para generar un balance fundamentado.`
              : `Tenés ${daysWithDataCount} días de hábitos y bitácora listos. Presioná el botón de arriba para generar tu análisis honesto y cálido con Gemini.`}
          </p>
        </div>
      )}
    </div>
  );
};
