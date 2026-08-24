import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, PiggyBank, ArrowDownCircle, Building2,
  FileText, Settings, LogOut, Menu, X, Wallet, TrendingUp, AlertTriangle
} from 'lucide-react';
import { api, formatMoney, formatDate } from './lib/api';

// ========== Login ==========
function Login({ onLogin }: { onLogin: (u: any) => void }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login(username, password);
      localStorage.setItem('token', res.token);
      onLogin(res.user);
    } catch (err: any) {
      setError(err.message || 'লগইন ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-700 to-teal-900 p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-700 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-bold mb-4">ব</div>
          <h1 className="text-2xl font-bold text-teal-900">বন্ধু সঞ্চয় সমিতি</h1>
          <p className="text-teal-600 text-sm mt-1">Savings Management System</p>
        </div>
        <form onSubmit={handle} className="space-y-4">
          <div>
            <label className="label">ইউজারনেম</label>
            <input className="input" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div>
            <label className="label">পাসওয়ার্ড</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'লগইন হচ্ছে...' : 'লগইন'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-6">Default: admin / admin123</p>
      </div>
    </div>
  );
}

// ========== Layout ==========
function Layout({ user, onLogout, children }: { user: any; onLogout: () => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = [
    { to: '/', icon: LayoutDashboard, label: 'ড্যাশবোর্ড' },
    { to: '/members', icon: Users, label: 'সদস্য' },
    { to: '/savings', icon: PiggyBank, label: 'সঞ্চয়' },
    { to: '/withdrawals', icon: ArrowDownCircle, label: 'উত্তোলন' },
    { to: '/banks', icon: Building2, label: 'ব্যাংক' },
    { to: '/fdr', icon: Wallet, label: 'FDR' },
    { to: '/income-expense', icon: TrendingUp, label: 'আয়-ব্যয়' },
    { to: '/reports', icon: FileText, label: 'রিপোর্ট' },
    { to: '/settings', icon: Settings, label: 'সেটিংস' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:w-64 bg-teal-800 text-white flex-col fixed h-full">
        <div className="p-5 border-b border-teal-700">
          <h1 className="font-bold text-lg">বন্ধু সঞ্চয় সমিতি</h1>
          <p className="text-teal-200 text-xs">{user?.full_name || user?.username}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map(n => (
            <Link key={n.to} to={n.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${loc.pathname === n.to ? 'bg-teal-600' : 'hover:bg-teal-700'}`}>
              <n.icon size={20} /> {n.label}
            </Link>
          ))}
        </nav>
        <button onClick={onLogout} className="m-3 flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-teal-700 text-left">
          <LogOut size={20} /> লগআউট
        </button>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden bg-teal-800 text-white p-4 flex items-center justify-between sticky top-0 z-40">
        <h1 className="font-bold">বন্ধু সঞ্চয় সমিতি</h1>
        <button onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </header>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)}>
          <div className="bg-teal-800 text-white w-72 h-full p-4" onClick={e => e.stopPropagation()}>
            <nav className="space-y-1 mt-4">
              {nav.map(n => (
                <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${loc.pathname === n.to ? 'bg-teal-600' : ''}`}>
                  <n.icon size={20} /> {n.label}
                </Link>
              ))}
              <button onClick={onLogout} className="flex items-center gap-2 px-3 py-2.5 w-full text-left">
                <LogOut size={20} /> লগআউট
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 md:ml-64 p-4 pb-24 md:pb-6 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-teal-100 flex justify-around py-2 safe-bottom z-40">
        {nav.slice(0, 5).map(n => (
          <Link key={n.to} to={n.to} className={`flex flex-col items-center text-xs p-1 ${loc.pathname === n.to ? 'text-teal-700' : 'text-gray-500'}`}>
            <n.icon size={22} />
            <span className="mt-0.5">{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

// ========== Dashboard ==========
function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-teal-600">লোড হচ্ছে...</div>;
  if (!data) return <div className="text-center py-20 text-red-500">ডাটা লোড করতে ব্যর্থ</div>;

  const cards = [
    { label: 'মোট সদস্য', value: data.totalMembers, color: 'bg-blue-50 text-blue-800' },
    { label: 'মোট সঞ্চয়', value: formatMoney(data.totalSavings), color: 'bg-teal-50 text-teal-800' },
    { label: 'আজকের জমা', value: formatMoney(data.todayDeposit), color: 'bg-green-50 text-green-800' },
    { label: 'আজকের উত্তোলন', value: formatMoney(data.todayWithdraw), color: 'bg-orange-50 text-orange-800' },
    { label: 'মোট উত্তোলন', value: formatMoney(data.totalWithdraw), color: 'bg-red-50 text-red-800' },
    { label: 'Cash Balance', value: formatMoney(data.cashBalance), color: 'bg-emerald-50 text-emerald-800' },
    { label: 'Bank Balance', value: formatMoney(data.bankBalance), color: 'bg-indigo-50 text-indigo-800' },
    { label: 'মোট FDR', value: data.fdrCount, color: 'bg-purple-50 text-purple-800' },
    { label: 'FDR Principal', value: formatMoney(data.fdrPrincipal), color: 'bg-violet-50 text-violet-800' },
    { label: 'FDR Maturity', value: formatMoney(data.fdrMaturity), color: 'bg-fuchsia-50 text-fuchsia-800' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-teal-900">ড্যাশবোর্ড</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c, i) => (
          <div key={i} className={`card ${c.color}`}>
            <p className="text-xs opacity-80">{c.label}</p>
            <p className="text-lg font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {data.fdrAlerts?.length > 0 && (
        <div className="card border-amber-200 bg-amber-50">
          <h3 className="font-semibold text-amber-800 flex items-center gap-2"><AlertTriangle size={18} /> FDR Maturity Alert (৩০ দিন)</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {data.fdrAlerts.map((f: any) => (
              <li key={f.id}>{f.fdr_id} — {f.bank_name} — {formatDate(f.maturity_date)} — {formatMoney(f.expected_maturity)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-teal-900 mb-3">সাম্প্রতিক লেনদেন</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-teal-700 border-b">
                <th className="py-2">ধরন</th>
                <th>রসিদ</th>
                <th>সদস্য</th>
                <th>তারিখ</th>
                <th className="text-right">পরিমাণ</th>
              </tr>
            </thead>
            <tbody>
              {(data.recentTransactions || []).map((t: any, i: number) => (
                <tr key={i} className="border-b border-teal-50">
                  <td className="py-2">{t.type === 'deposit' ? 'জমা' : 'উত্তোলন'}</td>
                  <td>{t.receipt_no}</td>
                  <td>{t.member_name}</td>
                  <td>{formatDate(t.date)}</td>
                  <td className="text-right font-medium">{formatMoney(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ========== Members ==========
function Members() {
  const [members, setMembers] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ member_id: '', name: '', father_or_husband: '', mobile: '', address: '', join_date: new Date().toISOString().slice(0,10), monthly_saving: 500, notes: '' });
  const [msg, setMsg] = useState('');

  const load = () => api.members(q).then(r => setMembers(r.members || [])).catch(console.error);
  useEffect(() => { load(); }, [q]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMember(form);
      setMsg('সদস্য যোগ হয়েছে');
      setShowForm(false);
      setForm({ member_id: '', name: '', father_or_husband: '', mobile: '', address: '', join_date: new Date().toISOString().slice(0,10), monthly_saving: 500, notes: '' });
      load();
    } catch (err: any) {
      setMsg(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-teal-900">সদস্য ব্যবস্থাপনা</h2>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ নতুন সদস্য</button>
      </div>
      <input className="input max-w-md" placeholder="নাম / আইডি / মোবাইল দিয়ে খুঁজুন..." value={q} onChange={e => setQ(e.target.value)} />
      {msg && <p className="text-sm text-teal-700">{msg}</p>}

      {showForm && (
        <div className="card">
          <h3 className="font-semibold mb-3">নতুন সদস্য</h3>
          <form onSubmit={save} className="grid md:grid-cols-2 gap-3">
            <div><label className="label">সদস্য আইডি *</label><input className="input" required value={form.member_id} onChange={e => setForm({...form, member_id: e.target.value})} /></div>
            <div><label className="label">নাম *</label><input className="input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div><label className="label">পিতা/স্বামী</label><input className="input" value={form.father_or_husband} onChange={e => setForm({...form, father_or_husband: e.target.value})} /></div>
            <div><label className="label">মোবাইল</label><input className="input" value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} /></div>
            <div><label className="label">যোগদানের তারিখ *</label><input className="input" type="date" required value={form.join_date} onChange={e => setForm({...form, join_date: e.target.value})} /></div>
            <div><label className="label">মাসিক সঞ্চয়</label><input className="input" type="number" value={form.monthly_saving} onChange={e => setForm({...form, monthly_saving: +e.target.value})} /></div>
            <div className="md:col-span-2"><label className="label">ঠিকানা</label><input className="input" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="btn-primary">সংরক্ষণ</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>বাতিল</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-teal-700 border-b">
              <th className="py-2">আইডি</th><th>নাম</th><th>মোবাইল</th><th>মাসিক</th><th>ব্যালেন্স</th><th>স্ট্যাটাস</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id} className="border-b border-teal-50 hover:bg-teal-50/50">
                <td className="py-2 font-medium">{m.member_id}</td>
                <td>{m.name}</td>
                <td>{m.mobile}</td>
                <td>{formatMoney(m.monthly_saving)}</td>
                <td className="font-semibold text-teal-800">{formatMoney(m.balance)}</td>
                <td><span className={`px-2 py-0.5 rounded-full text-xs ${m.status==='active'?'bg-green-100 text-green-800':'bg-gray-100'}`}>{m.status==='active'?'সক্রিয়':'নিষ্ক্রিয়'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && <p className="text-center py-8 text-gray-400">কোনো সদস্য নেই</p>}
      </div>
    </div>
  );
}

// ========== Savings ==========
function Savings() {
  const [list, setList] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ member_id: '', date: new Date().toISOString().slice(0,10), month: new Date().toISOString().slice(0,7), amount: 500, payment_method: 'cash', note: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.savings().then(r => setList(r.savings || []));
    api.members().then(r => setMembers(r.members || []));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createSaving({ ...form, member_id: +form.member_id });
      setMsg(`সফল! রসিদ: ${res.receipt_no}`);
      setShow(false);
      api.savings().then(r => setList(r.savings || []));
    } catch (err: any) {
      setMsg(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-teal-900">সঞ্চয় জমা</h2>
        <button className="btn-primary" onClick={() => setShow(true)}>+ নতুন জমা</button>
      </div>
      {msg && <p className="text-sm text-teal-700 bg-teal-50 p-2 rounded-lg">{msg}</p>}
      {show && (
        <div className="card">
          <form onSubmit={save} className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="label">সদস্য *</label>
              <select className="input" required value={form.member_id} onChange={e => setForm({...form, member_id: e.target.value})}>
                <option value="">নির্বাচন করুন</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.member_id} - {m.name}</option>)}
              </select>
            </div>
            <div><label className="label">তারিখ</label><input className="input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
            <div><label className="label">মাস (YYYY-MM)</label><input className="input" value={form.month} onChange={e => setForm({...form, month: e.target.value})} /></div>
            <div><label className="label">পরিমাণ</label><input className="input" type="number" value={form.amount} onChange={e => setForm({...form, amount: +e.target.value})} /></div>
            <div>
              <label className="label">পেমেন্ট</label>
              <select className="input" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                <option value="cash">নগদ</option>
                <option value="bank">ব্যাংক</option>
              </select>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="btn-primary">জমা দিন</button>
              <button type="button" className="btn-secondary" onClick={() => setShow(false)}>বাতিল</button>
            </div>
          </form>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-teal-700 border-b"><th className="py-2">রসিদ</th><th>সদস্য</th><th>মাস</th><th>তারিখ</th><th className="text-right">পরিমাণ</th></tr></thead>
          <tbody>
            {list.map(s => (
              <tr key={s.id} className="border-b border-teal-50">
                <td className="py-2">{s.receipt_no}</td>
                <td>{s.member_name}</td>
                <td>{s.month}</td>
                <td>{formatDate(s.date)}</td>
                <td className="text-right font-medium">{formatMoney(s.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ========== Withdrawals ==========
function Withdrawals() {
  const [list, setList] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ member_id: '', date: new Date().toISOString().slice(0,10), amount: 0, payment_method: 'cash', reason: '', note: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.withdrawals().then(r => setList(r.withdrawals || []));
    api.members().then(r => setMembers(r.members || []));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createWithdrawal({ ...form, member_id: +form.member_id });
      setMsg(`সফল! রসিদ: ${res.receipt_no}`);
      setShow(false);
      api.withdrawals().then(r => setList(r.withdrawals || []));
    } catch (err: any) {
      setMsg(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-teal-900">টাকা উত্তোলন</h2>
        <button className="btn-primary" onClick={() => setShow(true)}>+ নতুন উত্তোলন</button>
      </div>
      {msg && <p className="text-sm text-teal-700 bg-teal-50 p-2 rounded-lg">{msg}</p>}
      {show && (
        <div className="card">
          <form onSubmit={save} className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="label">সদস্য *</label>
              <select className="input" required value={form.member_id} onChange={e => setForm({...form, member_id: e.target.value})}>
                <option value="">নির্বাচন করুন</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.member_id} - {m.name} (ব্যালেন্স: {formatMoney(m.balance)})</option>)}
              </select>
            </div>
            <div><label className="label">তারিখ</label><input className="input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
            <div><label className="label">পরিমাণ</label><input className="input" type="number" value={form.amount} onChange={e => setForm({...form, amount: +e.target.value})} /></div>
            <div>
              <label className="label">পেমেন্ট</label>
              <select className="input" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                <option value="cash">নগদ</option>
                <option value="bank">ব্যাংক</option>
              </select>
            </div>
            <div className="md:col-span-2"><label className="label">কারণ</label><input className="input" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} /></div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="btn-primary">উত্তোলন</button>
              <button type="button" className="btn-secondary" onClick={() => setShow(false)}>বাতিল</button>
            </div>
          </form>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-teal-700 border-b"><th className="py-2">রসিদ</th><th>সদস্য</th><th>তারিখ</th><th className="text-right">পরিমাণ</th></tr></thead>
          <tbody>
            {list.map(w => (
              <tr key={w.id} className="border-b border-teal-50">
                <td className="py-2">{w.receipt_no}</td>
                <td>{w.member_name}</td>
                <td>{formatDate(w.date)}</td>
                <td className="text-right font-medium text-red-700">{formatMoney(w.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ========== Banks ==========
function Banks() {
  const [banks, setBanks] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ bank_name: '', branch: '', account_name: '', account_number: '', account_type: 'Savings', opening_balance: 0, note: '' });

  useEffect(() => { api.banks().then(r => setBanks(r.banks || [])); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createBank(form);
    setShow(false);
    api.banks().then(r => setBanks(r.banks || []));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between"><h2 className="text-2xl font-bold text-teal-900">ব্যাংক হিসাব</h2>
        <button className="btn-primary" onClick={() => setShow(true)}>+ নতুন অ্যাকাউন্ট</button></div>
      {show && (
        <div className="card">
          <form onSubmit={save} className="grid md:grid-cols-2 gap-3">
            <div><label className="label">ব্যাংকের নাম *</label><input className="input" required value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} /></div>
            <div><label className="label">শাখা</label><input className="input" value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} /></div>
            <div><label className="label">অ্যাকাউন্ট নাম</label><input className="input" value={form.account_name} onChange={e => setForm({...form, account_name: e.target.value})} /></div>
            <div><label className="label">অ্যাকাউন্ট নম্বর *</label><input className="input" required value={form.account_number} onChange={e => setForm({...form, account_number: e.target.value})} /></div>
            <div><label className="label">ওপেনিং ব্যালেন্স</label><input className="input" type="number" value={form.opening_balance} onChange={e => setForm({...form, opening_balance: +e.target.value})} /></div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="btn-primary">সংরক্ষণ</button>
              <button type="button" className="btn-secondary" onClick={() => setShow(false)}>বাতিল</button>
            </div>
          </form>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-3">
        {banks.map(b => (
          <div key={b.id} className="card">
            <h3 className="font-bold text-teal-900">{b.bank_name}</h3>
            <p className="text-sm text-gray-600">{b.branch} • {b.account_number}</p>
            <p className="text-xl font-bold text-teal-700 mt-2">{formatMoney(b.current_balance)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== FDR ==========
function FDR() {
  const [fdrs, setFdrs] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ fdr_number: '', bank_name: '', branch: '', account_number: '', opening_date: new Date().toISOString().slice(0,10), principal: 100000, interest_rate: 8, tenure_months: 12, note: '' });

  useEffect(() => { api.fdrs().then(r => setFdrs(r.fdrs || [])); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createFdr(form);
    setShow(false);
    api.fdrs().then(r => setFdrs(r.fdrs || []));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between"><h2 className="text-2xl font-bold text-teal-900">FDR ব্যবস্থাপনা</h2>
        <button className="btn-primary" onClick={() => setShow(true)}>+ নতুন FDR</button></div>
      {show && (
        <div className="card">
          <form onSubmit={save} className="grid md:grid-cols-2 gap-3">
            <div><label className="label">FDR নম্বর *</label><input className="input" required value={form.fdr_number} onChange={e => setForm({...form, fdr_number: e.target.value})} /></div>
            <div><label className="label">ব্যাংক *</label><input className="input" required value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} /></div>
            <div><label className="label">ওপেনিং তারিখ</label><input className="input" type="date" value={form.opening_date} onChange={e => setForm({...form, opening_date: e.target.value})} /></div>
            <div><label className="label">Principal</label><input className="input" type="number" value={form.principal} onChange={e => setForm({...form, principal: +e.target.value})} /></div>
            <div><label className="label">Interest Rate %</label><input className="input" type="number" step="0.1" value={form.interest_rate} onChange={e => setForm({...form, interest_rate: +e.target.value})} /></div>
            <div><label className="label">Tenure (মাস)</label><input className="input" type="number" value={form.tenure_months} onChange={e => setForm({...form, tenure_months: +e.target.value})} /></div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="btn-primary">সংরক্ষণ</button>
              <button type="button" className="btn-secondary" onClick={() => setShow(false)}>বাতিল</button>
            </div>
          </form>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-teal-700 border-b"><th className="py-2">FDR ID</th><th>ব্যাংক</th><th>Principal</th><th>Rate</th><th>Maturity</th><th>Expected</th><th>Status</th></tr></thead>
          <tbody>
            {fdrs.map(f => (
              <tr key={f.id} className="border-b border-teal-50">
                <td className="py-2 font-medium">{f.fdr_id}</td>
                <td>{f.bank_name}</td>
                <td>{formatMoney(f.principal)}</td>
                <td>{f.interest_rate}%</td>
                <td>{formatDate(f.maturity_date)}</td>
                <td>{formatMoney(f.expected_maturity)}</td>
                <td><span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">{f.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ========== Income Expense ==========
function IncomeExpense() {
  const [income, setIncome] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [tab, setTab] = useState<'income'|'expense'>('income');
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), category: '', amount: 0, payment_method: 'cash', description: '' });

  const load = () => {
    api.income().then(r => setIncome(r.income || []));
    api.expenses().then(r => setExpenses(r.expenses || []));
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'income') await api.createIncome(form);
    else await api.createExpense(form);
    setForm({ ...form, category: '', amount: 0, description: '' });
    load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-teal-900">আয়-ব্যয়</h2>
      <div className="flex gap-2">
        <button className={tab==='income'?'btn-primary':'btn-secondary'} onClick={() => setTab('income')}>আয়</button>
        <button className={tab==='expense'?'btn-primary':'btn-secondary'} onClick={() => setTab('expense')}>ব্যয়</button>
      </div>
      <div className="card">
        <form onSubmit={save} className="grid md:grid-cols-3 gap-3">
          <div><label className="label">তারিখ</label><input className="input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
          <div><label className="label">ক্যাটাগরি</label><input className="input" required value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="যেমন: অফিস ভাড়া" /></div>
          <div><label className="label">পরিমাণ</label><input className="input" type="number" required value={form.amount} onChange={e => setForm({...form, amount: +e.target.value})} /></div>
          <div className="md:col-span-3"><button type="submit" className="btn-primary">যোগ করুন</button></div>
        </form>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-teal-700 border-b"><th className="py-2">তারিখ</th><th>ক্যাটাগরি</th><th className="text-right">পরিমাণ</th></tr></thead>
          <tbody>
            {(tab==='income'?income:expenses).map((x: any) => (
              <tr key={x.id} className="border-b border-teal-50">
                <td className="py-2">{formatDate(x.date)}</td>
                <td>{x.category}</td>
                <td className={`text-right font-medium ${tab==='income'?'text-green-700':'text-red-700'}`}>{formatMoney(x.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ========== Reports ==========
function Reports() {
  const [dues, setDues] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    api.dues(month).then(r => setDues(r.dues || []));
    api.reportSummary().then(setSummary).catch(() => {});
  }, [month]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-teal-900">রিপোর্ট</h2>
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card bg-green-50"><p className="text-xs">মোট জমা ({summary.year})</p><p className="font-bold text-lg">{formatMoney(summary.deposits)}</p></div>
          <div className="card bg-red-50"><p className="text-xs">মোট উত্তোলন</p><p className="font-bold text-lg">{formatMoney(summary.withdrawals)}</p></div>
          <div className="card bg-blue-50"><p className="text-xs">আয়</p><p className="font-bold text-lg">{formatMoney(summary.income)}</p></div>
          <div className="card bg-orange-50"><p className="text-xs">ব্যয়</p><p className="font-bold text-lg">{formatMoney(summary.expense)}</p></div>
        </div>
      )}
      <div className="card">
        <div className="flex items-center gap-3 mb-3">
          <h3 className="font-semibold">বকেয়া সঞ্চয় রিপোর্ট</h3>
          <input className="input w-40" type="month" value={month} onChange={e => setMonth(e.target.value)} />
        </div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-teal-700 border-b"><th className="py-2">সদস্য</th><th>প্রত্যাশিত</th><th>জমা</th><th>বকেয়া</th></tr></thead>
          <tbody>
            {dues.map((d, i) => (
              <tr key={i} className="border-b border-teal-50">
                <td className="py-2">{d.name} ({d.member_id})</td>
                <td>{formatMoney(d.expected)}</td>
                <td>{formatMoney(d.paid)}</td>
                <td className="font-semibold text-red-700">{formatMoney(d.due)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-gray-500">অন্যান্য রিপোর্ট (Member Statement, Cash Book, FDR Report ইত্যাদি) Dashboard ও module থেকে দেখা যাবে। PDF export পরবর্তী আপডেটে যোগ করা যাবে।</p>
    </div>
  );
}

// ========== Settings ==========
function SettingsPage() {
  const [s, setS] = useState<any>(null);
  const [pwd, setPwd] = useState({ current: '', newP: '', confirm: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => { api.settings().then(r => setS(r.settings)); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.updateSettings(s);
    setMsg('সেটিংস আপডেট হয়েছে');
  };

  const changePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.newP !== pwd.confirm) return setMsg('নতুন পাসওয়ার্ড মিলছে না');
    try {
      await api.changePassword(pwd.current, pwd.newP);
      setMsg('পাসওয়ার্ড পরিবর্তন হয়েছে');
      setPwd({ current: '', newP: '', confirm: '' });
    } catch (err: any) {
      setMsg(err.message);
    }
  };

  const doBackup = async () => {
    const data = await api.backup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bondhu-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  if (!s) return <div>লোড হচ্ছে...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-teal-900">সেটিংস</h2>
      {msg && <p className="text-sm text-teal-700 bg-teal-50 p-2 rounded">{msg}</p>}
      <div className="card">
        <h3 className="font-semibold mb-3">সমিতির তথ্য</h3>
        <form onSubmit={save} className="space-y-3">
          <div><label className="label">সমিতির নাম</label><input className="input" value={s.society_name || ''} onChange={e => setS({...s, society_name: e.target.value})} /></div>
          <div><label className="label">ঠিকানা</label><input className="input" value={s.address || ''} onChange={e => setS({...s, address: e.target.value})} /></div>
          <div><label className="label">মোবাইল</label><input className="input" value={s.mobile || ''} onChange={e => setS({...s, mobile: e.target.value})} /></div>
          <div>
            <label className="label">Interest Calculation</label>
            <select className="input" value={s.interest_calc_method || 'simple'} onChange={e => setS({...s, interest_calc_method: e.target.value})}>
              <option value="simple">Simple Interest</option>
              <option value="compound">Compound Interest</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">সংরক্ষণ</button>
        </form>
      </div>
      <div className="card">
        <h3 className="font-semibold mb-3">পাসওয়ার্ড পরিবর্তন</h3>
        <form onSubmit={changePwd} className="space-y-3">
          <div><label className="label">বর্তমান পাসওয়ার্ড</label><input className="input" type="password" value={pwd.current} onChange={e => setPwd({...pwd, current: e.target.value})} /></div>
          <div><label className="label">নতুন পাসওয়ার্ড</label><input className="input" type="password" value={pwd.newP} onChange={e => setPwd({...pwd, newP: e.target.value})} /></div>
          <div><label className="label">নিশ্চিত করুন</label><input className="input" type="password" value={pwd.confirm} onChange={e => setPwd({...pwd, confirm: e.target.value})} /></div>
          <button type="submit" className="btn-primary">পরিবর্তন করুন</button>
        </form>
      </div>
      <div className="card">
        <h3 className="font-semibold mb-3">Backup</h3>
        <button className="btn-secondary" onClick={doBackup}>JSON Backup ডাউনলোড</button>
      </div>
    </div>
  );
}

// ========== App Root ==========
export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.me().then(r => setUser(r.user)).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  const logout = async () => {
    try { await api.logout(); } catch {}
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-teal-700">লোড হচ্ছে...</div>;
  if (!user) return <Login onLogin={setUser} />;

  return (
    <Layout user={user} onLogout={logout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/savings" element={<Savings />} />
        <Route path="/withdrawals" element={<Withdrawals />} />
        <Route path="/banks" element={<Banks />} />
        <Route path="/fdr" element={<FDR />} />
        <Route path="/income-expense" element={<IncomeExpense />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}
