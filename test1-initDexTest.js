const DEX = artifacts.require("DEX");
const TestToken = artifacts.require("TestToken");
const truffleAssert = require("truffle-assertions");

//testing framework by truffle.. you break your test down into multiple segments
  //in the first segment, you call a function that is called:
    //contract("specify name of contract", 2nd arg is a function-- accounts => {define tests in here})
      //for each contract statement below will re-deploy our contracts
        //will run all of the tests that are defined in there!
    //the following is the template to follow
contract("DEX", accounts => {
  //it("define what the test is about", async() => {run your tests})
    it("should only be possible for Owner to addTokens", async() => {
      let dex = await DEX.deployed()
      let token = await TestToken.deployed()
      await truffleAssert.passes(dex.addToken(web3.utils.fromUtf8("LINK"), token.address, {from: accounts[0]}))
      }
  )
  //it("define what the test is about", async() => {run your tests})
    it("Checks for deposit", async() => {
      let dex = await DEX.deployed()
      let token = await TestToken.deployed()
      //await dex.addToken(web3.utils.fromUtf8("LINK"), token.address, {from: accounts[1]})
      await token.approve(dex.address, 500);
      await dex.deposit(475, web3.utils.fromUtf8("LINK"));
      let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
      assert.equal(balance.toNumber(), 974)
      //assert.equal(balance.toNumber(), 475)
      }
  )
    it("Checks for faulty withdrawals", async() => {
      let dex = await DEX.deployed()
      let token = await TestToken.deployed()
      //await dex.addToken(web3.utils.fromUtf8("LINK"), token.address, {from: accounts[1]})
      //await token.approve(dex.address, 500);
      //await dex.deposit(475, web3.utils.fromUtf8("LINK"));
      //let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
      //assert.equal(balance.toNumber(), 974)
      await truffleAssert.reverts(dex.withdraw(975, web3.utils.fromUtf8("LINK")))

      }
    )}
  )
