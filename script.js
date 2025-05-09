import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import { getDatabase, ref, set, update, push, onValue, get } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js';const firebaseConfig = {
  apiKey: "Apikey",
  authDomain: "chess-c3a28.firebaseapp.com",
  databaseURL: "https://chess-c3a28-default-rtdb.firebaseio.com",
  projectId: "chess-c3a28",
  storageBucket: "chess-c3a28.firebasestorage.app",
  messagingSenderId: "556982192218",
  appId: "1:556982192218:web:43bf70b1d7814dc6c63063",
  measurementId: "G-2C3LNVE62W"
};const app = initializeApp(firebaseConfig);
const db = getDatabase(app);// Chess.js ve Chessboard.js kontrolü
if (typeof Chess === 'undefined') {
  console.error('Chess.js kütüphanesi yüklenmedi!');
  throw new Error('Chess.js yüklenmedi, script.js çalıştırılamaz.');
}
if (typeof Chessboard === 'undefined') {
  console.error('Chessboard.js kütüphanesi yüklenmedi!');
  throw new Error('Chessboard.js yüklenmedi, script.js çalıştırılamaz.');
}// Satranç oyunu ve tahtası
const game = new Chess();
let board = null;// Taş bırakıldığında çalışacak fonksiyon
function onDrop(source, target, piece, newPos, oldPos, orientation) {
  const move = game.move({
    from: source,
    to: target,
    promotion: 'q' // Varsayılan olarak piyon terfisi için 'q' (vezir)
  });  if (move === null) {
    return 'snapback';
  }  sendMove(source, target);
}// Chessboard yapılandırması
const config = {
  position: 'start',
  draggable: true,
  pieceTheme: '/img/chesspieces/wikipedia/{piece}.png',
  onDrop: onDrop
};// Tahtayı başlat
board = Chessboard('board', config);// WebRTC bağlantısı ve Firebase mantığı
const roomIdInput = document.getElementById('roomInput');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const status = document.getElementById('status');let peerConnection = null;
let roomId = null;// WebRTC yapılandırması
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};// Oda oluştur
createBtn.addEventListener('click', async () => {
  peerConnection = new RTCPeerConnection(configuration);
  roomId = Math.random().toString(36).substring(2, 15);
  status.textContent = Oda ID: ${roomId};  const dataChannel = peerConnection.createDataChannel('chess');
  dataChannel.onmessage = (event) => {
    const { source, target } = JSON.parse(event.data);
    game.move({ from: source, to: target, promotion: 'q' });
    board.position(game.fen());
  };  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      push(ref(db, rooms/${roomId}/callerCandidates), event.candidate.toJSON());
    }
  };  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  await set(ref(db, rooms/${roomId}), { offer });
});// Odaya katıl
joinBtn.addEventListener('click', async () => {
  roomId = roomIdInput.value;
  peerConnection = new RTCPeerConnection(configuration);  peerConnection.ondatachannel = (event) => {
    const dataChannel = event.channel;
    dataChannel.onmessage = (event) => {
      const { source, target } = JSON.parse(event.data);
      game.move({ from: source, to: target, promotion: 'q' });
      board.position(game.fen());
    };
  };  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      push(ref(db, rooms/${roomId}/calleeCandidates), event.candidate.toJSON());
    }
  };  const roomRef = ref(db, rooms/${roomId});
  const roomSnapshot = await get(roomRef);
  const roomData = roomSnapshot.val();  await peerConnection.setRemoteDescription(new RTCSessionDescription(roomData.offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  await update(ref(db, rooms/${roomId}), { answer });  status.textContent = 'Bağlantı kuruldu!';
});// Hamleyi diğer oyuncuya gönder
function sendMove(source, target) {
  const dataChannel = peerConnection.getDataChannels()[0];
  if (dataChannel && dataChannel.readyState === 'open') {
    dataChannel.send(JSON.stringify({ source, target }));
  }
}

