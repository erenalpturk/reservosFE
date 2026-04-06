import { useState } from 'react';
import Button from '../../components/Button';
import { STATUS_LABELS, STATUS_COLORS, fmtTime } from './utils';

const DetailModal = ({ appt, user, onClose, onAction, onCancel }) => {
  const [loading, setLoading] = useState(null);
  const isPast = new Date(appt.starts_at) < new Date();

  const doAction = async (action) => {
    setLoading(action);
    try { await onAction(appt.id, action); onClose(); }
    catch { alert('İşlem başarısız.'); setLoading(null); }
  };

  const doCancel = async () => {
    if (!window.confirm('Randevuyu iptal etmek istediğinize emin misiniz?')) return;
    setLoading('cancel');
    try { await onCancel(appt.id); onClose(); }
    catch { alert('İptal başarısız.'); setLoading(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl p-5 pb-8 shadow-2xl animate-fadeIn">

        {/* Başlık satırı */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="font-black text-xl uppercase tracking-tight leading-tight">
              {appt.phone_customers?.full_name || 'Walk-In'}
            </div>
            {appt.phone_customers?.phone && (
              <div className="text-xs font-bold text-zinc-400 mt-0.5">{appt.phone_customers.phone}</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_COLORS[appt.status] || 'bg-zinc-100 text-zinc-400'}`}>
              {STATUS_LABELS[appt.status]}
            </span>
            <button onClick={onClose} className="text-zinc-300 hover:text-zinc-700 font-black text-xl leading-none">✕</button>
          </div>
        </div>

        {/* Detaylar */}
        <div className="bg-zinc-50 rounded-2xl px-4 py-3 space-y-2 mb-4 text-sm">
          <div className="flex items-center gap-2.5">
            <span className="opacity-40">📅</span>
            <span className="font-bold text-zinc-700">
              {new Date(appt.starts_at).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="opacity-40">⏱</span>
            <span className="font-bold text-zinc-700">{fmtTime(appt.starts_at)} — {fmtTime(appt.ends_at)}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="opacity-40">✂️</span>
            <span className="font-bold text-zinc-700">{appt.services?.name}</span>
            <span className="text-xs text-zinc-400">({appt.services?.duration_min} dk)</span>
          </div>
          {user?.isOwner && appt.barbers && (
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: appt.barbers.color_hex }} />
              <span className="font-bold text-zinc-700">{appt.barbers.full_name}</span>
            </div>
          )}
        </div>

        {/* Aksiyonlar */}
        {appt.status === 'pending' && (
          <div className="flex gap-2">
            <Button variant="primary" loading={loading === 'confirm'} onClick={() => doAction('confirm')}>Onayla</Button>
            <Button variant="secondary" loading={loading === 'reject'} onClick={() => doAction('reject')}>Reddet</Button>
          </div>
        )}
        {appt.status === 'confirmed' && !isPast && (
          <Button variant="danger" loading={loading === 'cancel'} onClick={doCancel}>İptal Et</Button>
        )}
        {appt.status === 'confirmed' && isPast && (
          <div className="flex gap-2">
            <Button variant="primary" loading={loading === 'complete'} onClick={() => doAction('complete')}>Tamamlandı</Button>
            <Button variant="secondary" loading={loading === 'no-show'} onClick={() => doAction('no-show')}>Gelmedi</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailModal;
