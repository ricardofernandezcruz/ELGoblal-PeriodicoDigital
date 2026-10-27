'use client'

/** Alterna claro/oscuro con data-theme en <html> y lo guarda en eg-theme. Devuelve el nuevo tema. */
export function toggleTheme(): 'light' | 'dark' {
  const root = document.documentElement
  const dark =
    root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches)
  const next = dark ? 'light' : 'dark'
  root.dataset.theme = next
  try {
    localStorage.setItem('eg-theme', next)
  } catch {}
  return next
}
