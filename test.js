const { spawn } = require('child_process');
const http = require('http');

let server;

function startServer() {
  return new Promise((resolve) => {
    server = spawn(process.execPath, ['index.js'], { env: { ...process.env, PORT: '3999' } });
    server.stdout.on('data', () => {});
    server.stderr.on('data', () => {});
    server.on('error', () => {});
    setTimeout(resolve, 1500);
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (server) server.kill();
    resolve();
  });
}

function request(method, path, body, attempts = 10) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3999,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const parsed = data ? JSON.parse(data) : {};
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', (err) => {
      if (attempts <= 1) return reject(err);
      setTimeout(() => request(method, path, body, attempts - 1).then(resolve, reject), 300);
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  let passed = 0;
  let failed = 0;

  async function assert(name, condition) {
    if (condition) {
      passed++;
      console.log('PASS:', name);
    } else {
      failed++;
      console.error('FAIL:', name);
    }
  }

  await startServer();

  try {
    const list = await request('GET', '/api/todos');
    await assert('Fetch todos returns 200', list.status === 200);
    await assert('Todos is an array', Array.isArray(list.body));

    const created = await request('POST', '/api/todos', { title: 'Tester CI/CD' });
    await assert('Create todo returns 201', created.status === 201);
    await assert('Todo has title', created.body.title === 'Tester CI/CD');
    await assert('Todo starts not completed', created.body.completed === false);

    const updated = await request('PUT', `/api/todos/${created.body.id}`, { completed: true });
    await assert('Update todo returns 200', updated.status === 200);
    await assert('Todo is completed', updated.body.completed === true);

    const health = await request('GET', '/health');
    await assert('Health check returns 200', health.status === 200);
    await assert('Health status is healthy', health.body.status === 'healthy');
    await assert('Health exposes backend', ['supabase', 'memory'].includes(health.body.backend));

    const invalid = await request('POST', '/api/todos', {});
    await assert('Invalid todo returns 400', invalid.status === 400);

    const missing = await request('PUT', '/api/todos/99999', { completed: true });
    await assert('Unknown todo returns 404', missing.status === 404);

    const deleted = await request('DELETE', `/api/todos/${created.body.id}`);
    await assert('Delete todo returns 204', deleted.status === 204);
  } finally {
    await stopServer();
  }

  console.log('-----------------------------------');
  console.log('Tests:', passed, 'passed,', failed, 'failed');
  process.exit(failed > 0 ? 1 : 0);
})();