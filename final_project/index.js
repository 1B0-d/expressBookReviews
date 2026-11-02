// AI assistance disclosure: Codex assisted implementation and verification.
// Teaching application: local-only, in-memory data; not a production service.
const express = require('express');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const {randomBytes} = require('node:crypto');
const customer = require('./router/auth_users');
const {general} = require('./router/general');

const app = express();
const secret = process.env.BOOKSHOP_SECRET || randomBytes(48).toString('hex');
app.locals.jwtSecret = secret;
app.use(express.json({limit: '16kb'}));
app.use('/customer', session({
  name: 'bookshop.sid', secret, resave: false, saveUninitialized: false,
  cookie: {httpOnly: true, sameSite: 'strict', maxAge: 3600000}
}));
app.use('/customer/auth', (req, res, next) => {
  const token = req.session?.authorization?.accessToken;
  if (!token) return res.status(401).json({message: 'Login required.'});
  try {
    const payload = jwt.verify(token, secret, {algorithms: ['HS256']});
    req.username = payload.sub;
    return next();
  } catch {
    return res.status(401).json({message: 'Invalid or expired session.'});
  }
});
app.use('/customer', customer.authenticated);
app.use('/', general);
app.use((req, res) => res.status(404).json({message: 'Route not found.'}));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  return res.status(err instanceof SyntaxError ? 400 : 500).json({message: 'Request could not be processed.'});
});
if (require.main === module) {
  const port = Number(process.env.PORT || 8800);
  app.listen(port, '127.0.0.1', () => console.log(`Bookshop listening on http://127.0.0.1:${port}`));
}
module.exports = app;
