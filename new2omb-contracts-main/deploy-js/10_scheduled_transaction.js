console.clear();
require("dotenv").config();
const {
    AccountId,
    PrivateKey,
    Client,
    Hbar,
    TokenId,
    TransferTransaction,
    ScheduleCreateTransaction,
    ScheduleSignTransaction,
    ScheduleInfoQuery
} = require("@hashgraph/sdk");

// Configure accounts and client, and generate needed keys
const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
const operatorKey = PrivateKey.fromString(process.env.OPERATOR_PVKEY);
const aliceId = AccountId.fromString(process.env.ALICE_ID);
const aliceKey = PrivateKey.fromString(process.env.ALICE_PVKEY);

const client_operator = Client.forTestnet().setOperator(operatorId, operatorKey);
const client_alice = Client.forTestnet().setOperator(aliceId, aliceKey);

async function main() {

    //Create a transaction to schedule
    const transaction = new TransferTransaction()
        .addHbarTransfer(aliceId, new Hbar(-20))
        .addHbarTransfer(operatorId, new Hbar(20))
        .addNftTransfer(TokenId.fromString("0.0.48064822"), 9997, operatorId, aliceId);

    //Schedule a transaction
    const scheduleTransaction = await new ScheduleCreateTransaction()
        .setScheduledTransaction(transaction)
        .execute(client_operator);

    //Get the receipt of the transaction
    const receipt = await scheduleTransaction.getReceipt(client_operator);

    //Get the schedule ID
    const scheduleId = receipt.scheduleId;
    console.log("The schedule ID is " + scheduleId);

    //Get the scheduled transaction ID
    const scheduledTxId = receipt.scheduledTransactionId;
    console.log("The scheduled transaction ID is " + scheduledTxId);



    // console.log(`Scheduled transaction ID: ${receipt.transactionId}`);



    // The schedule ID is 0.0.48791710
    // The scheduled transaction ID is 0.0.48045222@1667416571.446227643?scheduled

    // const scheduleId = "0.0.48791710";
    // const scheduledTxId = "0.0.48045222@1667416571.446227643?scheduled";


    // Create two schedule transactions
    // let scheduleTx1 = await new ScheduleSignTransaction()
    //     .setScheduleId(scheduleId)
    //     .freezeWith(client_operator)
    //     .sign(operatorKey)

    // let scheduleTx1Submit = await scheduleTx1.execute(client_operator)
    // let scheduleTx1Rx = await scheduleTx1Submit.getReceipt(client_operator)
    // console.log(`Schedule 1 sign status: ${scheduleTx1Rx.status}`);

    let scheduleTx2 = await new ScheduleSignTransaction()
        .setScheduleId(scheduleId)
        .freezeWith(client_alice)
        .sign(aliceKey)

    let scheduleTx2Submit = await scheduleTx2.execute(client_alice)
    let scheduleTx2Rx = await scheduleTx2Submit.getReceipt(client_alice)
    console.log(`Schedule 2 sign status: ${scheduleTx2Rx.status}`);

    const query2 = await new ScheduleInfoQuery()
        .setScheduleId(scheduleId)
        .execute(client_alice);

    console.log(query2);
}
main();