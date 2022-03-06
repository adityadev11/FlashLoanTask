const axios = require("axios");
var MongoClient = require("mongodb").MongoClient;
const ethers = require("ethers");
var url = "mongodb://localhost:27017/";

var totalAmountUSD = 0;
var tokenAmounts = {}; //Mapping for Query 1- Stores the tokenId: total sum of Amounts of that token
var tokenAmountsMaxRoute = {}; //Mapping for Query 2- Stores the TokenId: sum of Amounts of that token but only for the most used route
var tokenAmountsAllRoute = {}; //Mapping for Query 3- Stores the TokenId:sum of Amounts of that token for All routes except Route 1 (As Instadapp Dosen't earn fee from route 1)

var maxTokenId; //Stores most used token Id (For query 1)
var maxRouteId; //Stores most used route Id (For query 2)
const route1 = "0x01";
MongoClient.connect(url, async function (err, db) {
  //Connecting to Mongo Db client to Query for data from Database
  if (err) throw err;
  var dbo = db.db("admin");

  dbo
    .collection("TestBlock")
    .aggregate([
      //This Query returns the list of tokens in decending order of the number of times it was used. (Most used at the top)
      { $unwind: "$tokens" },
      { $group: { _id: "$tokens", quant: { $sum: 1 } } },
      { $sort: { quant: -1 } },
    ])
    .toArray(function (err, result) {
      if (err) throw err;
      var len = result.length;
      maxTokenId = result[0]._id; //Max token Id is Id of the First element of the result.

      console.log(
        "The token whose Flashloans were taken the Max times - " + maxTokenId
      );
      console.log(
        "Total count of Flashloans of the token - " + result[0].quant //Number of times the most used Token was used
      );
      for (var i = 0; i < len; i++) {
        //Loop to initalise all three mappings (defined earlier) with tokenId:0 (The result of the earlier query consists of all unique token Ids)
        var x = result[i]._id;
        tokenAmounts[x] = 0;
        tokenAmountsAllRoute[x] = 0;
        tokenAmountsMaxRoute[x] = 0;
      }
    });
  dbo
    .collection("TestBlock")
    .find({}) //Query to Get all FlashLoanEvent data from database
    .toArray(function (err, result) {
      if (err) throw err;
      var len = result.length;
      for (var i = 0; i < len; i++) {
        //Loop to update tokenAmounts mapping such that it consists of sum of amounts for all tokens. (i.e TokenId: Sum of amounts of that token)
        let token_len = result[i].tokens.length;
        for (var j = 0; j < token_len; j++) {
          let a = ethers.BigNumber.from(tokenAmounts[result[i].tokens[j]]);
          let b = ethers.BigNumber.from(result[i].amounts[j]);
          let sum = a.add(b);
          tokenAmounts[result[i].tokens[j]] = sum;
        }
      }
      let bigresult = tokenAmounts[maxTokenId]; //Total amount of max used token (in wei of that token) in BigNumber hex form
      let bigresultint = bigresult.toBigInt(); //Converting from BigNumber to BigInt for display
      console.log(
        "Total Amount of the Max token (in wei of that token) -",
        bigresultint
      );
    });

  //2nd Query Begins here
  var dbo = db.db("admin");
  let response = await axios.get(
    "https://api.instadapp.io/defi/avalanche/prices" //Fetching Real time token Price from API (in USD per ETH of that token)
  );
  dbo
    .collection("TestBlock")
    .aggregate([
      //This query gives the route Id along with number of time that route is used in decending order.
      { $group: { _id: "$route", quant: { $sum: 1 } } },
      { $sort: { quant: -1 } },
    ])
    .toArray(function (err, result) {
      if (err) throw err;
      maxRouteId = result[0]._id; //Most used route at top
      console.log("The route used most times - " + maxRouteId);
      console.log("Total count of the route used -" + result[0].quant); //Number of times the most used route was used
    });

  dbo
    .collection("TestBlock")
    .find({}) //Query to Get all FlashLoanEvent data from database
    .toArray(function (err, result) {
      if (err) throw err;
      var len = result.length;
      for (var i = 0; i < len; i++) {
        //Loop to update tokenAmountsMaxRoute mapping such that it maps tokenid to sum of amounts of that token for which most used route was used
        if (result[i].route === maxRouteId) {
          //Checking to see if route of that event is same as most used route.
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
        //Loop to get total amount which used most used route (in USD)
        let amountEth = Number(
          ethers.utils.formatUnits(tokenAmountsMaxRoute[key]) //Converting each tokenwise sumAmount(in wei of Bignumber type) to Eth(of Number type)
        );
        let amountUSD = amountEth * Number(response.data[key]); //Converting from amount of Eth of that token to amount in USD by using API data
        totalAmountUSD += amountUSD; //Adding the tokenwise  amount in USD to get total amount in USD (for most used route)
      }
      const route1FeePercent = 0.0009; //Route fee for Route 1 is 0.09%
      const routeOtherFeePercent = 0.0005; //Route fee for Other Routes is 0.05%
      if (maxRouteId != route1) {
        var totalRouteFeeUSD = totalAmountUSD * routeOtherFeePercent;
      } else {
        var totalRouteFeeUSD = totalAmountUSD * route1FeePercent;
      }
      console.log("Total Amount through route (In USD)-", totalAmountUSD);
      console.log("Total route Fee (In USD)-", totalRouteFeeUSD);
    });

  //Query 3 begins here
  const routeFeePercent = 0.0005; //Route 1 fee percent is 0.0009 but Instadapp FLA dosen't earn from route 1. Other route fee percent is 0.05%
  dbo
    .collection("TestBlock")
    .find({}) //Query to Get all FlashLoanEvent data from database
    .toArray(function (err, result) {
      if (err) throw err;
      var len = result.length;
      for (var i = 0; i < len; i++) {
        //Loop to update tokenAmountsAllRoute mapping such that it maps tokenId to sum of amount of that token for all routes except route 1
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
        //Loop to get total route fee earned by Instadapp FLA (in USD)
        let amountEth = Number(
          ethers.utils.formatUnits(tokenAmountsAllRoute[key]) //Converting tokenwise sum Amount(in wei of Bignumber type) to Eth (of Number type)
        );
        let amountUSD = amountEth * Number(response.data[key]); //Converting from amount of Eth of that token to amount in USD by using API data
        let feeAmountUSD = amountUSD * routeFeePercent; //Applying Route fee ratio
        tokenAmountsAllRoute[key] = feeAmountUSD; //Adding tokenwise route fee to get Total Route fee for all tokens (in USD)
      }
      console.log("Token wise Fees earned by Instadapp FLA (in USD)- ");
      console.log(tokenAmountsAllRoute);
      db.close();
    });
});
