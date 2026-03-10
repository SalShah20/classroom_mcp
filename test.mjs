import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { readFileSync } from 'fs';

// Parse .env
const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => {
      const eq = l.indexOf('=');
      const k = l.slice(0, eq).trim();
      const v = l.slice(eq + 1).trim().replace(/^"|"$/g, '');
      return [k, v];
    })
);

const proc = spawn('node', ['dist/index.js'], {
  env: { ...process.env, ...env },
  stdio: ['pipe', 'pipe', 'inherit'],
});

const rl = createInterface({ input: proc.stdout });

rl.on('line', line => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    if (msg.id === 2) {
      console.log('\n=== get_upcoming_assignments ===');
      const text = msg.result?.content?.[0]?.text;
      console.log(text ? JSON.parse(text) : msg);
    } else if (msg.id === 3) {
      console.log('\n=== get_grades ===');
      const text = msg.result?.content?.[0]?.text;
      console.log(text ? JSON.parse(text) : msg);
      proc.kill();
      process.exit(0);
    }
  } catch (e) {
    console.error('Parse error:', e.message, line);
  }
});

proc.on('error', err => { console.error('Process error:', err); process.exit(1); });

function send(msg) {
  proc.stdin.write(JSON.stringify(msg) + '\n');
}

// MCP handshake
send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'test-client', version: '1.0' },
}});

await new Promise(r => setTimeout(r, 1500));
send({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} });

await new Promise(r => setTimeout(r, 500));
send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: {
  name: 'get_upcoming_assignments', arguments: {},
}});

// Wait for upcoming assignments response, then fire grades
await new Promise(r => setTimeout(r, 8000));
send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: {
  name: 'get_grades', arguments: {},
}});

// Safety timeout
setTimeout(() => { proc.kill(); process.exit(0); }, 20000);
