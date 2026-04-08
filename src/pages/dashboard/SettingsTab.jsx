import React, { useState } from 'react';
import api from '../../lib/api';
import Button from '../../components/Button';
import { useToast } from '../../components/Toast';

const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

// Açılıp kapanabilen bölüm wrapper'ı
const Section = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-3xl border border-zinc-100 overflow-hidden mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex justify-between items-center p-5 text-left"
      >
        <span className="font-black text-sm uppercase tracking-tight">{title}</span>
        <span className="text-zinc-400 font-bold text-lg leading-none">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-5 pb-5 border-t border-zinc-50">{children}</div>}
    </div>
  );
};

// ─── Dükkan Bilgileri ───────────────────────────────────────────────
const ShopInfoSection = ({ shop, onUpdated, canEdit = true }) => {
  const toast = useToast();
  const [form, setForm] = useState({ name: shop?.name || '', phone: shop?.phone || '', city: shop?.city || '', address: shop?.address || '' });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const bookingLink = shop?.slug
    ? `${window.location.origin}/book/${encodeURIComponent(shop.slug)}`
    : '';

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      await api.patch('/shops', form);
      onUpdated();
    } catch {
      toast('Güncelleme başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyBookingLink = async () => {
    if (!bookingLink) {
      toast('Önce dükkan slug bilgisi gerekli.');
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(bookingLink);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = bookingLink;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast('Link kopyalanamadı.');
    }
  };

  return (
    <div className="pt-4 space-y-3">
      <div>
        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">
          Müşteri Rezervasyon Linki
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={bookingLink}
            placeholder="Link oluşturulamadı"
            className="flex-1 p-3 border-2 border-zinc-100 rounded-2xl text-xs font-bold text-zinc-600 bg-zinc-50 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCopyBookingLink}
            className="px-3 py-3 border-2 border-zinc-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-all"
          >
            {copied ? 'Kopyalandı' : 'Kopyala'}
          </button>
        </div>
      </div>

      {[
        { label: 'Dükkan Adı', key: 'name', placeholder: 'Maestro Berber' },
        { label: 'Telefon', key: 'phone', placeholder: '0216 000 00 00' },
        { label: 'Şehir', key: 'city', placeholder: 'İstanbul' },
        { label: 'Adres', key: 'address', placeholder: 'Kadıköy Mah. Moda Cad. No:1' },
      ].map(({ label, key, placeholder }) => (
        <div key={key}>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">{label}</label>
          <input
            type="text"
            placeholder={placeholder}
            value={form[key]}
            onChange={e => setForm({ ...form, [key]: e.target.value })}
            disabled={!canEdit}
            className={`w-full p-3 border-2 border-zinc-100 rounded-2xl text-sm font-bold focus:border-zinc-900 focus:outline-none ${!canEdit ? 'bg-zinc-50 text-zinc-500 cursor-not-allowed' : ''}`}
          />
        </div>
      ))}
      {!canEdit && (
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">
          Bu alan sadece dükkan sahibi tarafından düzenlenebilir.
        </p>
      )}
      <Button onClick={handleSave} loading={saving} disabled={!canEdit}>Kaydet</Button>
    </div>
  );
};

// ─── Berberler ──────────────────────────────────────────────────────
const BarbersSection = ({ shop, onUpdated }) => {
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', colorHex: '#7F77DD' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  const activeBarbers = shop?.barbers?.filter(b => b.is_active !== false) || [];

  const handleInvite = async () => {
    if (!form.email || !form.password || !form.fullName) {
      toast('E-posta, şifre ve ad zorunludur.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/shops/barbers', form);
      setForm({ email: '', password: '', fullName: '', colorHex: '#7F77DD' });
      setShowForm(false);
      onUpdated();
    } catch (err) {
      toast(err.response?.data?.error || 'Berber eklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`${name} adlı berberi kaldırmak istediğinize emin misiniz?`)) return;
    try {
      await api.delete(`/shops/barbers/${id}`);
      setEditingId(null);
      onUpdated();
    } catch {
      toast('İşlem başarısız.');
    }
  };

  const startEdit = (b) => {
    setEditingId(b.id);
    setEditForm({ fullName: b.full_name, colorHex: b.color_hex });
  };

  const handleUpdate = async () => {
    if (!editForm.fullName) { toast('Ad zorunludur.'); return; }
    setEditSaving(true);
    try {
      await api.patch(`/shops/barbers/${editingId}`, {
        full_name: editForm.fullName,
        color_hex: editForm.colorHex,
      });
      setEditingId(null);
      onUpdated();
    } catch (err) {
      toast(err.response?.data?.error || 'Güncellenemedi.');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="pt-4 space-y-3">
      {activeBarbers.map(b => (
        <div key={b.id}>
          {editingId === b.id ? (
            <div className="p-4 bg-zinc-50 rounded-2xl space-y-3 border-2 border-zinc-200">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Düzenle</p>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">Ad Soyad</label>
                <input
                  type="text"
                  placeholder="Ahmet Usta"
                  value={editForm.fullName}
                  onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full p-3 border-2 border-zinc-100 rounded-2xl text-sm font-bold bg-white focus:border-zinc-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">Renk</label>
                <input
                  type="color"
                  value={editForm.colorHex}
                  onChange={e => setEditForm({ ...editForm, colorHex: e.target.value })}
                  className="h-10 w-full rounded-2xl border-2 border-zinc-100 cursor-pointer"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdate} loading={editSaving}>Kaydet</Button>
                <Button variant="secondary" onClick={() => setEditingId(null)}>İptal</Button>
                {!b.is_owner && (
                  <button
                    onClick={() => { setEditingId(null); handleDeactivate(b.id, b.full_name); }}
                    className="ml-auto text-[10px] font-bold text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors"
                  >
                    Kaldır
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => startEdit(b)}
              className="w-full flex items-center justify-between p-3 bg-zinc-50 rounded-2xl hover:bg-zinc-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: b.color_hex }} />
                <div>
                  <div className="text-sm font-bold">{b.full_name}</div>
                  {b.is_owner && <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sahip</div>}
                </div>
              </div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Düzenle ›</span>
            </button>
          )}
        </div>
      ))}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full p-3 border-2 border-dashed border-zinc-200 rounded-2xl text-xs font-black uppercase tracking-widest text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 transition-all"
        >
          + Berber Ekle
        </button>
      ) : (
        <div className="p-4 bg-zinc-50 rounded-2xl space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Yeni Berber</p>
          {[
            { label: 'Ad Soyad', key: 'fullName', placeholder: 'Ahmet Usta', type: 'text' },
            { label: 'E-posta', key: 'email', placeholder: 'ahmet@mail.com', type: 'email' },
            { label: 'Şifre', key: 'password', placeholder: '••••••••', type: 'password' },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key}>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">{label}</label>
              <input
                type={type}
                placeholder={placeholder}
                value={form[key]}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                className="w-full p-3 border-2 border-zinc-100 rounded-2xl text-sm font-bold bg-white focus:border-zinc-900 focus:outline-none"
              />
            </div>
          ))}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">Renk</label>
            <input
              type="color"
              value={form.colorHex}
              onChange={e => setForm({ ...form, colorHex: e.target.value })}
              className="h-10 w-full rounded-2xl border-2 border-zinc-100 cursor-pointer"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleInvite} loading={saving}>Ekle</Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>İptal</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Hizmetler ──────────────────────────────────────────────────────
const ServiceFields = [
  { label: 'Hizmet Adı', key: 'name', placeholder: 'Saç Kesimi', type: 'text' },
  { label: 'Süre (dk)', key: 'durationMin', placeholder: '30', type: 'number' },
  { label: 'Buffer (dk)', key: 'bufferMin', placeholder: '5', type: 'number' },
];

const ServicesSection = ({ shop, onUpdated }) => {
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', durationMin: '', bufferMin: '5' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  const activeServices = shop?.services?.filter(s => s.is_active !== false) || [];

  const handleAdd = async () => {
    if (!form.name || !form.durationMin) { toast('Ad ve süre zorunludur.'); return; }
    setSaving(true);
    try {
      await api.post('/shops/services', {
        name: form.name,
        durationMin: parseInt(form.durationMin),
        bufferMin: parseInt(form.bufferMin) || 5,
      });
      setForm({ name: '', durationMin: '', bufferMin: '5' });
      setShowForm(false);
      onUpdated();
    } catch (err) {
      toast(err.response?.data?.error || 'Hizmet eklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditForm({ name: s.name, durationMin: String(s.duration_min), bufferMin: String(s.buffer_min) });
  };

  const handleUpdate = async () => {
    if (!editForm.name || !editForm.durationMin) { toast('Ad ve süre zorunludur.'); return; }
    setEditSaving(true);
    try {
      await api.patch(`/shops/services/${editingId}`, {
        name: editForm.name,
        durationMin: parseInt(editForm.durationMin),
        bufferMin: parseInt(editForm.bufferMin) || 5,
      });
      setEditingId(null);
      onUpdated();
    } catch (err) {
      toast(err.response?.data?.error || 'Güncellenemedi.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`"${name}" hizmetini kaldırmak istediğinize emin misiniz?`)) return;
    try {
      await api.delete(`/shops/services/${id}`);
      onUpdated();
    } catch {
      toast('İşlem başarısız.');
    }
  };

  return (
    <div className="pt-4 space-y-3">
      {activeServices.map(s => (
        <div key={s.id}>
          {editingId === s.id ? (
            <div className="p-4 bg-zinc-50 rounded-2xl space-y-3 border-2 border-zinc-200">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Düzenle</p>
              {ServiceFields.map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={editForm[key]}
                    onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                    min={type === 'number' ? '1' : undefined}
                    className="w-full p-3 border-2 border-zinc-100 rounded-2xl text-sm font-bold bg-white focus:border-zinc-900 focus:outline-none"
                  />
                </div>
              ))}
              <div className="flex gap-2">
                <Button onClick={handleUpdate} loading={editSaving}>Kaydet</Button>
                <Button variant="secondary" onClick={() => setEditingId(null)}>İptal</Button>
                <button
                  onClick={() => { setEditingId(null); handleDeactivate(s.id, s.name); }}
                  className="ml-auto text-[10px] font-bold text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors"
                >
                  Kaldır
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => startEdit(s)}
              className="w-full flex items-center justify-between p-3 bg-zinc-50 rounded-2xl hover:bg-zinc-100 transition-colors text-left"
            >
              <div>
                <div className="text-sm font-bold">{s.name}</div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {s.duration_min} dk + {s.buffer_min} dk buffer
                </div>
              </div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Düzenle ›</span>
            </button>
          )}
        </div>
      ))}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full p-3 border-2 border-dashed border-zinc-200 rounded-2xl text-xs font-black uppercase tracking-widest text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 transition-all"
        >
          + Hizmet Ekle
        </button>
      ) : (
        <div className="p-4 bg-zinc-50 rounded-2xl space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Yeni Hizmet</p>
          {ServiceFields.map(({ label, key, placeholder, type }) => (
            <div key={key}>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">{label}</label>
              <input
                type={type}
                placeholder={placeholder}
                value={form[key]}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                min={type === 'number' ? '1' : undefined}
                className="w-full p-3 border-2 border-zinc-100 rounded-2xl text-sm font-bold bg-white focus:border-zinc-900 focus:outline-none"
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button onClick={handleAdd} loading={saving}>Ekle</Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>İptal</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Çalışma Saatleri ───────────────────────────────────────────────
const HoursSection = ({ shop, onUpdated }) => {
  const toast = useToast();
  const defaultHours = Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    open_time: '09:00',
    close_time: '18:00',
    is_closed: i === 0, // Pazar kapalı default
  }));

  const initialHours = () => {
    if (!shop?.shop_hours?.length) return defaultHours;
    return defaultHours.map(def => {
      const existing = shop.shop_hours.find(h => h.day_of_week === def.day_of_week);
      return existing || def;
    });
  };

  const [hours, setHours] = useState(initialHours);
  const [saving, setSaving] = useState(false);

  const updateHour = (dayIndex, field, value) => {
    setHours(prev => prev.map((h, i) => i === dayIndex ? { ...h, [field]: value } : h));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/shops/hours', { hours });
      onUpdated();
    } catch {
      toast('Güncelleme başarısız.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-4 space-y-2">
      {hours.map((h, i) => (
        <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl ${h.is_closed ? 'bg-zinc-50 opacity-60' : 'bg-zinc-50'}`}>
          <div className="w-20 text-xs font-black uppercase tracking-widest text-zinc-600 flex-shrink-0">{DAYS[i]}</div>
          <input
            type="checkbox"
            checked={h.is_closed}
            onChange={e => updateHour(i, 'is_closed', e.target.checked)}
            className="rounded"
            title="Kapalı"
          />
          {h.is_closed ? (
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Kapalı</span>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="time"
                value={h.open_time}
                onChange={e => updateHour(i, 'open_time', e.target.value)}
                className="flex-1 p-2 border-2 border-zinc-100 rounded-xl text-xs font-bold focus:border-zinc-900 focus:outline-none bg-white"
              />
              <span className="text-xs text-zinc-400 font-bold">—</span>
              <input
                type="time"
                value={h.close_time}
                onChange={e => updateHour(i, 'close_time', e.target.value)}
                className="flex-1 p-2 border-2 border-zinc-100 rounded-xl text-xs font-bold focus:border-zinc-900 focus:outline-none bg-white"
              />
            </div>
          )}
        </div>
      ))}
      <div className="pt-2">
        <Button onClick={handleSave} loading={saving}>Kaydet</Button>
      </div>
    </div>
  );
};

// ─── İzin / Blok ────────────────────────────────────────────────────
const BlockSection = ({ shop, user, onUpdated }) => {
  const toast = useToast();
  const [form, setForm] = useState({ startsAt: '', endsAt: '', reason: '', barberId: '' });
  const [saving, setSaving] = useState(false);

  const activeBarbers = shop?.barbers?.filter(b => b.is_active !== false) || [];

  const handleAdd = async () => {
    if (!form.startsAt || !form.endsAt) {
      toast('Başlangıç ve bitiş zorunludur.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/shops/blocks', {
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        reason: form.reason || undefined,
        barberId: user.isOwner ? (form.barberId || undefined) : undefined,
      });
      setForm({ startsAt: '', endsAt: '', reason: '', barberId: '' });
    } catch (err) {
      toast(err.response?.data?.error || 'Blok eklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-4 space-y-3">
      {user.isOwner && (
        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">
            Berber <span className="normal-case font-normal text-zinc-300">(boş = tüm dükkan)</span>
          </label>
          <select
            value={form.barberId}
            onChange={e => setForm({ ...form, barberId: e.target.value })}
            className="w-full p-3 border-2 border-zinc-100 rounded-2xl text-sm font-bold bg-white focus:border-zinc-900 focus:outline-none"
          >
            <option value="">Tüm dükkan</option>
            {activeBarbers.map(b => (
              <option key={b.id} value={b.id}>{b.full_name}</option>
            ))}
          </select>
        </div>
      )}
      {[
        { label: 'Başlangıç', key: 'startsAt' },
        { label: 'Bitiş', key: 'endsAt' },
      ].map(({ label, key }) => (
        <div key={key}>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">{label}</label>
          <input
            type="datetime-local"
            value={form[key]}
            onChange={e => setForm({ ...form, [key]: e.target.value })}
            className="w-full p-3 border-2 border-zinc-100 rounded-2xl text-sm font-bold focus:border-zinc-900 focus:outline-none"
          />
        </div>
      ))}
      <div>
        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">
          Açıklama <span className="normal-case font-normal text-zinc-300">(opsiyonel)</span>
        </label>
        <input
          type="text"
          placeholder="İzin, toplantı, öğle arası..."
          value={form.reason}
          onChange={e => setForm({ ...form, reason: e.target.value })}
          className="w-full p-3 border-2 border-zinc-100 rounded-2xl text-sm font-bold focus:border-zinc-900 focus:outline-none"
        />
      </div>
      <Button onClick={handleAdd} loading={saving}>Blok Ekle</Button>
    </div>
  );
};

// ─── Ana Ayarlar Tab ────────────────────────────────────────────────
const SettingsTab = ({ shop, user, onShopUpdated }) => {
  const isOwner = user?.isOwner === true;

  if (!shop) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-zinc-900 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-10">
      <Section title="Dükkan Bilgileri" defaultOpen>
        <ShopInfoSection shop={shop} onUpdated={onShopUpdated} canEdit={isOwner} />
      </Section>

      {isOwner && (
        <>
          <Section title="Berberler">
            <BarbersSection shop={shop} onUpdated={onShopUpdated} />
          </Section>
          <Section title="Hizmetler">
            <ServicesSection shop={shop} onUpdated={onShopUpdated} />
          </Section>
          <Section title="Çalışma Saatleri">
            <HoursSection shop={shop} onUpdated={onShopUpdated} />
          </Section>
        </>
      )}
      <Section title="İzin / Blok Ekle" defaultOpen={!user?.isOwner}>
        <BlockSection shop={shop} user={user} onUpdated={onShopUpdated} />
      </Section>
    </div>
  );
};

export default SettingsTab;
