export interface TranscribeResponse {
  transcript: string;
}

export interface SummarizeResponse {
  summary: string;
  tags: string[];
}

export async function transcribeAudioApi(
  audioBase64: string,
  mimeType: string,
  customApiKey?: string
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (customApiKey && customApiKey.trim()) {
    headers['x-gemini-key'] = customApiKey.trim();
  }

  const response = await fetch('/api/transcribe', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      audioBase64,
      mimeType,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${response.status} en la transcripción`);
  }

  const data: TranscribeResponse = await response.json();
  return data.transcript;
}

export async function summarizeTranscriptApi(
  transcript: string,
  customApiKey?: string
): Promise<SummarizeResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (customApiKey && customApiKey.trim()) {
    headers['x-gemini-key'] = customApiKey.trim();
  }

  const response = await fetch('/api/summarize', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      transcript,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${response.status} al generar el resumen`);
  }

  const data: SummarizeResponse = await response.json();
  return data;
}

export interface MonthlyBalanceApiParams {
  monthStats: any;
  journalEntries: any[];
  focusStats?: any;
  mission?: string;
  vision?: string;
  customApiKey?: string;
}

export async function generateMonthlyBalanceApi(
  params: MonthlyBalanceApiParams
): Promise<{
  resumen: string;
  logros: string[];
  a_mejorar: string[];
  patrones: string[];
  temas_del_diario: string[];
  sugerencias: string[];
  habito_foco: string;
  frase_final: string;
}> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (params.customApiKey && params.customApiKey.trim()) {
    headers['x-gemini-key'] = params.customApiKey.trim();
  }

  const response = await fetch('/api/balance', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      monthStats: params.monthStats,
      journalEntries: params.journalEntries,
      focusStats: params.focusStats,
      mission: params.mission,
      vision: params.vision,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${response.status} al generar el balance mensual`);
  }

  return await response.json();
}

export async function transcribeHandwritingApi(
  images: string[], // array of base64 data URIs
  customApiKey?: string
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (customApiKey && customApiKey.trim()) {
    headers['x-gemini-key'] = customApiKey.trim();
  }

  const response = await fetch('/api/transcribe-handwriting', {
    method: 'POST',
    headers,
    body: JSON.stringify({ images }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${response.status} en la transcripción de la foto`);
  }

  const data = await response.json();
  return data.transcript || '';
}

export interface WeeklyReviewApiParams {
  weekStats: any;
  journalEntries: any[];
  mission?: string;
  vision?: string;
  customApiKey?: string;
}

export async function generateWeeklyReviewApi(
  params: WeeklyReviewApiParams
): Promise<{
  logros: string[];
  a_mejorar: string;
  objetivo: string;
}> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (params.customApiKey && params.customApiKey.trim()) {
    headers['x-gemini-key'] = params.customApiKey.trim();
  }

  const response = await fetch('/api/weekly-review', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      weekStats: params.weekStats,
      journalEntries: params.journalEntries,
      mission: params.mission,
      vision: params.vision,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${response.status} al generar la revisión semanal`);
  }

  return await response.json();
}


