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
    //filled increases as limit order is filled --> until completely filled.
    //Then, order is removed from order book
    uint filled;
  }

  uint public nextOrderId = 0;

  mapping (address => uint256) public EthBalance;

  //need an ORDERBOOK split into two parts -->
  //bids & asks
  //AND an orderbook for each asset

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

    nextOrderId++;
  }

  function createMarketOrder(bytes32 ticker, SIDE _side, uint amount) public tokenExists(ticker) {

    if(_side == SIDE.SELL){
      require(balances[msg.sender][ticker] >= amount, "Insufficient funds to fill entire sell amount.");
    }

    //market orders are dealing with limit orders of the opposite "_side".. need to be able to talk to each Other
    //create a variable that represents buy/sell Enum
    uint orderBookSide;

    if(_side == SIDE.BUY){
      orderBookSide = 1;
    }
    else{
      orderBookSide = 0;
    }

    TransactionOrder[] storage transactionOrders = orderbook[ticker][orderBookSide];

    //create a variable that can be tracked while looping through order orderBook
    //this variable will stop loop if the market order if completely filled
    uint totalFilled = 0;

    for(uint256 i = 0; i < transactionOrders.length && totalFilled < amount; i++){
      uint markOrderLeftToFill = amount.sub(totalFilled); //amount left in order = initial amount - filled so far
      uint limOrderAvailableToFill = transactionOrders[i].amount.sub(transactionOrders[i].filled);//order.amount - order.filled
      uint fill = 0;

      if(limitOrderAvailableToFill > marketOrderLeftToFill){
        fill = marketOrderLeftToFill;
      }
      else{
        fill = limitOrderAvailableToFill;
      }

      //when totalFilled = amount, exit loop
      totalFilled = totalFilled.add(fill);
      transactionOrders[i].filled = transactionOrders[i].filled.add(fill);
      uint cost = fill.mul(transactionOrders[i].price);

      if(_side == SIDE.BUY){
        require(EthBalance[msg.sender] >= cost;
        balances[msg.sender][ticker] = balances[msg.sender][ticker].add(fill);
        EthBalance[msg.sender] = EthBalance[msg.sender].sub(cost);

        balances[transactionOrders[i].trader][ticker] = balances[transactionOrders[i].trader][ticker].sub(fill);
        EthBalance[transactionOrders[i].trader] = EthBalance[transactionOrders[i].trader].add(cost);
      }

      if(_side == SIDE.SELL){
        balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(fill);
        EthBalance[msg.sender] = EthBalance[msg.sender].add(cost);

        balances[transactionOrders[i].trader][ticker] = balances[transactionOrders[i].trader][ticker].add(fill);
        EthBalance[transactionOrders[i].trader] = EthBalance[transactionOrders[i].trader].sub(cost);
      }

      //execute the trade (balances need to be shifted between buyer/seller)
      //for each trade, verify BUYER has enough ETH to cover buy order
    }

    //Loop through orderbook and remove all of the ordefrs that were 100% filled from order book.
    for(uint256 i = 0; i < transactionOrders.length; i++){
      if(orderBookSide == 1 && transactionOrders[i].price < transactionOrders[i + 1].price && transactionOrders[i].price == 0){
      TransactionOrder memory sellOrderToMove = transactionOrders[i];
      transactionOrders[i + 1] = transactionOrders[i];
      transactionOrders[i + 1] = sellOrderToMove;
      i++;
    }
    transactionOrders.pop();
  }
  //buyOrders[9, 7, 4]
    for(uint256 i = 0; i < transactionOrders.length; i++){
      if(orderBookSide == 0 && transactionOrders[i].price < transactionOrders[i + 1].price && transactionOrders[i].price == 0){
      TransactionOrder memory sellOrderToMove = transactionOrders[i];
      transactionOrders[i + 1] = transactionOrders[i];
      transactionOrders[i + 1] = sellOrderToMove;
      i++;
    }
    transactionOrders.pop();
  }

}


}