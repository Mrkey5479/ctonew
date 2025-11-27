class HappyDouDizhuGame {
  constructor() {
    this.suits = [
      { symbol: "♠", name: "Spades", color: "black", order: 0 },
      { symbol: "♥", name: "Hearts", color: "red", order: 1 },
      { symbol: "♣", name: "Clubs", color: "black", order: 2 },
      { symbol: "♦", name: "Diamonds", color: "red", order: 3 }
    ];

    this.ranks = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2", "SJ", "BJ"];

    this.valueMap = {
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "10": 10,
      J: 11,
      Q: 12,
      K: 13,
      A: 14,
      "2": 15,
      SJ: 16,
      BJ: 17
    };

    this.rankFriendlyName = {
      SJ: "Small Joker",
      BJ: "Big Joker",
      J: "Jack",
      Q: "Queen",
      K: "King",
      A: "Ace",
      "2": "Two"
    };

    this.dom = {
      status: document.getElementById("game-status"),
      turnIndicator: document.getElementById("turn-indicator"),
      currentPlay: document.getElementById("current-play"),
      playHistory: document.getElementById("play-history"),
      playerHand: document.getElementById("player-hand"),
      playerRole: document.getElementById("player-role"),
      playerCardCount: document.getElementById("player-card-count"),
      playBtn: document.getElementById("play-btn"),
      passBtn: document.getElementById("pass-btn"),
      restartBtns: document.querySelectorAll("[data-restart]"),
      opponents: {
        left: {
          container: document.querySelector('.opponent[data-player="left"]'),
          name: document.getElementById("left-name"),
          role: document.getElementById("left-role"),
          count: document.getElementById("left-count"),
          cards: document.getElementById("left-cards")
        },
        right: {
          container: document.querySelector('.opponent[data-player="right"]'),
          name: document.getElementById("right-name"),
          role: document.getElementById("right-role"),
          count: document.getElementById("right-count"),
          cards: document.getElementById("right-cards")
        }
      },
      playerPanel: document.querySelector(".player-panel")
    };

    this.state = {
      players: [],
      history: [],
      currentPlayerIndex: 0,
      currentCombo: null,
      passesInRow: 0,
      winner: null,
      statusMessage: ""
    };

    this.selectedCardIds = new Set();
    this.aiTimer = null;
  }

  init() {
    this.bindUI();
    this.startNewGame();
  }

  bindUI() {
    this.dom.playBtn.addEventListener("click", () => this.handlePlayerPlay());
    this.dom.passBtn.addEventListener("click", () => this.handlePlayerPass());
    this.dom.restartBtns.forEach((btn) =>
      btn.addEventListener("click", () => this.startNewGame())
    );
  }

  startNewGame() {
    if (this.aiTimer) {
      clearTimeout(this.aiTimer);
    }
    this.aiTimer = null;

    this.selectedCardIds.clear();
    this.state = {
      players: [],
      history: [],
      currentPlayerIndex: 0,
      currentCombo: null,
      passesInRow: 0,
      winner: null,
      statusMessage: ""
    };

    this.setupPlayers();
    const landlord = this.state.players[this.state.currentPlayerIndex];
    this.logHistory({ player: "Game", action: `${landlord.name} becomes the landlord.` });
    this.setStatus(
      `${landlord.name} is the landlord. ${
        landlord.id === "player" ? "You" : "They"
      } will lead the opening move.`
    );

    this.renderAll();
    this.handleTurn();
  }

  setupPlayers() {
    const deck = this.createDeck();
    this.shuffle(deck);

    const players = [
      { id: "left", name: "Luna (AI)", type: "ai", role: "farmer", hand: [] },
      { id: "player", name: "You", type: "human", role: "farmer", hand: [] },
      { id: "right", name: "Orion (AI)", type: "ai", role: "farmer", hand: [] }
    ];

    for (let i = 0; i < 17; i += 1) {
      players[0].hand.push(deck.pop());
      players[1].hand.push(deck.pop());
      players[2].hand.push(deck.pop());
    }

    const landlordIndex = Math.floor(Math.random() * players.length);
    players[landlordIndex].role = "landlord";
    while (deck.length) {
      players[landlordIndex].hand.push(deck.pop());
    }

    players.forEach((player) => this.sortHand(player.hand));

    this.state.players = players;
    this.state.currentPlayerIndex = landlordIndex;
  }

  createDeck() {
    const deck = [];
    let idCounter = 0;
    const ranksWithoutJokers = this.ranks.filter((rank) => rank !== "SJ" && rank !== "BJ");

    for (const suit of this.suits) {
      for (const rank of ranksWithoutJokers) {
        const cardId = `card-${++idCounter}`;
        deck.push({
          id: cardId,
          rank,
          displayRank: rank,
          suitSymbol: suit.symbol,
          suitOrder: suit.order,
          color: suit.color,
          value: this.valueMap[rank],
          label: `${rank}${suit.symbol}`,
          isJoker: false
        });
      }
    }

    deck.push({
      id: `card-${++idCounter}`,
      rank: "SJ",
      displayRank: "SJ",
      suitSymbol: "🃏",
      suitOrder: 4,
      color: "black",
      value: this.valueMap.SJ,
      label: "Small Joker",
      isJoker: true
    });

    deck.push({
      id: `card-${++idCounter}`,
      rank: "BJ",
      displayRank: "BJ",
      suitSymbol: "🃏",
      suitOrder: 4,
      color: "red",
      value: this.valueMap.BJ,
      label: "Big Joker",
      isJoker: true
    });

    return deck;
  }

  shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  sortHand(hand) {
    hand.sort((a, b) => {
      if (a.value === b.value) {
        return a.suitOrder - b.suitOrder;
      }
      return a.value - b.value;
    });
  }

  renderAll() {
    this.renderOpponents();
    this.renderPlayerHand();
    this.renderCurrentCombo();
    this.renderHistory();
    this.updateStatusBar();
    this.updateActionButtons();
    this.highlightActivePlayer();
  }

  renderPlayerHand() {
    const player = this.getPlayer("player");
    this.sortHand(player.hand);
    this.dom.playerHand.innerHTML = "";

    player.hand.forEach((card) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `card${card.color === "red" ? " red" : ""}${
        this.selectedCardIds.has(card.id) ? " selected" : ""
      }`;
      button.innerHTML = this.getCardTemplate(card);
      button.dataset.cardId = card.id;
      button.setAttribute("aria-pressed", this.selectedCardIds.has(card.id));
      button.title = card.label;
      button.addEventListener("click", () => this.toggleCardSelection(card.id));
      this.dom.playerHand.appendChild(button);
    });

    if (!player.hand.length) {
      this.dom.playerHand.innerHTML = '<p class="placeholder">No cards in hand.</p>';
    }
  }

  renderOpponents() {
    this.state.players
      .filter((player) => player.type === "ai")
      .forEach((player) => {
        const refs = this.dom.opponents[player.id];
        if (!refs) return;
        refs.name.textContent = player.name;
        refs.role.textContent = this.getRoleLabel(player);
        refs.count.textContent = `${player.hand.length} cards`;
        refs.cards.innerHTML = "";
        const visibleCards = Math.min(player.hand.length, 16);
        for (let i = 0; i < visibleCards; i += 1) {
          const span = document.createElement("span");
          span.className = "card-back";
          span.style.animationDelay = `${i * 60}ms`;
          refs.cards.appendChild(span);
        }
      });
  }

  renderCurrentCombo() {
    this.dom.currentPlay.innerHTML = "";
    if (!this.state.currentCombo) {
      this.dom.currentPlay.innerHTML = '<p class="placeholder">No active combo. Lead with any valid play.</p>';
      return;
    }

    const header = document.createElement("p");
    header.className = "current-play-header";
    header.textContent = `${this.state.currentCombo.ownerName} played ${this.state.currentCombo.label}`;

    const cardsWrap = document.createElement("div");
    cardsWrap.className = "current-play-cards";
    this.state.currentCombo.cards.forEach((card) => {
      cardsWrap.appendChild(this.createCardFace(card, "played-card"));
    });

    this.dom.currentPlay.append(header, cardsWrap);
  }

  renderHistory() {
    const container = this.dom.playHistory;
    container.innerHTML = "";

    if (!this.state.history.length) {
      container.innerHTML = '<p class="placeholder">Every move will appear here.</p>';
      return;
    }

    this.state.history.slice(-12).forEach((entry) => {
      const block = document.createElement("div");
      block.className = "history-entry";

      const line = document.createElement("div");
      line.innerHTML = `<span class="actor">${entry.player}</span> <span class="action-text">${entry.action}</span>`;
      block.appendChild(line);

      if (entry.cards && entry.cards.length) {
        const cardsWrap = document.createElement("div");
        cardsWrap.className = "history-cards";
        entry.cards.forEach((card) => cardsWrap.appendChild(this.createCardFace(card, "mini")));
        block.appendChild(cardsWrap);
      }

      if (entry.result) {
        const result = document.createElement("span");
        result.className = "result-text";
        result.textContent = entry.result;
        block.appendChild(result);
      }

      container.appendChild(block);
    });

    container.scrollTop = container.scrollHeight;
  }

  updateStatusBar() {
    const player = this.getPlayer("player");
    this.dom.playerRole.textContent = this.getRoleLabel(player);
    this.dom.playerCardCount.textContent = `${player.hand.length}`;
    this.dom.status.textContent = this.state.statusMessage;
    this.updateTurnIndicator();
  }

  updateTurnIndicator() {
    if (this.state.winner) {
      this.dom.turnIndicator.textContent = `${this.state.winner.name} wins the game!`;
      return;
    }
    const current = this.state.players[this.state.currentPlayerIndex];
    this.dom.turnIndicator.textContent = `Turn: ${current.name} · ${this.getRoleLabel(current)}`;
  }

  updateActionButtons() {
    const isPlayerTurn = this.isPlayerTurn() && !this.state.winner;
    const combo = this.getSelectedCombo();
    const canPlay = combo ? this.canPlayCombo(combo) : false;

    this.dom.playBtn.disabled = !isPlayerTurn || !canPlay;
    this.dom.passBtn.disabled = !isPlayerTurn || !this.state.currentCombo;
  }

  highlightActivePlayer() {
    const activeId = this.state.players[this.state.currentPlayerIndex]?.id;
    document.querySelectorAll(".opponent, .player-panel").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.player === activeId);
    });
  }

  handleTurn() {
    if (this.state.winner) {
      this.updateActionButtons();
      return;
    }

    this.highlightActivePlayer();
    this.updateActionButtons();

    const current = this.state.players[this.state.currentPlayerIndex];
    if (current.type === "ai") {
      this.dom.playBtn.disabled = true;
      this.dom.passBtn.disabled = true;
      const delay = 600 + Math.random() * 700;
      this.aiTimer = window.setTimeout(() => this.handleAITurn(current), delay);
    } else {
      this.setStatus("Select cards to play or pass if you cannot beat the combo.");
    }
  }

  handleAITurn(player) {
    this.aiTimer = null;
    if (this.state.winner) return;

    const combo = this.chooseCombo(player.hand, this.state.currentCombo);
    if (combo) {
      this.commitPlay(player, combo);
    } else {
      this.registerPass(player);
    }

    this.advanceTurn();
  }

  handlePlayerPlay() {
    if (!this.isPlayerTurn() || this.state.winner) return;
    const combo = this.getSelectedCombo();
    if (!combo || !this.canPlayCombo(combo)) {
      this.setStatus("That combination can't be played right now.");
      return;
    }

    this.commitPlay(this.getPlayer("player"), combo);
    this.selectedCardIds.clear();
    this.renderPlayerHand();
    this.advanceTurn();
  }

  handlePlayerPass() {
    if (!this.isPlayerTurn() || this.state.winner || !this.state.currentCombo) return;
    this.registerPass(this.getPlayer("player"));
    this.selectedCardIds.clear();
    this.renderPlayerHand();
    this.advanceTurn();
  }

  commitPlay(player, combo) {
    this.removeCardsFromHand(player.hand, combo.cards);
    this.sortHand(player.hand);
    this.state.currentCombo = {
      ...combo,
      ownerId: player.id,
      ownerName: player.name
    };
    this.state.passesInRow = 0;
    this.logHistory({ player: player.name, action: combo.label, cards: combo.cards });
    this.setStatus(`${player.name} plays ${combo.label}.`);
    this.renderCurrentCombo();
    this.renderOpponents();
    if (player.id === "player") {
      this.renderPlayerHand();
    }
    this.checkForWinner(player);
  }

  registerPass(player) {
    if (!this.state.currentCombo) {
      return;
    }
    this.state.passesInRow += 1;
    this.logHistory({ player: player.name, action: "Pass" });
    this.setStatus(`${player.name} passes.`);

    if (this.state.passesInRow >= this.state.players.length - 1) {
      this.state.currentCombo = null;
      this.state.passesInRow = 0;
      this.setStatus(`${player.name} passes. Fresh round!`);
      this.renderCurrentCombo();
    }
  }

  advanceTurn() {
    if (this.state.winner) {
      this.updateActionButtons();
      return;
    }
    this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
    this.handleTurn();
  }

  chooseCombo(hand, currentCombo) {
    if (!hand.length) return null;

    if (!currentCombo) {
      return this.chooseOpeningCombo(hand);
    }

    switch (currentCombo.type) {
      case "single":
        return this.findHigherSingle(hand, currentCombo.value);
      case "pair":
        return this.findHigherPair(hand, currentCombo.value);
      case "triple":
        return this.findHigherTriple(hand, currentCombo.value);
      default:
        return null;
    }
  }

  chooseOpeningCombo(hand) {
    const lowPair = this.findLowestPair(hand);
    if (hand.length <= 4 && lowPair) {
      return lowPair;
    }
    const sorted = this.getSortedHand(hand);
    return this.buildCombo("single", [sorted[0]]);
  }

  findHigherSingle(hand, value) {
    const sorted = this.getSortedHand(hand);
    for (const card of sorted) {
      if (card.value > value) {
        return this.buildCombo("single", [card]);
      }
    }
    return null;
  }

  findHigherPair(hand, value) {
    const groups = this.groupByValue(hand);
    const values = Object.keys(groups)
      .map(Number)
      .sort((a, b) => a - b);
    for (const val of values) {
      if (groups[val].length >= 2 && val > value) {
        return this.buildCombo("pair", groups[val].slice(0, 2));
      }
    }
    return null;
  }

  findHigherTriple(hand, value) {
    const groups = this.groupByValue(hand);
    const values = Object.keys(groups)
      .map(Number)
      .sort((a, b) => a - b);
    for (const val of values) {
      if (groups[val].length >= 3 && val > value) {
        return this.buildCombo("triple", groups[val].slice(0, 3));
      }
    }
    return null;
  }

  findLowestPair(hand) {
    const groups = this.groupByValue(hand);
    const values = Object.keys(groups)
      .map(Number)
      .sort((a, b) => a - b);
    for (const val of values) {
      if (groups[val].length >= 2) {
        return this.buildCombo("pair", groups[val].slice(0, 2));
      }
    }
    return null;
  }

  groupByValue(hand) {
    return hand.reduce((acc, card) => {
      if (!acc[card.value]) {
        acc[card.value] = [];
      }
      acc[card.value].push(card);
      return acc;
    }, {});
  }

  getSortedHand(hand) {
    return [...hand].sort((a, b) => {
      if (a.value === b.value) return a.suitOrder - b.suitOrder;
      return a.value - b.value;
    });
  }

  getSelectedCombo() {
    const selectedCards = this.getSelectedCards();
    if (!selectedCards.length) return null;
    return this.detectCombo(selectedCards);
  }

  detectCombo(cards) {
    if (!cards.length) return null;
    const uniqueValues = new Set(cards.map((card) => card.value));
    if (cards.length === 1) {
      return this.buildCombo("single", cards);
    }
    if (cards.length === 2 && uniqueValues.size === 1) {
      return this.buildCombo("pair", cards);
    }
    if (cards.length === 3 && uniqueValues.size === 1) {
      return this.buildCombo("triple", cards);
    }
    return null;
  }

  buildCombo(type, cards) {
    const ordered = [...cards].sort((a, b) => a.value - b.value);
    const value = ordered[ordered.length - 1].value;
    const label = this.describeCombo(type, ordered[0].rank);
    return { type, cards: ordered, value, size: ordered.length, label };
  }

  describeCombo(type, rank) {
    const readable = this.rankFriendlyName[rank] || rank;
    switch (type) {
      case "single":
        return `Single ${readable}`;
      case "pair":
        return `Pair of ${readable}s`;
      case "triple":
        return `Triple ${readable}s`;
      default:
        return "";
    }
  }

  canPlayCombo(combo) {
    if (!combo) return false;
    if (!this.state.currentCombo) return true;
    return (
      combo.type === this.state.currentCombo.type &&
      combo.size === this.state.currentCombo.size &&
      combo.value > this.state.currentCombo.value
    );
  }

  removeCardsFromHand(hand, cards) {
    const ids = new Set(cards.map((card) => card.id));
    const remaining = hand.filter((card) => !ids.has(card.id));
    hand.length = 0;
    hand.push(...remaining);
  }

  getSelectedCards() {
    const player = this.getPlayer("player");
    return player.hand.filter((card) => this.selectedCardIds.has(card.id));
  }

  toggleCardSelection(cardId) {
    if (!this.isPlayerTurn() || this.state.winner) return;
    if (this.selectedCardIds.has(cardId)) {
      this.selectedCardIds.delete(cardId);
    } else {
      this.selectedCardIds.add(cardId);
    }
    this.renderPlayerHand();
    this.updateActionButtons();
  }

  isPlayerTurn() {
    return this.state.players[this.state.currentPlayerIndex]?.id === "player";
  }

  setStatus(message) {
    this.state.statusMessage = message;
    this.dom.status.textContent = message;
  }

  getPlayer(id) {
    return this.state.players.find((player) => player.id === id);
  }

  getRoleLabel(player) {
    return player.role === "landlord" ? "Landlord 👑" : "Farmer 🌾";
  }

  logHistory(entry) {
    const payload = {
      player: entry.player,
      action: entry.action,
      cards: entry.cards || [],
      result: entry.result || ""
    };
    this.state.history.push(payload);
    if (this.state.history.length > 30) {
      this.state.history.shift();
    }
    this.renderHistory();
  }

  createCardFace(card, extra = "") {
    const el = document.createElement("div");
    el.className = `card ${card.color === "red" ? "red" : ""} ${extra}`.trim();
    el.innerHTML = this.getCardTemplate(card);
    el.title = card.label;
    return el;
  }

  getCardTemplate(card) {
    const symbol = card.isJoker ? "🃏" : card.suitSymbol;
    return `
      <span class="rank">${card.displayRank}</span>
      <span class="suit">${symbol}</span>
      <span class="corner alt">
        <span class="rank">${card.displayRank}</span>
        <span class="suit">${symbol}</span>
      </span>
    `;
  }

  checkForWinner(player) {
    if (player.hand.length === 0) {
      this.state.winner = player;
      this.logHistory({ player: "Game", action: `${player.name} wins the game!`, result: `${this.getRoleLabel(player)} triumphs!` });
      this.setStatus(`${player.name} wins! ${this.getRoleLabel(player)} prevails.`);
      this.updateTurnIndicator();
      this.updateActionButtons();
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const game = new HappyDouDizhuGame();
  game.init();
  window.happyDouDizhu = game;
});
