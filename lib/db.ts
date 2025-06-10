import Dexie, { Table } from 'dexie';

// Define interfaces for our database schema
export interface Episode {
  id?: number;
  createdAt: Date;
  lastUpdatedAt: Date;
  title: string;
  closed: boolean;
}

export interface Message {
  id?: number;
  episodeId: number;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface Symptom {
  id?: number;
  episodeId: number;
  code: string;
  name: string;
  present: boolean;
  confidence: number;
  extractedFrom?: string;
  timestamp: Date;
}

export interface Condition {
  id?: number;
  episodeId: number;
  code: string;
  name: string;
  probability: number;
  timestamp: Date;
}

export interface Posterior {
  id?: number;
  episodeId: number;
  conditionCode: string;
  symptomCodes: string[];
  probability: number;
  timestamp: Date;
}

export class EasyGPDatabase extends Dexie {
  episodes!: Table<Episode, number>;
  messages!: Table<Message, number>;
  symptoms!: Table<Symptom, number>;
  conditions!: Table<Condition, number>;
  posteriors!: Table<Posterior, number>;

  constructor() {
    super('EasyGPDatabase');
    this.version(1).stores({
      episodes: '++id, createdAt, lastUpdatedAt, title, closed',
      messages: '++id, episodeId, role, timestamp',
      symptoms: '++id, episodeId, code, present, timestamp',
      conditions: '++id, episodeId, code, probability, timestamp',
      posteriors: '++id, episodeId, conditionCode, timestamp'
    });
  }

  // Helper to create a new episode
  async createEpisode(title: string = 'New Consultation'): Promise<number> {
    const now = new Date();
    return await this.episodes.add({
      createdAt: now,
      lastUpdatedAt: now,
      title,
      closed: false
    });
  }

  // Helper to add a message to an episode
  async addMessage(episodeId: number, role: 'user' | 'assistant', content: string): Promise<number> {
    return await this.messages.add({
      episodeId,
      role,
      content,
      timestamp: new Date()
    });
  }

  // Helper to add a symptom to an episode
  async addSymptom(episodeId: number, code: string, name: string, present: boolean, confidence: number = 1.0, extractedFrom?: string): Promise<number> {
    return await this.symptoms.add({
      episodeId,
      code,
      name,
      present,
      confidence,
      extractedFrom,
      timestamp: new Date()
    });
  }

  // Helper to update condition probabilities
  async updateConditionProbability(episodeId: number, code: string, name: string, probability: number): Promise<number> {
    const existing = await this.conditions
      .where({episodeId, code})
      .first();
    
    if (existing) {
      await this.conditions.update(existing.id!, {
        probability,
        timestamp: new Date()
      });
      return existing.id!;
    } else {
      return await this.conditions.add({
        episodeId,
        code,
        name,
        probability,
        timestamp: new Date()
      });
    }
  }
}

export const db = new EasyGPDatabase();
