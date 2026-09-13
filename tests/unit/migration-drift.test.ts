import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findUnappliedMigrations } from '../../server/utils/db'

test('reports every journal entry with no matching applied timestamp', () => {
  const journal = [
    { tag: '0000_a', when: 100 },
    { tag: '0001_b', when: 200 },
    { tag: '0002_c', when: 300 },
  ]
  const applied = [100, 200] // 0002_c never ran

  assert.deepEqual(findUnappliedMigrations(journal, applied), ['0002_c'])
})

test('reports nothing when every journal entry has a matching applied timestamp', () => {
  const journal = [
    { tag: '0000_a', when: 100 },
    { tag: '0001_b', when: 200 },
  ]
  const applied = [200, 100] // order and extras don't matter

  assert.deepEqual(findUnappliedMigrations(journal, applied), [])
})

test('preserves journal order and reports multiple gaps', () => {
  const journal = [
    { tag: '0000_a', when: 100 },
    { tag: '0001_b', when: 200 },
    { tag: '0002_c', when: 300 },
    { tag: '0003_d', when: 400 },
  ]
  const applied = [100] // only the first ever ran

  assert.deepEqual(findUnappliedMigrations(journal, applied), ['0001_b', '0002_c', '0003_d'])
})
