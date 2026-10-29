"""
Party Games Hub - Multiplayer Backend
Features:
- Animal Matching Card Game (3 players, 12 cards: 4 Lion, 4 Tiger, 4 Elephant)
- The Imposter (Social deduction party game)
- Guess the Movie Name (Emoji riddles, actor hints, charades)
- Guess the Song Name (8-bit synth melodies, lyrics, emoji songs)
- Truth or Dare, Most Likely To, and 5-Second Rule
- Real-time room sync via SSE & Fast Polling
- Pass & Play (Local single device) + Multi-device Wi-Fi rooms + Bot simulation
"""

import json
import random
import string
import time
import threading
from flask import Flask, render_template, request, jsonify, Response

app = Flask(__name__)
app.config['SECRET_KEY'] = 'partygames-super-secret-key-2026'

# Global Rooms State
ROOMS = {}
ROOMS_LOCK = threading.Lock()

def generate_room_code():
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    for _ in range(100):
        code = "".join(random.choice(chars) for _ in range(4))
        if code not in ROOMS:
            return code
    return "".join(random.choice(chars) for _ in range(5))

# ==================== DATA BANKS ====================

ANIMAL_CARDS = ["lion"] * 4 + ["tiger"] * 4 + ["elephant"] * 4

IMPOSTER_WORD_PAIRS = [
    {"citizen": "Coffee", "imposter": "Tea", "category": "Drinks"},
    {"citizen": "Pizza", "imposter": "Burger", "category": "Food"},
    {"citizen": "Doctor", "imposter": "Nurse", "category": "Professions"},
    {"citizen": "Guitar", "imposter": "Violin", "category": "Instruments"},
    {"citizen": "Beach", "imposter": "Desert", "category": "Places"},
    {"citizen": "Airplane", "imposter": "Helicopter", "category": "Vehicles"},
    {"citizen": "Dog", "imposter": "Wolf", "category": "Animals"},
    {"citizen": "Sun", "imposter": "Moon", "category": "Space"},
    {"citizen": "Instagram", "imposter": "TikTok", "category": "Apps"},
    {"citizen": "Football", "imposter": "Basketball", "category": "Sports"},
    {"citizen": "Apple", "imposter": "Orange", "category": "Fruits"},
    {"citizen": "Cinema", "imposter": "Theater", "category": "Entertainment"},
    {"citizen": "Hotel", "imposter": "Hostel", "category": "Places"},
    {"citizen": "Batman", "imposter": "Spider-Man", "category": "Superheroes"},
    {"citizen": "Laptop", "imposter": "Tablet", "category": "Tech"},
    {"citizen": "Whisper", "imposter": "Secret", "category": "Actions"},
    {"citizen": "Ice Cream", "imposter": "Popsicle", "category": "Desserts"},
    {"citizen": "Train", "imposter": "Subway", "category": "Transport"},
    {"citizen": "Chef", "imposter": "Baker", "category": "Jobs"},
    {"citizen": "Mirror", "imposter": "Camera", "category": "Objects"},
    {"citizen": "Sword", "imposter": "Dagger", "category": "Weapons"},
    {"citizen": "Castle", "imposter": "Palace", "category": "Architecture"},
    {"citizen": "Vampire", "imposter": "Zombie", "category": "Monsters"},
    {"citizen": "Gold", "imposter": "Silver", "category": "Treasures"}
]

# 500 Curated Tamil Movies and 500 Tamil Songs
from data_tamil import TAMIL_MOVIES_500 as MOVIE_QUESTIONS, TAMIL_SONGS_500 as SONG_QUESTIONS

TRUTH_OR_DARE_QUESTIONS = {
    "truth": [
        "What is the most embarrassing thing you have ever done in front of a crush?",
        "Have you ever lied to get out of hanging out with someone in this room?",
        "What is your biggest irrational fear or pet peeve?",
        "What is the weirdest habit you have when you are completely alone?",
        "If you could trade lives with one person in this room for a week, who would it be?",
        "What is the most awkward text you sent to the wrong person by mistake?",
        "Have you ever practiced kissing on your hand or a pillow?",
        "What is a secret talent or hobby that nobody here knows you have?",
        "What is the worst haircut or fashion disaster you ever rocked?",
        "If you were guaranteed not to get caught, what harmless prank would you pull right now?",
        "Who was your first celebrity crush?",
        "What is the silly thing you still feel guilty about from childhood?"
    ],
    "dare": [
        "Do your best impression of another player until someone correctly guesses who it is!",
        "Do 10 jumping jacks while loudly singing the chorus of your favorite pop song!",
        "Speak in an outrageous dramatic movie trailer voice for the next 3 rounds!",
        "Let the group look through your recently used emojis and explain the top 3!",
        "Balance a spoon or book on your head and walk across the room without dropping it!",
        "Show the most recent photo in your camera roll (no hiding allowed!)",
        "Pretend you are an animal from the Matching game (Lion, Tiger, Elephant) and make its sound!",
        "Do an impromptu 20-second catwalk fashion show across the room!",
        "Send a message saying 'You will never believe what just happened!' to someone and wait for their reaction!",
        "Keep a completely straight poker face for 60 seconds while everyone else tries to make you laugh!"
    ]
}

MOST_LIKELY_TO = [
    "Most likely to survive a zombie apocalypse?",
    "Most likely to accidentally become famous on TikTok?",
    "Most likely to cry during an animated Disney movie?",
    "Most likely to lose their phone while holding it in their hand?",
    "Most likely to show up 30 minutes late with iced coffee?",
    "Most likely to accidentally join a mysterious cult?",
    "Most likely to talk their way out of a speeding ticket?",
    "Most likely to become a billionaire and never tell anyone?",
    "Most likely to sleep through a fire alarm?",
    "Most likely to trip over nothing while walking flat ground?",
    "Most likely to win a reality TV survival show?",
    "Most likely to spend their entire paycheck in one weekend on snacks and online shopping?"
]

FIVE_SECOND_TOPICS = [
    "Name 3 animals with spots or stripes!",
    "Name 3 pizza toppings you would never want!",
    "Name 3 things you can find in a refrigerator!",
    "Name 3 superheroes that wear capes!",
    "Name 3 movie villains everyone loves to hate!",
    "Name 3 excuses people use when running late!",
    "Name 3 countries that start with the letter 'M'!",
    "Name 3 things people do when nobody is watching!",
    "Name 3 green fruits or vegetables!",
    "Name 3 things you shouldn't say on a first date!",
    "Name 3 songs everyone knows the lyrics to!",
    "Name 3 things you pack for an island vacation!"
]

# ==================== ROOM HELPERS ====================

def get_room(room_code):
    return ROOMS.get(room_code.upper())

def update_room_version(room):
    room["version"] = room.get("version", 0) + 1
    room["last_active"] = time.time()

def create_new_room(host_name, game_type="hub"):
    code = generate_room_code()
    player_id = "p_" + "".join(random.choice(string.ascii_lowercase + string.digits) for _ in range(6))
    
    avatars = ["🦁", "🐯", "🐘", "🦊", "🐼", "🦄", "🐶", "🐱", "🦉", "🐸"]
    avatar = random.choice(avatars)
    
    room = {
        "code": code,
        "created_at": time.time(),
        "last_active": time.time(),
        "version": 1,
        "game_type": game_type,
        "host_id": player_id,
        "players": [
            {
                "id": player_id,
                "name": host_name[:16] or "Host",
                "avatar": avatar,
                "is_host": True,
                "is_bot": False,
                "score": 0
            }
        ],
        "game_state": {}
    }
    
    # Initialize game-specific state
    init_game_state(room, game_type)
    
    with ROOMS_LOCK:
        ROOMS[code] = room
        
    return room, player_id

def init_game_state(room, game_type):
    room["game_type"] = game_type
    
    if game_type == "animal_matching":
        room["game_state"] = {
            "status": "waiting", # waiting, playing, exchanging, game_over
            "round": 0,
            "hands": {},         # player_id -> [str]
            "pass_selections": {}, # player_id -> card_index (int)
            "winner": None,
            "win_animal": None,
            "history": []
        }
    elif game_type == "imposter":
        room["game_state"] = {
            "status": "lobby", # lobby, role_reveal, clue_phase, voting, revealed
            "round": 0,
            "secret_pair": None,
            "roles": {},        # player_id -> "citizen" / "imposter"
            "words": {},        # player_id -> str
            "clue_turn_index": 0,
            "clues": [],        # list of {player_id, player_name, clue}
            "votes": {},        # voter_id -> target_player_id
            "imposter_id": None,
            "voted_out_id": None,
            "imposter_won": None
        }
    elif game_type == "guess_movie":
        sampled_10 = random.sample(range(len(MOVIE_QUESTIONS)), min(10, len(MOVIE_QUESTIONS)))
        room["game_state"] = {
            "status": "playing",
            "round_number": 1,
            "current_index": 0,
            "total_in_round": 10,
            "question_order": sampled_10,
            "revealed_hints": 0,
            "scores": {},
            "round_over": False,
            "round_completed": False
        }
    elif game_type == "guess_song":
        sampled_10 = random.sample(range(len(SONG_QUESTIONS)), min(10, len(SONG_QUESTIONS)))
        room["game_state"] = {
            "status": "playing",
            "round_number": 1,
            "current_index": 0,
            "total_in_round": 10,
            "question_order": sampled_10,
            "revealed_clues": 0,
            "scores": {},
            "round_over": False,
            "round_completed": False
        }
    elif game_type == "party_extras":
        room["game_state"] = {
            "sub_game": "truth_dare", # truth_dare, most_likely, five_second
            "current_item": None,
            "category": "truth",
            "timer_seconds": 5,
            "bottle_angle": 0,
            "selected_player_id": None
        }
    else: # Hub lobby
        room["game_state"] = {"status": "hub"}
        
    update_room_version(room)

# ==================== ANIMAL MATCHING LOGIC ====================

def setup_animal_matching_game(room):
    # Requirements: Exactly 3 players.
    # If fewer than 3, add friendly bot players.
    current_players = room["players"]
    bot_names = [("Bot Leo 🦁", "🦁"), ("Bot Maya 🐯", "🐯"), ("Bot Jumbo 🐘", "🐘")]
    bot_idx = 0
    while len(current_players) < 3:
        b_name, b_av = bot_names[bot_idx % len(bot_names)]
        bot_idx += 1
        b_id = f"bot_{bot_idx}_{random.randint(100, 999)}"
        current_players.append({
            "id": b_id,
            "name": b_name,
            "avatar": b_av,
            "is_host": False,
            "is_bot": True,
            "score": 0
        })

    # Shuffle the 12 cards (4 Lion, 4 Tiger, 4 Elephant)
    deck = list(ANIMAL_CARDS)
    random.shuffle(deck)
    
    # Distribute 4 cards to each of the 3 players
    hands = {}
    for i in range(3):
        p_id = current_players[i]["id"]
        hands[p_id] = deck[i*4 : (i+1)*4]
        
    room["game_state"] = {
        "status": "playing",
        "round": 1,
        "hands": hands,
        "pass_selections": {},
        "winner": None,
        "win_animal": None,
        "history": ["Cards dealt! Pick one card to pass clockwise."]
    }
    
    # Check if someone miraculously got 4 of the same upon initial deal
    check_animal_matching_winner(room)
    update_room_version(room)

def check_animal_matching_winner(room):
    gs = room["game_state"]
    hands = gs["hands"]
    for p in room["players"][:3]:
        p_id = p["id"]
        hand = hands.get(p_id, [])
        if len(hand) == 4 and len(set(hand)) == 1:
            gs["status"] = "game_over"
            gs["winner"] = p_id
            gs["win_animal"] = hand[0]
            p["score"] += 1
            gs["history"].append(f"🏆 {p['name']} collected all 4 {hand[0].capitalize()} cards and won the game!")
            return True
    return False

def bot_choose_pass_card(hand):
    # Strategy: Count frequencies of animals in hand.
    # Keep the animal with highest count.
    # Pass away a card of the animal with the lowest count.
    counts = {}
    for card in hand:
        counts[card] = counts.get(card, 0) + 1
        
    # Sort animals by count descending (e.g. 2 lions, 1 tiger, 1 elephant)
    # The lowest count animal is discarded.
    sorted_animals = sorted(counts.items(), key=lambda x: x[1])
    least_common_animal = sorted_animals[0][0]
    
    # Find index of that card in hand
    for idx, card in enumerate(hand):
        if card == least_common_animal:
            return idx
    return 0

def process_animal_turn_if_ready(room):
    gs = room["game_state"]
    if gs["status"] != "playing":
        return
        
    players = room["players"][:3]
    
    # Auto-pick for bots
    for p in players:
        p_id = p["id"]
        if p["is_bot"] and p_id not in gs["pass_selections"]:
            hand = gs["hands"][p_id]
            card_idx = bot_choose_pass_card(hand)
            gs["pass_selections"][p_id] = card_idx
            
    # Check if all 3 players have made their pass selection
    all_ready = all(p["id"] in gs["pass_selections"] for p in players)
    if not all_ready:
        return
        
    # Perform simultaneous exchange clockwise:
    # Player 0 gives to Player 1
    # Player 1 gives to Player 2
    # Player 2 gives to Player 0
    p0_id = players[0]["id"]
    p1_id = players[1]["id"]
    p2_id = players[2]["id"]
    
    c0_idx = gs["pass_selections"][p0_id]
    c1_idx = gs["pass_selections"][p1_id]
    c2_idx = gs["pass_selections"][p2_id]
    
    card0 = gs["hands"][p0_id].pop(c0_idx)
    card1 = gs["hands"][p1_id].pop(c1_idx)
    card2 = gs["hands"][p2_id].pop(c2_idx)
    
    gs["hands"][p1_id].append(card0)
    gs["hands"][p2_id].append(card1)
    gs["hands"][p0_id].append(card2)
    
    gs["pass_selections"] = {}
    gs["round"] += 1
    gs["history"].append(f"Round {gs['round']}: Cards passed clockwise!")
    
    # Check win condition
    if not check_animal_matching_winner(room):
        gs["status"] = "playing"
        
    update_room_version(room)

# ==================== FLASK ROUTES ====================

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/room/create", methods=["POST"])
def api_create_room():
    data = request.get_json() or {}
    host_name = data.get("host_name", "Player 1")
    game_type = data.get("game_type", "hub")
    room, player_id = create_new_room(host_name, game_type)
    return jsonify({
        "success": True,
        "room_code": room["code"],
        "player_id": player_id,
        "room": room
    })

@app.route("/api/room/join", methods=["POST"])
def api_join_room():
    data = request.get_json() or {}
    room_code = (data.get("room_code") or "").upper().strip()
    player_name = (data.get("player_name") or "Player")[:16]
    
    with ROOMS_LOCK:
        room = get_room(room_code)
        if not room:
            return jsonify({"success": False, "error": "Room not found. Check the code!"}), 404
            
        # Check if already joined (by name or re-joining)
        existing = [p for p in room["players"] if p["name"].lower() == player_name.lower() and not p["is_bot"]]
        if existing:
            player_id = existing[0]["id"]
            return jsonify({"success": True, "room_code": room["code"], "player_id": player_id, "room": room})
            
        if len(room["players"]) >= 10:
            return jsonify({"success": False, "error": "Room is full (max 10 players)."}), 400
            
        player_id = "p_" + "".join(random.choice(string.ascii_lowercase + string.digits) for _ in range(6))
        avatars = ["🦁", "🐯", "🐘", "🦊", "🐼", "🦄", "🐶", "🐱", "🦉", "🐸", "🐻", "🐨"]
        used_avatars = {p["avatar"] for p in room["players"]}
        available_avatars = [a for a in avatars if a not in used_avatars] or avatars
        avatar = random.choice(available_avatars)
        
        # Replace a bot if joining animal matching with bot present
        bot_slot = next((i for i, p in enumerate(room["players"]) if p.get("is_bot")), None)
        if bot_slot is not None and room["game_type"] == "animal_matching" and room["game_state"].get("status") == "waiting":
            old_bot_id = room["players"][bot_slot]["id"]
            room["players"][bot_slot] = {
                "id": player_id,
                "name": player_name,
                "avatar": avatar,
                "is_host": False,
                "is_bot": False,
                "score": 0
            }
        else:
            room["players"].append({
                "id": player_id,
                "name": player_name,
                "avatar": avatar,
                "is_host": False,
                "is_bot": False,
                "score": 0
            })
            
        update_room_version(room)
        
    return jsonify({"success": True, "room_code": room["code"], "player_id": player_id, "room": room})

@app.route("/api/room/state/<room_code>", methods=["GET"])
def api_room_state(room_code):
    player_id = request.args.get("player_id")
    with ROOMS_LOCK:
        room = get_room(room_code)
        if not room:
            return jsonify({"success": False, "error": "Room not found"}), 404
        
        # Build masked view if necessary (e.g. In animal matching or imposter,
        # don't expose other players' hands or imposter identity before reveal)
        safe_room = sanitize_room_for_player(room, player_id)
        return jsonify({"success": True, "room": safe_room})

def sanitize_room_for_player(room, player_id):
    # Shallow copy
    sr = dict(room)
    gs = dict(room["game_state"])
    sr["game_state"] = gs
    
    # In Animal Matching: Hand of the current player is visible.
    # Other players' hands show only card count, unless game_over!
    if room["game_type"] == "animal_matching" and gs.get("status") in ("playing", "exchanging"):
        masked_hands = {}
        for pid, hand in gs.get("hands", {}).items():
            if pid == player_id:
                masked_hands[pid] = list(hand)
            else:
                masked_hands[pid] = ["hidden"] * len(hand)
        gs["hands"] = masked_hands
        
    # In Imposter: Hide other roles and words during secret/clue/voting phases
    if room["game_type"] == "imposter" and gs.get("status") in ("role_reveal", "clue_phase", "voting"):
        # Hide all roles and words except for the asking player
        my_role = gs.get("roles", {}).get(player_id)
        my_word = gs.get("words", {}).get(player_id)
        gs["roles"] = {player_id: my_role} if my_role else {}
        gs["words"] = {player_id: my_word} if my_word else {}
        gs["imposter_id"] = None
        gs["secret_pair"] = None
        
    return sr

@app.route("/api/room/action", methods=["POST"])
def api_room_action():
    data = request.get_json() or {}
    room_code = (data.get("room_code") or "").upper().strip()
    player_id = data.get("player_id")
    action = data.get("action")
    payload = data.get("payload") or {}
    
    with ROOMS_LOCK:
        room = get_room(room_code)
        if not room:
            return jsonify({"success": False, "error": "Room not found"}), 404
            
        player = next((p for p in room["players"] if p["id"] == player_id), None)
        if not player:
            return jsonify({"success": False, "error": "Player not in room"}), 403
            
        # Global Game Switch
        if action == "switch_game":
            if not player["is_host"]:
                return jsonify({"success": False, "error": "Only host can switch games"}), 403
            target_game = payload.get("game_type", "hub")
            init_game_state(room, target_game)
            update_room_version(room)
            return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})
            
        # ================= ANIMAL MATCHING ACTIONS =================
        if room["game_type"] == "animal_matching":
            gs = room["game_state"]
            
            if action == "start_animal_game":
                if not player["is_host"]:
                    return jsonify({"success": False, "error": "Only host can start"}), 403
                setup_animal_matching_game(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})
                
            elif action == "pass_card":
                card_index = payload.get("card_index")
                if gs.get("status") != "playing":
                    return jsonify({"success": False, "error": "Round not active"}), 400
                if card_index is None or card_index < 0 or card_index >= len(gs["hands"].get(player_id, [])):
                    return jsonify({"success": False, "error": "Invalid card selected"}), 400
                    
                gs["pass_selections"][player_id] = card_index
                update_room_version(room)
                
                # Check if all 3 passed (including bots)
                process_animal_turn_if_ready(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})
                
            elif action == "restart_animal_game":
                if not player["is_host"]:
                    return jsonify({"success": False, "error": "Only host can restart"}), 403
                setup_animal_matching_game(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})

        # ================= IMPOSTER ACTIONS =================
        elif room["game_type"] == "imposter":
            gs = room["game_state"]
            
            if action == "start_imposter_game":
                if not player["is_host"]:
                    return jsonify({"success": False, "error": "Only host can start"}), 403
                if len(room["players"]) < 3:
                    return jsonify({"success": False, "error": "Need at least 3 players"}), 400
                    
                # Pick secret pair
                pair = random.choice(IMPOSTER_WORD_PAIRS)
                players = room["players"]
                imposter_player = random.choice(players)
                
                roles = {}
                words = {}
                for p in players:
                    if p["id"] == imposter_player["id"]:
                        roles[p["id"]] = "imposter"
                        words[p["id"]] = pair["imposter"] # Undercover word or alert
                    else:
                        roles[p["id"]] = "citizen"
                        words[p["id"]] = pair["citizen"]
                        
                gs["status"] = "role_reveal"
                gs["round"] = gs.get("round", 0) + 1
                gs["secret_pair"] = pair
                gs["imposter_id"] = imposter_player["id"]
                gs["roles"] = roles
                gs["words"] = words
                gs["clues"] = []
                gs["votes"] = {}
                gs["voted_out_id"] = None
                gs["imposter_won"] = None
                gs["clue_turn_index"] = 0
                update_room_version(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})
                
            elif action == "proceed_to_clues":
                gs["status"] = "clue_phase"
                update_room_version(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})
                
            elif action == "submit_clue":
                clue_text = (payload.get("clue") or "").strip()
                if not clue_text:
                    return jsonify({"success": False, "error": "Clue cannot be empty"}), 400
                gs["clues"].append({
                    "player_id": player["id"],
                    "player_name": player["name"],
                    "avatar": player["avatar"],
                    "clue": clue_text
                })
                gs["clue_turn_index"] = (gs.get("clue_turn_index", 0) + 1)
                update_room_version(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})
                
            elif action == "start_voting":
                gs["status"] = "voting"
                gs["votes"] = {}
                update_room_version(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})
                
            elif action == "cast_vote":
                target_id = payload.get("target_id")
                if not target_id:
                    return jsonify({"success": False, "error": "Select a player to vote for"}), 400
                gs["votes"][player_id] = target_id
                
                # Check if all human players voted
                human_players = [p for p in room["players"] if not p.get("is_bot")]
                if len(gs["votes"]) >= len(human_players):
                    # Tally votes
                    tally = {}
                    for v_target in gs["votes"].values():
                        tally[v_target] = tally.get(v_target, 0) + 1
                    sorted_tally = sorted(tally.items(), key=lambda x: x[1], reverse=True)
                    voted_out = sorted_tally[0][0]
                    gs["voted_out_id"] = voted_out
                    gs["status"] = "revealed"
                    # Imposter caught?
                    if voted_out == gs["imposter_id"]:
                        gs["imposter_won"] = False
                        # Citizens get points
                        for p in room["players"]:
                            if p["id"] != gs["imposter_id"]:
                                p["score"] += 1
                    else:
                        gs["imposter_won"] = True
                        # Imposter gets points
                        for p in room["players"]:
                            if p["id"] == gs["imposter_id"]:
                                p["score"] += 3
                                
                update_room_version(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})

        # ================= GUESS THE MOVIE ACTIONS =================
        elif room["game_type"] == "guess_movie":
            gs = room["game_state"]
            
            if action == "next_movie":
                order = gs.get("question_order") or []
                curr = gs.get("current_index", 0)
                if curr + 1 >= len(order):
                    gs["status"] = "round_summary"
                    gs["round_completed"] = True
                else:
                    gs["current_index"] = curr + 1
                    gs["revealed_hints"] = 0
                    gs["status"] = "playing"
                    gs["round_over"] = False
                update_room_version(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})
                
            elif action == "start_next_movie_round":
                gs["round_number"] = gs.get("round_number", 1) + 1
                gs["question_order"] = random.sample(range(len(MOVIE_QUESTIONS)), min(10, len(MOVIE_QUESTIONS)))
                gs["current_index"] = 0
                gs["total_in_round"] = 10
                gs["revealed_hints"] = 0
                gs["status"] = "playing"
                gs["round_over"] = False
                gs["round_completed"] = False
                update_room_version(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})
                
            elif action == "reveal_hint":
                curr_q = MOVIE_QUESTIONS[gs["question_order"][gs["current_index"]]]
                max_hints = len(curr_q["hints"])
                if gs["revealed_hints"] < max_hints:
                    gs["revealed_hints"] += 1
                update_room_version(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})
                
            elif action == "reveal_movie_answer":
                gs["round_over"] = True
                update_room_version(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})
                
            elif action == "award_movie_point":
                awarded_id = payload.get("player_id") or player_id
                target = next((p for p in room["players"] if p["id"] == awarded_id), None)
                if target:
                    target["score"] += 1
                gs["round_over"] = True
                update_room_version(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})

        # ================= GUESS THE SONG ACTIONS =================
        elif room["game_type"] == "guess_song":
            gs = room["game_state"]
            
            if action == "next_song":
                order = gs.get("question_order") or []
                curr = gs.get("current_index", 0)
                if curr + 1 >= len(order):
                    gs["status"] = "round_summary"
                    gs["round_completed"] = True
                else:
                    gs["current_index"] = curr + 1
                    gs["revealed_clues"] = 0
                    gs["status"] = "playing"
                    gs["round_over"] = False
                update_room_version(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})
                
            elif action == "start_next_song_round":
                gs["round_number"] = gs.get("round_number", 1) + 1
                gs["question_order"] = random.sample(range(len(SONG_QUESTIONS)), min(10, len(SONG_QUESTIONS)))
                gs["current_index"] = 0
                gs["total_in_round"] = 10
                gs["revealed_clues"] = 0
                gs["status"] = "playing"
                gs["round_over"] = False
                gs["round_completed"] = False
                update_room_version(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})
                
            elif action == "reveal_song_clue":
                gs["revealed_clues"] = min(2, gs.get("revealed_clues", 0) + 1)
                update_room_version(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})
                
            elif action == "reveal_song_answer":
                gs["round_over"] = True
                update_room_version(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})
                
            elif action == "award_song_point":
                awarded_id = payload.get("player_id") or player_id
                target = next((p for p in room["players"] if p["id"] == awarded_id), None)
                if target:
                    target["score"] += 1
                gs["round_over"] = True
                update_room_version(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})

        # ================= PARTY EXTRAS ACTIONS =================
        elif room["game_type"] == "party_extras":
            gs = room["game_state"]
            sub = payload.get("sub_game") or gs.get("sub_game", "truth_dare")
            gs["sub_game"] = sub
            
            if action == "spin_bottle":
                target_p = random.choice(room["players"])
                gs["selected_player_id"] = target_p["id"]
                # 360 * 3 to 6 + random rotation
                gs["bottle_angle"] = gs.get("bottle_angle", 0) + random.randint(1080, 2160)
                update_room_version(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})
                
            elif action == "draw_truth_dare":
                mode = payload.get("mode", "truth") # truth or dare
                items = TRUTH_OR_DARE_QUESTIONS[mode]
                gs["current_item"] = random.choice(items)
                gs["category"] = mode
                update_room_version(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})
                
            elif action == "draw_most_likely":
                gs["current_item"] = random.choice(MOST_LIKELY_TO)
                update_room_version(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})
                
            elif action == "draw_five_second":
                gs["current_item"] = random.choice(FIVE_SECOND_TOPICS)
                gs["timer_seconds"] = 5
                update_room_version(room)
                return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})

    return jsonify({"success": True, "room": sanitize_room_for_player(room, player_id)})

# SSE Stream for instantaneous live updates across phones/devices
@app.route("/api/stream/<room_code>/<player_id>")
def sse_stream(room_code, player_id):
    def event_generator():
        last_version = -1
        while True:
            with ROOMS_LOCK:
                room = get_room(room_code)
                if not room:
                    yield f"event: error\ndata: {json.dumps({'error': 'Room closed'})}\n\n"
                    break
                    
                curr_version = room.get("version", 0)
                if curr_version != last_version:
                    last_version = curr_version
                    safe = sanitize_room_for_player(room, player_id)
                    yield f"event: update\ndata: {json.dumps(safe)}\n\n"
                    
            time.sleep(0.3)
            # SSE comment heartbeat to prevent timeout
            yield ": ping\n\n"
            
    return Response(event_generator(), mimetype="text/event-stream")

# Static data route for client-side offline / single-device mode
@app.route("/api/content/all", methods=["GET"])
def api_get_all_content():
    return jsonify({
        "movies": MOVIE_QUESTIONS,
        "songs": SONG_QUESTIONS,
        "imposter_pairs": IMPOSTER_WORD_PAIRS,
        "truth_or_dare": TRUTH_OR_DARE_QUESTIONS,
        "most_likely": MOST_LIKELY_TO,
        "five_second": FIVE_SECOND_TOPICS
    })

import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

if __name__ == "__main__":
    print("=" * 60)
    print("[PARTY GAMES] Party Games Hub is starting up!")
    print("Local PC:      http://localhost:5000")
    print("Friends WiFi:  http://192.168.0.199:5000")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=False)
