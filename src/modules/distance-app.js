require("dotenv").config();
import "../configs/mongoose.config";
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
import Models from "../models";
import _ from "lodash";
const categoryGroups = {
  Beauty: ["Beauty", "Lifestyle"],
  Business: ["Business"],
  Education: ["Education", "Educational"],
  Entertainment: ["Entertainment", "Photography"],
  Finance: [
    "Finance",
    "Events",
    "Action",
    "Action & Adventure",
    "Adventure",
    "Arcade",
    "Art & Design",
    "Auto & Vehicles",
    "Board",
    "Books & Reference",
    "Brain Games",
    "Card",
    "Casino",
    "Casual",
    "Comics",
    "Creativity",
    "House & Home",
    "Libraries & Demo",
    "News & Magazines",
    "Parenting",
    "Pretend Play",
    "Productivity",
    "Puzzle",
    "Racing",
    "Role Playing",
    "Simulation",
    "Strategy",
    "Trivia",
    "Weather",
    "Word",
  ],
  "Food & Drink": ["Food & Drink"],
  "Health & Fitness": ["Health & Fitness"],
  "Maps & Navigation": ["Maps & Navigation"],
  Medical: ["Medical"],
  "Music & Audio": [
    "Music & Audio",
    "Video Players & Editors",
    "Music & Video",
    "Music",
  ],
  Shopping: ["Shopping"],
  Social: ["Social", "Dating", "Communication"],
  Sports: ["Sports"],
  Tools: ["Tools", "Personalization"],
  "Travel & Local": ["Travel & Local"],
};
const categories = [
  "Beauty",
  "Lifestyle",
  "Business",
  "Education",
  "Educational",
  "Entertainment",
  "Photography",
  "Finance",
  "Events",
  "Action",
  "Action & Adventure",
  "Adventure",
  "Arcade",
  "Art & Design",
  "Auto & Vehicles",
  "Board",
  "Books & Reference",
  "Brain Games",
  "Card",
  "Casino",
  "Casual",
  "Comics",
  "Creativity",
  "House & Home",
  "Libraries & Demo",
  "News & Magazines",
  "Parenting",
  "Pretend Play",
  "Productivity",
  "Puzzle",
  "Racing",
  "Role Playing",
  "Simulation",
  "Strategy",
  "Trivia",
  "Weather",
  "Word",
  "Food & Drink",
  "Health & Fitness",
  "Maps & Navigation",
  "Medical",
  "Music & Audio",
  "Video Players & Editors",
  "Music & Video",
  "Music",
  "Shopping",
  "Social",
  "Dating",
  "Communication",
  "Sports",
  "Tools",
  "Personalization",
  "Travel & Local",
];
async function createTree(data, parent = null, pathNode = "") {
  // let result = [];
  // const nodes = await Models.Tree.find({
  //   parent,
  // }).cache(60 * 60 * 24 * 30);
  // if (nodes && nodes.length === 0) return result;

  // for (let i = 0; i < nodes.length; i++) {
  //   const node = nodes[i];

  //   if(!["Connection", "Hardware", "Health&Fitness", "Location", "Media", "Telephony", "UserInfo"].includes(node.name))  {
  //     path = path + `${i}.`

  //   }
  //   const children = await createTree(data, node.id, path);

  //   result.push({
  //     ...JSON.parse(JSON.stringify(node)),
  //     mappingFunction: _.includes(data, node.name) ? 1 : 0,
  //     children: children.length ? children : null,
  //     path,
  //   });
  // }

  // return result;
  let result = [];
  const nodes = await Models.Tree.find({
    parent,
  }).cache(60 * 60 * 24 * 30);
  if (nodes && nodes.length === 0) return result;

  const pathData = pathNode;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const children = await createTree(data, node.id, `${pathNode}.${i}`);

    result.push({
      ...JSON.parse(JSON.stringify(node)),
      mappingFunction: _.includes(data, node.name) ? 1 : 0,
      children: children.length ? children : null,
      path: `${pathData}.${i}`.trim("."),
    });
  }

  return result;
}

function initBaseLineForTree(treeChild, nodeNameData) {
  if (~nodeNameData.indexOf(treeChild.name)) {
    treeChild.baseLine = 1;
  } else treeChild.baseLine = 0;

  if (treeChild.children && treeChild.children.length) {
    treeChild.children.forEach((item) =>
      initBaseLineForTree(item, nodeNameData)
    );
  }
}
function getComparedNodes(comparingNode, tree) {
  const { name: nodeName, path: nodePath } = comparingNode;

  let arrayPaths = nodePath.split(".").filter((item) => !!item);

  let node = tree;

  for (let j = 2; j < arrayPaths.length; j++) {
    const arrayPath = arrayPaths[j];

    node = node.children[arrayPath];
  }

  // if (node.baseLine == 1) return { name: node.name, path: nodePath };

  return getComparedNodesBigValue(comparingNode, tree);
}
function getComparedNodesBigValue(comparingNode, tree, retry = 1) {
  const { path: nodePath } = comparingNode;
  if (retry === 7) return;
  if (nodePath !== undefined) {
    let arrayPaths = nodePath.split(".").filter((item) => !!item);

    let node = tree;

    for (let j = 2; j < arrayPaths.length - 1; j++) {
      const arrayPath = arrayPaths[j];
      node = node.children[arrayPath];
    }
    const childrenNodeValues = node.children.map((item) => {
      return item.mappingFunction;
    });
    const bigValue = Math.max(...childrenNodeValues);
    if (bigValue != 0) {
      const indexOfBigValue = _.indexOf(childrenNodeValues, bigValue);

      const parentPath = arrayPaths.slice(0, arrayPaths.length - 1);
      parentPath.push(indexOfBigValue);

      return {
        name: node.children[indexOfBigValue].name,
        path: _.join(parentPath, "."),
      };
    } else {
      return getComparedNodesBigValue(node, tree, ++retry);
    }
  }
}

function getFlattenTrees(trees, result) {
  if (trees.children) {
    trees.children.forEach((item) => getFlattenTrees(item, result));
  }
  delete trees.children;
  result.push(trees);
}

function getCommonNode(comparingNode, comparedNode, tree) {
  const { path: comparingPath } = comparingNode;
  const { path: comparedPath } = comparedNode;

  const comparingPathArray = comparingPath.split(".").filter((item) => !!item); // path
  const comparedPathArray = comparedPath.split(".").filter((item) => !!item); // path

  let deepLevelOfCommonNode = 0;
  for (let i = 0; i < comparingPathArray.length; i++) {
    if (comparingPathArray[i] == comparedPathArray[i]) deepLevelOfCommonNode++;
    else break;
  }

  if (!deepLevelOfCommonNode) {
    return {
      name: tree.name,
      path: -1,
    };
  }
  // get common node by deep
  let commonNode = tree;
  for (let i = 2; i < deepLevelOfCommonNode; i++) {
    commonNode = commonNode.children[comparingPathArray[i]];
  }

  return {
    name: commonNode.name,
    path: commonNode.path,
  };
}

function getBaseLineVaLueOfNode(searchedNode, tree) {
  const { path: nodePath } = searchedNode;

  // node root
  if (nodePath == "" || nodePath == -1) return tree.baseLine;

  let arrayPaths = nodePath.split(".").filter((item) => !!item);

  let node = tree;
  for (let j = 2; j < arrayPaths.length; j++) {
    const arrayPath = arrayPaths[j];
    node = node.children[arrayPath];
  }

  return node.baseLine;
}

function getDistanceToCommonNode(node) {
  const { path } = node;

  if (path == -1) return 0;

  return path.split(".").filter((item) => !!item).length - 2;
}

function getDistanceFromNodeToCommonNode(node, commonNode) {
  if (commonNode.path === -1) return node.path.split(".").length;

  return (
    node.path.split(".").filter((item) => !!item).length -
    commonNode.path.split(".").filter((item) => !!item).length
  );
}

async function computingDistance() {
  try {
    console.log("Running computingDistance");
    // for (let i = 0; i < categories.length; i++) {
    //   const category = categories[i];
    //   console.log(`Running on ${category} category`);
    // GET DAP
    const dapCategory = await Models.CategoryDataset.findOne({
      // categoryName: category,
    });
    const trees = (await createTree(_.map(dapCategory.nodes, "name")))[0];

    //
    // const appsOurDataSet = await Models.BeginDataset.find({
    //   // categoryName: category,
    //   // isCompleted: true,
    // });
    // console.log(1, appsOurDataSet.length);
    // for (let k = 0; k < appsOurDataSet.length; k++) {
    //   try {
    //     const app = appsOurDataSet[k];
    //     console.log(`app ${k}.${app.appName}`);
    //     const appNodes = app.nodes;
    //     let totalDistance = 0;
    //     let totalLeafNode = 0;
    //     // ============ LOOP TREES =============
    //     for (let j = 0; j < trees.children.length; j++) {
    //       const treeChild = trees.children[j];

    //       let flattenTree = [];

    //       initBaseLineForTree(treeChild, _.map(appNodes, "name"));
    //       getFlattenTrees(JSON.parse(JSON.stringify(treeChild)), flattenTree);

    //       // compareing nodes
    //       let comparingNodes = flattenTree.filter(
    //         (item) => item.baseLine === 1
    //       );

    //       totalLeafNode += comparingNodes.length;
    //       for (let g = 0; g < comparingNodes.length; g++) {
    //         const comparingNode = comparingNodes[g];
    //         const comparedNode = getComparedNodes(comparingNode, treeChild);

    //         let result;
    //         // if comparedNode exist
    //         if (comparedNode) {
    //           if (comparingNode.path === comparedNode.path) {
    //             result = 0;
    //           } else {
    //             const commonNode = getCommonNode(
    //               comparingNode,
    //               comparedNode,
    //               treeChild
    //             );

    //             const vRoot = treeChild.baseLine;
    //             const vCaa = getBaseLineVaLueOfNode(commonNode, treeChild);
    //             const depthCaa = getDistanceToCommonNode(commonNode);

    //             const vN1 = getBaseLineVaLueOfNode(comparingNode, treeChild);

    //             const vN2 = getBaseLineVaLueOfNode(comparedNode, treeChild);

    //             const disN1 = getDistanceFromNodeToCommonNode(
    //               comparingNode,
    //               commonNode
    //             );

    //             const disN2 = getDistanceFromNodeToCommonNode(
    //               comparedNode,
    //               commonNode
    //             );

    //             result =
    //               1 -
    //               ((2 * (1 - vCaa) * depthCaa) /
    //                 ((1 - vN1) * disN1 * (1 - vCaa) +
    //                   (1 - vN2) * disN2 * (1 - vCaa) +
    //                   2 * (1 - vCaa) * depthCaa) || 0);

    //             // giai thuat ban đầu
    //             // const result =
    //             // 1 -
    //             // ((2 * (1 - vRoot) * (1 - vCaa) * depthCaa) /
    //             //   ((1 - vN1) * disN1 * (1 - vCaa) +
    //             //     (1 - vN2) * disN2 * (1 - vCaa) +
    //             //     2 * (1 - vRoot) * (1 - vCaa) * depthCaa) || 0);
    //           }
    //           // console.log(vRoot, vCaa, depthCaa, vN1, vN2, disN1, disN2, result);
    //         }
    //         // not exist
    //         else {
    //           result = 1; // khong co nut de so sanh
    //         }
    //         totalDistance += result;
    //       }
    //     }
    //     const distance = totalDistance / totalLeafNode;
    //     await Models.BeginDataset.updateOne(
    //       {
    //         _id: app.id,
    //       },
    //       {
    //         $set: {
    //           distance: distance || 0,
    //         },
    //       }
    //     );
    //     console.log(
    //       `App Id ${app.id}: ${distance}`,
    //       totalDistance,
    //       totalLeafNode
    //     );
    //   } catch (err) {
    //     console.log(err.message);
    //   }
    // }

    //
    // const appsMDRoid = await Models.MaliciousDataset.find({
    //   // categoryName: category,
    //   // isCompleted: true,
    // });
    // let beginApps = await Models.BeginDataset.find()
    //   .sort({
    //     createdAt: "desc",
    //   })
    //   .limit(200);
    // beginApps = _.map(beginApps, (app) => {
    //   app = app.toJSON();
    //   return { ...app, type: "begin" };
    // });
    // let maliciousApps = await Models.MaliciousDataset.find()
    //   .sort({
    //     createdAt: "desc",
    //   })
    //   .limit(829);
    // maliciousApps = _.map(maliciousApps, (app) => {
    //   app = app.toJSON();
    //   return { ...app, type: "malicious" };
    // });
    // const testingApps = [...beginApps, ...maliciousApps];

    const testingApps = await Models.App.find({
      $or: [{ supplier: "mobipurpose" }, { isExistedMobiPurpose: true }],
      isCompleted: true,
    });

    for (let k = 0; k < testingApps.length; k++) {
      try {
        const app = testingApps[k];
        console.log(`app ${k}.${app.appName}`);
        const appNodes = app.nodes;
        let totalDistance = 0;
        let totalLeafNode = 0;
        // ============ LOOP TREES =============
        for (let j = 0; j < trees.children.length; j++) {
          const treeChild = trees.children[j];

          let flattenTree = [];

          initBaseLineForTree(treeChild, _.map(appNodes, "name"));
          getFlattenTrees(JSON.parse(JSON.stringify(treeChild)), flattenTree);

          // compareing nodes
          let comparingNodes = flattenTree.filter(
            (item) => item.baseLine === 1
          );

          totalLeafNode += comparingNodes.length;
          for (let g = 0; g < comparingNodes.length; g++) {
            const comparingNode = comparingNodes[g];
            const comparedNode = getComparedNodes(comparingNode, treeChild);

            let result;
            // if comparedNode exist
            if (comparedNode) {
              if (comparingNode.path === comparedNode.path) {
                result = 0;
              } else {
                const commonNode = getCommonNode(
                  comparingNode,
                  comparedNode,
                  treeChild
                );

                const vRoot = treeChild.baseLine;
                const vCaa = getBaseLineVaLueOfNode(commonNode, treeChild);
                const depthCaa = getDistanceToCommonNode(commonNode);

                const vN1 = getBaseLineVaLueOfNode(comparingNode, treeChild);

                const vN2 = getBaseLineVaLueOfNode(comparedNode, treeChild);

                const disN1 = getDistanceFromNodeToCommonNode(
                  comparingNode,
                  commonNode
                );

                const disN2 = getDistanceFromNodeToCommonNode(
                  comparedNode,
                  commonNode
                );

                result =
                  1 -
                  ((2 * (1 - vCaa) * depthCaa) /
                    ((1 - vN1) * disN1 * (1 - vCaa) +
                      (1 - vN2) * disN2 * (1 - vCaa) +
                      2 * (1 - vCaa) * depthCaa) || 0);
              }
            }
            // not exist
            else {
              result = 1; // khong co nut de so sanh
            }
            totalDistance += result;
          }
        }
        const distance = totalDistance / totalLeafNode;

        await Models.App.updateOne(
          {
            _id: app.id,
          },
          {
            $set: {
              distance: (distance || 0) / 7,
            },
          }
        );
        console.log(
          `App Id ${app.id}: ${distance}`,
          totalDistance,
          totalLeafNode
        );
      } catch (err) {
        console.log(err.message);
      }
    }
    // }
    console.log("Done computingDistance");
  } catch (err) {
    console.log("MAIN", err);
  }
}

computingDistance();
