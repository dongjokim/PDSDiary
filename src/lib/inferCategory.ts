import type { Category } from './categoryColors'

type Rule = {
  category: Exclude<Category, ''>
  keywords: string[]
}

const RULES: Rule[] = [
  { category: 'sleep', keywords: ['sleep', 'nap', 'rest'] },
  { category: 'wellbeing', keywords: ['meditation', 'yoga', 'stretch', 'breath', 'breathing'] },
  { category: 'exercise', keywords: ['exercise', 'workout', 'gym', 'run', 'running', 'walk', 'walking', 'swim', 'cycling', 'bike'] },
  { category: 'family', keywords: ['family', 'kids', 'kid', 'child', 'children', 'wife', 'husband', 'parent', 'mom', 'dad'] },
  { category: 'meeting', keywords: ['meeting', 'call', 'sync', '1:1', 'standup', 'review'] },
  { category: 'food', keywords: ['breakfast', 'lunch', 'dinner', 'meal', 'snack', 'coffee', 'tea'] },
  { category: 'entertainment', keywords: ['tv', 'drama', 'movie', 'cinema', 'netflix', 'youtube', 'game', 'gaming'] },
  { category: 'project', keywords: ['project', 'work', 'build', 'code', 'dev', 'design'] },
]

function hasKeyword(text: string, keyword: string): boolean {
  if (keyword === '1:1') return text.includes('1:1')
  return new RegExp(`\\b${keyword}\\b`, 'i').test(text)
}

export function inferCategory(text: string): Category | '' {
  const trimmed = text.trim()
  if (!trimmed) return ''
  for (const rule of RULES) {
    if (rule.keywords.some((k) => hasKeyword(trimmed.toLowerCase(), k))) {
      return rule.category
    }
  }
  return ''
}

