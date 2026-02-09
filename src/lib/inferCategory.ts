import type { Category } from './categoryColors'

type Rule = {
  category: Exclude<Category, ''>
  keywords: string[]
}

const RULES: Rule[] = [
  { category: 'sleep', keywords: ['sleep', 'nap', 'rest'] },
  { category: 'wellbeing', keywords: ['meditation', 'yoga', 'stretch', 'breath', 'breathing'] },
  {
    category: 'exercise',
    keywords: [
      'exercise',
      'workout',
      'gym',
      'run',
      'running',
      'walk',
      'walking',
      'swim',
      'swimming',
      'cycling',
      'bike',
      'biking',
      'sport',
      'sports',
      'soccer',
      'football',
      'basketball',
      'baseball',
      'tennis',
      'padel',
      'golf',
      'volleyball',
      'badminton',
      'hockey',
      'ski',
      'skiing',
      'snowboard',
      'boxing',
      'martial',
      'martial arts',
    ],
  },
  { category: 'family', keywords: ['family', 'kids', 'kid', 'child', 'children', 'wife', 'husband', 'parent', 'mom', 'dad'] },
  { category: 'meeting', keywords: ['meeting', 'call', 'sync', '1:1', 'standup', 'review'] },
  { category: 'food', keywords: ['breakfast', 'lunch', 'dinner', 'meal', 'snack', 'coffee', 'tea'] },
  { category: 'entertainment', keywords: ['tv', 'drama', 'movie', 'cinema', 'netflix', 'youtube', 'game', 'gaming'] },
  { category: 'project', keywords: ['project', 'work', 'build', 'code', 'dev', 'design'] },
]

export function inferCategory(text: string): Category | '' {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9:+\s]/g, ' ')
  const tokens = normalized.split(/\s+/).filter(Boolean)
  for (const rule of RULES) {
    for (const keyword of rule.keywords) {
      if (keyword === '1:1' && normalized.includes('1:1')) return rule.category
      if (tokens.includes(keyword)) return rule.category
      if (keyword.length >= 5 && normalized.includes(keyword)) return rule.category
    }
  }
  return ''
}

