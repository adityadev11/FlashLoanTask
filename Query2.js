const axios = require("axios");
var MongoClient = require("mongodb").MongoClient;
const ethers = require("ethers");
var url = "mongodb://localhost:27017/";

var totalAmountUSD = 0;
var dict = {};
var maxTokenId;
MongoClient.connect(url, async function (err, db) {
  if (err) throw err;
  var dbo = db.db("admin");
  let response = await axios.get(
    "https://api.instadapp.io/defi/avalanche/prices"
  );
  //console.log(response.data);
  dbo
    .collection("TestBlock")
    .aggregate([
      { $group: { _id: "$route", quant: { $sum: 1 } } },
      { $sort: { quant: -1 } },
    ])
    .toArray(function (err, result) {
      if (err) throw err;

      console.log("The route used most times - " + result[0]._id);
      console.log("Total count of the route used -" + result[0].quant);
    });

  dbo
    .collection("TestBlock")
    .aggregate([
      { $unwind: "$tokens" },
      { $group: { _id: "$tokens", quant: { $sum: 1 } } },
      { $sort: { quant: -1 } },
    ])
    .toArray(function (err, result) {
      if (err) throw err;
      var len = result.length;
      for (var i = 0; i < len; i++) {
        var x = result[i]._id;

        dict[x] = 0;
      }
    });
  dbo
    .collection("TestBlock")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      var len = result.length;
      for (var i = 0; i < len; i++) {
        let token_len = result[i].tokens.length;
        for (var j = 0; j < token_len; j++) {
          let a = ethers.BigNumber.from(dict[result[i].tokens[j]]);
          let b = ethers.BigNumber.from(result[i].amounts[j]);
          let sum = a.add(b);
          dict[result[i].tokens[j]] = sum;
        }
      }
      for (let key in dict) {
        let amountEth = Number(ethers.utils.formatUnits(dict[key]));
        let amountUSD = amountEth * Number(response.data[key]);
        totalAmountUSD += amountUSD;
      }
      console.log("Total Amount through route (In USD)-", totalAmountUSD);
      const routeFeePercent = 0.0009;
      var totalRouteFeeUSD = totalAmountUSD * routeFeePercent;
      console.log("Total route Fee (In USD)-", totalRouteFeeUSD);

      db.close();
    });
});
