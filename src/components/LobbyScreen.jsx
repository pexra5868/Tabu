import React, { useState, useEffect } from 'react';
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/solid';

function LobbyScreen({ dispatch, socket }) {
  const [roomName, setRoomName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [roomList, setRoomList] = useState([]);
  const [activeTab, setActiveTab] = useState('create'); // 'create' veya 'join'

  useEffect(() => {
    if (!socket) return;

    const handleRoomListUpdate = (rooms) => {
      setRoomList(rooms);
    };

    socket.on('roomListUpdate', handleRoomListUpdate);

    return () => socket.off('roomListUpdate', handleRoomListUpdate);
  }, [socket]);
  
  const handleCreate = () => {
    if (roomName.trim()) {
      dispatch({ type: 'CREATE_ROOM', payload: { roomName, password: createPassword } });
    }
  };

  const handleJoin = () => {
    if (joinCode.trim()) {
      dispatch({ type: 'JOIN_ROOM', payload: { roomId: joinCode } });
    }
  };

  const handleJoinFromList = (room) => {
    if (room.isPrivate) {
      const password = prompt(`"${room.name}" odası şifreli. Lütfen şifreyi girin:`);
      if (password !== null) { // Kullanıcı iptal etmediyse
        dispatch({ type: 'JOIN_ROOM', payload: { roomId: room.id, password } });
      }
    } else {
      dispatch({ type: 'JOIN_ROOM', payload: { roomId: room.id } });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-8 gap-8">
      <h1 className="text-5xl font-bold text-yellow-400 mb-8">Oyun Lobisi</h1>
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Oda Listesi */}
        <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl flex flex-col gap-4">
          <h2 className="text-3xl font-bold text-center text-yellow-400">Açık Odalar</h2>
          <div className="h-64 overflow-y-auto space-y-2 pr-2">
            {roomList.length > 0 ? roomList.map(room => (
              <div key={room.id} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg transition-colors hover:bg-gray-600">
                <div className="flex items-center gap-2">
                  {room.isPrivate ? <LockClosedIcon className="h-5 w-5 text-yellow-400" /> : <LockOpenIcon className="h-5 w-5 text-gray-400" />}
                  <span className="font-semibold">{room.name} ({room.playerCount})</span>
                </div>
                <button onClick={() => handleJoinFromList(room)} className="px-4 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-bold text-white">Katıl</button>
              </div>
            )) : <p className="text-center text-gray-400 mt-8">Aktif oda bulunmuyor.</p>}
          </div>
        </div>

        {/* Oda Oluşturma ve Katılma */}
        <div className="bg-gray-800 p-2 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
          {/* Geçişli Butonlar */}
          <div className="w-full flex bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('create')}
              className={`w-1/2 py-2.5 rounded-md text-lg font-bold transition-colors ${activeTab === 'create' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-600'}`}
            >
              Oda Oluştur
            </button>
            <button
              onClick={() => setActiveTab('join')}
              className={`w-1/2 py-2.5 rounded-md text-lg font-bold transition-colors ${activeTab === 'join' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-600'}`}
            >
              Odaya Katıl
            </button>
          </div>

          {/* Form Alanı */}
          <div className="p-4 w-full">
            {activeTab === 'create' ? (
              <div className="flex flex-col gap-4">
                <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Oda Adı" className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <input type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder="Şifre (isteğe bağlı)" className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <button onClick={handleCreate} className="w-full px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-xl font-bold text-white">Oluştur</button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Oda Kodu" className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <button onClick={handleJoin} className="w-full px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-xl font-bold text-white">Kodu Kullanarak Katıl</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LobbyScreen;