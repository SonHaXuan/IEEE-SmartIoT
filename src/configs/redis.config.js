import redis from "redis";
import Utils from "../utils";

const { REDIS_HOST } = process.env;

const redisClient = redis.createClient();

redisClient.select(0);

redisClient.on("connect", () => {
  Utils.Logger.info("💗  Redis client connected");
});

redisClient.on("error", (err) => {
  Utils.Logger.info("Something went wrong " + err);
});

export default redisClient;
