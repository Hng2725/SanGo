import React from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { Typography, theme } from 'antd';
import {
  DEFAULT_VN_CENTER,
  MAP_ATTRIBUTION,
  MAP_TILE_URL,
  setupLeafletIcons,
} from '../leaflet-setup';

export interface VenueMapProps {
  latitude?: number | null;
  longitude?: number | null;
  name: string;
  address?: string;
  height?: number;
}

export const VenueMap: React.FC<VenueMapProps> = ({
  latitude,
  longitude,
  name,
  address,
  height = 300,
}) => {
  setupLeafletIcons();
  const { token } = theme.useToken();

  const hasCoords = typeof latitude === 'number' && typeof longitude === 'number';
  const position: [number, number] = hasCoords ? [latitude, longitude] : DEFAULT_VN_CENTER;

  if (!hasCoords) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: token.colorFillAlter,
          borderRadius: token.borderRadius,
          border: `1px solid ${token.colorBorderSecondary}`,
          color: token.colorTextSecondary,
          padding: '0 16px',
          textAlign: 'center',
        }}
      >
        Chưa có thông tin tọa độ bản đồ cho cụm sân này.
      </div>
    );
  }

  return (
    <div
      style={{
        height,
        width: '100%',
        borderRadius: token.borderRadius,
        overflow: 'hidden',
        border: `1px solid ${token.colorBorder}`,
      }}
    >
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer attribution={MAP_ATTRIBUTION} url={MAP_TILE_URL} />
        <Marker position={position}>
          <Popup>
            <Typography.Text strong>{name}</Typography.Text>
            {address && <div>{address}</div>}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default VenueMap;
