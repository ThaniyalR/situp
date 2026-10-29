/**
 * 🔥 Party Extras Engine:
 * - Spin the Bottle & Truth or Dare
 * - Most Likely To
 * - 5-Second Rule Countdown
 * - Works 100% in BOTH Solo/Local mode AND Room Multiplayer!
 */
class PartyExtrasGame {
  constructor() {
    this.timerInterval = null;
    this.timerRemaining = 5;
    this.localState = null;

    this.truths = [
      "What is the most embarrassing thing in your search history right now?",
      "Who in this room would you call first if you were arrested at 3 AM?",
      "Have you ever practiced kissing on a pillow, mirror, or your hand?",
      "What is the biggest lie you have ever told your parents or boss with a straight face?",
      "What is a bizarre secret habit you have when you are completely alone at home?",
      "If you had to delete every app on your phone except 3, which 3 would you keep?",
      "What is the most childish thing you still do on a daily or weekly basis?",
      "What is your biggest irrational fear that makes zero logical sense?",
      "Have you ever stalked an ex or crush on social media from a fake account?",
      "What was your most awkward first date or romantic encounter?",
      "If you had to swap lives with one person in this room for a week, who would it be?",
      "What is the worst haircut or fashion disaster you have ever willingly rocked?",
      "Have you ever pretended to be sick just to binge-watch a movie or sleep in?",
      "What is a secret talent or strange body trick you have that nobody knows about?"
    ];

    this.dares = [
      "Speak in a dramatic Shakespearean or villain accent until your next turn!",
      "Let the group look at your 5 most recently taken photos in your gallery without hiding!",
      "Do your best impression of another person in this room until someone guesses who it is!",
      "Call a random contact from your phone and sing them the 'Happy Birthday' song earnestly!",
      "Do 15 energetic jumping jacks while shouting 'I LOVE PARTY PLAY!' on every jump!",
      "Let the person to your left send a harmless 1-word text to anyone in your contacts!",
      "Eat a spoonful of the spicy sauce, lemon slice, or weird food concoction the group picks!",
      "Try to lick your own elbow or balance a spoon on your nose for 20 seconds!",
      "Balance a book on your head and do a slow catwalk across the room without dropping it!",
      "Show the group the funniest or cringiest selfie currently saved on your phone!",
      "Pretend you are a wild animal (Lion 🦁, Tiger 🐯, or Elephant 🐘) and make its sound loud!",
      "Do an impromptu 20-second runway fashion walk across the room like a supermodel!",
      "Keep a completely straight poker face for 45 seconds while everyone tries to make you laugh!",
      "Perform a 15-second dramatic slow-motion death scene as if you were in a Tamil blockbuster!"
    ];

    this.mostLikely = [
      "Most likely to survive a zombie apocalypse purely on luck?",
      "Most likely to accidentally become famous on TikTok overnight?",
      "Most likely to cry during an animated Disney or Pixar movie?",
      "Most likely to lose their phone while literally holding it in their hand?",
      "Most likely to show up 30 minutes late holding an iced coffee?",
      "Most likely to accidentally join a mysterious secret club or cult?",
      "Most likely to talk their way out of a speeding ticket with pure charm?",
      "Most likely to become a secret billionaire and tell absolutely nobody?",
      "Most likely to sleep right through a loud fire alarm and earthquake?",
      "Most likely to trip over nothing while walking on completely flat ground?",
      "Most likely to win a reality TV survival show like Bigg Boss or Survivor?",
      "Most likely to spend an entire paycheck on snacks and midnight online shopping?"
    ];

    this.fiveSecond = [
      "Name 3 animals with spots or stripes!",
      "Name 3 pizza toppings you would NEVER put on a pizza!",
      "Name 3 things you can find in a refrigerator right now!",
      "Name 3 superheroes that wear capes!",
      "Name 3 movie villains everyone secretly loves!",
      "Name 3 excuses people use when they are running late!",
      "Name 3 countries that start with the letter 'M'!",
      "Name 3 things people do when they think nobody is watching!",
      "Name 3 green fruits or vegetables!",
      "Name 3 things you should NEVER say on a first date!",
      "Name 3 songs everyone in Tamil Nadu knows the lyrics to!",
      "Name 3 essential items you would pack for a desert island vacation!"
    ];
  }

  initLocalState() {
    this.localState = {
      players: [
        { id: 'p1', name: 'Player 1', avatar: '🦁' },
        { id: 'p2', name: 'Player 2', avatar: '🐯' },
        { id: 'p3', name: 'Player 3', avatar: '🐘' }
      ],
      game_state: {
        sub_game: 'truth_dare',
        current_item: null,
        category: 'truth',
        bottle_angle: 0,
        selected_player_id: null,
        timer_seconds: 5
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
        <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 20px;">
          Spin the bottle to choose who plays next, then pick Truth or Dare!
        </p>

        <div class="bottle-spin-area">
          <svg class="bottle-img" id="bottle-svg" viewBox="0 0 100 280" 
               style="transform: rotate(${bottleAngle}deg); transition: transform 2.5s cubic-bezier(0.15, 0.9, 0.2, 1); cursor: pointer;"
               onclick="window.partyExtras.spinBottle()">
            <defs>
              <linearGradient id="bottleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#10b981"/>
                <stop offset="50%" stop-color="#059669"/>
                <stop offset="100%" stop-color="#047857"/>
              </linearGradient>
            </defs>
            <rect x="42" y="10" width="16" height="40" rx="3" fill="#94a3b8"/>
            <path d="M42,50 Q30,100 20,130 L20,250 Q20,270 50,270 Q80,270 80,250 L80,130 Q70,100 58,50 Z" fill="url(#bottleGrad)" stroke="#34d399" stroke-width="4"/>
            <rect x="25" y="150" width="50" height="45" rx="6" fill="#ffffff" opacity="0.95"/>
            <text x="50" y="180" font-size="22" text-anchor="middle">🍾</text>
          </svg>

          <div>
            <button class="btn-primary" style="margin-top: 20px;" onclick="window.partyExtras.spinBottle()">
              🎲 Spin The Bottle
            </button>
          </div>
        </div>

        ${selectedPlayer ? `
          <div style="margin: 18px 0; font-size: 1.15rem; color: #0284c7; font-weight: 800;">
            👉 The Bottle Pointed At: ${selectedPlayer.avatar} ${this.escapeHtml(selectedPlayer.name)}!
          </div>
        ` : ''}

        <div style="display: flex; justify-content: center; gap: 12px; margin-top: 14px;">
          <button class="btn-secondary" style="border-color: #0284c7; color: #0284c7;" onclick="window.partyExtras.drawTruthDare('truth')">
            😇 Draw TRUTH
          </button>
          <button class="btn-secondary" style="border-color: #db2777; color: #db2777;" onclick="window.partyExtras.drawTruthDare('dare')">
            😈 Draw DARE
          </button>
        </div>

        ${currentItem ? `
          <div class="answer-reveal-zone" style="margin-top: 22px; background: ${gs.category === 'truth' ? 'rgba(2, 132, 199, 0.08)' : 'rgba(219, 39, 119, 0.08)'}; border: 2px solid ${gs.category === 'truth' ? '#0284c7' : '#db2777'};">
            <div style="font-size: 0.85rem; font-weight: 800; text-transform: uppercase; color: ${gs.category === 'truth' ? '#0284c7' : '#db2777'};">
              ${(gs.category || 'card').toUpperCase()} CARD:
            </div>
            <div style="font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-top: 8px; line-height: 1.4;">
              "${this.escapeHtml(currentItem)}"
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderMostLikely(gs, players, myPlayer) {
    const currentItem = gs.current_item || 'Most likely to accidentally start a viral trend?';

    return `
      <div class="riddle-display-card" style="padding: 30px 20px;">
        <h3 style="margin-bottom: 6px;">👀 Most Likely To...</h3>
        <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 24px;">
          Read the card out loud. On count of 3, everyone points at the guilty person!
        </p>

        <div style="font-size: 1.6rem; font-weight: 800; color: #d97706; margin: 30px 10px; line-height: 1.4;">
          "${this.escapeHtml(currentItem)}"
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
      <div class="riddle-display-card" style="padding: 30px 20px;">
        <h3 style="margin-bottom: 6px;">⚡ 5-Second Rule!</h3>
        <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 20px;">
          You have only 5 seconds to name 3 items! Think lightning fast!
        </p>

        <div style="font-size: 1.5rem; font-weight: 800; color: #0284c7; margin: 16px 0; line-height: 1.4;">
          "${this.escapeHtml(currentItem)}"
        </div>

        <div class="five-second-timer" id="five-sec-display">
          ${this.timerRemaining}
        </div>

        <div style="display: flex; justify-content: center; gap: 12px; margin-top: 18px; flex-wrap: wrap;">
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
    if (!window.partyApp?.currentRoom || window.appState?.isPassAndPlay) {
      if (!this.localState) this.initLocalState();
      this.localState.game_state.sub_game = subName;
      this.render();
      return;
    }
    await window.partyApp.sendAction('draw_truth_dare', {}, subName);
  }

  async spinBottle() {
    window.soundEngine.cardPass();
    if (!window.partyApp?.currentRoom || window.appState?.isPassAndPlay) {
      if (!this.localState) this.initLocalState();
      const pList = this.localState.players;
      const target = pList[Math.floor(Math.random() * pList.length)];
      this.localState.game_state.selected_player_id = target.id;
      this.localState.game_state.bottle_angle = (this.localState.game_state.bottle_angle || 0) + 1080 + Math.floor(Math.random() * 1080);
      
      const svg = document.getElementById('bottle-svg');
      if (svg) svg.style.transform = `rotate(${this.localState.game_state.bottle_angle}deg)`;
      
      setTimeout(() => {
        window.soundEngine.ding();
        this.render();
      }, 2500);
      return;
    }
    await window.partyApp.sendAction('spin_bottle');
  }

  async drawTruthDare(mode) {
    window.soundEngine.cardClick();
    if (!window.partyApp?.currentRoom || window.appState?.isPassAndPlay) {
      if (!this.localState) this.initLocalState();
      const items = mode === 'dare' ? this.dares : this.truths;
      const pick = items[Math.floor(Math.random() * items.length)];
      this.localState.game_state.current_item = pick;
      this.localState.game_state.category = mode;
      this.render();
      return;
    }
    await window.partyApp.sendAction('draw_truth_dare', { mode });
  }

  async drawMostLikely() {
    window.soundEngine.cardClick();
    if (!window.partyApp?.currentRoom || window.appState?.isPassAndPlay) {
      if (!this.localState) this.initLocalState();
      const pick = this.mostLikely[Math.floor(Math.random() * this.mostLikely.length)];
      this.localState.game_state.current_item = pick;
      this.render();
      return;
    }
    await window.partyApp.sendAction('draw_most_likely');
  }

  async drawFiveSecond() {
    window.soundEngine.cardClick();
    this.timerRemaining = 5;
    if (this.timerInterval) clearInterval(this.timerInterval);

    if (!window.partyApp?.currentRoom || window.appState?.isPassAndPlay) {
      if (!this.localState) this.initLocalState();
      const pick = this.fiveSecond[Math.floor(Math.random() * this.fiveSecond.length)];
      this.localState.game_state.current_item = pick;
      this.render();
      return;
    }
    await window.partyApp.sendAction('draw_five_second');
  }

  startFiveSecTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerRemaining = 5;
    const display = document.getElementById('five-sec-display');
    if (display) display.textContent = this.timerRemaining;

    window.soundEngine.playTone(600, 0.05, 'triangle', 0.15); // initial tick

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
