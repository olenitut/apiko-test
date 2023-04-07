const https = require("https");
const cron = require("node-cron");
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.simple(),
  transports: new winston.transports.File({ filename: "app.log" }),
});

const sendDateToServer = require("./sendDateToServer");

const databaseUrl =
  "https://apiko-test-774c2-default-rtdb.firebaseio.com/apiko/-NSQPFdG8lsREoG3ral5.json";

const myHeaders = {
  "ORDERDESK-STORE-ID": 52170,
  "ORDERDESK-API-KEY": "xisZL2Z7CrjKkxh2qrJh64RfpZqd48H2tonLWBpF6zX4kqpt7t",
  "Content-type": "application/json",
};

const fetchLatestOrders = async () => {
  const dateRes = await fetch(databaseUrl);
  const latestDate = await dateRes.json();
  const dateString = new Date(latestDate).toISOString();

  const getOrdersOptions = {
    host: "app.orderdesk.me",
    path: "/api/v2/orders?search_start_date_local=" + dateString,
    headers: myHeaders,
  };

  https.get(getOrdersOptions, (response) => {
    let data = "";

    response.on("data", (chunk) => {
      data += chunk;
    });

    response.on("end", () => {
      const latestOrders = JSON.parse(data).orders;

      latestOrders.forEach((order) => {
        const id = order.id;
        const address =
          order.shipping.address1 ||
          order.shipping.address2 ||
          order.shipping.address3 ||
          order.shipping.address4;
        logger.info(
          `${new Date()} New order: ID:${id}; shipping address: ${address}.`
        );

        sendDateToServer(JSON.stringify(Date.now()));
      });
    });
  });
};

cron.schedule("0 * * * *", () => {
  fetchLatestOrders();
});
