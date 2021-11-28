// const axios = require("axios");
const cheerio = require("cheerio");
const _ = require("lodash");
var gplay = require("google-play-scraper");
const fs = require("fs");
countries = [
  "au",
  "at",
  "be",
  "br",
  "ca",
  "cz",
  "dk",
  "fi",
  "fr",
  "de",
  "in",
  "id",
  "ir",
  "it",
  "jp",
  "mx",
  "nl",
  "no",
  "pl",
  "pt",
  "ru",
  "sa",
  "sk",
  "kr",
  "es",
  "se",
  "ch",
  "tr",
  "uk",
  "us",
];

const categories = [
  "beauty",
  "business",
  "shopping",
  "entertainment",
  "finance",
  "FOOD_AND_DRINK",
  "HEALTH_AND_FITNESS",
  "MAPS_AND_NAVIGATION",
  "medical",
  "MUSIC_AND_AUDIO",
  "tools",
  "sports",
  "TRAVEL_AND_LOCAL",
  "social",
  "education",
];
(async function main() {
  try {
    const apps = await gplay.list({
      // category: category.toUpperCase(),
      // collection: gplay.collection.TOP_FREE,
      // country: country,
      num: 1000,
    });

    console.log(apps.length);
    // let result = [];
    // const promises = [];
    // for (let i = 0; i < categories.length; i++) {
    //   const category = categories[i];

    //   for (let j = 0; j < countries.length; j++) {
    //     const country = countries[j];
    //     console.log(category, country);

    //     const apps = await gplay.list({
    //       category: category.toUpperCase(),
    //       collection: gplay.collection.TOP_FREE,
    //       country: country,
    //       num: 1000,
    //     });

    //     result.push(
    //       apps.map((app) => {
    //         return {
    //           title: app.title,
    //           category,
    //           country,
    //         };
    //       })
    //     );
    //   }
    // }

    // result = _.flatten(result);
    // result = result.map((app) => {
    //   return {
    //     title: app.title,
    //     category: app.category,
    //     country: app.country,
    //   };
    // });
    // // unique
    // result = _.uniqBy(result, "title");
    // result = _.map(result, "title");
    // fs.writeFileSync("kaka.txt", JSON.stringify(result), "utf8");
  } catch (e) {
    console.log(1, e);
  }
})();

// async function main() {
//   try {
//     let result = [];
//     const promises = [];
//     for (let i = 0; i < categories.length; i++) {
//       const category = categories[i];

//       for (let j = 0; j < countries.length; j++) {
//         const country = countries[j];
//         console.log(category, country);

//         const apps = await gplay.list({
//           category: category.toUpperCase(),
//           collection: gplay.collection.TOP_FREE,
//           country: country,
//           num: 1000,
//         });

//         result.push(
//           apps.map((app) => {
//             return {
//               title: app.title,
//               category,
//               country,
//             };
//           })
//         );
//       }
//     }

//     result = _.flatten(result);
//     result = result.map((app) => {
//       return {
//         title: app.title,
//         category: app.category,
//         country: app.country,
//       };
//     });
//     // unique
//     result = _.uniqBy(result, "title");

//     // group by category
//     result = _.groupBy(result, "category");

//     // group by country
//     for (const category in result) {
//       const elements = result[category];

//       result[category] = _.groupBy(elements, "country");
//     }

//     // print
//     let content = "";
//     for (const category in result) {
//       content += `* Category: ${category}: \n`;
//       const elementsByCoyntries = result[category];

//       for (const country in elementsByCoyntries) {
//         content += `  - Country: ${country}: \n`;
//         const elements = elementsByCoyntries[country];

//         elements.forEach((element) => {
//           content += `    + App name: ${element.title}: \n`;
//         });
//       }
//     }

//     fs.writeFileSync("kaka.txt", content, "utf8");
//   } catch (e) {
//     console.log(1, e);
//   }
// }
