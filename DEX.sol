pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "./Wallet.sol";

contract DEX is Wallet {

  using SafeMath for uint256;

  enum SIDE {BUY, SELL}

  SIDE side;

  //Building the transaction information
  struct TransactionOrder {
    uint id;
    address trader;
    SIDE side;
    bytes32 ticker;
    uint amount;
    uint price;
  }

  uint public nextOrderId = 0;

  //need an ORDERBOOK split into two parts -->
  //bids & asks
  //AND an orderbook for each asset

  mapping (address => uint256) public EthBalance;

  //order points to a ticker which points to a Enum option (uint 0, 1, etc)
  mapping (bytes32 => mapping (uint => TransactionOrder[])) public orderbook;

  //depositing ETH requires the dex.depositETH({value: X}); command
  function depositETH() public payable returns(bool) {
    require(msg.value > 0, "Insufficient value.");
    EthBalance[msg.sender]= EthBalance[msg.sender].add(msg.value);
    return true;

  }

  //get the orderbook --> need the bytes32 ticker and the SIDE (BUY OR SELL)
  //view because it just returns something
  //and to input this function --> an example = getOrderBook(bytes32("LINK"), SIDE.BUY);
    //Solidity automatically converts SIDE.BUY into an integer that reads "0" or "1"
      //with order they are presented in enum
  function getOrderBook (bytes32 ticker, SIDE _side) view public returns(TransactionOrder[] memory) {
    return orderbook[ticker][uint(_side)];
  }


  //Complex function to create... why?
  //as soon as you add an order into the order book, you need to sort it --> needs to be in proper position
    //best Buy price is at HIGHEST side of BIDS orderbook
    //best Sell price is at LOWEST side of ASKS orderbook
  //loops are needed for this

  //args (ticker, uint 0/1 = buy/sell, uint how many tokens do you want to buy/sell, uint price of token)
  function createLimitOrder(bytes32 ticker, SIDE _side, uint amount, uint price) public tokenExists(ticker) {

    if(_side == SIDE.BUY){
      require(EthBalance[msg.sender] >= amount.mul(price));

    }
    else if(_side == SIDE.SELL){
      require(balances[msg.sender][ticker] >= amount);

    }

    TransactionOrder[] storage transactionOrders = orderbook[ticker][uint(_side)];
    //This TxOrder (below) will be pushed into the TxOrder[] above^, we've already extracted if it's Buy/Sell
    transactionOrders.push(TransactionOrder(nextOrderId, msg.sender, _side, ticker, amount, price));

    //bubble sort
    //[6, 5, 4, 3]
    //setting the last element in the array to i using an if statement as a variable
    uint i = transactionOrders.length > 0 ? transactionOrders.length - 1 : 0;
    if (_side == SIDE.BUY){
      while(i > 0){
        //if the last element.price minus 1 > than the last element (i) in the array, then...
        //array is sorted properly
        if(transactionOrders[i - 1].price > transactionOrders[i].price){
          break;
        }
        TransactionOrder memory orderToMove = transactionOrders[i - 1];
        transactionOrders[i - 1] = transactionOrders[i];
        transactionOrders[i] = orderToMove;
          //decrease value of i and do it again...
        i--;
      }
    }

    if (_side == SIDE.SELL){
      while(i > 0){
        if(transactionOrders[i - 1].price < transactionOrders[i].price){
          break;
        }
        TransactionOrder memory sellOrderToMove = transactionOrders[i - 1];
        transactionOrders[i - 1] = transactionOrders[i];
        transactionOrders[i] = sellOrderToMove;
        i--;
      }
    }
  }

  function createMarketOrder(bytes32 ticker, SIDE _side, uint amount, uint price) public tokenExists(ticker) {
    //for buy order --> input lINK, 0, 50.. which fulfills a limit sell order for 50 lINK for price: 0.5 Eth
    //Buyer needs at least 25 ETH in wallet
    TransactionOrder[] storage transactionOrders = orderbook[ticker][uint(_side)];

    uint i = _side == SIDE.BUY ? transactionOrders.length - 1 : 0;

    if(_side == SIDE.BUY){
      require(EthBalance[msg.sender] >= _marketBuyPrice(ticker, _side, amount, price), "Buyer does not have enough Ether.");
    }
    if(_side == SIDE.SELL){
      require(balances[msg.sender][ticker] >= amount, "Seller does not have a sufficient balance of this token.");
    }

    //MarketOrder needs to talk to limitOrders to get price..
    if(_side == SIDE.BUY){
      uint askPrice = transactionOrders[i - 1].price;
    }

    if(_side == SIDE.SELL){
      uint bidPrice = transactionOrders[i].price;
    }
  }

  function _marketBuyPrice(bytes32 ticker, SIDE _side, uint amount, uint price) public view returns(uint){
    TransactionOrder[] memory transactionOrders = orderbook[ticker][uint(_side)];
    uint _amount = transactionOrders[0].amount;
    uint _price = transactionOrders[0].price;
    uint buyPrice = _amount.mul(_price);
    return buyPrice;

  }

}
