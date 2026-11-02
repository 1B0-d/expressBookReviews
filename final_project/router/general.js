// AI assistance disclosure: Codex assisted with code, tests and course evidence.
// The original IBM starter booksdb.js is retained without content changes.
const express = require('express');
const axios = require('axios');
const books = require('./booksdb');
const {register} = require('./auth_users');
const general = express.Router();
general.post('/register', (req, res) => {
  const result = register(req.body.username, req.body.password);
  return res.status(result.status).json({message: result.message});
});
general.get('/', (req, res) => res.json(books));
general.get('/isbn/:isbn', (req, res) => {
  const book = Object.hasOwn(books, req.params.isbn) ? books[req.params.isbn] : null;
  return book ? res.json(book) : res.status(404).json({message: 'Book not found.'});
});
const matchingBooks = (field, value) => Object.fromEntries(
  Object.entries(books).filter(([, book]) => book[field].toLowerCase() === value.toLowerCase())
);
general.get('/author/:author', (req, res) => res.json(matchingBooks('author', req.params.author)));
general.get('/title/:title', (req, res) => res.json(matchingBooks('title', req.params.title)));
general.get('/review/:isbn', (req, res) => {
  const book = Object.hasOwn(books, req.params.isbn) ? books[req.params.isbn] : null;
  if (!book) return res.status(404).json({message: 'Book not found.'});
  return Object.keys(book.reviews).length ? res.json(book.reviews) : res.json({message: 'No reviews found for this book.'});
});

// Four Axios client methods for the lab's Promise/async tasks.
// The optional baseURL lets the same code run against the local test server.
const client = baseURL => axios.create({baseURL, timeout: 5000, proxy: false});
const noMatch = () => ({status: 404, message: 'No matching book found.'});
const requestFailure = error => error.response?.status === 404
  ? noMatch()
  : ({status: 502, message: 'Unable to reach the book service.'});
async function getAllBooks(baseURL = 'http://127.0.0.1:8800') {
  try {
    const response = await client(baseURL).get('/');
    return response.data;
  } catch (error) {
    return requestFailure(error);
  }
}
function getBooksByISBN(isbn, baseURL = 'http://127.0.0.1:8800') {
  return client(baseURL).get(`/isbn/${encodeURIComponent(isbn)}`)
    .then(response => response.data)
    .catch(requestFailure);
}
async function getBooksByAuthor(author, baseURL = 'http://127.0.0.1:8800') {
  try {
    const response = await client(baseURL).get(`/author/${encodeURIComponent(author)}`);
    return Object.keys(response.data || {}).length ? response.data : noMatch();
  } catch (error) {
    return requestFailure(error);
  }
}
function getBooksByTitle(title, baseURL = 'http://127.0.0.1:8800') {
  return client(baseURL).get(`/title/${encodeURIComponent(title)}`)
    .then(response => Object.keys(response.data || {}).length ? response.data : noMatch())
    .catch(requestFailure);
}
module.exports = {general, getAllBooks, getBooksByISBN, getBooksByAuthor, getBooksByTitle};
