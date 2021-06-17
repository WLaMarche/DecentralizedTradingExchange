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
    assert(transactionOrders.length > 0,"Sell order side is empty!")

    //15 LINK are in the orderbook, place a buy order for 10 LINK
    await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), 0, 10)
    transactionOrders = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
    assert(transactionOrders.length == 1,"Sell order side should only have 1 order!")
    assert(transactionOrders[0].filled == 0, "Sell order [0] should not be filled")

  })

  it("If there aren't enough sell orders in order book to completely fill market order, fill market order until orderbook is empty.", async() =>{
    let dex = await DEX.deployed()
    let token = await TestToken.deployed()
    let transactionOrders = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
    assert(transactionOrders.length == 1, "Orderbook should only have 1 order left!")
    //create limit orders (with 5 LINK left over from previous limit order creation from accounts[3])
    await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 1, 5, 300, {from: accounts[1]})
    await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 1, 5, 200, {from: accounts[2]})
    let tokenbalance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
    await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), 0, 50);
    let tokenbalanceAfter = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
    assert.equal(tokenbalance + 15, tokenbalanceAfter)

  })

  it("Throws error if ETH balance of the BUYER does NOT decrease with the execution/completion of buy orders", async() => {
    let dex = await DEX.deployed()
    let token = await TestToken.deployed()
    await dex.addToken(web3.utils.fromUtf8("LINK"), token.address)
    await token.approve(dex.address, 1000, {from: accounts[1]});
    let ETHbalanceBefore = await dex.EthBalance(accounts[0]);
    //create a limit sell order
    await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 1, 1, 100, {from: accounts[1]})
    //create a market buy order
    await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), 0, 1);
    let ETHbalanceAfter = await dex.EthBalance(accounts[0]);
    assert.equal(ETHbalanceBefore - 100, ETHbalanceAfter);

  })

  it("Throws error if SELLER'S token balance does NOT decrease with the filled sell orders.", async() => {
    let dex = await DEX.deployed()
    let token = await TestToken.deployed()
    await dex.addToken(web3.utils.fromUtf8("LINK"), token.address)
    await token.approve(dex.address, 1000, {from: accounts[4]});

    let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1)
    assert(orderbook.length == 0, "Orderbook shoud be empty.");

    await dex.deposit(1000, web3.utils.fromUtf8("LINK"), {from: accounts[4]});
    let sellerBalanceBefore = await dex.balances(accounts[1], web3.utils.fromUtf8("LINK"));
    let sellerBalance2Before = await dex.balances(accounts[4], web3.utils.fromUtf8("LINK"));

    await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 1, 1, 300, {from: accounts[1]})
    await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 1, 1, 400, {from: accounts[4]})

    await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), 0, 2);

    let sellerBalanceAfter = await dex.balances(accounts[1], web3.utils.fromUtf8("LINK"));
    let sellerBalance2After = await dex.balances(accounts[4], web3.utils.fromUtf8("LINK"));

    assert(sellerBalanceBefore - 1, sellerBalanceAfter)
    assert(sellerBalance2Before - 1, sellerBalance2After)

  })

  it("Throws error if the filled orders are NOT removed from order book.", async() => {
    let dex = await DEX.deployed()
    let token = await TestToken.deployed()
    let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
    assert(orderbook.length == 0, "Orderbook should be empty!");

    await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 1, 1, 100);
    await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), 0, 1);

    orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
    assert(orderbook.length == 0, "Orderbook should be empty!");
  })

  it("Throws an error if partly filled orders are NOT modified to represent remaining amount.", async() =>{
    let dex = await DEX.deployed()
    let token = await TestToken.deployed()
    let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
    assert(orderbook.length == 0, "Orderbook should be empty!");

    await dex.createLimitOrder(web3.utils.fromUtf8("LINK"), 1, 3, 100, {from: accounts[1]});
    await dex.createMarketOrder(web3.utils.fromUtf8("LINK"), 0, 2);

    orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
    assert(orderbook.length == 1, "Orderbook should not be empty!");
    assert.equal(orderbook[0].filled, 2);
  })


})
