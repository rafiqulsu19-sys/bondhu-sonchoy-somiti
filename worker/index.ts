import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import * as bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  JWT_SECRET: string;
  APP_NAME: string;
};

type Variables = {
  userId: number;
  username: string;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', cors({ origin: '*', credentials: true }));

// ========== Helpers ==========
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

async function createToken(userId: number, username: string, secret: string) {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ userId, username })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(key);
}

async function audit(db: D1Database, userId: number | null, action: string, entityType: string, entityId: number | null, details: string) {
  await db.prepare(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`
  ).bind(userId, action, entityType, entityId, details).run();
}

// Auth middleware
const authMiddleware = async (c: any, next: any) => {
  const token = getCookie(c, 'token') || c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const key = new TextEncoder().encode(c.env.JWT_SECRET || 'change-this-to-a-long-random-secret-in-production');
    const { payload } = await jwtVerify(token, key);
    c.set('userId', payload.userId as number);
    c.set('username', payload.username as string);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
};

// ========== Auth Routes ==========
app.post('/api/auth/login', async (c) => {
  const { username, password } = await c.req.json();
  if (!username || !password) return c.json({ error: 'Username and password required' }, 400);

  const user = await c.env.DB.prepare(
    `SELECT * FROM users WHERE username = ? AND is_active = 1`
  ).bind(username).first<any>();

  if (!user) return c.json({ error: 'Invalid credentials' }, 401);

  // First time: if hash is placeholder, set real hash
  let valid = false;
  if (user.password_hash.startsWith('$2a$10$rQZ8')) {
    // Placeholder - accept admin123 and update
    if (password === 'admin123') {
      const newHash = await hashPassword('admin123');
      await c.env.DB.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).bind(newHash, user.id).run();
      valid = true;
    }
  } else {
    valid = await verifyPassword(password, user.password_hash);
  }

  if (!valid) return c.json({ error: 'Invalid credentials' }, 401);

  const token = await createToken(user.id, user.username, c.env.JWT_SECRET || 'change-this-to-a-long-random-secret-in-production');
  setCookie(c, 'token', token, { httpOnly: true, secure: true, sameSite: 'Lax', maxAge: 7 * 24 * 3600, path: '/' });

  await audit(c.env.DB, user.id, 'LOGIN', 'user', user.id, 'User logged in');

  return c.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      must_change_password: !!user.must_change_password
    },
    token
  });
});

app.post('/api/auth/logout', authMiddleware, async (c) => {
  deleteCookie(c, 'token', { path: '/' });
  await audit(c.env.DB, c.get('userId'), 'LOGOUT', 'user', c.get('userId'), 'User logged out');
  return c.json({ success: true });
});

app.post('/api/auth/change-password', authMiddleware, async (c) => {
  const { currentPassword, newPassword } = await c.req.json();
  if (!newPassword || newPassword.length < 6) return c.json({ error: 'New password min 6 chars' }, 400);

  const user = await c.env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(c.get('userId')).first<any>();
  if (!user) return c.json({ error: 'User not found' }, 404);

  const valid = await verifyPassword(currentPassword, user.password_hash);
  if (!valid && !(user.password_hash.startsWith('$2a$10$rQZ8') && currentPassword === 'admin123')) {
    return c.json({ error: 'Current password incorrect' }, 400);
  }

  const hash = await hashPassword(newPassword);
  await c.env.DB.prepare(
    `UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime('now') WHERE id = ?`
  ).bind(hash, user.id).run();

  await audit(c.env.DB, user.id, 'CHANGE_PASSWORD', 'user', user.id, 'Password changed');
  return c.json({ success: true });
});

app.get('/api/auth/me', authMiddleware, async (c) => {
  const user = await c.env.DB.prepare(
    `SELECT id, username, email, full_name, role, must_change_password FROM users WHERE id = ?`
  ).bind(c.get('userId')).first();
  return c.json({ user });
});

// ========== Dashboard ==========
app.get('/api/dashboard', authMiddleware, async (c) => {
  const db = c.env.DB;
  const today = new Date().toISOString().slice(0, 10);

  const [members, savings, todayDeposit, todayWithdraw, totalWithdraw, fdrStats, recent, maturing] = await Promise.all([
    db.prepare(`SELECT COUNT(*) as c FROM members WHERE status = 'active' AND deleted_at IS NULL`).first<{ c: number }>(),
    db.prepare(`SELECT COALESCE(SUM(balance), 0) as total FROM members WHERE deleted_at IS NULL`).first<{ total: number }>(),
    db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM savings WHERE date = ? AND deleted_at IS NULL`).bind(today).first<{ total: number }>(),
    db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE date = ? AND deleted_at IS NULL`).bind(today).first<{ total: number }>(),
    db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE deleted_at IS NULL`).first<{ total: number }>(),
    db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(principal), 0) as principal, COALESCE(SUM(expected_maturity), 0) as maturity
      FROM fdrs WHERE status = 'active' AND deleted_at IS NULL
    `).first<any>(),
    db.prepare(`
      SELECT 'deposit' as type, s.receipt_no, s.date, s.amount, m.name as member_name, s.created_at
      FROM savings s JOIN members m ON m.id = s.member_id
      WHERE s.deleted_at IS NULL
      UNION ALL
      SELECT 'withdrawal' as type, w.receipt_no, w.date, w.amount, m.name as member_name, w.created_at
      FROM withdrawals w JOIN members m ON m.id = w.member_id
      WHERE w.deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 10
    `).all(),
    db.prepare(`
      SELECT * FROM fdrs
      WHERE status = 'active' AND deleted_at IS NULL
      AND maturity_date <= date('now', '+30 days')
      ORDER BY maturity_date ASC
    `).all()
  ]);

  // Cash balance calculation
  const cashIncome = await db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM income WHERE payment_method='cash' AND deleted_at IS NULL`).first<{ t: number }>();
  const cashExpense = await db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE payment_method='cash' AND deleted_at IS NULL`).first<{ t: number }>();
  const cashDeposit = await db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM savings WHERE payment_method='cash' AND deleted_at IS NULL`).first<{ t: number }>();
  const cashWithdraw = await db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM withdrawals WHERE payment_method='cash' AND deleted_at IS NULL`).first<{ t: number }>();
  const cashBalance = (cashIncome?.t || 0) + (cashDeposit?.t || 0) - (cashExpense?.t || 0) - (cashWithdraw?.t || 0);

  const bankBalance = await db.prepare(`SELECT COALESCE(SUM(current_balance),0) as t FROM bank_accounts WHERE is_active=1 AND deleted_at IS NULL`).first<{ t: number }>();

  return c.json({
    totalMembers: members?.c || 0,
    totalSavings: savings?.total || 0,
    todayDeposit: todayDeposit?.total || 0,
    todayWithdraw: todayWithdraw?.total || 0,
    totalWithdraw: totalWithdraw?.total || 0,
    cashBalance,
    bankBalance: bankBalance?.t || 0,
    fdrCount: fdrStats?.count || 0,
    fdrPrincipal: fdrStats?.principal || 0,
    fdrMaturity: fdrStats?.maturity || 0,
    recentTransactions: recent.results || [],
    fdrAlerts: maturing.results || []
  });
});

// ========== Members ==========
app.get('/api/members', authMiddleware, async (c) => {
  const q = c.req.query('q') || '';
  const status = c.req.query('status') || '';
  let sql = `SELECT * FROM members WHERE deleted_at IS NULL`;
  const params: any[] = [];
  if (q) {
    sql += ` AND (name LIKE ? OR member_id LIKE ? OR mobile LIKE ?)`;
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY name ASC`;
  const result = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ members: result.results });
});

app.get('/api/members/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const member = await c.env.DB.prepare(`SELECT * FROM members WHERE id = ? AND deleted_at IS NULL`).bind(id).first();
  if (!member) return c.json({ error: 'Not found' }, 404);

  const deposits = await c.env.DB.prepare(
    `SELECT * FROM savings WHERE member_id = ? AND deleted_at IS NULL ORDER BY date DESC`
  ).bind(id).all();
  const withdrawals = await c.env.DB.prepare(
    `SELECT * FROM withdrawals WHERE member_id = ? AND deleted_at IS NULL ORDER BY date DESC`
  ).bind(id).all();

  return c.json({ member, deposits: deposits.results, withdrawals: withdrawals.results });
});

app.post('/api/members', authMiddleware, async (c) => {
  const body = await c.req.json();
  const { member_id, name, father_or_husband, mobile, address, join_date, monthly_saving, notes } = body;
  if (!member_id || !name || !join_date) return c.json({ error: 'Required fields missing' }, 400);

  const exists = await c.env.DB.prepare(`SELECT id FROM members WHERE member_id = ?`).bind(member_id).first();
  if (exists) return c.json({ error: 'Member ID already exists' }, 400);

  const result = await c.env.DB.prepare(`
    INSERT INTO members (member_id, name, father_or_husband, mobile, address, join_date, monthly_saving, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(member_id, name, father_or_husband || null, mobile || null, address || null, join_date, monthly_saving || 0, notes || null).run();

  await audit(c.env.DB, c.get('userId'), 'CREATE', 'member', result.meta.last_row_id as number, `Created member ${member_id}`);
  return c.json({ success: true, id: result.meta.last_row_id });
});

app.put('/api/members/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, father_or_husband, mobile, address, monthly_saving, status, notes } = body;

  await c.env.DB.prepare(`
    UPDATE members SET name=?, father_or_husband=?, mobile=?, address=?, monthly_saving=?, status=?, notes=?, updated_at=datetime('now')
    WHERE id=? AND deleted_at IS NULL
  `).bind(name, father_or_husband, mobile, address, monthly_saving, status || 'active', notes, id).run();

  await audit(c.env.DB, c.get('userId'), 'UPDATE', 'member', Number(id), `Updated member ${id}`);
  return c.json({ success: true });
});

app.delete('/api/members/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare(`UPDATE members SET deleted_at=datetime('now'), status='inactive' WHERE id=?`).bind(id).run();
  await audit(c.env.DB, c.get('userId'), 'DELETE', 'member', Number(id), `Soft deleted member ${id}`);
  return c.json({ success: true });
});

// ========== Savings ==========
app.get('/api/savings', authMiddleware, async (c) => {
  const memberId = c.req.query('member_id');
  const month = c.req.query('month');
  const from = c.req.query('from');
  const to = c.req.query('to');
  let sql = `
    SELECT s.*, m.name as member_name, m.member_id as member_code
    FROM savings s JOIN members m ON m.id = s.member_id
    WHERE s.deleted_at IS NULL
  `;
  const params: any[] = [];
  if (memberId) { sql += ` AND s.member_id = ?`; params.push(memberId); }
  if (month) { sql += ` AND s.month = ?`; params.push(month); }
  if (from) { sql += ` AND s.date >= ?`; params.push(from); }
  if (to) { sql += ` AND s.date <= ?`; params.push(to); }
  sql += ` ORDER BY s.date DESC LIMIT 500`;
  const result = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ savings: result.results });
});

app.post('/api/savings', authMiddleware, async (c) => {
  const body = await c.req.json();
  const { member_id, date, month, amount, payment_method, note, bank_account_id } = body;
  if (!member_id || !date || !month || !amount || amount <= 0) return c.json({ error: 'Invalid data' }, 400);

  // Duplicate check
  const dup = await c.env.DB.prepare(
    `SELECT id FROM savings WHERE member_id=? AND month=? AND deleted_at IS NULL`
  ).bind(member_id, month).first();
  if (dup) return c.json({ error: 'এই সদস্যের এই মাসের সঞ্চয় ইতিমধ্যে জমা হয়েছে', warning: true }, 409);

  // Generate receipt
  const settings = await c.env.DB.prepare(`SELECT receipt_prefix FROM settings WHERE id=1`).first<{ receipt_prefix: string }>();
  const count = await c.env.DB.prepare(`SELECT COUNT(*) as c FROM savings`).first<{ c: number }>();
  const receipt_no = `${settings?.receipt_prefix || 'R'}${String((count?.c || 0) + 1).padStart(6, '0')}`;

  const result = await c.env.DB.prepare(`
    INSERT INTO savings (receipt_no, member_id, date, month, amount, payment_method, bank_account_id, note, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(receipt_no, member_id, date, month, amount, payment_method || 'cash', bank_account_id || null, note || null, c.get('userId')).run();

  // Update member balance
  await c.env.DB.prepare(`
    UPDATE members SET total_deposit = total_deposit + ?, balance = balance + ?, updated_at=datetime('now') WHERE id=?
  `).bind(amount, amount, member_id).run();

  // If bank, update bank
  if (payment_method === 'bank' && bank_account_id) {
    await c.env.DB.prepare(`UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id=?`).bind(amount, bank_account_id).run();
    await c.env.DB.prepare(`
      INSERT INTO bank_transactions (bank_account_id, type, date, amount, description, related_type, related_id, created_by)
      VALUES (?, 'deposit', ?, ?, ?, 'savings', ?, ?)
    `).bind(bank_account_id, date, amount, `Savings deposit ${receipt_no}`, result.meta.last_row_id, c.get('userId')).run();
  }

  await audit(c.env.DB, c.get('userId'), 'CREATE', 'savings', result.meta.last_row_id as number, `Deposit ${receipt_no} amount ${amount}`);
  return c.json({ success: true, id: result.meta.last_row_id, receipt_no });
});

app.delete('/api/savings/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const sav = await c.env.DB.prepare(`SELECT * FROM savings WHERE id=? AND deleted_at IS NULL`).bind(id).first<any>();
  if (!sav) return c.json({ error: 'Not found' }, 404);

  await c.env.DB.prepare(`UPDATE savings SET deleted_at=datetime('now') WHERE id=?`).bind(id).run();
  await c.env.DB.prepare(`
    UPDATE members SET total_deposit = total_deposit - ?, balance = balance - ? WHERE id=?
  `).bind(sav.amount, sav.amount, sav.member_id).run();

  await audit(c.env.DB, c.get('userId'), 'DELETE', 'savings', Number(id), `Deleted savings ${sav.receipt_no}`);
  return c.json({ success: true });
});

// ========== Withdrawals ==========
app.get('/api/withdrawals', authMiddleware, async (c) => {
  const memberId = c.req.query('member_id');
  let sql = `
    SELECT w.*, m.name as member_name, m.member_id as member_code
    FROM withdrawals w JOIN members m ON m.id = w.member_id
    WHERE w.deleted_at IS NULL
  `;
  const params: any[] = [];
  if (memberId) { sql += ` AND w.member_id = ?`; params.push(memberId); }
  sql += ` ORDER BY w.date DESC LIMIT 500`;
  const result = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ withdrawals: result.results });
});

app.post('/api/withdrawals', authMiddleware, async (c) => {
  const body = await c.req.json();
  const { member_id, date, amount, payment_method, reason, note, bank_account_id } = body;
  if (!member_id || !date || !amount || amount <= 0) return c.json({ error: 'Invalid data' }, 400);

  const member = await c.env.DB.prepare(`SELECT balance FROM members WHERE id=? AND deleted_at IS NULL`).bind(member_id).first<{ balance: number }>();
  if (!member) return c.json({ error: 'Member not found' }, 404);
  if (amount > member.balance) return c.json({ error: 'উত্তোলনের পরিমাণ বর্তমান ব্যালেন্সের চেয়ে বেশি' }, 400);

  const settings = await c.env.DB.prepare(`SELECT withdrawal_prefix FROM settings WHERE id=1`).first<{ withdrawal_prefix: string }>();
  const count = await c.env.DB.prepare(`SELECT COUNT(*) as c FROM withdrawals`).first<{ c: number }>();
  const receipt_no = `${settings?.withdrawal_prefix || 'W'}${String((count?.c || 0) + 1).padStart(6, '0')}`;

  const result = await c.env.DB.prepare(`
    INSERT INTO withdrawals (receipt_no, member_id, date, amount, payment_method, bank_account_id, reason, note, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(receipt_no, member_id, date, amount, payment_method || 'cash', bank_account_id || null, reason || null, note || null, c.get('userId')).run();

  await c.env.DB.prepare(`
    UPDATE members SET total_withdrawal = total_withdrawal + ?, balance = balance - ?, updated_at=datetime('now') WHERE id=?
  `).bind(amount, amount, member_id).run();

  if (payment_method === 'bank' && bank_account_id) {
    await c.env.DB.prepare(`UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id=?`).bind(amount, bank_account_id).run();
    await c.env.DB.prepare(`
      INSERT INTO bank_transactions (bank_account_id, type, date, amount, description, related_type, related_id, created_by)
      VALUES (?, 'withdrawal', ?, ?, ?, 'withdrawal', ?, ?)
    `).bind(bank_account_id, date, amount, `Withdrawal ${receipt_no}`, result.meta.last_row_id, c.get('userId')).run();
  }

  await audit(c.env.DB, c.get('userId'), 'CREATE', 'withdrawal', result.meta.last_row_id as number, `Withdrawal ${receipt_no} amount ${amount}`);
  return c.json({ success: true, id: result.meta.last_row_id, receipt_no });
});

// ========== Bank ==========
app.get('/api/banks', authMiddleware, async (c) => {
  const result = await c.env.DB.prepare(`SELECT * FROM bank_accounts WHERE deleted_at IS NULL ORDER BY bank_name`).all();
  return c.json({ banks: result.results });
});

app.post('/api/banks', authMiddleware, async (c) => {
  const body = await c.req.json();
  const { bank_name, branch, account_name, account_number, account_type, opening_balance, note } = body;
  if (!bank_name || !account_number) return c.json({ error: 'Required fields missing' }, 400);

  const result = await c.env.DB.prepare(`
    INSERT INTO bank_accounts (bank_name, branch, account_name, account_number, account_type, opening_balance, current_balance, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(bank_name, branch, account_name, account_number, account_type, opening_balance || 0, opening_balance || 0, note).run();

  await audit(c.env.DB, c.get('userId'), 'CREATE', 'bank', result.meta.last_row_id as number, `Bank ${bank_name}`);
  return c.json({ success: true, id: result.meta.last_row_id });
});

app.put('/api/banks/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE bank_accounts SET bank_name=?, branch=?, account_name=?, account_number=?, account_type=?, note=?, updated_at=datetime('now')
    WHERE id=?
  `).bind(body.bank_name, body.branch, body.account_name, body.account_number, body.account_type, body.note, id).run();
  return c.json({ success: true });
});

// ========== FDR ==========
app.get('/api/fdrs', authMiddleware, async (c) => {
  const status = c.req.query('status');
  let sql = `SELECT * FROM fdrs WHERE deleted_at IS NULL`;
  const params: any[] = [];
  if (status) { sql += ` AND status = ?`; params.push(status); }
  sql += ` ORDER BY maturity_date ASC`;
  const result = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ fdrs: result.results });
});

app.post('/api/fdrs', authMiddleware, async (c) => {
  const body = await c.req.json();
  const { fdr_number, bank_name, branch, account_number, opening_date, principal, interest_rate, tenure_months, note } = body;
  if (!fdr_number || !bank_name || !opening_date || !principal || !interest_rate || !tenure_months) {
    return c.json({ error: 'Required fields missing' }, 400);
  }

  const settings = await c.env.DB.prepare(`SELECT fdr_prefix, interest_calc_method FROM settings WHERE id=1`).first<any>();
  const count = await c.env.DB.prepare(`SELECT COUNT(*) as c FROM fdrs`).first<{ c: number }>();
  const fdr_id = `${settings?.fdr_prefix || 'FDR'}${String((count?.c || 0) + 1).padStart(4, '0')}`;

  // Calculate maturity
  const years = tenure_months / 12;
  let expected_interest = principal * (interest_rate / 100) * years; // simple
  if (settings?.interest_calc_method === 'compound') {
    expected_interest = principal * (Math.pow(1 + interest_rate / 100, years) - 1);
  }
  const expected_maturity = principal + expected_interest;

  // Maturity date
  const open = new Date(opening_date);
  open.setMonth(open.getMonth() + tenure_months);
  const maturity_date = open.toISOString().slice(0, 10);

  const result = await c.env.DB.prepare(`
    INSERT INTO fdrs (fdr_id, fdr_number, bank_name, branch, account_number, opening_date, principal, interest_rate, tenure_months, maturity_date, expected_interest, expected_maturity, note, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(fdr_id, fdr_number, bank_name, branch, account_number, opening_date, principal, interest_rate, tenure_months, maturity_date, expected_interest, expected_maturity, note, c.get('userId')).run();

  await audit(c.env.DB, c.get('userId'), 'CREATE', 'fdr', result.meta.last_row_id as number, `FDR ${fdr_id}`);
  return c.json({ success: true, id: result.meta.last_row_id, fdr_id });
});

app.put('/api/fdrs/:id/status', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const { status } = await c.req.json();
  await c.env.DB.prepare(`UPDATE fdrs SET status=?, updated_at=datetime('now') WHERE id=?`).bind(status, id).run();
  await audit(c.env.DB, c.get('userId'), 'UPDATE', 'fdr', Number(id), `Status changed to ${status}`);
  return c.json({ success: true });
});

// ========== Income / Expense ==========
app.get('/api/income', authMiddleware, async (c) => {
  const result = await c.env.DB.prepare(`SELECT * FROM income WHERE deleted_at IS NULL ORDER BY date DESC LIMIT 300`).all();
  return c.json({ income: result.results });
});

app.post('/api/income', authMiddleware, async (c) => {
  const body = await c.req.json();
  const { date, category, amount, payment_method, description, bank_account_id } = body;
  if (!date || !category || !amount || amount <= 0) return c.json({ error: 'Invalid' }, 400);

  const result = await c.env.DB.prepare(`
    INSERT INTO income (date, category, amount, payment_method, bank_account_id, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(date, category, amount, payment_method || 'cash', bank_account_id || null, description, c.get('userId')).run();

  if (payment_method === 'bank' && bank_account_id) {
    await c.env.DB.prepare(`UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id=?`).bind(amount, bank_account_id).run();
  }

  await audit(c.env.DB, c.get('userId'), 'CREATE', 'income', result.meta.last_row_id as number, `Income ${amount}`);
  return c.json({ success: true });
});

app.get('/api/expenses', authMiddleware, async (c) => {
  const result = await c.env.DB.prepare(`SELECT * FROM expenses WHERE deleted_at IS NULL ORDER BY date DESC LIMIT 300`).all();
  return c.json({ expenses: result.results });
});

app.post('/api/expenses', authMiddleware, async (c) => {
  const body = await c.req.json();
  const { date, category, amount, payment_method, description, bank_account_id } = body;
  if (!date || !category || !amount || amount <= 0) return c.json({ error: 'Invalid' }, 400);

  const result = await c.env.DB.prepare(`
    INSERT INTO expenses (date, category, amount, payment_method, bank_account_id, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(date, category, amount, payment_method || 'cash', bank_account_id || null, description, c.get('userId')).run();

  if (payment_method === 'bank' && bank_account_id) {
    await c.env.DB.prepare(`UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id=?`).bind(amount, bank_account_id).run();
  }

  await audit(c.env.DB, c.get('userId'), 'CREATE', 'expense', result.meta.last_row_id as number, `Expense ${amount}`);
  return c.json({ success: true });
});

// ========== Due Savings ==========
app.get('/api/dues', authMiddleware, async (c) => {
  const month = c.req.query('month') || new Date().toISOString().slice(0, 7);
  const members = await c.env.DB.prepare(
    `SELECT id, member_id, name, monthly_saving FROM members WHERE status='active' AND deleted_at IS NULL`
  ).all<any>();

  const dues = [];
  for (const m of members.results || []) {
    const paid = await c.env.DB.prepare(
      `SELECT COALESCE(SUM(amount),0) as paid FROM savings WHERE member_id=? AND month=? AND deleted_at IS NULL`
    ).bind(m.id, month).first<{ paid: number }>();
    const due = Math.max(0, (m.monthly_saving || 0) - (paid?.paid || 0));
    if (due > 0 || (paid?.paid || 0) > 0) {
      dues.push({
        member_id: m.member_id,
        name: m.name,
        month,
        expected: m.monthly_saving,
        paid: paid?.paid || 0,
        due
      });
    }
  }
  return c.json({ dues, month });
});

// ========== Settings ==========
app.get('/api/settings', authMiddleware, async (c) => {
  const s = await c.env.DB.prepare(`SELECT * FROM settings WHERE id=1`).first();
  return c.json({ settings: s });
});

app.put('/api/settings', authMiddleware, async (c) => {
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE settings SET society_name=?, address=?, mobile=?, email=?, interest_calc_method=?, updated_at=datetime('now') WHERE id=1
  `).bind(body.society_name, body.address, body.mobile, body.email, body.interest_calc_method || 'simple').run();
  return c.json({ success: true });
});

// ========== Backup ==========
app.get('/api/backup', authMiddleware, async (c) => {
  const tables = ['users', 'settings', 'members', 'savings', 'withdrawals', 'bank_accounts', 'bank_transactions', 'fdrs', 'income', 'expenses', 'categories', 'audit_logs'];
  const data: Record<string, any[]> = {};
  for (const t of tables) {
    const r = await c.env.DB.prepare(`SELECT * FROM ${t}`).all();
    data[t] = r.results || [];
  }
  return c.json({
    exported_at: new Date().toISOString(),
    version: '1.0',
    data
  });
});

// ========== Reports helpers ==========
app.get('/api/reports/summary', authMiddleware, async (c) => {
  const year = c.req.query('year') || new Date().getFullYear().toString();
  // Simple yearly summary
  const deposits = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(amount),0) as t FROM savings WHERE strftime('%Y', date)=? AND deleted_at IS NULL`
  ).bind(year).first<{ t: number }>();
  const withdrawals = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(amount),0) as t FROM withdrawals WHERE strftime('%Y', date)=? AND deleted_at IS NULL`
  ).bind(year).first<{ t: number }>();
  const income = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(amount),0) as t FROM income WHERE strftime('%Y', date)=? AND deleted_at IS NULL`
  ).bind(year).first<{ t: number }>();
  const expense = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE strftime('%Y', date)=? AND deleted_at IS NULL`
  ).bind(year).first<{ t: number }>();
  return c.json({ year, deposits: deposits?.t, withdrawals: withdrawals?.t, income: income?.t, expense: expense?.t });
});

// Serve SPA
app.get('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
