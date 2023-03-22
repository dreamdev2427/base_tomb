// @Glinton added this code on Aug 26, 2022.
// This is perfect code
console.clear();
require("dotenv").config();
const {
    AccountId,
    PrivateKey,
    Client,
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    TokenMintTransaction,
    TransferTransaction,
    AccountBalanceQuery,
    TokenAssociateTransaction,
} = require("@hashgraph/sdk");

// Configure accounts and client, and generate needed keys
const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
const operatorKey = PrivateKey.fromString(process.env.OPERATOR_PVKEY);
const treasuryId = AccountId.fromString(process.env.TREASURY_ID);
const treasuryKey = PrivateKey.fromString(process.env.TREASURY_PVKEY);
const aliceId = AccountId.fromString(process.env.ALICE_ID);
const aliceKey = PrivateKey.fromString(process.env.ALICE_PVKEY);

const client = Client.forTestnet().setOperator(operatorId, operatorKey);

const supplyKey = PrivateKey.generate();

async function tokenMinterFcn(tokenId, CID) {
    mintTx = await new TokenMintTransaction()
        .setTokenId(tokenId)
        .setMetadata([Buffer.from(CID)])
        .freezeWith(client);
    let mintTxSign = await mintTx.sign(supplyKey);
    let mintTxSubmit = await mintTxSign.execute(client);
    let mintRx = await mintTxSubmit.getReceipt(client);
    return mintRx;
}

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

    //Create the NFT
    let nftCreate = await new TokenCreateTransaction()
        .setTokenName("Penguins")
        .setTokenSymbol("Penguin")
        .setTokenType(TokenType.NonFungibleUnique)
        .setDecimals(0)
        .setInitialSupply(0)
        .setTreasuryAccountId(treasuryId)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(250)
        .setSupplyKey(supplyKey)
        .freezeWith(client);
    //Sign the transaction with the treasury key
    let nftCreateTxSign = await nftCreate.sign(treasuryKey);
    //Submit the transaction to a Hedera network
    let nftCreateSubmit = await nftCreateTxSign.execute(client);
    //Get the transaction receipt
    let nftCreateRx = await nftCreateSubmit.getReceipt(client);
    //Get the token ID
    let tokenId = nftCreateRx.tokenId;
    //Log the token ID
    console.log(`Glinton log >>>>> Created NFT with Token ID: ${tokenId} \n`);


    // let tokenId = TokenId.fromString("0.0.48004573");

    //IPFS content identifiers for which we will create a NFT
    CID = [
        "ipfs://Qme718Vp1ShycWg8mCLQS1d5BJrZg2bnDdHmBFoVaMA3UA/1.json",
        "ipfs://Qme718Vp1ShycWg8mCLQS1d5BJrZg2bnDdHmBFoVaMA3UA/2.json",
        "ipfs://Qme718Vp1ShycWg8mCLQS1d5BJrZg2bnDdHmBFoVaMA3UA/3.json",
        "ipfs://Qme718Vp1ShycWg8mCLQS1d5BJrZg2bnDdHmBFoVaMA3UA/4.json",
        "ipfs://Qme718Vp1ShycWg8mCLQS1d5BJrZg2bnDdHmBFoVaMA3UA/5.json",
        "ipfs://Qme718Vp1ShycWg8mCLQS1d5BJrZg2bnDdHmBFoVaMA3UA/6.json",
        "ipfs://Qme718Vp1ShycWg8mCLQS1d5BJrZg2bnDdHmBFoVaMA3UA/7.json",
        "ipfs://Qme718Vp1ShycWg8mCLQS1d5BJrZg2bnDdHmBFoVaMA3UA/8.json",
        "ipfs://Qme718Vp1ShycWg8mCLQS1d5BJrZg2bnDdHmBFoVaMA3UA/9.json",
        "ipfs://Qme718Vp1ShycWg8mCLQS1d5BJrZg2bnDdHmBFoVaMA3UA/10.json"
    ];

    nftLeaf = [];
    for (var i = 0; i < CID.length; i++) {
        nftLeaf[i] = await tokenMinterFcn(tokenId, CID[i]);
        console.log(`Created NFT ${tokenId} with serial: ${nftLeaf[i].serials[0].low}`);
    }


    console.log(`Glinton log >>>>> [tokenId] : ${[tokenId]}`);

    //Create the associate transaction and sign with Alice's key 
    let associateAliceTx = await new TokenAssociateTransaction()
        .setAccountId(aliceId)
        .setTokenIds([tokenId])
        .freezeWith(client)
        .sign(aliceKey);
    //Submit the transaction to a Hedera network
    let associateAliceTxSubmit = await associateAliceTx.execute(client);
    //Get the transaction receipt
    let associateAliceRx = await associateAliceTxSubmit.getReceipt(client);
    //Confirm the transaction was successful
    console.log(`- NFT association with Alice's account: ${associateAliceRx.status}\n`);

    // Check the balance before the transfer for the treasury account
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(treasuryId).execute(client);
    console.log(`- Treasury balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} NFTs of ID ${tokenId}`);
    // Check the balance before the transfer for Alice's account
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(aliceId).execute(client);
    console.log(`- Alice's balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} NFTs of ID ${tokenId}`);


    for (var i = 0; i < CID.length; i++) {
        var tokenTransferRx = await tokenTransferFcn(tokenId, i + 1, treasuryId, aliceId, treasuryKey);
        console.log(`- NFT transfer from Treasury to Alice: ${tokenTransferRx.status}`);
    }

    // Check the balance of the treasury account after the transfer
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(treasuryId).execute(client);
    console.log(`- Treasury balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} NFTs of ID ${tokenId}`);

    // Check the balance of Alice's account after the transfer
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(aliceId).execute(client);
    console.log(`- Alice's balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} NFTs of ID ${tokenId}`);

}
main();