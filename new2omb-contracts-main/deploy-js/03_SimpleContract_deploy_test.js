console.clear();
require("dotenv").config();
const {
  AccountId,
  PrivateKey,
  Client,
  ContractCreateFlow,
  ContractFunctionParameters,
  ContractExecuteTransaction,
  ContractCallQuery,
  AccountBalanceQuery,
} = require("@hashgraph/sdk");

const accountId = AccountId.fromString(process.env.ACCOUNT_ID);
const privateKey = PrivateKey.fromString(process.env.PRIVATE_KEY);

const client = Client.forTestnet().setOperator(accountId, privateKey);

const main = async () => {
  let jsonFile = require("../smart-contracts/artifacts/contracts/03_SimpleContract.sol/SimpleContract.json");
  const bytecode = jsonFile.bytecode;

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const accountBalance1 = await new AccountBalanceQuery()
    .setAccountId(accountId)
    .execute(client);
  console.log(
    "The account balance is: " + accountBalance1.hbars.toBigNumber() + " Hbar."
  );
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Create contract using ContractCreateFlow
  const createContract = new ContractCreateFlow()
    .setGas(100000)
    .setConstructorParameters(new ContractFunctionParameters().addUint64(5))
    .setBytecode(bytecode);
  const createTx = await createContract.execute(client);
  const createRx = await createTx.getReceipt(client);
  const contractId = createRx.contractId;

  console.log(`Glinton log >>>>> Contract created with ID: ${contractId}`);

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const accountBalance2 = await new AccountBalanceQuery()
    .setAccountId(accountId)
    .execute(client);
  console.log(
    "The account balance is: " + accountBalance2.hbars.toBigNumber() + " Hbar."
  );
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // const contractId = "0.0.47958002";

  //Create the transaction
  const transaction = new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(100000)
    .setFunction("updateCaller");

  const txResponse = await transaction.execute(client);
  const receipt = await txResponse.getReceipt(client);
  const transactionStatus = receipt.status;

  // console.log("Glinton log >>>>> The transaction txResponse is ", txResponse);
  console.log(
    "Glinton log >>>>> The transaction consensus status is " + transactionStatus
  );

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const accountBalance3 = await new AccountBalanceQuery()
    .setAccountId(accountId)
    .execute(client);
  console.log(
    "The account balance is: " + accountBalance3.hbars.toBigNumber() + " Hbar."
  );
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const contractQuery = await new ContractCallQuery()
    .setGas(50000)
    .setContractId(contractId)
    .setFunction("getCounter");
  // .setQueryPayment(new Hbar(2));

  const getMessage = await contractQuery.execute(client);
  const message = getMessage.getUint8();
  console.log("Glinton log >>>>> The function result is: " + message);

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const accountBalance4 = await new AccountBalanceQuery()
    .setAccountId(accountId)
    .execute(client);
  console.log(
    "The account balance is: " + accountBalance4.hbars.toBigNumber() + " Hbar."
  );
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //v2.0.0
};

main();
