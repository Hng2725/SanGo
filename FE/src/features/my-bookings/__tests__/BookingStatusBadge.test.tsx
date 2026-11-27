import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BookingStatusBadge } from '../components/BookingStatusBadge';

describe('BookingStatusBadge', () => {
  it('hiển thị nhãn tiếng Việt theo trạng thái', () => {
    render(<BookingStatusBadge status="CONFIRMED" />);
    expect(screen.getByText('Đã xác nhận')).toBeInTheDocument();
  });
});
