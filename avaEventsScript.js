const ethers = require("ethers");
require("dotenv").config();

const { MongoClient } = require("mongodb");
const uri = "mongodb://localhost:27017/";
const client = new MongoClient(uri);

const avalancheID = process.env.avalancheNode;
const provider = new ethers.providers.JsonRpcProvider(avalancheID);
const url = "mongodb://localhost:27017/";
const avalancheAbi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "route",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address[]",
        name: "tokens",
        type: "address[]",
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "amounts",
        type: "uint256[]",
      },
    ],
    name: "LogFlashloan",
    type: "event",
  },
];

const contractAddress = "0x2b65731A085B55DBe6c7DcC8D717Ac36c00F6d19"; //avalanche FLA proxy contract

async function run() {
  try {
    await client
      .connect()
      .then(console.log("Connected successfully to server"));
    const dbObj = await client.db("Avalanche");

    const mainContract = new ethers.Contract(
      contractAddress,
      avalancheAbi,
      provider
    );
    const filter = mainContract.filters.LogFlashloan();
    //console.log(filter);
    var x = await mainContract.queryFilter(filter);
    var len = x.length;
    for (var i = 0; i < len; i++) {
      var _account = x[i].args[0];
      //console.log(_account);
      var _route = x[i].args[1]._hex;
      //console.log(_route);
      var _tokens = x[i].args[2];
      //console.log(_tokens);
      var _amounts = x[i].args[3];
      //console.log(_amounts);

      var myobj = {
        account: _account,
        route: _route,
        tokens: _tokens,
        amounts: _amounts,
      };
      await dbObj.collection("eventinfo").insert(myobj);
      console.log("Document Inserted-" + i);
    }
  } finally {
    await client.close();
  }
}
run();
