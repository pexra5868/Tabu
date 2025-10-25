import React from 'react';
import { WORDS_BY_CATEGORY } from '../words';
import {
  DndContext,
  closestCenter,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';


function RoomScreen({ room, user, dispatch }) {
  const isHost = room.host === user.socketId;
  const categories = Object.keys(WORDS_BY_CATEGORY);
  const canStartGame =
    room.teams.teamA.players.length > 0 &&
    room.teams.teamB.players.length > 0;

  const handleDragEnd = (event) => {
    if (!isHost) return;
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const playerId = active.id;
      const targetTeamId = over.id;
      dispatch({ type: 'MOVE_PLAYER', payload: { playerId, targetTeamId } });
    }
  };


  const handleStartGame = () => {
    dispatch({ type: 'START_MULTIPLAYER_GAME', payload: { words: WORDS_BY_CATEGORY } }); // Bu eylem App.jsx'te 'startGame' olayına çevrilecek
  };

  const handleCategoryChange = (category) => {
    dispatch({ type: 'CHANGE_CATEGORY', payload: { roomId: room.id, category } });
  };

  const handleResetGame = () => {
    dispatch({ type: 'RESET_GAME' });
  };

  const handleJoinTeam = (teamId) => {
    dispatch({ type: 'JOIN_TEAM', payload: { teamId } });
  };

  const handleLeaveRoom = () => {
    dispatch({ type: 'LEAVE_ROOM' });
  };

  const handleChangeTeamName = (teamId) => {
    if (!isHost) return;
    const newName = prompt(`Yeni takım adını girin (${room.teams[teamId].name}):`, room.teams[teamId].name);
    if (newName && newName.trim()) {
      dispatch({ type: 'CHANGE_TEAM_NAME', payload: { teamId, newName: newName.trim() } });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="bg-gray-800 p-10 rounded-2xl shadow-2xl w-full max-w-4xl text-center flex flex-col items-center gap-6">
        <h1 className="text-4xl font-bold text-yellow-400">Oda: {room.name}</h1>
        <p className="text-xl">Oda Kodu: <span className="font-mono bg-gray-700 px-2 py-1 rounded">{room.id}</span></p>

        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {room.gameState === 'game-over' && (
            <div className="w-full bg-gray-900 p-4 rounded-lg">
              <h2 className="text-2xl text-yellow-400 mb-2">Son Oyunun Skorları</h2>
              <div className="flex justify-around text-xl">
                <span>{room.teams.teamA.name}: {room.teams.teamA.score}</span>
                <span>{room.teams.teamB.name}: {room.teams.teamB.score}</span>
              </div>
            </div>
          )}

          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <TeamPanel room={room} team={room.teams.teamA} teamId="teamA" titleColor="text-blue-400" players={room.teams.teamA.players} isHost={isHost} onJoinTeam={handleJoinTeam} user={user} onChangeTeamName={handleChangeTeamName} />
            <TeamPanel room={room} team={room.teams.teamB} teamId="teamB" titleColor="text-red-400" players={room.teams.teamB.players} isHost={isHost} onJoinTeam={handleJoinTeam} user={user} onChangeTeamName={handleChangeTeamName} />
            <UnassignedPlayersPanel players={room.unassignedPlayers} onJoinTeam={handleJoinTeam} user={user} isHost={isHost} />
          </div>
        </DndContext>

        {/* Kategori Seçimi */}
        <div className="w-full mt-4">
          <h2 className="text-2xl mb-4">Kategori</h2>
          <select
            value={room.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={!isHost}
            className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg disabled:bg-gray-600 disabled:cursor-not-allowed appearance-none"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat} className="capitalize">{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
            ))}
          </select>
        </div>

        {isHost && room.gameState === 'waiting' && (
          <button
            onClick={handleStartGame}
            disabled={!canStartGame}
            className="mt-8 px-10 py-4 bg-green-600 hover:bg-green-700 rounded-lg text-2xl font-bold text-white disabled:bg-gray-500 disabled:cursor-not-allowed"
            title={!canStartGame ? 'Her takımda en az bir oyuncu olmalı' : 'Oyunu Başlat'}
          >
            Oyunu Başlat
          </button>
        )}
        {isHost && room.gameState === 'game-over' && (
          <button onClick={handleResetGame} className="mt-8 px-10 py-4 bg-green-600 hover:bg-green-700 rounded-lg text-2xl font-bold text-white">Yeni Oyun Başlat</button>
        )}
        <div className="w-full border-t border-gray-600 pt-6 mt-2">
          <button onClick={handleLeaveRoom} className="w-full px-8 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-xl font-bold text-white">Odadan Ayrıl</button>
        </div>
      </div>
    </div>
  );
}

function TeamPanel({ room, team, teamId, titleColor, players, isHost, onJoinTeam, user, onChangeTeamName }) {
  const { setNodeRef, isOver } = useDroppable({ id: teamId, disabled: !isHost });

  return (
    <div className={`border ${teamId === 'teamA' ? 'border-blue-500' : 'border-red-500'} p-4 rounded-lg transition-all ${isOver ? 'bg-green-500/20' : ''}`}>
      <h3
        onClick={() => onChangeTeamName && onChangeTeamName(teamId)}
        className={`text-2xl font-bold ${titleColor} mb-2 ${isHost && onChangeTeamName ? 'cursor-pointer hover:opacity-75' : ''}`}
      >
        {team.name}
      </h3>
      <div ref={setNodeRef} className="space-y-2 min-h-[120px] bg-gray-900/50 p-2 rounded-md">
        {players.map(p => (
          <PlayerItem key={p.id} player={p} isSelf={p.id === user.socketId} isRoomHost={p.id === room.host} isDraggable={isHost} />
        ))}
        {players.length === 0 && <p className="text-gray-500 text-sm p-4 text-center">Oyuncuları buraya sürükle</p>}
      </div>
      <button onClick={() => onJoinTeam(teamId)} className="mt-4 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-bold text-white">Bu Takıma Katıl</button>
    </div>
  );
}

function UnassignedPlayersPanel({ players, onJoinTeam, user, isHost }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unassignedPlayers', disabled: !isHost });

  return (
    <div className={`border border-gray-600 p-4 rounded-lg transition-all ${isOver ? 'bg-green-500/20' : ''}`}>
      <h3 className="text-2xl font-bold text-gray-400 mb-2">Atanmamış Oyuncular</h3>
      <div ref={setNodeRef} className="space-y-2 min-h-[120px] bg-gray-900/50 p-2 rounded-md">
        {players.map(p => (
          <PlayerItem key={p.id} player={p} isSelf={p.id === user.socketId} isRoomHost={false} isDraggable={isHost} />
        ))}
        {players.length === 0 && <p className="text-gray-500 text-sm p-4 text-center">Tüm oyuncular takımlarda.</p>}
      </div>
      <button onClick={() => onJoinTeam('unassignedPlayers')} className="mt-4 w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-bold text-white">Takımdan Ayrıl</button>
    </div>
  );
}

function PlayerItem({ player, isSelf, isRoomHost, isDraggable }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useDraggable({
    id: player.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDraggable ? 'grab' : 'default',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="p-2 rounded-md text-white bg-gray-700 select-none">
      {player.username} {isSelf ? '(Sen)' : ''} {isRoomHost ? '👑' : ''}
    </div>
  );
}

export default RoomScreen;