const API = '/api';

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any)
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  login: (username: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),

  dashboard: () => request('/dashboard'),

  members: (q = '', status = '') => request(`/members?q=${encodeURIComponent(q)}&status=${status}`),
  member: (id: string | number) => request(`/members/${id}`),
  createMember: (data: any) => request('/members', { method: 'POST', body: JSON.stringify(data) }),
  updateMember: (id: string | number, data: any) => request(`/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMember: (id: string | number) => request(`/members/${id}`, { method: 'DELETE' }),

  savings: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/savings?${qs}`);
  },
  createSaving: (data: any) => request('/savings', { method: 'POST', body: JSON.stringify(data) }),
  deleteSaving: (id: string | number) => request(`/savings/${id}`, { method: 'DELETE' }),

  withdrawals: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/withdrawals?${qs}`);
  },
  createWithdrawal: (data: any) => request('/withdrawals', { method: 'POST', body: JSON.stringify(data) }),

  banks: () => request('/banks'),
  createBank: (data: any) => request('/banks', { method: 'POST', body: JSON.stringify(data) }),
  updateBank: (id: string | number, data: any) => request(`/banks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  fdrs: (status = '') => request(`/fdrs?status=${status}`),
  createFdr: (data: any) => request('/fdrs', { method: 'POST', body: JSON.stringify(data) }),
  updateFdrStatus: (id: string | number, status: string) =>
    request(`/fdrs/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  income: () => request('/income'),
  createIncome: (data: any) => request('/income', { method: 'POST', body: JSON.stringify(data) }),
  expenses: () => request('/expenses'),
  createExpense: (data: any) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),

  dues: (month?: string) => request(`/dues${month ? `?month=${month}` : ''}`),
  settings: () => request('/settings'),
  updateSettings: (data: any) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  backup: () => request('/backup'),
  reportSummary: (year?: string) => request(`/reports/summary${year ? `?year=${year}` : ''}`)
};

export function formatMoney(n: number) {
  return new Intl.NumberFormat('bn-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(n || 0);
}

export function formatDate(d: string) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('bn-BD');
  } catch {
    return d;
  }
}
