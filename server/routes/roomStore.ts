import Redis from "ioredis";
import { Redis as UpstashRedis } from "@upstash/redis";
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
  private upstash: UpstashRedis | null = null;
  private useRedis: boolean = false;
  private map: Map<string, Room> = new Map();

  constructor(redisUrl?: string, opts: { ttlSeconds?: number } = {}) {
    this.ttl = opts.ttlSeconds || 3600;

    // Check for Upstash HTTP config first (preferred for serverless/edge)
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        this.upstash = new UpstashRedis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        this.useRedis = true;
        console.log("Using Upstash Redis (HTTP)");
      } catch (e) {
        console.error("Upstash Redis init failed", e);
      }
    } 
    // Fallback to standard Redis (ioredis)
    else if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl);
        this.useRedis = true;
        this.redis.on("error", (e) => console.error("Redis error", e));
        console.log("Using Standard Redis (ioredis)");
      } catch (e) {
        console.warn("Redis initialization failed, using in-memory store", e);
        this.useRedis = false;
      }
    } else {
      this.useRedis = false;
      console.log("Using In-Memory Store");
    }
  }

  async createRoom(room: Room): Promise<Room> {
    const id = room.id || Math.random().toString(36).slice(2, 8).toUpperCase();
    room.id = id;
    room.createdAt = Date.now();
    room.lastActiveAt = Date.now();

    if (this.upstash) {
      await this.upstash.set(`room:${id}`, JSON.stringify(room), { ex: this.ttl });
    } else if (this.redis) {
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

    let raw: string | null = null;

    if (this.upstash) {
      // Upstash get returns the object directly if it's JSON, or string? 
      // Actually @upstash/redis automatically parses JSON if it can, but let's handle it safely.
      // Wait, standard behavior is it returns the value. If we stored a string, it returns a string.
      // However, we stored JSON.stringify(room).
      const res = await this.upstash.get(`room:${id}`);
      if (typeof res === 'object' && res !== null) return res as Room; // It might auto-parse
      if (typeof res === 'string') raw = res;
    } else if (this.redis) {
      raw = await this.redis.get(`room:${id}`);
    } else {
      return this.map.get(id) || null;
    }

    if (!raw) return null;
    try {
      return typeof raw === 'string' ? JSON.parse(raw) as Room : raw as Room;
    } catch (e) {
      return null;
    }
  }

  async setRoom(id: string, room: Room): Promise<void> {
    if (!id) throw new Error("id required");
    room.lastActiveAt = Date.now();

    if (this.upstash) {
      await this.upstash.set(`room:${id}`, JSON.stringify(room), { ex: this.ttl });
    } else if (this.redis) {
      await this.redis.set(`room:${id}`, JSON.stringify(room), "EX", this.ttl);
    } else {
      this.map.set(id, room);
    }
  }

  async deleteRoom(id: string): Promise<void> {
    if (!id) return;

    if (this.upstash) {
      await this.upstash.del(`room:${id}`);
    } else if (this.redis) {
      await this.redis.del(`room:${id}`);
    } else {
      this.map.delete(id);
    }
  }

  async cleanup(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    // Upstash is stateless, no cleanup needed
  }
}
