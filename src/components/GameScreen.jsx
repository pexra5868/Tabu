import React, { useEffect, useRef } from 'react';

function GameScreen({ score, time, currentCard, dispatch, room, user }) {
  const scoreRef = useRef(null);
  const cardRef = useRef(null);

  // Oyun modunu ve ilgili verileri belirle
  const isMultiplayer = !!room;
  const gameTime = isMultiplayer ? room.time : time;
  const gameCard = isMultiplayer ? room.currentCard : currentCard;
  const isMyTurn = isMultiplayer ? room.currentTurn === user.socketId : true;

  // Skor değiştiğinde animasyonu tetikle
  useEffect(() => {
    // Tek oyunculu modda skor animasyonu
    if (!isMultiplayer && scoreRef.current) {
      scoreRef.current.classList.add('score-change');
      setTimeout(() => scoreRef.current?.classList.remove('score-change'), 400);
    }
    // Çok oyunculu modda bu animasyon daha karmaşık bir yapı gerektirebilir,
    // çünkü her oyuncunun skoru ayrıdır. Şimdilik devre dışı bırakıyoruz.
  }, [score, isMultiplayer]);

  const handleAction = (actionType) => {
    if (isMultiplayer) {
      dispatch({ type: 'PLAYER_ACTION', payload: { action: actionType } });
    } else {
      dispatch({ type: actionType.toUpperCase() + '_GUESS' }); // CORRECT_GUESS veya TABOO_GUESS
    }
  };

  if (!gameCard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md text-center">
          <h1 className="text-4xl font-bold">Yükleniyor...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-around p-4 bg-opacity-50">
      {/* Üst Bilgi: Skor ve Süre */}
      <div className="flex justify-between w-full max-w-lg mb-6 text-2xl bg-black bg-opacity-20 p-4 rounded-xl shadow-lg">
        {isMultiplayer ? (
          <div className="w-full">
            <div className="flex justify-around">
              {Object.values(room.teams).map(team => (
                <div key={team.name} className="text-center">
                  <div className="font-semibold">{team.name}</div>
                  <div>{team.score}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <span ref={scoreRef} className="font-bold text-white">Skor: {score}</span>
        )}
        <span className={`font-bold ${gameTime <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
          Süre: {gameTime}s
        </span>
      </div>

      {/* Oyun Kartı */}
      <div key={gameCard.word} ref={cardRef} className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg text-center card-enter border border-gray-700">
        <h2 className="text-5xl font-bold text-yellow-400 mb-6">{gameCard.word}</h2>
        <ul className="list-none p-0 my-4">
          {gameCard.taboo.map((tabooWord) => (
            <li key={tabooWord} className="text-2xl text-red-400 font-semibold mb-2">{tabooWord}</li>
          ))}
        </ul>
      </div>

      {/* Butonlar */}
      <div className="flex justify-around w-full max-w-lg mt-8 mb-4">
        <button onClick={() => handleAction('correct')} disabled={!isMyTurn} className="px-6 py-3 rounded-lg text-lg font-bold text-white transition-transform transform hover:scale-105 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed">Doğru</button>
        <button onClick={() => handleAction('taboo')} disabled={!isMyTurn} className="px-6 py-3 rounded-lg text-lg font-bold text-white transition-transform transform hover:scale-105 bg-red-600 hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed">Tabu</button>
        <button onClick={() => handleAction('skip')} disabled={!isMyTurn} className="px-6 py-3 rounded-lg text-lg font-bold text-white transition-transform transform hover:scale-105 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-500 disabled:cursor-not-allowed">Pas</button>
      </div>
    </div>
  );
}

export default GameScreen;