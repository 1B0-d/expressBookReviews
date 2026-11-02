# Book review API — IBM course project

AI assistance disclosure: Codex assisted with implementation, integration tests, execution of cURL/Axios demonstrations, and preparation of course deliverables. The original IBM starter book catalogue and MIT license are retained.

## Run locally

Requires Node.js and npm. Verified with Node.js 24.11.1 and npm 11.7.0.

```sh
cd final_project
npm ci
npm test
npm run demo
npm start
```

The application listens only on `127.0.0.1:8800` by default. `PORT` can override the port for `npm start`. The demo independently starts and stops its own server on port 8800, so stop an existing server before running it.

## Implemented behavior

- GET `/`: original ten-book catalogue.
- GET `/isbn/:isbn`, `/author/:author`, `/title/:title`: book searches.
- GET `/review/:isbn`: existing reviews or an explicit empty-review message.
- POST `/register`: create a synthetic/local user; duplicate names rejected.
- POST `/customer/login`: login, session regeneration, one-hour JWT in session.
- PUT `/customer/auth/review/:isbn`: add or modify the authenticated user's review.
- DELETE `/customer/auth/review/:isbn`: remove only that user's review.
- Four Axios methods in `final_project/router/general.js`: all books, ISBN, author, and title. Two use async/await, two return Promises with `.then()`.
- Axios lookups return a not-found result for empty/unknown matches and a service error result for failed requests.

`npm test` passed an integration suite covering the four Axios methods, unknown books, unauthenticated writes, duplicate registration, wrong passwords, two separate sessions, ownership despite a forged username field, modifying and deleting one's own review, empty reviews, and concurrent requests.

`npm run demo` successfully executed eleven real cURL requests and the four Axios methods concurrently. Test credentials are synthetic and disposable.

## Limits

This is a local teaching implementation, not a production service. Users, sessions, and reviews are held in memory and reset on restart. Passwords use salted scrypt hashes. The default signing secret is randomly generated at startup and is never committed. No real account credentials, access tokens, session cookies, Coursera identifiers, or personal data are included.

## Source and publication

Official starter: https://github.com/ibm-developer-skills-network/expressBookReviews.git

Cloned starter commit: `fa6bb07442d70a4ea72d26c6731d8ff57ed4f9d6`.

The official lab uses **expressBookReviews** (plural). Mark's text displays **expressBookReview** (singular), which is a spelling inconsistency.

This project is published in the course starter's public fork:
https://github.com/1B0-d/expressBookReviews

The assignment's required Axios implementation is available at:
https://github.com/1B0-d/expressBookReviews/blob/main/final_project/router/general.js

The fork retains the starter repository and adds the completed source and tests. Local cURL evidence, cookies, environment files, and `node_modules` are not included.

## Primary implementation references

- Express API: https://expressjs.com/en/4x/api.html
- Axios: https://axios-http.com/docs/intro
