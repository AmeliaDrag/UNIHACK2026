/**
 * ai.js — Google Gemini integration.
 *
 * analyzeDirection(text) — sends the user's report description to Gemini
 * and returns 'left' | 'right' | null based on what the user wrote.
 *
 * Get a free API key at: https://aistudio.google.com/apikey
 * Put it in .env as VITE_GEMINI_API_KEY
 *
 * Note: For a hackathon this calls Gemini directly from the browser.
 * In production, proxy this through your backend so the key stays server-side.
 */

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

const PROMPT = `You are a safety assistant for a walking safety app called LadyMap.
The user is reporting a suspicious person or dangerous area and describing what they see.

Read their description and determine which direction the suspicious person is moving:
- "left" if the text mentions left, west, or the person is heading to the left
- "right" if the text mentions right, east, or the person is heading to the right

Respond with ONLY one word: "left" or "right".
If you cannot determine the direction, respond with "unknown".

User description: `;

/**
 * @param {string} text — the user's report description
 * @returns {Promise<'left' | 'right' | null>}
 */
export async function analyzeDirection(text) {
  if (!GEMINI_KEY) {
    console.warn('[AI] No VITE_GEMINI_API_KEY set — AI direction disabled');
    return null;
  }
  if (!text || !text.trim()) return null;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: PROMPT + text }],
        }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 10,
        },
      }),
    });

    if (!res.ok) {
      console.error('[AI] Gemini API error:', res.status);
      return null;
    }

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();

    if (raw === 'left')  return 'left';
    if (raw === 'right') return 'right';
    return null;
  } catch (e) {
    console.error('[AI] Gemini request failed:', e);
    return null;
  }
}
