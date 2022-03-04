const axios = require("axios");
var MongoClient = require("mongodb").MongoClient;
const ethers = require("ethers");
var url = "mongodb://localhost:27017/";

const routeFeePercent = 0.0005;
var dict = {};
MongoClient.connect(url, async function (err, db) {
  if (err) throw err;

  var dbo = db.db("admin");
  let response = await axios.get(
    "https://api.instadapp.io/defi/avalanche/prices"
  );
  var dbo = db.db("admin");

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
        const route1 = "0x01";
        for (var j = 0; j < token_len; j++) {
          if (result[i].route != route1) {
            let a = ethers.BigNumber.from(dict[result[i].tokens[j]]);
            let b = ethers.BigNumber.from(result[i].amounts[j]);
            let sum = a.add(b);
            dict[result[i].tokens[j]] = sum;
          }
        }
      }

      for (let key in dict) {
        let amountEth = Number(ethers.utils.formatUnits(dict[key]));
        let amountUSD = amountEth * Number(response.data[key]);
        let feeAmountUSD = amountUSD * routeFeePercent;
        dict[key] = feeAmountUSD;
      }
      console.log("Token wise Fees earned by Instadapp FLA (in USD)- ");
      console.log(dict);
      db.close();
    });
});
