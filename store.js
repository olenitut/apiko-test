// requiring modules

const https = require("https");
const cron = require("node-cron");
const winston = require("winston");

require("dotenv").config();

const sendDateToServer = require("./sendDateToServer");

//creating needed vars

const firebaseUrl = process.env.FIREBASE_URL;
const firebasePath = process.env.FIREBASE_PATH;
const storeUrl = process.env.STORE_URL;
const storePath = process.env.STORE_PATH;
const storeId = process.env.STORE_ID;
const apiKey = process.env.API_KEY;

const fullFirebaseUrl = `https://${firebaseUrl}${firebasePath}`;

const logger = winston.createLogger({
  level: "info",
  format: winston.format.simple(),
  transports: new winston.transports.File({ filename: "app.log" }),
});

const requestHeaders = {
  "ORDERDESK-STORE-ID": storeId,
  "ORDERDESK-API-KEY": apiKey,
  "Content-type": "application/json",
};

//the main function

const findNewOrders = async () => {
  //fetching the latest datetime orders were processed

  const dateRes = await fetch(fullFirebaseUrl);
  const latestDate = await dateRes.json();
  const dateString = new Date(latestDate).toISOString();

  //getting orders from the api

  const getOrdersOptions = {
    host: storeUrl,
    path: `${storePath}?search_start_date_local=${dateString}`,
    headers: requestHeaders,
  };

  try {
    https.get(getOrdersOptions, (response) => {
      if (response.statusCode !== 200) {
        logger.error(`Request failed with status code ${response.statusCode}`);
        return;
      }

      let data = "";

      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        const latestOrders = JSON.parse(data).orders;

        //writing the id and address to the program log file

        latestOrders.forEach((order) => {
          const id = order.id;
          const address =
            order.shipping.address1 ||
            order.shipping.address2 ||
            order.shipping.address3 ||
            order.shipping.address4;
          logger.info(
            `${new Date().toISOString()} New order: ID:${id}; shipping address: ${address}.`
          );

          //updating the latest date in the database
          sendDateToServer(JSON.stringify(Date.now()));
        });
      });
    });
  } catch (err) {
    logger.error(err);
  }
};

cron.schedule("0 * * * *", () => {
  findNewOrders();
});
