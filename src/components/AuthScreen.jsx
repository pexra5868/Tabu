import React, { useState } from 'react';

function AuthScreen({ dispatch, type }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Canlıda API adresini, yerelde proxy'yi kullan
    const API_URL = import.meta.env.VITE_BACKEND_URL || '';
    const endpoint = `${API_URL}${type === 'login' ? '/api/login' : '/api/register'}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: { id: data._id, username: data.username, token: data.token } });
      } else {
        setError(data.message || 'Bir hata oluştu.');
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError('Sunucuya bağlanılamadı.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="bg-gray-800 p-10 rounded-2xl shadow-2xl w-full max-w-md text-center flex flex-col items-center gap-6 border border-gray-700">
        <h1 className="text-5xl font-bold text-yellow-400 mb-4">
          {type === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
        </h1>
        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Kullanıcı Adı"
            className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifre"
            className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="w-full px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-xl font-bold text-white transition-transform transform hover:scale-105">
            {type === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>
        <button onClick={() => dispatch({ type: 'SHOW_START_SCREEN' })} className="text-gray-400 hover:text-gray-300 mt-2">Ana Menü</button>
      </div>
    </div>
  );
}

export default AuthScreen;