import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Form, Input, Select } from 'antd';
import type { ReactNode } from 'react';
interface FieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  autoComplete?: string;
  prefix?: ReactNode;
}
export function RHFInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  autoComplete,
  prefix,
}: FieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Form.Item
          label={label}
          htmlFor={name}
          validateStatus={fieldState.error ? 'error' : ''}
          help={fieldState.error?.message}
        >
          <Input
            {...field}
            id={name}
            value={field.value ?? ''}
            size="large"
            placeholder={placeholder}
            autoComplete={autoComplete}
            prefix={prefix}
          />
        </Form.Item>
      )}
    />
  );
}
export function RHFPassword<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  autoComplete,
  prefix,
}: FieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Form.Item
          label={label}
          htmlFor={name}
          validateStatus={fieldState.error ? 'error' : ''}
          help={fieldState.error?.message}
        >
          <Input.Password
            {...field}
            id={name}
            value={field.value ?? ''}
            size="large"
            placeholder={placeholder}
            autoComplete={autoComplete}
            prefix={prefix}
          />
        </Form.Item>
      )}
    />
  );
}
export function RHFTextArea<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
}: FieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Form.Item
          label={label}
          htmlFor={name}
          validateStatus={fieldState.error ? 'error' : ''}
          help={fieldState.error?.message}
        >
          <Input.TextArea
            {...field}
            id={name}
            value={field.value ?? ''}
            placeholder={placeholder}
            rows={3}
          />
        </Form.Item>
      )}
    />
  );
}
interface SelectFieldProps<T extends FieldValues> extends FieldProps<T> {
  options: { label: string; value: string }[];
}
export function RHFSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
}: SelectFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Form.Item
          label={label}
          htmlFor={name}
          validateStatus={fieldState.error ? 'error' : ''}
          help={fieldState.error?.message}
        >
          <Select {...field} id={name} options={options} />
        </Form.Item>
      )}
    />
  );
}
