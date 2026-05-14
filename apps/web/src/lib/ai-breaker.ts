export const BREAKER_TTL = 5 * 60 * 1000;

const breakers: Record<string, number> = {};

export function isApiOpen(name: string): boolean {
  return !breakers[name] || Date.now() > breakers[name];
}

export function tripBreaker(name: string): void {
  breakers[name] = Date.now() + BREAKER_TTL;
}

export function isCapacityError(e: unknown): boolean {
  return /429|402|401|quota|credit|exceeded|RESOURCE_EXHAUSTED|insufficient|balance|billing|authentication|invalid.*key|api.key/i
    .test(String(e));
}

// Anthropic keys: sk-ant-...  |  Gemini keys: AIza...
export function hasValidKey(provider: 'anthropic' | 'gemini'): boolean {
  const key = provider === 'anthropic'
    ? process.env.ANTHROPIC_API_KEY
    : process.env.GEMINI_API_KEY;
  if (!key || key.length < 8) return false;
  if (provider === 'anthropic') return key.startsWith('sk-ant-') || key.startsWith('sk-');
  return key.startsWith('AIza');
}
