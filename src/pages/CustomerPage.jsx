import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import StepIndicator from '../components/StepIndicator';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { useToast } from '../components/Toast';

const CustomerPage = () => {
  const { shopSlug } = useParams();
  const toast = useToast();

  const [shop, setShop] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedService, setSelectedService] = useState(null);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [contactInfo, setContactInfo] = useState({ fullName: '', phone: '' });
  const [otpCode, setOtpCode] = useState('');
  const [sentOtp, setSentOtp] = useState('');

  // Tarih kısıtları: bugün - 14 gün ileri
  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  useEffect(() => {
    fetchShopData();
  }, [shopSlug]);

  const fetchShopData = async () => {
    try {
      const response = await api.get(`/shops/${shopSlug}`);
      setShop(response.data.shop);
      setLoading(false);
    } catch (err) {
      setError('Dükkan bulunamadı.');
      setLoading(false);
    }
  };

  const fetchAvailability = async (date) => {
    if (!selectedService) return;
    setLoadingSlots(true);
    try {
      const response = await api.get('/availability', {
        params: { shop: shopSlug, service: selectedService.id, date }
      });
      setAvailability(response.data.availability);
    } catch (err) {
      console.error('Müsaitlik hatası:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handlePhoneBlur = async () => {
    const phone = contactInfo.phone;
    if (!phone || phone.length < 10) return;
    try {
      const formatted = phone.startsWith('+90') ? phone : `+90${phone.replace(/^0/, '')}`;
      const res = await api.get('/otp/customer-name', { params: { phone: formatted } });
      if (res.data.fullName && !contactInfo.fullName) {
        setContactInfo(prev => ({ ...prev, fullName: res.data.fullName }));
      }
    } catch {
      // Sessizce geç — kayıtlı değilse sorun değil
    }
  };

  const handleSendOtp = () => {
    const testOtp = String(Math.floor(100000 + Math.random() * 900000));
    setSentOtp(testOtp);
    setStep(6);
  };

  const handleCompleteBooking = async () => {
    if (otpCode !== sentOtp) {
      toast('Kod hatalı. Tekrar deneyin.');
      return;
    }
    setSubmitting(true);
    try {
      const formattedPhone = contactInfo.phone.startsWith('+90')
        ? contactInfo.phone
        : `+90${contactInfo.phone.replace(/^0/, '')}`;
      const payload = {
        phone: formattedPhone,
        otpCode,
        fullName: contactInfo.fullName,
        shopId: shop.id,
        barberId: selectedBarber.id,
        serviceId: selectedService.id,
        startsAt: selectedSlot.startsAt,
        endsAt: selectedSlot.endsAt,
      };
      await api.post('/appointments', payload);
      setStep(7);
    } catch (err) {
      toast(err.response?.data?.error || 'Rezervasyon başarısız.');
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => setStep(s => s - 1);

  if (loading) return (
    <div className="flex justify-center p-20">
      <div className="animate-spin h-8 w-8 border-4 border-zinc-900 border-t-transparent rounded-full"></div>
    </div>
  );
  if (error) return <div className="p-20 text-red-500 text-center font-bold">{error}</div>;

  const currentBarberSlots = availability.find(a => a.barber.id === selectedBarber?.id)?.slots || [];

  return (
    <div className="max-w-md mx-auto bg-white h-screen overflow-hidden shadow-2xl flex flex-col animate-fadeIn">
      <div className="bg-zinc-900 text-white p-8">
        <h1 className="text-2xl font-black uppercase tracking-tighter italic">{shop.name}</h1>
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">{shop.address}</p>
      </div>

      <StepIndicator currentStep={step} />

      <div className="p-6 flex-1">
        {/* ADIM 1 — Hizmet Seçimi */}
        {step === 1 && (
          <div className="animate-fadeIn">
            <h2 className="text-xl font-black mb-6 uppercase tracking-tight">Hizmet Seçin</h2>
            <div className="space-y-3">
              {shop.services.map(s => (
                <Card
                  key={s.id}
                  onClick={() => { setSelectedService(s); setStep(2); }}
                  className="flex justify-between items-center"
                >
                  <span className="font-bold">{s.name}</span>
                  <span className="text-xs font-bold px-2 py-1 bg-zinc-100 text-zinc-600 rounded-lg">{s.duration_min} dk</span>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ADIM 2 — Berber Seçimi */}
        {step === 2 && (
          <div className="animate-fadeIn">
            <button onClick={goBack} className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-1 hover:text-zinc-700 transition-colors">
              ← Geri
            </button>
            <h2 className="text-xl font-black mb-6 uppercase tracking-tight">Berber Seçin</h2>
            <div className="space-y-3">
              {shop.barbers.map(b => (
                <Card
                  key={b.id}
                  onClick={() => { setSelectedBarber(b); setStep(3); }}
                  className="flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-full shadow-inner flex-shrink-0" style={{ backgroundColor: b.color_hex }}></div>
                  <span className="font-bold">{b.full_name}</span>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ADIM 3 — Tarih Seçimi */}
        {step === 3 && (
          <div className="animate-fadeIn">
            <button onClick={goBack} className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-1 hover:text-zinc-700 transition-colors">
              ← Geri
            </button>
            <h2 className="text-xl font-black mb-6 uppercase tracking-tight">Tarih Seçin</h2>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setSelectedDate(today);
                  fetchAvailability(today);
                  setStep(4);
                }}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border transition-colors ${selectedDate === today ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-500'}`}
              >
                Bugün
              </button>
              <button
                onClick={() => {
                  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                  setSelectedDate(tomorrow);
                  fetchAvailability(tomorrow);
                  setStep(4);
                }}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border transition-colors ${selectedDate === new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-500'}`}
              >
                Yarın
              </button>
            </div>
            <Input
              type="date"
              label="Randevu Tarihi"
              min={today}
              max={maxDate}
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                fetchAvailability(e.target.value);
                setStep(4);
              }}
            />
          </div>
        )}

        {/* ADIM 4 — Saat Seçimi */}
        {step === 4 && (
          <div className="animate-fadeIn">
            <button onClick={goBack} className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-1 hover:text-zinc-700 transition-colors">
              ← Geri
            </button>
            <h2 className="text-xl font-black mb-6 uppercase tracking-tight">{selectedDate} — Saat</h2>
            {loadingSlots ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-zinc-900 border-t-transparent rounded-full"></div>
              </div>
            ) : currentBarberSlots.length === 0 ? (
              <div className="text-center py-12 animate-fadeIn">
                <div className="text-4xl mb-4">📅</div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
                  Bu tarihte müsait saat yok.<br />Başka bir tarih seçin.
                </p>
                <button
                  onClick={goBack}
                  className="mt-6 text-xs font-bold text-zinc-900 uppercase tracking-widest underline underline-offset-4"
                >
                  Tarih Değiştir
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {currentBarberSlots.map((slot, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedSlot(slot); setStep(5); }}
                    className="p-3 text-center border-2 border-zinc-50 rounded-2xl bg-zinc-50 font-bold text-xs hover:border-zinc-900 transition-all"
                  >
                    {new Date(slot.startsAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ADIM 5 — İletişim */}
        {step === 5 && (
          <div className="animate-fadeIn">
            <button onClick={goBack} className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-1 hover:text-zinc-700 transition-colors">
              ← Geri
            </button>
            <h2 className="text-xl font-black mb-6 uppercase tracking-tight">İletişim</h2>
            <div className="mb-4">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 ml-1">Telefon</label>
              <div className="flex border-2 border-zinc-100 rounded-2xl overflow-hidden focus-within:border-zinc-900 transition-all duration-200">
                <span className="px-4 flex items-center text-sm font-bold text-zinc-400 bg-zinc-50 border-r-2 border-zinc-100 select-none">+90</span>
                <input
                  type="tel"
                  placeholder="5XX XXX XX XX"
                  maxLength={10}
                  value={contactInfo.phone.replace(/^\+?90/, '')}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    setContactInfo({ ...contactInfo, phone: digits });
                  }}
                  onBlur={handlePhoneBlur}
                  className="flex-1 p-4 bg-white focus:outline-none text-sm font-bold"
                />
              </div>
            </div>
            <Input
              label="Ad Soyad"
              placeholder="Ahmet Yılmaz"
              value={contactInfo.fullName}
              onChange={(e) => setContactInfo({ ...contactInfo, fullName: e.target.value })}
            />
            <Button
              onClick={handleSendOtp}
              loading={submitting}
              className="mt-4"
            >
              Kod Gönder
            </Button>
          </div>
        )}

        {/* ADIM 6 — OTP Doğrulama */}
        {step === 6 && (
          <div className="animate-fadeIn">
            <h2 className="text-xl font-black mb-6 uppercase tracking-tight">Doğrulama</h2>
            <div className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-900 uppercase tracking-widest">
              Test OTP: {sentOtp}
            </div>
            <p className="text-xs font-bold text-zinc-400 mb-4 px-1 uppercase tracking-widest">SMS ile gelen 6 haneli kodu girin</p>
            <Input
              placeholder="000000"
              type="tel"
              maxLength={6}
              tracking
              center
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
            />
            <Button
              onClick={handleCompleteBooking}
              loading={submitting}
              className="mt-4"
            >
              Randevuyu Tamamla
            </Button>
            <button
              onClick={() => { setOtpCode(''); setSentOtp(''); setStep(5); }}
              className="w-full mt-3 text-xs font-bold text-zinc-400 uppercase tracking-widest py-2 hover:text-zinc-700 transition-colors"
            >
              Kodu Tekrar Gönder
            </button>
          </div>
        )}

        {/* ADIM 7 — Başarı */}
        {step === 7 && (
          <div className="text-center py-16 animate-fadeIn">
            <div className="text-7xl mb-8">👊</div>
            <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">İstek Gönderildi!</h2>
            <p className="text-sm font-bold text-zinc-400 leading-relaxed uppercase tracking-widest">
              Berberiniz isteğinizi inceliyor.<br />Onay SMS ile gelecek.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerPage;
