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
      //console.log(result);
      var len = result.length;
      //console.log(len);
      maxTokenId = result[0]._id;

      console.log(
        "The token whose Flashloans were taken the Max times - " + maxTokenId
      );
      console.log(
        "Total count of Flashloans of the token - " + result[0].quant
      );
      for (var i = 0; i < len; i++) {
        var x = result[i]._id;
        //console.log(x);
        dict[x] = 0;
      }
      //console.log(dict);
      //console.log(result[0]._id);
    });
  dbo
    .collection("TestBlock")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      //console.log(result);
      var len = result.length;
      //console.log(result.length);
      for (var i = 0; i < len; i++) {
        let token_len = result[i].tokens.length;
        for (var j = 0; j < token_len; j++) {
          let a = ethers.BigNumber.from(dict[result[i].tokens[j]]);
          //console.log("A", a);
          let b = ethers.BigNumber.from(result[i].amounts[j]);
          //console.log("B", b);
          let sum = a.add(b);
          //console.log(sum);
          dict[result[i].tokens[j]] = sum;
        }
      }
      //console.log(dict);
      let bigresult = dict[maxTokenId];
      let bigresultint = bigresult.toBigInt();
      console.log(
        "Total Amount of the Max token (in wei of that token) -",
        bigresultint
      );
      db.close();
    });
});
