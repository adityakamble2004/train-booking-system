
const BASE = 'http://localhost:8081/api/v1';

const EMAIL = 'aditya@example.com';
const PASSWORD = 'Test1234';

const N = 90;

const BODY = {
  trainNo: '01488',
  journeyDate: '2026-10-28',
  fromStation: 'HGL',
  toStation: 'KWV',
  classCode: '3A',
  contactEmail: EMAIL,
  passengers: [
    {
      name: 'Aditya Race Test 2',
      dateOfBirth: '2000-05-15',
      gender: 'M'
    }
  ]
};

async function readResponse(response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function main() {
  console.log('=== RailYatra Booking Race Test ===');
  console.log(`Target: ${BASE}`);
  console.log(`Concurrent requests: ${N}`);
  console.log('');

  // 1. Login
  console.log('Step 1: Logging in...');

  const loginResponse = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD
    })
  });

  const loginData = await readResponse(loginResponse);

  console.log('Login HTTP status:', loginResponse.status);

  if (!loginResponse.ok) {
    console.error('Login failed:', loginData);
    process.exitCode = 1;
    return;
  }

  const accessToken = loginData?.accessToken;

  if (!accessToken) {
    console.error(
      'Login succeeded, but accessToken was missing.',
      loginData
    );
    process.exitCode = 1;
    return;
  }

  console.log('Access token received successfully.');
  console.log('');

  // 2. Test authentication without creating a booking
  console.log('Step 2: Checking authenticated user...');

  const meResponse = await fetch(`${BASE}/users/me`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`
    }
  });

  const meData = await readResponse(meResponse);

  console.log('GET /users/me status:', meResponse.status);

  if (!meResponse.ok) {
    console.error('Token validation failed:', meData);
    console.error(
      'Stopping test. Fix authentication before testing bookings.'
    );
    process.exitCode = 1;
    return;
  }

  console.log('Authenticated user:', meData);
  console.log('');

  // 3. Check one booking request first
  // This may create a real test booking if successful.
  console.log('Step 3: Testing one booking request...');

  const testKey = `race-check-${Date.now()}`;

  const testResponse = await fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Idempotency-Key': testKey
    },
    body: JSON.stringify(BODY)
  });

  const testData = await readResponse(testResponse);

  console.log('Test booking HTTP status:', testResponse.status);
  console.log('Test booking response:', testData);
  console.log('');

  if (testResponse.status === 401) {
    console.error(
      'Booking endpoint rejected the token. ' +
      'Stopping before the concurrency test.'
    );
    process.exitCode = 1;
    return;
  }

  // Continue only if the test request succeeded.
  // If the journey/class/route is invalid or unavailable,
  // investigate that response before running the load test.
  if (!testResponse.ok) {
    console.error(
      'Test booking failed. Resolve this response before continuing.'
    );
    process.exitCode = 1;
    return;
  }

  console.log('Step 4: Starting concurrent booking requests...');
  console.log(
    'WARNING: These requests use different idempotency keys ' +
    'and may create additional bookings.'
  );

  const startTime = Date.now();

  const results = await Promise.all(
    Array.from({ length: N }, async (_, i) => {
      const key = `race-${Date.now()}-${i}`;

      try {
        const response = await fetch(`${BASE}/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'Idempotency-Key': key
          },
          body: JSON.stringify(BODY)
        });

        const data = await readResponse(response);

        return {
          status: response.status,
          code: data?.code ?? (response.ok ? 'OK' : 'UNKNOWN_ERROR'),
          pnr: data?.pnr ?? null
        };
      } catch (error) {
        return {
          status: 0,
          code: 'NETWORK_ERROR',
          message: error.message
        };
      }
    })
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // 5. Summarize results
  const tally = {};

  for (const result of results) {
    const key = `${result.status} ${result.code}`;
    tally[key] = (tally[key] || 0) + 1;
  }

  const successful = results.filter(
    result => result.status >= 200 && result.status < 300
  );

  const uniquePnrs = new Set(
    successful.map(result => result.pnr).filter(Boolean)
  );

  console.log('');
  console.log('=== RACE TEST RESULTS ===');
  console.log('Requests sent:', N);
  console.log('Duration:', `${duration} seconds`);
  console.log('Response summary:', tally);
  console.log('Successful HTTP responses:', successful.length);
  console.log('Unique PNRs returned:', uniquePnrs.size);
  console.log('');
  console.log(
    'Verify booking and seat records in the database ' +
    'before concluding that overselling is prevented.'
  );
}

main().catch(error => {
  console.error('Test crashed:', error.message);
  process.exitCode = 1;
});
