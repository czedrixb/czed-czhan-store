import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apiErrorMessage } from '../../app/utils/format'

test('a 5xx never shows the caller fallback or a raw statusMessage - both misrepresent a server fault', () => {
  const err = { statusCode: 500, data: { statusCode: 500, statusMessage: 'relation "users" does not exist' } }
  assert.equal(apiErrorMessage(err, 'Incorrect username or password'), 'Something went wrong on our end. Please try again.')
})

test('a 5xx nested only under err.data.statusCode is still caught', () => {
  const err = { data: { statusCode: 503 } }
  assert.equal(apiErrorMessage(err, 'Could not load'), 'Something went wrong on our end. Please try again.')
})

test('a 401 with a statusMessage still shows that message', () => {
  const err = { statusCode: 401, data: { statusCode: 401, statusMessage: 'Incorrect username or password' } }
  assert.equal(apiErrorMessage(err, 'fallback'), 'Incorrect username or password')
})

test('a 401 with no statusMessage falls back to the caller message', () => {
  const err = { statusCode: 401, data: {} }
  assert.equal(apiErrorMessage(err, 'Incorrect username or password'), 'Incorrect username or password')
})

test('a non-$fetch error (no status anywhere) falls back to the caller message', () => {
  assert.equal(apiErrorMessage(new Error('network down'), 'Could not save'), 'Could not save')
})
