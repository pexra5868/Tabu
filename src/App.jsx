import { useReducer, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import "./App.css"; // Bu satırın üstüne ekleyelim
import { WORDS_BY_CATEGORY } from "./words";
import GameOver from "./components/GameOver";
import StartScreen from "./components/StartScreen";
import GameScreen from "./components/GameScreen";
import AuthScreen from "./components/AuthScreen"; // Yeni eklenecek
import ProfileScreen from "./components/ProfileScreen"; // Yeni eklenecek
import Leaderboard from "./components/Leaderboard";
import LobbyScreen from "./components/LobbyScreen";
import RoomScreen from "./components/RoomScreen";

// 1. Oyun için başlangıç durumunu tanımlayalım
// Kullanıcı bilgileri için yeni alanlar eklendi
const initialState = {
  category: 'genel',
  gameState: "not-started", // "not-started", "playing", "game-over", "leaderboard", "login", "register", "profile", "lobby", "room"
  currentCard: null,
  user: null, // { id: '...', username: '...', token: '...' } veya null
  room: null, // Multiplayer oda bilgisi
  deck: [],
  score: 0,
  time: 60,
};

// Ses efektlerini tanımlayalım
const correctSound = new Audio('/sounds/correct.mp3');
const wrongSound = new Audio('/sounds/wrong.mp3');
const skipSound = new Audio('/sounds/skip.mp3');
const joinSound = new Audio('/sounds/join.mp3');
const leaveSound = new Audio('/sounds/leave.mp3');

// Yardımcı Fonksiyon: Desteden rastgele bir sonraki kartı çeker.
function drawNextCard(deck) {
  if (deck.length === 0) {
    return { nextCard: null, updatedDeck: [] };
  }
  const updatedDeck = [...deck];
  const nextCardIndex = Math.floor(Math.random() * updatedDeck.length);
  const nextCard = updatedDeck.splice(nextCardIndex, 1)[0];
  return { nextCard, updatedDeck };
}

// Oyun başlatma ve yeniden başlatma mantığını içeren yardımcı fonksiyon
function startGameLogic(state, payload) {
  const category = payload?.category || state.category;
  const wordsForCategory = WORDS_BY_CATEGORY[category] || [];
  const { nextCard, updatedDeck } = drawNextCard(wordsForCategory);
  return {
    ...initialState,
    gameState: "playing",
    deck: updatedDeck,
    currentCard: nextCard,
    user: state.user, // Kullanıcı bilgisini koru
    category: category, // Seçilen kategoriyi state'e kaydet
  };
}

// 2. State'i güncelleyecek olan reducer fonksiyonunu (daha temiz haliyle) yazalım
function gameReducer(state, action) {
  switch (action.type) {
    case "START_GAME":
      // Kullanıcı giriş yapmamışsa oyun ekranını gösterme, ana menüye dön.
      if (!state.user) return { ...state, gameState: "login" };
      return startGameLogic(state, action.payload);
    case "RESTART_GAME": {
      return startGameLogic(state, action.payload);
    }
    case "CORRECT_GUESS": {
      const { nextCard, updatedDeck } = drawNextCard(state.deck);
      if (!nextCard) {
        return { ...state, gameState: "game-over" };
      }
      correctSound.play();
      return {
        ...state,
        score: state.score + 1,
        deck: updatedDeck,
        currentCard: nextCard,
      };
    }
    case "TABOO_GUESS": {
      wrongSound.play();
      // Bu case'i SKIP_CARD'dan ayırıyoruz ki skoru her zaman düşürsün.
      const { nextCard, updatedDeck } = drawNextCard(state.deck);
      if (!nextCard) return { ...state, gameState: "game-over" };
      return { ...state, score: state.score - 1, deck: updatedDeck, currentCard: nextCard };
    }
    case "SKIP_CARD": {
      const { nextCard, updatedDeck } = drawNextCard(state.deck);
      if (!nextCard) {
        return { ...state, gameState: "game-over" };
      }
      skipSound.play();
      return {
        ...state,
        deck: updatedDeck,
        currentCard: nextCard,
      };
    }
    case "SHOW_START_SCREEN": {
      return {
        ...initialState,
        user: state.user, // Kullanıcı bilgisini koru
      };
    }
    case "TICK": {
        if (state.time <= 1) {
            return { ...state, gameState: "game-over", time: 0 };
        }
        return { ...state, time: state.time - 1 };
    }
    case "SAVE_SCORE": {
      // Backend entegrasyonu
      if (state.user?.token) {
        fetch(`${action.payload.apiUrl}/api/scores`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.user.token}`,
          },
          body: JSON.stringify({
            score: action.payload.score,
            category: action.payload.category,
          }),
        })
          .then(response => response.json())
          .then(data => console.log('Score saved to backend:', data))
          .catch(error => console.error('Error saving score to backend:', error));
      }
      return { ...state };
    }
    case "VIEW_LEADERBOARD": {
      return { ...state, gameState: "leaderboard" };
    }
    case "SHOW_LOGIN": {
      return { ...state, gameState: "login" };
    }
    case "SHOW_REGISTER": {
      return { ...state, gameState: "register" };
    }
    case "LOGIN_SUCCESS": {
      // Kullanıcı token'ını localStorage'a kaydetmek iyi bir pratik olabilir
      localStorage.setItem('userToken', action.payload.token);
      return { ...state, user: { id: action.payload.id, username: action.payload.username, token: action.payload.token }, gameState: "not-started" }; // Giriş sonrası ana ekrana dön
    }
    case "LOGOUT": {
      localStorage.removeItem('userToken'); // Token'ı temizle
      return { ...state, user: null, gameState: "not-started" }; // Çıkış sonrası ana ekrana dön
    }
    case "SHOW_PROFILE": {
      if (!state.user) return { ...state, gameState: "login" }; // Giriş yapmamışsa giriş ekranına yönlendir
      return { ...state, gameState: "profile" };
    }
    case "SET_USER": { // Uygulama başlangıcında token kontrolü için
      return { ...state, user: action.payload };
    }
    // Multiplayer Actions
    case "GO_TO_LOBBY": {
      if (!state.user) return { ...state, gameState: "login" };
      return { ...state, gameState: "lobby" };
    }
    case "ROOM_UPDATE": {
      return { ...state, room: action.payload, gameState: action.payload.gameState === 'waiting' ? 'room' : state.gameState };
    }
    case "GAME_START": {
      return { ...state, room: action.payload, gameState: 'playing' };
    }
    case "LEAVE_ROOM": {
      // Oyuncuyu lobiye geri döndür ve oda bilgisini temizle
      return { ...state, gameState: 'lobby', room: null };
    }
    case "RETURN_TO_ROOM": {
      // Oyun bittikten sonra odaya dön
      return { ...state, gameState: 'room' };
    }
    default:
      return state;
  }
}

function App() {
  // 3. useReducer hook'unu kullanalım
  const [state, originalDispatch] = useReducer(gameReducer, initialState);
  const socketRef = useRef(null);

  // Uygulama yüklendiğinde localStorage'dan kullanıcı token'ını kontrol et
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (token) {
      const fetchUser = async () => {
        try {
          const response = await fetch('/api/users/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const userData = await response.json();
            // Sunucudan gelen kullanıcı verisi ile state'i güncelle
            originalDispatch({ type: 'SET_USER', payload: { id: userData._id, username: userData.username, token } });
          } else {
            // Token geçersizse temizle
            localStorage.removeItem('userToken');
          }
        } catch (error) {
          console.error("Kullanıcı verisi alınırken hata:", error);
        }
      };
      fetchUser();
    }
  }, []);

  // Socket bağlantısı ve event dinleyicileri
  useEffect(() => {
    // Sadece kullanıcı giriş yapmışsa ve socket bağlantısı henüz kurulmamışsa devam et.
    if (state.user?.id && !socketRef.current) {
      // Vite proxy'sini kullanmak için doğrudan adresi kaldırıyoruz.
      // Bu, socket.io'nun sayfayı sunan sunucuya (Vite dev server) bağlanmasını sağlar.
      // Vite dev server da bu isteği backend'e proxy'leyecektir.
      const socket = io();
      socketRef.current = socket;

      // Bağlantı kurulduğunda socket.id'yi state'e ekle
      socket.on('connect', () => {
        originalDispatch({ type: 'SET_USER', payload: { ...state.user, socketId: socket.id } });
      });

      const onRoomUpdate = (room) => originalDispatch({ type: 'ROOM_UPDATE', payload: room });
      const onGameStart = (room) => originalDispatch({ type: 'GAME_START', payload: room });
      const onError = (error) => {
        alert(error.message);
        originalDispatch({ type: 'SHOW_START_SCREEN' });
      };
      const onPlayerJoined = ({ username }) => {
        console.log(`${username} odaya katıldı.`);
        joinSound.play();
      };
      const onPlayerLeft = ({ username }) => {
        console.log(`${username} odadan ayrıldı.`);
        leaveSound.play();
      };

      socket.on('roomUpdate', onRoomUpdate);
      socket.on('gameStart', onGameStart);
      socket.on('error', onError);
      socket.on('playerJoined', onPlayerJoined);
      socket.on('playerLeft', onPlayerLeft);

      return () => {
        // Temizlik fonksiyonu: Olay dinleyicilerini kaldır ve bağlantıyı kes
        // Bu kısım artık gerekli değil çünkü socket zaten disconnect olacak.
        // Dinleyiciler de bağlantı koptuğunda otomatik olarak temizlenir.
        socket.disconnect();
        socketRef.current = null;
      };
    } else if (!state.user?.id && socketRef.current) {
      // Kullanıcı çıkış yapmışsa ve hala bir bağlantı varsa, bağlantıyı kes.
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [state.user, originalDispatch]); // state.user veya originalDispatch değiştiğinde yeniden çalışır


  // Multiplayer aksiyonlarını socket'e gönderen sarmalayıcı dispatch
  const dispatch = useCallback((action) => {
    if (socketRef.current) {
      if (['CREATE_ROOM', 'JOIN_ROOM', 'START_MULTIPLAYER_GAME', 'CHANGE_CATEGORY', 'LEAVE_ROOM', 'JOIN_TEAM', 'RESET_GAME', 'CHANGE_TEAM_NAME'].includes(action.type)) {
        const eventName = action.type === 'START_MULTIPLAYER_GAME'
          ? 'startGame'
          : action.type.toLowerCase().replace(/_([a-z])/g, g => g[1].toUpperCase());
        socketRef.current.emit(eventName, { ...action.payload, username: state.user.username, userId: state.user.id, roomId: state.room?.id });
      } else if (action.type === 'PLAYER_ACTION') {
        socketRef.current.emit('playerAction', { roomId: state.room.id, action: action.payload.action });
      } else {
        originalDispatch(action);
      }
    } else {
      originalDispatch(action);
    }
  }, [originalDispatch, state.user, state.room]);

  useEffect(() => {
    if (state.gameState !== 'playing') return;

    // Oyun başladığında zamanlayıcıyı sıfırla
    if (state.time === initialState.time) {
      dispatch({ type: 'TICK' }); // İlk tick'i hemen başlat
    }

    const timer = setInterval(() => {
        dispatch({ type: 'TICK' });
    }, 1000);

    return () => clearInterval(timer);
  }, [state.gameState, state.time, dispatch]);

  if (state.gameState === "not-started") { // Ana menü
    return <StartScreen dispatch={dispatch} user={state.user} />;
  }

  if (state.gameState === "login") { // Giriş ekranı
    return <AuthScreen dispatch={dispatch} type="login" />;
  }

  if (state.gameState === "register") { // Kayıt ekranı
    return <AuthScreen dispatch={dispatch} type="register" />;
  }

  if (state.gameState === "lobby") {
    return <LobbyScreen dispatch={dispatch} socket={socketRef.current} />;
  }

  if (state.gameState === "room") {
    return <RoomScreen room={state.room} user={state.user} dispatch={dispatch} />;
  }

  if (state.gameState === "playing") {
    return <GameScreen {...state} dispatch={dispatch} />;
  }

  if (state.gameState === "game-over") {
    return <GameOver score={state.score} dispatch={dispatch} category={state.category} user={state.user} room={state.room} />;
  }

  if (state.gameState === "leaderboard") {
    return <Leaderboard dispatch={dispatch} user={state.user} />;
  }

  if (state.gameState === "profile") {
    if (!state.user) {
      // Bu duruma düşmemesi gerekir, çünkü SHOW_PROFILE action'ı kontrol ediyor
      return <StartScreen dispatch={dispatch} user={state.user} />;
    }
    return <ProfileScreen user={state.user} dispatch={dispatch} />;
  }
}

export default App;
