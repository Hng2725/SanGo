import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VenueInfoForm } from '../VenueInfoForm';

describe('VenueInfoForm', () => {
  it('submit form gửi đúng payload khi dữ liệu hợp lệ', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(
      <VenueInfoForm
        initialValues={{
          name: 'Sân bóng Hoa Lư',
          address: '123 Đinh Tiên Hoàng',
          district: 'Quận 1',
          city: 'TP. Hồ Chí Minh',
          phone: '0901234567',
          cancelBeforeHours: 2,
        }}
        onSubmit={handleSubmit}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: /lưu thông tin/i });
    await user.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalled();
    expect(handleSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Sân bóng Hoa Lư',
      address: '123 Đinh Tiên Hoàng',
      district: 'Quận 1',
      city: 'TP. Hồ Chí Minh',
      phone: '0901234567',
      cancelBeforeHours: 2,
    });
  });
});
