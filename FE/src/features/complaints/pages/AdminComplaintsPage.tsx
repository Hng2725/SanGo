import { Alert, App, Button, Card, Empty, Form, Input, Modal, Pagination, Select, Skeleton, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { COMPLAINT_STATUSES, COMPLAINT_TRANSITIONS, type AdminComplaintsQuery, type ComplaintStatus } from '@sango/shared';
import { getErrorMessage } from '@/common/api/errors';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { useGetAdminComplaintsQuery, useUpdateComplaintMutation } from '../api/complaintsApi';
import './AdminComplaintsPage.css';

type ComplaintActionStatus = 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
const statusOptions = [{ value: 'ALL', label: 'Tất cả' }, { value: 'OPEN', label: 'Mới gửi' }, { value: 'IN_PROGRESS', label: 'Đang xử lý' }, { value: 'RESOLVED', label: 'Đã giải quyết' }, { value: 'REJECTED', label: 'Từ chối' }];
const statusLabels: Record<ComplaintStatus, string> = { OPEN: 'Mới gửi', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã giải quyết', REJECTED: 'Từ chối' };

export default function AdminComplaintsPage() {
  useDocumentTitle('Quản lý khiếu nại');
  const { message } = App.useApp(); const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<string | null>(null); const [status, setStatus] = useState<ComplaintActionStatus>('IN_PROGRESS'); const [response, setResponse] = useState('');
  const rawStatus = params.get('status');
  const statusFilter = COMPLAINT_STATUSES.includes(rawStatus as ComplaintStatus) ? rawStatus as ComplaintStatus : undefined;
  const query: AdminComplaintsQuery = { page: Number(params.get('page') ?? '1'), pageSize: 10, status: statusFilter };
  const result = useGetAdminComplaintsQuery(query); const [update, updateState] = useUpdateComplaintMutation(); const complaint = result.data?.items.find((item) => item.id === selected);
  const openComplaint = (id: string) => { const item = result.data?.items.find((entry) => entry.id === id); if (!item) return; const next = COMPLAINT_TRANSITIONS[item.status]?.[0]; setSelected(id); setStatus((next ?? 'IN_PROGRESS') as ComplaintActionStatus); setResponse(item.adminResponse ?? ''); };
  const submit = async () => { if (!selected) return; try { await update({ id: selected, input: { status, adminResponse: response || undefined } }).unwrap(); message.success('Đã cập nhật khiếu nại'); setSelected(null); } catch (error) { message.error(getErrorMessage(error)); } };
  const updateFilter = (value: string) => { const next = new URLSearchParams(params); value === 'ALL' ? next.delete('status') : next.set('status', value); next.set('page', '1'); setParams(next); };
  const transitions = complaint ? (COMPLAINT_TRANSITIONS[complaint.status] ?? []) : [];
  return <div className="admin-complaints-page"><PageHeader title="Quản lý khiếu nại" description="Tiếp nhận, phân loại và xử lý phản ánh từ khách hàng." /><Card className="admin-complaints-toolbar" bordered={false}><Space wrap><Select value={statusFilter ?? 'ALL'} options={statusOptions} onChange={updateFilter} /><Tag color="orange">Đang hiển thị: {result.data?.total ?? 0}</Tag></Space></Card>{result.isLoading && <Skeleton active />}{result.isError && <Alert type="error" message={getErrorMessage(result.error)} />}{result.data && result.data.items.length === 0 && <Empty description="Chưa có khiếu nại." />}{result.data && result.data.items.length > 0 && <Card className="admin-complaints-list" bordered={false}><div className="admin-complaints-items">{result.data.items.map((item) => <article className="admin-complaint-item" key={item.id}><div className="admin-complaint-main"><div className="admin-complaint-heading"><Typography.Title level={5}>{item.title}</Typography.Title><Tag>{statusLabels[item.status]}</Tag></div><Typography.Paragraph ellipsis={{ rows: 2 }}>{item.content}</Typography.Paragraph><Typography.Text type="secondary">{item.venue.name} · {item.author.fullName}</Typography.Text></div><Button type="primary" ghost disabled={COMPLAINT_TRANSITIONS[item.status].length === 0} onClick={() => openComplaint(item.id)}>Xử lý</Button></article>)}</div><Pagination current={result.data.page} pageSize={result.data.pageSize} total={result.data.total} showSizeChanger={false} onChange={(page) => { const next = new URLSearchParams(params); next.set('page', String(page)); setParams(next); }} /></Card>}<Modal title="Xử lý khiếu nại" open={Boolean(selected)} confirmLoading={updateState.isLoading} onCancel={() => setSelected(null)} onOk={() => void submit()}><Form layout="vertical"><Form.Item label="Trạng thái"><Select value={status} options={transitions.map((value) => ({ value, label: statusLabels[value] }))} onChange={(value) => setStatus(value as ComplaintActionStatus)} /></Form.Item><Form.Item label="Phản hồi"><Input.TextArea value={response} onChange={(event) => setResponse(event.target.value)} maxLength={2000} showCount /></Form.Item></Form></Modal></div>;
}
