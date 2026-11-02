// Optional local LLM (Ollama) used only to write a short plain-English explanation. It never changes the score.
export const llmEnabled = () => !!process.env.OLLAMA_MODEL;

export async function explain(kind, result, excerpt = '') {
  if (!llmEnabled()) return null;
  const reasons = result.findings.slice(0, 6).map((f) => `- ${f.title}`).join('\n') || '- none';
  const prompt = `You are a security assistant. In at most 3 short sentences, explain to a non-expert why this ${kind} was rated "${result.verdict}" (safety ${result.score}/100) and what they should do. Signals found:\n${reasons}\n${excerpt ? `Excerpt: ${excerpt.slice(0, 800)}\n` : ''}Do not invent facts.`;
  try {
    const r = await fetch(`${process.env.OLLAMA_URL || 'http://127.0.0.1:11434'}/api/generate`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.OLLAMA_MODEL, prompt, stream: false, options: { temperature: 0.2, num_predict: 160 } }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return String(j.response || '').trim().slice(0, 700) || null;
  } catch { return null; }
}
