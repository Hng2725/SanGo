/** Local integration check: npx tsx scripts/race-booking.ts --n 20.
 * Finds an available future slot, expects one winner and cancels only its test bookings.
 */
import {
  addDaysToDateStr,
  toVnParts,
  type BookingDto,
  type Paginated,
  type VenueCardDto,
  type VenueDayAvailabilityDto,
} from '@sango/shared';

function report(message: string) {
  process.stdout.write(message + '\n');
}

const BASE = process.env.API_URL ?? 'http://localhost:3000/api';
const countArg = process.argv.indexOf('--n');
const N = countArg < 0 ? 20 : Number(process.argv[countArg + 1]);

async function request<T>(
  path: string,
  token?: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) throw new Error(`${method} ${path}: HTTP ${response.status}`);
  const envelope = (await response.json()) as { data: T };
  return envelope.data;
}

async function main() {
  if (!Number.isInteger(N) || N < 2 || N > 50)
    throw new Error('--n must be an integer between 2 and 50');
  const logins = await Promise.all(
    ['customer@sango.vn', 'customer2@sango.vn'].map((email) =>
      request<{ accessToken: string }>('/auth/login', undefined, 'POST', {
        email,
        password: 'Customer@123',
      }),
    ),
  );
  const tokens = Array.from({ length: N }, (_, index) => logins[index % logins.length].accessToken);
  const date = addDaysToDateStr(toVnParts(new Date()).dateStr, 7);
  const venues = await request<Paginated<VenueCardDto>>('/venues?pageSize=20');
  let target: { venueId: string; courtId: string; startAt: string; endAt: string } | undefined;
  for (const venue of venues.items) {
    const availability = await request<VenueDayAvailabilityDto>(
      `/venues/${venue.id}/availability?date=${date}`,
    );
    for (const court of availability.courts) {
      const slot = court.slots.find((item) => item.status === 'AVAILABLE');
      if (slot) {
        target = {
          venueId: venue.id,
          courtId: court.court.id,
          startAt: slot.startAt,
          endAt: slot.endAt,
        };
        break;
      }
    }
    if (target) break;
  }
  if (!target) throw new Error('No available future slot found; no test booking created');
  report(`Race: ${N} requests, ${date}, court ${target.courtId}, ${target.startAt}`);
  const body = {
    courtId: target.courtId,
    startAt: target.startAt,
    endAt: target.endAt,
    contactPhone: '0901234567',
    note: 'SanGo local concurrency integration check',
  };
  const results = await Promise.all(
    tokens.map(async (token) => {
      const response = await fetch(`${BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { data?: BookingDto; code?: string };
      return { status: response.status, booking: payload.data, code: payload.code, token };
    }),
  );
  const created = results.filter((result) => result.status === 201 && result.booking);
  const conflicts = results.filter(
    (result) => result.status === 409 && result.code === 'SLOT_ALREADY_BOOKED',
  );
  report(`HTTP 201: ${created.length}; HTTP 409 SLOT_ALREADY_BOOKED: ${conflicts.length}`);
  // Release reservations even when the expected concurrency assertion fails.
  for (const result of created) {
    if (!result.booking) continue;
    await request(`/bookings/${result.booking.id}/cancel`, result.token, 'PATCH', {
      reason: 'Hoàn tất kiểm thử đặt trùng local',
    });
    report(`Cancelled test order ${result.booking.code}`);
  }
  if (created.length !== 1 || conflicts.length !== N - 1)
    throw new Error(
      `Expected 1 created and ${N - 1} conflicts; statuses: ${results.map((result) => result.status).join(', ')}`,
    );
  const after = await request<VenueDayAvailabilityDto>(
    `/venues/${target.venueId}/availability?date=${date}`,
  );
  // The cancellation endpoint is authoritative; print the actual final slot state when present.
  const released = after.courts
    .find((court) => court.court.id === target.courtId)
    ?.slots.find((slot) => slot.startAt === target.startAt);
  if (!released || released.status !== 'AVAILABLE')
    throw new Error(`Test slot was not released: ${released?.status ?? 'missing'}`);
  report('PASS: one reservation won; all test orders cancelled and slots released.');
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
