const DEX = artifacts.require("DEX");
const TestToken = artifacts.require("TestToken");
const truffleAssert = require("truffle-assertions");


contract("DEX", accounts => {
  //user must have ETH deposited and an ETH balance >= buy order values, because we are purchasing tokens WITH ETH
  it("Trader has deposited ETH & has an ETH balance >= buy order value", async() => {
    let dex = await DEX.deployed()
    let token = await TestToken.deployed()
    await truffleAssert.reverts(dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 0, 100, 10))
    await dex.depositETH({value: 1500});
    await truffleAssert.passes(dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 0, 100, 10))

  })

  it("User must have >= amount of tokens in their balance in order to fill their SELL order", async() => {
    let dex = await DEX.deployed()
    let token = await TestToken.deployed()
    await truffleAssert.reverts(dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 1, 600, 10))
    await token.approve(dex.address, 600);
    await dex.deposit(600, web3.utils.fromUtf8("LINK"));
    await truffleAssert.passes(dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 1, 600, 10));

  })

  it("BUY orderbook is in order from Highest to Lowest, starting at index[0]", async() => {
    let dex = await DEX.deployed()
    let token = await TestToken.deployed()
    await dex.addToken(web3.utils.fromUtf8("LINK"), token.address)
    await token.approve(dex.address, 1000);
    await dex.depositETH({value: 3000});
    await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 0, 1, 300)
    await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 0, 1, 100)
    await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 0, 1, 200)
    let buyOrderBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0);
    assert(buyOrderBook.length > 0);
    console.log(buyOrderBook);
    for (let i = 0; i < buyOrderBook.length - 1; i++){
      assert(buyOrderBook[i].price >= buyOrderBook[i + 1].price, "buy-order book is out of order.")
    }

    //await truffleAssert.passes(buyOrderBook.sort((a, b) => b - a));

  })

  it("SELL orderbook is in order from Lowest to Highest, starting at index[0]", async() => {
    let dex = await DEX.deployed()
    let token = await TestToken.deployed()
    await dex.addToken(web3.utils.fromUtf8("LINK"), token.address)
    await token.approve(dex.address, 1000);
    //await dex.deposit(1000, web3.utils.fromUtf8("LINK"))
    await dex.depositETH({from: accounts[0], value: 1000});
    await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 1, 1, 100)
    await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 1, 2, 200)
    await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 1, 3, 105)
    let sellOrderBook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
    //assert(sellOrderBook.length > 0);
    for (let i = 0; i < sellOrderBook.length - 1; i++){
      assert(sellOrderBook[i].price <= sellOrderBook[i + 1].price, "sell-order book is out of order.")
    }
    console.log(sellOrderBook);
  })

  }
)
