// backend/server.js

require('dotenv').config(); // Ortam değişkenlerini yüklemek için
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001; // Render'ın verdiği portu kullan
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
// DİKKAT: Bu anahtarı gerçek bir uygulamada .env dosyası gibi güvenli bir yerde saklayın.
// Asla doğrudan kodun içine yazmayın.
const JWT_SECRET = process.env.JWT_SECRET;

// --- MongoDB Bağlantı Bilgileri ---
// Eğer MongoDB'yi farklı bir adreste çalıştırıyorsanız veya Atlas gibi bir servis kullanıyorsanız bu adresi güncelleyin.
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = 'tabu-game-db'; // Veritabanı adı

let db;
let usersCollection;
let scoresCollection; // Skorları saklamak için yeni koleksiyon

// --- Test Verisi Ekleme Fonksiyonu ---
async function seedDatabase() {
  try {
    // Eğer koleksiyonda zaten kullanıcı varsa, işlemi atla
    const userCount = await usersCollection.countDocuments();
    if (userCount > 0) {
      console.log('Veritabanında kullanıcılar mevcut, seeding işlemi atlandı.');
      return;
    }

    console.log('Veritabanı boş, test verileri ekleniyor...');

    // 1. Test kullanıcıları oluştur
    const usersToCreate = [
      { username: 'testuser1', password: 'password123', wins: 5, losses: 3 },
      { username: 'gamer123', password: 'password123', wins: 10, losses: 2 },
      { username: 'pro_player', password: 'password123', wins: 2, losses: 8 },
    ];

    const createdUsers = [];
    for (const userData of usersToCreate) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const result = await usersCollection.insertOne({
        username: userData.username,
        password: hashedPassword,
        wins: userData.wins,
        losses: userData.losses,
      });
      createdUsers.push({ ...userData, _id: result.insertedId });
    }
    console.log(`${createdUsers.length} test kullanıcısı oluşturuldu.`);

    // 2. Her kullanıcı için rastgele skorlar oluştur
    const scoresToCreate = [];
    const categories = ['genel', 'spor', 'teknoloji', 'tarih'];
    for (const user of createdUsers) {
      for (let i = 0; i < Math.floor(Math.random() * 5) + 1; i++) { // Her kullanıcı için 1-5 arası skor
        scoresToCreate.push({
          userId: user._id,
          username: user.username,
          score: Math.floor(Math.random() * 20) + 5, // 5-25 arası skor
          category: categories[Math.floor(Math.random() * categories.length)],
          date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Son 30 gün içinde rastgele bir tarih
        });
      }
    }

    if (scoresToCreate.length > 0) {
      await scoresCollection.insertMany(scoresToCreate);
      console.log(`${scoresToCreate.length} test skoru oluşturuldu.`);
    }
  } catch (error) {
    console.error('Veritabanı seeding sırasında hata:', error);
  }
}

// Sunucu başlamadan önce veritabanına bağlan
MongoClient.connect(MONGO_URL)
  .then(async (client) => {
    console.log('MongoDB veritabanına başarıyla bağlanıldı.');
    db = client.db(DB_NAME);
    usersCollection = db.collection('users');
    scoresCollection = db.collection('scores'); // Koleksiyonu başlat
    
    // Veritabanı boşsa test verilerini ekle
    await seedDatabase();

    // Sunucuyu `app.listen` yerine `server.listen` ile başlatıyoruz
    server.listen(PORT, () => {
      console.log(`Backend sunucusu http://localhost:${PORT} adresinde çalışıyor.`);
    });
  })
  .catch(error => {
    console.error('MongoDB bağlantı hatası:', error);
    process.exit(1); // Bağlantı başarısız olursa uygulamayı sonlandır
  });

// --- Middleware ve API Endpoint'leri ---
// Bu blok, sunucu dinlemeye başlamadan ÖNCE tanımlanmalıdır.

// Middleware'ler
app.use(cors());
app.use(express.json());

// Middleware'ler
app.use(cors());
app.use(express.json());

// JWT Doğrulama Middleware'i
// Bu middleware, token gerektiren endpoint'lerin başına eklenecek.
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ message: 'Yetkilendirme token\'ı bulunamadı.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Geçersiz token.' });
    }
    req.user = user;
    next();
  });
}

// Kayıt (Register) Endpoint'i
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Kullanıcı adı ve şifre zorunludur.' });
    }

    // Kullanıcı adının daha önce alınıp alınmadığını kontrol et
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Bu kullanıcı adı zaten alınmış.' });
    }

    // Şifreyi hash'le (güvenli hale getir)
    const hashedPassword = await bcrypt.hash(password, 10); // 10, hash'leme zorluk seviyesidir.

    // Yeni kullanıcıyı veritabanına ekle
    const newUser = {
      username,
      password: hashedPassword,
      wins: 0,
      losses: 0,
    };
    const result = await usersCollection.insertOne(newUser);

    // JWT Payload'ını oluştur
    const payload = { userId: result.insertedId, username: username };
    // Token'ı imzala (1 saat geçerli)
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    // Frontend'e başarılı yanıtı gönder
    res.status(201).json({
      _id: result.insertedId, // Frontend'in beklemesi için _id olarak gönderelim
      message: 'Kullanıcı başarıyla oluşturuldu!',
      userId: result.insertedId,
      username: username,
      token: token
    });

  } catch (error) {
    console.error('Kayıt sırasında hata:', error);
    res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
});

// Helper: Çok oyunculu oyun bittiğinde istatistikleri güncelle
async function updatePlayerStats(room) {
  if (!room || !room.teams) return;

  const teamA = room.teams.teamA;
  const teamB = room.teams.teamB;

  if (teamA.score === teamB.score) return; // Beraberlik durumunda şimdilik bir şey yapmıyoruz.

  const winningTeam = teamA.score > teamB.score ? teamA : teamB;
  const losingTeam = teamA.score < teamB.score ? teamA : teamB;

  const winUpdates = winningTeam.players.map(player => 
    usersCollection.updateOne({ _id: new ObjectId(player.userId) }, { $inc: { wins: 1 } })
  );
  const lossUpdates = losingTeam.players.map(player => 
    usersCollection.updateOne({ _id: new ObjectId(player.userId) }, { $inc: { losses: 1 } })
  );

  await Promise.all([...winUpdates, ...lossUpdates]);
}

// --- Multiplayer Game Logic ---

const GAME_STATES = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  GAME_OVER: 'game-over',
};

const rooms = {};

io.on('connection', (socket) => {
  console.log('Bir kullanıcı bağlandı:', socket.id);
  // Yeni bağlanan kullanıcıya mevcut odaları gönder
  socket.emit('roomListUpdate', Object.values(rooms).map(r => ({ id: r.id, name: r.name, playerCount: r.players.length, isPrivate: r.isPrivate })));

  // Helper function to broadcast room list updates
  const broadcastRoomList = () => {
    const roomList = Object.values(rooms).map(r => {
      const playerCount = (r.teams?.teamA?.players?.length || 0) + (r.teams?.teamB?.players?.length || 0) + (r.unassignedPlayers?.length || 0);
      return { id: r.id, name: r.name, playerCount, isPrivate: r.isPrivate };
    });
    io.emit('roomListUpdate', roomList);
  };

  // Yeni: Sayfa yenilendiğinde oyuncuyu odaya geri alma
  socket.on('reconnectPlayer', ({ roomId, userId }) => {
    const room = rooms[roomId];
    if (!room) {
      // Oda artık mevcut değilse, oyuncuyu lobiye yönlendir
      socket.emit('leaveRoom');
      return;
    }

    let playerToUpdate;
    let wasHost = false;

    // Oyuncuyu tüm takımlarda ve atanmamışlar listesinde ara
    const allPlayers = [...room.teams.teamA.players, ...room.teams.teamB.players, ...room.unassignedPlayers];
    playerToUpdate = allPlayers.find(p => p.userId === userId);

    if (playerToUpdate) {
      console.log(`Oyuncu yeniden bağlanıyor: ${playerToUpdate.username} -> Oda: ${room.name}`);
      
      // Eğer oyuncu host ise, host'un yeni socket.id'sini güncelle
      if (room.host === playerToUpdate.id) {
        room.host = socket.id;
        wasHost = true;
      }
      // Eğer oyuncunun sırasıysa, sıradaki oyuncunun socket.id'sini güncelle
      if (room.currentTurn === playerToUpdate.id) {
        room.currentTurn = socket.id;
      }

      // Oyuncunun socket.id'sini yenisiyle değiştir
      playerToUpdate.id = socket.id;
      socket.join(roomId);
      io.to(roomId).emit('roomUpdate', room); // Tüm odaya güncel durumu gönder
    }
  });

  // Oda oluşturma
  socket.on('createRoom', ({ roomName, username, password, userId, teamAName, teamBName }) => {
    const roomId = Math.random().toString(36).substring(2, 8);
    rooms[roomId] = {
      id: roomId,
      name: roomName,
      password: password || null,
      isPrivate: !!password,
      teams: {
        teamA: { name: teamAName || 'Takım A', score: 0, players: [] },
        teamB: { name: teamBName || 'Takım B', score: 0, players: [] },
      },
      unassignedPlayers: [{ id: socket.id, username, userId }],
      host: socket.id,
      category: 'genel', // Kategori alanı eklendi
      gameState: GAME_STATES.WAITING,
      currentTurn: null,
      currentCard: null,
      deck: [],
      time: 60,
      timerId: null, // Zamanlayıcı ID'sini saklamak için
    };
    socket.join(roomId);
    io.to(roomId).emit('roomUpdate', rooms[roomId]);
    broadcastRoomList();
    console.log(`Oda oluşturuldu: ${roomName} (${roomId}) oleh ${username}`);
  });

  // Odaya katılma
  socket.on('joinRoom', ({ roomId, username, password, userId }) => {
    const room = rooms[roomId];
    if (room && room.gameState === GAME_STATES.WAITING) {
      if (room.isPrivate && room.password !== password) {
        socket.emit('error', { message: 'Yanlış oda şifresi.' });
        return;
      }
      const player = { id: socket.id, username, userId };
      room.unassignedPlayers.push(player);
      socket.join(roomId);
      io.to(roomId).emit('roomUpdate', rooms[roomId]);
      broadcastRoomList();
      console.log(`${username} odaya katıldı: ${roomId}`);
    } else {
      socket.emit('error', { message: 'Oda bulunamadı veya oyun zaten başladı.' });
    }
  });

  // Yeni: Kategori değiştirme olayı
  socket.on('changeCategory', ({ roomId, category }) => {
    const room = rooms[roomId];
    if (room && room.host === socket.id && room.gameState === GAME_STATES.WAITING) {
      room.category = category;
      io.to(roomId).emit('roomUpdate', room);
    }
  });

  // Yeni: Kategori değiştirme olayı
  socket.on('changeCategory', ({ roomId, category }) => {
    const room = rooms[roomId];
    if (room && room.host === socket.id && room.gameState === GAME_STATES.WAITING) {
      room.category = category;
      io.to(roomId).emit('roomUpdate', room);
    }
  });

  // Yeni: Takıma katılma olayı
  socket.on('joinTeam', ({ roomId, teamId, userId, username }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Oyuncuyu diğer takımlardan ve atanmamışlardan kaldır
    let player;
    for (const key in room.teams) {
      const team = room.teams[key];
      const playerIndex = team.players.findIndex(p => p.id === socket.id);
      if (playerIndex > -1) {
        player = team.players.splice(playerIndex, 1)[0];
        break;
      }
    }
    if (!player) {
      const playerIndex = room.unassignedPlayers.findIndex(p => p.id === socket.id);
      if (playerIndex > -1) player = room.unassignedPlayers.splice(playerIndex, 1)[0];
    }

    // Oyuncuyu yeni takımına ekle
    if (player && room.teams[teamId]) { // player zaten varsa taşınıyor
      room.teams[teamId].players.push(player);
      io.to(roomId).emit('roomUpdate', room);
    } else { // player yoksa (ilk defa takıma katılıyorsa)
      const playerIndex = room.unassignedPlayers.findIndex(p => p.id === socket.id);
      if (playerIndex > -1) {
        const newPlayer = room.unassignedPlayers.splice(playerIndex, 1)[0];
        room.teams[teamId].players.push(newPlayer);
        io.to(roomId).emit('roomUpdate', room);
      }
    }
  });

  // Yeni: Takım ismini değiştirme olayı
  socket.on('changeTeamName', ({ roomId, teamId, newName }) => {
    const room = rooms[roomId];
    if (room && room.host === socket.id && room.teams[teamId]) {
      room.teams[teamId].name = newName;
      io.to(roomId).emit('roomUpdate', room);
    }
  });

  // Yeni: Odadan ayrılma olayı
  socket.on('leaveRoom', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    let player, teamId;
    for (const key in room.teams) {
      const team = room.teams[key];
      const p = team.players.find(p => p.id === socket.id);
      if (p) {
        player = p;
        teamId = key;
        break;
      }
    }
    if (!player) player = room.unassignedPlayers.find(p => p.id === socket.id);

    if (player) {
      console.log(`${player.username} odadan ayrıldı: ${roomId}`);
      if (teamId) room.teams[teamId].players = room.teams[teamId].players.filter(p => p.id !== socket.id);
      else room.unassignedPlayers = room.unassignedPlayers.filter(p => p.id !== socket.id);

      const totalPlayers = room.teams.teamA.players.length + room.teams.teamB.players.length + room.unassignedPlayers.length;
      if (totalPlayers === 0) {
        // Eğer oda boşaldıysa, zamanlayıcıyı temizle ve odayı sil
        console.log(`Oda ${roomId} kapatılıyor.`);
        clearInterval(room.timerId);
        delete rooms[roomId];
        broadcastRoomList();
      } else {
        // Eğer ayrılan oyuncu host ise, yeni bir host belirle
        if (room.host === socket.id) {
          const allPlayers = [...room.teams.teamA.players, ...room.teams.teamB.players, ...room.unassignedPlayers];
          if (allPlayers.length > 0) {
            room.host = allPlayers[0].id;
          }
        }
        io.to(roomId).emit('roomUpdate', room);
        broadcastRoomList();
      }
    }
  });

  // Yeni: Oyunu yeniden başlatmak için odayı sıfırlama olayı
  socket.on('resetGame', ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.host === socket.id && room.gameState === GAME_STATES.GAME_OVER) {
      room.gameState = GAME_STATES.WAITING;
      room.teams.teamA.score = 0;
      room.teams.teamB.score = 0;
      room.time = 60;
      room.currentCard = null;
      room.currentTurn = null;
      io.to(roomId).emit('roomUpdate', room);
    }
  });

  // Oyunu başlatma
  socket.on('startGame', ({ roomId, words }) => {
    const room = rooms[roomId];
    if (room && room.host === socket.id) {
      // Her takımda en az bir oyuncu olup olmadığını kontrol et
      if (room.teams.teamA.players.length < 1 || room.teams.teamB.players.length < 1) {
        socket.emit('error', { message: 'Oyunu başlatmak için her takımda en az bir oyuncu olmalıdır.' });
        return;
      }

      room.gameState = GAME_STATES.PLAYING;
      const category = room.category; // Odadan kategoriyi al
      // Oyuncuları takımlara göre sırala (A, B, A, B...)
      room.playersInTurnOrder = [];
      const maxPlayers = Math.max(room.teams.teamA.players.length, room.teams.teamB.players.length);
      for (let i = 0; i < maxPlayers; i++) {
        if (room.teams.teamA.players[i]) room.playersInTurnOrder.push(room.teams.teamA.players[i]);
        if (room.teams.teamB.players[i]) room.playersInTurnOrder.push(room.teams.teamB.players[i]);
      }
      room.deck = [...words[category]]; // Kelime destesini ayarla
      room.currentTurn = room.playersInTurnOrder[0].id; // İlk oyuncu başlar
      
      // İlk kartı çek
      const { nextCard, updatedDeck } = drawNextCard(room.deck);
      room.currentCard = nextCard;
      room.deck = updatedDeck;

      // Önceki zamanlayıcıyı temizle (varsa)
      if (room.timerId) {
        clearInterval(room.timerId);
      }

      // Yeni zamanlayıcıyı başlat
      room.timerId = setInterval(() => {
        if (room.time > 0) {
          room.time--;
          io.to(roomId).emit('roomUpdate', room);
        } else {
          clearInterval(room.timerId);
          room.gameState = GAME_STATES.GAME_OVER;
          updatePlayerStats(room); // İstatistikleri güncelle
          io.to(roomId).emit('roomUpdate', room);
        }
      }, 1000);

      io.to(roomId).emit('gameStart', room);
      io.to(roomId).emit('roomUpdate', room);
    }
  });

  // Oyuncu aksiyonları (doğru, tabu, pas)
  socket.on('playerAction', ({ roomId, action }) => {
    const room = rooms[roomId];
    if (!room || room.gameState !== GAME_STATES.PLAYING || socket.id !== room.currentTurn) return;

    // Oyuncunun takımını bul ve skoru güncelle
    const playerTeamId = room.teams.teamA.players.some(p => p.id === socket.id) ? 'teamA' : 'teamB';
    if (playerTeamId) {
      if (action === 'correct') room.teams[playerTeamId].score++;
      if (action === 'taboo') room.teams[playerTeamId].score--;
    }

    // Sonraki kartı çek ve sıradaki oyuncuya geç
    const currentPlayerIndex = room.playersInTurnOrder.findIndex(p => p.id === socket.id);
    const nextPlayer = room.playersInTurnOrder[(currentPlayerIndex + 1) % room.playersInTurnOrder.length];

    const { nextCard, updatedDeck } = drawNextCard(room.deck);
    if (!nextCard) {
      clearInterval(room.timerId); // Kartlar bittiğinde zamanlayıcıyı durdur
      updatePlayerStats(room); // İstatistikleri güncelle
      room.gameState = GAME_STATES.GAME_OVER;
    } else {
      room.currentCard = nextCard;
      room.deck = updatedDeck;
      room.currentTurn = nextPlayer.id;
    }

    io.to(roomId).emit('roomUpdate', room);
  });

  socket.on('disconnect', () => {
    console.log('Bir kullanıcı ayrıldı:', socket.id);
    // Oyuncunun bulunduğu odayı bul ve temizlik yap
    for (const roomId in rooms) {
      const room = rooms[roomId];
      let player, teamId;
      for (const key in room.teams) {
        const team = room.teams[key];
        const p = team.players.find(p => p.id === socket.id);
        if (p) {
          player = p;
          teamId = key;
          break;
        }
      }
      if (!player) player = room.unassignedPlayers.find(p => p.id === socket.id);

      if (player) {
        const wasMyTurn = room.gameState === GAME_STATES.PLAYING && room.currentTurn === socket.id;
        const currentPlayerIndex = room.playersInTurnOrder?.findIndex(p => p.id === socket.id);

        if (teamId) room.teams[teamId].players = room.teams[teamId].players.filter(p => p.id !== socket.id);
        else room.unassignedPlayers = room.unassignedPlayers.filter(p => p.id !== socket.id);

        const totalPlayers = room.teams.teamA.players.length + room.teams.teamB.players.length + room.unassignedPlayers.length;

        if (totalPlayers === 0) {
          // Eğer oda boşaldıysa, zamanlayıcıyı temizle ve odayı sil
          console.log(`Oda ${roomId} kapatılıyor.`);
          clearInterval(room.timerId);
          delete rooms[roomId];
          broadcastRoomList();
        } else {
          // Oyun sırasında bir oyuncu ayrıldıysa
          if (room.gameState === GAME_STATES.PLAYING) {
            room.playersInTurnOrder.splice(currentPlayerIndex, 1);

            // Eğer bir takım boşaldıysa oyunu bitir
            if (room.teams.teamA.players.length === 0 || room.teams.teamB.players.length === 0) {
              clearInterval(room.timerId);
              updatePlayerStats(room); // İstatistikleri güncelle
              room.gameState = GAME_STATES.GAME_OVER;
            } else if (wasMyTurn && room.playersInTurnOrder.length > 0) {
              // Sırası gelen oyuncu ayrıldıysa, sırayı bir sonraki oyuncuya geçir
              const nextPlayerIndex = currentPlayerIndex % room.playersInTurnOrder.length;
              room.currentTurn = room.playersInTurnOrder[nextPlayerIndex].id;
            }
          }

          // Eğer ayrılan oyuncu host ise, yeni bir host belirle
          if (room.host === socket.id) {
            const allPlayers = [...room.teams.teamA.players, ...room.teams.teamB.players, ...room.unassignedPlayers];
            if (allPlayers.length > 0) {
              room.host = allPlayers[0].id;
            }
          }
          io.to(roomId).emit('roomUpdate', room);
          broadcastRoomList();
        }
        break; // Oyuncu bulundu, döngüden çık
      }
    }
  });
});

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

// Yeni: Oyun skorunu kaydetme Endpoint'i
// Bu endpoint'i `authenticateToken` ile koruyoruz.
app.post('/api/scores', authenticateToken, async (req, res) => {
  try {
    const { score, category } = req.body;
    const { userId, username } = req.user; // Token'dan gelen kullanıcı bilgisi

    if (typeof score !== 'number' || !category) {
      return res.status(400).json({ message: 'Skor ve kategori zorunludur.' });
    }

    const newScore = {
      userId: new ObjectId(userId),
      username,
      score,
      category,
      date: new Date(),
    };

    await scoresCollection.insertOne(newScore);

    res.status(201).json({ message: 'Skor başarıyla kaydedildi.' });
  } catch (error) {
    console.error('Skor kaydetme sırasında hata:', error);
    res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
});

// Yeni: Kullanıcının oyun geçmişini getirme Endpoint'i
// Bu endpoint'i de `authenticateToken` ile koruyoruz.
app.get('/api/users/:userId/history', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    // Skorları tarihe göre en yeniden en eskiye doğru sıralayarak getiriyoruz.
    const history = await scoresCollection.find({ userId: new ObjectId(userId) }).sort({ date: -1 }).toArray();
    res.status(200).json(history);
  } catch (error) {
    console.error('Oyun geçmişi alınırken hata:', error);
    res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
});

// Yeni: Giriş yapmış kullanıcının bilgilerini getirme
app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { password: 0 } } // Şifreyi gönderme
    );
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Kullanıcı bilgisi alınırken hata:', error);
    res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
});

// Yeni: Liderlik tablosunu getirme Endpoint'i
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await scoresCollection
      .find({})
      .sort({ score: -1 }) // Skora göre büyükten küçüğe sırala
      .limit(10) // İlk 10 sonucu al
      .toArray();
    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Liderlik tablosu alınırken hata:', error);
    res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
});

// Yeni: Çok oyunculu galibiyetlere göre liderlik tablosu
app.get('/api/leaderboard/wins', async (req, res) => {
  try {
    const leaderboard = await usersCollection
      .find({ wins: { $gt: 0 } }) // Sadece en az bir galibiyeti olanları al
      .sort({ wins: -1 }) // Galibiyet sayısına göre büyükten küçüğe sırala
      .limit(10) // İlk 10 sonucu al
      .project({ password: 0 }) // Şifreyi gönderme
      .toArray();
    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Galibiyet liderlik tablosu alınırken hata:', error);
    res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
});

// Giriş (Login) Endpoint'i
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Kullanıcı adı ve şifre zorunludur.' });
    }

    // Kullanıcıyı veritabanında bul
    const user = await usersCollection.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Kullanıcı adı veya şifre hatalı.' });
    }

    // Gelen şifre ile veritabanındaki hash'lenmiş şifreyi karşılaştır
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Kullanıcı adı veya şifre hatalı.' });
    }

    // JWT Payload'ını oluştur
    const payload = { userId: user._id, username: user.username };
    // Token'ı imzala (1 saat geçerli)
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    // Başarılı giriş
    console.log('Kullanıcı giriş yaptı:', user.username);
    res.status(200).json({
      _id: user._id, // Frontend'in beklemesi için _id olarak gönderelim
      message: 'Giriş başarılı!',
      userId: user._id,
      username: user.username,
      token: token
    });

  } catch (error) {
    console.error('Giriş sırasında hata:', error);
    res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
});
