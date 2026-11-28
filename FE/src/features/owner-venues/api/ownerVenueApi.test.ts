import { afterEach, describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { makeStore } from '@/app/store';
import { baseApi } from '@/common/api/baseApi';
import { server } from '@/test/msw/server';
import { venueDetailApi } from '@/features/venue-detail/api/venueDetailApi';
import { pricingApi } from '@/features/pricing/api/pricingApi';
import { ownerVenueApi } from './ownerVenueApi';

describe('owner configuration refreshes public venue data', () => {
  const store = makeStore();
  afterEach(() => store.dispatch(baseApi.util.resetApiState()));

  it.each(['information', 'hours', 'court', 'pricing', 'copy', 'hide'])(
    'refreshes subscribed public detail after changing %s',
    async (change) => {
      let revision = 'Before';
      server.use(
        http.get('*/api/venues/test-venue', () => HttpResponse.json({ data: { name: revision } })),
        http.all('*/api/owner/*', () => {
          revision = 'After';
          return HttpResponse.json({ data: {} });
        }),
      );
      const query = store.dispatch(
        venueDetailApi.endpoints.getVenueDetailBySlug.initiate('test-venue'),
      );
      await expect(query.unwrap()).resolves.toMatchObject({ name: 'Before' });
      if (change === 'information') {
        await store
          .dispatch(
            ownerVenueApi.endpoints.updateOwnerVenue.initiate({
              id: 'v1',
              body: { name: 'After' },
            }),
          )
          .unwrap();
      } else if (change === 'hours') {
        await store
          .dispatch(
            ownerVenueApi.endpoints.replaceOpeningHours.initiate({ venueId: 'v1', body: [] }),
          )
          .unwrap();
      } else if (change === 'court') {
        await store
          .dispatch(
            ownerVenueApi.endpoints.updateCourt.initiate({
              courtId: 'c1',
              venueId: 'v1',
              body: { isActive: false },
            }),
          )
          .unwrap();
      } else if (change === 'pricing') {
        await store
          .dispatch(
            pricingApi.endpoints.updatePricing.initiate({
              courtId: 'c1',
              body: { basePricePerHour: 200_000, rules: [] },
            }),
          )
          .unwrap();
      } else if (change === 'copy') {
        await store
          .dispatch(
            pricingApi.endpoints.copyPricing.initiate({ courtId: 'c1', targetCourtIds: ['c2'] }),
          )
          .unwrap();
      } else {
        await store.dispatch(ownerVenueApi.endpoints.hideOwnerVenue.initiate('v1')).unwrap();
      }
      await waitFor(() =>
        expect(
          venueDetailApi.endpoints.getVenueDetailBySlug.select('test-venue')(store.getState()).data
            ?.name,
        ).toBe('After'),
      );
      query.unsubscribe();
    },
  );
});
