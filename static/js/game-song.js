/**
 * 🎵 Guess the Song Name Game Engine
 * Features:
 * - 500 Tamil Hit Songs
 * - 10 Songs per Round
 * - Automatic shuffle of 10 new songs every round!
 * - Real Web Audio API synthesizer melodies!
 */
class SongGame {
  constructor() {
    this.allSongs = [];
    this.isPlayingMelody = false;
  }

  async loadAllSongsIfNeeded() {
    if (this.allSongs.length === 0) {
      try {
        const res = await fetch('/api/content/all');
        const data = await res.json();
        this.allSongs = data.songs || [];
      } catch (e) {
        console.warn('Failed to load songs', e);
      }
    }
  }

  async render(roomData, myPlayerId) {
    await this.loadAllSongsIfNeeded();
    const gs = roomData.game_state;
    const players = roomData.players || [];
    const myPlayer = players.find(p => p.id === myPlayerId) || players[0];
    const roundNum = gs.round_number || 1;

    const container = document.getElementById('song-container');
    if (!container) return;

    if (gs.status === 'lobby') {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 3.5rem; margin-bottom: 12px;">🎵🎸</div>
          <h2>Guess the Song Name</h2>
          <p style="color: #64748b; max-width: 500px; margin: 10px auto 24px;">
            500 hit Tamil songs! 10 tracks per round with synthesized melodies and lyric clues.
          </p>
          ${myPlayer?.is_host ? `
            <button class="btn-primary" onclick="window.songGame.nextSong()">
              🎶 Start Round 1 (10 Tracks) ➔
            </button>
          ` : `
            <p style="color: #7c3aed;">Waiting for host to play...</p>
          `}
        </div>
      `;
      return;
    }

    // Round Summary View
    if (gs.status === 'round_summary') {
      window.soundEngine.fanfare();
      window.confetti.trigger(100);

      container.innerHTML = `
        <div class="riddle-display-card" style="text-align: center; padding: 36px 20px;">
          <div style="font-size: 4rem; margin-bottom: 8px;">🎉🎶</div>
          <h2 style="color: #0f172a; margin-bottom: 6px;">Round ${roundNum} Completed!</h2>
          <p style="color: #64748b; font-size: 1rem; margin-bottom: 24px;">
            You have completed all 10 Tamil songs for this round!
          </p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 20px; max-width: 480px; margin: 0 auto 24px;">
            <h4 style="color: #0f172a; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">
              🏅 Round ${roundNum} Leaderboard
            </h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${players.map(p => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
                  <span>${p.avatar} <strong>${this.escapeHtml(p.name)}</strong></span>
                  <span style="font-weight: 800; color: #059669; font-size: 1.1rem;">${p.score} pts</span>
                </div>
              `).join('')}
            </div>
          </div>

          ${myPlayer?.is_host ? `
            <button class="btn-primary" style="font-size: 1.05rem; padding: 14px 30px;" onclick="window.songGame.startNextRound()">
              🔄 Start Round ${roundNum + 1} (Shuffle 10 New Songs) ➔
            </button>
          ` : `
            <p style="color: #7c3aed; font-weight: 600;">Waiting for host to start Round ${roundNum + 1}...</p>
          `}
        </div>
      `;
      return;
    }

    const order = gs.question_order || [0];
    const currIdx = gs.current_index || 0;
    const qIndex = order[currIdx % order.length];
    const song = this.allSongs[qIndex] || {
      title: 'Why This Kolaveri Di',
      artist: 'Dhanush & Anirudh',
      emojis: '💔🌙🥣',
      lyrics_clue: 'Why this kolaveri kolaveri kolaveri di...',
      melody: [[294, 250, 40], [294, 250, 40], [330, 250, 40]]
    };

    const revealedClues = gs.revealed_clues || 0;
    const isRoundOver = gs.round_over;
    const isLastInRound = currIdx + 1 >= order.length;

    container.innerHTML = `
      <div style="max-width: 650px; margin: 0 auto;">
        <div class="riddle-display-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-size: 0.9rem; color: #64748b;">
            <span style="font-weight: 700; color: #0f172a;">
              🎵 Track #${currIdx + 1} of ${order.length} <span style="color: #059669;">• Round ${roundNum}</span>
            </span>
            <span style="background: rgba(16,185,129,0.1); color: #059669; padding: 4px 12px; border-radius: 12px; font-weight: 600;">
              Audio Challenge 🎧
            </span>
          </div>

          <div class="melody-player-box">
            <button class="play-melody-btn" id="play-tune-btn" onclick="window.songGame.playCurrentTune()">
              <span id="play-icon">▶️</span> Play Melody Tune
            </button>

            <div class="audio-waves ${this.isPlayingMelody ? 'playing' : ''}" id="sound-bars">
              <div class="audio-bar"></div>
              <div class="audio-bar"></div>
              <div class="audio-bar"></div>
              <div class="audio-bar"></div>
            </div>
            <p style="font-size: 0.82rem; color: #64748b;">Listen to the tune and guess the Tamil song!</p>
          </div>

          <div class="hints-box">
            <div style="font-weight: 700; font-size: 0.85rem; color: #0284c7; margin-bottom: 8px; text-transform: uppercase;">
              🔍 Song Clues:
            </div>
            <div class="hint-item">
              <span style="font-weight: 700; color: #0284c7;">Emoji:</span>
              <span style="font-size: 1.4rem;">${song.emojis}</span>
            </div>

            ${revealedClues >= 1 ? `
              <div class="hint-item">
                <span style="font-weight: 700; color: #db2777;">Lyric Clue:</span>
                <span>"${song.lyrics_clue}"</span>
              </div>
            ` : ''}

            ${revealedClues >= 2 ? `
              <div class="hint-item">
                <span style="font-weight: 700; color: #ca8a04;">Artist / Movie:</span>
                <span>${song.artist}</span>
              </div>
            ` : ''}
          </div>

          <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; margin-top: 18px;">
            ${!isRoundOver && revealedClues < 2 ? `
              <button class="btn-secondary" onclick="window.songGame.revealClue()">
                💡 Reveal Next Clue
              </button>
            ` : ''}

            ${!isRoundOver ? `
              <button class="btn-primary" onclick="window.songGame.revealAnswer()">
                👀 Reveal Song Title
              </button>
            ` : ''}
          </div>

          ${isRoundOver ? `
            <div class="answer-reveal-zone">
              <p style="font-size: 0.85rem; color: #166534; margin-bottom: 4px;">The Hit Song Is:</p>
              <div class="answer-text">🎵 "${song.title}"</div>
              <p style="color: #334155; font-size: 1rem; margin-top: 4px;"><strong>${song.artist}</strong></p>
              
              <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(22, 101, 52, 0.2);">
                <p style="font-size: 0.85rem; color: #166534; margin-bottom: 10px;">Award Point To:</p>
                <div style="display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
                  ${players.map(p => `
                    <button class="btn-secondary" style="padding: 6px 14px; font-size: 0.85rem;"
                            onclick="window.songGame.awardPoint('${p.id}')">
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
          ${myPlayer?.is_host ? `
            <button class="btn-primary" onclick="window.songGame.nextSong()" style="padding: 8px 18px;">
              ${isLastInRound ? '🏁 Finish Round (10/10) ➔' : 'Next Song ➔'}
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  playCurrentTune() {
    const roomData = window.partyApp.currentRoom;
    if (!roomData) return;
    const gs = roomData.game_state;
    const order = gs.question_order || [0];
    const currIdx = gs.current_index || 0;
    const qIndex = order[currIdx % order.length];
    const song = this.allSongs[qIndex];
    if (!song || !song.melody) return;

    this.isPlayingMelody = true;
    const soundBars = document.getElementById('sound-bars');
    const playBtn = document.getElementById('play-tune-btn');
    const playIcon = document.getElementById('play-icon');

    if (soundBars) soundBars.classList.add('playing');
    if (playBtn) playBtn.style.opacity = '0.7';
    if (playIcon) playIcon.textContent = '🔊';

    window.soundEngine.playMelody(song.melody, () => {
      this.isPlayingMelody = false;
      if (soundBars) soundBars.classList.remove('playing');
      if (playBtn) playBtn.style.opacity = '1';
      if (playIcon) playIcon.textContent = '▶️';
    });
  }

  async revealClue() {
    window.soundEngine.cardClick();
    await window.partyApp.sendAction('reveal_song_clue');
  }

  async revealAnswer() {
    window.soundEngine.ding();
    window.confetti.trigger(60);
    await window.partyApp.sendAction('reveal_song_answer');
  }

  async awardPoint(playerId) {
    window.soundEngine.ding();
    await window.partyApp.sendAction('award_song_point', { player_id: playerId });
  }

  async nextSong() {
    window.soundEngine.cardClick();
    await window.partyApp.sendAction('next_song');
  }

  async startNextRound() {
    window.soundEngine.cardClick();
    await window.partyApp.sendAction('start_next_song_round');
  }

  escapeHtml(str) {
    return (str || '').replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
  }
}

window.songGame = new SongGame();
