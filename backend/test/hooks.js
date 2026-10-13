// ESM resolve hook: the ESM replacement for the old Module._load monkey-patch.
// Redirects a few imports made by src/ to in-memory fakes so the REAL route handlers can be tested offline.
const stub = (name) => ({ url: new URL(`./stubs/${name}.js`, import.meta.url).href, shortCircuit: true });

export async function resolve(specifier, context, nextResolve) {
  const fromSrc = context.parentURL?.includes('/src/');
  if (fromSrc) {
    if (specifier === 'express') return stub('express');
    if (specifier === 'pino') return stub('pino');
    if (specifier.endsWith('/lib/supabase.js')) return stub('supabase');
    if (specifier.endsWith('/middleware/auth.js')) return stub('auth');
  }
  return nextResolve(specifier, context);
}
