'use client'
import { useState, useEffect } from 'react'
import { locales, type Locale, type Translations } from '@/lib/i18n'

const LOCALE_FLAGS: Record<Locale, string> = {
  en: '🇬🇧',
  es: '🇺🇾',
  pt: '🇧🇷',
  ru: '🇷🇺',
  zh: '🇨🇳',
}

const LOCALE_NAMES: Record<Locale, string> = {
  en: 'EN',
  es: 'ES',
  pt: 'PT',
  ru: 'RU',
  zh: '中文',
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 30}`
}

export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const saved = getCookie('hwa_locale') as Locale
    if (saved && locales[saved]) setLocaleState(saved)
  }, [])

  function setLocale(l: Locale) {
    setLocaleState(l)
    setCookie('hwa_locale', l)
  }

  function t(key: string): string {
    const keys = key.split('.')
    let val: any = locales[locale]
    for (const k of keys) val = val?.[k]
    return val ?? key
  }

  return {
    t,
    locale,
    setLocale,
    flag: LOCALE_FLAGS[locale],
    name: LOCALE_NAMES[locale],
    flags: LOCALE_FLAGS,
    names: LOCALE_NAMES,
    availableLocales: Object.keys(locales) as Locale[],
  }
}
