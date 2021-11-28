const env = process.env.NODE_ENV || "development";
let path;
if (env === "production") {
  path = "./.env_pro";
} else {
  path = "./.env_dev";
}

require("dotenv").config({
  path,
});
