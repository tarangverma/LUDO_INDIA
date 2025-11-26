import Redis from "ioredis";
import { GameState } from "./gameEngine";

export interface RoomPlayer {
  id: string;
  name: string;
  color: string;
  socketId: string;
  connected: boolean;
}

export interface Room {
  id: string;
  hostSocketId: string;
  hostName: string;
  maxPlayers: number;
  players: RoomPlayer[];
  game: GameState | null;
  createdAt: number;
  lastActiveAt?: number;
}

export class RoomStore {
  private ttl: number;
  private redis: Redis | null = null;
  private useRedis: boolean;
  private map: Map<string, Room> = new Map();

  constructor(redisUrl?: string, opts: { ttlSeconds?: number } = {}) {
    this.ttl = opts.ttlSeconds || 3600;
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl);
        this.useRedis = true;
        this.redis.on("error", (e) => console.error("Redis error", e));
      } catch (e) {
        console.warn("Redis initialization failed, using in-memory store", e);
        this.useRedis = false;
      }
    } else {
      this.useRedis = false;
    }
  }

  async createRoom(room: Room): Promise<Room> {
    const id = room.id || Math.random().toString(36).slice(2, 8).toUpperCase();
    room.id = id;
    room.createdAt = Date.now();
    room.lastActiveAt = Date.now();

    if (this.useRedis && this.redis) {
      await this.redis.set(`room:${id}`, JSON.stringify(room), "EX", this.ttl);
    } else {
      this.map.set(id, room);
      setTimeout(() => {
        if (this.map.get(id)) this.map.delete(id);
      }, this.ttl * 1000);
    }
    return room;
  }

  async getRoom(id: string): Promise<Room | null> {
    if (!id) return null;

    if (this.useRedis && this.redis) {
      const raw = await this.redis.get(`room:${id}`);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as Room;
      } catch (e) {
        return null;
      }
    } else {
      return this.map.get(id) || null;
    }
  }

  async setRoom(id: string, room: Room): Promise<void> {
    if (!id) throw new Error("id required");
    room.lastActiveAt = Date.now();

    if (this.useRedis && this.redis) {
      await this.redis.set(`room:${id}`, JSON.stringify(room), "EX", this.ttl);
    } else {
      this.map.set(id, room);
    }
  }

  async deleteRoom(id: string): Promise<void> {
    if (!id) return;

    if (this.useRedis && this.redis) {
      await this.redis.del(`room:${id}`);
    } else {
      this.map.delete(id);
    }
  }

  async cleanup(): Promise<void> {
    if (this.useRedis && this.redis) {
      await this.redis.quit();
    }
  }
}
