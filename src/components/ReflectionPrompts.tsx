type ReflectionType = 'daily' | 'weekly' | 'monthly' | 'yearly'

const PROMPTS: Record<ReflectionType, { plan: string; do: string; see: string }> = {
  daily: {
    plan: 'What do you intend to do today?',
    do: 'What did you actually do today?',
    see: 'What did you observe or learn today?',
  },
  weekly: {
    plan: 'Goals for this week:\n• What are your top 3 priorities?\n• What habits do you want to build?\n• What would make this week successful?',
    do: 'This week you:\n• Accomplished:\n• Struggled with:\n• Spent most time on:\n• Unexpected events:',
    see: 'Weekly insights:\n• What patterns did you notice?\n• What worked well?\n• What would you change?\n• Key learnings:',
  },
  monthly: {
    plan: 'Goals for this month:\n• Professional goals:\n• Personal goals:\n• Health & wellness:\n• Relationships:\n• Learning & growth:',
    do: 'This month you:\n• Major accomplishments:\n• Challenges faced:\n• Time allocation:\n• Milestones reached:\n• Habits tracked:',
    see: 'Monthly reflection:\n• Progress toward goals:\n• Biggest wins:\n• Biggest lessons:\n• Patterns observed:\n• What to carry forward:\n• What to leave behind:',
  },
  yearly: {
    plan: 'Vision for this year:\n• Professional aspirations:\n• Personal aspirations:\n• Health & fitness goals:\n• Relationship goals:\n• Financial goals:\n• Learning goals:\n• Travel & experiences:\n• Habits to cultivate:',
    do: 'This year you:\n• Major milestones:\n• Career highlights:\n• Personal achievements:\n• Challenges overcome:\n• New skills learned:\n• Relationships nurtured:\n• Adventures & experiences:\n• Books read / Media consumed:',
    see: 'Year in review:\n• Top 3 wins:\n• Top 3 lessons:\n• How you grew:\n• What surprised you:\n• Proudest moments:\n• Regrets or missed opportunities:\n• Gratitude:\n• Advice to future self:',
  },
}

export function getReflectionPrompts(type: ReflectionType = 'daily') {
  return PROMPTS[type]
}

export function ReflectionTemplateSelector({
  currentType,
  onSelectType,
}: {
  currentType?: ReflectionType
  onSelectType: (type: ReflectionType) => void
}) {
  const types: Array<{ value: ReflectionType; label: string; description: string }> = [
    { value: 'daily', label: 'Daily', description: 'Standard daily entry' },
    { value: 'weekly', label: 'Weekly', description: 'Review your week' },
    { value: 'monthly', label: 'Monthly', description: 'Reflect on the month' },
    { value: 'yearly', label: 'Yearly', description: 'Annual review & vision' },
  ]

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">Entry Type</div>
      <div className="mt-1 text-xs text-slate-600">Choose a reflection template</div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {types.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => onSelectType(type.value)}
            className={`rounded-lg border p-3 text-left transition ${
              currentType === type.value
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="text-sm font-semibold text-slate-900">{type.label}</div>
            <div className="mt-0.5 text-xs text-slate-600">{type.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
