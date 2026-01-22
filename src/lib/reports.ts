import type { PdsEntry } from '../types/pds'
import { calculateStreaks } from './calendar'

export function generateYearEndReport(entries: PdsEntry[], year: number): string {
  const yearEntries = entries.filter((e) => e.date.startsWith(`${year}-`))
  const streaks = calculateStreaks(entries)

  // Sort by date
  const sorted = [...yearEntries].sort((a, b) => a.date.localeCompare(b.date))

  // Tag stats
  const tagCounts = new Map<string, number>()
  for (const entry of yearEntries) {
    for (const tag of entry.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }
  }
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Monthly breakdown
  const monthCounts = Array(12).fill(0)
  for (const entry of yearEntries) {
    const month = parseInt(entry.date.split('-')[1], 10) - 1
    monthCounts[month]++
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Entry type breakdown
  const typeCounts = {
    daily: yearEntries.filter((e) => !e.type || e.type === 'daily').length,
    weekly: yearEntries.filter((e) => e.type === 'weekly').length,
    monthly: yearEntries.filter((e) => e.type === 'monthly').length,
    yearly: yearEntries.filter((e) => e.type === 'yearly').length,
  }

  // Completion stats
  let withPlan = 0
  let withDo = 0
  let withSee = 0
  let withAllThree = 0

  for (const entry of yearEntries) {
    const hasPlan = entry.plan.trim().length > 0
    const hasDo = entry.do.trim().length > 0
    const hasSee = entry.see.trim().length > 0

    if (hasPlan) withPlan++
    if (hasDo) withDo++
    if (hasSee) withSee++
    if (hasPlan && hasDo && hasSee) withAllThree++
  }

  // Time block stats
  let totalBlocks = 0
  let filledPlanBlocks = 0
  let filledDoBlocks = 0

  for (const entry of yearEntries) {
    if (!entry.blocks) continue
    for (const block of entry.blocks) {
      totalBlocks++
      if (block.plan && block.plan.trim()) filledPlanBlocks++
      if (block.do && block.do.trim()) filledDoBlocks++
    }
  }

  // Build report
  let report = `# ${year} Year-End Summary\n\n`
  report += `Generated on ${new Date().toLocaleDateString()}\n\n`

  report += `## Overview\n\n`
  report += `- **Total Entries**: ${yearEntries.length}\n`
  report += `- **First Entry**: ${sorted[0]?.date || 'N/A'}\n`
  report += `- **Last Entry**: ${sorted[sorted.length - 1]?.date || 'N/A'}\n`
  report += `- **Current Streak**: ${streaks.currentStreak} days\n`
  report += `- **Longest Streak**: ${streaks.longestStreak} days\n\n`

  report += `## Entry Types\n\n`
  report += `- Daily: ${typeCounts.daily}\n`
  report += `- Weekly: ${typeCounts.weekly}\n`
  report += `- Monthly: ${typeCounts.monthly}\n`
  report += `- Yearly: ${typeCounts.yearly}\n\n`

  report += `## Completion Rates\n\n`
  if (yearEntries.length > 0) {
    report += `- **Plan**: ${withPlan}/${yearEntries.length} (${Math.round((withPlan / yearEntries.length) * 100)}%)\n`
    report += `- **Do**: ${withDo}/${yearEntries.length} (${Math.round((withDo / yearEntries.length) * 100)}%)\n`
    report += `- **See**: ${withSee}/${yearEntries.length} (${Math.round((withSee / yearEntries.length) * 100)}%)\n`
    report += `- **All Three**: ${withAllThree}/${yearEntries.length} (${Math.round((withAllThree / yearEntries.length) * 100)}%)\n\n`
  }

  if (totalBlocks > 0) {
    report += `## Time Block Statistics\n\n`
    report += `- **Total Time Blocks**: ${totalBlocks}\n`
    report += `- **Planned Blocks**: ${filledPlanBlocks} (${Math.round((filledPlanBlocks / totalBlocks) * 100)}%)\n`
    report += `- **Actual Blocks**: ${filledDoBlocks} (${Math.round((filledDoBlocks / totalBlocks) * 100)}%)\n\n`
  }

  report += `## Monthly Distribution\n\n`
  report += '```\n'
  monthCounts.forEach((count, i) => {
    const bar = '█'.repeat(Math.floor((count / Math.max(...monthCounts, 1)) * 20))
    report += `${monthNames[i]}: ${bar} ${count}\n`
  })
  report += '```\n\n'

  if (topTags.length > 0) {
    report += `## Top Tags\n\n`
    topTags.forEach(([tag, count], i) => {
      report += `${i + 1}. **${tag}**: ${count} entries\n`
    })
    report += '\n'
  }

  // Special reflections
  const weeklyReflections = yearEntries.filter((e) => e.type === 'weekly')
  const monthlyReflections = yearEntries.filter((e) => e.type === 'monthly')
  const yearlyReflections = yearEntries.filter((e) => e.type === 'yearly')

  if (weeklyReflections.length > 0) {
    report += `## Weekly Reflections (${weeklyReflections.length})\n\n`
    weeklyReflections.slice(0, 5).forEach((e) => {
      report += `- ${e.date}: ${e.title || '(Untitled)'}\n`
    })
    if (weeklyReflections.length > 5) {
      report += `- ... and ${weeklyReflections.length - 5} more\n`
    }
    report += '\n'
  }

  if (monthlyReflections.length > 0) {
    report += `## Monthly Reflections (${monthlyReflections.length})\n\n`
    monthlyReflections.forEach((e) => {
      report += `- ${e.date}: ${e.title || '(Untitled)'}\n`
    })
    report += '\n'
  }

  if (yearlyReflections.length > 0) {
    report += `## Yearly Reflections\n\n`
    yearlyReflections.forEach((e) => {
      report += `### ${e.title || 'Year Reflection'} (${e.date})\n\n`
      if (e.plan.trim()) {
        report += `**Plan/Vision:**\n${e.plan}\n\n`
      }
      if (e.do.trim()) {
        report += `**Achievements:**\n${e.do}\n\n`
      }
      if (e.see.trim()) {
        report += `**Insights:**\n${e.see}\n\n`
      }
    })
  }

  report += `---\n\n`
  report += `*Generated by PDS Diary - Plan / Do / See*\n`

  return report
}
