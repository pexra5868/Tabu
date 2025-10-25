import React, { useState } from 'react';
import { WORDS_BY_CATEGORY } from '../words';

function StartScreen({ dispatch, user }) {
  const [category, setCategory] = useState('genel'); // Varsayılan kategori
  const categories = Object.keys(WORDS_BY_CATEGORY);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="bg-gray-800 p-10 rounded-2xl shadow-2xl w-full max-w-md text-center flex flex-col items-center gap-6">
        <h1 className="text-6xl font-bold text-yellow-400">Tabu Oyunu</h1>
        <p className="text-xl mt-2">Anlatmaya hazır mısın?</p>

        <div className="w-full">
          <h2 className="text-2xl mb-4">Kategori Seç</h2>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg appearance-none"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat} className="capitalize">
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <button onClick={() => dispatch({ type: 'START_GAME', payload: { category } })} className="mt-4 px-10 py-4 bg-green-600 hover:bg-green-700 rounded-lg text-2xl font-bold text-white transition-transform transform hover:scale-105">Oyunu Başlat</button>

        {/* Çoklu Oyuncu Butonu */}
        <button onClick={() => dispatch({ type: 'GO_TO_LOBBY' })} className="px-10 py-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-2xl font-bold text-white transition-transform transform hover:scale-105">Çoklu Oyuncu</button>

        {/* Kullanıcı giriş yapmamışsa Login/Register butonları */}
        {!user ? (
          <>
            <button onClick={() => dispatch({ type: 'SHOW_LOGIN' })} className="text-blue-400 hover:text-blue-300 mt-2">Giriş Yap</button>
            <button onClick={() => dispatch({ type: 'SHOW_REGISTER' })} className="text-blue-400 hover:text-blue-300 mt-2">Kayıt Ol</button>
          </>
        ) : (
          <>
            <button onClick={() => dispatch({ type: 'SHOW_PROFILE' })} className="text-blue-400 hover:text-blue-300 mt-2">Profilim ({user.username})</button>
            <button onClick={() => dispatch({ type: 'LOGOUT' })} className="text-red-400 hover:text-red-300 mt-2">Çıkış Yap</button>
          </>
        )}
        <button onClick={() => dispatch({ type: 'VIEW_LEADERBOARD' })} className="text-blue-400 hover:text-blue-300">Skor Tablosu</button>
      </div>
    </div>
  );
}

export default StartScreen;