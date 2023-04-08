const https = require("https");
require("dotenv").config();

const firebaseUrl = process.env.FIREBASE_URL;
const firebasePath = process.env.FIREBASE_PATH;

const databaseOptions = {
  hostname: firebaseUrl,
  path: firebasePath,
  method: "PUT",
  port: 443,
  headers: {
    "Content-type": "application/json",
  },
};

function sendDateToServer(date) {
  const request = https.request(databaseOptions);
  request.write(date);
  request.on("error", (error) => {
    console.error(error);
  });
  request.end();
}

module.exports = sendDateToServer;
