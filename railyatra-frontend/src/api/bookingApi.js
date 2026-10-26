
import { accountRequest } from './accountClient'

// Create a booking with an idempotency key.
export async function createBooking(payload, idempotencyKey) {
  return accountRequest('/bookings', {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    body: payload,
  })
}

// Get one booking by PNR.
export async function getBooking(pnr) {
  return accountRequest(`/bookings/${encodeURIComponent(pnr)}`, {
    method: 'GET',
  })
}

// Get the logged-in user's paginated bookings.
export async function getMyBookings(page = 0, size = 5) {
  return accountRequest(`/bookings?page=${page}&size=${size}`, {
    method: 'GET',
  })
}

// Development/testing only: confirm a pending booking.
export async function confirmBooking(pnr) {
  return accountRequest(
    `/dev/bookings/${encodeURIComponent(pnr)}/confirm`,
    { method: 'POST' }
  )
}

// Cancel a booking.
export async function cancelBooking(pnr) {
  return accountRequest(
    `/bookings/${encodeURIComponent(pnr)}/cancel`,
    { method: 'POST' }
  )
}
