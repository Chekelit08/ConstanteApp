import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasEnvKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'No se envió audio para transcribir.' });
    }

    const clientKey = (req.headers['x-gemini-key'] as string) || '';
    const apiKey = clientKey.trim() || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error:
          'No se encontró una clave de Gemini API. Por favor agregá tu clave en la pestaña Ajustes o en el entorno del servidor.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const cleanMime = mimeType ? mimeType.split(';')[0] : 'audio/webm';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: cleanMime,
            data: audioBase64,
          },
        },
        {
          text: 'Transcribí este audio en español rioplatense (Argentina). Devolvé una transcripción fiel y limpia, con puntuación, signos de interrogación/exclamación y párrafos naturales. Respetá modismos como che, vos, re, recontra, etc. No inventes contenido ni añadas comentarios introductorios o notas extras, devolvé solo el texto de la transcripción.',
        },
      ],
    });

    res.json({ transcript: response.text || '' });
  } catch (error: any) {
    console.error('Error transcribing audio:', error);
    res.status(500).json({
      error: error?.message || 'Error al procesar la transcripción con Gemini.',
    });
  }
});

app.post('/api/summarize', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: 'No se envió texto para resumir.' });
    }

    const clientKey = (req.headers['x-gemini-key'] as string) || '';
    const apiKey = clientKey.trim() || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'No se encontró clave de Gemini API.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `Analizá la siguiente transcripción de un diario personal íntimo en español rioplatense y respondé EXCLUSIVAMENTE con un JSON válido con este formato:
{
  "summary": "Resumen sobrio y empático de 2 o 3 oraciones cortas sobre lo que ocurrió o cómo se sintió la persona.",
  "tags": ["Etiqueta1", "Etiqueta2", "Etiqueta3"]
}
Las 3 etiquetas deben ser palabras o frases cortas (ej: "Trabajo", "Descanso", "Entrenamiento", "Familia", "Reflexión").

Texto:
"""${transcript}"""`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    let parsed: { summary: string; tags: string[] } = { summary: '', tags: [] };
    try {
      parsed = JSON.parse(response.text || '{}');
    } catch (pErr) {
      console.warn('Failed parsing JSON summary:', pErr);
      parsed = {
        summary: response.text?.slice(0, 200) || '',
        tags: ['Diario', 'Voz', 'Reflexión'],
      };
    }

    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating summary:', error);
    res.status(500).json({
      error: error?.message || 'Error al generar resumen.',
    });
  }
});

app.post('/api/transcribe-handwriting', async (req, res) => {
  try {
    const { images } = req.body; // array of base64 data URIs or base64 strings
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'No se enviaron imágenes para transcribir.' });
    }

    const clientKey = (req.headers['x-gemini-key'] as string) || '';
    const apiKey = clientKey.trim() || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'No se encontró clave de Gemini API.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const parts: any[] = [];
    images.forEach((img: string) => {
      // Clean base64 header if present
      let rawBase64 = img;
      let mime = 'image/jpeg';
      if (img.startsWith('data:')) {
        const match = img.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mime = match[1];
          rawBase64 = match[2];
        }
      }
      parts.push({
        inlineData: {
          mimeType: mime,
          data: rawBase64,
        },
      });
    });

    parts.push({
      text: 'Transcribí el texto manuscrito de esta(s) imagen(es) en español rioplatense (Argentina). Respetá los párrafos y saltos de línea. No inventes contenido. Si alguna palabra o frase no se comprende claramente, escribí [ilegible]. Devolvé únicamente el texto transcripto sin comentarios introductorios, títulos ni notas añadidas.',
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: parts,
    });

    res.json({ transcript: response.text || '' });
  } catch (error: any) {
    console.error('Error transcribing handwriting:', error);
    res.status(500).json({
      error: error?.message || 'Error al transcribir texto manuscrito con Gemini.',
    });
  }
});

app.post('/api/weekly-review', async (req, res) => {
  try {
    const { weekStats, journalEntries, mission, vision } = req.body;
    const clientKey = (req.headers['x-gemini-key'] as string) || '';
    const apiKey = clientKey.trim() || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'No se encontró clave de Gemini API.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `Sos un coach de hábitos honesto, cálido y directo, y hablás en español rioplatense. Revisás la semana que termina de una persona. Respondé SOLO con un objeto JSON con estas claves:
{
  "logros": ["Logro 1 con datos concretos", "Logro 2 con datos", "Logro 3 con datos"],
  "a_mejorar": "1 aspecto clave a reforzar con honestidad y sugerencia práctica",
  "objetivo": "1 objetivo claro y alcanzable para la semana entrante"
}
Reglas: basate únicamente en los datos recibidos y no inventes nada; si hay pocos datos, decilo amablemente. No hagas diagnósticos médicos ni psicológicos.`;

    const userPrompt = `Datos de la semana:
--- HÁBITOS Y ESTADÍSTICAS ---
${JSON.stringify(weekStats || {}, null, 2)}

--- DIARIO DE LA SEMANA ---
${JSON.stringify(journalEntries || [], null, 2)}

${mission ? `--- MISIÓN ---\n${mission}\n` : ''}
${vision ? `--- VISIÓN ---\n${vision}\n` : ''}`;

    const generateReview = async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });
      return response.text || '';
    };

    const cleanReviewJson = (str: string) => {
      let cleaned = str.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
      if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
      return cleaned.trim();
    };

    let rawReview = await generateReview();
    let parsed: any;
    try {
      parsed = JSON.parse(cleanReviewJson(rawReview));
    } catch (parseErr) {
      console.warn('Initial weekly review JSON parse failed, retrying once...', parseErr);
      rawReview = await generateReview();
      try {
        parsed = JSON.parse(cleanReviewJson(rawReview));
      } catch (secondErr) {
        return res.status(502).json({
          error: 'No se pudo interpretar el formato de respuesta del coach. Por favor volvé a intentar.',
        });
      }
    }

    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating weekly review:', error);
    res.status(500).json({
      error: error?.message || 'Error al generar la revisión semanal.',
    });
  }
});

app.post('/api/balance', async (req, res) => {
  try {
    const { monthStats, journalEntries, focusStats, mission, vision } = req.body;
    if (!monthStats) {
      return res.status(400).json({ error: 'Faltan las estadísticas del mes.' });
    }

    const clientKey = (req.headers['x-gemini-key'] as string) || '';
    const apiKey = clientKey.trim() || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error:
          'No se encontró una clave de Gemini API. Por favor agregá tu clave en la pestaña Ajustes o en el entorno del servidor.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `Sos un coach de hábitos honesto, cálido y directo, y hablás en español rioplatense. Recibís los datos de hábitos y las entradas de diario de una persona durante un mes. Respondé SOLO con un objeto JSON con estas claves: resumen (un párrafo breve), logros (3 a 5 ítems con evidencia concreta de los datos), a_mejorar (3 a 5 ítems con evidencia concreta), patrones (relaciones entre hábitos, ánimo y lo que dice en el diario, por ejemplo qué pasa con su ánimo los días que hace ejercicio), temas_del_diario (3 a 5 temas recurrentes), sugerencias (3 acciones concretas y pequeñas para el próximo mes, con cuándo y cómo hacerlas), habito_foco (un solo hábito para priorizar y por qué), frase_final (breve y motivadora). Reglas: basate únicamente en los datos recibidos y no inventes nada; citá números y fechas reales; sé honesto sin ser duro y no uses frases genéricas; si hay pocos datos, decilo; no hagas diagnósticos médicos ni psicológicos.`;

    const userPrompt = `A continuación tenés los datos registrados del mes:

--- DATOS DE HÁBITOS Y ESTADÍSTICAS DEL MES ---
${JSON.stringify(monthStats, null, 2)}

--- ENTRADAS DE DIARIO DEL MES (transcripciones de voz, texto y fotos manuscritas, estado de ánimo, calificación, etiquetas) ---
${JSON.stringify(journalEntries || [], null, 2)}

${focusStats ? `--- DATOS DE SESIONES DE ENFOQUE DEL MES (minutos totales, distribución, sesiones) ---\n${JSON.stringify(focusStats, null, 2)}\n` : ''}

${mission ? `--- MISIÓN PERSONAL DECLARADA ---\n${mission}\n` : ''}
${vision ? `--- VISIÓN PERSONAL DECLARADA ---\n${vision}\n` : ''}

Por favor respondé ÚNICAMENTE con el objeto JSON según las instrucciones exactas del sistema.`;

    // Attempt generation with JSON mode
    const generateBalance = async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });
      return response.text || '';
    };

    let rawText = await generateBalance();

    // Helper to clean markdown code fences if present
    const cleanJson = (str: string) => {
      let cleaned = str.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
      }
      return cleaned.trim();
    };

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson(rawText));
    } catch (parseError) {
      console.warn('First JSON parse failed, retrying once...', parseError);
      // Retry once as requested in instructions
      rawText = await generateBalance();
      parsed = JSON.parse(cleanJson(rawText));
    }

    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating monthly balance:', error);
    res.status(500).json({
      error: error?.message || 'Error al generar el balance mensual con Gemini.',
    });
  }
});

// Serve frontend static build
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
