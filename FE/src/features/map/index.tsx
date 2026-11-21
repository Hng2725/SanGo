import React, { Suspense, lazy } from 'react';
import { Skeleton } from 'antd';
import type { LocationPickerProps } from './components/LocationPicker';
import type { VenueMapProps } from './components/VenueMap';
import type { VenuesMapProps } from './components/VenuesMap';

export type { LocationPickerProps, VenueMapProps, VenuesMapProps };

// Code-splitting qua React.lazy
const LazyLocationPicker = lazy(() => import('./components/LocationPicker'));
const LazyVenueMap = lazy(() => import('./components/VenueMap'));
const LazyVenuesMap = lazy(() => import('./components/VenuesMap'));

export const LocationPicker: React.FC<LocationPickerProps> = (props) => (
  <Suspense
    fallback={
      <div
        style={{
          height: props.height ?? 360,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa',
          borderRadius: 8,
          border: '1px solid #d9d9d9',
        }}
      >
        <Skeleton active paragraph={{ rows: 4 }} style={{ padding: 24 }} />
      </div>
    }
  >
    <LazyLocationPicker {...props} />
  </Suspense>
);

export const VenueMap: React.FC<VenueMapProps> = (props) => (
  <Suspense
    fallback={
      <div
        style={{
          height: props.height ?? 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa',
          borderRadius: 8,
          border: '1px solid #d9d9d9',
        }}
      >
        <Skeleton active paragraph={{ rows: 3 }} style={{ padding: 24 }} />
      </div>
    }
  >
    <LazyVenueMap {...props} />
  </Suspense>
);

export const VenuesMap: React.FC<VenuesMapProps> = (props) => (
  <Suspense
    fallback={
      <div
        style={{
          height: props.height ?? 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa',
          borderRadius: 8,
          border: '1px solid #d9d9d9',
        }}
      >
        <Skeleton active paragraph={{ rows: 6 }} style={{ padding: 24 }} />
      </div>
    }
  >
    <LazyVenuesMap {...props} />
  </Suspense>
);
