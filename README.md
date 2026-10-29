# 🎉 PartyPlay - Multiplayer Games with Friends

A responsive, real-time party game hub built for game nights with friends! Play on **multiple phones/laptops connected via local Wi-Fi** using room codes, or in **Pass-and-Play / Solo AI bot mode**.

---

## 🎮 Included Games

### 1. 🃏 Animal Matching Card Game (3 Players, 12 Cards)
- **Deck Composition**: 12 cards total:
  - 🦁 **Lion** (4 identical cards)
  - 🐯 **Tiger** (4 identical cards)
  - 🐘 **Elephant** (4 identical cards)
- **Setup**: Cards are shuffled and dealt equally: **4 cards to each of the 3 players**.
- **Exchange Rule**: Each round, every player chooses 1 card from their hand and passes it clockwise to the next neighbor (Player 1 ➔ Player 2 ➔ Player 3 ➔ Player 1) simultaneously.
- **Objective**: Be the first player to collect **all 4 cards of the same animal** (e.g. 4 Lions 🦁🦁🦁🦁, 4 Tigers 🐯🐯🐯🐯, or 4 Elephants 🐘🐘🐘🐘)!
- **Solo / Bot Mode**: If playing with less than 3 human friends, smart AI bots join the table automatically.

---

### 2. 🕵️ The Imposter (Social Deduction Party Game)
- **Players**: 3 to 10+
- **Setup**: Citizens receive the same secret word (e.g. *"Coffee"*), while the undercover Imposter receives a closely related word (e.g. *"Tea"*).
- **Phases**:
  1. **Confidential Card Peek**: View your role card safely on your device.
  2. **Clue Phase**: Players take turns stating a 1-word clue connecting to their word without revealing it to the imposter.
  3. **Discussion & Voting**: Debate who sounded suspicious and vote out the suspect!
  4. **Dramatic Reveal**: See if the group caught the imposter or if the imposter fooled everyone!

---

### 3. 🎬 Guess the Movie Name
- **Emoji Riddles**: Decode movies from emojis (e.g. 🦁👑🌅 = *The Lion King*, 🚢❄️💔 = *Titanic*, 🕷️🦸‍♂️ = *Spider-Man*, 🦖🏝️ = *Jurassic Park*).
- **Progressive Hints**: Unlock hints including release year, director, and famous dialogue quotes.
- **Scoreboard**: Award points to friends who buzz in first!

---

### 4. 🎵 Guess the Song Name
- **Synthesized 8-Bit Audio**: Real-time musical notes generated directly in the browser via Web Audio API (*Happy Birthday, Shape of You, Believer, Never Gonna Give You Up, Stayin' Alive, Super Mario, etc.*).
- **Emoji & Lyric Clues**: Clues for players to guess the track title and artist.

---

### 5. 🔥 Party Extras & Icebreakers
- **🍾 Spin the Bottle & Truth or Dare**: Interactive spinning bottle physics with fun and spicy dares.
- **👀 Most Likely To...**: Hilarious dilemma questions for the group.
- **⚡ 5-Second Rule**: Intense ticking 5-second countdown buzzer!

---

## 🚀 How to Run the App

### Option 1: Double-click `run.bat`
Just double click `run.bat` in the folder. It will start the server and open your browser!

### Option 2: Command Line
Open PowerShell or Command Prompt in this folder and run:
```powershell
py app.py
```

Then visit:
- On your computer: `http://localhost:5000`
- On any friend's smartphone / tablet on the same Wi-Fi: `http://192.168.0.199:5000` (or check your local IPv4 address).

---

## 🛠️ Architecture & Tech Stack
- **Backend**: Python 3 + Flask (lightweight, zero external dependencies needed).
- **Real-time Sync**: Server-Sent Events (SSE) and fast polling for cross-device room updates.
- **Audio Synthesizer**: Web Audio API (instant, high performance sound effects and musical tunes without external audio files).
- **Confetti Engine**: Native HTML5 Canvas particle system.
- **UI Design**: Modern Cyber-Party aesthetic with responsive glassmorphism, glowing accents, and mobile-friendly touch targets.

