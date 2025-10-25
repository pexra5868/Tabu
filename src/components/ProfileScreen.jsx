import React, { useEffect, useState, useMemo } from 'react';

function ProfileScreen({ user, dispatch }) {
  const [gameHistory, setGameHistory] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !user.id || !user.token) {
      dispatch({ type: 'SHOW_LOGIN' });
      return;
    }

    // Backend'den kullanıcının oyun geçmişini çek
    const fetchProfileData = async () => {
      setLoading(true); // Veri çekme işlemi başladığında yükleniyor durumuna geç
      setError(''); // Önceki hataları temizle
      try {
        const commonHeaders = {
          headers: {
            'Authorization': `Bearer ${user.token}`,
          },
        };
        const API_URL = import.meta.env.VITE_BACKEND_URL || '';

        // İstekleri paralel olarak başlat
        const [profileResponse, historyResponse] = await Promise.all([
          fetch(`${API_URL}/api/users/me`, commonHeaders),
          fetch(`${API_URL}/api/users/${user.id}/history`, commonHeaders)
        ]);

        if (!profileResponse.ok) {
          throw new Error('Profil verileri yüklenemedi.');
        }
        const profileData = await profileResponse.json();
        setProfileData(profileData);

        if (historyResponse.ok) {
          const data = await historyResponse.json();
          setGameHistory(data);
        } else {
          // Bu bir hata değil, sadece geçmiş olmayabilir.
          console.warn('Tek oyunculu oyun geçmişi yüklenemedi.');
        }
      } catch (err) {
        console.error("Profil verisi alınırken hata:", err);
        setError('Sunucuya bağlanılamadı.');
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchProfileData();
    else setLoading(false);
  }, [user, dispatch]);

  const stats = useMemo(() => {
    if (!gameHistory || gameHistory.length === 0) {
      return { highestScore: 0, favoriteCategory: '-' };
    }

    // En yüksek skoru hesapla
    const highestScore = Math.max(...gameHistory.map((game) => game.score));

    // En çok oynanan kategoriyi bul
    const categoryCounts = gameHistory.reduce((acc, game) => {
      acc[game.category] = (acc[game.category] || 0) + 1;
      return acc;
    }, {});

    const favoriteCategory = Object.keys(categoryCounts).reduce((a, b) =>
      categoryCounts[a] > categoryCounts[b] ? a : b
    );

    return { highestScore, favoriteCategory };
  }, [gameHistory]);

  const multiPlayerStats = useMemo(() => {
    if (!profileData) {
      return { wins: 0, losses: 0, winRate: 0 };
    }

    const wins = profileData?.wins || 0;
    const losses = profileData?.losses || 0;
    const totalGames = wins + losses;

    if (totalGames === 0) {
      return { wins, losses, winRate: 0 };
    }

    const winRate = Math.round((wins / totalGames) * 100);
    return { wins, losses, winRate };
  }, [profileData]);

  // user nesnesi henüz yüklenmediyse, yükleniyor ekranı göster
  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-2xl">Yükleniyor...</div>;
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-2xl">Yükleniyor...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500 text-2xl">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="bg-gray-800 p-10 rounded-2xl shadow-2xl w-full max-w-lg text-center flex flex-col items-center gap-6 border border-gray-700">
        <h1 className="text-5xl font-bold text-yellow-400 mb-4">Profilim</h1>
        <p className="text-2xl">Kullanıcı Adı: <span className="font-semibold">{user.username}</span></p>
        
        <div className="w-full flex justify-around bg-gray-900 p-4 rounded-lg mt-4">
          <div className="text-center"><div className="text-gray-400 text-sm">Galibiyet</div><div className="text-2xl font-bold text-green-400">{multiPlayerStats.wins}</div></div>
          <div className="text-center"><div className="text-gray-400 text-sm">Mağlubiyet</div><div className="text-2xl font-bold text-red-400">{multiPlayerStats.losses}</div></div>
          <div className="text-center"><div className="text-gray-400 text-sm">Galibiyet Oranı</div><div className="text-2xl font-bold text-blue-400">{multiPlayerStats.winRate}%</div></div>
          <div className="text-center"><div className="text-gray-400 text-sm">En Yüksek Skor (Tekli)</div><div className="text-2xl font-bold">{stats.highestScore}</div></div>
        </div>

        <h2 className="text-3xl font-bold text-blue-400 mt-6 mb-4">Tek Oyunculu Geçmiş</h2>
        {gameHistory.length > 0 ? (
          <ul className="w-full list-disc list-inside text-left space-y-2">
            {gameHistory.map((game, index) => (
              <li key={index} className="text-lg p-2 bg-gray-700 rounded-lg flex justify-between items-center">
                <span>Kategori: {game.category} - Skor: {game.score}</span>
                <span className="text-sm text-gray-400">{new Date(game.date).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">Henüz oynanmış oyun yok.</p>
        )}

        <button onClick={() => dispatch({ type: 'LOGOUT' })} className="mt-6 px-8 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-xl font-bold text-white transition-transform transform hover:scale-105">Çıkış Yap</button>
        <button onClick={() => dispatch({ type: 'SHOW_START_SCREEN' })} className="text-blue-400 hover:text-blue-300 mt-2">Ana Menü</button>
      </div>
    </div>
  );
}

export default ProfileScreen;
