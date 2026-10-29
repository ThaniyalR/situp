/**
 * 🎬 Guess the Movie Name Game Engine
 * Features:
 * - 500 Tamil Blockbusters & Emojis
 * - 10 Movies per Round
 * - Automatic shuffle of 10 new movies every round!
 * - Works 100% in BOTH Solo/Pass & Play mode AND Room Multiplayer!
 */
class MovieGame {
  constructor() {
    this.allMovies = [];
    this.localState = null;
  }

  async loadAllMoviesIfNeeded() {
    if (this.allMovies.length === 0) {
      try {
        const res = await fetch('/static/data/content.json');
        if (res.ok) {
          const data = await res.json();
          this.allMovies = data.movies || [];
          return;
        }
      } catch (e) {}

      try {
        const res = await fetch('/api/content/all');
        if (res.ok) {
          const data = await res.json();
          this.allMovies = data.movies || [];
          return;
        }
      } catch (e) {
        console.warn('Failed to load movie content', e);
      }
    }
  }

  initLocalState() {
    const total = this.allMovies.length || 500;
    const shuffled = [];
    for (let i = 0; i < total; i++) shuffled.push(i);
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    this.localState = {
      players: [{ id: 'p1', name: 'You', avatar: '🦁', score: 0 }],
      game_state: {
        status: 'playing',
        round_number: 1,
        current_index: 0,
        total_in_round: 10,
        question_order: shuffled.slice(0, 10),
        revealed_hints: 0,
        round_over: false,
        round_completed: false
      }
    };
  }

  async render(roomData, myPlayerId) {
    await this.loadAllMoviesIfNeeded();

    // Use local state if not in room or in pass and play
    let activeData = roomData;
    let activePlayerId = myPlayerId;

    if (!roomData || window.appState?.isPassAndPlay || !window.partyApp?.currentRoom) {
      if (!this.localState) {
        this.initLocalState();
      }
      activeData = this.localState;
      activePlayerId = 'p1';
    }

    const gs = activeData.game_state;
    const players = activeData.players || [];
    const myPlayer = players.find(p => p.id === activePlayerId) || players[0];
    const roundNum = gs.round_number || 1;

    const container = document.getElementById('movie-container');
    if (!container) return;

    if (gs.status === 'lobby') {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 3.5rem; margin-bottom: 12px;">🎬🍿</div>
          <h2>Guess the Movie Name</h2>
          <p style="color: #64748b; max-width: 500px; margin: 10px auto 24px;">
            500 iconic Tamil movies! 10 movies per round with automatic shuffles.
          </p>
          <button class="btn-primary" onclick="window.movieGame.nextMovie()">
            🍿 Start Round 1 (10 Movies) ➔
          </button>
        </div>
      `;
      return;
    }

    // Round Summary View (when 10 questions of a round are completed)
    if (gs.status === 'round_summary') {
      window.soundEngine.fanfare();
      window.confetti.trigger(100);

      container.innerHTML = `
        <div class="riddle-display-card" style="text-align: center; padding: 36px 20px;">
          <div style="font-size: 4rem; margin-bottom: 8px;">🎉🏆</div>
          <h2 style="color: #0f172a; margin-bottom: 6px;">Round ${roundNum} Completed!</h2>
          <p style="color: #64748b; font-size: 1rem; margin-bottom: 24px;">
            You have completed all 10 Tamil movies for this round!
          </p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 20px; max-width: 480px; margin: 0 auto 24px;">
            <h4 style="color: #0f172a; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">
              🏅 Round ${roundNum} Leaderboard
            </h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${players.map(p => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
                  <span>${p.avatar} <strong>${this.escapeHtml(p.name)}</strong></span>
                  <span style="font-weight: 800; color: #0284c7; font-size: 1.1rem;">${p.score} pts</span>
                </div>
              `).join('')}
            </div>
          </div>

          <button class="btn-primary" style="font-size: 1.05rem; padding: 14px 30px;" onclick="window.movieGame.startNextRound()">
            🔄 Start Round ${roundNum + 1} (Shuffle 10 New Movies) ➔
          </button>
        </div>
      `;
      return;
    }

    const order = gs.question_order || [0];
    const currIdx = gs.current_index || 0;
    const qIndex = order[currIdx % order.length];
    const movie = this.allMovies[qIndex] || {
      title: 'Leo',
      emojis: '🦁🍫☕🩸',
      hints: ['Bloody Sweet!', 'Thalapathy Vijay & Trisha', 'Directed by Lokesh Kanagaraj'],
      genre: 'Tamil Action Thriller'
    };

    const revealedHints = gs.revealed_hints || 0;
    const isRoundOver = gs.round_over;
    const isLastInRound = currIdx + 1 >= order.length;

    container.innerHTML = `
      <div style="max-width: 650px; margin: 0 auto;">
        <div class="riddle-display-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-size: 0.9rem; color: #64748b;">
            <span style="font-weight: 700; color: #0f172a;">
              🎬 Movie #${currIdx + 1} of ${order.length} <span style="color: #7c3aed;">• Round ${roundNum}</span>
            </span>
            <span style="background: rgba(2, 132, 199, 0.1); padding: 4px 12px; border-radius: 12px; color: #0284c7; font-weight: 600;">
              ${movie.genre}
            </span>
          </div>

          <div class="emojis-banner">${movie.emojis}</div>

          <div class="hints-box">
            <div style="font-weight: 700; font-size: 0.85rem; color: #ca8a04; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
              💡 Hints (${revealedHints} of ${movie.hints.length} unlocked):
            </div>
            ${revealedHints === 0 ? '<p style="color: #94a3b8; font-size: 0.85rem;">No hints revealed yet. Tap "Unlock Hint" if stuck!</p>' : ''}
            ${movie.hints.slice(0, revealedHints).map((h, i) => `
              <div class="hint-item">
                <span style="color: #ca8a04; font-weight: 800;">#${i + 1}</span>
                <span>${h}</span>
              </div>
            `).join('')}
          </div>

          <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; margin-top: 18px;">
            ${!isRoundOver && revealedHints < movie.hints.length ? `
              <button class="btn-secondary" onclick="window.movieGame.revealHint()">
                💡 Reveal Next Hint
              </button>
            ` : ''}

            ${!isRoundOver ? `
              <button class="btn-primary" onclick="window.movieGame.revealAnswer()">
                👀 Reveal Answer
              </button>
            ` : ''}
          </div>

          ${isRoundOver ? `
            <div class="answer-reveal-zone">
              <p style="font-size: 0.85rem; color: #166534; margin-bottom: 4px;">The Tamil Movie Is:</p>
              <div class="answer-text">🎬 ${movie.title}</div>
              
              <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(22, 101, 52, 0.2);">
                <p style="font-size: 0.85rem; color: #166534; margin-bottom: 10px;">Award Point To:</p>
                <div style="display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
                  ${players.map(p => `
                    <button class="btn-secondary" style="padding: 6px 14px; font-size: 0.85rem;"
                            onclick="window.movieGame.awardPoint('${p.id}')">
                      ${p.avatar} ${this.escapeHtml(p.name)} (+1)
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
          <div style="font-size: 0.9rem; color: #64748b;">
            Scores:
            ${players.map(p => `<span style="margin-left: 8px; color: #0f172a;">${p.name}: <strong>${p.score}</strong></span>`).join(' | ')}
          </div>
          <button class="btn-primary" onclick="window.movieGame.nextMovie()" style="padding: 8px 18px;">
            ${isLastInRound ? '🏁 Finish Round (10/10) ➔' : 'Next Movie ➔'}
          </button>
        </div>
      </div>
    `;
  }

  async revealHint() {
    window.soundEngine.cardClick();
    if (!window.partyApp?.currentRoom || window.appState?.isPassAndPlay) {
      if (!this.localState) this.initLocalState();
      this.localState.game_state.revealed_hints += 1;
      this.render();
      return;
    }
    await window.partyApp.sendAction('reveal_hint');
  }

  async revealAnswer() {
    window.soundEngine.ding();
    window.confetti.trigger(60);
    if (!window.partyApp?.currentRoom || window.appState?.isPassAndPlay) {
      if (!this.localState) this.initLocalState();
      this.localState.game_state.round_over = true;
      this.render();
      return;
    }
    await window.partyApp.sendAction('reveal_movie_answer');
  }

  async awardPoint(playerId) {
    window.soundEngine.ding();
    if (!window.partyApp?.currentRoom || window.appState?.isPassAndPlay) {
      if (!this.localState) this.initLocalState();
      const p = this.localState.players.find(x => x.id === playerId) || this.localState.players[0];
      if (p) p.score += 1;
      this.localState.game_state.round_over = true;
      this.render();
      return;
    }
    await window.partyApp.sendAction('award_movie_point', { player_id: playerId });
  }

  async nextMovie() {
    window.soundEngine.cardClick();
    if (!window.partyApp?.currentRoom || window.appState?.isPassAndPlay) {
      if (!this.localState) this.initLocalState();
      const gs = this.localState.game_state;
      if (gs.current_index + 1 >= (gs.question_order?.length || 10)) {
        gs.status = 'round_summary';
        gs.round_completed = true;
      } else {
        gs.current_index += 1;
        gs.revealed_hints = 0;
        gs.status = 'playing';
        gs.round_over = false;
      }
      this.render();
      return;
    }
    await window.partyApp.sendAction('next_movie');
  }

  async startNextRound() {
    window.soundEngine.cardClick();
    if (!window.partyApp?.currentRoom || window.appState?.isPassAndPlay) {
      if (!this.localState) this.initLocalState();
      const gs = this.localState.game_state;
      gs.round_number += 1;
      const total = this.allMovies.length || 500;
      const indices = [];
      for (let i = 0; i < total; i++) indices.push(i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      gs.question_order = indices.slice(0, 10);
      gs.current_index = 0;
      gs.revealed_hints = 0;
      gs.status = 'playing';
      gs.round_over = false;
      gs.round_completed = false;
      this.render();
      return;
    }
    await window.partyApp.sendAction('start_next_movie_round');
  }

  escapeHtml(str) {
    return (str || '').replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
  }
}

window.movieGame = new MovieGame();
