/**
 * 🃏 Animal Matching Card Game Engine
 * 3 Players | 12 Cards (4 Lion 🦁, 4 Tiger 🐯, 4 Elephant 🐘)
 * Goal: Be first to collect all 4 cards of the same animal!
 * Works 100% in BOTH Solo/Bots mode AND Room Multiplayer!
 */
class AnimalMatchingGame {
  constructor() {
    this.selectedCardIndex = null;
    this.isExchanging = false;
    this.localState = null;
    this.celebratedWinner = false;
  }

  getActiveData(roomData, myPlayerId) {
    if (roomData && window.partyApp?.currentRoom && !window.appState?.isPassAndPlay) {
      return {
        data: roomData,
        playerId: myPlayerId || window.partyApp.playerId || roomData.players[0]?.id
      };
    }
    if (!this.localState) {
      this.initLocalGame();
    }
    return {
      data: this.localState,
      playerId: 'p1'
    };
  }

  // Render the game state based on room data or local state
  render(roomData, myPlayerId) {
    const { data: activeData, playerId: activePlayerId } = this.getActiveData(roomData, myPlayerId);

    const gs = activeData.game_state;
    const players = activeData.players || [];
    
    // Find my player object and opponents
    const myPlayer = players.find(p => p.id === activePlayerId) || players[0];
    const opponents = players.filter(p => p.id !== myPlayer?.id).slice(0, 2);

    // Update Opponents display
    const oppContainer = document.getElementById('animal-opponents-row');
    if (oppContainer) {
      oppContainer.innerHTML = opponents.map((opp) => {
        const isReady = gs.pass_selections && gs.pass_selections[opp.id] !== undefined;
        const oppCards = (gs.hands && gs.hands[opp.id]) || ['hidden', 'hidden', 'hidden', 'hidden'];
        return `
          <div class="player-pod ${isReady ? 'active-turn' : ''}">
            <div class="avatar">${opp.avatar || '👤'}</div>
            <div class="name">${this.escapeHtml(opp.name)} ${opp.is_bot ? '🤖' : ''}</div>
            <div class="status-tag">${isReady ? '✅ Card Ready' : '⏳ Choosing...'}</div>
            <div class="mini-cards-stack">
              ${oppCards.map(() => '<div class="mini-card-back"></div>').join('')}
            </div>
          </div>
        `;
      }).join('');
    }

    // Status Banner / Center Instruction
    const statusMsg = document.getElementById('animal-status-text');
    if (statusMsg) {
      if (gs.status === 'waiting') {
        statusMsg.textContent = 'Waiting to start... (Need 3 players or bots)';
      } else if (gs.status === 'playing') {
        statusMsg.textContent = `Round ${gs.round || 1}: Pick 1 card to pass clockwise!`;
      } else if (gs.status === 'game_over') {
        const winner = players.find(p => p.id === gs.winner);
        const animalName = (gs.win_animal || 'matching').toUpperCase();
        statusMsg.innerHTML = `🏆 <strong>${winner ? winner.name : 'A Player'} WON!</strong> Collected 4 ${animalName}s!`;
      }
    }

    // Render My Hand
    const handContainer = document.getElementById('animal-my-hand');
    const passBtn = document.getElementById('animal-pass-btn');
    const myHand = (gs.hands && gs.hands[activePlayerId]) || [];

    if (handContainer) {
      if (gs.status === 'playing' || gs.status === 'game_over') {
        handContainer.innerHTML = myHand.map((card, idx) => {
          const isSelected = this.selectedCardIndex === idx;
          const cardInfo = this.getCardInfo(card);
          return `
            <div class="animal-card ${cardInfo.cssClass} ${isSelected ? 'selected' : ''}"
                 onclick="window.animalGame.selectCard(${idx})"
                 data-index="${idx}">
              <div class="card-corner">
                <span>${cardInfo.emoji}</span>
              </div>
              <div class="card-center">
                <div class="card-emoji">${cardInfo.emoji}</div>
                <div class="card-name">${cardInfo.name}</div>
              </div>
              <div class="card-corner" style="align-self: flex-end; transform: rotate(180deg);">
                <span>${cardInfo.emoji}</span>
              </div>
            </div>
          `;
        }).join('');
      } else {
        handContainer.innerHTML = `
          <div style="text-align:center; padding: 40px; color: #64748b;">
            <p>Cards will be dealt when you start the round.</p>
          </div>
        `;
      }
    }

    // Pass Button state
    if (passBtn) {
      const alreadyPassed = gs.pass_selections && gs.pass_selections[activePlayerId] !== undefined;
      if (gs.status !== 'playing' || alreadyPassed) {
        passBtn.disabled = true;
        passBtn.textContent = alreadyPassed ? '✅ Card Passed (Waiting for others...)' : 'Pass Card';
      } else {
        passBtn.disabled = this.selectedCardIndex === null;
        passBtn.textContent = this.selectedCardIndex !== null ? 'Pass Selected Card ➔' : 'Select a Card to Pass';
      }
    }

    // Winner Fanfare
    if (gs.status === 'game_over' && !this.celebratedWinner) {
      this.celebratedWinner = true;
      window.soundEngine.fanfare();
      window.confetti.trigger(120);
    } else if (gs.status === 'playing') {
      this.celebratedWinner = false;
    }

    // Host Start / Restart Button
    const startBtn = document.getElementById('animal-start-btn');
    if (startBtn) {
      startBtn.style.display = 'inline-flex';
      startBtn.textContent = gs.status === 'game_over' ? '🔄 Play Again' : (gs.status === 'waiting' ? '🎮 Deal 12 Cards' : 'Restart Round');
    }
  }

  getCardInfo(cardType) {
    switch (cardType) {
      case 'lion':
        return { name: 'Lion', emoji: '🦁', cssClass: 'lion' };
      case 'tiger':
        return { name: 'Tiger', emoji: '🐯', cssClass: 'tiger' };
      case 'elephant':
        return { name: 'Elephant', emoji: '🐘', cssClass: 'elephant' };
      default:
        return { name: 'Card', emoji: '🎴', cssClass: '' };
    }
  }

  selectCard(index) {
    window.soundEngine.cardClick();
    this.selectedCardIndex = index;
    const handContainer = document.getElementById('animal-my-hand');
    if (handContainer) {
      Array.from(handContainer.children).forEach((el, idx) => {
        el.classList.toggle('selected', idx === index);
      });
    }
    const passBtn = document.getElementById('animal-pass-btn');
    if (passBtn) {
      passBtn.disabled = false;
      passBtn.textContent = 'Pass Selected Card ➔';
    }
  }

  async sendPassSelection() {
    if (this.selectedCardIndex === null) return;
    window.soundEngine.cardPass();

    const idx = this.selectedCardIndex;
    this.selectedCardIndex = null;

    if (!window.partyApp?.currentRoom || window.appState?.isPassAndPlay) {
      this.localPassTurn(idx);
    } else {
      await window.partyApp.sendAction('pass_card', { card_index: idx });
    }
  }

  async startOrRestart() {
    this.selectedCardIndex = null;
    this.celebratedWinner = false;
    window.soundEngine.cardClick();

    if (!window.partyApp?.currentRoom || window.appState?.isPassAndPlay) {
      this.startLocalGame();
    } else {
      await window.partyApp.sendAction('start_animal_game');
    }
  }

  // ================= LOCAL PASS & PLAY / BOTS ENGINE =================
  initLocalGame() {
    this.startLocalGame();
  }

  startLocalGame() {
    const deck = ['lion', 'lion', 'lion', 'lion', 'tiger', 'tiger', 'tiger', 'tiger', 'elephant', 'elephant', 'elephant', 'elephant'];
    this.shuffle(deck);

    this.localState = {
      players: [
        { id: 'p1', name: 'You', avatar: '🦁', is_host: true, is_bot: false, score: 0 },
        { id: 'p2', name: 'Bot Maya', avatar: '🐯', is_host: false, is_bot: true, score: 0 },
        { id: 'p3', name: 'Bot Jumbo', avatar: '🐘', is_host: false, is_bot: true, score: 0 }
      ],
      game_state: {
        status: 'playing',
        round: 1,
        hands: {
          'p1': deck.slice(0, 4),
          'p2': deck.slice(4, 8),
          'p3': deck.slice(8, 12)
        },
        pass_selections: {},
        winner: null,
        win_animal: null
      }
    };

    this.checkLocalWinner();
    this.render();
  }

  localPassTurn(myCardIdx) {
    if (!this.localState) this.startLocalGame();
    const gs = this.localState.game_state;
    if (gs.status !== 'playing') return;

    // P1 picks
    const p1Card = gs.hands['p1'].splice(myCardIdx, 1)[0];

    // Bot Maya picks
    const p2Idx = this.botPickCard(gs.hands['p2']);
    const p2Card = gs.hands['p2'].splice(p2Idx, 1)[0];

    // Bot Jumbo picks
    const p3Idx = this.botPickCard(gs.hands['p3']);
    const p3Card = gs.hands['p3'].splice(p3Idx, 1)[0];

    // Exchange clockwise: P1 -> P2 -> P3 -> P1
    gs.hands['p2'].push(p1Card);
    gs.hands['p3'].push(p2Card);
    gs.hands['p1'].push(p3Card);

    gs.round += 1;
    this.checkLocalWinner();
    this.render();
  }

  botPickCard(hand) {
    const counts = {};
    hand.forEach(c => counts[c] = (counts[c] || 0) + 1);
    const sorted = Object.entries(counts).sort((a, b) => a[1] - b[1]);
    const leastCommon = sorted[0][0];
    return hand.indexOf(leastCommon);
  }

  checkLocalWinner() {
    const gs = this.localState.game_state;
    for (const p of this.localState.players) {
      const hand = gs.hands[p.id];
      if (hand && hand.length === 4 && new Set(hand).size === 1) {
        gs.status = 'game_over';
        gs.winner = p.id;
        gs.win_animal = hand[0];
        p.score += 1;
        return true;
      }
    }
    return false;
  }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  escapeHtml(str) {
    return (str || '').replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
  }
}

window.animalGame = new AnimalMatchingGame();
