export async function prepareOfflineCache(): Promise<string> {
  if (import.meta.env.DEV) return '开发预览'
  if (!('serviceWorker' in navigator)) return '当前浏览器不支持离线重开'
  try {
    const hadController = !!navigator.serviceWorker.controller
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        if (hadController) window.location.reload()
      },
      { once: true },
    )
    await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    return '离线缓存就绪'
  } catch {
    return '离线缓存不可用 · 本次仍可游玩'
  }
}
