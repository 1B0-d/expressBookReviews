// AI-assisted course implementation; synthetic local demo users only.
const express = require('express');
const jwt = require('jsonwebtoken');
const {randomBytes, scryptSync, timingSafeEqual} = require('node:crypto');
const books = require('./booksdb');
const authenticated = express.Router();
const users = new Map();
const isValid = username => users.has(username);
const register = (username, password) => {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{2,39}$/.test(username) ||
      typeof password !== 'string' || password.length < 8 || password.length > 128)
    return {status: 400, message: 'Username must be 3-40 letters, digits, underscore or hyphen; password must be 8-128 characters.'};
  if (isValid(username)) return {status: 409, message: 'User already exists.'};
  const salt = randomBytes(16).toString('hex');
  users.set(username, {salt, hash: scryptSync(password, salt, 64)});
  return {status: 201, message: 'User successfully registered. You can now log in.'};
};
const authenticatedUser = (username, password) => {
  const user = users.get(username);
  if (!user || typeof password !== 'string') return false;
  return timingSafeEqual(user.hash, scryptSync(password, user.salt, 64));
};
authenticated.post('/login', (req, res, next) => {
  const {username, password} = req.body;
  if (!authenticatedUser(username, password)) return res.status(401).json({message: 'Invalid username or password.'});
  req.session.regenerate(err => {
    if (err) return next(err);
    const accessToken = jwt.sign({}, req.app.locals.jwtSecret, {subject: username, algorithm: 'HS256', expiresIn: '1h'});
    req.session.authorization = {accessToken};
    return req.session.save(error => error ? next(error) : res.json({message: 'Customer successfully logged in.', username}));
  });
});
authenticated.put('/auth/review/:isbn', (req, res) => {
  const book = Object.hasOwn(books, req.params.isbn) ? books[req.params.isbn] : null;
  if (!book) return res.status(404).json({message: 'Book not found.'});
  const review = req.body.review ?? req.query.review;
  if (typeof review !== 'string' || !review.trim() || review.length > 2000)
    return res.status(400).json({message: 'A nonempty review of at most 2000 characters is required.'});
  const updated = Object.hasOwn(book.reviews, req.username);
  // Identity is taken from the verified JWT, never a user-supplied author field.
  book.reviews[req.username] = review.trim();
  return res.status(updated ? 200 : 201).json({message: updated ? 'Review successfully modified.' : 'Review successfully added.', isbn: req.params.isbn, reviews: book.reviews});
});
authenticated.delete('/auth/review/:isbn', (req, res) => {
  const book = Object.hasOwn(books, req.params.isbn) ? books[req.params.isbn] : null;
  if (!book) return res.status(404).json({message: 'Book not found.'});
  if (!Object.hasOwn(book.reviews, req.username)) return res.status(404).json({message: 'No review by this user exists for this book.'});
  delete book.reviews[req.username];
  return res.json({message: 'Review successfully deleted.', isbn: req.params.isbn, reviews: book.reviews});
});
module.exports = {authenticated, isValid, users, register, authenticatedUser};
