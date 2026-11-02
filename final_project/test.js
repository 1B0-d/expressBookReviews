// Actual local integration checks, including auth and cross-user ownership.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const app = require('./index');
const methods = require('./router/general');

test('book API, four Axios methods, authentication, ownership and concurrent requests', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, method = 'GET', body, cookie) {
    const response = await fetch(base + path, {method, headers: {
      ...(body ? {'content-type': 'application/json'} : {}), ...(cookie ? {cookie} : {})
    }, ...(body ? {body: JSON.stringify(body)} : {})});
    return {status: response.status, json: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0]};
  }
  assert.equal(Object.keys(await methods.getAllBooks(base)).length, 10);
  assert.equal((await methods.getBooksByISBN(1, base)).title, 'Things Fall Apart');
  assert.equal(Object.keys(await methods.getBooksByAuthor('Unknown', base)).length, 4);
  assert.equal((await methods.getBooksByTitle('Pride and Prejudice', base))['8'].author, 'Jane Austen');  assert.deepEqual(await methods.getBooksByAuthor('No Such Author', base), {status: 404, message: 'No matching book found.'});
  assert.deepEqual(await methods.getBooksByTitle('No Such Title', base), {status: 404, message: 'No matching book found.'});
  assert.deepEqual(await methods.getBooksByISBN(999, base), {status: 404, message: 'No matching book found.'});
  assert.deepEqual(await methods.getBooksByAuthor('Unknown', 'http://127.0.0.1:1'), {status: 502, message: 'Unable to reach the book service.'});
  assert.equal((await request('/isbn/__proto__')).status, 404);
  assert.equal((await request('/isbn/999')).status, 404);
  assert.equal((await request('/customer/auth/review/1', 'PUT', {review: 'no login'})).status, 401);
  for (const username of ['readerA', 'readerB'])
    assert.equal((await request('/register', 'POST', {username, password: 'Local-demo-123!'})).status, 201);
  assert.equal((await request('/register', 'POST', {username: 'readerA', password: 'Local-demo-123!'})).status, 409);
  assert.equal((await request('/customer/login', 'POST', {username: 'readerA', password: 'incorrect'})).status, 401);
  const a = await request('/customer/login', 'POST', {username: 'readerA', password: 'Local-demo-123!'});
  const b = await request('/customer/login', 'POST', {username: 'readerB', password: 'Local-demo-123!'});
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  assert.ok(a.cookie); assert.ok(b.cookie); assert.notEqual(a.cookie, b.cookie);
  const added = await request('/customer/auth/review/1', 'PUT', {review: 'A review', username: 'readerB'}, a.cookie);
  assert.equal(added.status, 201); assert.equal(added.json.reviews.readerA, 'A review');
  assert.equal(added.json.reviews.readerB, undefined);
  assert.equal((await request('/customer/auth/review/1', 'DELETE', undefined, b.cookie)).status, 404);
  const modified = await request('/customer/auth/review/1', 'PUT', {review: 'A revised'}, a.cookie);
  assert.equal(modified.status, 200); assert.equal(modified.json.reviews.readerA, 'A revised');
  assert.equal((await request('/customer/auth/review/1', 'PUT', {review: ''}, b.cookie)).status, 400);
  const concurrent = await Promise.all([
    request('/customer/auth/review/1', 'PUT', {review: 'B independent'}, b.cookie),
    ...Array.from({length: 10}, () => methods.getAllBooks(base))
  ]);
  assert.equal(concurrent[0].status, 201);
  const deleted = await request('/customer/auth/review/1', 'DELETE', undefined, a.cookie);
  assert.equal(deleted.status, 200);
  assert.equal(deleted.json.reviews.readerA, undefined);
  assert.equal(deleted.json.reviews.readerB, 'B independent');
  await request('/customer/auth/review/1', 'DELETE', undefined, b.cookie);
});
