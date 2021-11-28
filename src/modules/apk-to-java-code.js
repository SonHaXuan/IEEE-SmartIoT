require("dotenv").config();
import "../configs/mongoose.config";
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
import Models from "../models";
import Helpers from "../helpers";
import Services from "../services";
const csv = require("csvtojson");
const _ = require("lodash");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const slug = require("slug");

async function main() {
  try {
    const limit = 3;
    let skip = 0;
    const contition = {
      isExistedMobiPurpose: true,
      isCompleted: false,
      appAPKPureId: { $exists: true },
    };
    let apps = await Models.App.find(contition).limit(limit).skip(skip);

    do {
      await Promise.all(apps.map((app) => _createNodes(app.id)));

      skip += limit;
      apps = await Models.App.find(contition).limit(limit).skip(skip);
    } while (apps && apps.length);
  } catch (err) {
    Helpers.Logger.error(err.message);
  }
}
main();

const _createNodes = async (appIdDB) => {
  let pathFileApk;
  let apkSourcePath;
  try {
    const app = await Models.App.findById(appIdDB);
    Helpers.Logger.step("Step 1: Get apk file from source");
    pathFileApk = _getApkFileFromSource(appIdDB, app.appName);

    if (!pathFileApk) throw new Error("Cannot find apk file");
    Helpers.Logger.step("Step 2: Parse APK to Text files by jadx");

    // execSync(`jadx -d "${apkSourcePath}" "${pathFileApk}"`);
    apkSourcePath = `/data/JavaCode/${appIdDB}`;

    if (!fs.existsSync(apkSourcePath)) execSync(`mkdir ${apkSourcePath}`);
    const jadxScript = `sh ./jadx/build/jadx/bin/jadx -d "${apkSourcePath}" "${pathFileApk}"`;
    console.log("jadxScript", jadxScript);
    execSync(jadxScript, {
      timeout: 1000 * 60 * 5, // 5 mins
    });

    await Models.AppTemp.create({
      appName: app.appName,
      type: "36k",
    });
    await Models.App.updateOne(
      {
        _id: appIdDB,
      },
      {
        isCompletedJVCode: true,
      }
    );

    Helpers.Logger.step("Step 3: Get content APK from source code");
    const contents = await Helpers.File.getContentOfFolder(
      `${apkSourcePath}/sources`
    );

    Helpers.Logger.step("Step 4: Get base line value for leaf nodes");
    const leafNodeBaseLines = await Services.BaseLine.initBaseLineForTree(
      contents
    );

    const functionConstants = leafNodeBaseLines.filter((node) => {
      return node.right - node.left === 1 && node.baseLine === 1;
    });
    Helpers.Logger.info(
      `Node data: ${JSON.stringify(functionConstants, null, 2)}`
    );

    const appData = {
      isCompleted: true,
      nodes: functionConstants.map((item) => {
        return {
          id: item._id,
          name: item.name,
          value: item.baseLine,
          parent: item.parent._id,
        };
      }),
    };

    Helpers.Logger.info(`APP DATA: ${JSON.stringify(appData, null, 2)}`);
    // create app
    await Models.App.updateOne(
      {
        _id: appIdDB,
      },
      {
        $set: appData,
      },
      {},
      (err, data) =>
        Helpers.Logger.info(`Data saved: ${JSON.stringify(data, null, 2)}`)
    );

    return;
  } catch (err) {
    Helpers.Logger.error(`ERROR: _createNodes Failed ${err.message}`);
  }
};

function ThroughDirectory(Directory, Files = []) {
  fs.readdirSync(Directory).forEach((File) => {
    const Absolute = path.join(Directory, File);
    if (fs.statSync(Absolute).isDirectory())
      return ThroughDirectory(Absolute, Files);
    else Files.push(Absolute);
  });

  return Files;
}

function _getApkFileFromSource(appId, appName) {
  let apkPath = "";
  const apkFilesInFolder1 = ThroughDirectory(
    "/data/apkfile/new_top_apps_Download"
  );
  const apkFilesInFolder2 = ThroughDirectory("/data/apkfile/top_apps_Download");
  const apkFilesInFolder3 = ThroughDirectory("/data/apkfile/mobipurpose-apks");
  const apkFilesInFolder4 = ThroughDirectory("/home/son/apkfile/mobipurpose-apks");
  
  const apkFiles = [
    ...apkFilesInFolder1,
    ...apkFilesInFolder2,
    ...apkFilesInFolder3,
    ...apkFilesInFolder4
  ];

  // find in folder
  for (let i = 0; i < apkFiles.length; i++) {
    const apkFile = apkFiles[i];

    if (apkFile.includes(appId) || apkFile.includes(appName)) {
      apkPath = apkFile;
      break;
    }
  }
  return apkPath;
}
