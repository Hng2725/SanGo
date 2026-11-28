/**
 * race-booking.ts – Script thử đặt sân đồng thời.
 * Chạy: npx tsx scripts/race-booking.ts --n 10
 *
 * Yêu cầu: server chạy ở http://localhost:3000, có seed customers.
 */
const BASE = process.env.API_URL ?? 'http://localhost:3000/api';
const N = Number(process.argv.find((_, i, a) => a[i - 1] === '--n') ?? 10);

interface LoginResponse {
  data: { accessToken: string };
}

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
  const body = (await res.json()) as LoginResponse;
  return body.data.accessToken;
}

async function createBooking(
  token: string,
  body: Record<string, string>,
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function main() {
  console.log(`\n🏃 Race booking test: ${N} concurrent requests\n`);

  // 1. Login N customers
  const tokens: string[] = [];
  for (let i = 1; i <= N; i++) {
    const email = `customer${String(i).padStart(3, '0')}@sango.vn`;
    try {
      const token = await login(email, 'Customer@123');
      tokens.push(token);
    } catch {
      console.warn(`⚠ Could not login ${email}, using customer@sango.vn`);
      const token = await login('customer@sango.vn', 'Customer@123');
      tokens.push(token);
    }
  }
  console.log(`✅ Logged in ${tokens.length} customers`);

  // 2. Find a court and an available slot (tomorrow 11:00 VN)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  // 11:00 VN = 04:00 UTC
  const startAt = `${dateStr}T04:00:00.000Z`;
  const endAt = `${dateStr}T05:00:00.000Z`;

  // Try to find a court via the venues endpoint
  const venuesRes = await fetch(`${BASE}/venues?pageSize=1`);
  if (!venuesRes.ok) {
    console.error('❌ Could not fetch venues');
    process.exit(1);
  }
  const venuesBody = (await venuesRes.json()) as {
    data: { items: { id: string; slug: string }[] };
  };
  const venue = venuesBody.data.items[0];
  if (!venue) {
    console.error('❌ No venues found in DB');
    process.exit(1);
  }

  // Get venue detail for first court
  const venueRes = await fetch(`${BASE}/venues/${venue.slug}`);
  const venueDetail = (await venueRes.json()) as {
    data: { courts: { id: string; name: string }[] };
  };
  const court = venueDetail.data.courts[0];
  if (!court) {
    console.error('❌ No courts found');
    process.exit(1);
  }

  console.log(`📍 Target: court "${court.name}" (${court.id}), ${startAt} → ${endAt}`);

  // 3. Fire N concurrent booking requests
  const bookingBody = {
    courtId: court.id,
    startAt,
    endAt,
    contactPhone: '0901234567',
  };

  const results = await Promise.all(tokens.map((token) => createBooking(token, bookingBody)));

  // 4. Tally results
  const counts: Record<number, number> = {};
  for (const r of results) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
  }

  console.log('\n📊 Results:');
  for (const [status, count] of Object.entries(counts).sort()) {
    console.log(`   HTTP ${status}: ${count}`);
  }

  const created = counts[201] ?? 0;
  const conflict = counts[409] ?? 0;
  if (created === 1 && conflict === N - 1) {
    console.log(`\n✅ PASS: Exactly 1 booking created, ${N - 1} conflicts`);
  } else {
    console.log(
      `\n❌ FAIL: Expected 1×201 and ${N - 1}×409, got ${created}×201 and ${conflict}×409`,
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
