import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { TURKEY_CITIES } from '../../lib/cities';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/Toast';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#0a0a0a',
  surface: '#111111',
  border: '#1f1f1f',
  borderBright: '#2a2a2a',
  text: '#e4e4e7',
  muted: '#52525b',
  accent: '#39ff14',       // neon green
  amber: '#f59e0b',
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#22c55e',
};

const mono = { fontFamily: "'JetBrains Mono', monospace" };
const sans = { fontFamily: "'DM Sans', system-ui, sans-serif" };

// ─── Counter animation hook ───────────────────────────────────────────────────
function useCounter(target, duration = 900) {
  const [value, setValue] = useState(0);
  const frame = useRef(null);
  useEffect(() => {
    if (target == null) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);
  return value;
}

// ─── Loading bar ──────────────────────────────────────────────────────────────
const LoadingBar = ({ visible }) => (
  <div style={{ height: 2, background: C.border, position: 'relative', overflow: 'hidden' }}>
    {visible && (
      <div
        style={{
          position: 'absolute', top: 0, left: '-40%', height: '100%', width: '40%',
          background: C.accent,
          animation: 'loadingSlide 1.2s ease-in-out infinite',
        }}
      />
    )}
  </div>
);

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, accentColor, onClick }) => {
  const count = useCounter(value);
  return (
    <button
      onClick={onClick}
      style={{
        background: C.surface, border: `1px solid ${C.border}`, padding: '20px 18px',
        textAlign: 'left', cursor: onClick ? 'pointer' : 'default', transition: 'border-color 0.15s',
        animation: 'fadeSlideUp 0.4s ease-out forwards', opacity: 0,
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = accentColor || C.borderBright; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
    >
      <div style={{ ...mono, fontSize: 28, fontWeight: 800, color: accentColor || C.text, lineHeight: 1 }}>
        {value == null ? '—' : count}
      </div>
      <div style={{ ...mono, fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 8 }}>
        {label}
      </div>
    </button>
  );
};

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    pending: { label: 'Bekliyor', color: C.amber },
    confirmed: { label: 'Onaylandı', color: C.green },
    rejected: { label: 'Reddedildi', color: C.red },
    expired: { label: 'Süresi Doldu', color: C.muted },
    cancelled_by_customer: { label: 'Müşteri İptal', color: C.muted },
    cancelled_by_shop: { label: 'Dükkan İptal', color: C.muted },
    completed: { label: 'Tamamlandı', color: C.blue },
    no_show: { label: 'Gelmedi', color: C.red },
  };
  const { label, color } = map[status] || { label: status, color: C.muted };
  return (
    <span style={{
      ...mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
      color, border: `1px solid ${color}`, padding: '2px 6px', whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
};

// ─── Confirmation modal ───────────────────────────────────────────────────────
const ConfirmModal = ({ title, message, confirmLabel, confirmSlug, onConfirm, onClose, loading }) => {
  const [typed, setTyped] = useState('');
  const needsTyping = !!confirmSlug;
  const canConfirm = !needsTyping || typed === confirmSlug;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: C.surface, border: `1px solid ${C.red}`, padding: 32, width: '100%', maxWidth: 400, ...sans }}>
        <div style={{ ...mono, fontSize: 11, fontWeight: 800, color: C.red, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
          {title}
        </div>
        <p style={{ color: C.text, fontSize: 14, marginBottom: needsTyping ? 20 : 24, lineHeight: 1.5 }}>{message}</p>
        {needsTyping && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ ...mono, fontSize: 10, color: C.muted, marginBottom: 8 }}>
              Onaylamak için <span style={{ color: C.text }}>"{confirmSlug}"</span> yazın:
            </div>
            <input
              autoFocus
              value={typed}
              onChange={e => setTyped(e.target.value)}
              style={{
                width: '100%', background: C.bg, border: `1px solid ${C.borderBright}`, color: C.text,
                padding: '10px 12px', ...mono, fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = C.accent; }}
              onBlur={e => { e.target.style.borderColor = C.borderBright; }}
            />
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, ...mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>
            İptal
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm || loading}
            style={{ flex: 1, padding: '10px 0', background: canConfirm ? C.red : C.border, border: 'none', color: canConfirm ? '#fff' : C.muted, ...mono, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: canConfirm ? 'pointer' : 'not-allowed', transition: 'background 0.15s' }}
          >
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Slide-over panel ─────────────────────────────────────────────────────────
const SlideOver = ({ title, children, onClose }) => {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 440, height: '100%', background: C.surface, borderLeft: `1px solid ${C.border}`, overflowY: 'auto', animation: 'slideInRight 0.2s ease-out', ...sans }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ ...mono, fontSize: 11, fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: 28 }}>{children}</div>
      </div>
    </div>
  );
};

// ─── Form field ───────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ ...mono, fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{label}</div>
    {children}
  </div>
);

const Input = ({ value, onChange, placeholder, type = 'text', ...props }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    style={{
      width: '100%', background: C.bg, border: `1px solid ${C.borderBright}`, color: C.text,
      padding: '10px 12px', ...sans, fontSize: 13, outline: 'none', boxSizing: 'border-box',
    }}
    onFocus={e => { e.target.style.borderColor = C.accent; }}
    onBlur={e => { e.target.style.borderColor = C.borderBright; }}
    {...props}
  />
);

const Select = ({ value, onChange, children }) => (
  <select
    value={value}
    onChange={onChange}
    style={{
      width: '100%', background: C.bg, border: `1px solid ${C.borderBright}`, color: value ? C.text : C.muted,
      padding: '10px 12px', ...sans, fontSize: 13, outline: 'none', boxSizing: 'border-box', cursor: 'pointer',
    }}
    onFocus={e => { e.target.style.borderColor = C.accent; }}
    onBlur={e => { e.target.style.borderColor = C.borderBright; }}
  >
    {children}
  </select>
);

const ActionBtn = ({ onClick, children, variant = 'default', disabled, loading }) => {
  const colors = {
    default: { bg: C.border, color: C.muted, hover: C.borderBright },
    accent: { bg: C.accent, color: C.bg, hover: '#55ff3a' },
    danger: { bg: 'transparent', color: C.red, hover: C.red },
    ghost: { bg: 'transparent', color: C.muted, hover: C.borderBright },
  };
  const c = colors[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        background: c.bg, border: `1px solid ${variant === 'danger' ? C.red : 'transparent'}`,
        color: c.color, padding: '9px 16px', ...mono, fontSize: 10, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.1em', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, transition: 'all 0.12s', whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = c.hover; if (variant !== 'danger') e.currentTarget.style.color = variant === 'accent' ? C.bg : C.text; } }}
      onMouseLeave={e => { e.currentTarget.style.background = c.bg; e.currentTarget.style.color = c.color; }}
    >
      {loading ? '...' : children}
    </button>
  );
};

// ─── Color picker field ───────────────────────────────────────────────────────
const ColorField = ({ label, value, onChange }) => (
  <Field label={label}>
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <input type="color" value={value} onChange={onChange}
        style={{ width: 44, height: 38, border: `1px solid ${C.borderBright}`, background: 'none', cursor: 'pointer', padding: 2 }} />
      <Input value={value} onChange={onChange} placeholder="#7F77DD" style={{ flex: 1 }} />
    </div>
  </Field>
);

// ─── Table primitives ─────────────────────────────────────────────────────────
const Th = ({ children, sortKey, sortState, onSort, style }) => {
  const active = !!sortKey && sortState?.key === sortKey;
  return (
    <th
      onClick={sortKey ? () => onSort(sortKey) : undefined}
      style={{
        ...mono, fontSize: 9, fontWeight: 700, color: active ? C.accent : C.muted,
        textTransform: 'uppercase', letterSpacing: '0.12em', padding: '10px 14px',
        textAlign: 'left', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap',
        cursor: sortKey ? 'pointer' : 'default', userSelect: 'none',
        background: C.surface, ...style,
      }}
    >
      {children}{active ? (sortState.dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );
};

const Td = ({ children, style }) => (
  <td style={{ padding: '11px 14px', borderBottom: `1px solid ${C.border}`, color: C.text, fontSize: 13, ...sans, verticalAlign: 'middle', ...style }}>
    {children}
  </td>
);

// ─── Shops tab ────────────────────────────────────────────────────────────────
const ShopsTab = ({ shops, onUpdated }) => {
  const toast = useToast();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'created_at', dir: 'desc' });
  const [editShop, setEditShop] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(null);

  const openEdit = shop => {
    setEditShop(shop);
    setEditForm({ name: shop.name, phone: shop.phone || '', address: shop.address || '', city: shop.city || '' });
  };

  const saveEdit = async () => {
    setEditSaving(true);
    try {
      await api.patch(`/admin/shops/${editShop.id}`, editForm);
      toast('Dükkan güncellendi.', 'success');
      setEditShop(null);
      onUpdated();
    } catch (err) {
      toast(err.response?.data?.error || 'Güncelleme başarısız.');
    } finally {
      setEditSaving(false);
    }
  };

  const toggleActive = async shop => {
    setToggleLoading(shop.id);
    try {
      await api.patch(`/admin/shops/${shop.id}`, { is_active: !shop.is_active });
      onUpdated();
    } catch { toast('İşlem başarısız.'); }
    finally { setToggleLoading(null); }
  };

  const doDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.patch(`/admin/shops/${confirmDelete.id}`, { is_active: false });
      toast('Dükkan pasife alındı.', 'success');
      setConfirmDelete(null);
      onUpdated();
    } catch { toast('İşlem başarısız.'); }
    finally { setDeleteLoading(false); }
  };

  const filtered = shops
    .filter(s => {
      if (filter === 'active') return s.is_active;
      if (filter === 'passive') return !s.is_active;
      return true;
    })
    .filter(s => {
      if (!search) return true;
      const q = search.toLowerCase();
      return s.name?.toLowerCase().includes(q) || s.slug?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let av = a[sort.key], bv = b[sort.key];
      if (sort.key === 'staffCount') { av = a.staff?.length || 0; bv = b.staff?.length || 0; }
      if (typeof av === 'string') return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sort.dir === 'asc' ? av - bv : bv - av;
    });

  const toggleSort = key => setSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['all', 'Tümü'], ['active', 'Aktif'], ['passive', 'Pasif']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{
              ...mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
              padding: '7px 14px', border: `1px solid ${filter === v ? C.accent : C.border}`,
              background: filter === v ? C.accent : 'transparent', color: filter === v ? C.bg : C.muted, cursor: 'pointer',
            }}>{l}</button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="İsim, slug, şehir ara..."
          style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: '7px 12px', ...sans, fontSize: 12, outline: 'none', flex: 1, minWidth: 160 }}
          onFocus={e => { e.target.style.borderColor = C.accent; }}
          onBlur={e => { e.target.style.borderColor = C.border; }}
        />
        <ActionBtn variant="accent" onClick={() => setShowCreate(true)}>+ Yeni Dükkan</ActionBtn>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr>
              <Th style={{ width: 40 }}>#</Th>
              <Th sortKey="name" sortState={sort} onSort={toggleSort}>Dükkan Adı</Th>
              <Th sortKey="slug" sortState={sort} onSort={toggleSort}>Slug</Th>
              <Th sortKey="city" sortState={sort} onSort={toggleSort}>Şehir</Th>
              <Th sortKey="staffCount" sortState={sort} onSort={toggleSort}>Personel</Th>
              <Th>Durum</Th>
              <Th sortKey="created_at" sortState={sort} onSort={toggleSort}>Oluşturuldu</Th>
              <Th>İşlemler</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: '32px 14px', textAlign: 'center', color: C.muted, ...mono, fontSize: 11 }}>Sonuç bulunamadı</td></tr>
            )}
            {filtered.map((shop, i) => (
              <React.Fragment key={shop.id}>
                <tr
                  style={{ background: expandedId === shop.id ? '#181818' : 'transparent', cursor: 'default', transition: 'background 0.1s' }}
                  onMouseEnter={e => { if (expandedId !== shop.id) e.currentTarget.style.background = '#131313'; }}
                  onMouseLeave={e => { if (expandedId !== shop.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Td style={{ ...mono, fontSize: 10, color: C.muted }}>{i + 1}</Td>
                  <Td><span style={{ fontWeight: 600 }}>{shop.name}</span></Td>
                  <Td><span style={{ ...mono, fontSize: 11, color: C.muted }}>/{shop.slug}</span></Td>
                  <Td>{shop.city || '—'}</Td>
                  <Td><span style={{ ...mono, fontSize: 12, color: C.accent }}>{shop.staff?.length || 0}</span></Td>
                  <Td>
                    <span style={{
                      ...mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                      color: shop.is_active ? C.green : C.muted, border: `1px solid ${shop.is_active ? C.green : C.border}`, padding: '2px 6px',
                    }}>
                      {shop.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </Td>
                  <Td><span style={{ ...mono, fontSize: 10, color: C.muted }}>{new Date(shop.created_at).toLocaleDateString('tr-TR')}</span></Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <ActionBtn onClick={() => openEdit(shop)}>Düzenle</ActionBtn>
                      <ActionBtn onClick={() => setExpandedId(id => id === shop.id ? null : shop.id)}>
                        {expandedId === shop.id ? 'Gizle' : 'Personel'}
                      </ActionBtn>
                      <ActionBtn
                        onClick={() => toggleActive(shop)}
                        loading={toggleLoading === shop.id}
                        variant={shop.is_active ? 'danger' : 'ghost'}
                      >
                        {shop.is_active ? 'Pasife Al' : 'Aktif Et'}
                      </ActionBtn>
                    </div>
                  </Td>
                </tr>
                {expandedId === shop.id && (
                  <tr>
                    <td colSpan={8} style={{ background: '#161616', padding: '0 0 0 40px', borderBottom: `1px solid ${C.border}` }}>
                      <InlineStaffTable staff={shop.staff || []} shopId={shop.id} onUpdated={onUpdated} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit slide-over */}
      {editShop && (
        <SlideOver title={`Dükkan Düzenle`} onClose={() => setEditShop(null)}>
          <Field label="Dükkan Adı"><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Telefon"><Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></Field>
          <Field label="Adres"><Input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} /></Field>
          <Field label="Şehir">
            <Select value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}>
              <option value="">Şehir seçin</option>
              {TURKEY_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <div style={{ marginTop: 24 }}>
            <ActionBtn variant="accent" onClick={saveEdit} loading={editSaving}>Kaydet</ActionBtn>
          </div>
        </SlideOver>
      )}

      {/* Create modal */}
      {showCreate && <CreateShopModal onClose={() => setShowCreate(false)} onSuccess={onUpdated} />}

      {/* Confirm delete */}
      {confirmDelete && (
        <ConfirmModal
          title="Dükkan Pasife Al"
          message={`"${confirmDelete.name}" dükkanını pasife almak istediğinizden emin misiniz?`}
          confirmLabel="Pasife Al"
          confirmSlug={confirmDelete.slug}
          onConfirm={doDelete}
          onClose={() => setConfirmDelete(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
};

// ─── Inline staff table (inside shop row) ─────────────────────────────────────
const InlineStaffTable = ({ staff, shopId, onUpdated }) => {
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ fullName: '', email: '', password: '', colorHex: '#7F77DD' });
  const [addSaving, setAddSaving] = useState(false);

  const toggleActive = async (b) => {
    if (b.is_owner) return toast('İşletme sahibi pasife alınamaz.');
    try {
      await api.patch(`/admin/barbers/${b.id}`, { is_active: !b.is_active });
      onUpdated();
    } catch { toast('İşlem başarısız.'); }
  };

  const makeOwner = async (b) => {
    if (b.is_owner) return;
    try {
      await api.patch(`/admin/barbers/${b.id}`, { is_owner: true });
      onUpdated();
    } catch { toast('İşlem başarısız.'); }
  };

  const handleAdd = async () => {
    if (!addForm.email || !addForm.password || !addForm.fullName) return toast('Ad, e-posta ve şifre zorunludur.');
    setAddSaving(true);
    try {
      await api.post(`/admin/shops/${shopId}/barbers`, addForm);
      setAddForm({ fullName: '', email: '', password: '', colorHex: '#7F77DD' });
      setShowAdd(false);
      onUpdated();
    } catch (err) { toast(err.response?.data?.error || 'Personel eklenemedi.'); }
    finally { setAddSaving(false); }
  };

  return (
    <div style={{ padding: '16px 20px 20px 0' }}>
      <div style={{ ...mono, fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Personeller</div>
      {staff.length === 0 && <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>Personel yok.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {staff.map(b => (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: C.surface, border: `1px solid ${C.border}`, opacity: b.is_active ? 1 : 0.5 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: b.color_hex, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: C.text }}>{b.full_name}</span>
            <span style={{ ...mono, fontSize: 9, color: b.is_owner ? C.amber : C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{b.is_owner ? 'Sahip' : 'Çalışan'}</span>
            {!b.is_owner && (
              <button onClick={() => makeOwner(b)} style={{ ...mono, fontSize: 9, color: C.muted, textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}>Sahip Yap</button>
            )}
            <button onClick={() => toggleActive(b)} style={{ ...mono, fontSize: 9, color: b.is_active ? C.red : C.green, textTransform: 'uppercase', background: 'none', border: 'none', cursor: b.is_owner ? 'not-allowed' : 'pointer' }}>
              {b.is_active ? 'Pasif' : 'Aktif'}
            </button>
          </div>
        ))}
      </div>
      {!showAdd ? (
        <button onClick={() => setShowAdd(true)} style={{ ...mono, fontSize: 10, color: C.muted, border: `1px dashed ${C.border}`, background: 'none', padding: '8px 16px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          + Personel Ekle
        </button>
      ) : (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input value={addForm.fullName} onChange={e => setAddForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Ad Soyad" />
            <Input value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="E-posta" type="email" />
            <Input value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} placeholder="Şifre" type="password" />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={addForm.colorHex} onChange={e => setAddForm(f => ({ ...f, colorHex: e.target.value }))}
                style={{ width: 38, height: 38, border: `1px solid ${C.border}`, background: 'none', padding: 2, cursor: 'pointer' }} />
              <Input value={addForm.colorHex} onChange={e => setAddForm(f => ({ ...f, colorHex: e.target.value }))} placeholder="#7F77DD" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <ActionBtn variant="accent" onClick={handleAdd} loading={addSaving}>Ekle</ActionBtn>
            <ActionBtn onClick={() => setShowAdd(false)}>İptal</ActionBtn>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Create shop modal ────────────────────────────────────────────────────────
const CreateShopModal = ({ onClose, onSuccess }) => {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', slug: '', phone: '', address: '', city: '', ownerFullName: '', ownerEmail: '', ownerPassword: '', ownerColorHex: '#7F77DD' });
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const autoSlug = n => n.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const submit = async () => {
    if (!form.name || !form.slug || !form.ownerEmail || !form.ownerPassword || !form.ownerFullName) return toast('Zorunlu alanları doldurun.');
    setSaving(true);
    try {
      await api.post('/admin/shops', form);
      toast('Dükkan oluşturuldu.', 'success');
      onSuccess();
      onClose();
    } catch (err) { toast(err.response?.data?.error || 'Dükkan oluşturulamadı.'); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: C.surface, border: `1px solid ${C.border}`, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 32, ...sans }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <span style={{ ...mono, fontSize: 11, fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Yeni Dükkan</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ ...mono, fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
          § 1 — Dükkan Bilgileri
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Dükkan Adı *">
              <Input value={form.name} onChange={e => { set('name', e.target.value); if (!form.slug) set('slug', autoSlug(e.target.value)); }} placeholder="Maestro Kuaför" />
            </Field>
          </div>
          <Field label="Slug * (URL)">
            <Input value={form.slug} onChange={e => set('slug', autoSlug(e.target.value))} placeholder="maestro-kuafor" />
          </Field>
          <Field label="Telefon">
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0216 000 00 00" />
          </Field>
          <Field label="Şehir">
            <Select value={form.city} onChange={e => set('city', e.target.value)}>
              <option value="">Şehir seçin</option>
              {TURKEY_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Adres">
              <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Kadıköy Mah. Moda Cad. No:1" />
            </Field>
          </div>
        </div>

        <div style={{ ...mono, fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${C.border}`, marginTop: 8 }}>
          § 2 — İlk Sahip Personel
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Ad Soyad *">
              <Input value={form.ownerFullName} onChange={e => set('ownerFullName', e.target.value)} placeholder="Ahmet Usta" />
            </Field>
          </div>
          <Field label="E-posta *">
            <Input value={form.ownerEmail} onChange={e => set('ownerEmail', e.target.value)} placeholder="ahmet@mail.com" type="email" />
          </Field>
          <Field label="Şifre *">
            <div style={{ position: 'relative' }}>
              <Input value={form.ownerPassword} onChange={e => set('ownerPassword', e.target.value)} placeholder="••••••••" type={showPass ? 'text' : 'password'} />
              <button onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 11 }}>
                {showPass ? 'Gizle' : 'Göster'}
              </button>
            </div>
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <ColorField label="Renk" value={form.ownerColorHex} onChange={e => set('ownerColorHex', e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: 28, display: 'flex', gap: 10 }}>
          <ActionBtn variant="accent" onClick={submit} loading={saving}>Dükkan Oluştur</ActionBtn>
          <ActionBtn onClick={onClose}>İptal</ActionBtn>
        </div>
      </div>
    </div>
  );
};

// ─── Staff tab ────────────────────────────────────────────────────────────────
const StaffTab = ({ barbers, shops, onUpdated }) => {
  const toast = useToast();
  const [shopFilter, setShopFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState({ key: 'created_at', dir: 'desc' });
  const [editBarber, setEditBarber] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ shopId: '', fullName: '', email: '', password: '', colorHex: '#7F77DD' });
  const [addSaving, setAddSaving] = useState(false);

  const openEdit = b => { setEditBarber(b); setEditForm({ full_name: b.full_name, color_hex: b.color_hex, is_owner: b.is_owner }); };

  const saveEdit = async () => {
    setEditSaving(true);
    try {
      await api.patch(`/admin/barbers/${editBarber.id}`, editForm);
      toast('Personel güncellendi.', 'success');
      setEditBarber(null);
      onUpdated();
    } catch (err) { toast(err.response?.data?.error || 'Güncelleme başarısız.'); }
    finally { setEditSaving(false); }
  };

  const toggleActive = async b => {
    if (b.is_owner) return toast('İşletme sahibi pasife alınamaz.');
    try {
      await api.patch(`/admin/barbers/${b.id}`, { is_active: !b.is_active });
      onUpdated();
    } catch { toast('İşlem başarısız.'); }
  };

  const handleAdd = async () => {
    if (!addForm.shopId || !addForm.email || !addForm.password || !addForm.fullName) return toast('Tüm alanlar zorunludur.');
    setAddSaving(true);
    try {
      await api.post(`/admin/shops/${addForm.shopId}/barbers`, addForm);
      toast('Personel eklendi.', 'success');
      setAddForm({ shopId: '', fullName: '', email: '', password: '', colorHex: '#7F77DD' });
      setShowAdd(false);
      onUpdated();
    } catch (err) { toast(err.response?.data?.error || 'Personel eklenemedi.'); }
    finally { setAddSaving(false); }
  };

  const filtered = barbers
    .filter(b => !shopFilter || b.businesses?.id === shopFilter)
    .filter(b => roleFilter === 'all' || (roleFilter === 'owner' ? b.is_owner : !b.is_owner))
    .filter(b => statusFilter === 'all' || (statusFilter === 'active' ? b.is_active : !b.is_active))
    .sort((a, b) => {
      let av = a[sort.key], bv = b[sort.key];
      if (typeof av === 'string') return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sort.dir === 'asc' ? av - bv : bv - av;
    });

  const toggleSort = key => setSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Select value={shopFilter} onChange={e => setShopFilter(e.target.value)}>
          <option value="">Tüm Dükkanlar</option>
          {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['all', 'Tümü'], ['owner', 'Sahip'], ['employee', 'Çalışan']].map(([v, l]) => (
            <button key={v} onClick={() => setRoleFilter(v)} style={{ ...mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '7px 12px', border: `1px solid ${roleFilter === v ? C.blue : C.border}`, background: roleFilter === v ? C.blue : 'transparent', color: roleFilter === v ? '#fff' : C.muted, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['all', 'Tümü'], ['active', 'Aktif'], ['inactive', 'Pasif']].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)} style={{ ...mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '7px 12px', border: `1px solid ${statusFilter === v ? C.amber : C.border}`, background: statusFilter === v ? C.amber : 'transparent', color: statusFilter === v ? C.bg : C.muted, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        <ActionBtn variant="accent" onClick={() => setShowAdd(true)}>+ Personel Ekle</ActionBtn>
      </div>

      <div style={{ overflowX: 'auto', border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead>
            <tr>
              <Th style={{ width: 40 }}>#</Th>
              <Th sortKey="full_name" sortState={sort} onSort={toggleSort}>Ad Soyad</Th>
              <Th>Renk</Th>
              <Th>Dükkan</Th>
              <Th>Rol</Th>
              <Th>Durum</Th>
              <Th sortKey="created_at" sortState={sort} onSort={toggleSort}>Oluşturuldu</Th>
              <Th>İşlemler</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: '32px 14px', textAlign: 'center', color: C.muted, ...mono, fontSize: 11 }}>Personel bulunamadı</td></tr>
            )}
            {filtered.map((b, i) => (
              <tr key={b.id}
                style={{ transition: 'background 0.1s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#131313'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Td style={{ ...mono, fontSize: 10, color: C.muted }}>{i + 1}</Td>
                <Td><span style={{ fontWeight: 600 }}>{b.full_name}</span></Td>
                <Td><div style={{ width: 18, height: 18, borderRadius: '50%', background: b.color_hex }} /></Td>
                <Td><span style={{ fontSize: 12, color: C.muted }}>{b.businesses?.name || '—'}</span></Td>
                <Td>
                  <span style={{ ...mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: b.is_owner ? C.amber : C.muted }}>
                    {b.is_owner ? 'Sahip' : 'Çalışan'}
                  </span>
                </Td>
                <Td>
                  <span style={{ ...mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: b.is_active ? C.green : C.muted, border: `1px solid ${b.is_active ? C.green : C.border}`, padding: '2px 6px' }}>
                    {b.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                </Td>
                <Td><span style={{ ...mono, fontSize: 10, color: C.muted }}>{new Date(b.created_at).toLocaleDateString('tr-TR')}</span></Td>
                <Td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <ActionBtn onClick={() => openEdit(b)}>Düzenle</ActionBtn>
                    {!b.is_owner && <ActionBtn variant={b.is_active ? 'danger' : 'ghost'} onClick={() => toggleActive(b)}>{b.is_active ? 'Pasife Al' : 'Aktif Et'}</ActionBtn>}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit slide-over */}
      {editBarber && (
        <SlideOver title="Personel Düzenle" onClose={() => setEditBarber(null)}>
          <Field label="Ad Soyad"><Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
          <ColorField label="Renk" value={editForm.color_hex} onChange={e => setEditForm(f => ({ ...f, color_hex: e.target.value }))} />
          {!editBarber.is_owner && (
            <Field label="Rol">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: C.text, fontSize: 13 }}>
                <input type="checkbox" checked={editForm.is_owner} onChange={e => setEditForm(f => ({ ...f, is_owner: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: C.accent }} />
                İşletme sahibi yap
              </label>
            </Field>
          )}
          <div style={{ marginTop: 24 }}><ActionBtn variant="accent" onClick={saveEdit} loading={editSaving}>Kaydet</ActionBtn></div>
        </SlideOver>
      )}

      {/* Add staff modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }} onClick={() => setShowAdd(false)} />
          <div style={{ position: 'relative', background: C.surface, border: `1px solid ${C.border}`, width: '100%', maxWidth: 440, padding: 32, ...sans }}>
            <div style={{ ...mono, fontSize: 11, fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 24 }}>Personel Ekle</div>
            <Field label="Dükkan *">
              <Select value={addForm.shopId} onChange={e => setAddForm(f => ({ ...f, shopId: e.target.value }))}>
                <option value="">Dükkan seçin</option>
                {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Ad Soyad *"><Input value={addForm.fullName} onChange={e => setAddForm(f => ({ ...f, fullName: e.target.value }))} /></Field>
            <Field label="E-posta *"><Input value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} type="email" /></Field>
            <Field label="Şifre *"><Input value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} type="password" /></Field>
            <ColorField label="Renk" value={addForm.colorHex} onChange={e => setAddForm(f => ({ ...f, colorHex: e.target.value }))} />
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <ActionBtn variant="accent" onClick={handleAdd} loading={addSaving}>Ekle</ActionBtn>
              <ActionBtn onClick={() => setShowAdd(false)}>İptal</ActionBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Appointments tab ─────────────────────────────────────────────────────────
const AppointmentsTab = ({ shops }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shopId, setShopId] = useState('');
  const [statusFilter, setStatusFilter] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const LIMIT = 50;
  const timerRef = useRef(null);

  const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'rejected', 'cancelled_by_customer', 'cancelled_by_shop', 'expired', 'no_show'];
  const STATUS_LABELS = { pending: 'Bekliyor', confirmed: 'Onaylandı', completed: 'Tamamlandı', rejected: 'Reddedildi', cancelled_by_customer: 'Müşteri İptal', cancelled_by_shop: 'Dükkan İptal', expired: 'Süresi Doldu', no_show: 'Gelmedi' };

  const fetchAppts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = { date, limit: LIMIT, offset: page * LIMIT };
      if (shopId) params.shopId = shopId;
      if (statusFilter.length > 0) params.status = statusFilter.join(',');
      const res = await api.get('/admin/appointments', { params });
      setAppointments(res.data.appointments);
      setTotal(res.data.total);
    } catch { /* silent */ }
    finally { if (!silent) setLoading(false); }
  }, [date, shopId, statusFilter, page]);

  useEffect(() => {
    fetchAppts();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => fetchAppts(true), 30000);
    return () => clearInterval(timerRef.current);
  }, [fetchAppts]);

  const toggleStatus = s => setStatusFilter(f => f.includes(s) ? f.filter(x => x !== s) : [...f, s]);

  const counts = appointments.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});

  return (
    <div>
      {/* Mini counters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['pending', C.amber], ['confirmed', C.green], ['completed', C.blue], ['cancelled_by_customer', C.muted]].map(([s, color]) => (
          <div key={s} style={{ border: `1px solid ${C.border}`, padding: '10px 16px', background: C.surface }}>
            <div style={{ ...mono, fontSize: 20, fontWeight: 800, color }}>{counts[s] || 0}</div>
            <div style={{ ...mono, fontSize: 8, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{STATUS_LABELS[s]}</div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', ...mono, fontSize: 10, color: C.muted, alignSelf: 'flex-end', paddingBottom: 4 }}>
          Toplam: <span style={{ color: C.text }}>{total}</span> · Otomatik yenileme: 30s
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="date" value={date} onChange={e => { setDate(e.target.value); setPage(0); }}
          style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: '7px 10px', ...mono, fontSize: 12, outline: 'none', colorScheme: 'dark' }}
          onFocus={e => { e.target.style.borderColor = C.accent; }}
          onBlur={e => { e.target.style.borderColor = C.border; }}
        />
        <Select value={shopId} onChange={e => { setShopId(e.target.value); setPage(0); }}>
          <option value="">Tüm Dükkanlar</option>
          {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => { toggleStatus(s); setPage(0); }} style={{
              ...mono, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '5px 10px', border: `1px solid ${statusFilter.includes(s) ? C.accent : C.border}`,
              background: statusFilter.includes(s) ? C.accent : 'transparent', color: statusFilter.includes(s) ? C.bg : C.muted, cursor: 'pointer',
            }}>{STATUS_LABELS[s]}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead>
            <tr>
              <Th>Saat</Th>
              <Th>Dükkan</Th>
              <Th>Personel</Th>
              <Th>Müşteri</Th>
              <Th>Hizmetler</Th>
              <Th>Süre</Th>
              <Th>Kaynak</Th>
              <Th>Durum</Th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ padding: '32px 14px', textAlign: 'center', color: C.muted, ...mono, fontSize: 11 }}>Yükleniyor...</td></tr>
            )}
            {!loading && appointments.length === 0 && (
              <tr><td colSpan={8} style={{ padding: '32px 14px', textAlign: 'center', color: C.muted, ...mono, fontSize: 11 }}>Bu tarih için randevu bulunamadı</td></tr>
            )}
            {appointments.map(a => (
              <tr key={a.id}
                style={{ transition: 'background 0.1s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#131313'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Td>
                  <div style={{ ...mono, fontSize: 12, color: C.text }}>{new Date(a.starts_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                  <div style={{ ...mono, fontSize: 10, color: C.muted }}>{new Date(a.starts_at).toLocaleDateString('tr-TR')}</div>
                </Td>
                <Td><span style={{ fontSize: 12 }}>{a.shop_name || '—'}</span></Td>
                <Td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: a.staff_color_hex, flexShrink: 0 }} />
                    <span style={{ fontSize: 12 }}>{a.staff_name || '—'}</span>
                  </div>
                </Td>
                <Td>
                  <div style={{ fontSize: 12 }}>{a.customer_name}</div>
                  {a.customer_phone && <div style={{ ...mono, fontSize: 10, color: C.muted }}>{a.customer_phone}</div>}
                </Td>
                <Td><span style={{ fontSize: 11, color: C.muted }}>{a.service_names.join(', ') || '—'}</span></Td>
                <Td><span style={{ ...mono, fontSize: 11, color: C.accent }}>{a.total_duration_min > 0 ? `${a.total_duration_min}dk` : '—'}</span></Td>
                <Td><span style={{ ...mono, fontSize: 9, color: C.muted, textTransform: 'uppercase' }}>{a.source}</span></Td>
                <Td><StatusBadge status={a.status} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <ActionBtn onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Önceki</ActionBtn>
          <span style={{ ...mono, fontSize: 10, color: C.muted, alignSelf: 'center' }}>Sayfa {page + 1} / {Math.ceil(total / LIMIT)}</span>
          <ActionBtn onClick={() => setPage(p => p + 1)} disabled={(page + 1) * LIMIT >= total}>Sonraki →</ActionBtn>
        </div>
      )}
    </div>
  );
};

const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const buildDefaultHours = () => Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  open_time: '09:00',
  close_time: '18:00',
  is_closed: i === 0,
}));

// ─── Dükkan ayarları tab ─────────────────────────────────────────────────────
const BusinessSettingsTab = ({ shops, onUpdated }) => {
  const toast = useToast();
  const [selectedShopId, setSelectedShopId] = useState('');
  const [serviceForm, setServiceForm] = useState({ name: '', durationMin: '', bufferMin: '5' });
  const [serviceEditId, setServiceEditId] = useState(null);
  const [serviceEditForm, setServiceEditForm] = useState({});
  const [serviceSaving, setServiceSaving] = useState(false);
  const [hours, setHours] = useState(buildDefaultHours());
  const [hoursSaving, setHoursSaving] = useState(false);
  const [blockForm, setBlockForm] = useState({ startsAt: '', endsAt: '', reason: '', staffId: '' });
  const [blockSaving, setBlockSaving] = useState(false);

  useEffect(() => {
    if (!selectedShopId && shops[0]?.id) {
      setSelectedShopId(shops[0].id);
    }
  }, [shops, selectedShopId]);

  const shop = shops.find(s => s.id === selectedShopId) || shops[0] || null;

  useEffect(() => {
    if (!shop) return;
    const byDay = new Map((shop.business_hours || []).map(h => [h.day_of_week, h]));
    setHours(buildDefaultHours().map(def => byDay.get(def.day_of_week) || def));
    setServiceEditId(null);
    setServiceEditForm({});
    setServiceForm({ name: '', durationMin: '', bufferMin: '5' });
    setBlockForm({ startsAt: '', endsAt: '', reason: '', staffId: '' });
  }, [shop?.id]);

  const services = (shop?.services || []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const activeStaff = (shop?.staff || []).filter(s => s.is_active !== false);

  const startEditService = service => {
    setServiceEditId(service.id);
    setServiceEditForm({
      name: service.name,
      durationMin: String(service.duration_min ?? ''),
      bufferMin: String(service.buffer_min ?? 0),
      is_active: service.is_active !== false,
    });
  };

  const handleAddService = async () => {
    if (!shop) return;
    if (!serviceForm.name || !serviceForm.durationMin) {
      toast('Ad ve süre zorunludur.');
      return;
    }

    setServiceSaving(true);
    try {
      await api.post(`/admin/shops/${shop.id}/services`, {
        name: serviceForm.name,
        durationMin: Number(serviceForm.durationMin),
        bufferMin: Number(serviceForm.bufferMin) || 5,
      });
      setServiceForm({ name: '', durationMin: '', bufferMin: '5' });
      toast('Hizmet eklendi.', 'success');
      onUpdated();
    } catch (err) {
      toast(err.response?.data?.error || 'Hizmet eklenemedi.');
    } finally {
      setServiceSaving(false);
    }
  };

  const handleUpdateService = async () => {
    if (!shop || !serviceEditId) return;
    if (!serviceEditForm.name || !serviceEditForm.durationMin) {
      toast('Ad ve süre zorunludur.');
      return;
    }

    setServiceSaving(true);
    try {
      await api.patch(`/admin/shops/${shop.id}/services/${serviceEditId}`, {
        name: serviceEditForm.name,
        duration_min: Number(serviceEditForm.durationMin),
        buffer_min: Number(serviceEditForm.bufferMin) || 5,
        is_active: serviceEditForm.is_active !== false,
      });
      setServiceEditId(null);
      setServiceEditForm({});
      toast('Hizmet güncellendi.', 'success');
      onUpdated();
    } catch (err) {
      toast(err.response?.data?.error || 'Hizmet güncellenemedi.');
    } finally {
      setServiceSaving(false);
    }
  };

  const handleDeleteService = async service => {
    if (!shop) return;
    if (!window.confirm(`"${service.name}" hizmetini pasife almak istediğinize emin misiniz?`)) return;

    setServiceSaving(true);
    try {
      await api.delete(`/admin/shops/${shop.id}/services/${service.id}`);
      toast('Hizmet pasife alındı.', 'success');
      onUpdated();
    } catch (err) {
      toast(err.response?.data?.error || 'Hizmet silinemedi.');
    } finally {
      setServiceSaving(false);
    }
  };

  const updateHour = (dayIndex, field, value) => {
    setHours(prev => prev.map((hour, index) => (index === dayIndex ? { ...hour, [field]: value } : hour)));
  };

  const handleSaveHours = async () => {
    if (!shop) return;
    setHoursSaving(true);
    try {
      await api.patch(`/admin/shops/${shop.id}/hours`, { hours });
      toast('Çalışma saatleri güncellendi.', 'success');
      onUpdated();
    } catch (err) {
      toast(err.response?.data?.error || 'Çalışma saatleri güncellenemedi.');
    } finally {
      setHoursSaving(false);
    }
  };

  const handleAddBlock = async () => {
    if (!shop) return;
    if (!blockForm.startsAt || !blockForm.endsAt) {
      toast('Başlangıç ve bitiş zorunludur.');
      return;
    }

    setBlockSaving(true);
    try {
      await api.post(`/admin/shops/${shop.id}/blocks`, {
        startsAt: new Date(blockForm.startsAt).toISOString(),
        endsAt: new Date(blockForm.endsAt).toISOString(),
        reason: blockForm.reason || undefined,
        staffId: blockForm.staffId || undefined,
      });
      setBlockForm({ startsAt: '', endsAt: '', reason: '', staffId: '' });
      toast('Blok eklendi.', 'success');
      onUpdated();
    } catch (err) {
      toast(err.response?.data?.error || 'Blok eklenemedi.');
    } finally {
      setBlockSaving(false);
    }
  };

  if (!shop) {
    return <div style={{ color: C.muted, ...mono, fontSize: 11 }}>Dükkan bulunamadı.</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Select value={selectedShopId} onChange={e => setSelectedShopId(e.target.value)}>
          {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <div style={{ ...mono, fontSize: 10, color: C.muted }}>
          {shop.slug ? `/${shop.slug}` : 'Slug yok'}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 18 }}>
        <div style={{ border: `1px solid ${C.border}`, background: C.surface, padding: 16 }}>
          <div style={{ ...mono, fontSize: 9, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>Hizmetler</div>

          <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
            {services.length === 0 && <div style={{ color: C.muted, ...mono, fontSize: 11 }}>Hizmet yok.</div>}
            {services.map(service => (
              <div key={service.id} style={{ border: `1px solid ${C.border}`, padding: 12, background: '#0f0f0f' }}>
                {serviceEditId === service.id ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    <Input value={serviceEditForm.name || ''} onChange={e => setServiceEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Hizmet adı" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                      <Input type="number" value={serviceEditForm.durationMin || ''} onChange={e => setServiceEditForm(f => ({ ...f, durationMin: e.target.value }))} placeholder="Süre (dk)" />
                      <Input type="number" value={serviceEditForm.bufferMin || ''} onChange={e => setServiceEditForm(f => ({ ...f, bufferMin: e.target.value }))} placeholder="Buffer (dk)" />
                      <button
                        type="button"
                        onClick={() => setServiceEditForm(f => ({ ...f, is_active: !f.is_active }))}
                        style={{ border: `1px solid ${C.border}`, background: serviceEditForm.is_active ? C.green : C.border, color: serviceEditForm.is_active ? C.bg : C.muted, ...mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}
                      >
                        {serviceEditForm.is_active ? 'Aktif' : 'Pasif'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <ActionBtn variant="accent" onClick={handleUpdateService} loading={serviceSaving}>Kaydet</ActionBtn>
                      <ActionBtn onClick={() => setServiceEditId(null)}>İptal</ActionBtn>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{service.name}</div>
                      <div style={{ ...mono, fontSize: 10, color: C.muted }}>
                        {service.duration_min} dk + {service.buffer_min || 0} dk buffer · {service.is_active ? 'aktif' : 'pasif'}
                      </div>
                    </div>
                    <ActionBtn onClick={() => startEditService(service)}>Düzenle</ActionBtn>
                    <ActionBtn variant="danger" onClick={() => handleDeleteService(service)} loading={serviceSaving}>Pasife Al</ActionBtn>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
              <Input value={serviceForm.name} onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))} placeholder="Yeni hizmet adı" />
              <Input type="number" value={serviceForm.durationMin} onChange={e => setServiceForm(f => ({ ...f, durationMin: e.target.value }))} placeholder="Süre" />
              <Input type="number" value={serviceForm.bufferMin} onChange={e => setServiceForm(f => ({ ...f, bufferMin: e.target.value }))} placeholder="Buffer" />
              <ActionBtn variant="accent" onClick={handleAddService} loading={serviceSaving}>Ekle</ActionBtn>
            </div>
          </div>
        </div>

        <div style={{ border: `1px solid ${C.border}`, background: C.surface, padding: 16 }}>
          <div style={{ ...mono, fontSize: 9, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>Çalışma Saatleri</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {hours.map((hour, index) => (
              <div key={hour.day_of_week} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 12, border: `1px solid ${C.border}`, background: hour.is_closed ? '#0f0f0f' : '#111111', opacity: hour.is_closed ? 0.75 : 1 }}>
                <div style={{ width: 88, flexShrink: 0, ...mono, fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{DAYS[index]}</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, ...mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  <input
                    type="checkbox"
                    checked={hour.is_closed}
                    onChange={e => updateHour(index, 'is_closed', e.target.checked)}
                  />
                  Kapalı
                </label>
                {!hour.is_closed && (
                  <>
                    <input
                      type="time"
                      value={hour.open_time || '09:00'}
                      onChange={e => updateHour(index, 'open_time', e.target.value)}
                      style={{ flex: 1, background: C.bg, border: `1px solid ${C.borderBright}`, color: C.text, padding: '10px 12px', ...mono, fontSize: 12 }}
                    />
                    <span style={{ color: C.muted }}>—</span>
                    <input
                      type="time"
                      value={hour.close_time || '18:00'}
                      onChange={e => updateHour(index, 'close_time', e.target.value)}
                      style={{ flex: 1, background: C.bg, border: `1px solid ${C.borderBright}`, color: C.text, padding: '10px 12px', ...mono, fontSize: 12 }}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <ActionBtn variant="accent" onClick={handleSaveHours} loading={hoursSaving}>Saatleri Kaydet</ActionBtn>
          </div>
        </div>

        <div style={{ border: `1px solid ${C.border}`, background: C.surface, padding: 16 }}>
          <div style={{ ...mono, fontSize: 9, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>İzin / Blok Ekle</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Select value={blockForm.staffId} onChange={e => setBlockForm(f => ({ ...f, staffId: e.target.value }))}>
                <option value="">Tüm dükkan</option>
                {activeStaff.map(member => <option key={member.id} value={member.id}>{member.full_name}</option>)}
              </Select>
            </div>
            <Input type="datetime-local" value={blockForm.startsAt} onChange={e => setBlockForm(f => ({ ...f, startsAt: e.target.value }))} />
            <Input type="datetime-local" value={blockForm.endsAt} onChange={e => setBlockForm(f => ({ ...f, endsAt: e.target.value }))} />
            <div style={{ gridColumn: '1 / -1' }}>
              <Input value={blockForm.reason} onChange={e => setBlockForm(f => ({ ...f, reason: e.target.value }))} placeholder="İzin, toplantı, tadilat..." />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <ActionBtn variant="accent" onClick={handleAddBlock} loading={blockSaving}>Blok Ekle</ActionBtn>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Settings tab ─────────────────────────────────────────────────────────────
const SettingsTab = () => {
  const toast = useToast();
  const [sysInfo, setSysInfo] = useState(null);
  const [otpStats, setOtpStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cleanupConfirm, setCleanupConfirm] = useState(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/admin/system-info'), api.get('/admin/otp-stats')])
      .then(([si, os]) => { setSysInfo(si.data); setOtpStats(os.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const doCleanup = async () => {
    setCleanupLoading(true);
    try {
      const endpoint = cleanupConfirm === 'otp' ? '/admin/cleanup/otp-sessions' : '/admin/cleanup/push-tokens';
      const res = await api.post(endpoint);
      toast(`${res.data.deleted ?? 0} kayıt temizlendi.`, 'success');
      setCleanupConfirm(null);
    } catch (err) { toast(err.response?.data?.error || 'Temizleme başarısız.'); }
    finally { setCleanupLoading(false); }
  };

  const InfoRow = ({ label, value, accent }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ ...mono, fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
      <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: accent || C.text }}>{value ?? '—'}</span>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
      {/* System info */}
      <div style={{ border: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, ...mono, fontSize: 9, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Sistem Bilgisi
        </div>
        {loading ? <div style={{ padding: 24, color: C.muted, ...mono, fontSize: 11 }}>Yükleniyor...</div> : (
          <>
            <InfoRow label="Node Version" value={sysInfo?.nodeVersion} accent={C.green} />
            <InfoRow label="Uptime" value={sysInfo?.uptime} />
            <InfoRow label="Ortam" value={sysInfo?.environment} accent={sysInfo?.environment === 'production' ? C.green : C.amber} />
            <InfoRow label="SMS Modu" value={sysInfo?.smsMode} accent={sysInfo?.smsMode === 'live' ? C.green : C.amber} />
            <InfoRow label="FCM" value={sysInfo?.fcmEnabled ? 'Aktif' : 'Pasif'} accent={sysInfo?.fcmEnabled ? C.green : C.red} />
          </>
        )}
      </div>

      {/* OTP stats */}
      <div style={{ border: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, ...mono, fontSize: 9, fontWeight: 700, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          OTP Oturumları
        </div>
        {loading ? <div style={{ padding: 24, color: C.muted, ...mono, fontSize: 11 }}>Yükleniyor...</div> : (
          <>
            <InfoRow label="Aktif Oturumlar" value={otpStats?.activeSessions} accent={C.green} />
            <InfoRow label="Süresi Dolmuş" value={otpStats?.expiredSessions} accent={C.red} />
            <InfoRow label="Bugün Toplam" value={otpStats?.totalToday} />
          </>
        )}
      </div>

      {/* Cleanup ops */}
      <div style={{ border: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, ...mono, fontSize: 9, fontWeight: 700, color: C.red, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Temizleme İşlemleri
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ ...mono, fontSize: 11, color: C.text, fontWeight: 700 }}>OTP Oturumları</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>Süresi dolmuş OTP kayıtlarını temizle</div>
            </div>
            <ActionBtn variant="danger" onClick={() => setCleanupConfirm('otp')}>Temizle</ActionBtn>
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ ...mono, fontSize: 11, color: C.text, fontWeight: 700 }}>Push Token'lar</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>90 günden eski token'ları temizle</div>
            </div>
            <ActionBtn variant="danger" onClick={() => setCleanupConfirm('push')}>Temizle</ActionBtn>
          </div>
        </div>
      </div>

      {/* Cleanup confirm */}
      {cleanupConfirm && (
        <ConfirmModal
          title="Temizleme İşlemi"
          message={cleanupConfirm === 'otp' ? 'Süresi dolmuş tüm OTP oturumları silinecek. Onaylıyor musunuz?' : '90 günden eski tüm push token kayıtları silinecek. Onaylıyor musunuz?'}
          confirmLabel="Temizle"
          onConfirm={doCleanup}
          onClose={() => setCleanupConfirm(null)}
          loading={cleanupLoading}
        />
      )}
    </div>
  );
};

// ─── Main admin dashboard ─────────────────────────────────────────────────────
const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [shops, setShops] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('shops');
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, shopsRes, barbersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/shops'),
        api.get('/admin/barbers'),
      ]);
      setStats(statsRes.data.stats);
      setShops(shopsRes.data.shops);
      setBarbers(barbersRes.data.barbers);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const TABS = [
    { id: 'shops', label: 'Dükkanlar' },
    { id: 'staff', label: 'Personel' },
    { id: 'appointments', label: 'Randevular' },
    { id: 'business-settings', label: 'Dükkan Ayarları' },
    { id: 'settings', label: 'Sistem' },
  ];

  const STAT_CARDS = [
    { key: 'totalShops', label: 'Toplam Dükkan', color: C.text },
    { key: 'activeShops', label: 'Aktif Dükkan', color: C.green, tab: 'shops' },
    { key: 'totalStaff', label: 'Toplam Personel', color: C.blue, tab: 'staff' },
    { key: 'totalAppointments', label: 'Toplam Randevu', color: C.amber, tab: 'appointments' },
    { key: 'todayAppointments', label: "Bugün Randevu", color: C.accent, tab: 'appointments' },
  ];

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, ...sans }}>
      <style>{`
        @keyframes loadingSlide { 0% { left: -40%; } 100% { left: 110%; } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        * { box-sizing: border-box; }
        ::placeholder { color: ${C.muted}; }
        select option { background: ${C.surface}; color: ${C.text}; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 56, gap: 20 }}>
          <div style={{ ...mono, fontWeight: 800, fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.text, flexShrink: 0 }}>
            BARBEROS ADMIN <span style={{ color: C.muted, fontSize: 9 }}>[v2.0]</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ ...mono, fontSize: 10, color: C.muted }}>{user?.fullName}</span>
            <div style={{ width: 1, height: 16, background: C.border }} />
            <span style={{
              ...mono, fontSize: 9, fontWeight: 700, color: C.accent, border: `1px solid ${C.accent}`, padding: '3px 8px',
            }}>
              {shops.filter(s => s.is_active).length} AKTİF DÜKKAN
            </span>
            <button
              onClick={handleLogout}
              style={{ ...mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, border: `1px solid ${C.border}`, padding: '5px 12px', background: 'none', cursor: 'pointer', transition: 'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
            >
              Çıkış
            </button>
          </div>
        </div>
        <LoadingBar visible={loading} />
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px' }}>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, marginBottom: 32, background: C.border }}>
          {STAT_CARDS.map((card, idx) => (
            <div key={card.key} style={{ animationDelay: `${idx * 0.06}s` }}>
              <StatCard
                label={card.label}
                value={stats?.[card.key]}
                accentColor={card.color}
                onClick={card.tab ? () => setActiveTab(card.tab) : undefined}
              />
            </div>
          ))}
        </div>

        {/* Tab nav */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
                padding: '12px 20px', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? C.accent : 'transparent'}`,
                color: activeTab === tab.id ? C.accent : C.muted, cursor: 'pointer', transition: 'all 0.12s', marginBottom: -1,
              }}
              onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.color = C.text; }}
              onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.color = C.muted; }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'shops' && <ShopsTab shops={shops} onUpdated={fetchAll} />}
        {activeTab === 'staff' && <StaffTab barbers={barbers} shops={shops} onUpdated={fetchAll} />}
        {activeTab === 'appointments' && <AppointmentsTab shops={shops} />}
        {activeTab === 'business-settings' && <BusinessSettingsTab shops={shops} onUpdated={fetchAll} />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
