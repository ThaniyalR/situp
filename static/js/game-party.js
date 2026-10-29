/**
 * 🔥 Party Extras Engine:
 * - Spin the Bottle & Truth or Dare
 * - Most Likely To
 * - 5-Second Rule Countdown
 */
class PartyExtrasGame {
  constructor() {
    this.timerInterval = null;
    this.timerRemaining = 5;
  }

  render(roomData, myPlayerId) {
    const gs = roomData.game_state;
    const players = roomData.players || [];
    const myPlayer = players.find(p => p.id === myPlayerId) || players[0];
    const subGame = gs.sub_game || 'truth_dare';

    const container = document.getElementById('party-extras-container');
    if (!container) return;

    container.innerHTML = `
      <div style="max-width: 650px; margin: 0 auto;">
        <!-- Sub-tabs -->
        <div class="sub-tabs">
          <button class="sub-tab-btn ${subGame === 'truth_dare' ? 'active' : ''}" 
                  onclick="window.partyExtras.switchSub('truth_dare')">
            🍾 Truth or Dare
          </button>
          <button class="sub-tab-btn ${subGame === 'most_likely' ? 'active' : ''}" 
                  onclick="window.partyExtras.switchSub('most_likely')">
            👀 Most Likely To
          </button>
          <button class="sub-tab-btn ${subGame === 'five_second' ? 'active' : ''}" 
                  onclick="window.partyExtras.switchSub('five_second')">
            ⚡ 5-Second Rule
          </button>
        </div>

        ${subGame === 'truth_dare' ? this.renderTruthOrDare(gs, players, myPlayer) : ''}
        ${subGame === 'most_likely' ? this.renderMostLikely(gs, players, myPlayer) : ''}
        ${subGame === 'five_second' ? this.renderFiveSecond(gs, players, myPlayer) : ''}
      </div>
    `;
  }

  renderTruthOrDare(gs, players, myPlayer) {
    const selectedPlayer = players.find(p => p.id === gs.selected_player_id);
    const bottleAngle = gs.bottle_angle || 0;
    const currentItem = gs.current_item;

    return `
      <div class="riddle-display-card" style="padding: 24px 20px;">
        <h3 style="margin-bottom: 6px;">🍾 Spin The Bottle & Truth or Dare</h3>
        <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 20px;">
          Spin the bottle to choose who plays next, then pick Truth or Dare!
        </p>

        <div class="bottle-spin-area">
          <svg class="bottle-img" id="bottle-svg" viewBox="0 0 100 280" 
               style="transform: rotate(${bottleAngle}deg);"
               onclick="window.partyExtras.spinBottle()">
            <!-- Glass bottle graphic -->
            <defs>
              <linearGradient id="bottleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#10b981"/>
                <stop offset="50%" stop-color="#059669"/>
                <stop offset="100%" stop-color="#047857"/>
              </linearGradient>
            </defs>
            <rect x="42" y="10" width="16" height="40" rx="3" fill="#cbd5e1"/>
            <path d="M42,50 Q30,100 20,130 L20,250 Q20,270 50,270 Q80,270 80,250 L80,130 Q70,100 58,50 Z" fill="url(#bottleGrad)" stroke="#34d399" stroke-width="4"/>
            <rect x="25" y="150" width="50" height="45" rx="6" fill="#f8fafc" opacity="0.9"/>
            <text x="50" y="178" font-size="20" text-anchor="middle">🍾</text>
          </svg>

          <button class="btn-primary" style="margin-top: 18px;" onclick="window.partyExtras.spinBottle()">
            🎲 Spin The Bottle
          </button>
        </div>

        ${selectedPlayer ? `
          <div style="margin: 16px 0; font-size: 1.1rem; color: #38bdf8; font-weight: 700;">
            👉 The Bottle Pointed At: ${selectedPlayer.avatar} ${this.escapeHtml(selectedPlayer.name)}!
          </div>
        ` : ''}

        <div style="display: flex; justify-content: center; gap: 12px; margin-top: 14px;">
          <button class="btn-secondary" style="border-color: #38bdf8; color: #38bdf8;" onclick="window.partyExtras.drawTruthDare('truth')">
            😇 Draw TRUTH
          </button>
          <button class="btn-secondary" style="border-color: #ec4899; color: #ec4899;" onclick="window.partyExtras.drawTruthDare('dare')">
            😈 Draw DARE
          </button>
        </div>

        ${currentItem ? `
          <div class="answer-reveal-zone" style="margin-top: 20px; background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15);">
            <div style="font-size: 0.85rem; font-weight: 800; text-transform: uppercase; color: ${gs.category === 'truth' ? '#38bdf8' : '#ec4899'};">
              ${gs.category.toUpperCase()} CARD:
            </div>
            <div style="font-size: 1.25rem; font-weight: 700; color: #fff; margin-top: 8px;">
              "${currentItem}"
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderMostLikely(gs, players, myPlayer) {
    const currentItem = gs.current_item || 'Most likely to accidentally start a TikTok trend?';

    return `
      <div class="riddle-display-card">
        <h3>👀 Most Likely To...</h3>
        <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 24px;">
          Read the card out loud. On count of 3, everyone points at the guilty person!
        </p>

        <div style="font-size: 1.8rem; font-weight: 800; color: #f59e0b; margin: 30px 10px; line-height: 1.4;">
          "${currentItem}"
        </div>

        <button class="btn-primary" onclick="window.partyExtras.drawMostLikely()">
          🎲 Draw Next Question
        </button>
      </div>
    `;
  }

  renderFiveSecond(gs, players, myPlayer) {
    const currentItem = gs.current_item || 'Name 3 animals with spots or stripes!';

    return `
      <div class="riddle-display-card">
        <h3>⚡ 5-Second Rule!</h3>
        <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 20px;">
          You have only 5 seconds to name 3 items! Think lightning fast!
        </p>

        <div style="font-size: 1.5rem; font-weight: 800; color: #38bdf8; margin: 16px 0;">
          "${currentItem}"
        </div>

        <div class="five-second-timer" id="five-sec-display">
          ${this.timerRemaining}
        </div>

        <div style="display: flex; justify-content: center; gap: 12px; margin-top: 14px;">
          <button class="btn-primary" onclick="window.partyExtras.startFiveSecTimer()">
            ⏱️ Start 5s Countdown!
          </button>
          <button class="btn-secondary" onclick="window.partyExtras.drawFiveSecond()">
            🎲 Next Topic
          </button>
        </div>
      </div>
    `;
  }

  async switchSub(subName) {
    window.soundEngine.cardClick();
    await window.partyApp.sendAction('draw_truth_dare', {}, subName);
  }

  async spinBottle() {
    window.soundEngine.cardPass();
    await window.partyApp.sendAction('spin_bottle');
  }

  async drawTruthDare(mode) {
    window.soundEngine.cardClick();
    await window.partyApp.sendAction('draw_truth_dare', { mode });
  }

  async drawMostLikely() {
    window.soundEngine.cardClick();
    await window.partyApp.sendAction('draw_most_likely');
  }

  async drawFiveSecond() {
    window.soundEngine.cardClick();
    this.timerRemaining = 5;
    if (this.timerInterval) clearInterval(this.timerInterval);
    await window.partyApp.sendAction('draw_five_second');
  }

  startFiveSecTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerRemaining = 5;
    const display = document.getElementById('five-sec-display');
    if (display) display.textContent = this.timerRemaining;

    this.timerInterval = setInterval(() => {
      this.timerRemaining -= 1;
      if (display) display.textContent = this.timerRemaining;
      
      if (this.timerRemaining > 0) {
        window.soundEngine.playTone(600, 0.05, 'triangle', 0.15); // tick
      } else {
        clearInterval(this.timerInterval);
        window.soundEngine.buzzer(); // buzzer!
      }
    }, 1000);
  }

  escapeHtml(str) {
    return (str || '').replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
  }
}

window.partyExtras = new PartyExtrasGame();

