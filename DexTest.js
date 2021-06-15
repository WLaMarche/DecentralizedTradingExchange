const DEX = artifacts.require("DEX");
const TestToken = artifacts.require("TestToken");
const truffleAssert = require("truffle-assertions");
//const truffleAssert = artifacts.require("truffle-assertions");
//
// //const truffleAssert = artifacts.require("truffle assertions");
// //testing framework by truffle.. you break your test down into multiple segments
//   //in the first segment, you call a function that is called:
//     //contract("specify name of contract", 2nd arg is a function-- accounts => {define tests in here})
//       //for each contract statement below will re-deploy our contracts
//         //will run all of the tests that are defined in there!
//     //the following is the template to follow
// // contract("DEX", accounts => {
// //   //it("define what the test is about", async() => {run your tests})
// //     it("should only be possible for Owner to addTokens", async() => {
// //       let dex = await DEX.deployed()
// //       let token = await TestToken.deployed()
// //       await truffleAssert.passes(dex.addToken(web3.utils.fromUtf8("LINK"), token.address, {from: accounts[0]}))
// //       }
// //   )
// //   //it("define what the test is about", async() => {run your tests})
// //     it("Checks for deposit", async() => {
// //       let dex = await DEX.deployed()
// //       let token = await TestToken.deployed()
// //       //await dex.addToken(web3.utils.fromUtf8("LINK"), token.address, {from: accounts[1]})
// //       await token.approve(dex.address, 500);
// //       await dex.deposit(475, web3.utils.fromUtf8("LINK"));
// //       let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
// //       assert.equal(balance.toNumber(), 974)
// //       //assert.equal(balance.toNumber(), 475)
// //       }
// //   )
// //     it("Checks for faulty withdrawals", async() => {
// //       let dex = await DEX.deployed()
// //       let token = await TestToken.deployed()
// //       //await dex.addToken(web3.utils.fromUtf8("LINK"), token.address, {from: accounts[1]})
// //       //await token.approve(dex.address, 500);
// //       //await dex.deposit(475, web3.utils.fromUtf8("LINK"));
// //       //let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
// //       //assert.equal(balance.toNumber(), 974)
// //       await truffleAssert.reverts(dex.withdraw(975, web3.utils.fromUtf8("LINK")))
// //
// //       }
// //     )}
// //   )
//
//
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
    await truffleAssert.reverts(dex.createMarketOrder(web3.utils.fromUtf8("LINK"), 0, 100))
    await dex.depositETH({value: 2500})
    await truffleAssert.passes(dex.createMarketOrder(web3.utils.fromUtf8("LINK"), 0, 100));

  })

  it("Market orders can be placed even if order book is empty.", async() => {
    let dex = await DEX.deployed()
    let token = await TestToken.deployed()
    await dex.addToken(web3.utils.fromUtf8("LINK"), token.address)
    await token.approve(dex.address, 1000);
    await dex.deposit(1000, web3.utils.fromUtf8("LINK"));
    await dex.depositETH({value: 2500})
    let TransactionOrder[] storage transactionOrders = orderbook[ticker][uint(_side)]
    if(transactionOrders.length == 0){
      await truffleAssert.passes(dex.createMarketOrder(web3.utils.fromUtf8("LINK"), 0, 100));
      await truffleAssert.passes(dex.createMarketOrder(web3.utils.fromUtf8("LINK"), 1, 100));
    }

  })

  it("Throws error if Market order is not filled 100% or up until orderbook is emptied.", async() => {

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
    let marketOrder = await dex.transactionOrders[i - 1].amount.mul(price))
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

  })


})
