import { en } from './en'
import { es } from './es'
import { pt } from './pt'
import { ru } from './ru'
import { zh } from './zh'

export const locales = { en, es, pt, ru, zh }
export type Locale = keyof typeof locales
export { en } from './en'
export type { Translations } from './en'
