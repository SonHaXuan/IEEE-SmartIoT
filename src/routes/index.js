import express from "express";
import Services from "../services";
import Models from "../models";
import Helpers from "../helpers";
import chalk from "chalk";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import _ from "lodash";
import fs from "fs";
import rimraf from "rimraf";
Models.App.deleteMany({ isCompleted: false });
const escapeStringRegexp = require("escape-string-regexp");

const { execSync, spawn } = require("child_process");
const router = express.Router();

router.post("/app", async (req, res) => {
  try {
    const { appName } = req.body;

    Helpers.Logger.step("Step 1: Search apps from APK Pure");
    const listAppIdsFromAPKPure = await Services.APKPure.seach(appName);
    if (!listAppIdsFromAPKPure || !listAppIdsFromAPKPure.length)
      throw new Error("No app found from APK Pure");

    const appAPKPureId = listAppIdsFromAPKPure[0];
    Helpers.Logger.step("Step 2: Get app info from APK pure");
    const { AppId: AppIdCHPlay } = await Services.APKPure.getInfoApp(
      appAPKPureId
    );

    const appInfo = await Services.CHPLAY.getInfoApp(AppIdCHPlay);

    let appDB = await Models.App.findOne({
      appName: { $regex: escapeStringRegexp(appInfo.appName) },
    });

    if (!appDB || (appDB && !appDB.isCompleted)) {
      // create app
      if (!appDB) {
        appDB = await Models.App.create({
          ...appInfo,
          appAPKPureId,
          isCompleted: false,
        });
      }

      const data = {
        ...appInfo,
        appAPKPureId,
        id: appDB.id,
      };

      Helpers.Logger.step("App Response: ", JSON.stringify(data, null, 2));
      return res.json({
        data,
        isExisted: false,
      });
    }

    Helpers.Logger.info("The app was existed");
    appDB = appDB.toJSON();

    appDB.tree = await buildTreeFromNodeBaseLine(appDB.nodes);

    Helpers.Logger.step("App Response: ", JSON.stringify(appDB, null, 2));
    return res.json({
      data: appDB,
      isExisted: true,
    });
  } catch (err) {
    console.error(err);
    Helpers.Logger.error(`${err.message}`);
  }
});

router.put("/app/:id/nodes", async (req, res) => {
  const { id: appIdDB } = req.params;
  let pathFileApk;
  let apkSourcePath;
  try {
    Helpers.Logger.step(
      "Step 0: Get nodes" + JSON.stringify(req.params, null, 2)
    );
    const appDB = await Models.App.findById(appIdDB).cache(60 * 60 * 24 * 30);

    const { appAPKPureId, appName } = appDB;
    apkSourcePath = path.join(
      __dirname,
      `../../sourceTemp/${appAPKPureId.replace(/\//g, "")}`
    );

    Helpers.Logger.step("Step 1: Download apk");
    // download first app
    pathFileApk = await Services.APKPure.download(appName, appAPKPureId);
    if (!pathFileApk) throw new Error("Cannot download apk");

    Helpers.Logger.step("Step 2: Parse APK to Text files by jadx");

    // execSync(`jadx -d "${apkSourcePath}" "${pathFileApk}"`);
    execSync(
      `sh ./jadx/build/jadx/bin/jadx -d "${apkSourcePath}" "${pathFileApk}"`
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

    const treeResult = await buildTreeFromNodeBaseLine(functionConstants);

    res.json(treeResult);

    // remove file and folder
    if (fs.existsSync(__dirname + "/../../" + apkSourcePath)) {
      rimraf(__dirname + "/../../" + apkSourcePath, function () {
        Helpers.Logger.info("folder removed");
      });
    }
    if (fs.existsSync(__dirname + "/../../" + pathFileApk)) {
      fs.unlinkSync(__dirname + "/../../" + pathFileApk);
    }
  } catch (err) {
    // remove file and folder
    if (fs.existsSync(__dirname + "/../../" + apkSourcePath)) {
      rimraf(__dirname + "/../../" + apkSourcePath, function () {
        Helpers.Logger.info("folder removed");
      });
    }
    if (fs.existsSync(__dirname + "/../../" + pathFileApk)) {
      fs.unlinkSync(__dirname + "/../../" + pathFileApk);
    }

    console.error(err);
    Helpers.Logger.error(`${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

router.post("/transform", async (req, res) => {
  try {
    const { appName } = req.body;
    console.log(appName);
    res.render("pages/transform", { appName });
  } catch (err) {
    console.error(err);
    Helpers.Logger.error(`${err.message}`);
  }
});

router.post("/transform1", async (req, res) => {
  try {
    console.time("Download APK Pure");
    const { appName } = req.body;

    const appDB = await Models.App.findOne({
      name: { $regex: ".*" + appName + ".*" },
    });
    let data = {};
    if (!appDB) {
      Helpers.Logger.step("Step 1: Search apps from APK Pure");
      const listAppIdsFromAPKPure = await Services.APKPure.seach(appName);
      if (!listAppIdsFromAPKPure.length)
        throw new Error("No app found from APK Pure");
      Helpers.Logger.step("Step 2: Download app from APK Pure");

      const appAPKPureId = listAppIdsFromAPKPure[0];

      const { AppId: AppIdCHPlay } = await Services.APKPure.getInfoApp(
        appAPKPureId
      );
      const apkSourcePath = "sourceTemp" + appAPKPureId;

      if (!fs.existsSync(apkSourcePath)) {
        // download first app
        const pathFileApk = await Services.APKPure.download(
          appName,
          appAPKPureId
        );

        console.timeEnd("Download APK Pure");
        console.time("Parse APK Pure");
        Helpers.Logger.step("Step 3: Parse APK to Text files by jadx");
        // execSync(`jadx -d ${apkSourcePath} ${pathFileApk}`);
        execSync(
          `sh ./jadx/build/jadx/bin/jadx -d ${apkSourcePath} ${pathFileApk}`
        );
      }
      // TODO: check folder existed
      Helpers.Logger.step("Step 4: Get content APK from source code");
      const contents = await Helpers.File.getContentOfFolder(
        `${apkSourcePath}/sources`
      );

      console.timeEnd("Parse APK Pure");

      console.time("Baseline");
      Helpers.Logger.step("Step 5: Get tree");

      const startDAPTime = process.hrtime();
      let tree = await Models.Tree.find().cache(60 * 60 * 24 * 30);
      // const leafNodes = tree.filter((node) => node.right - node.left === 1);
      Helpers.Logger.step("Step 6: Get base line value for leaf nodes");
      tree = await Services.BaseLine.initBaseLineForTree(tree, contents);

      const functionConstants = tree.filter((node) => {
        return node.right - node.left === 1 && node.baseLine === 1;
      });

      const appInfo = await Services.CHPLAY.getInfoApp(AppIdCHPlay);

      data = {
        ...appInfo,
        nodes: functionConstants,
      };
      // create app
      await Models.App.create({
        ...appInfo,
        nodes: functionConstants.map((item) => {
          return {
            id: item._id,
            name: item.name,
            value: item.baseLine,
            parent: item.parent,
          };
        }),
      });
    } else {
      Helpers.Logger.info("The app was existed");
      data = appDB;
    }

    data.tree = await buildTreeFromNodeBaseLine(data.nodes);
    res.render("pages/transform", data);
  } catch (err) {
    console.error(err);
    Helpers.Logger.error(`${err.message}`);
  }
});

async function buildTreeFromNodeBaseLine(functionConstants) {
  const result = [];
  for (let i = 0; i < functionConstants.length; i++) {
    const functionConstant = functionConstants[i];
    // lv 3
    const lv3 = await Models.Tree.findById(functionConstant.parent);

    const lv2 = await Models.Tree.findById(lv3.parent);

    const lv1 = await Models.Tree.findById(lv2.parent);
    let lv1InResult = result.filter((item) => item.id === lv1.id)[0];
    // check exist lv1
    if (!lv1InResult) {
      // total childrent of lv1
      // const totalChildren = await Models.Tree.count({
      //   parent: lv1.id,
      // });
      const data = {
        ...lv1.toJSON(),
        totalChildren: getTotalBySubTree(lv1.name, 2),
        children: [],
      };

      result.push(data);
    }
    lv1InResult = result.filter((item) => item.id === lv1.id)[0];

    // check exist lv2
    let lv2InResult = lv1InResult.children.filter(
      (item) => item.id === lv2.id
    )[0];
    if (!lv2InResult) {
      // const totalChildren = await Models.Tree.count({
      //   parent: lv2.id,
      // });
      const data = {
        ...lv2.toJSON(),
        totalChildren: getTotalBySubTree(lv1.name, 3),
        children: [],
      };

      lv1InResult.children.push(data);
    }
    lv2InResult = lv1InResult.children.filter((item) => item.id === lv2.id)[0];

    // check exist lv2
    const lv3InResult = lv2InResult.children.filter(
      (item) => item.id === lv3.id
    )[0];
    if (!lv3InResult) {
      // const totalChildren = await Models.Tree.count({
      //   parent: lv3.id,
      // });
      const data = {
        ...lv3.toJSON(),
        totalChildren: getTotalBySubTree(lv1.name, 4),
        children: [functionConstant],
      };

      lv2InResult.children.push(data);
    } else {
      // push to lv 2
      lv3InResult.children.push(functionConstant);
    }
  }

  return result;
}

function getTotalBySubTree(name, lv) {
  switch (name) {
    case "Location":
      if (lv === 2) {
        return 6;
      } else if (lv === 3) {
        return 92;
      } else if (lv === 4) {
        return 1275;
      }
      break;
    case "Media":
      if (lv === 2) {
        return 24;
      } else if (lv === 3) {
        return 588;
      } else if (lv === 4) {
        return 7585;
      }
      break;

    case "Connection":
      if (lv === 2) {
        return 13;
      } else if (lv === 3) {
        return 329;
      } else if (lv === 4) {
        return 3634;
      }
      break;

    case "Hardware":
      if (lv === 2) {
        return 8;
      } else if (lv === 3) {
        return 84;
      } else if (lv === 4) {
        return 1232;
      }
      break;

    case "Telephony":
      if (lv === 2) {
        return 8;
      } else if (lv === 3) {
        return 127;
      } else if (lv === 4) {
        return 1942;
      }
      break;

    case "User info":
      if (lv === 2) {
        return 2;
      } else if (lv === 3) {
        return 58;
      } else if (lv === 4) {
        return 577;
      }
      break;

    case "Health and fitness":
      if (lv === 2) {
        return 5;
      } else if (lv === 3) {
        return 82;
      } else if (lv === 4) {
        return 872;
      }
      break;

    default:
      break;
  }
}
async function mainTest() {
  try {
    const appName = "facebook";
    Helpers.Logger.step("Step 1: Search apps from APK Pure");
    const listAppIdsFromAPKPure = await Services.APKPure.seach(appName);
    if (!listAppIdsFromAPKPure.length)
      throw new Error("No app found from APK Pure");
    Helpers.Logger.step("Step 2: Download app from APK Pure");
    // download first app
    const pathFileApk = await Services.APKPure.download(
      appName,
      listAppIdsFromAPKPure[0]
    );
    Helpers.Logger.step("Step 3: Parse APK to Text files by jadx");
    const apkSourcePath = "./sourceTemp/" + uuidv4();
    execSync(`jadx -d ${apkSourcePath} ${pathFileApk}`);
    Helpers.Logger.step("Step 4: Get content APK from source code");
    const contents = await Helpers.File.getContentOfFolder(
      `${apkSourcePath}/sources`
    );

    Helpers.Logger.step("Step 5: Get tree");
    const tree = await Models.Tree.find();

    Helpers.Logger.step("Step 6: Get base line value for leaf nodes");
    await Services.BaseLine.initBaseLineForTree(tree, contents);

    const result = tree.filter((node) => {
      return node.right - node.left === 1 && node.baseLine === 1;
    });

    console.log(result);
  } catch (err) {
    console.error(err);
    Helpers.Logger.error(`${err.message}`);
  }
}
var elapsed_time = function (start) {
  console.log(process.hrtime(start));
  var precision = 3; // 3 decimal places
  var elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli

  return process.hrtime(start)[0] + "s, " + elapsed.toFixed(precision) + " ms ";
};
// mainTest();
export default router;
