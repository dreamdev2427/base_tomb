console.clear();
require("dotenv").config();
const {
    AccountId,
    PrivateKey,
    Client,
    ContractExecuteTransaction,
    ContractCallQuery,
    AccountBalanceQuery
} = require('@hashgraph/sdk');

const accountId = AccountId.fromString(process.env.ACCOUNT_ID);
const privateKey = PrivateKey.fromString(process.env.PRIVATE_KEY);

const client = Client.forTestnet().setOperator(accountId, privateKey);

const main = async () => {

    const contractId = "0.0.48073940";
/*
    //Create the transaction
    const transaction = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("updateCaller");

    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const transactionStatus = receipt.status;

    // console.log("Glinton log >>>>> The transaction txResponse is ", txResponse);
    console.log("Glinton log >>>>> The transaction consensus status is " + transactionStatus);
*/

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // await new Promise((resolve) => setTimeout(resolve, 5000));
    const accountBalance3 = await new AccountBalanceQuery().setAccountId(accountId).execute(client);
    console.log("The account balance is: " + accountBalance3.hbars.toBigNumber() + " Hbar.");
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////


    const contractQuery = await new ContractCallQuery()
        .setGas(50000)
        .setContractId(contractId)
        .setFunction("getDailyReward")
    // .setQueryPayment(new Hbar(2));

    const getMessage = await contractQuery.execute(client);
    const message = getMessage.getInt64(0, true);
    console.log("Glinton log >>>>> The function result is: ", message);


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const accountBalance4 = await new AccountBalanceQuery().setAccountId(accountId).execute(client);
    console.log("The account balance is: " + accountBalance4.hbars.toBigNumber() + " Hbar.");
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //v2.0.0
}

main();