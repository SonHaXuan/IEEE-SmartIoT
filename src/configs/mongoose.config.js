const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
import mongoose from "mongoose";
import Helpers from "../helpers";
import MongooseCache from "mongoose-redis";

const { MONGODB_URL, REDIS_HOST, REDIS_PORT } = process.env;

mongoose.connect(MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on("error", (err) => {
  Helpers.Logger.error(err);
});
mongoose.set("debug", true);

MongooseCache(mongoose, `redis://${REDIS_HOST}:${REDIS_PORT}`);
