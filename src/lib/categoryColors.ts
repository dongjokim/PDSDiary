export type Category = 'project' | 'exercise' | 'family' | 'meeting' | 'wellbeing' | ''
export type ProjectColor = 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'teal'

const PROJECT_PALETTE: Record<ProjectColor, string> = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  pink: 'bg-pink-500',
  teal: 'bg-teal-500',
}

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function projectTagToColorClass(tag?: string): string {
  if (!tag) return 'bg-slate-500'
  const keys = Object.keys(PROJECT_PALETTE) as ProjectColor[]
  const idx = hashString(tag) % keys.length
  return PROJECT_PALETTE[keys[idx]]
}

export function categoryColorClass(category?: Category, projectTag?: string): string {
  if (category === 'project') return projectTagToColorClass(projectTag)
  if (category === 'exercise') return 'bg-lime-500'
  if (category === 'family') return 'bg-amber-500'
  if (category === 'meeting') return 'bg-sky-500'
  if (category === 'wellbeing') return 'bg-indigo-500'
  return 'bg-slate-300'
}

