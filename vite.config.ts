import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

function geminiApiPlugin(): Plugin {
  return {
    name: 'gemini-api-endpoints',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        // Helper to parse JSON body
        const readBody = async (): Promise<any> => {
          return new Promise((resolve, reject) => {
            let data = '';
            req.on('data', (chunk) => {
              data += chunk;
            });
            req.on('end', () => {
              try {
                resolve(data ? JSON.parse(data) : {});
              } catch (err) {
                reject(err);
              }
            });
            req.on('error', reject);
          });
        };

        const sendJson = (statusCode: number, payload: any) => {
          res.statusCode = statusCode;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(payload));
        };

        if (req.url === '/api/health' && req.method === 'GET') {
          return sendJson(200, {
            status: 'ok',
            hasEnvKey: Boolean(process.env.GEMINI_API_KEY),
          });
        }

        if (req.url === '/api/transcribe' && req.method === 'POST') {
          try {
            const body = await readBody();
            const { audioBase64, mimeType } = body;

            if (!audioBase64) {
              return sendJson(400, { error: 'No se envió audio para transcribir.' });
            }

            const clientKey = (req.headers['x-gemini-key'] as string) || '';
            const apiKey = clientKey.trim() || process.env.GEMINI_API_KEY;

            if (!apiKey) {
              return sendJson(400, {
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

            const transcript = response.text || '';
            return sendJson(200, { transcript });
          } catch (error: any) {
            console.error('Error transcribing audio:', error);
            return sendJson(500, {
              error: error?.message || 'Error al procesar la transcripción con Gemini.',
            });
          }
        }

        if (req.url === '/api/summarize' && req.method === 'POST') {
          try {
            const body = await readBody();
            const { transcript } = body;

            if (!transcript) {
              return sendJson(400, { error: 'No se envió texto para resumir.' });
            }

            const clientKey = (req.headers['x-gemini-key'] as string) || '';
            const apiKey = clientKey.trim() || process.env.GEMINI_API_KEY;

            if (!apiKey) {
              return sendJson(400, {
                error: 'No se encontró clave de Gemini API.',
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

            return sendJson(200, parsed);
          } catch (error: any) {
            console.error('Error generating summary:', error);
            return sendJson(500, {
              error: error?.message || 'Error al generar resumen.',
            });
          }
        }

        if (req.url === '/api/transcribe-handwriting' && req.method === 'POST') {
          try {
            const body = await readBody();
            const { images } = body;
            if (!images || !Array.isArray(images) || images.length === 0) {
              return sendJson(400, { error: 'No se enviaron imágenes para transcribir.' });
            }

            const clientKey = (req.headers['x-gemini-key'] as string) || '';
            const apiKey = clientKey.trim() || process.env.GEMINI_API_KEY;

            if (!apiKey) {
              return sendJson(400, { error: 'No se encontró clave de Gemini API.' });
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

            return sendJson(200, { transcript: response.text || '' });
          } catch (error: any) {
            console.error('Error transcribing handwriting:', error);
            return sendJson(500, {
              error: error?.message || 'Error al transcribir texto manuscrito con Gemini.',
            });
          }
        }

        if (req.url === '/api/weekly-review' && req.method === 'POST') {
          try {
            const body = await readBody();
            const { weekStats, journalEntries, mission, vision } = body;
            const clientKey = (req.headers['x-gemini-key'] as string) || '';
            const apiKey = clientKey.trim() || process.env.GEMINI_API_KEY;

            if (!apiKey) {
              return sendJson(400, { error: 'No se encontró clave de Gemini API.' });
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

            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: userPrompt,
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
              },
            });

            let parsed: any;
            try {
              let cleaned = (response.text || '{}').trim();
              if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
              if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
              if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
              parsed = JSON.parse(cleaned.trim());
            } catch (e) {
              parsed = {
                logros: ['Constancia en los registros semanales'],
                a_mejorar: 'Aumentar la consistencia en los días con menor cumplimiento',
                objetivo: 'Sostener al menos 5 días de hábitos clave',
              };
            }

            return sendJson(200, parsed);
          } catch (error: any) {
            console.error('Error generating weekly review:', error);
            return sendJson(500, {
              error: error?.message || 'Error al generar la revisión semanal.',
            });
          }
        }

        if (req.url === '/api/balance' && req.method === 'POST') {
          try {
            const body = await readBody();
            const { monthStats, journalEntries, focusStats, mission, vision } = body;
            if (!monthStats) {
              return sendJson(400, { error: 'Faltan las estadísticas del mes.' });
            }

            const clientKey = (req.headers['x-gemini-key'] as string) || '';
            const apiKey = clientKey.trim() || process.env.GEMINI_API_KEY;

            if (!apiKey) {
              return sendJson(400, {
                error: 'No se encontró clave de Gemini API.',
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
            const cleanJson = (str: string) => {
              let cleaned = str.trim();
              if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
              else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
              if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
              return cleaned.trim();
            };

            let parsed: any;
            try {
              parsed = JSON.parse(cleanJson(rawText));
            } catch (pErr) {
              rawText = await generateBalance();
              parsed = JSON.parse(cleanJson(rawText));
            }

            return sendJson(200, parsed);
          } catch (error: any) {
            console.error('Error generating balance in dev:', error);
            return sendJson(500, {
              error: error?.message || 'Error al generar el balance mensual.',
            });
          }
        }

        return next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      geminiApiPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'CONSTANTE — Control de Hábitos & Bitácora de Voz',
          short_name: 'CONSTANTE',
          description:
            'Planilla editorial de control de hábitos mensual, estadísticas y diario personal con transcripción de audio.',
          theme_color: '#121212',
          background_color: '#FBFBFA',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
