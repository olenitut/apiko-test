This is an app that synchronizes new orders from the OrderDesk CRM service.

It uses Node.js as well as several Node modules: node-cron for scheduling an every hour run of the application and winston for logging.

Every hour:

- the program fetches the previous time orders were requested at from the firebase database;
- then it makes a GET request to the Order Desk API with query params for getting only orders after the time fetched
- afterwards, the program logs data about each new order to the log file
- finally, the program sends new time to the database;
