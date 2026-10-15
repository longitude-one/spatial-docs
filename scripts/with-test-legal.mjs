import { spawn } from 'node:child_process';
import { testLegalEnvironment } from './legal-configuration.mjs';
const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error('A test command is required. This helper must never be used to publish.');
const child = spawn(command, args, { stdio: 'inherit', env: testLegalEnvironment(), shell: false });
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
