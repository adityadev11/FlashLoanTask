var MongoClient = require("mongodb").MongoClient;
const ethers = require("ethers");
var url = "mongodb://localhost:27017/";

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

      console.log("The token whose Flashloans take Max time -" + result[0]._id);
      console.log("Total count of Flashloans of the token -" + result[0].quant);
    });
  dbo
    .collection("TestBlock")
    .aggregate([
      { $group: { _id: "$route", quant: { $sum: 1 } } },
      { $sort: { quant: -1 } },
    ])
    .toArray(function (err, result) {
      if (err) throw err;
      //console.log(result);

      console.log("The route used most times -" + result[0]._id);
      console.log("Total count of the route used -" + result[0].quant);

      db.close();
    });
});
