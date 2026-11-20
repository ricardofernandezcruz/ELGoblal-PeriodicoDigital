'use client'

import { createContext, useContext } from 'react'
import { DEFAULT_SITE_INFO, type SiteInfo } from '@/lib/site-info-shared'

const Ctx = createContext<SiteInfo>(DEFAULT_SITE_INFO)
export const SiteInfoProvider = ({ value, children }: { value: SiteInfo; children: React.ReactNode }) => <Ctx.Provider value={value}>{children}</Ctx.Provider>
export const useSiteInfo = () => useContext(Ctx)
