import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PricingForm } from '../PricingForm';

describe('PricingForm', () => {
  it('hiển thị lỗi khi thêm rule bị chồng khung giờ và hết lỗi khi xóa hoặc sửa', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(
      <PricingForm
        initialValues={{
          basePricePerHour: 100_000,
          rules: [
            {
              dayType: 'WEEKDAY',
              startMinute: 1020, // 17:00
              endMinute: 1260, // 21:00
              pricePerHour: 150_000,
              label: 'Giờ vàng',
            },
            {
              dayType: 'WEEKDAY',
              startMinute: 1140, // 19:00 (chồng khung với 17:00-21:00)
              endMinute: 1320, // 22:00
              pricePerHour: 180_000,
              label: 'Chồng giờ',
            },
          ],
        }}
        onSubmit={handleSubmit}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: /lưu bảng giá/i });
    await user.click(submitBtn);

    // Báo lỗi khung giờ bị chồng
    await waitFor(() => {
      expect(screen.getByText(/khung giờ bị chồng với khung khác/i)).toBeInTheDocument();
    });
    expect(handleSubmit).not.toHaveBeenCalled();

    // Xóa dòng bị chồng
    const deleteButtons = screen.getAllByTitle(/xóa khung giá này/i);
    await user.click(deleteButtons[1]);

    // Bấm lưu lại -> không còn lỗi chồng giờ
    await user.click(submitBtn);
    await waitFor(() => {
      expect(screen.queryByText(/khung giờ bị chồng với khung khác/i)).not.toBeInTheDocument();
    });
    expect(handleSubmit).toHaveBeenCalled();
  }, 20000);
});
