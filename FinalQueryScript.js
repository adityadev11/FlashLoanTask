const axios = require("axios");
var MongoClient = require("mongodb").MongoClient;
const ethers = require("ethers");
var url = "mongodb://localhost:27017/";

var totalAmountUSD = 0;
var tokenAmounts = {};
var tokenAmountsMaxRoute = {};
var tokenAmountsAllRoute = {};
var maxTokenId;
var maxRouteId;
const route1 = "0x01";
MongoClient.connect(url, async function (err, db) {
  if (err) throw err;
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
      maxTokenId = result[0]._id;

      console.log(
        "The token whose Flashloans were taken the Max times - " + maxTokenId
      );
      console.log(
        "Total count of Flashloans of the token - " + result[0].quant
      );
      for (var i = 0; i < len; i++) {
        var x = result[i]._id;
        tokenAmounts[x] = 0;
        tokenAmountsAllRoute[x] = 0;
        tokenAmountsMaxRoute[x] = 0;
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
          let a = ethers.BigNumber.from(tokenAmounts[result[i].tokens[j]]);
          let b = ethers.BigNumber.from(result[i].amounts[j]);
          let sum = a.add(b);
          tokenAmounts[result[i].tokens[j]] = sum;
        }
      }
      let bigresult = tokenAmounts[maxTokenId];
      let bigresultint = bigresult.toBigInt();
      console.log(
        "Total Amount of the Max token (in wei of that token) -",
        bigresultint
      );
    });

  //2nd Query Begins here
  var dbo = db.db("admin");
  let response = await axios.get(
    "https://api.instadapp.io/defi/avalanche/prices"
  );
  dbo
    .collection("TestBlock")
    .aggregate([
      { $group: { _id: "$route", quant: { $sum: 1 } } },
      { $sort: { quant: -1 } },
    ])
    .toArray(function (err, result) {
      if (err) throw err;
      maxRouteId = result[0]._id;
      console.log("The route used most times - " + maxRouteId);
      console.log("Total count of the route used -" + result[0].quant);
    });

  dbo
    .collection("TestBlock")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      var len = result.length;
      for (var i = 0; i < len; i++) {
        if (result[i].route === maxRouteId) {
          let token_len = result[i].tokens.length;
          for (var j = 0; j < token_len; j++) {
            let a = ethers.BigNumber.from(
              tokenAmountsMaxRoute[result[i].tokens[j]]
            );
            let b = ethers.BigNumber.from(result[i].amounts[j]);
            let sum = a.add(b);
            tokenAmountsMaxRoute[result[i].tokens[j]] = sum;
          }
        }
      }
      for (let key in tokenAmountsMaxRoute) {
        let amountEth = Number(
          ethers.utils.formatUnits(tokenAmountsMaxRoute[key])
        );
        let amountUSD = amountEth * Number(response.data[key]);
        totalAmountUSD += amountUSD;
      }
      const route1FeePercent = 0.0009;
      const routeOtherFeePercent = 0.0005;
      if (maxRouteId != route1) {
        var totalRouteFeeUSD = totalAmountUSD * routeOtherFeePercent;
        console.log("if EXECUTED");
      } else {
        var totalRouteFeeUSD = totalAmountUSD * route1FeePercent;
        console.log("else EXECUTED!");
      }
      console.log("Total Amount through route (In USD)-", totalAmountUSD);
      console.log("Total route Fee (In USD)-", totalRouteFeeUSD);
    });

  //Query 3 begins here
  const routeFeePercent = 0.0005;
  dbo
    .collection("TestBlock")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      var len = result.length;
      for (var i = 0; i < len; i++) {
        let token_len = result[i].tokens.length;

        for (var j = 0; j < token_len; j++) {
          if (result[i].route != route1) {
            let a = ethers.BigNumber.from(
              tokenAmountsAllRoute[result[i].tokens[j]]
            );
            let b = ethers.BigNumber.from(result[i].amounts[j]);
            let sum = a.add(b);
            tokenAmountsAllRoute[result[i].tokens[j]] = sum;
          }
        }
      }

      for (let key in tokenAmountsAllRoute) {
        let amountEth = Number(
          ethers.utils.formatUnits(tokenAmountsAllRoute[key])
        );
        let amountUSD = amountEth * Number(response.data[key]);
        let feeAmountUSD = amountUSD * routeFeePercent;
        tokenAmountsAllRoute[key] = feeAmountUSD;
      }
      console.log("Token wise Fees earned by Instadapp FLA (in USD)- ");
      console.log(tokenAmountsAllRoute);
      db.close();
    });
});
