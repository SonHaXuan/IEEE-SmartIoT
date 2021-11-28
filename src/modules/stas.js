require("dotenv").config();
import "../configs/mongoose.config";
import Models from "../models";
import _ from "lodash";
import fs from "fs";
import path from "path";
import readline from "linebyline";
import slug from "slug";
import axios from "axios";
import readXlsxFile from "read-excel-file/node";
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

(async () => {
  const header = [
    {
      id: "stt",
      title: "#",
    },
    {
      id: "appName",
      title: "App name",
    },
    {
      id: "category",
      title: "Category",
    },
  ];

  const rows = [];
  let apps = await Models.App.find({});
  apps = _.orderBy(apps, ["categoryName"], ["asc"]);

  apps = _.groupBy(apps, "categoryName");

  for (const categoryName in apps) {
    const element = apps[categoryName];

    console.log(`${categoryName}: ${element.length}`);
  }
  return;
  let stt = 1,
    sttno = 1;
  for (let i = 0; i < apps.length; i++) {
    const app = apps[i];

    rows.push({
      stt: !!app.privacyLink ? stt++ : sttno++,
      appName: app.appName,
      category: app.categoryName,
      hasPrivacyLink: !!app.privacyLink,
    });
  }

  const csvWriterHas = createCsvWriter({
    path: "apps(hasPP).csv",
    header,
  });
  await csvWriterHas.writeRecords(rows.filter((row) => row.hasPrivacyLink));

  const csvWriterNo = createCsvWriter({
    path: "apps(noPP).csv",
    header,
  });
  await csvWriterNo.writeRecords(rows.filter((row) => !row.hasPrivacyLink));

  console.log("DONE");
})();
