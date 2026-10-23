
import { publicRequest } from './publicClient';

export async function getAvailability({ trainNo, date, from, to }) {
  const params = new URLSearchParams({
    trainNo,
    date,
    from,
    to,
  });

  return publicRequest(`/availability?${params.toString()}`);
}
