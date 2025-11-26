import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";

export interface GamePlayer {
  id: string;
  name: string;
  color: string;
  socketId: string;
  connected: boolean;
}

export interface GameState {
  players: GamePlayer[];
  tokens: Record<string, number[]>;
  turnIndex: number;
  dice: number | null;
  status: "playing" | "finished";
  winner?: string;
}

export interface Room {
  id: string;
  hostSocketId: string;
  hostName: string;
  maxPlayers: number;
  players: GamePlayer[];
  game: GameState | null;
  createdAt: number;
  lastActiveAt?: number;
}

interface GameContextType {
  room: Room | null;
  playerId: string | null;
  game: GameState | null;
  socket: Socket | null;
  isConnected: boolean;
  createRoom: (name: string, maxPlayers: number) => Promise<string>;
  joinRoom: (roomId: string, name: string) => Promise<void>;
  startGame: (roomId: string) => Promise<void>;
  rollDice: (roomId: string) => Promise<{ dice: number; moves: any[] }>;
  moveToken: (roomId: string, move: { tokenIndex: number; to: number }) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  sendChat: (roomId: string, text: string) => void;
  onGameState: (callback: (game: GameState) => void) => () => void;
  onDiceResult: (callback: (data: { value: number; by: string }) => void) => () => void;
  onMoveAccepted: (callback: (data: { game: GameState }) => void) => () => void;
  onGameOver: (callback: (data: { winner: string; game: GameState }) => void) => () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const sock = getSocket();
    setSocket(sock);

    const handleConnect = () => {
      console.log("Socket connected");
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    };

    sock.on("connect", handleConnect);
    sock.on("disconnect", handleDisconnect);
    sock.on("game_state", (data) => {
      setGame(data.game);
    });

    sock.on("player_joined", (data) => {
      setRoom(data.room);
      if (data.room.game) {
        setGame(data.room.game);
      }
    });

    sock.on("player_left", (data) => {
      setRoom(data.room);
    });

    sock.on("move_accepted", (data) => {
      setGame(data.game);
    });

    sock.on("game_over", (data) => {
      setGame(data.game);
    });

    sock.on("dice_result", (data) => {
      setGame((prev) => {
        if (!prev) return null;
        return { ...prev, dice: data.value };
      });
    });

    return () => {
      sock.off("connect", handleConnect);
      sock.off("disconnect", handleDisconnect);
      sock.off("game_state");
      sock.off("player_joined");
      sock.off("player_left");
      sock.off("move_accepted");
      sock.off("game_over");
      sock.off("dice_result");
    };
  }, []);

  const createRoom = useCallback(
    async (name: string, maxPlayers: number): Promise<string> => {
      return new Promise((resolve, reject) => {
        socket?.emit("create_room", { name, maxPlayers }, (response: any) => {
          if (response?.ok) {
            resolve(response.roomId);
          } else {
            reject(new Error(response?.error || "Failed to create room"));
          }
        });
      });
    },
    [socket]
  );

  const joinRoom = useCallback(
    async (roomId: string, name: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        socket?.emit("join_room", { roomId, name }, (response: any) => {
          if (response?.ok) {
            setRoom(response.room);
            setPlayerId(response.playerId);
            resolve();
          } else {
            reject(new Error(response?.error || "Failed to join room"));
          }
        });
      });
    },
    [socket]
  );

  const startGame = useCallback(
    async (roomId: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        socket?.emit("start_game", { roomId }, (response: any) => {
          if (response?.ok) {
            resolve();
          } else {
            reject(new Error(response?.error || "Failed to start game"));
          }
        });
      });
    },
    [socket]
  );

  const rollDice = useCallback(
    async (roomId: string): Promise<{ dice: number; moves: any[] }> => {
      return new Promise((resolve, reject) => {
        socket?.emit("roll_dice", { roomId, playerId }, (response: any) => {
          if (response?.ok) {
            resolve({ dice: response.dice, moves: response.moves });
          } else {
            reject(new Error(response?.error || "Failed to roll dice"));
          }
        });
      });
    },
    [socket, playerId]
  );

  const moveToken = useCallback(
    async (roomId: string, move: { tokenIndex: number; to: number }): Promise<void> => {
      return new Promise((resolve, reject) => {
        socket?.emit("move_token", { roomId, playerId, move }, (response: any) => {
          if (response?.ok) {
            resolve();
          } else {
            reject(new Error(response?.error || "Invalid move"));
          }
        });
      });
    },
    [socket, playerId]
  );

  const leaveRoom = useCallback(
    async (roomId: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        socket?.emit("leave_room", { roomId, playerId }, (response: any) => {
          if (response?.ok) {
            setRoom(null);
            setPlayerId(null);
            setGame(null);
            resolve();
          } else {
            reject(new Error(response?.error || "Failed to leave room"));
          }
        });
      });
    },
    [socket, playerId]
  );

  const sendChat = useCallback(
    (roomId: string, text: string) => {
      socket?.emit("send_chat", { roomId, playerId, text });
    },
    [socket, playerId]
  );

  const onGameState = useCallback(
    (callback: (game: GameState) => void) => {
      const handler = (data: { game: GameState }) => callback(data.game);
      socket?.on("game_state", handler);
      return () => socket?.off("game_state", handler);
    },
    [socket]
  );

  const onDiceResult = useCallback(
    (callback: (data: { value: number; by: string }) => void) => {
      socket?.on("dice_result", callback);
      return () => socket?.off("dice_result", callback);
    },
    [socket]
  );

  const onMoveAccepted = useCallback(
    (callback: (data: { game: GameState }) => void) => {
      socket?.on("move_accepted", callback);
      return () => socket?.off("move_accepted", callback);
    },
    [socket]
  );

  const onGameOver = useCallback(
    (callback: (data: { winner: string; game: GameState }) => void) => {
      socket?.on("game_over", callback);
      return () => socket?.off("game_over", callback);
    },
    [socket]
  );

  return (
    <GameContext.Provider
      value={{
        room,
        playerId,
        game,
        socket,
        isConnected,
        createRoom,
        joinRoom,
        startGame,
        rollDice,
        moveToken,
        leaveRoom,
        sendChat,
        onGameState,
        onDiceResult,
        onMoveAccepted,
        onGameOver,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within GameProvider");
  }
  return context;
}
