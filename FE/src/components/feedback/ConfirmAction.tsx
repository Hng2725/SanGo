import { Button, Modal } from 'antd';
import type { ReactNode } from 'react';
interface ConfirmActionProps { open: boolean; title: string; children: ReactNode; confirmText: string; danger?: boolean; loading?: boolean; onConfirm: () => void; onCancel: () => void }
export function ConfirmAction({ open, title, children, confirmText, danger, loading, onConfirm, onCancel }: ConfirmActionProps) { return <Modal open={open} title={title} onCancel={onCancel} footer={<><Button onClick={onCancel}>Hủy</Button><Button type="primary" danger={danger} loading={loading} onClick={onConfirm}>{confirmText}</Button></>}>{children}</Modal>; }
