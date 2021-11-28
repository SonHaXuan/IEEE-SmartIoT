require("dotenv").config();
import "../src/configs/mongoose.config";
import Models from "../src/models";
import _ from "lodash";
async function main() {
  const apps = await Models.App.find();

  const appGroups = _.groupBy(apps, "categoryName");

  const result = {};
  // loop category
  for (const category in appGroups) {
    result[category] = [];
    const appsInCate = appGroups[category];
    console.log(category, appsInCate.length);
    const nodes = _.flatten(_.map(appsInCate, "nodes"));

    const nodeGroups = _.groupBy(nodes, "name");

    // loop function group
    for (const functionName in nodeGroups) {
      const nodeGroup = nodeGroups[functionName];

      // caculate percent
      const percentage = nodeGroup.length / appsInCate.length;
      if (percentage > 0.5) {
        result[category].push(functionName);
      }
    }
  }
  console.log(result);
}

main();
