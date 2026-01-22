import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button, Input, Textarea, Badge } from '../components/ui'
import { useGoals } from '../state/GoalsContext'
import type { Goal } from '../types/goals'

function createGoal(type: 'yearly' | 'quarterly' | 'monthly'): Goal {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    type,
    status: 'active',
    progress: 0,
    milestones: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export default function GoalsPage() {
  const { goals, addGoal, updateGoal, deleteGoal } = useGoals()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Goal | null>(null)

  const startNewGoal = (type: 'yearly' | 'quarterly' | 'monthly') => {
    const newGoal = createGoal(type)
    setDraft(newGoal)
    setEditingId(newGoal.id)
  }

  const startEdit = (goal: Goal) => {
    setDraft({ ...goal })
    setEditingId(goal.id)
  }

  const cancelEdit = () => {
    setDraft(null)
    setEditingId(null)
  }

  const saveGoal = () => {
    if (!draft) return
    if (!draft.title.trim()) {
      alert('Please enter a title')
      return
    }

    if (goals.find((g) => g.id === draft.id)) {
      updateGoal(draft.id, draft)
    } else {
      addGoal(draft)
    }

    setDraft(null)
    setEditingId(null)
  }

  const addMilestone = () => {
    if (!draft) return
    setDraft({
      ...draft,
      milestones: [
        ...draft.milestones,
        {
          id: crypto.randomUUID(),
          title: '',
          completed: false,
        },
      ],
    })
  }

  const updateMilestone = (milestoneId: string, updates: Partial<Goal['milestones'][number]>) => {
    if (!draft) return
    setDraft({
      ...draft,
      milestones: draft.milestones.map((m) =>
        m.id === milestoneId
          ? { ...m, ...updates, completedAt: updates.completed ? new Date().toISOString() : undefined }
          : m,
      ),
    })
  }

  const removeMilestone = (milestoneId: string) => {
    if (!draft) return
    setDraft({
      ...draft,
      milestones: draft.milestones.filter((m) => m.id !== milestoneId),
    })
  }

  const activeGoals = goals.filter((g) => g.status === 'active')
  const completedGoals = goals.filter((g) => g.status === 'completed')

  const goalsByType = {
    yearly: activeGoals.filter((g) => g.type === 'yearly'),
    quarterly: activeGoals.filter((g) => g.type === 'quarterly'),
    monthly: activeGoals.filter((g) => g.type === 'monthly'),
  }

  return (
    <div className="min-h-full">
      <Header
        title="Goals & Milestones"
        right={
          <Link to="/">
            <Button variant="secondary">Back to Timeline</Button>
          </Link>
        }
      />

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-4">
          {/* Create New Goal */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Create New Goal</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => startNewGoal('yearly')}>
                + Yearly Goal
              </Button>
              <Button variant="secondary" onClick={() => startNewGoal('quarterly')}>
                + Quarterly Goal
              </Button>
              <Button variant="secondary" onClick={() => startNewGoal('monthly')}>
                + Monthly Goal
              </Button>
            </div>
          </div>

          {/* Edit/Create Form */}
          {draft && editingId && (
            <div className="rounded-2xl border-2 border-blue-500 bg-white p-4 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">
                  {goals.find((g) => g.id === draft.id) ? 'Edit Goal' : 'New Goal'}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={cancelEdit} size="sm">
                    Cancel
                  </Button>
                  <Button onClick={saveGoal} size="sm">
                    Save Goal
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block">
                    <div className="text-xs font-semibold text-slate-700">Title</div>
                    <div className="mt-1">
                      <Input
                        value={draft.title}
                        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                        placeholder="e.g., Launch my side project"
                      />
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block">
                    <div className="text-xs font-semibold text-slate-700">Description</div>
                    <div className="mt-1">
                      <Textarea
                        value={draft.description}
                        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                        placeholder="Describe your goal in detail..."
                      />
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block">
                      <div className="text-xs font-semibold text-slate-700">Type</div>
                      <div className="mt-1">
                        <select
                          value={draft.type}
                          onChange={(e) =>
                            setDraft({ ...draft, type: e.target.value as 'yearly' | 'quarterly' | 'monthly' })
                          }
                          className="h-10 w-full rounded-lg bg-white px-3 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-sky-400"
                        >
                          <option value="yearly">Yearly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="block">
                      <div className="text-xs font-semibold text-slate-700">Target Date (Optional)</div>
                      <div className="mt-1">
                        <Input
                          type="date"
                          value={draft.targetDate || ''}
                          onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })}
                        />
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-700">Progress: {draft.progress}%</div>
                  </div>
                  <div className="mt-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={draft.progress}
                      onChange={(e) => setDraft({ ...draft, progress: parseInt(e.target.value, 10) })}
                      className="w-full"
                    />
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      style={{ width: `${draft.progress}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-700">Milestones</div>
                    <Button variant="secondary" onClick={addMilestone} size="sm">
                      + Add Milestone
                    </Button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {draft.milestones.map((milestone) => (
                      <div key={milestone.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={milestone.completed}
                          onChange={(e) => updateMilestone(milestone.id, { completed: e.target.checked })}
                          className="h-5 w-5 rounded border-slate-300"
                        />
                        <Input
                          value={milestone.title}
                          onChange={(e) => updateMilestone(milestone.id, { title: e.target.value })}
                          placeholder="Milestone description..."
                          className="flex-1"
                        />
                        <Button variant="danger" onClick={() => removeMilestone(milestone.id)} size="sm">
                          ✕
                        </Button>
                      </div>
                    ))}
                    {draft.milestones.length === 0 && (
                      <div className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500">
                        No milestones yet. Add some to track progress!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Goals by Type */}
          {(['yearly', 'quarterly', 'monthly'] as const).map((type) => (
            <div key={type} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold capitalize text-slate-900">
                {type} Goals ({goalsByType[type].length})
              </div>
              <div className="mt-3 space-y-3">
                {goalsByType[type].length === 0 ? (
                  <div className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">
                    No {type} goals yet
                  </div>
                ) : (
                  goalsByType[type].map((goal) => (
                    <div
                      key={goal.id}
                      className="rounded-lg border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900">{goal.title}</div>
                          {goal.description && (
                            <div className="mt-1 text-sm text-slate-600">{goal.description}</div>
                          )}
                          {goal.targetDate && (
                            <div className="mt-2 text-xs text-slate-500">Target: {goal.targetDate}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => startEdit(goal)} size="sm">
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => {
                              if (confirm('Delete this goal?')) deleteGoal(goal.id)
                            }}
                            size="sm"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <div>Progress</div>
                          <div className="font-semibold">{goal.progress}%</div>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-green-500"
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                      </div>

                      {goal.milestones.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs font-semibold text-slate-700">
                            Milestones ({goal.milestones.filter((m) => m.completed).length}/{goal.milestones.length})
                          </div>
                          <div className="mt-2 space-y-1">
                            {goal.milestones.map((m) => (
                              <div key={m.id} className="flex items-center gap-2 text-sm">
                                <span className={m.completed ? 'text-emerald-600' : 'text-slate-400'}>
                                  {m.completed ? '✓' : '○'}
                                </span>
                                <span className={m.completed ? 'text-slate-600 line-through' : 'text-slate-700'}>
                                  {m.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Completed Goals ({completedGoals.length})</div>
              <div className="mt-3 space-y-2">
                {completedGoals.map((goal) => (
                  <div key={goal.id} className="rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600">✓</span>
                      <div className="font-medium text-slate-900">{goal.title}</div>
                      <Badge>{goal.type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
