import { Router } from 'express';
import db, { getSettings } from '../db.js';
import { authRequired, requireRole, logAudit } from '../auth.js';

const router = Router();

router.get('/', authRequired, (req, res) => {
  res.json(getSettings());
});

router.put('/', authRequired, requireRole('admin'), (req, res) => {
  const b = req.body || {};
  const s = getSettings();
  db.prepare(`
    UPDATE settings SET company_name=?, rif=?, address=?, phone=?, email=?, iva_rate=?, igtf_rate=?,
      exchange_rate=?, base_currency=?, alert_critical_days=?, alert_warning_days=?, alert_notice_days=?,
      auto_discount_enabled=?, updated_at=datetime('now')
    WHERE id=1
  `).run(
    b.company_name ?? s.company_name, b.rif ?? s.rif, b.address ?? s.address, b.phone ?? s.phone, b.email ?? s.email,
    b.iva_rate ?? s.iva_rate, b.igtf_rate ?? s.igtf_rate, b.exchange_rate ?? s.exchange_rate,
    b.base_currency ?? s.base_currency, b.alert_critical_days ?? s.alert_critical_days,
    b.alert_warning_days ?? s.alert_warning_days, b.alert_notice_days ?? s.alert_notice_days,
    (b.auto_discount_enabled ? 1 : 0)
  );
  logAudit(req.user.id, 'editar_config', 'settings', null);
  res.json(getSettings());
});

// Bitácora de auditoría (solo admin)
router.get('/audit', authRequired, requireRole('admin'), (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, u.username FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.created_at DESC LIMIT 300
  `).all();
  res.json(rows);
});

export default router;
