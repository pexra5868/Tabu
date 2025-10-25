import React, { useState } from 'react';

function GameOver({ score, dispatch, category, user, room }) {
  const [name, setName] = useState('');
  const [scoreSaved, setScoreSaved] = useState(false);
  const isMultiplayer = !!room;

  const handleSave = (e) => {
    e.preventDefault();
    // Çok oyunculu modda skor kaydetme şimdilik devre dışı.
    // Bu özellik gelecekte eklenebilir (örneğin, takım skorlarını veya bireysel katkıları kaydetmek).
    if (isMultiplayer) {
      // Şimdilik çok oyunculu modda bu butonu göstermeyeceğiz.
      // Eğer gösterilirse, bir lobiye dönme işlemi tetiklenebilir.
      return;
    }

    // Eğer kullanıcı girişliyse, kullanıcı adını otomatik al
    const playerName = user ? user.username : name.trim();
    dispatch({
      type: 'SAVE_SCORE',
      payload: { name: playerName, score, category, userId: user ? user.id : null },
    });
    setScoreSaved(true);
  };

  const handleReturnToRoom = () => {
    dispatch({ type: 'RETURN_TO_ROOM' });
  };

  const handlePlayAgain = () => {
    if (isMultiplayer) {
      // Çok oyunculu modda, oyunu sadece oda sahibi yeniden başlatabilir.
      // Şimdilik, tüm oyuncuları lobiye geri döndürmek en basit çözüm.
      // Daha gelişmiş bir versiyonda, oyuncular odaya geri dönebilir ve
      // oda sahibi yeni bir oyun başlatabilir.
      handleReturnToRoom();
    } else {
      dispatch({ type: 'RESTART_GAME', payload: { category } });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="bg-gray-800 p-10 rounded-2xl shadow-2xl w-full max-w-md text-center flex flex-col items-center gap-6 border border-gray-700"> {/* Tailwind CSS sınıfları eklendi */}
        <h1 className="text-6xl font-bold text-yellow-400">Oyun Bitti!</h1>
        
        {isMultiplayer ? (
          <div className="w-full text-left mt-4">
            <h2 className="text-3xl text-center mb-4">Takım Skorları</h2>
            <div className="space-y-3">
              {Object.values(room.teams).map(team => (
                <div key={team.name} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <span className="text-xl font-semibold">{team.name}</span>
                  <span className="text-2xl font-bold text-yellow-400">{team.score}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className="text-2xl">Skorunuz: {score}</p>
            {!scoreSaved && user && (
              <button onClick={handleSave} className="w-full px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-xl font-bold text-white transition-transform transform hover:scale-105">Skoru Kaydet</button>
            )}
            {scoreSaved && <p className="text-green-400 mt-4">Skorun kaydedildi!</p>}
          </>
        )}

        {isMultiplayer ? (
          <button onClick={handleReturnToRoom} className="mt-6 w-full px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-xl font-bold text-white transition-transform transform hover:scale-105">Odaya Dön</button>
        ) : (
          <button onClick={handlePlayAgain} className="mt-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-xl font-bold text-white transition-transform transform hover:scale-105">Tekrar Oyna</button>
        )}
        {!isMultiplayer && <button onClick={() => dispatch({ type: 'VIEW_LEADERBOARD' })} className="text-blue-400 hover:text-blue-300 mt-2">Skor Tablosunu Gör</button>}
      </div>
    </div>
  );
}

export default GameOver;