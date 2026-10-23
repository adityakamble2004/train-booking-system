
import { accountRequest } from './accountClient'

export async function createBooking(payload, idempotencyKey) {
  return accountRequest('/bookings', {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    body: payload,
  })
}

export async function getBooking(pnr) {
  return accountRequest(`/bookings/${encodeURIComponent(pnr)}`, {
    method: 'GET',
  })
}
