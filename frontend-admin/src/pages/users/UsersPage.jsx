import { useEffect, useMemo, useState } from 'react';
import GlassCard from '../../components/ui/GlassCard';
import LoadingScreen from '../../components/ui/LoadingScreen';
import StatusBadge from '../../components/ui/StatusBadge';
import usePermissions from '../../hooks/usePermissions';
import { formatDateTime } from '../../lib/utils';
import { inviteUser, getUsers, updateUserProfile } from '../../services/usersService';

const emptyInviteForm = {
  full_name: '',
  email: '',
  role: 'cashier',
  phone: ''
};

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'cashier', label: 'Thu ngan' },
  { value: 'staff', label: 'Nhan vien' }
];

function UsersPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [inviteForm, setInviteForm] = useState(emptyInviteForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      const data = await getUsers();
      if (mounted) {
        setUsers(data);
        setLoading(false);
      }
    }

    loadUsers();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return users;
    }

    return users.filter((user) =>
      [user.full_name, user.email, user.role].some((field) =>
        String(field ?? '')
          .toLowerCase()
          .includes(keyword)
      )
    );
  }, [users, query]);

  async function handleInvite(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const createdUser = await inviteUser(inviteForm);
      setUsers((current) => [createdUser, ...current]);
      setInviteForm(emptyInviteForm);
      setMessage('Da tao hoac gui loi moi cho tai khoan moi.');
    } catch (inviteError) {
      setError(inviteError.message ?? 'Khong tao duoc nguoi dung');
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(userId, role) {
    try {
      const updatedUser = await updateUserProfile(userId, { role });
      setUsers((current) =>
        current.map((user) => (user.id === userId ? { ...user, ...updatedUser } : user))
      );
    } catch (updateError) {
      setError(updateError.message ?? 'Khong cap nhat duoc vai tro');
    }
  }

  async function handleStatusToggle(user) {
    try {
      const updatedUser = await updateUserProfile(user.id, {
        is_active: !user.is_active
      });
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? { ...item, ...updatedUser } : item))
      );
    } catch (updateError) {
      setError(updateError.message ?? 'Khong cap nhat duoc trang thai');
    }
  }

  if (loading) {
    return <LoadingScreen label="Dang tai danh sach nguoi dung..." />;
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <GlassCard
          title="Moi tai khoan moi"
          subtitle="Neu da deploy edge function, he thong se tao user Supabase Auth va gan role ngay."
        >
          {can('users', 'create') ? (
            <form className="space-y-4" onSubmit={handleInvite}>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="input-shell"
                  value={inviteForm.full_name}
                  onChange={(event) =>
                    setInviteForm((current) => ({
                      ...current,
                      full_name: event.target.value
                    }))
                  }
                  placeholder="Ho ten"
                />
                <input
                  className="input-shell"
                  type="email"
                  value={inviteForm.email}
                  onChange={(event) =>
                    setInviteForm((current) => ({
                      ...current,
                      email: event.target.value
                    }))
                  }
                  placeholder="Email"
                />
                <select
                  className="input-shell"
                  value={inviteForm.role}
                  onChange={(event) =>
                    setInviteForm((current) => ({
                      ...current,
                      role: event.target.value
                    }))
                  }
                >
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <input
                  className="input-shell"
                  value={inviteForm.phone}
                  onChange={(event) =>
                    setInviteForm((current) => ({
                      ...current,
                      phone: event.target.value
                    }))
                  }
                  placeholder="So dien thoai"
                />
              </div>

              <button type="submit" className="button-primary" disabled={saving}>
                {saving ? 'Dang tao...' : 'Tao tai khoan'}
              </button>
            </form>
          ) : (
            <p className="text-sm leading-6 text-slate-500">
              Vai tro hien tai chi duoc xem danh sach va cap nhat han che.
            </p>
          )}

          {message ? (
            <div className="mt-4 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </GlassCard>

        <GlassCard
          title="Nhan su dang hoat dong"
          subtitle="Cap nhat role va khoa mo tai khoan ngay trong bang."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="glass-muted rounded-[24px] p-4">
              <p className="text-sm text-slate-500">Tong nhan su</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                {users.length}
              </p>
            </div>
            <div className="glass-muted rounded-[24px] p-4">
              <p className="text-sm text-slate-500">Dang kich hoat</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                {users.filter((user) => user.is_active).length}
              </p>
            </div>
            <div className="glass-muted rounded-[24px] p-4">
              <p className="text-sm text-slate-500">Admin / Manager</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                {users.filter((user) => ['admin', 'manager'].includes(user.role)).length}
              </p>
            </div>
          </div>
        </GlassCard>
      </section>

      <GlassCard
        title="Danh sach nguoi dung"
        subtitle="Sidebar va route se doi theo role sau khi cap nhat profile."
        actions={
          <input
            className="input-shell min-w-[240px]"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tim theo ten, email, role"
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-4 pr-4 font-medium">Nguoi dung</th>
                <th className="pb-4 pr-4 font-medium">Vai tro</th>
                <th className="pb-4 pr-4 font-medium">Trang thai</th>
                <th className="pb-4 pr-4 font-medium">Cap nhat</th>
                <th className="pb-4 font-medium">Hanh dong</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-t border-slate-200/60">
                  <td className="py-4 pr-4">
                    <p className="font-semibold text-slate-900">{user.full_name}</p>
                    <p className="mt-1 text-slate-500">{user.email}</p>
                  </td>
                  <td className="py-4 pr-4">
                    {can('users', 'update') ? (
                      <select
                        className="input-shell min-w-[160px]"
                        value={user.role}
                        onChange={(event) => handleRoleChange(user.id, event.target.value)}
                      >
                        {roleOptions.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <StatusBadge tone="info">{user.role}</StatusBadge>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    <StatusBadge tone={user.is_active ? 'success' : 'warning'}>
                      {user.is_active ? 'Active' : 'Pending / Locked'}
                    </StatusBadge>
                  </td>
                  <td className="py-4 pr-4 text-slate-500">
                    {formatDateTime(user.updated_at || user.created_at)}
                  </td>
                  <td className="py-4">
                    {can('users', 'update') ? (
                      <button
                        type="button"
                        onClick={() => handleStatusToggle(user)}
                        className="button-secondary"
                      >
                        {user.is_active ? 'Khoa' : 'Mo lai'}
                      </button>
                    ) : (
                      '--'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

export default UsersPage;
