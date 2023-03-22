// @Glinton added this code on Aug 26, 2022.
// This is perfect code
console.clear();
require("dotenv").config();
const {
    TokenId,
    AccountId,
    PrivateKey,
    Client,
    AccountAllowanceApproveTransaction,
    TransferTransaction,
    AccountBalanceQuery,
    NftId
} = require("@hashgraph/sdk");

// Configure accounts and client, and generate needed keys
const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
const operatorKey = PrivateKey.fromString(process.env.OPERATOR_PVKEY);
const aliceId = AccountId.fromString(process.env.ALICE_ID);
const aliceKey = PrivateKey.fromString(process.env.ALICE_PVKEY);
const bobId = AccountId.fromString(process.env.BOB_ID);
const bobKey = PrivateKey.fromString(process.env.BOB_PVKEY);

const client_operator = Client.forTestnet().setOperator(operatorId, operatorKey);
const client_alice = Client.forTestnet().setOperator(aliceId, aliceKey);
const client_bob = Client.forTestnet().setOperator(bobId, bobKey);

const nftTokenId = TokenId.fromString("0.0.48003194");

async function tokenTransferFcn(tokenId, serialNumber, from, to, fromPvKey) {
    let tokenTransferTx = await new TransferTransaction()
        .addNftTransfer(tokenId, serialNumber, from, to)
        .freezeWith(client)
        .sign(fromPvKey);
    let tokenTransferSubmit = await tokenTransferTx.execute(client);
    let tokenTransferRx = await tokenTransferSubmit.getReceipt(client);
    return tokenTransferRx;
}


async function main() {

    console.log(`Glinton log >>>>> nftTokenId : ${nftTokenId}`);

    // Check the balance before the transfer for Alice's account
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(aliceId).execute(client_alice);
    console.log(`- Alice's balance: ${balanceCheckTx.hbars.toBigNumber()} hbar, ${balanceCheckTx.tokens._map.get(nftTokenId.toString())} NFTs of ID ${nftTokenId}`);

    //Create the transaction
    const transaction = new AccountAllowanceApproveTransaction()
        .approveTokenNftAllowance(new NftId(nftTokenId, 9999), aliceId, bobId)
        .freezeWith(client_alice);
    const signTx = await transaction.sign(aliceKey);
    const txResponse = await signTx.execute(client_alice);
    const receipt = await txResponse.getReceipt(client_alice);
    const transactionStatus = receipt.status;
    console.log("The approve status is " + transactionStatus.toString());

    const tokenTransferTx = await new TransferTransaction()
        .addNftTransfer(nftTokenId, 9999, aliceId, bobId)
        .freezeWith(client_bob)
        .sign(aliceKey);
    const tokenTransferSubmit = await tokenTransferTx.execute(client_bob);
    const tokenTransferRx = await tokenTransferSubmit.getReceipt(client_bob);
    const tokenTransferRxStatus = tokenTransferRx.status;
    console.log("The transaction status is " + tokenTransferRxStatus.toString());

    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(aliceId).execute(client_alice);
    console.log(`- Alice's balance: ${balanceCheckTx.hbars.toBigNumber()} hbar, ${balanceCheckTx.tokens._map.get(nftTokenId.toString())} NFTs of ID ${nftTokenId}`);

}
main();