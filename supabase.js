'use strict';

const { createClient } = require('@supabase/supabase-js');

const url = (process.env.SUPABASE_URL || '').trim();
const anonKey = (process.env.SUPABASE_ANON_KEY || '').trim();
const serviceKey = (process.env.SUPABASE_SERVICE_KEY || '').trim();

const isConfigured =
  url !== '' &&
  anonKey !== '' &&
  !url.includes('changeme') &&
  !anonKey.includes('changeme');

class MemoryStore {
  constructor() {
    this.todos = [
      { id: 1, title: 'Apprendre Terraform', completed: false },
      { id: 2, title: 'Configurer Ansible', completed: true },
      { id: 3, title: 'Mettre en place CI/CD', completed: false }
    ];
    this.nextId = 4;
  }

  async list() {
    return this.todos;
  }

  async create(title) {
    const todo = { id: this.nextId++, title, completed: false };
    this.todos.push(todo);
    return todo;
  }

  async update(id, patch) {
    const todo = this.todos.find((t) => t.id === id);
    if (!todo) return null;
    if (patch.title !== undefined) todo.title = patch.title;
    if (patch.completed !== undefined) todo.completed = Boolean(patch.completed);
    return todo;
  }

  async remove(id) {
    const index = this.todos.findIndex((t) => t.id === id);
    if (index === -1) return false;
    this.todos.splice(index, 1);
    return true;
  }
}

class SupabaseStore {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async list() {
    const { data, error } = await this.supabase
      .from('todos')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    return data.map((row) => normalize(row));
  }

  async create(title) {
    const { data, error } = await this.supabase
      .from('todos')
      .insert({ title, completed: false })
      .select()
      .single();
    if (error) throw error;
    return normalize(data);
  }

  async update(id, patch) {
    const payload = {};
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.completed !== undefined) payload.completed = Boolean(patch.completed);
    const { data, error } = await this.supabase
      .from('todos')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return normalize(data);
  }

  async remove(id) {
    const { error } = await this.supabase.from('todos').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
}

function normalize(row) {
  return {
    id: row.id,
    title: row.title,
    completed: Boolean(row.completed)
  };
}

function createStore() {
  if (isConfigured) {
    const supabase = createClient(url, serviceKey || anonKey);
    return { store: new SupabaseStore(supabase), backend: 'supabase' };
  }
  return { store: new MemoryStore(), backend: 'memory' };
}

module.exports = { createStore };