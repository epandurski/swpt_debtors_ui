const appName = 'swpt-debtors-ui'
const cacheName = `${appName}-v0.2.15`
const appFiles = [
  './',
  'index.html',
  'manifest.json',
  'favicon.svg',
  'global.css',
  'config.js',
  'material.min.css',
  'material-icons.css',
  'fonts/material-icons.woff2',
  'fonts/Roboto_300.woff2',
  'fonts/Roboto_400.woff2',
  'fonts/Roboto_500.woff2',
  'fonts/Roboto_700.woff2',
  'fonts/Roboto_Mono.woff2',
  'fonts/Cutive_Mono.woff2',
  'build/main.css',
  'build/main.js',
  'build/qr-scanner-worker.min.js',
]
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install')
  e.waitUntil((async () => {
    const cache = await caches.open(cacheName)
    console.log('[Service Worker] Caching app files')
    await cache.addAll(appFiles)
  })())
})
self.addEventListener('fetch', (e) => {
  e.respondWith((async () => {
    const cache = await caches.open(cacheName)
    const r = await cache.match(e.request, {ignoreSearch: true})
    if (r) { return r }
    return await fetch(e.request)
  })())
})
self.addEventListener('activate', async (e) => {
  e.waitUntil((async () => {
    const keyList = await caches.keys()
    const deleteList = keyList.filter(key => key.startsWith(appName) && key !== cacheName)
    await Promise.all(deleteList.map(key => caches.delete(key)))
  })())
})
