// Interactive setup: writes server/.env and checks the MongoDB connection.
import {createInterface} from 'node:readline';
import {randomBytes} from 'node:crypto';
import {existsSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {stdin, stdout} from 'node:process';

const envPath = new URL('../server/.env', import.meta.url);
const rl = createInterface({input: stdin, output: stdout, terminal: stdin.isTTY});
const lines = rl[Symbol.asyncIterator]();
async function ask(q, fallback = '') {
  stdout.write(fallback ? `${q} [${fallback}]: ` : `${q}: `);
  const {value, done} = await lines.next();
  if (done) { console.error('\nInput ended before setup finished.'); process.exit(1); }
  return value.trim() || fallback;
}

console.log('\nLendFlow setup — press Enter to accept the value in [brackets].\n');
if (existsSync(envPath) && !/^y/i.test(await ask('server/.env already exists. Overwrite it? (y/n)', 'n'))) {
  console.log('Keeping the existing server/.env.');
  rl.close();
  process.exit(0);
}

console.log('Paste your MongoDB Atlas connection string (Atlas → Connect → Drivers),');
console.log('with <db_password> replaced by your database user password. Leave empty for a local MongoDB.');
let uri = await ask('MONGO_URI', 'mongodb://127.0.0.1:27017/lendflow');
uri = uri.replace(/^["']|["']$/g, '');
if (uri.includes('<db_password>') || uri.includes('<password>')) {
  console.error('\nThe connection string still contains <db_password>. Replace it with your real password and run setup again.');
  process.exit(1);
}
// Add the "lendflow" database name when the Atlas string has none (…mongodb.net/?retryWrites=…).
uri = uri.replace(/(mongodb(?:\+srv)?:\/\/[^/]+)\/?(\?|$)/, '$1/lendflow$2');

const email = await ask('Admin email', 'admin@lendflow.local');
let password = '';
while (password.length < 10) {
  password = await ask('Admin password (10+ characters)');
  if (password.length < 10) console.log('  Too short, try again.');
}
rl.close();

writeFileSync(envPath, [
  `MONGO_URI=${uri}`,
  `JWT_SECRET=${randomBytes(32).toString('hex')}`,
  'CLIENT_URL=http://localhost:5173',
  'PORT=5000',
  `SEED_ADMIN_EMAIL=${email}`,
  `SEED_ADMIN_PASSWORD=${password}`,
  ''
].join('\n'));
console.log('\n✔ Wrote server/.env');

let mongoose;
try {
  mongoose = createRequire(new URL('../server/package.json', import.meta.url))('mongoose');
} catch {
  console.log('Dependencies are not installed yet. Run "npm run install:all", then "npm run seed".');
  process.exit(0);
}
process.stdout.write('Testing the database connection… ');
try {
  await mongoose.connect(uri, {serverSelectionTimeoutMS: 10000});
  console.log('✔ connected');
  await mongoose.disconnect();
  console.log('\nNext: "npm run seed" (only once), then "npm run dev" and open http://localhost:5173');
} catch (e) {
  console.log('✘ failed\n\n' + e.message);
  if (/auth/i.test(e.message)) console.log('\n→ Username or password is wrong. Check Atlas → Database Access.');
  else if (/ECONNREFUSED/.test(e.message)) console.log('\n→ No MongoDB is running on this computer. Start MongoDB, or run setup again and paste an Atlas connection string.');
  else if (/ENOTFOUND|querySrv/i.test(e.message)) console.log('\n→ DNS/network problem. Try another network (e.g. a phone hotspot).');
  else console.log('\n→ Your IP is probably not allowed. Atlas → Network Access → Add IP Address (or Allow Access from Anywhere).');
  console.log('Fix it, then run "npm run setup" again.');
  process.exit(1);
}
