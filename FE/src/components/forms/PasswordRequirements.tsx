import { CheckCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';

interface PasswordRequirementsProps {
  password?: string;
  className?: string;
}

export function PasswordRequirements({ password = '', className }: PasswordRequirementsProps) {
  const hints = [
    { label: 'Ít nhất 8 ký tự', valid: password.length >= 8 },
    {
      label: 'Chữ hoa và chữ thường',
      valid: /[A-Z]/.test(password) && /[a-z]/.test(password),
    },
    { label: 'Có chữ số', valid: /\d/.test(password) },
  ];

  return (
    <ul className={['password-hints', className].filter(Boolean).join(' ')}>
      {hints.map((hint) => (
        <li key={hint.label} className={hint.valid ? 'valid' : ''}>
          {hint.valid ? <CheckCircleOutlined /> : <MinusCircleOutlined />}
          {hint.label}
        </li>
      ))}
    </ul>
  );
}
