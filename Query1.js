var MongoClient = require("mongodb").MongoClient;
const ethers = require("ethers");
var url = "mongodb://localhost:27017/";

var dict = {};
var maxTokenId;
MongoClient.connect(url, function (err, db) {
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
      let bigresult = dict[maxTokenId];
      let bigresultint = bigresult.toBigInt();
      console.log(
        "Total Amount of the Max token (in wei of that token) -",
        bigresultint
      );
      db.close();
    });
});
