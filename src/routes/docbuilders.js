// Builders for the remaining document types. Each returns what issue() needs to number and freeze the document.
module.exports = ({ pool, one, num, isoDate, inWords, httpErr }) => {
  const rows = async (sql, p = []) => (await pool.query(sql, p)).rows;
  const isSuper = (u) => u.real_role === 'super_admin';
  const seesAll = (u) => ['admin', 'super_admin', 'cfo'].includes(u.role) || isSuper(u);
  const EAT = (c) => "((" + c + " AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Nairobi')::date";
  const person = (l) => ({ id: l.customer_id, name: l.customer_name, phone: l.phone, national_id: l.national_id });

  const loanRow = async (ids) => {
    const loanId = parseInt(ids.loan_id);
    if (!loanId) throw httpErr(400, 'loan_id is required');
    const l = await one(
      `SELECT l.*, c.name AS customer_name, c.phone, c.national_id
       FROM loans l JOIN customers c ON c.id = l.customer_id WHERE l.id = $1`, [loanId]);
    if (!l) throw httpErr(404, 'Loan not found');
    return l;
  };

  const B = {};

  B.clearance_certificate = async (req, ids) => {
    const l = await loanRow(ids);
    if (l.status !== 'paid') throw httpErr(400, 'Only a fully paid loan gets a clearance certificate');
    const p = await one(
      `SELECT COALESCE(SUM(amount),0) AS paid, COUNT(*) AS n, MAX(payment_date) AS last
       FROM payments WHERE loan_id = $1 AND COALESCE(source,'') <> 'recovery'`, [l.id]);
    const total = num(l.total_amount), paid = num(p.paid);
    return {
      loanId: l.id, customerId: l.customer_id, sourceId: l.id, branchId: l.branch_id, amount: total,
      data: {
        customer: person(l),
        loan: { id: l.id, amount: num(l.amount), term_weeks: l.term_weeks, total_amount: total,
                disbursed_at: isoDate(l.disbursed_at), cleared_on: isoDate(l.closed_at || p.last) },
        paid: { total: paid, payments: parseInt(p.n), excess: Math.max(0, paid - total) },
        amount_words: inWords(total)
      }
    };
  };

  B.write_off_memo = async (req, ids) => {
    if (!['admin', 'branch_admin'].includes(req.user.role)) throw httpErr(403, 'Only an admin or branch admin can issue a write-off memo');
    const l = await loanRow(ids);
    if (l.status !== 'written_off') throw httpErr(400, 'This loan has not been written off');
    const p = await one(
      `SELECT COALESCE(SUM(amount) FILTER (WHERE COALESCE(source,'') <> 'recovery'),0) AS collected,
              COALESCE(SUM(amount) FILTER (WHERE source = 'recovery'),0) AS recovered
       FROM payments WHERE loan_id = $1`, [l.id]);
    const s = await one(
      `SELECT MIN(due_date) FILTER (WHERE status = 'written_off') AS first_overdue,
              COUNT(*) FILTER (WHERE status = 'written_off') AS missed
       FROM repayment_schedule WHERE loan_id = $1`, [l.id]);
    const e = await one(
      `SELECT e.description, e.amount, e.created_at, u.name AS recorded_by_name
       FROM expenses e LEFT JOIN users u ON u.id = e.recorded_by
       WHERE e.category = 'Bad Debt' AND e.description LIKE $1 ORDER BY e.id DESC LIMIT 1`, ['%Loan #' + l.id + ' %']);
    const writtenOn = e ? e.created_at : null;
    const balance = num(e ? e.amount : l.balance);
    const days = s.first_overdue ? Math.floor(((writtenOn ? new Date(writtenOn) : new Date()) - new Date(s.first_overdue)) / 86400000) : null;
    return {
      loanId: l.id, customerId: l.customer_id, sourceId: l.id, branchId: l.branch_id, amount: balance,
      data: {
        customer: person(l),
        loan: { id: l.id, amount: num(l.amount), term_weeks: l.term_weeks, total_amount: num(l.total_amount), disbursed_at: isoDate(l.disbursed_at) },
        collected: num(p.collected), recovered: num(p.recovered), balance_written_off: balance,
        first_overdue: isoDate(s.first_overdue), missed: parseInt(s.missed), days_overdue: days,
        written_off_on: writtenOn, reason: e ? e.description : l.notes, recorded_by: e ? e.recorded_by_name : null,
        amount_words: inWords(balance)
      }
    };
  };

  B.drawing_voucher = async (req, ids) => {
    if (!isSuper(req.user)) throw httpErr(403, 'Only the super admin can issue a drawings voucher');
    const id = parseInt(ids.drawing_id);
    if (!id) throw httpErr(400, 'drawing_id is required');
    const d = await one(
      `SELECT d.*, u.name AS recorded_by_name FROM owner_drawings d LEFT JOIN users u ON u.id = d.recorded_by WHERE d.id = $1`, [id]);
    if (!d) throw httpErr(404, 'Drawing not found');
    return {
      loanId: null, customerId: null, sourceId: id, branchId: d.branch_id, amount: num(d.amount),
      data: {
        drawing: { id, amount: num(d.amount), purpose: d.purpose, method: d.payment_method, reference: d.reference, date: isoDate(d.drawing_date) },
        recorded_by: d.recorded_by_name, amount_words: inWords(d.amount)
      }
    };
  };

  B.cash_count_sheet = async (req, ids) => {
    const id = parseInt(ids.count_id);
    if (!id) throw httpErr(400, 'count_id is required');
    const c = await one(
      `SELECT c.*, u.name AS recorded_by_name FROM cash_reconciliations c LEFT JOIN users u ON u.id = c.recorded_by WHERE c.id = $1`, [id]);
    if (!c) throw httpErr(404, 'Cash count not found');
    return {
      loanId: null, customerId: null, sourceId: id, branchId: c.branch_id, amount: num(c.counted_cash),
      data: {
        count: { id, date: isoDate(c.recon_date), expected: num(c.expected_cash), counted: num(c.counted_cash), variance: num(c.variance),
                 change: c.variance_change == null ? null : num(c.variance_change),
                 cash: num(c.cash_on_hand), bank: num(c.bank_balance), mpesa: num(c.mpesa_balance), notes: c.notes },
        recorded_by: c.recorded_by_name
      }
    };
  };

  B.suspense_slip = async (req, ids) => {
    const id = parseInt(ids.suspense_id);
    if (!id) throw httpErr(400, 'suspense_id is required');
    const s = await one(
      `SELECT s.*, c.name AS customer_name, c.phone, c.national_id, c.branch_id AS cust_branch
       FROM suspense_account s LEFT JOIN customers c ON c.id = s.customer_id WHERE s.id = $1`, [id]);
    if (!s) throw httpErr(404, 'Suspense entry not found');
    let branch = s.cust_branch;
    if (s.loan_id) { const lb = await one('SELECT branch_id FROM loans WHERE id = $1', [s.loan_id]); if (lb && lb.branch_id) branch = lb.branch_id; }
    return {
      loanId: s.loan_id || null, customerId: s.customer_id || null, sourceId: id, branchId: branch || 1, amount: num(s.amount),
      data: {
        customer: { id: s.customer_id, name: s.customer_name, phone: s.phone, national_id: s.national_id },
        suspense: { id, amount: num(s.amount), kind: s.type, use_case: s.use_case, notes: s.notes, payment_id: s.payment_id,
                    loan_id: s.loan_id, date: s.created_at || s.recorded_at || null },
        amount_words: inWords(s.amount)
      }
    };
  };

  B.capital_receipt = async (req, ids) => {
    if (!(isSuper(req.user) || req.user.role === 'admin')) throw httpErr(403, 'Only an admin can issue a capital receipt');
    const id = parseInt(ids.capital_id);
    if (!id) throw httpErr(400, 'capital_id is required');
    const m = await one(
      `SELECT m.*, u.name AS recorded_by_name FROM capital_movements m LEFT JOIN users u ON u.id = m.recorded_by WHERE m.id = $1`, [id]);
    if (!m) throw httpErr(404, 'Capital entry not found');
    if (m.kind === 'adjustment') throw httpErr(400, 'Adjustments do not get a receipt');
    return {
      loanId: null, customerId: null, sourceId: id, branchId: m.branch_id, amount: num(m.amount),
      data: {
        capital: { id, kind: m.kind, amount: num(m.amount), date: isoDate(m.movement_date), description: m.description, reference: m.reference },
        recorded_by: m.recorded_by_name, amount_words: inWords(m.amount)
      }
    };
  };

  B.month_end_pack = async (req, ids) => {
    const m = /^(\d{4})-(\d{2})$/.exec(String(ids.month || ''));
    if (!m || +m[2] < 1 || +m[2] > 12) throw httpErr(400, 'month must look like 2026-11');
    const y = +m[1], mo = +m[2];
    const b = seesAll(req.user) ? (parseInt(ids.branch_id) || 1) : (parseInt(req.user.branch_id) || 1);
    const pad = (n) => String(n).padStart(2, '0');
    const start = y + '-' + pad(mo) + '-01';
    const next = mo === 12 ? (y + 1) + '-01-01' : y + '-' + pad(mo + 1) + '-01';
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
    const br = await one('SELECT id, name, code, capital FROM branches WHERE id = $1', [b]);
    if (!br) throw httpErr(404, 'Branch not found');
    const hasLog = parseInt((await one('SELECT COUNT(*) AS n FROM capital_movements WHERE branch_id = $1', [b])).n) > 0;

    // Funds the system expects up to (not including) a date
    const funds = async (upTo) => {
      const v = async (sql) => num((await one(sql, [b, upTo])).v);
      const capital = hasLog
        ? await v('SELECT COALESCE(SUM(amount),0) AS v FROM capital_movements WHERE branch_id = $1 AND movement_date < $2::date')
        : num(br.capital);
      const collections = await v(`SELECT COALESCE(SUM(p.amount),0) AS v FROM payments p JOIN loans l ON l.id = p.loan_id
        WHERE COALESCE(l.branch_id,1) = $1 AND COALESCE(p.source,'') NOT IN ('suspense','recovery') AND ${EAT('p.payment_date')} < $2::date`);
      const income = await v(`SELECT COALESCE(SUM(amount),0) AS v FROM company_income
        WHERE COALESCE(branch_id,1) = $1 AND COALESCE(transaction_code,'') NOT LIKE 'SUSPENSE-%' AND ${EAT('created_at')} < $2::date`);
      const disbursed = await v(`SELECT COALESCE(SUM(amount),0) AS v FROM loans
        WHERE COALESCE(branch_id,1) = $1 AND disbursed_at IS NOT NULL AND status <> 'rejected' AND ${EAT('disbursed_at')} < $2::date`);
      const expenses = await v(`SELECT COALESCE(SUM(amount),0) AS v FROM expenses
        WHERE COALESCE(branch_id,1) = $1 AND status = 'approved' AND COALESCE(payment_method,'') <> 'write_off' AND expense_date < $2::date`);
      const drawings = await v('SELECT COALESCE(SUM(amount),0) AS v FROM owner_drawings WHERE COALESCE(branch_id,1) = $1 AND drawing_date < $2::date');
      return { capital, collections, income, disbursed, expenses, drawings,
               funds: capital + collections + income - disbursed - expenses - drawings };
    };
    const open = await funds(start), close = await funds(next);
    const flow = (k) => Math.round((close[k] - open[k]) * 100) / 100;

    const disb = await one(
      `SELECT COUNT(*) AS n FROM loans WHERE COALESCE(branch_id,1) = $1 AND disbursed_at IS NOT NULL AND status <> 'rejected'
       AND ${EAT('disbursed_at')} >= $2::date AND ${EAT('disbursed_at')} < $3::date`, [b, start, next]);
    const exp = await rows(
      `SELECT expense_date, category, description, amount, voucher_no FROM expenses
       WHERE COALESCE(branch_id,1) = $1 AND status = 'approved' AND COALESCE(payment_method,'') <> 'write_off'
       AND expense_date >= $2::date AND expense_date < $3::date ORDER BY expense_date, id`, [b, start, next]);
    const dr = await rows(
      `SELECT drawing_date, amount, purpose, payment_method FROM owner_drawings
       WHERE COALESCE(branch_id,1) = $1 AND drawing_date >= $2::date AND drawing_date < $3::date ORDER BY drawing_date, id`, [b, start, next]);
    const cc = await rows(
      `SELECT recon_date, expected_cash, counted_cash, variance, variance_change FROM cash_reconciliations
       WHERE COALESCE(branch_id,1) = $1 AND recon_date >= $2::date AND recon_date < $3::date ORDER BY id`, [b, start, next]);
    const arr = await one(
      `SELECT COUNT(*) AS loans, COALESCE(SUM(balance),0) AS balance FROM loans l
       WHERE COALESCE(l.branch_id,1) = $1 AND l.status = 'active'
       AND EXISTS (SELECT 1 FROM repayment_schedule rs WHERE rs.loan_id = l.id AND rs.status = 'overdue')`, [b]);
    const docs = await rows(
      `SELECT doc_type, COUNT(*) FILTER (WHERE status = 'issued')::int AS issued, COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
       FROM documents WHERE branch_id = $1 AND ${EAT('issued_at')} >= $2::date AND ${EAT('issued_at')} < $3::date
       GROUP BY doc_type ORDER BY doc_type`, [b, start, next]);

    const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    return {
      loanId: null, customerId: null, sourceId: b * 1000000 + y * 100 + mo, branchId: b, amount: close.funds,
      data: {
        period: { month: y + '-' + pad(mo), label: new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' }),
                  start, end: y + '-' + pad(mo) + '-' + pad(lastDay), interim: next > today },
        funds: { opening: open.funds, capital: flow('capital'), collections: flow('collections'), income: flow('income'),
                 disbursed: flow('disbursed'), expenses: flow('expenses'), drawings: flow('drawings'), closing: close.funds },
        loans_disbursed: parseInt(disb.n),
        expenses: exp.map((e) => ({ date: isoDate(e.expense_date), category: e.category, description: e.description, amount: num(e.amount), voucher_no: e.voucher_no })),
        drawings: dr.map((d) => ({ date: isoDate(d.drawing_date), amount: num(d.amount), purpose: d.purpose, method: d.payment_method })),
        counts: cc.map((c) => ({ date: isoDate(c.recon_date), expected: num(c.expected_cash), counted: num(c.counted_cash), variance: num(c.variance),
                                 change: c.variance_change == null ? null : num(c.variance_change) })),
        arrears: { loans: parseInt(arr.loans), balance: num(arr.balance), as_at: today },
        documents: docs
      }
    };
  };

  return B;
};