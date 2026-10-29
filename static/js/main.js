/**
 * Party Games Hub - Main Orchestration Script
 * Features:
 * - Instant responsive button actions in BOTH Local & Multiplayer modes
 * - Automatic route and render with zero latency
 * - Room creation, fast sync, and graceful offline fallback
 */
class PartyApp {
  constructor() {
    this.currentRoom = null;
    this.playerId = localStorage.getItem('party_player_id') || 'p_' + Math.random().toString(36).substr(2, 6);
    this.playerName = localStorage.getItem('party_player_name') || 'Player ' + Math.floor(Math.random() * 90 + 10);
    this.pollTimer = null;
    this.activeView = 'hub';
    this.isPassAndPlay = false;

    localStorage.setItem('party_player_id', this.playerId);
    localStorage.setItem('party_player_name', this.playerName);

    window.appState = this;
  }

  init() {
    // Check URL parameters for direct room join (e.g. ?room=ABCD)
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      const joinInput = document.getElementById('join-code-input');
      if (joinInput) joinInput.value = roomParam.toUpperCase();
      this.openModal('join-room-modal');
    }

    // Restore name in inputs
    const nameInput = document.getElementById('player-name-input');
    if (nameInput) nameInput.value = this.playerName;
    const hostInput = document.getElementById('host-name-input');
    if (hostInput) hostInput.value = this.playerName;
    const joinNameInput = document.getElementById('join-name-input');
    if (joinNameInput) joinNameInput.value = this.playerName;

    // Check if we have an active room saved in session
    const savedRoom = sessionStorage.getItem('party_active_room');
    if (savedRoom && this.playerId) {
      this.syncRoomState(savedRoom);
    }

    this.updateHeaderBadge();

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

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // ALWAYS render current game state immediately
    this.renderCurrentGame();
  }

  goBackToHub() {
    window.soundEngine.cardClick();
    this.switchView('hub');
  }

  getGameTypeFromView(viewName) {
    switch (viewName) {
      case 'animal': return 'animal_matching';
      case 'imposter': return 'imposter';
      case 'movie': return 'guess_movie';
      case 'song': return 'guess_song';
      case 'party': return 'party_extras';
      default: return 'hub';
    }
  }

  getViewFromGameType(gameType) {
    switch (gameType) {
      case 'animal_matching': return 'animal';
      case 'imposter': return 'imposter';
      case 'guess_movie': return 'movie';
      case 'guess_song': return 'song';
      case 'party_extras': return 'party';
      default: return 'hub';
    }
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

        if (gameType && gameType !== 'hub') {
          this.routeToGameView(gameType);
        } else {
          this.openShareModal();
        }
      }
    } catch (e) {
      console.warn('Could not create room online, continuing in instant mode', e);
      if (gameType && gameType !== 'hub') {
        this.routeToGameView(gameType);
      }
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
        this.routeToGameView(data.room.game_type);
      } else {
        alert(data.error || 'Failed to join room');
      }
    } catch (e) {
      alert('Network error connecting to room: ' + e.message);
    }
  }

  async selectGame(gameType) {
    window.soundEngine.cardClick();
    
    // Switch view immediately with zero lag
    this.routeToGameView(gameType);

    // If connected to a room, inform room
    if (this.currentRoom) {
      await this.sendAction('switch_game', { game_type: gameType });
    }
  }

  routeToGameView(gameType) {
    const viewName = this.getViewFromGameType(gameType);
    this.switchView(viewName);
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
        if (data.error && data.error.includes('Room not found')) {
          // Room session expired on serverless container; clear session gracefully
          this.currentRoom = null;
          sessionStorage.removeItem('party_active_room');
          this.updateHeaderBadge();
          this.renderCurrentGame();
        } else if (data.error) {
          console.warn('Action error:', data.error);
        }
      }
    } catch (e) {
      console.warn('Action network failure', e);
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
    }, 800);
  }

  async syncRoomState(roomCode) {
    try {
      const res = await fetch(`/api/room/state/${roomCode}?player_id=${this.playerId || ''}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        const prevVersion = this.currentRoom?.version;
        this.currentRoom = data.room;
        this.updateHeaderBadge();

        // If game switched or round updated
        if (prevVersion !== data.room.version) {
          if (this.activeView === 'hub' && data.room.game_type !== 'hub') {
            this.routeToGameView(data.room.game_type);
          } else {
            this.renderCurrentGame();
          }
        }
      }
    } catch (e) {
      // Offline or network idle
    }
  }

  renderCurrentGame() {
    const gType = this.currentRoom?.game_type || this.getGameTypeFromView(this.activeView);

    if (gType === 'animal_matching' || this.activeView === 'animal') {
      window.animalGame?.render(this.currentRoom, this.playerId);
    } else if (gType === 'imposter' || this.activeView === 'imposter') {
      window.imposterGame?.render(this.currentRoom, this.playerId);
    } else if (gType === 'guess_movie' || this.activeView === 'movie') {
      window.movieGame?.render(this.currentRoom, this.playerId);
    } else if (gType === 'guess_song' || this.activeView === 'song') {
      window.songGame?.render(this.currentRoom, this.playerId);
    } else if (gType === 'party_extras' || this.activeView === 'party') {
      window.partyExtras?.render(this.currentRoom, this.playerId);
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
  }

  // ================= UI HELPERS & MODALS =================
  updateHeaderBadge() {
    const badge = document.getElementById('room-badge-container');
    if (!badge) return;

    if (this.currentRoom) {
      badge.innerHTML = `
        <div class="room-badge" onclick="window.partyApp.openShareModal()" title="Share Room Code">
          <span>ROOM: <strong>${this.currentRoom.code}</strong></span>
          <span style="font-size:0.75rem; background: rgba(124,58,237,0.15); padding:2px 8px; border-radius:10px; margin-left: 4px;">
            ${this.currentRoom.players ? this.currentRoom.players.length : 1} 👤
          </span>
        </div>
      `;
    } else if (this.isPassAndPlay) {
      badge.innerHTML = `
        <div class="room-badge" style="background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.3); color: #059669;">
          <span>🤖 Solo / Bots</span>
        </div>
      `;
    } else {
      badge.innerHTML = `
        <div class="room-badge" onclick="window.partyApp.openModal('create-room-modal')" title="Host Online Room">
          <span>✨ Host Room</span>
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
      wifiIpText.textContent = window.location.origin;
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
