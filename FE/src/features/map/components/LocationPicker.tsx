import React, { useEffect, useMemo, useRef } from 'react';
import { Button, Space, Typography, message, theme } from 'antd';
import { AimOutlined } from '@ant-design/icons';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { Marker as LeafletMarker } from 'leaflet';
import {
  DEFAULT_VN_CENTER,
  MAP_ATTRIBUTION,
  MAP_TILE_URL,
  setupLeafletIcons,
} from '../leaflet-setup';

export interface LocationPickerProps {
  value?: { lat: number; lng: number } | null;
  onChange?: (v: { lat: number; lng: number }) => void;
  height?: number;
}

function MapClickHandler({ onChange }: { onChange?: (v: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onChange?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function PanToLocation({ center }: { center?: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
      map.setView([center.lat, center.lng], map.getZoom());
    }
  }, [center, map]);
  return null;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
  height = 360,
}) => {
  setupLeafletIcons();
  const { token } = theme.useToken();
  const markerRef = useRef<LeafletMarker>(null);

  const markerPosition: [number, number] | null = useMemo(() => {
    if (value && typeof value.lat === 'number' && typeof value.lng === 'number') {
      return [value.lat, value.lng];
    }
    return null;
  }, [value]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      message.error('Trình duyệt không hỗ trợ định vị');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        onChange?.(next);
        message.success('Đã lấy vị trí hiện tại');
      },
      () => {
        message.error('Không thể lấy vị trí hiện tại. Vui lòng cấp quyền vị trí.');
      },
    );
  };

  const markerEventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const latlng = marker.getLatLng();
          onChange?.({ lat: latlng.lat, lng: latlng.lng });
        }
      },
    }),
    [onChange],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Space orientation="horizontal" style={{ justifyContent: 'space-between', width: '100%' }}>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {markerPosition
            ? `Tọa độ: ${markerPosition[0].toFixed(5)}, ${markerPosition[1].toFixed(5)}`
            : 'Click trên bản đồ hoặc bấm nút để chọn vị trí'}
        </Typography.Text>
        <Button
          size="small"
          icon={<AimOutlined />}
          onClick={handleGetCurrentLocation}
        >
          Dùng vị trí hiện tại
        </Button>
      </Space>

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
          center={markerPosition ?? DEFAULT_VN_CENTER}
          zoom={14}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer attribution={MAP_ATTRIBUTION} url={MAP_TILE_URL} />
          <MapClickHandler onChange={onChange} />
          {markerPosition && (
            <>
              <PanToLocation center={value} />
              <Marker
                ref={markerRef}
                draggable
                eventHandlers={markerEventHandlers}
                position={markerPosition}
              />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default LocationPicker;
