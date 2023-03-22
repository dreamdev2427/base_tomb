require('dotenv').config();

const {
    Client,
    AccountId,
    PrivateKey,
    ContractCreateFlow,
    ContractFunctionParameters,
    ContractExecuteTransaction,
    AccountCreateTransaction,
    Hbar
} = require('@hashgraph/sdk');

// Get operator from .env file
const operatorKey = PrivateKey.fromString(process.env.PRIVATE_KEY);
const operatorId = AccountId.fromString(process.env.ACCOUNT_ID);

const client = Client.forTestnet().setOperator(operatorId, operatorKey);

// Account creation function
async function accountCreator(pvKey, iBal) {

    const response = await new AccountCreateTransaction()
        .setInitialBalance(new Hbar(iBal))
        .setKey(pvKey.publicKey)
        .execute(client);

    const receipt = await response.getReceipt(client);

    return receipt.accountId;
}

const main = async () => {

    let jsonFile = require("../smart-contracts/artifacts/contracts/02_FungibleTokenCreator.sol/FungibleTokenCreator.json");
    const bytecode = jsonFile.bytecode;

    const treasuryKey = PrivateKey.generateED25519();
    const treasuryId = await accountCreator(treasuryKey, 10);

    console.log(`Glinton log >>>>> treasuryId: ${treasuryId}`);
    console.log(`Glinton log >>>>> treasuryKey: ${treasuryKey}`);

    const createContract = new ContractCreateFlow()
        .setGas(150000) // Increase if revert
        .setBytecode(bytecode); // Contract bytecode
    const createContractTx = await createContract.execute(client);
    const createContractRx = await createContractTx.getReceipt(client);
    const contractId = createContractRx.contractId;

    console.log(`Glinton log >>>>> Contract created with ID: ${contractId}`);

    // Create FT using precompile function
    const createToken = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(300000) // Increase if revert
        .setPayableAmount(20) // Increase if revert
        .setFunction("createFungible", 
            new ContractFunctionParameters()
            .addString("Pengupals") // FT name
            .addString("PAL") // FT symbol
            .addUint256(2147483647 * 10**8) // FT initial supply
            .addUint256(8) // FT decimals
            .addUint32(7000000)); // auto renew period

    const createTokenTx = await createToken.execute(client);

    const createTokenRx = await createTokenTx.getRecord(client);
    const tokenIdSolidityAddr = createTokenRx.contractFunctionResult.getAddress(0);
    const tokenId = AccountId.fromSolidityAddress(tokenIdSolidityAddr);

    console.log(`Glinton log >>>>> Token created with ID: ${tokenId} \n`);
}

main();