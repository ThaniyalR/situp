/**
 * Party Games Hub - Main Orchestration Script
 */
class PartyApp {
  constructor() {
    this.currentRoom = null;
    this.playerId = localStorage.getItem('party_player_id') || null;
    this.playerName = localStorage.getItem('party_player_name') || 'Player ' + Math.floor(Math.random() * 90 + 10);
    this.pollTimer = null;
    this.activeView = 'hub';
    this.isPassAndPlay = false;

    window.appState = this;
  }

  init() {
    // Check URL parameters for direct room join (e.g. ?room=ABCD)
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      document.getElementById('join-code-input').value = roomParam.toUpperCase();
      this.openModal('join-room-modal');
    }

    // Restore name in inputs
    const nameInput = document.getElementById('player-name-input');
    if (nameInput) nameInput.value = this.playerName;

    // Check if we have an active room saved in session
    const savedRoom = sessionStorage.getItem('party_active_room');
    if (savedRoom && this.playerId) {
      this.syncRoomState(savedRoom);
    }

    // Set up auto-poll fallback
    this.startPolling();
  }

  // ================= VIEW NAVIGATION =================
  switchView(viewName) {
    this.activeView = viewName;
    const views = ['hub', 'animal', 'imposter', 'movie', 'song', 'party'];
    views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.classList.toggle('active', v === viewName);
    });

    // Update Room / Back button state
    const backBtn = document.getElementById('header-back-btn');
    if (backBtn) {
      backBtn.style.display = viewName === 'hub' ? 'none' : 'flex';
    }

    // Trigger sub-renderer
    if (this.currentRoom) {
      this.renderCurrentGame();
    }
  }

  goBackToHub() {
    window.soundEngine.cardClick();
    this.switchView('hub');
  }

  // ================= ROOM MANAGEMENT =================
  async createRoom(gameType = 'hub') {
    window.soundEngine.cardClick();
    const nameInput = document.getElementById('host-name-input');
    if (nameInput && nameInput.value.trim()) {
      this.playerName = nameInput.value.trim();
      localStorage.setItem('party_player_name', this.playerName);
    }

    try {
      const res = await fetch('/api/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host_name: this.playerName, game_type: gameType })
      });
      const data = await res.json();
      if (data.success) {
        this.playerId = data.player_id;
        this.currentRoom = data.room;
        this.isPassAndPlay = false;
        localStorage.setItem('party_player_id', this.playerId);
        sessionStorage.setItem('party_active_room', data.room_code);

        this.closeModal('create-room-modal');
        this.updateHeaderBadge();
        this.selectGame(gameType);
      }
    } catch (e) {
      alert('Could not create room: ' + e.message);
    }
  }

  async joinRoom() {
    window.soundEngine.cardClick();
    const codeInput = document.getElementById('join-code-input');
    const nameInput = document.getElementById('join-name-input');

    const code = (codeInput?.value || '').trim().toUpperCase();
    const name = (nameInput?.value || '').trim() || this.playerName;

    if (!code) {
      alert('Please enter a 4-letter room code!');
      return;
    }

    this.playerName = name;
    localStorage.setItem('party_player_name', this.playerName);

    try {
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: code, player_name: name })
      });
      const data = await res.json();
      if (data.success) {
        this.playerId = data.player_id;
        this.currentRoom = data.room;
        this.isPassAndPlay = false;
        localStorage.setItem('party_player_id', this.playerId);
        sessionStorage.setItem('party_active_room', data.room_code);

        this.closeModal('join-room-modal');
        this.updateHeaderBadge();
        this.selectGame(data.room.game_type);
      } else {
        alert(data.error || 'Failed to join room');
      }
    } catch (e) {
      alert('Network error connecting to room: ' + e.message);
    }
  }

  async selectGame(gameType) {
    window.soundEngine.cardClick();
    // If we don't have a room yet, create one automatically
    if (!this.currentRoom && !this.isPassAndPlay) {
      await this.createRoom(gameType);
      return;
    }

    if (this.currentRoom) {
      await this.sendAction('switch_game', { game_type: gameType });
    }

    this.routeToGameView(gameType);
  }

  routeToGameView(gameType) {
    switch (gameType) {
      case 'animal_matching':
        this.switchView('animal');
        break;
      case 'imposter':
        this.switchView('imposter');
        break;
      case 'guess_movie':
        this.switchView('movie');
        break;
      case 'guess_song':
        this.switchView('song');
        break;
      case 'party_extras':
        this.switchView('party');
        break;
      default:
        this.switchView('hub');
    }
  }

  async sendAction(action, payload = {}, subGame = null) {
    if (!this.currentRoom) return;

    try {
      const res = await fetch('/api/room/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: this.currentRoom.code,
          player_id: this.playerId,
          action: action,
          payload: { ...payload, sub_game: subGame }
        })
      });
      const data = await res.json();
      if (data.success) {
        this.currentRoom = data.room;
        this.renderCurrentGame();
      } else {
        if (data.error) alert(data.error);
      }
    } catch (e) {
      console.warn('Action failed', e);
    }
  }

  // Fast-polling loop for seamless real-time sync across devices
  startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(async () => {
      const savedCode = sessionStorage.getItem('party_active_room');
      if (savedCode && !this.isPassAndPlay) {
        await this.syncRoomState(savedCode);
      }
    }, 700);
  }

  async syncRoomState(roomCode) {
    try {
      const res = await fetch(`/api/room/state/${roomCode}?player_id=${this.playerId || ''}`);
      const data = await res.json();
      if (data.success) {
        const prevVersion = this.currentRoom?.version;
        this.currentRoom = data.room;
        this.updateHeaderBadge();

        // If game switched or round updated
        if (prevVersion !== data.room.version) {
          if (this.activeView === 'hub' && data.room.game_type !== 'hub') {
            this.routeToGameView(data.room.game_type);
          }
          this.renderCurrentGame();
        }
      }
    } catch (e) {
      // Offline or idle
    }
  }

  renderCurrentGame() {
    if (!this.currentRoom) return;
    const gType = this.currentRoom.game_type;

    if (gType === 'animal_matching') {
      window.animalGame.render(this.currentRoom, this.playerId);
    } else if (gType === 'imposter') {
      window.imposterGame.render(this.currentRoom, this.playerId);
    } else if (gType === 'guess_movie') {
      window.movieGame.render(this.currentRoom, this.playerId);
    } else if (gType === 'guess_song') {
      window.songGame.render(this.currentRoom, this.playerId);
    } else if (gType === 'party_extras') {
      window.partyExtras.render(this.currentRoom, this.playerId);
    }
  }

  // ================= SOLO / PASS & PLAY MODE =================
  startPassAndPlay(gameType) {
    window.soundEngine.cardClick();
    this.isPassAndPlay = true;
    this.currentRoom = null;
    sessionStorage.removeItem('party_active_room');
    this.updateHeaderBadge();

    this.routeToGameView(gameType);

    if (gameType === 'animal_matching') {
      window.animalGame.startLocalGame();
    } else if (gameType === 'guess_movie') {
      window.movieGame.render({
        game_state: { status: 'playing', current_index: 0, question_order: [0, 1, 2, 3, 4], revealed_hints: 0 },
        players: [{ id: 'p1', name: 'You', avatar: '🦁', score: 0 }]
      }, 'p1');
    } else if (gameType === 'guess_song') {
      window.songGame.render({
        game_state: { status: 'playing', current_index: 0, question_order: [0, 1, 2, 3, 4], revealed_clues: 0 },
        players: [{ id: 'p1', name: 'You', avatar: '🦁', score: 0 }]
      }, 'p1');
    } else if (gameType === 'party_extras') {
      window.partyExtras.render({
        game_state: { sub_game: 'truth_dare', bottle_angle: 0 },
        players: [{ id: 'p1', name: 'You', avatar: '🦁' }]
      }, 'p1');
    }
  }

  // ================= UI HELPERS & MODALS =================
  updateHeaderBadge() {
    const badge = document.getElementById('room-badge-container');
    if (!badge) return;

    if (this.currentRoom) {
      badge.innerHTML = `
        <div class="room-badge" onclick="window.partyApp.openShareModal()">
          <span>ROOM: <strong>${this.currentRoom.code}</strong></span>
          <span style="font-size:0.75rem; background: rgba(255,255,255,0.2); padding:2px 6px; border-radius:10px;">
            ${this.currentRoom.players.length} 👤
          </span>
        </div>
      `;
    } else if (this.isPassAndPlay) {
      badge.innerHTML = `
        <div class="room-badge" style="background: rgba(16,185,129,0.2); border-color: rgba(16,185,129,0.4); color: #34d399;">
          <span>Single Device Mode</span>
        </div>
      `;
    } else {
      badge.innerHTML = `
        <div class="room-badge" onclick="window.partyApp.openModal('join-room-modal')">
          <span>Join Room</span>
        </div>
      `;
    }
  }

  openShareModal() {
    if (!this.currentRoom) return;
    const modalCode = document.getElementById('share-modal-code');
    const wifiIpText = document.getElementById('share-wifi-ip');
    if (modalCode) modalCode.textContent = this.currentRoom.code;
    if (wifiIpText) {
      wifiIpText.textContent = `http://${window.location.hostname}:5000`;
    }
    this.openModal('share-room-modal');
  }

  copyRoomCode() {
    if (!this.currentRoom) return;
    navigator.clipboard.writeText(this.currentRoom.code);
    window.soundEngine.cardClick();
    alert(`Room code ${this.currentRoom.code} copied! Share it with your friends.`);
  }

  copyRoomLink() {
    if (!this.currentRoom) return;
    const link = `${window.location.origin}/?room=${this.currentRoom.code}`;
    navigator.clipboard.writeText(link);
    window.soundEngine.cardClick();
    alert('Invite link copied! Friends can tap to jump right into the game.');
  }

  openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.add('open');
  }

  closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('open');
  }
}

// Global bootstrap
window.partyApp = new PartyApp();
document.addEventListener('DOMContentLoaded', () => {
  window.partyApp.init();
});

