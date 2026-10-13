// Minimal Router that just records routes so tests can call handlers directly.
function Router() {
  const routes = [];
  const r = { use() {}, routes };
  for (const m of ['get', 'post', 'put', 'delete']) {
    r[m] = (p, ...handlers) => routes.push({ method: m.toUpperCase(), path: p, handler: handlers[handlers.length - 1] });
  }
  return r;
}
const express = () => ({});
express.Router = Router;
express.json = () => () => {};
export default express;
