import { spawnSync, spawn } from 'node:child_process';
import { resolve } from 'node:path';

const executable = resolve('node_modules/.bin/wrangler');
const env = {
  ...process.env,
  WRANGLER_SEND_METRICS: 'false',
  XDG_CONFIG_HOME: resolve('.wrangler/config'),
};
const init = spawnSync(executable, ['d1', 'execute', 'mtrs-9597', '--local', '--file', 'schema.sql'], { stdio: 'inherit', env });
if (init.status !== 0) process.exit(init.status ?? 1);

// These bindings are passed only to the loopback development server. They are
// deliberately absent from wrangler.toml, and the backend also checks the host.
const server = spawn(executable, ['pages', 'dev', 'dist', '--ip', '127.0.0.1', '--port', '8788', '--binding', 'LOCAL_DEV_AUTH=true', '--binding', 'DEV_ADMIN_EMAIL=organizer@example.test'], { stdio: 'inherit', env });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('exit', code => process.exit(code ?? 0));
