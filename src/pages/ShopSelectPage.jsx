import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Card from '../components/Card';

const ShopSelectPage = () => {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);

  useEffect(() => {
    api.get('/shops')
      .then(res => setShops(res.data.shops || []))
      .catch(() => setError('Dükkanlar yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  // Şehirleri çıkar: önce city alanı, yoksa address'ten ilk virgül öncesi
  const getCity = (shop) =>
    shop.city || (shop.address ? shop.address.split(',').pop().trim() : 'Diğer');

  const cities = [...new Set(shops.map(getCity))].sort();
  const shopsInCity = selectedCity
    ? shops.filter(s => getCity(s) === selectedCity)
    : [];

  if (loading) return (
    <div className="flex justify-center p-20 bg-zinc-50 dark:bg-zinc-950 min-h-screen transition-colors">
      <div className="animate-spin h-8 w-8 border-4 border-zinc-900 dark:border-zinc-300 border-t-transparent rounded-full"></div>
    </div>
  );

  if (error) return <div className="p-20 text-red-500 text-center font-bold bg-zinc-50 dark:bg-zinc-950 min-h-screen">{error}</div>;

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 min-h-screen shadow-2xl flex flex-col animate-fadeIn text-zinc-900 dark:text-zinc-100 transition-colors">
      <div className="bg-zinc-900 text-white p-8">
        <button
          onClick={() => selectedCity ? setSelectedCity(null) : navigate('/')}
          className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-1 hover:text-white transition-colors"
        >
          ← Geri
        </button>
        <h1 className="text-2xl font-black uppercase tracking-tighter italic">
          {selectedCity ? selectedCity : 'Şehir Seçin'}
        </h1>
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">
          {selectedCity ? 'Dükkan seçin' : 'Bulunduğunuz şehri seçin'}
        </p>
      </div>

      <div className="p-6 flex-1 bg-zinc-50 dark:bg-zinc-900 transition-colors">
        {!selectedCity ? (
          <div className="space-y-3 animate-fadeIn">
            {cities.map(city => (
              <Card
                key={city}
                onClick={() => setSelectedCity(city)}
                className="flex justify-between items-center"
              >
                <span className="font-bold">{city}</span>
                <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">
                  {shops.filter(s => getCity(s) === city).length} dükkan →
                </span>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3 animate-fadeIn">
            {shopsInCity.map(shop => (
              <Card
                key={shop.id}
                onClick={() => navigate(`/book/${shop.slug}`)}
                className="flex flex-col gap-1"
              >
                <span className="font-black">{shop.name}</span>
                {shop.address && (
                  <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">{shop.address}</span>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopSelectPage;
