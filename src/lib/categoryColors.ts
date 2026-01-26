export type Category = 'project' | 'exercise' | 'family' | 'meeting' | ''
export type ProjectColor = 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'teal' | ''

export function categoryColorClass(category?: Category, projectColor?: ProjectColor): string {
  if (category === 'project') {
    switch (projectColor) {
      case 'blue':
        return 'bg-blue-500'
      case 'green':
        return 'bg-emerald-500'
      case 'purple':
        return 'bg-purple-500'
      case 'orange':
        return 'bg-orange-500'
      case 'pink':
        return 'bg-pink-500'
      case 'teal':
        return 'bg-teal-500'
      default:
        return 'bg-slate-500'
    }
  }
  if (category === 'exercise') return 'bg-lime-500'
  if (category === 'family') return 'bg-amber-500'
  if (category === 'meeting') return 'bg-sky-500'
  return 'bg-slate-300'
}

