/**
 * Browser Storage Adapter
 * Handles localStorage and sessionStorage with consistent API
 */

import type { IBrowserStorageAdapter } from "../interfaces/IStorageAdapter";

export class BrowserStorageAdapter<T = string> implements IBrowserStorageAdapter<T> {
  constructor(private storage: Storage) {}

  async get(key: string): Promise<T | null> {
    try {
      const value = this.storage.getItem(key);
      if (value === null) return null;

      // Try to parse as JSON, fallback to raw string
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      console.warn(`Failed to get ${key} from storage:`, error);
      return null;
    }
  }

  async set(key: string, value: T): Promise<void> {
    try {
      const serialized = typeof value === "string" ? value : JSON.stringify(value);
      this.storage.setItem(key, serialized);
    } catch (error) {
      console.warn(`Failed to set ${key} in storage:`, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      this.storage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove ${key} from storage:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      this.storage.clear();
    } catch (error) {
      console.warn("Failed to clear storage:", error);
      throw error;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      return this.storage.getItem(key) !== null;
    } catch (error) {
      console.warn(`Failed to check ${key} in storage:`, error);
      return false;
    }
  }

  async keys(): Promise<string[]> {
    try {
      const keys: string[] = [];
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key) keys.push(key);
      }
      return keys;
    } catch (error) {
      console.warn("Failed to get storage keys:", error);
      return [];
    }
  }

  // Browser-specific methods
  getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  }

  removeByPrefix(prefix: string): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      this.storage.removeItem(key);
    }
  }
}

// Concrete implementations for localStorage and sessionStorage
// Use lazy initialization to avoid SSR issues
export const localStorageAdapter = new BrowserStorageAdapter<unknown>(
  typeof window !== 'undefined' ? localStorage : ({} as Storage)
);
export const sessionStorageAdapter = new BrowserStorageAdapter<unknown>(
  typeof window !== 'undefined' ? sessionStorage : ({} as Storage)
);
