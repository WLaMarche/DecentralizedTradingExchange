pragma solidity ^0.8.0;


import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";


//This should be Ownable
contract Wallet is Ownable {

  using SafeMath for uint256;

  event Deposit(address sender, uint amount, uint balance);

  //Since we are interacting with other ERC20 token contracts,
  //we need to have a way to store information about these different tokens

  //WHY "tokenAddress?" --> whenever you create something
  //you need to be able to do transfer calls WITH that created ERC20 contract

  struct Token {
    bytes32 ticker;
    address tokenAddress;
  }

  //In order for the DEX to be able to trade the token later on,
  //it needs support for that token (needs the tokenAddress saved somewhere) --
  //SAVE this address in a combined structure between an array and a mapping

  //can get the tokens and update them quickly here
  mapping (bytes32 => Token) public tokenMapping;

  //Saves all of the tickers (unique)
  //can loop through all of the tokens, just can't delete
  bytes32[] public tokenList;


  //create a double mapping for the balances (every user/trader will have a balance of different tokens)
  //will be able to deposit both ETH and ERC20 tokens (can have ETH, LINK, AAVE, etc...)
  //need a mapping that supports multiple balances
  //mapping is an address that points to another mapping that holds the tokenID (expressed with bytes32) and amount
  //Why bytes32? B/C in Solidity, you can't compare strings (can't string = string)
  //Instead, you can convert the "token symbol" into bytes32
  mapping (address => mapping(bytes32 => uint256)) public balances;

  //instead of adding a bunch of require() statements that chekc for the same thing
  //we will create a modifier and just add it to the function header, remove the require code from body
  modifier tokenExists(bytes32 ticker) {
    require(tokenMapping[ticker].tokenAddress != address(0));
    _;
  }

  //Create an ADD token FUNCTION so we can add to our DEX
  //bytes32 ticker --> give it it's ticker symbol and the bytes32 makes it comparable (can't do string = string)
  //address tokenAddress --> to access this token's "home" contract to interact with it
  //why external? Won't need to execute this from inside this contract
  function addToken(bytes32 ticker, address tokenAddress) onlyOwner external {
    tokenMapping[ticker] = Token(ticker, tokenAddress);
    tokenList.push(ticker);
  }

  //Pull cryptoassets in FROM another contract address
  //increase depositer balances[address][ticker] =  balances[address][ticker].add(amount)
  function deposit(uint amount, bytes32 ticker) tokenExists(ticker) external {
    IERC20(tokenMapping[ticker].tokenAddress).transferFrom(msg.sender, address(this), amount);
    balances[msg.sender][ticker] = balances[msg.sender][ticker].add(amount);
    //emit Deposit(msg.sender, msg.value, address(this).balance);
  }

  //Why do you check if the tokenAddress is not the 0 address?
  //If this mapping of the specific ticker points to an unitialized struct, all of the data will be 0

  function withdraw(uint amount, bytes32 ticker) tokenExists(ticker) external {
    require(balances[msg.sender][ticker] >= amount, "Balance not sufficient.");
    balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(amount);
    //IERC20(address of the token in THIS contract).transfer(recipient address of where it's going, amount)
    IERC20(tokenMapping[ticker].tokenAddress).transfer(msg.sender, amount);

  }

}
