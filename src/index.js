require("dotenv").config();
import express from "express";
import morgan from "morgan";
import path from "path";
import bodyParser from "body-parser";
import routes from "./routes";
import Helpers from "./helpers";
import fs from "fs";
import _ from "lodash";
import "./configs/mongoose.config";
import Models from "./models";
const app = express();

app.use(morgan("tiny"));

// set the view engine to ejs
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));
app.use(express.static(path.join(__dirname, "../public")));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

async function initData() {
  // init tree on database
  // await Helpers.Init.initTreeOnDB();
  // init apps on database
  // Helpers.Init.initAppsOnDB();
  // init apps on database by csv
  // await Helpers.Init.initAppsOnDBByCSV();
  // init apps on database (36k)
  await Helpers.Init.initeJavaSourceCode();
  // await Helpers.Init.getAppsUninstall();
  // await Helpers.Init.updateApps();
}
initData();

async function main() {
  const createCsvWriter = require("csv-writer").createObjectCsvWriter;

  const header = [
    {
      id: "stt",
      title: "STT",
    },
    {
      id: "dataType",
      title: "Data type",
    },
    {
      id: "api",
      title: "api",
    },
    {
      id: "class",
      title: "class",
    },
    {
      id: "function",
      title: "function",
    },
    {
      id: "count",
      title: "so lan xuat hien",
    },
    {
      id: "desc",
      title: "desciption",
    },
  ];
  const rows = [];
  const result = {};
  const tree = await Models.Tree.find({
    parent: "602951a2163e554ddd9a1262",
  });

  let skip = 0;
  let apps = await Models.App.find({}).limit(1000).skip(skip);
  let appsApis = [];
  while (apps.length) {
    const appApis = apps.map((app) => {
      const apis = app.apisModel ? JSON.parse(app.apisModel) : {};
      const apisUsed = Object.entries(apis).reduce((acc, [key, value]) => {
        if (value == 1) acc.push(key.trim().replace(/\./g, ""));

        return acc;
      }, []);

      return {
        ...app.toJSON(),
        apis: apisUsed,
      };
    });

    appsApis = [...appsApis, ...appApis];

    skip += 1000;
    // apps = [];
    apps = await Models.App.find({}).limit(1000).skip(skip);
  }

  console.log("RUNNING data TYpe");
  for (let i = 0; i < tree.length; i++) {
    const dataType = tree[i];
    console.log(dataType.name);

    !result[dataType.name] &&
      (result[dataType.name] = {
        apis: [],
      });
    // apis
    const apis = await Models.Tree.find({
      parent: dataType.id,
    });

    for (let j = 0; j < apis.length; j++) {
      const api = apis[j].toJSON();

      let indexApi = result[dataType.name].apis.findIndex(
        (item) => item.name === api.name
      );
      if (indexApi === -1)
        result[dataType.name].apis.push({
          ...api,
          count: 0,
          classes: [],
        });
      indexApi = result[dataType.name].apis.findIndex(
        (item) => item.name === api.name
      );

      // count
      for (let f = 0; f < appsApis.length; f++) {
        const apisApp = appsApis[f];

        if (apisApp.apis.includes(api.name.trim().replace(/\./g, ""))) {
          result[dataType.name].apis[indexApi].count++;
        }
      }

      // classes
      const classes = await Models.Tree.find({
        parent: api.id,
      });
      for (let k = 0; k < classes.length; k++) {
        const class1 = classes[k].toJSON();

        let indexClass = result[dataType.name].apis[indexApi].classes.findIndex(
          (item) => item.name === class1.name
        );
        if (indexClass === -1)
          result[dataType.name].apis[indexApi].classes.push({
            ...class1,
            functions: [],
          });
        indexClass = result[dataType.name].apis[indexApi].classes.findIndex(
          (item) => item.name === class1.name
        );
        // functions
        const functions = await Models.Tree.find({
          parent: class1.id,
        });

        for (let l = 0; l < functions.length; l++) {
          const function1 = functions[l].toJSON();

          result[dataType.name].apis[indexApi].classes[
            indexClass
          ].functions.push(function1);
        }
      }
    }
  }

  let stt = 1;
  for (const dataType in result) {
    const { apis } = result[dataType];

    apis.forEach((api) => {
      const { classes } = api;

      classes.forEach((class1) => {
        let { functions } = class1;
        functions = _.uniqBy(functions, "name");

        functions.forEach((function1) => {
          rows.push({
            stt: stt++,
            dataType,
            api: api.name,
            class: class1.name,
            function: function1.name,
            count: api.count,
            desc: function1.desc,
          });
        });
      });
    });
  }

  const csvWriterNo = createCsvWriter({
    path: "file2.csv",
    header,
  });
  await csvWriterNo.writeRecords(rows);

  console.log("DONE");
}
// main();

async function main1() {
  const createCsvWriter = require("csv-writer").createObjectCsvWriter;
  console.log(1);
  const header = [
    {
      id: "stt",
      title: "STT",
    },
    {
      id: "type",
      title: "type",
    },
    {
      id: "count",
      title: "so lan xuat hien",
    },
    {
      id: "keyvalue",
      title: "Key & Value",
    },
  ];
  const result = {};
  var readline = require("linebyline"),
    rl = readline("/Users/a1234/Downloads/data_collect_purpose.json");
  rl.on("line", function (line, lineCount, byteCount) {
    // do something with the line of text
    const app = JSON.parse(line);
    if (app && app.data) {
      const values = Object.values(app.data);

      for (const key in app.data) {
        const value = app.data[key];
        let valType = value.split("|");
        const valueOfKey = valType[0];

        valType.splice(0, 1);
        valType.splice(-1, 1);

        const typeVAlue = valType.join("|").trim();

        // const key = valType[valType.length - 1].trim();
        result[typeVAlue + "&&&" + `${key}: ${valueOfKey}`]
          ? result[typeVAlue + "&&&" + `${key}: ${valueOfKey}`]++
          : (result[typeVAlue + "&&&" + `${key}: ${valueOfKey}`] = 1);
      }
    }
  })
    .on("error", function (e) {
      // something went wrong
    })
    .on("close", function (e) {
      const rows = Object.entries(result).map((item, index) => {
        return {
          stt: index + 1,
          type: item[0].split("&&&")[0],
          count: item[1],
          keyvalue: item[0].split("&&&")[1],
        };
      });
      const csvWriterNo = createCsvWriter({
        path: "file1-type.csv",
        header,
      });
      csvWriterNo.writeRecords(rows);

      console.log("DONE");
    });
}
// main1();

async function main2() {
  const result = [];
  var readline = require("linebyline"),
    rl = readline("/Users/a1234/Downloads/data_collect_purpose.json");
  rl.on("line", function (line, lineCount, byteCount) {
    // do something with the line of text
    const app = JSON.parse(line);

    result.push(app.app);
  })
    .on("error", function (e) {
      // something went wrong
    })
    .on("close", function (e) {
      console.log(result);

      console.log("DONE");
    });
}
// main2();
app.get("/", function (req, res) {
  res.render("pages/index");
});

// routes
app.use(routes);

// const PORT = process.env.PORT || 3333;
// app.listen(PORT, () =>
//   Helpers.Logger.info("Server listening on: http://localhost:3333")
// );
