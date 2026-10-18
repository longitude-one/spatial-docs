import { spawn } from 'node:child_process';
import { testLegalEnvironment } from './legal-configuration.mjs';
const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error('A test command is required. This helper must never be used to publish.');
// Local/test commands supply explicit deployment configuration to the strict
// publication generator. Publishing workflows do not use this fixture helper.
const environment = testLegalEnvironment();
environment.URL_PRODUCTION ??= 'https://www.longitude-one.fr';
environment.URL_PREPRODUCTION ??= 'https://longitude-one.github.io';
const child = spawn(command, args, { stdio: 'inherit', env: environment, shell: false });
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
