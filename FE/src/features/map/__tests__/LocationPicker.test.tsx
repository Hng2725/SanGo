import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocationPicker } from '../components/LocationPicker';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ position }: { position: [number, number] }) => (
    <div data-testid="marker">{position.join(',')}</div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useMap: () => ({
    setView: vi.fn(),
    getZoom: () => 14,
    fitBounds: vi.fn(),
  }),
  useMapEvents: vi.fn(),
}));

describe('LocationPicker', () => {
  const mockGeolocation = {
    getCurrentPosition: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });
  });

  it('gọi onChange với tọa độ từ navigator.geolocation khi bấm "Dùng vị trí hiện tại"', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 10.7769,
          longitude: 106.7009,
        },
      });
    });

    const { unmount } = render(<LocationPicker onChange={handleChange} />);

    const button = screen.getByRole('button', { name: /dùng vị trí hiện tại/i });
    await user.click(button);

    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    expect(handleChange).toHaveBeenCalledWith({
      lat: 10.7769,
      lng: 106.7009,
    });
    unmount();
  });
});
