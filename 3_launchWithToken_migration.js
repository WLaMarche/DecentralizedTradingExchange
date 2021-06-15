const TestToken = artifacts.require("TestToken");
const DEX = artifacts.require("DEX");


module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(TestToken);
  let dex = await DEX.deployed()
  let token = await TestToken.deployed()
  dex.addToken(web3.utils.fromUtf8("LINK"), token.address)
  await token.approve(dex.address, 500)
  //await dex.deposit(499, web3.utils.fromUtf8("LINK"))
  //let LINKbalance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
  //console.log("Current Chainlink Balance: ", LINKbalance);
};
