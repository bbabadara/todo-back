'use strict';

require('./tracing');

const express = require('express');
const client = require('prom-client');
const { createStore } = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;

const { store, backend } = createStore();

app.disable('x-powered-by');
app.use(express.json());

client.collectDefaultMetrics();

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 1.5, 2, 5]
});

app.get('/api/todos', async (req, res) => {
  try {
    const todos = await store.list();
    res.json(todos);
  } catch (err) {
    console.error('list error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/todos', async (req, res) => {
  const { title } = req.body || {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  try {
    const todo = await store.create(title.trim());
    res.status(201).json(todo);
  } catch (err) {
    console.error('create error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/todos/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const todo = await store.update(id, req.body || {});
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    res.json(todo);
  } catch (err) {
    console.error('update error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const deleted = await store.remove(id);
    if (!deleted) return res.status(404).json({ error: 'Todo not found' });
    res.status(204).send();
  } catch (err) {
    console.error('delete error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', backend, timestamp: new Date().toISOString() });
});

app.use((req, res, next) => {
  const labels = {
    method: req.method,
    route: req.route ? req.route.path : req.baseUrl + req.path,
    status_code: res.statusCode
  };
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    httpRequestsTotal.inc(labels);
    end(labels);
  });
  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Todo API (backend=${backend}) running on port ${PORT}`);
});