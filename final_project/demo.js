// Executes real cURL requests against a real local Express server.
// All credentials are disposable synthetic test values, never account credentials.
const app = require('./index');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const {mkdtemp, writeFile, rm, mkdir} = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const methods = require('./router/general');
const run = promisify(execFile);

async function main() {
  const evidence = path.resolve(__dirname, '../evidence');
  await mkdir(evidence, {recursive: true});
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'bookshop-demo-'));
  const cookie = path.join(temporary, 'session.cookies');
  const server = app.listen(8800, '127.0.0.1');
  await new Promise((resolve, reject) => {server.once('listening', resolve); server.once('error', reject);});
  const base = 'http://127.0.0.1:8800';
  const records = [];
  async function curl(name, route, method = 'GET', body, authenticated = false) {
    const args = ['--silent', '--show-error', '--request', method];
    if (authenticated) args.push('--cookie', cookie);
    if (route === '/customer/login') args.push('--cookie-jar', cookie);
    if (body) args.push('--header', 'Content-Type: application/json', '--data-raw', JSON.stringify(body));
    args.push('--write-out', '\nHTTP_STATUS:%{http_code}\n', base + route);
    const {stdout, stderr} = await run(process.platform === 'win32' ? 'curl.exe' : 'curl', args, {maxBuffer: 1024 * 1024});
    if (stderr) throw new Error(stderr);
    const [raw, statusText] = stdout.trim().split('\nHTTP_STATUS:');
    const json = JSON.parse(raw), status = Number(statusText);
    const displayArgs = args.map(argument => argument === cookie ? '<temporary-local-cookie-jar>' : argument);
    const command = 'curl ' + displayArgs.map(a => /^[A-Za-z0-9_:/%.<>-]+$/.test(a) ? a : "'" + a.replaceAll("'", "'\\''") + "'").join(' ');
    const content = `${command}\n\n${JSON.stringify(json, null, 2)}\nHTTP_STATUS:${status}\n`;
    await writeFile(path.join(evidence, name + '.txt'), content);
    records.push({task: name, command, status, json});
    if (status >= 400) throw new Error(`${name}: HTTP ${status}`);
    return json;
  }
  try {
    await curl('getallbooks', '/');
    await curl('getbooksbyISBN', '/isbn/1');
    await curl('getbooksbyauthor', '/author/Unknown');
    await curl('getbooksbytitle', '/title/Pride%20and%20Prejudice');
    await curl('getbookreview', '/review/1');
    const credentials = {username: 'course_demo', password: 'Synthetic-demo-123!'};
    await curl('register', '/register', 'POST', credentials);
    await curl('login', '/customer/login', 'POST', credentials);
    await curl('reviewadded', '/customer/auth/review/1', 'PUT', {review: 'An engaging novel about cultural change.'}, true);
    await curl('reviewmodified', '/customer/auth/review/1', 'PUT', {review: 'A powerful, carefully structured novel about cultural change.'}, true);
    await curl('reviewretrieved', '/review/1');
    await curl('deletereview', '/customer/auth/review/1', 'DELETE', undefined, true);
    const [all, isbn, author, title] = await Promise.all([
      methods.getAllBooks(base), methods.getBooksByISBN(1, base),
      methods.getBooksByAuthor('Unknown', base), methods.getBooksByTitle('Pride and Prejudice', base)
    ]);
    await writeFile(path.join(evidence, 'axios-four-methods.json'), JSON.stringify({allBooks: all, isbn, author, title}, null, 2));
    await writeFile(path.join(evidence, 'curl-execution-results.json'), JSON.stringify(records, null, 2));
    console.log(`${records.length} actual cURL requests succeeded; four Axios methods executed concurrently.`);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(temporary, {recursive: true, force: true});
  }
}
main().catch(error => {console.error(error.message); process.exitCode = 1;});
