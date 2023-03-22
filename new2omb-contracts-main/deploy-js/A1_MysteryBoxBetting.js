console.clear();
require("dotenv").config();
const {
  AccountId,
  PrivateKey,
  Client,
  Hbar,
  ContractCreateFlow,
  ContractFunctionParameters,
  ContractExecuteTransaction,
  ContractCallQuery,
  AccountBalanceQuery,
} = require("@hashgraph/sdk");
const axios = require("axios");
const { getEventsFromMirror } = require("./query_helper");

const accountId = AccountId.fromString(process.env.DEPLOYER_ID);
const privateKey = PrivateKey.fromString(process.env.DEPLOYER_PRV_KEY);
const client = Client.forTestnet()
  .setOperator(accountId, privateKey)
  .setDefaultMaxTransactionFee(new Hbar(50));

const treasuryId = AccountId.fromString(process.env.TREASURY_ID);
const jackpotId = AccountId.fromString(process.env.JACKPOT_ID);

const MIRROR_NODE_URL =
  "https://testnet.mirrornode.hedera.com/api/v1/accounts/";

const main = async () => {
  let jsonFile = require("../smart-contracts/artifacts/contracts/A1_MysteryBoxBetting.sol/MysteryBoxBetting.json");
  const bytecode = jsonFile.bytecode;

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  const deployerBal = await axios(`${MIRROR_NODE_URL}${accountId}`);
  console.log(
    "The deployer balance is: " +
      deployerBal.data.balance.balance / 100000000 +
      " Hbar."
  );

  // const createContract = new ContractCreateFlow()
  //   .setGas(1000000)
  //   .setBytecode(bytecode);
  // const createTx = await createContract.execute(client);
  // const createRx = await createTx.getReceipt(client);
  // const contractId = createRx.contractId;
  // console.log(`Crystal log >>>>> Contract created with ID: ${contractId}`);

  // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // await new Promise((resolve) => setTimeout(resolve, 5000));
  // const accountBalance2 = await new AccountBalanceQuery()
  //   .setAccountId(accountId)
  //   .execute(client);
  // console.log(
  //   "The deployer balance is: " + accountBalance2.hbars.toBigNumber() + " Hbar."
  // );
  //   //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const contractId = "0.0.3643435";

  const contractBal1 = await axios(`${MIRROR_NODE_URL}${contractId}`);
  console.log(
    "The vault balance is: " +
      contractBal1.data.balance.balance / 100000000 +
      " Hbar."
  );
  const contractBal2 = await axios(`${MIRROR_NODE_URL}${treasuryId}`);
  console.log(
    "The treasury balance is: " +
      contractBal2.data.balance.balance / 100000000 +
      " Hbar."
  );
  const contractBal3 = await axios(`${MIRROR_NODE_URL}${jackpotId}`);
  console.log(
    "The jackpot balance is: " +
      contractBal3.data.balance.balance / 100000000 +
      " Hbar."
  );
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // const setGameParamstransaction = new ContractExecuteTransaction()
  //   .setContractId(contractId)
  //   .setGas(1000000)
  //   .setFunction(
  //     "setGameParams",
  //     new ContractFunctionParameters()
  //       .addAddress(treasuryId.toSolidityAddress())
  //       .addAddress(jackpotId.toSolidityAddress())
  //       .addUint32(35)
  //       .addUint32(50)
  //       .addUint32Array([2, 4, 6, 12])
  //       .addUint32Array([1000, 1500, 3000, 10000])
  //   );

  // const setGameParamstxResponse = await setGameParamstransaction.execute(
  //   client
  // );
  // const setGameParamsreceipt = await setGameParamstxResponse.getReceipt(client);
  // const setGameParamstransactionStatus = setGameParamsreceipt.status;

  // console.log(
  //   "Crystal setGameParams() log >>>>> The transaction consensus status is " +
  //     setGameParamstransactionStatus
  // );

  //   //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  //   //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // const transaction = new ContractExecuteTransaction()
  //   .setContractId(contractId)
  //   .setGas(1000000)
  //   .setFunction("depositForRewards")
  //   .setPayableAmount(new Hbar(1000));

  // const txResponse = await transaction.execute(client);
  // const receipt = await txResponse.getReceipt(client);
  // const transactionStatus = receipt.status;

  // console.log(
  //   "Crystal depositForRewards() log >>>>> The transaction consensus status is " +
  //     transactionStatus
  // );

  let boxCount = 4;
  let userselecteBox = Date.now() % boxCount;
  console.log(
    "boxCount ==> ",
    boxCount,
    " userselectedBox ==> ",
    userselecteBox
  );
  const transaction = new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(1000000)
    .setPayableAmount(new Hbar(1))
    .setFunction(
      "playBetting",
      new ContractFunctionParameters()
        .addUint256(boxCount)
        .addUint256(userselecteBox)
    );

  const txResponse = await transaction.execute(client);
  const receipt = await txResponse.getReceipt(client);
  const transactionStatus = receipt.status;

  console.log(
    "Crystal playBetting() log >>>>> The transaction consensus status is " +
      transactionStatus
  );

  await new Promise((resolve) => setTimeout(resolve, 5000));

  const contractPRNQuery = await new ContractCallQuery()
    .setGas(1000000)
    .setContractId(contractId)
    .setQueryPayment(new Hbar(2))
    .setFunction(
      "checkPrn",
      new ContractFunctionParameters().addAddress(accountId.toSolidityAddress())
    );

  const getPRNMessage = await contractPRNQuery.execute(client);
  const messagePRN = getPRNMessage.getUint32();
  console.log(
    "Crystal checkPrn() log >>>>> The function result is: " + messagePRN
  );

  const contractQuery = await new ContractCallQuery()
    .setGas(1000000)
    .setContractId(contractId)
    .setQueryPayment(new Hbar(2))
    .setFunction(
      "isWinner",
      new ContractFunctionParameters().addAddress(accountId.toSolidityAddress())
    );

  const getMessage = await contractQuery.execute(client);
  const message = getMessage.getBool();
  console.log(
    "Crystal isWinner() log >>>>> The function result is: " + message
  );

  // let latestevent = await getEventsFromMirror(contractId, jsonFile.abi, "Play");

  // if (
  //   latestevent.length === 1 &&
  //   latestevent[0]._player === "0x" + accountId.toSolidityAddress()
  // ) {
  //   console.log("Last event ===> ", latestevent[0]);
  //   if (Number(latestevent[0]._earnedAmount) > 0) console.log("Win!");
  //   else console.log("Lose!");
  // }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const deployerBal1 = await axios(`${MIRROR_NODE_URL}${accountId}`);
  console.log(
    "The deployer balance is: " +
      deployerBal1.data.balance.balance / 100000000 +
      " Hbar."
  );
  const contractBalance1 = await axios(`${MIRROR_NODE_URL}${contractId}`);
  console.log(
    "The vault balance is: " +
      contractBalance1.data.balance.balance / 100000000 +
      " Hbar."
  );
  const contractBalance2 = await axios(`${MIRROR_NODE_URL}${treasuryId}`);
  console.log(
    "The treasury balance is: " +
      contractBalance2.data.balance.balance / 100000000 +
      " Hbar."
  );
  const contractBalance3 = await axios(`${MIRROR_NODE_URL}${jackpotId}`);
  console.log(
    "The jackpot balance is: " +
      contractBalance3.data.balance.balance / 100000000 +
      " Hbar."
  );
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
};

main();
