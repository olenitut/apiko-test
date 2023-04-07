const https = require("https");

const databaseOptions = {
  hostname: "apiko-test-774c2-default-rtdb.firebaseio.com",
  path: "/apiko/-NSQPFdG8lsREoG3ral5.json",
  method: "PUT",
  port: 443,
  headers: {
    "Content-type": "application/json",
  },
};

function sendDateToServer(date) {
  const request = https.request(databaseOptions);
  request.write(date);
  request.end();
}

module.exports = sendDateToServer;
