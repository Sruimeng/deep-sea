import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)],
    ),
  )
  return nested.flat()
}
const files = (await walk('dist')).filter((path) => !path.endsWith('sw.js'))
const hash = createHash('sha256')
for (const path of files.sort()) hash.update(await readFile(path))
const cacheName = `vast-offline-${hash.digest('hex').slice(0, 12)}`
const urls = ['/', ...files.map((path) => '/' + path.slice(5))]
const script = `const CACHE = ${JSON.stringify(cacheName)};
const FILES = ${JSON.stringify(urls)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => { await cache.addAll(FILES); await self.skipWaiting(); }));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('vast-offline-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
    return;
  }
  if (!FILES.includes(url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(cache => cache.match(url.pathname)).then(cached => cached || fetch(event.request)));
});
`
await writeFile('dist/sw.js', script)
console.log(`Offline cache: ${files.length} files, ${cacheName}`)
