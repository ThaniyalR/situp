/**
 * 🕵️ The Imposter (Social Deduction Party Game)
 * Works 100% in BOTH Solo/Bots mode AND Room Multiplayer!
 */
class ImposterGame {
  constructor() {
    this.revealedLocally = false;
    this.localState = null;
    this.celebratedReveal = false;

    this.defaultWordPairs = [
      { citizen: "Coffee ☕", imposter: "Tea 🍵" },
      { citizen: "Pizza 🍕", imposter: "Burger 🍔" },
      { citizen: "Lion 🦁", imposter: "Tiger 🐯" },
      { citizen: "Beach 🏖️", imposter: "Swimming Pool 🏊" },
      { citizen: "Movie Theater 🍿", imposter: "Living Room 🛋️" },
      { citizen: "Guitar 🎸", imposter: "Violin 🎻" },
      { citizen: "Apple 🍎", imposter: "Orange 🍊" },
      { citizen: "Doctor 🩺", imposter: "Nurse 🩹" }
    ];
  }

  initLocalState() {
    const pair = this.defaultWordPairs[Math.floor(Math.random() * this.defaultWordPairs.length)];
    const imposterIndex = Math.floor(Math.random() * 3); // 0, 1, or 2
    const pIds = ['p1', 'p2', 'p3'];
    const imposterId = pIds[imposterIndex];

    const roles = {};
    const words = {};
    pIds.forEach(id => {
      if (id === imposterId) {
        roles[id] = 'imposter';
        words[id] = pair.imposter;
      } else {
        roles[id] = 'citizen';
        words[id] = pair.citizen;
      }
    });

    this.localState = {
      players: [
        { id: 'p1', name: 'You', avatar: '🦁', is_host: true, is_bot: false, score: 0 },
        { id: 'p2', name: 'Alex', avatar: '🐯', is_host: false, is_bot: true, score: 0 },
        { id: 'p3', name: 'Sam', avatar: '🐘', is_host: false, is_bot: true, score: 0 }
      ],
      game_state: {
        status: 'role_reveal', // starts directly in role reveal for immediate fun
        round: 1,
        secret_pair: pair,
        imposter_id: imposterId,
        roles: roles,
        words: words,
        clues: [],
        votes: {},
        voted_out_id: null,
        imposter_won: null
      }
    };
  }

  getActiveData(roomData, myPlayerId) {
    if (roomData && window.partyApp?.currentRoom && !window.appState?.isPassAndPlay) {
      return {
        data: roomData,
        playerId: myPlayerId || window.partyApp.playerId || roomData.players[0]?.id
      };
    }
    if (!this.localState) {
      this.initLocalState();
    }
    return {
      data: this.localState,
      playerId: 'p1'
    };
  }

  render(roomData, myPlayerId) {
    const { data: activeData, playerId: activePlayerId } = this.getActiveData(roomData, myPlayerId);

    const gs = activeData.game_state;
    const players = activeData.players || [];
    const myPlayer = players.find(p => p.id === activePlayerId) || players[0];

    const container = document.getElementById('imposter-container');
    if (!container) return;

    if (gs.status === 'lobby') {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 3.5rem; margin-bottom: 12px;">🕵️‍♂️🤫</div>
          <h2>The Imposter</h2>
          <p style="color: #64748b; max-width: 500px; margin: 10px auto 24px;">
            One player is secretly given a different word. Give subtle clues, detect who is bluffing, and vote them out!
          </p>
          <div style="margin-bottom: 20px; color: #0f172a;">
            Players ready: <strong>${players.length}</strong>
          </div>
          <button class="btn-primary" onclick="window.imposterGame.startGame()">
            🎭 Start Secret Assignment
          </button>
        </div>
      `;
      return;
    }

    if (gs.status === 'role_reveal') {
      const myRole = (gs.roles && gs.roles[activePlayerId]) || 'citizen';
      const myWord = (gs.words && gs.words[activePlayerId]) || 'Secret';

      container.innerHTML = `
        <div class="imposter-card-reveal" style="max-width: 500px; margin: 0 auto; text-align: center;">
          <p style="color: #64748b; font-size: 0.95rem; margin-bottom: 16px;">
            🔒 Confidential Role Card (Keep away from other eyes!)
          </p>
          <div class="peek-card ${this.revealedLocally ? 'revealed' : ''}" id="peek-card" onclick="window.imposterGame.togglePeek()">
            ${this.revealedLocally ? `
              <div class="secret-word-display" style="font-size: 2.2rem; font-weight: 800; color: #0f172a; margin-bottom: 8px;">
                ${myWord}
              </div>
              <div class="role-badge ${myRole}" style="display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: 800; font-size: 0.9rem; background: ${myRole === 'imposter' ? '#f43f5e' : '#10b981'}; color: white;">
                ${myRole === 'imposter' ? '😈 THE IMPOSTER' : '🛡️ CITIZEN'}
              </div>
              <p style="font-size: 0.8rem; color: #64748b; margin-top: 12px;">Tap again to hide</p>
            ` : `
              <div style="font-size: 3rem; margin-bottom: 8px;">👀</div>
              <p style="font-weight: 800; color: #0f172a; font-size: 1.1rem;">TAP TO REVEAL YOUR SECRET WORD</p>
              <p style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">Make sure no one is peeking!</p>
            `}
          </div>
          <div style="margin-top: 26px;">
            <button class="btn-primary" onclick="window.imposterGame.proceedToClues()">
              🗣️ Start Clue Phase ➔
            </button>
          </div>
        </div>
      `;
      return;
    }

    if (gs.status === 'clue_phase') {
      const clues = gs.clues || [];
      container.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h3 style="margin-bottom: 6px;">🗣️ Clue Phase</h3>
            <p style="color: #64748b; font-size: 0.9rem;">
              Take turns saying or typing a 1-word clue that connects to your secret word.
            </p>
          </div>

          <div class="clue-feed" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; min-height: 140px; margin-bottom: 18px; display: flex; flex-direction: column; gap: 10px;">
            ${clues.length === 0 ? '<p style="color: #94a3b8; text-align: center; margin: auto;">No clues submitted yet. Enter your clue below!</p>' : ''}
            ${clues.map(c => `
              <div class="clue-item" style="display: flex; align-items: center; gap: 8px; background: #ffffff; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <span style="font-size: 1.3rem;">${c.avatar || '👤'}</span>
                <span style="font-weight: 700; color: #0f172a;">${this.escapeHtml(c.player_name)}:</span>
                <span style="color: #0284c7; font-weight: 600;">"${this.escapeHtml(c.clue)}"</span>
              </div>
            `).join('')}
          </div>

          <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <input type="text" id="clue-input" placeholder="Type your 1-word clue..." 
                   style="flex: 1; padding: 12px 16px; border-radius: 20px; background: #ffffff; border: 1px solid #cbd5e1; color: #0f172a; outline: none; font-size: 0.95rem;"
                   onkeydown="if(event.key==='Enter') window.imposterGame.submitClue()">
            <button class="btn-primary" onclick="window.imposterGame.submitClue()">Send Clue</button>
          </div>

          <div style="text-align: center;">
            <button class="btn-secondary" onclick="window.imposterGame.startVoting()" style="background: rgba(239, 68, 68, 0.1); border-color: #ef4444; color: #ef4444; font-weight: 700;">
              🗳️ Move to Voting Phase ➔
            </button>
          </div>
        </div>
      `;
      return;
    }

    if (gs.status === 'voting') {
      const votes = gs.votes || {};
      const myVote = votes[activePlayerId];
      container.innerHTML = `
        <div style="max-width: 650px; margin: 0 auto; text-align: center;">
          <h3 style="margin-bottom: 6px;">🗳️ Vote Out The Imposter!</h3>
          <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 22px;">
            Tap on the player you suspect the most. Who sounded suspicious?
          </p>

          <div class="voting-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 14px; margin-bottom: 24px;">
            ${players.map(p => `
              <button class="vote-target-btn ${myVote === p.id ? 'voted' : ''}" 
                      style="display: flex; flex-direction: column; align-items: center; padding: 18px 12px; background: ${myVote === p.id ? 'rgba(239, 68, 68, 0.15)' : '#ffffff'}; border: 2px solid ${myVote === p.id ? '#ef4444' : '#e2e8f0'}; border-radius: 12px; cursor: pointer; transition: all 0.2s;"
                      onclick="window.imposterGame.castVote('${p.id}')">
                <span style="font-size: 2.5rem; margin-bottom: 6px;">${p.avatar}</span>
                <span style="font-weight: 700; color: #0f172a;">${this.escapeHtml(p.name)}</span>
                <span style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">${p.id === activePlayerId ? '(You)' : 'Suspect'}</span>
              </button>
            `).join('')}
          </div>

          <p style="color: #64748b; font-size: 0.85rem;">
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
        <div style="max-width: 550px; margin: 20px auto; text-align: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 36px 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
          <div style="font-size: 4rem; margin-bottom: 10px;">
            ${isImposterCaught ? '🎉🛡️' : '😈🔥'}
          </div>
          <h2 style="color: ${isImposterCaught ? '#059669' : '#dc2626'}; margin-bottom: 8px;">
            ${isImposterCaught ? 'CITIZENS WIN!' : 'THE IMPOSTER WON!'}
          </h2>
          <p style="color: #64748b; margin: 12px 0;">
            The group voted out: <strong style="color: #0f172a;">${votedOut ? votedOut.name : 'Unknown'}</strong> (${votedOut?.avatar || '👤'})
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 4px;">Actual Imposter:</p>
            <p style="font-size: 1.3rem; font-weight: 800; color: #dc2626;">
              ${imposter ? imposter.name : 'Unknown'} (${imposter?.avatar || '👤'})
            </p>
            <div style="display: flex; justify-content: space-around; margin-top: 16px; font-size: 1rem;">
              <div>Citizen Word: <strong style="color: #0284c7;">${gs.secret_pair?.citizen}</strong></div>
              <div>Imposter Word: <strong style="color: #db2777;">${gs.secret_pair?.imposter}</strong></div>
            </div>
          </div>

          <button class="btn-primary" onclick="window.imposterGame.startGame()">
            🔄 Play Another Round
          </button>
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
    this.render();
  }

  async startGame() {
    this.revealedLocally = false;
    this.celebratedReveal = false;
    window.soundEngine.cardClick();

    if (!window.partyApp?.currentRoom || window.appState?.isPassAndPlay) {
      this.initLocalState();
      this.render();
      return;
    }
    await window.partyApp.sendAction('start_imposter_game');
  }

  async proceedToClues() {
    window.soundEngine.cardClick();
    if (!window.partyApp?.currentRoom || window.appState?.isPassAndPlay) {
      if (!this.localState) this.initLocalState();
      const gs = this.localState.game_state;
      gs.status = 'clue_phase';

      // Generate bot clues
      const isAlexImposter = gs.imposter_id === 'p2';
      const isSamImposter = gs.imposter_id === 'p3';
      gs.clues = [
        {
          player_id: 'p2',
          player_name: 'Alex',
          avatar: '🐯',
          clue: isAlexImposter ? 'Hot and liquid' : 'Morning routine drink'
        },
        {
          player_id: 'p3',
          player_name: 'Sam',
          avatar: '🐘',
          clue: isSamImposter ? 'Warm cup' : 'Brewed in cafe'
        }
      ];
      this.render();
      return;
    }
    await window.partyApp.sendAction('proceed_to_clues');
  }

  async submitClue() {
    const input = document.getElementById('clue-input');
    const clue = (input?.value || '').trim();
    if (!clue) return;
    input.value = '';
    window.soundEngine.cardClick();

    if (!window.partyApp?.currentRoom || window.appState?.isPassAndPlay) {
      if (!this.localState) this.initLocalState();
      this.localState.game_state.clues.push({
        player_id: 'p1',
        player_name: 'You',
        avatar: '🦁',
        clue: clue
      });
      this.render();
      return;
    }
    await window.partyApp.sendAction('submit_clue', { clue });
  }

  async startVoting() {
    window.soundEngine.cardClick();
    if (!window.partyApp?.currentRoom || window.appState?.isPassAndPlay) {
      if (!this.localState) this.initLocalState();
      this.localState.game_state.status = 'voting';
      this.localState.game_state.votes = {};
      this.render();
      return;
    }
    await window.partyApp.sendAction('start_voting');
  }

  async castVote(targetId) {
    window.soundEngine.cardClick();
    if (!window.partyApp?.currentRoom || window.appState?.isPassAndPlay) {
      if (!this.localState) this.initLocalState();
      const gs = this.localState.game_state;
      gs.votes['p1'] = targetId;

      // Bot Alex votes for imposter or random
      gs.votes['p2'] = gs.imposter_id !== 'p2' ? gs.imposter_id : 'p1';
      // Bot Sam votes for someone
      gs.votes['p3'] = targetId;

      // Tally votes
      const tally = {};
      Object.values(gs.votes).forEach(t => tally[t] = (tally[t] || 0) + 1);
      const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
      const votedOut = sorted[0][0];

      gs.voted_out_id = votedOut;
      gs.status = 'revealed';
      gs.imposter_won = votedOut !== gs.imposter_id;

      this.render();
      return;
    }
    await window.partyApp.sendAction('cast_vote', { target_id: targetId });
  }

  escapeHtml(str) {
    return (str || '').replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
  }
}

window.imposterGame = new ImposterGame();
