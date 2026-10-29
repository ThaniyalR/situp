/**
 * 🕵️ The Imposter (Social Deduction Party Game)
 */
class ImposterGame {
  constructor() {
    this.revealedLocally = false;
  }

  render(roomData, myPlayerId) {
    const gs = roomData.game_state;
    const players = roomData.players || [];
    const myPlayer = players.find(p => p.id === myPlayerId) || players[0];

    const container = document.getElementById('imposter-container');
    if (!container) return;

    if (gs.status === 'lobby') {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 3.5rem; margin-bottom: 12px;">🕵️‍♂️</div>
          <h2>The Imposter</h2>
          <p style="color: #94a3b8; max-width: 500px; margin: 10px auto 24px;">
            One player is secretly given a different word (or no word). Give clues, detect who is bluffing, and vote them out!
          </p>
          <div style="margin-bottom: 20px; color: #cbd5e1;">
            Players in room: <strong>${players.length}</strong> (Minimum 3 needed)
          </div>
          ${myPlayer?.is_host ? `
            <button class="btn-primary" onclick="window.imposterGame.startGame()" ${players.length < 3 ? 'disabled style="opacity:0.6"' : ''}>
              🎭 Start Secret Assignment
            </button>
          ` : `
            <p style="color: #c4b5fd;">Waiting for host to start the game...</p>
          `}
        </div>
      `;
      return;
    }

    if (gs.status === 'role_reveal') {
      const myRole = (gs.roles && gs.roles[myPlayerId]) || 'citizen';
      const myWord = (gs.words && gs.words[myPlayerId]) || 'Secret';

      container.innerHTML = `
        <div class="imposter-card-reveal">
          <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 14px;">
            🔒 Confidential Role Card (Keep away from other eyes!)
          </p>
          <div class="peek-card ${this.revealedLocally ? 'revealed' : ''}" id="peek-card" onclick="window.imposterGame.togglePeek()">
            ${this.revealedLocally ? `
              <div class="secret-word-display">${myWord}</div>
              <div class="role-badge ${myRole}">${myRole === 'imposter' ? '😈 THE IMPOSTER' : '🛡️ CITIZEN'}</div>
              <p style="font-size: 0.75rem; color: #94a3b8; margin-top: 10px;">Tap again to hide</p>
            ` : `
              <div style="font-size: 2.2rem; margin-bottom: 6px;">👀</div>
              <p style="font-weight: 700; color: #cbd5e1;">TAP TO REVEAL YOUR SECRET WORD</p>
            `}
          </div>
          <div style="margin-top: 24px;">
            ${myPlayer?.is_host ? `
              <button class="btn-primary" onclick="window.imposterGame.proceedToClues()">
                🗣️ Start Clue Phase ➔
              </button>
            ` : `
              <p style="color: #94a3b8; font-size: 0.85rem;">Waiting for everyone to check their word...</p>
            `}
          </div>
        </div>
      `;
      return;
    }

    if (gs.status === 'clue_phase') {
      const clues = gs.clues || [];
      container.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 16px;">
            <h3>🗣️ Clue Phase</h3>
            <p style="color: #94a3b8; font-size: 0.9rem;">
              Take turns saying or typing a 1-word clue that connects to your secret word.
            </p>
          </div>

          <div class="clue-feed">
            ${clues.length === 0 ? '<p style="color: #64748b; text-align: center; margin: auto;">No clues submitted yet. Go ahead!</p>' : ''}
            ${clues.map(c => `
              <div class="clue-item">
                <span style="font-size: 1.2rem;">${c.avatar || '👤'}</span>
                <span class="clue-player">${this.escapeHtml(c.player_name)}:</span>
                <span class="clue-text">"${this.escapeHtml(c.clue)}"</span>
              </div>
            `).join('')}
          </div>

          <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <input type="text" id="clue-input" placeholder="Type your 1-word clue..." 
                   style="flex: 1; padding: 12px 16px; border-radius: 20px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-glass); color: white; outline: none;"
                   onkeydown="if(event.key==='Enter') window.imposterGame.submitClue()">
            <button class="btn-primary" onclick="window.imposterGame.submitClue()">Send</button>
          </div>

          <div style="text-align: center;">
            ${myPlayer?.is_host ? `
              <button class="btn-secondary" onclick="window.imposterGame.startVoting()" style="background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.5);">
                🗳️ Move to Voting Phase ➔
              </button>
            ` : ''}
          </div>
        </div>
      `;
      return;
    }

    if (gs.status === 'voting') {
      const votes = gs.votes || {};
      const myVote = votes[myPlayerId];
      container.innerHTML = `
        <div style="max-width: 650px; margin: 0 auto; text-align: center;">
          <h3>🗳️ Vote Out The Imposter!</h3>
          <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 16px;">
            Tap on the player you suspect the most. Who sounded suspicious?
          </p>

          <div class="voting-grid">
            ${players.map(p => `
              <button class="vote-target-btn ${myVote === p.id ? 'voted' : ''}" 
                      onclick="window.imposterGame.castVote('${p.id}')">
                <span style="font-size: 2.2rem;">${p.avatar}</span>
                <span style="font-weight: 700;">${this.escapeHtml(p.name)}</span>
                <span style="font-size: 0.75rem; color: #94a3b8;">${p.id === myPlayerId ? '(You)' : 'Suspect'}</span>
              </button>
            `).join('')}
          </div>

          <p style="color: #cbd5e1; font-size: 0.85rem;">
            Votes in: <strong>${Object.keys(votes).length}</strong> / ${players.length}
          </p>
        </div>
      `;
      return;
    }

    if (gs.status === 'revealed') {
      const votedOut = players.find(p => p.id === gs.voted_out_id);
      const imposter = players.find(p => p.id === gs.imposter_id);
      const isImposterCaught = !gs.imposter_won;

      container.innerHTML = `
        <div style="max-width: 550px; margin: 20px auto; text-align: center; background: rgba(15, 23, 42, 0.8); border: 1px solid var(--border-glass); border-radius: var(--radius-lg); padding: 30px 20px;">
          <div style="font-size: 3.5rem; margin-bottom: 10px;">
            ${isImposterCaught ? '🎉🛡️' : '😈🔥'}
          </div>
          <h2 style="color: ${isImposterCaught ? '#34d399' : '#f87171'};">
            ${isImposterCaught ? 'CITIZENS WIN!' : 'THE IMPOSTER WON!'}
          </h2>
          <p style="color: #cbd5e1; margin: 12px 0;">
            The group voted out: <strong>${votedOut ? votedOut.name : 'Unknown'}</strong> (${votedOut?.avatar})
          </p>
          <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: var(--radius-md); margin: 20px 0;">
            <p style="font-size: 0.9rem; color: #94a3b8; margin-bottom: 4px;">Actual Imposter:</p>
            <p style="font-size: 1.2rem; font-weight: 800; color: #f87171;">
              ${imposter ? imposter.name : 'Unknown'} (${imposter?.avatar})
            </p>
            <div style="display: flex; justify-content: space-around; margin-top: 12px; font-size: 0.95rem;">
              <div>Citizen Word: <strong style="color: #38bdf8;">${gs.secret_pair?.citizen}</strong></div>
              <div>Imposter Word: <strong style="color: #ec4899;">${gs.secret_pair?.imposter}</strong></div>
            </div>
          </div>

          ${myPlayer?.is_host ? `
            <button class="btn-primary" onclick="window.imposterGame.startGame()">
              🔄 Play Another Round
            </button>
          ` : '<p style="color:#94a3b8">Waiting for host to start new round...</p>'}
        </div>
      `;

      if (!this.celebratedReveal) {
        this.celebratedReveal = true;
        if (isImposterCaught) {
          window.soundEngine.fanfare();
          window.confetti.trigger(100);
        } else {
          window.soundEngine.buzzer();
        }
      }
    }
  }

  togglePeek() {
    this.revealedLocally = !this.revealedLocally;
    window.soundEngine.cardClick();
    const myPlayerId = window.partyApp.playerId;
    const roomData = window.partyApp.currentRoom;
    if (roomData) this.render(roomData, myPlayerId);
  }

  async startGame() {
    this.revealedLocally = false;
    this.celebratedReveal = false;
    await window.partyApp.sendAction('start_imposter_game');
  }

  async proceedToClues() {
    await window.partyApp.sendAction('proceed_to_clues');
  }

  async submitClue() {
    const input = document.getElementById('clue-input');
    const clue = (input?.value || '').trim();
    if (!clue) return;
    input.value = '';
    window.soundEngine.cardClick();
    await window.partyApp.sendAction('submit_clue', { clue });
  }

  async startVoting() {
    await window.partyApp.sendAction('start_voting');
  }

  async castVote(targetId) {
    window.soundEngine.cardClick();
    await window.partyApp.sendAction('cast_vote', { target_id: targetId });
  }

  escapeHtml(str) {
    return (str || '').replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
  }
}

window.imposterGame = new ImposterGame();

