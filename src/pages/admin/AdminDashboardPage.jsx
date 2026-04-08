import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { TURKEY_CITIES } from '../../lib/cities';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/Button';
import { useToast } from '../../components/Toast';

// ─── Yardımcı Bileşenler ────────────────────────────────────────────────────

const StatCard = ({ label, value, sub }) => (
  <div className="bg-white rounded-3xl p-5 border border-zinc-100">
    <div className="text-3xl font-black text-zinc-900">{value ?? '—'}</div>
    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{label}</div>
    {sub !== undefined && (
      <div className="text-xs font-bold text-zinc-300 mt-0.5">{sub}</div>
    )}
  </div>
);

const Badge = ({ active }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${active ? 'bg-green-100 text-green-600' : 'bg-zinc-100 text-zinc-400'}`}>
    {active ? 'Aktif' : 'Pasif'}
  </span>
);

// ─── Dükkan Oluşturma Modal ─────────────────────────────────────────────────

const CreateShopModal = ({ onClose, onSuccess }) => {
  const toast = useToast();
  const [form, setForm] = useState({
    name: '', slug: '', phone: '', address: '', city: '',
    ownerFullName: '', ownerEmail: '', ownerPassword: '', ownerColorHex: '#7F77DD',
  });
  const [saving, setSaving] = useState(false);

  const handleField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const autoSlug = (name) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const handleSubmit = async () => {
    if (!form.name || !form.slug || !form.ownerEmail || !form.ownerPassword || !form.ownerFullName) {
      toast('Zorunlu alanları doldurun.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/shops', form);
      onSuccess();
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Dükkan oluşturulamadı.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl p-6 pb-10 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black uppercase tracking-tight">Yeni Dükkan</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 font-black text-xl">✕</button>
        </div>

        <div className="space-y-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Dükkan Bilgileri</p>
          {[
            { label: 'Dükkan Adı *', key: 'name', placeholder: 'Maestro Berber' },
            { label: 'Slug * (URL)', key: 'slug', placeholder: 'maestro-berber' },
            { label: 'Telefon', key: 'phone', placeholder: '0216 000 00 00' },
            { label: 'Adres', key: 'address', placeholder: 'Kadıköy Mah. Moda Cad. No:1' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">{label}</label>
              <input
                type="text"
                placeholder={placeholder}
                value={form[key]}
                onChange={e => {
                  const v = e.target.value;
                  handleField(key, v);
                  if (key === 'name' && !form.slug) handleField('slug', autoSlug(v));
                }}
                className="w-full p-3 border-2 border-zinc-100 rounded-2xl text-sm font-bold focus:border-zinc-900 focus:outline-none"
              />
            </div>
          ))}

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">Şehir</label>
            <select
              value={form.city}
              onChange={e => handleField('city', e.target.value)}
              className="w-full p-3 border-2 border-zinc-100 rounded-2xl text-sm font-bold bg-white focus:border-zinc-900 focus:outline-none"
            >
              <option value="">Şehir seçin</option>
              {TURKEY_CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-zinc-100 pt-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Dükkan Sahibi Berberi</p>
            {[
              { label: 'Ad Soyad *', key: 'ownerFullName', placeholder: 'Ahmet Usta', type: 'text' },
              { label: 'E-posta *', key: 'ownerEmail', placeholder: 'ahmet@mail.com', type: 'email' },
              { label: 'Şifre *', key: 'ownerPassword', placeholder: '••••••••', type: 'password' },
            ].map(({ label, key, placeholder, type }) => (
              <div key={key} className="mb-3">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={e => handleField(key, e.target.value)}
                  className="w-full p-3 border-2 border-zinc-100 rounded-2xl text-sm font-bold focus:border-zinc-900 focus:outline-none"
                />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">Renk</label>
              <input
                type="color"
                value={form.ownerColorHex}
                onChange={e => handleField('ownerColorHex', e.target.value)}
                className="h-10 w-full rounded-2xl border-2 border-zinc-100 cursor-pointer"
              />
            </div>
          </div>

          <Button onClick={handleSubmit} loading={saving}>Dükkan Oluştur</Button>
        </div>
      </div>
    </div>
  );
};

// ─── Dükkan Kartı ───────────────────────────────────────────────────────────

const emptyBarberForm = { fullName: '', email: '', password: '', colorHex: '#7F77DD' };

const ShopCard = ({ shop, onUpdated }) => {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAddBarber, setShowAddBarber] = useState(false);
  const [barberForm, setBarberForm] = useState(emptyBarberForm);
  const [barberSaving, setBarberSaving] = useState(false);

  const toggleActive = async () => {
    if (!window.confirm(`Dükkan "${shop.name}" ${shop.is_active ? 'pasife alınacak' : 'aktive edilecek'}. Emin misiniz?`)) return;
    setLoading(true);
    try {
      await api.patch(`/admin/shops/${shop.id}`, { is_active: !shop.is_active });
      onUpdated();
    } catch {
      toast('İşlem başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const toggleBarber = async (barberId, currentActive) => {
    try {
      await api.patch(`/admin/barbers/${barberId}`, { is_active: !currentActive });
      onUpdated();
    } catch {
      toast('İşlem başarısız.');
    }
  };

  const toggleOwner = async (barberId, currentOwner) => {
    if (currentOwner) return;
    if (!window.confirm('Bu berberi dükkan sahibi yapacaksınız. Emin misiniz?')) return;
    try {
      await api.patch(`/admin/barbers/${barberId}`, { is_owner: true });
      onUpdated();
    } catch {
      toast('İşlem başarısız.');
    }
  };

  const handleAddBarber = async () => {
    if (!barberForm.email || !barberForm.password || !barberForm.fullName) {
      toast('E-posta, şifre ve ad zorunludur.');
      return;
    }
    setBarberSaving(true);
    try {
      await api.post(`/admin/shops/${shop.id}/barbers`, barberForm);
      setBarberForm(emptyBarberForm);
      setShowAddBarber(false);
      onUpdated();
    } catch (err) {
      toast(err.response?.data?.error || 'Berber eklenemedi.');
    } finally {
      setBarberSaving(false);
    }
  };

  const activeBarbers = shop.barbers?.filter(b => b.is_active) || [];
  const allBarbers = shop.barbers || [];

  return (
    <div className={`bg-white rounded-3xl border overflow-hidden mb-4 ${shop.is_active ? 'border-zinc-100' : 'border-zinc-200 opacity-60'}`}>
      {/* Header */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <div className="font-black text-lg uppercase tracking-tight leading-tight truncate">{shop.name}</div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">/{shop.slug}</div>
          </div>
          <Badge active={shop.is_active} />
        </div>

        {shop.phone && <div className="text-xs text-zinc-500 font-bold mb-1">{shop.phone}</div>}
        {shop.city && <div className="text-xs text-zinc-500 font-bold mb-0.5">{shop.city}</div>}
        {shop.address && <div className="text-xs text-zinc-400 mb-3">{shop.address}</div>}

        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">
          <span>{activeBarbers.length} aktif berber</span>
          <span>·</span>
          <span>{new Date(shop.created_at).toLocaleDateString('tr-TR')}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex-1 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-zinc-100 text-zinc-500 hover:border-zinc-300 transition-all"
          >
            {expanded ? 'Gizle' : 'Berberleri Gör'}
          </button>
          <button
            onClick={toggleActive}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
              shop.is_active
                ? 'border-red-100 text-red-400 hover:border-red-300'
                : 'border-green-100 text-green-500 hover:border-green-300'
            }`}
          >
            {shop.is_active ? 'Pasife Al' : 'Aktive Et'}
          </button>
        </div>
      </div>

      {/* Berberler listesi */}
      {expanded && (
        <div className="border-t border-zinc-50 px-5 pb-5 pt-4 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Berberler</p>
          {allBarbers.length === 0 && (
            <p className="text-xs text-zinc-400 font-bold">Berber yok.</p>
          )}
          {allBarbers.map(b => (
            <div key={b.id} className={`flex items-center gap-3 p-3 rounded-2xl ${b.is_active ? 'bg-zinc-50' : 'bg-zinc-50 opacity-50'}`}>
              <div className="w-7 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: b.color_hex }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{b.full_name}</div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {b.is_owner ? 'Sahip' : 'Çalışan'}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!b.is_owner && (
                  <button
                    onClick={() => toggleOwner(b.id, b.is_owner)}
                    className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest hover:text-zinc-600 transition-colors"
                  >
                    Sahip Yap
                  </button>
                )}
                <button
                  onClick={() => toggleBarber(b.id, b.is_active)}
                  className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
                    b.is_active ? 'text-red-300 hover:text-red-500' : 'text-green-400 hover:text-green-600'
                  }`}
                >
                  {b.is_active ? 'Pasif' : 'Aktif'}
                </button>
              </div>
            </div>
          ))}

          {/* Berber Ekle */}
          {!showAddBarber ? (
            <button
              onClick={() => setShowAddBarber(true)}
              className="w-full p-3 border-2 border-dashed border-zinc-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 transition-all mt-2"
            >
              + Berber Ekle
            </button>
          ) : (
            <div className="p-4 bg-zinc-50 rounded-2xl space-y-3 border-2 border-zinc-200 mt-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Yeni Berber</p>
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
                    value={barberForm[key]}
                    onChange={e => setBarberForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full p-3 border-2 border-zinc-100 rounded-2xl text-sm font-bold bg-white focus:border-zinc-900 focus:outline-none"
                  />
                </div>
              ))}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">Renk</label>
                <input
                  type="color"
                  value={barberForm.colorHex}
                  onChange={e => setBarberForm(f => ({ ...f, colorHex: e.target.value }))}
                  className="h-10 w-full rounded-2xl border-2 border-zinc-100 cursor-pointer"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddBarber} loading={barberSaving}>Ekle</Button>
                <Button variant="secondary" onClick={() => { setShowAddBarber(false); setBarberForm(emptyBarberForm); }}>İptal</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Ana Admin Dashboard ────────────────────────────────────────────────────

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateShop, setShowCreateShop] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'passive'
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, shopsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/shops'),
      ]);
      setStats(statsRes.data.stats);
      setShops(shopsRes.data.shops);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredShops = shops.filter(s => {
    if (filter === 'active') return s.is_active;
    if (filter === 'passive') return !s.is_active;
    return true;
  });

  return (
    <div className="bg-zinc-50 min-h-screen">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 pb-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Admin</h1>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{user?.fullName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 border-2 border-zinc-200 rounded-xl text-xs font-bold text-zinc-400 uppercase tracking-widest hover:border-zinc-900 hover:text-zinc-900 transition-all"
          >
            Çıkış
          </button>
        </div>

        {/* Stats */}
        <div className="px-6 mb-6">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Aktif Dükkan" value={stats?.activeShops} sub={`/ ${stats?.totalShops} toplam`} />
            <StatCard label="Aktif Berber" value={stats?.totalBarbers} />
            <StatCard label="Bugün" value={stats?.todayAppointments} sub="randevu" />
          </div>
        </div>

        {/* Dükkanlar */}
        <div className="px-6 pb-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900">Dükkanlar</h2>
            <button
              onClick={() => setShowCreateShop(true)}
              className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95"
            >
              + Yeni Dükkan
            </button>
          </div>

          {/* Filtre */}
          <div className="flex gap-2 mb-4">
            {[['all', 'Tümü'], ['active', 'Aktif'], ['passive', 'Pasif']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === val ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin h-8 w-8 border-4 border-zinc-900 border-t-transparent rounded-full" />
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🏪</div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Dükkan bulunamadı</p>
            </div>
          ) : (
            filteredShops.map(shop => (
              <ShopCard key={shop.id} shop={shop} onUpdated={fetchAll} />
            ))
          )}
        </div>
      </div>

      {showCreateShop && (
        <CreateShopModal
          onClose={() => setShowCreateShop(false)}
          onSuccess={fetchAll}
        />
      )}
    </div>
  );
};

export default AdminDashboardPage;
