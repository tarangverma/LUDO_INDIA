import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import * as gameEngine from "./gameEngine";
import { RoomStore, RoomPlayer } from "./roomStore";

export function setupSocketHandlers(io: Server, socket: Socket, store: RoomStore): void {
  // Create a room
  socket.on("create_room", async (data: { name: string; maxPlayers?: number }, cb: Function) => {
    try {
      const { name, maxPlayers = 4 } = data;
      const roomId = Math.random().toString(36).slice(2, 8).toUpperCase();
      const room = {
        id: roomId,
        hostSocketId: socket.id,
        hostName: name || "Host",
        maxPlayers,
        players: [],
        game: null,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      };
      await store.createRoom(room);
      socket.join(roomId);
      cb?.({ ok: true, roomId });
      io.to(roomId).emit("room_created", { room });
      console.log("room created", roomId);
    } catch (e) {
      console.error("create_room error", e);
      cb?.({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  // Join a room
  socket.on("join_room", async (data: { roomId: string; name: string }, cb: Function) => {
    try {
      const { roomId, name } = data;
      const room = await store.getRoom(roomId);
      if (!room) return cb?.({ ok: false, error: "Room not found" });
      if (room.players.length >= room.maxPlayers) return cb?.({ ok: false, error: "Room full" });

      const playerId = uuidv4();
      const color = gameEngine.COLORS[room.players.length % gameEngine.COLORS.length];
      const player: RoomPlayer = {
        id: playerId,
        name: name || "Anon",
        color,
        socketId: socket.id,
        connected: true,
      };

      room.players.push(player);

      if (room.game) {
        room.game.tokens[playerId] = Array(gameEngine.TOKENS_PER_PLAYER).fill(-1);
        room.game.players.push({
          id: player.id,
          name: player.name,
          color: player.color as gameEngine.PlayerColor,
        });
      }

      if (!room.game && room.players.length >= 2) {
        const playersForGame = room.players.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color as gameEngine.PlayerColor,
        }));
        room.game = gameEngine.createInitialGame(playersForGame);
        io.to(roomId).emit("game_state", { game: room.game });
      }

      await store.setRoom(roomId, room);
      socket.join(roomId);
      io.to(roomId).emit("player_joined", { player, room });
      
      if (room.game) {
         io.to(roomId).emit("game_state", { game: room.game });
      }

      cb?.({ ok: true, playerId, room });
      console.log(`player joined ${player.name} (${playerId}) to ${roomId}`);
    } catch (e) {
      console.error("join_room error", e);
      cb?.({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  // Start game explicitly
  socket.on("start_game", async (data: { roomId: string }, cb: Function) => {
    try {
      const { roomId } = data;
      const room = await store.getRoom(roomId);
      if (!room) return cb?.({ ok: false, error: "Room not found" });
      if (room.players.length < 2) return cb?.({ ok: false, error: "Need at least 2 players" });

      const playersForGame = room.players.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color as gameEngine.PlayerColor,
      }));
      room.game = gameEngine.createInitialGame(playersForGame);
      await store.setRoom(roomId, room);
      io.to(roomId).emit("game_state", { game: room.game });
      cb?.({ ok: true });
      console.log(`game started in ${roomId}, current player: ${room.game.players[room.game.turnIndex]?.name}`);
    } catch (e) {
      console.error("start_game error", e);
      cb?.({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  // Roll dice
  socket.on("roll_dice", async (data: { roomId: string; playerId: string }, cb: Function) => {
    try {
      const { roomId, playerId } = data;
      const room = await store.getRoom(roomId);
      if (!room) return cb?.({ ok: false, error: "Room not found" });

      const game = room.game;
      if (!game) return cb?.({ ok: false, error: "Game not started" });
      if (game.status !== "playing") return cb?.({ ok: false, error: "Game not in playing state" });

      const currentPlayer = game.players[game.turnIndex];
      if (!currentPlayer || currentPlayer.id !== playerId) return cb?.({ ok: false, error: "Not your turn" });

      const dice = gameEngine.rollDice();
      game.dice = dice;
      game.currentPlayerRolls++;
      game.history.push({ type: "dice", by: playerId, value: dice, at: Date.now() });

      await store.setRoom(roomId, room);
      io.to(roomId).emit("dice_result", { value: dice, by: playerId });

      const moves = gameEngine.getAllValidMoves(game, playerId, dice);

      if (moves.length === 0) {
        game.dice = null;
        gameEngine.advanceTurn(game);
        await store.setRoom(roomId, room);
        io.to(roomId).emit("game_state", { game: room.game });
      }

      cb?.({ ok: true, dice, moves });
      console.log(`dice rolled ${dice} by ${playerId} in ${roomId}`);
    } catch (e) {
      console.error("roll_dice error", e);
      cb?.({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  // Move token
  socket.on("move_token", async (data: { roomId: string; playerId: string; move: gameEngine.Move }, cb: Function) => {
    try {
      const { roomId, playerId, move } = data;
      const room = await store.getRoom(roomId);
      if (!room) return cb?.({ ok: false, error: "Room not found" });

      const game = room.game;
      if (!game) return cb?.({ ok: false, error: "Game not started" });

      const currentPlayer = game.players[game.turnIndex];
      if (!currentPlayer || currentPlayer.id !== playerId) return cb?.({ ok: false, error: "Not your turn" });

      const dice = game.dice;
      if (dice == null) return cb?.({ ok: false, error: "Roll dice before moving" });

      const validMoves = gameEngine.getAllValidMoves(game, playerId, dice);
      const found = validMoves.find((m) => m.tokenIndex === move.tokenIndex && m.to === move.to);
      if (!found) return cb?.({ ok: false, error: "Invalid move" });

      const meta = gameEngine.applyMove(game, playerId, move);

      game.dice = null;

      if (!meta.extraTurn) {
        gameEngine.advanceTurn(game);
      }

      await store.setRoom(roomId, room);

      io.to(roomId).emit("move_accepted", { game });

      if (meta.captured.length > 0) {
        io.to(roomId).emit("tokens_captured", { captured: meta.captured });
      }

      if (meta.ended) {
        io.to(roomId).emit("game_over", { winner: meta.winner, game });
      }

      cb?.({ ok: true, meta });
      console.log(`move applied in ${roomId} by ${playerId}`, meta);
    } catch (e) {
      console.error("move_token error", e);
      cb?.({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  // Chat
  socket.on("send_chat", async (data: { roomId: string; playerId: string; text: string }) => {
    try {
      const { roomId, playerId, text } = data;
      const room = await store.getRoom(roomId);
      if (!room) return;

      const player = room.players.find((p) => p.id === playerId) || { name: "anon", id: "" };
      const msg = { from: playerId, name: player.name, text, at: Date.now() };
      io.to(roomId).emit("chat_message", msg);
    } catch (e) {
      console.error("send_chat error", e);
    }
  });

  // Leave room
  socket.on("leave_room", async (data: { roomId: string; playerId: string }, cb: Function) => {
    try {
      const { roomId, playerId } = data;
      const room = await store.getRoom(roomId);
      if (!room) return cb?.({ ok: false, error: "Room not found" });

      room.players = room.players.filter((p) => p.id !== playerId);
      if (room.game) {
        delete room.game.tokens[playerId];
        room.game.players = room.game.players.filter((p) => p.id !== playerId);
        room.game.turnIndex = room.game.turnIndex % Math.max(1, room.game.players.length);
      }

      if (room.players.length === 0) {
        await store.deleteRoom(roomId);
      } else {
        await store.setRoom(roomId, room);
      }

      socket.leave(roomId);
      io.to(roomId).emit("player_left", { playerId, room });
      cb?.({ ok: true });
    } catch (e) {
      console.error("leave_room error", e);
      cb?.({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
    }
  });

  // Handle disconnect
  socket.on("disconnecting", async () => {
    try {
      for (const roomId of socket.rooms) {
        if (roomId === socket.id) continue;
        const room = await store.getRoom(roomId);
        if (!room) continue;

        const p = room.players.find((pl) => pl.socketId === socket.id);
        if (p) {
          p.connected = false;
          await store.setRoom(roomId, room);
          io.to(roomId).emit("player_disconnected", { playerId: p.id });
        }
      }
    } catch (e) {
      console.error("disconnecting handler error", e);
    }
  });

  // Reconnect to room
  socket.on("reconnect_room", async (data: { roomId: string; playerId: string }, cb: Function) => {
    try {
      const { roomId, playerId } = data;
      const room = await store.getRoom(roomId);
      if (!room) return cb?.({ ok: false, error: "Room not found" });

      const p = room.players.find((pl) => pl.id === playerId);
      if (!p) return cb?.({ ok: false, error: "Player not found" });

      p.socketId = socket.id;
      p.connected = true;
      await store.setRoom(roomId, room);
      socket.join(roomId);
      io.to(roomId).emit("player_reconnected", { playerId });
      cb?.({ ok: true, room });
    } catch (e) {
      console.error("reconnect_room error", e);
      cb?.({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
    }
  });
}
