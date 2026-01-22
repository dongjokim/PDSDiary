import type { PdsEntry } from '../types/pds'

export function makeDefaultBlocks(): NonNullable<PdsEntry['blocks']> {
  const blocks: NonNullable<PdsEntry['blocks']> = []
  for (let h = 0; h < 24; h += 1) {
    const hh = String(h).padStart(2, '0')
    blocks.push({ t: `${hh}:00` })
  }
  return blocks
}

