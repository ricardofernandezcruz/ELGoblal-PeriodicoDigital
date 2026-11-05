'use client'

import { useSyncExternalStore } from 'react'

/* Notas guardadas y progreso de lectura, solo en este navegador (sin cuenta).
   Se sincroniza entre pestañas con el evento storage. */

export type ReadItem = { id: string; title: string; href: string; img: string | null; sec: string; at: number; p?: number }

const SAVED = 'eg-saved'
const READING = 'eg-reading'
const listeners = new Set<() => void>()
const cache = new Map<string, { raw: string | null; val: ReadItem[] }>()

function read(key: string): ReadItem[] {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(key)
  } catch {}
  const c = cache.get(key)
  if (c && c.raw === raw) return c.val
  let val: ReadItem[] = []
  try {
    val = raw ? JSON.parse(raw) : []
  } catch {}
  cache.set(key, { raw, val })
  return val
}

function write(key: string, list: ReadItem[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {}
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  const on = (e: StorageEvent) => (e.key === SAVED || e.key === READING) && l()
  addEventListener('storage', on)
  return () => {
    listeners.delete(l)
    removeEventListener('storage', on)
  }
}

const EMPTY: ReadItem[] = []
const useList = (key: string) => useSyncExternalStore(subscribe, () => read(key), () => EMPTY)

export const useSaved = () => useList(SAVED)
export const useReading = () => useList(READING)

export function toggleSaved(item: Omit<ReadItem, 'at'>): boolean {
  const list = read(SAVED)
  const has = list.some((x) => x.id === item.id)
  write(SAVED, has ? list.filter((x) => x.id !== item.id) : [{ ...item, at: Date.now() }, ...list].slice(0, 100))
  return !has
}

export const removeSaved = (id: string) => write(SAVED, read(SAVED).filter((x) => x.id !== id))

/** Guarda por dónde va la lectura (0–100). Al terminarla, sale de «Continúa leyendo». */
export function trackReading(item: Omit<ReadItem, 'at' | 'p'>, p: number) {
  const rest = read(READING).filter((x) => x.id !== item.id)
  write(READING, p >= 90 ? rest : [{ ...item, p: Math.round(p), at: Date.now() }, ...rest].slice(0, 20))
}

export const forgetReading = (id: string) => write(READING, read(READING).filter((x) => x.id !== id))
