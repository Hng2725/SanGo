import React, { useEffect } from 'react';
import { Link } from 'react-router';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { Typography } from 'antd';
import L from 'leaflet';
import type { VenueCardDto } from '@sango/shared';
import { formatCurrency } from '@/common/utils/format';
import {
  DEFAULT_VN_CENTER,
  MAP_ATTRIBUTION,
  MAP_TILE_URL,
  setupLeafletIcons,
} from '../leaflet-setup';

export interface VenuesMapProps {
  venues: Pick<VenueCardDto, 'slug' | 'name' | 'latitude' | 'longitude' | 'minPricePerHour'>[];
  height?: number;
}

function FitBounds({
  points,
}: {
  points: { lat: number; lng: number }[];
}) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [points, map]);
  return null;
}

export const VenuesMap: React.FC<VenuesMapProps> = ({ venues, height = 500 }) => {
  setupLeafletIcons();

  const validVenues = venues.filter(
    (v): v is typeof v & { latitude: number; longitude: number } =>
      typeof v.latitude === 'number' && typeof v.longitude === 'number',
  );

  const points = validVenues.map((v) => ({ lat: v.latitude, lng: v.longitude }));

  return (
    <div style={{ height, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #d9d9d9' }}>
      <MapContainer
        center={points.length > 0 ? [points[0].lat, points[0].lng] : DEFAULT_VN_CENTER}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer attribution={MAP_ATTRIBUTION} url={MAP_TILE_URL} />
        <FitBounds points={points} />
        {validVenues.map((venue) => (
          <Marker key={venue.slug} position={[venue.latitude, venue.longitude]}>
            <Popup>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Link to={`/venues/${venue.slug}`} style={{ fontWeight: 600 }}>
                  {venue.name}
                </Link>
                {venue.minPricePerHour != null && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Từ {formatCurrency(venue.minPricePerHour)}/giờ
                  </Typography.Text>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default VenuesMap;
