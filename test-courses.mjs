import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => {
      const eq = l.indexOf('=');
      return [l.slice(0, eq).trim(), l.slice(eq + 1).trim().replace(/^"|"$/g, '')];
    })
);

const proc = spawn('node', ['dist/index.js'], {
  env: { ...process.env, ...env },
  stdio: ['pipe', 'pipe', 'inherit'],
});

createInterface({ input: proc.stdout }).on('line', line => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    if (msg.id === 2) {
      const data = JSON.parse(msg.result?.content?.[0]?.text || '{}');
      const courses = data.courses || [];
      console.log(`Found ${courses.length} courses:`);
      courses.forEach(c => console.log(` - [${c.courseState}] ${c.name} (id: ${c.id})`));
      proc.kill();
      process.exit(0);
    }
  } catch {}
});

function send(msg) { proc.stdin.write(JSON.stringify(msg) + '\n'); }

send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
  protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' },
}});
await new Promise(r => setTimeout(r, 1500));
send({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} });
await new Promise(r => setTimeout(r, 500));
send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: {
  name: 'list_courses', arguments: {},
}});

setTimeout(() => { proc.kill(); process.exit(0); }, 15000);
