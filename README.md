# MathQuiz
A HTML+JavaScript application that generates mathematics problems randomly

Try it now on your browser!

http://msakuta.github.io/MathQuiz/index.html


## How to build

* Install npm 12+
* `npm i`
* `npm run build`
* Prepare `.env` containing the following keys to save statistics to Firebase

```
API_KEY=
AUTH_DOMAIN=
DATABASE_URL=
PROJECT_ID=
STORAGE_BUCKET=
MESSAGING_SENDER_ID=
APP_ID=
```

## How to serve

* `cd dist`
* `npx serve`


## How to run development server

* `npm start`


## External Libraries

This application uses following libraries.

* [qrcode](https://github.com/soldair/node-qrcode) to render the QR code for user ID.
* [Google Firebase / Firestore](https://firebase.google.com/?hl=ja) to store score statistics.
