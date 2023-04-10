// requiring modules

const https = require("https");
const cron = require("node-cron");
const winston = require("winston");

require("dotenv").config();

//creating needed vars

const {
  FIREBASE_URL,
  FIREBASE_PATH,
  STORE_URL,
  STORE_PATH,
  STORE_ID,
  API_KEY,
} = process.env;

const logger = winston.createLogger({
  level: "info",
  format: winston.format.simple(),
  transports: [
    new winston.transports.File({ filename: "app.log" }),
    new winston.transports.Console(),
  ],
});

const requestHeaders = {
  "ORDERDESK-STORE-ID": STORE_ID,
  "ORDERDESK-API-KEY": API_KEY,
  "Content-type": "application/json",
};

const databasePutOptions = {
  hostname: FIREBASE_URL,
  path: FIREBASE_PATH,
  method: "PUT",
  port: 443,
  headers: {
    "Content-type": "application/json",
  },
};

//helper functions

// the previous version used fetch for getting this data, however the fetch API is not supported in many currently used versions
// of node js. Therefore, there was no error on my computer and an error on another one. I made a desicion to switch to https get method
//instead as it is widely supported. I used the fetch function in the precious version for a sole reason to
// show I can use different methods of getting data from an api =)

const getLatestProcessedDate = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: FIREBASE_URL,
      path: FIREBASE_PATH,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode === 200) {
          const latestDate = JSON.parse(data);
          resolve(new Date(latestDate).toISOString());
        } else {
          reject(
            new Error(`Request failed with status code ${res.statusCode}`)
          );
        }
      });
    });
    req.on("error", (error) => {
      reject(error);
    });
    req.end();
  });
};

const getNewOrders = async (latestDate) => {
  const searchStartDate = `search_start_date_local=${latestDate}`;
  const options = {
    host: STORE_URL,
    path: `${STORE_PATH}?${searchStartDate}`,
    headers: requestHeaders,
  };

  return new Promise((resolve, reject) => {
    https
      .get(options, (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          if (response.statusCode !== 200) {
            reject(
              new Error(
                `Request failed with status code ${response.statusCode}`
              )
            );
            return;
          }

          const { orders } = JSON.parse(data);
          resolve(orders);
        });
      })
      .on("error", (error) => {
        reject(error);
      });
  });
};

const sendDateToServer = (date) => {
  const request = https.request(databasePutOptions);

  request.on("error", (error) => {
    logger.error(error);
  });
  request.on("timeout", () => {
    logger.error("Request timed out");
    request.destroy();
  });
  request.on("response", (response) => {
    if (response.statusCode !== 200) {
      logger.error(`Request failed with status code ${response.statusCode}`);
    }
  });
  request.write(date);
  request.end();
};

const logNewOrder = (order) => {
  const { id, shipping } = order;
  const address =
    shipping.address1 ||
    shipping.address2 ||
    shipping.address3 ||
    shipping.address4;

  logger.info(
    `${new Date().toISOString()} New order: ID:${id}; shipping address: ${address}.`
  );
};

//the main function
const findNewOrders = async () => {
  try {
    const latestDate = await getLatestProcessedDate();
    const orders = await getNewOrders(latestDate);

    orders.forEach((order) => {
      logNewOrder(order);
    });

    sendDateToServer(JSON.stringify(Date.now()));
  } catch (error) {
    logger.error(error);
  }
};

cron.schedule("0 * * * *", () => {
  findNewOrders();
});
