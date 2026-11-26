import { useState } from 'react';
import {
  Alert,
  App,
  Avatar,
  Button,
  Dropdown,
  Grid,
  Input,
  List,
  Pagination,
  Select,
  Skeleton,
  Table,
  Tabs,
  Typography,
  type TableProps,
} from 'antd';
import { MoreOutlined, SearchOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router';
import type { AdminUserQuery, UserDto } from '@sango/shared';
import { getErrorMessage } from '@/common/api/errors';
import { useDebounce } from '@/common/hooks/useDebounce';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { formatDate } from '@/common/utils/format';
import { ConfirmAction } from '@/components/feedback/ConfirmAction';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusDot } from '@/components/feedback/StatusDot';
import { UserRoleTag } from '../components/UserRoleTag';
import {
  useApproveOwnerMutation,
  useCountsQuery,
  useSetStatusMutation,
  useUsersQuery,
} from '../api/adminUsersApi';
type ActionKind = 'approve' | 'reject' | 'lock' | 'unlock';
interface ActionState {
  kind: ActionKind;
  user: UserDto;
}
const tabs = ['all', 'customers', 'owners', 'pending', 'locked'] as const;
type Tab = (typeof tabs)[number];
function isTab(value: string | null): value is Tab {
  return tabs.some((tab) => tab === value);
}
function formatPhone(phone: string | null) {
  return phone?.replace(/^(0\d{3})(\d{3})(\d{3})$/, '$1 $2 $3') ?? '–';
}
export default function AdminUsersPage() {
  useDocumentTitle('Người dùng');
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const [params, setParams] = useSearchParams();
  const activeTab: Tab = isTab(params.get('tab')) ? (params.get('tab') as Tab) : 'all';
  const role =
    activeTab === 'customers'
      ? 'CUSTOMER'
      : activeTab === 'owners' || activeTab === 'pending'
        ? 'OWNER'
        : undefined;
  const [search, setSearch] = useState(params.get('q') ?? '');
  const q = useDebounce(search);
  const [action, setAction] = useState<ActionState | null>(null);
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState('');
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = [10, 20, 50].includes(Number(params.get('pageSize')))
    ? Number(params.get('pageSize'))
    : 20;
  const sort =
    params.get('sort') === 'oldest' || params.get('sort') === 'name'
      ? (params.get('sort') as 'oldest' | 'name')
      : 'newest';
  const query: AdminUserQuery = {
    page,
    pageSize,
    sort,
    ...(q ? { q } : {}),
    ...(role ? { role } : {}),
    ...(activeTab === 'pending'
      ? { ownerStatus: 'PENDING' as const }
      : activeTab === 'locked'
        ? { status: 'LOCKED' as const }
        : {}),
  };
  const { data, isFetching, error, refetch } = useUsersQuery(query);
  const { data: counts } = useCountsQuery();
  const [setStatus, statusState] = useSetStatusMutation();
  const [approveOwner, approveState] = useApproveOwnerMutation();
  const updateParams = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    setParams(next);
  };
  const openAction = (kind: ActionKind, user: UserDto) => {
    setAction({ kind, user });
    setNote('');
    setActionError('');
  };
  const submitAction = async () => {
    if (!action) return;
    if (action.kind === 'reject' && note.trim().length < 3) {
      setActionError('Vui lòng nêu lý do từ chối, ít nhất 3 ký tự.');
      return;
    }
    try {
      if (action.kind === 'approve' || action.kind === 'reject')
        await approveOwner({
          id: action.user.id,
          body: {
            decision: action.kind === 'approve' ? 'APPROVED' : 'REJECTED',
            ...(action.kind === 'reject' ? { note: note.trim() } : {}),
          },
        }).unwrap();
      else
        await setStatus({
          id: action.user.id,
          body: { status: action.kind === 'lock' ? 'LOCKED' : 'ACTIVE' },
        }).unwrap();
      message.success(
        action.kind === 'approve'
          ? 'Đã duyệt chủ sân'
          : action.kind === 'reject'
            ? 'Đã từ chối chủ sân'
            : action.kind === 'lock'
              ? 'Đã khóa tài khoản'
              : 'Đã mở khóa tài khoản',
      );
      setAction(null);
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    }
  };
  const actions = (user: UserDto) =>
    user.role === 'ADMIN'
      ? []
      : [
          {
            key: user.status === 'LOCKED' ? 'unlock' : 'lock',
            label: user.status === 'LOCKED' ? 'Mở khóa tài khoản' : 'Khóa tài khoản',
            onClick: () => openAction(user.status === 'LOCKED' ? 'unlock' : 'lock', user),
          },
          ...(user.role === 'OWNER' && user.ownerStatus === 'PENDING'
            ? [
                {
                  key: 'approve',
                  label: 'Duyệt chủ sân',
                  onClick: () => openAction('approve', user),
                },
                {
                  key: 'reject',
                  label: 'Từ chối chủ sân',
                  onClick: () => openAction('reject', user),
                },
              ]
            : []),
        ];
  const columns: TableProps<UserDto>['columns'] = [
    {
      title: 'Người dùng',
      dataIndex: 'fullName',
      render: (_, user) => (
        <div className="user-cell">
          <Avatar size={34} className={`role-avatar role-avatar-${user.role.toLowerCase()}`}>
            {user.fullName.slice(0, 1)}
          </Avatar>
          <div>
            <strong>{user.fullName}</strong>
            <small>{user.email}</small>
          </div>
        </div>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      render: (role: UserDto['role']) => <UserRoleTag role={role} />,
    },
    {
      title: 'Tài khoản',
      dataIndex: 'status',
      render: (status: UserDto['status']) => (
        <StatusDot
          label={status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
          tone={status === 'ACTIVE' ? 'success' : 'error'}
        />
      ),
    },
    {
      title: 'Duyệt chủ sân',
      render: (_, user) =>
        user.role === 'OWNER' ? (
          <StatusDot
            label={
              user.ownerStatus === 'PENDING'
                ? 'Chờ duyệt'
                : user.ownerStatus === 'APPROVED'
                  ? 'Đã duyệt'
                  : 'Từ chối'
            }
            tone={
              user.ownerStatus === 'PENDING'
                ? 'warning'
                : user.ownerStatus === 'APPROVED'
                  ? 'success'
                  : 'error'
            }
          />
        ) : (
          '–'
        ),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      render: (phone: string | null) => <span className="num">{formatPhone(phone)}</span>,
    },
    {
      title: 'Ngày tham gia',
      dataIndex: 'createdAt',
      render: (value: string) => <span className="num">{formatDate(value)}</span>,
    },
    {
      title: 'Thao tác',
      render: (_, user) => (
        <div className="user-actions">
          {user.role === 'OWNER' && user.ownerStatus === 'PENDING' && (
            <>
              <Button size="small" type="primary" onClick={() => openAction('approve', user)}>
                Duyệt
              </Button>
              <Button
                size="small"
                className="user-reject-button"
                onClick={() => openAction('reject', user)}
              >
                Từ chối
              </Button>
            </>
          )}
          {user.role !== 'ADMIN' && (
            <Dropdown trigger={['hover', 'click']} menu={{ items: actions(user) }}>
              <Button type="text" icon={<MoreOutlined />} aria-label="Thao tác khác" />
            </Dropdown>
          )}
        </div>
      ),
    },
  ];
  const count = (tab: Tab) =>
    tab === 'all'
      ? counts?.all
      : tab === 'customers'
        ? counts?.customers
        : tab === 'owners'
          ? counts?.owners
          : tab === 'pending'
            ? counts?.pendingOwners
            : counts?.locked;
  const labels: Record<Tab, string> = {
    all: 'Tất cả',
    customers: 'Khách đặt sân',
    owners: 'Chủ sân',
    pending: 'Chờ duyệt',
    locked: 'Đã khóa',
  };
  return (
    <>
      <PageHeader
        title="Người dùng"
        description="Quản lý tài khoản, duyệt chủ sân mới và khóa tài khoản vi phạm."
      />
      <Tabs
        className="users-tabs"
        activeKey={activeTab}
        onChange={(key) => updateParams({ tab: key, role: undefined, page: undefined })}
        items={tabs.map((tab) => ({
          key: tab,
          label: (
            <span className="users-tab-label">
              {labels[tab]}
              <span className={`users-tab-count ${tab === 'pending' ? 'users-tab-pending' : ''}`}>
                {count(tab) ?? '…'}
              </span>
            </span>
          ),
        }))}
      />
      <div className="users-toolbar">
        <div className="users-filters">
          <Input
            prefix={<SearchOutlined />}
            allowClear
            placeholder="Tìm tên, email, số điện thoại"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              updateParams({ q: event.target.value || undefined, page: undefined });
            }}
          />
        </div>
        <div className="users-toolbar-controls">
          <div className="users-sort">
            <span>Sắp xếp:</span>
            <Select
              aria-label="Sắp xếp"
              value={sort}
              onChange={(value) => updateParams({ sort: value, page: undefined })}
              options={[
                { value: 'newest', label: 'Mới tham gia' },
                { value: 'oldest', label: 'Cũ nhất' },
                { value: 'name', label: 'Tên A–Z' },
              ]}
            />
          </div>
        </div>
      </div>
      {error ? (
        <Alert
          type="error"
          showIcon
          message={getErrorMessage(error)}
          action={<Button onClick={() => refetch()}>Thử lại</Button>}
        />
      ) : !data && isFetching ? (
        <Skeleton active />
      ) : data?.items.length === 0 ? (
        <EmptyState
          description={
            q
              ? `Không có người dùng khớp với “${q}”.`
              : activeTab === 'pending'
                ? 'Chưa có chủ sân nào chờ duyệt.'
                : activeTab === 'locked'
                  ? 'Không có tài khoản nào bị khóa.'
                  : 'Chưa có người dùng.'
          }
          action={
            q && (
              <Button
                onClick={() => {
                  setSearch('');
                  updateParams({ q: undefined });
                }}
              >
                Xóa tìm kiếm
              </Button>
            )
          }
        />
      ) : screens.lg ? (
        <Table
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isFetching}
          pagination={false}
          rowClassName={(user) => (user.ownerStatus === 'PENDING' ? 'pending-user-row' : '')}
          className="users-table"
        />
      ) : (
        <List
          loading={isFetching}
          dataSource={data?.items ?? []}
          renderItem={(user) => (
            <List.Item
              className={user.ownerStatus === 'PENDING' ? 'pending-user-row' : ''}
              actions={[
                <Dropdown
                  key="actions"
                  trigger={['hover', 'click']}
                  menu={{ items: actions(user) }}
                >
                  <Button type="text" icon={<MoreOutlined />} aria-label="Thao tác khác" />
                </Dropdown>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    size={34}
                    className={`role-avatar role-avatar-${user.role.toLowerCase()}`}
                  >
                    {user.fullName.slice(0, 1)}
                  </Avatar>
                }
                title={user.fullName}
                description={
                  <>
                    <div>{user.email}</div>
                    <div className="user-mobile-role">
                      <UserRoleTag role={user.role} />
                    </div>
                    <StatusDot
                      label={user.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
                      tone={user.status === 'ACTIVE' ? 'success' : 'error'}
                    />
                    {user.role === 'OWNER' && (
                      <StatusDot
                        label={
                          user.ownerStatus === 'PENDING'
                            ? 'Chờ duyệt'
                            : user.ownerStatus === 'APPROVED'
                              ? 'Đã duyệt'
                              : 'Từ chối'
                        }
                        tone={
                          user.ownerStatus === 'PENDING'
                            ? 'warning'
                            : user.ownerStatus === 'APPROVED'
                              ? 'success'
                              : 'error'
                        }
                      />
                    )}
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}
      {data && data.total > 0 && (
        <div className="users-pagination">
          <Typography.Text type="secondary">
            Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.total)} trong{' '}
            {data.total} người dùng
          </Typography.Text>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={data.total}
            simple={!screens.lg}
            showSizeChanger={screens.lg}
            pageSizeOptions={[10, 20, 50]}
            onChange={(nextPage, nextSize) =>
              updateParams({ page: String(nextPage), pageSize: String(nextSize) })
            }
          />
        </div>
      )}
      <ConfirmAction
        open={!!action}
        title={`${action?.kind === 'approve' ? 'Duyệt chủ sân' : action?.kind === 'reject' ? 'Từ chối chủ sân' : action?.kind === 'lock' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'} ${action?.user.fullName ?? ''}?`}
        confirmText={
          action?.kind === 'approve'
            ? 'Duyệt chủ sân'
            : action?.kind === 'reject'
              ? 'Từ chối'
              : action?.kind === 'lock'
                ? 'Khóa tài khoản'
                : 'Mở khóa'
        }
        danger={action?.kind === 'reject' || action?.kind === 'lock'}
        loading={statusState.isLoading || approveState.isLoading}
        onCancel={() => setAction(null)}
        onConfirm={submitAction}
      >
        <p>{action?.user.email}</p>
        {action?.kind === 'reject' && (
          <Input.TextArea
            aria-label="Lý do từ chối"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={300}
            showCount
            placeholder="Lý do từ chối"
          />
        )}
        {actionError && <Alert type="error" message={actionError} />}
      </ConfirmAction>
    </>
  );
}
