import React, { useState, useEffect } from 'react';

function Leaderboard({ dispatch, user }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('scores'); // 'scores' veya 'wins'

  useEffect(() => {
    const API_URL = import.meta.env.VITE_BACKEND_URL || '';
    const endpoint = `${API_URL}${mode === 'scores' ? '/api/leaderboard' : '/api/leaderboard/wins'}`;
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error('Skor tablosu yüklenemedi.');
        }
        const data = await response.json();
        setScores(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [mode]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-2xl">Yükleniyor...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500 text-2xl">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="bg-gray-800 p-10 rounded-2xl shadow-2xl w-full max-w-lg text-center flex flex-col items-center gap-6 border border-gray-700">
        <h1 className="text-5xl font-bold text-yellow-400 mb-2">Skor Tablosu</h1>
        <div className="flex gap-4 mb-4">
          <button onClick={() => setMode('scores')} className={`px-4 py-2 rounded-lg ${mode === 'scores' ? 'bg-blue-600 text-white' : 'bg-gray-700'}`}>En Yüksek Skorlar (Tekli)</button>
          <button onClick={() => setMode('wins')} className={`px-4 py-2 rounded-lg ${mode === 'wins' ? 'bg-blue-600 text-white' : 'bg-gray-700'}`}>En Çok Kazananlar (Çoklu)</button>
        </div>
        <ol className="w-full list-decimal list-inside text-left space-y-3">
          {scores.length > 0 ? ( // entry.category ve entry.userId eklenebilir
            scores.map((entry, index) => (
              <li key={index} className="text-xl p-3 bg-gray-700 rounded-lg flex justify-between">
                <span>{index + 1}. {entry.username}</span>
                {mode === 'scores' ? (
                  <span className="font-bold text-yellow-400">{entry.score}</span>
                ) : (
                  <span className="font-bold text-green-400">{entry.wins} Galibiyet</span>
                )}
              </li>
            ))
          ) : (
            <p className="text-center text-gray-400">Henüz kaydedilmiş bir skor yok.</p>
          )}
        </ol>
        <button onClick={() => dispatch({ type: 'SHOW_START_SCREEN' })} className="mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-xl font-bold text-white transition-transform transform hover:scale-105">Ana Menü</button>
        {user && (
          <button onClick={() => dispatch({ type: 'SHOW_PROFILE' })} className="text-blue-400 hover:text-blue-300 mt-2">Profilim</button>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;