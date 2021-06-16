const DEX = artifacts.require("DEX");
const TestToken = artifacts.require("TestToken");
const truffleAssert = require("truffle-assertions");


contract("DEX", accounts => {
  //When creating a SELL market order, seller needs to have enough tokens to place order
  //When creating a BUY market order, BUYER needs to have enough ETH to make the trader
  //Market orders can be placed even if order book is empty
  //market order should be filled until the order book is empty or the market order is 100% filled
  //ETH balance of buyer should decrease with the filled amount
  //token balance of the limit order seller should decrease with the filled amount
  //filled limit orders should be removed from the ORDERBOOK

  it("Throws an error if seller doesn't have enough tokens to place desired sell order amount.", async() => {
    let dex = await DEX.deployed()
    let token = await TestToken.deployed()
    await dex.addToken(web3.utils.fromUtf8("LINK"), token.address)
    await truffleAssert.reverts(dex.createMarketOrder(web3.utils.fromUtf8("LINK"), 1, 100))
    await token.approve(dex.address, 1000);
    await dex.deposit(1000, web3.utils.fromUtf8("LINK"));
    await truffleAssert.passes(dex.createMarketOrder(web3.utils.fromUtf8("LINK"), 1, 100));
  })

  it("Throws an error if Buyer does NOT have enough ETH in balance.", async() => {
    let dex = await DEX.deployed()
    let token = await TestToken.deployed()
    await truffleAssert.reverts(dex.createMarketOrder(web3.utils.fromUtf8("LINK"), 0, 10))
    await dex.depositETH({value: 2500})
    await truffleAssert.passes(dex.createMarketOrder(web3.utils.fromUtf8("LINK"), 0, 10));

  })

  it("Market orders can be placed even if order book is empty.", async() => {
    let dex = await DEX.deployed()
    let token = await TestToken.deployed()
    await dex.addToken(web3.utils.fromUtf8("LINK"), token.address)
    await token.approve(dex.address, 1000);
    await dex.deposit(1000, web3.utils.fromUtf8("LINK"));
    await dex.depositETH({value: 2500})
    let transactionOrders = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0);
    assert.equal(transactionOrders.length == 0,"Buy order side is not empty!")
    await truffleAssert.passes(dex.createMarketOrder(web3.utils.fromUtf8("LINK"), 0, 100));
    }
  )

  it("if there are enough orders in the orderbook, market order should be filled until 100% filled.", async() => {
    let dex = await DEX.deployed()
    let token = await TestToken.deployed()
    let transactionOrders = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
    assert(transactionOrders.length == 0,"Sell order side is not empty!")
    await dex.addToken(web3.utils.fromUtf8("LINK"), token.address)

    await token.transfer(accounts[1], 100)
    await token.transfer(accounts[2], 100)
    await token.transfer(accounts[3], 100)

    await token.approve(dex.address, 100, {from: accounts[1]})
    await token.approve(dex.address, 100, {from: accounts[2]})
    await token.approve(dex.address, 100, {from: accounts[3]})

    await dex.deposit(100, web3.utils.fromUtf8("LINK"), {from: accounts[1]})
    await dex.deposit(100, web3.utils.fromUtf8("LINK"), {from: accounts[2]})
    await dex.deposit(100, web3.utils.fromUtf8("LINK"), {from: accounts[3]})

    await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 1, 5, 100, {from: accounts[1]})
    await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 1, 5, 200, {from: accounts[2]})
    await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 1, 5, 150, {from: accounts[3]})
    assert(transactionOrders.length > 0,"Sell order side is empty!"))

    //15 LINK are in the orderbook, place a buy order for 10 LINK
    await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), 0, 10)
    let transactionOrders = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
    assert(transactionOrders.length == 1,"Sell order side should only have 1 order!")
    assert(transactionOrders[0].filled == 0, "Sell order [0] should not be filled")

  })

  it("If there aren't enough sell orders in order book to completely fill market order, fill market order until orderbook is empty.", async() =>{
    let dex = await DEX.deployed()
    let token = await TestToken.deployed()
    let transactionOrders = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
    assert(transactionOrders.length == 1, "Orderbook should only have 1 order left!")
    await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 1, 5, 300, {from: accounts[1]})
    await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 1, 5, 200, {from: accounts[2]})

    
  })

  it("Throws error if ETH balance of the BUYER does NOT decrease with the execution/completion of buy orders", async() => {
    let dex = await DEX.deployed()
    let token = await TestToken.deployed()
    await dex.addToken(web3.utils.fromUtf8("LINK"), token.address)
    await token.approve(dex.address, 1000);
    await dex.depositETH({from: accounts[0], value: 1000});
    let ETHbalance = await dex.EthBalance(accounts[0]);
    //create a limit sell order
    await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 1, 1, 100)
    //create a market buy order
    let marketOrder = await dex.transactionOrders[- 1].amount.mul(price)
    await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), 0, 100);
    assert(ETHbalance == ETHbalance - marketOrder);

  })

  it("Throws error if SELLER'S token balance does NOT decrease with the filled sell orders.", async() => {
    let dex = await DEX.deployed()
    let token = await TestToken.deployed()
    await dex.addToken(web3.utils.fromUtf8("LINK"), token.address)
    await token.approve(dex.address, 1000);
    await dex.deposit(1000, web3.utils.fromUtf8("LINK"));
    let sellerBalance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
    await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), 0, 1, 100);
    assert(sellerBalance = sellerBalance - tokenssold)

  })

  it("Throws error if the filled orders are NOT removed from order book.", async() => {
    let dex = await DEX.deployed()
    let token = await TestToken.deployed()
    await dex.addToken(web3.utils.fromUtf8("LINK"), token.address)
    await token.approve(dex.address, 1000);
    await dex.depositETH({from: accounts[0], value: 1000});
    let orderbook = orderbook[ticker][uint(1)];
    await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 1, 1, 100);
    if (orderbook.length > 0){
      await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), 0, 1, 100);
    }
    assert(orderbook.length == orderbook.length - 1);
  })


})
