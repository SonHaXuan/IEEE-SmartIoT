require("dotenv").config();
import "../configs/mongoose.config";
import Models from "../models";
import Services from "../services";
import Helpers from "../helpers";
import _ from "lodash";
import fs from "fs";
import path from "path";

const apkSourcePath = "/home/son/apkfile/mobipurpose-apks";
async function main() {
  Helpers.Logger.info("Running");
  const apps = await Models.App.find({
    isExistedMobiPurpose: true,
    appAPKPureId: { $exists: false },
  });
  // const appChunk = _.chunk(_.map(apps, "appName"), 200);

  // appChunk.forEach((appNames, index) => {
  //   fs.writeFile(
  //     path.join(__dirname, `/mobipurpose-apps/list_apps${index + 1}.txt`),
  //     JSON.stringify(appNames),
  //     null,
  //     () => {}
  //   );
  // });
  // return;
  for (let i = 0; i < apps.length; i++) {
    await sleep(10000 * 5);
    const app = apps[i];
    const { appName, id } = app;
    console.log(`Running ${i}/${apps.length}`);
    try {
      Helpers.Logger.step("Step 1: Search apps from APK Pure");
      const listAppIdsFromAPKPure = await Services.APKPure.seach(appName);
      if (!listAppIdsFromAPKPure || !listAppIdsFromAPKPure.length)
        throw new Error("No app found from APK Pure");
      await sleep(3000);
      const appAPKPureId = listAppIdsFromAPKPure[0];

      Helpers.Logger.step("Step 2: Download apk");
      await Services.APKPure.download(appName, appAPKPureId, id, apkSourcePath);

      await Models.App.updateOne(
        {
          _id: id,
        },
        {
          $set: {
            appAPKPureId,
          },
        },
        {},
        (err, data) =>
          Helpers.Logger.info(`Data saved: ${JSON.stringify(data, null, 2)}`)
      );
    } catch (err) {
      Helpers.Logger.error(err.message);
    }
  }
}

function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
main();
