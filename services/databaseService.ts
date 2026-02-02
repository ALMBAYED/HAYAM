
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SessionRecord, UserResponse } from '../types';

// Environment variables would normally be injected here.
const SUPABASE_URL = (process.env as any).SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (process.env as any).SUPABASE_ANON_KEY || '';

class DatabaseService {
  private client: SupabaseClient | null = null;
  private useLocalFallback: boolean = true;

  constructor() {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      this.useLocalFallback = false;
      console.log('HAYAM: Supabase connection initialized.');
    } else {
      console.warn('HAYAM: Supabase credentials missing. Defaulting to local storage persistence.');
    }
  }

  async saveSession(record: SessionRecord): Promise<void> {
    if (this.useLocalFallback || !this.client) {
      const existing = JSON.parse(localStorage.getItem('hayam_sessions') || '[]');
      existing.push({ ...record, id: crypto.randomUUID() });
      localStorage.setItem('hayam_sessions', JSON.stringify(existing));
      return;
    }

    try {
      const { error } = await this.client
        .from('sessions')
        .insert([record]);
      
      if (error) throw error;
    } catch (err) {
      console.error('Database save failed:', err);
      const existing = JSON.parse(localStorage.getItem('hayam_sessions') || '[]');
      existing.push({ ...record, id: 'fallback-' + Date.now() });
      localStorage.setItem('hayam_sessions', JSON.stringify(existing));
    }
  }

  async getSessions(): Promise<SessionRecord[]> {
    if (this.useLocalFallback || !this.client) {
      return JSON.parse(localStorage.getItem('hayam_sessions') || '[]').reverse();
    }

    try {
      const { data, error } = await this.client
        .from('sessions')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Database fetch failed:', err);
      return JSON.parse(localStorage.getItem('hayam_sessions') || '[]').reverse();
    }
  }

  async deleteSession(id: string): Promise<void> {
    if (this.useLocalFallback || !this.client || id.startsWith('fallback-') || id.length > 20) {
      const existing = JSON.parse(localStorage.getItem('hayam_sessions') || '[]');
      const updated = existing.filter((s: SessionRecord) => s.id !== id);
      localStorage.setItem('hayam_sessions', JSON.stringify(updated));
      return;
    }

    try {
      const { error } = await this.client
        .from('sessions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      console.error('Database delete failed:', err);
      // Even if cloud fails, check local just in case it was a hybrid record
      const existing = JSON.parse(localStorage.getItem('hayam_sessions') || '[]');
      const updated = existing.filter((s: SessionRecord) => s.id !== id);
      localStorage.setItem('hayam_sessions', JSON.stringify(updated));
    }
  }
}

export const databaseService = new DatabaseService();
