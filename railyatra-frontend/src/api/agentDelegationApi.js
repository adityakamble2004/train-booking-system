
import { accountRequest } from './accountClient';

const BASE_PATH = '/agent/delegations';

function requireId(id) {
  if (id === undefined || id === null || String(id).trim() === '') {
    throw new Error('Delegation ID is required.');
  }

  return encodeURIComponent(String(id));
}

// 1. Create a delegation
export function createDelegation(payload) {
  return accountRequest(BASE_PATH, {
    method: 'POST',
    body: payload,
  });
}

// 2. Generate an agent token
export function generateAgentToken(id) {
  return accountRequest(`${BASE_PATH}/${requireId(id)}/token`, {
    method: 'POST',
  });
}

// 3. List all delegations for the current user
export function getDelegations() {
  return accountRequest(BASE_PATH, {
    method: 'GET',
  });
}

// 4. Get one delegation
export function getDelegation(id) {
  return accountRequest(`${BASE_PATH}/${requireId(id)}`, {
    method: 'GET',
  });
}

// 5. Get paginated action history
export function getDelegationActions(id, { page = 0, size = 20 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  return accountRequest(
    `${BASE_PATH}/${requireId(id)}/actions?${params.toString()}`,
    { method: 'GET' },
  );
}

// 6. Revoke a delegation
export function revokeDelegation(id) {
  return accountRequest(`${BASE_PATH}/${requireId(id)}/revoke`, {
    method: 'POST',
  });
}
