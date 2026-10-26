
const API_BASE =
  import.meta.env.VITE_TRAIN_API_URL || 'http://localhost:8080/api/v1';

async function trainRequest(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'omit',
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    throw new Error(
      data?.message || `Train API failed (${response.status})`
    );
  }

  return data;
}

/**
 * Search stations by name or code.
 * Example: suggestStations('pu')
 */
export async function suggestStations(query) {
  const q = query.trim();

  if (q.length < 2) return [];

  const params = new URLSearchParams({ q });

  return trainRequest(`/stations/suggest?${params.toString()}`);
}

/**
 * Find trains between selected station codes.
 * Example: searchTrains({ from: 'PUNE', to: 'CSMT' })
 */
export async function searchTrains({ from, to }) {
  if (!from || !to) {
    throw new Error('Please select both From and To stations.');
  }

  if (from === to) {
    throw new Error('From and To stations must be different.');
  }

  const params = new URLSearchParams({ from, to });

  return trainRequest(`/trains/search?${params.toString()}`);
}

/**
 * Fetch the complete schedule of a selected train.
 */
export async function getTrainSchedule(trainNo) {
  if (!trainNo) {
    throw new Error('Train number is required.');
  }

  return trainRequest(
    `/trains/${encodeURIComponent(trainNo)}/schedule`
  );
}
