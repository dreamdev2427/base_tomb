// @Glinton added this code on Dec 22, 2022.
// This is perfect code

console.clear();
require('dotenv').config();
const {
    AccountId,
    PrivateKey,
    Client,
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    TokenMintTransaction,
    TokenBurnTransaction,
    TokenInfoQuery,
    TokenId,
} = require('@hashgraph/sdk');

// Configure accounts and client, and generate needed keys
const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
const operatorKey = PrivateKey.fromString(process.env.OPERATOR_PVKEY);

const client = Client.forTestnet().setOperator(operatorId, operatorKey);
// const client = Client.forMainnet().setOperator(operatorId, operatorKey);

// const supplyKey = PrivateKey.generate();

//for mint and burn
const supplyKey = PrivateKey.fromString('302e020100300506032b65700422042058bbb30e030a9b1c38a74329a74c2aeacdb9fed5fa0407612863637b777e4fb0');
const tokenId = TokenId.fromString('0.0.49141062');

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

async function tokenBurnFcn(tokenId, serialNum) {
    let tokenBurnTx = await new TokenBurnTransaction()
        .setTokenId(tokenId)
        .setSerials([serialNum])
        .freezeWith(client)
        .sign(supplyKey);
    let tokenBurnSubmit = await tokenBurnTx.execute(client);
    let tokenBurnRx = await tokenBurnSubmit.getReceipt(client);
    console.log(`\nBurn NFT with serial $serialNum}: ${tokenBurnRx.status} \n`);

    var tokenInfo = await new TokenInfoQuery().setTokenId(tokenId).execute(client);
    console.log(`Current NFT supply: ${tokenInfo.totalSupply} \n`);
}

async function main() {
    // //Create the NFT
    // let nftCreate = await new TokenCreateTransaction()
    //     .setTokenName('Santa')
    //     .setTokenSymbol('Santa')
    //     .setTokenType(TokenType.NonFungibleUnique)
    //     .setDecimals(0)
    //     .setInitialSupply(0)
    //     .setTreasuryAccountId(operatorId)
    //     .setSupplyType(TokenSupplyType.Finite)
    //     .setMaxSupply(22)
    //     .setSupplyKey(supplyKey)
    //     .freezeWith(client);

    // let nftCreateTxSign = await nftCreate.sign(operatorKey);
    // let nftCreateSubmit = await nftCreateTxSign.execute(client);
    // let nftCreateRx = await nftCreateSubmit.getReceipt(client);

    // let tokenId = nftCreateRx.tokenId;

    console.log(`log >>>>> Created NFT with Token ID: ${tokenId} \n`);
    console.log(`log >>>>> Supply Key: ${supplyKey} \n`);

    // //IPFS content identifiers for which we will create a NFT
    // CID = [
    //     'ipfs://QmTRANxwAXSfrE1sjAxRVxMEopwza9vzqDb3UhPW6Se5DX/1.json',
    //     'ipfs://QmTRANxwAXSfrE1sjAxRVxMEopwza9vzqDb3UhPW6Se5DX/2.json',
    //     'ipfs://QmTRANxwAXSfrE1sjAxRVxMEopwza9vzqDb3UhPW6Se5DX/3.json',
    // ];

    // for (let i = 0; i < CID.length; i++) {
    //     let mintResult = await tokenMinterFcn(tokenId, CID[i]);
    //     console.log(`Created NFT ${tokenId} with serial: ${mintResult.serials[0].low}`);
    // }

    await tokenBurnFcn(tokenId, 10);
}
main();