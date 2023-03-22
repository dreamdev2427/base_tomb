require("dotenv").config();
const { AccountId, PrivateKey, Client, ContractCreateFlow } = require('@hashgraph/sdk');

const accountId = AccountId.fromString(process.env.ACCOUNT_ID);
const privateKey = PrivateKey.fromString(process.env.PRIVATE_KEY);

const client = Client.forTestnet().setOperator(accountId, privateKey);

const main = async () => {

    let jsonFile = require("../smart-contracts/artifacts/contracts/01_DummyContract.sol/DummyContract.json");
    const bytecode = jsonFile.bytecode;

    // Create contract using ContractCreateFlow
    const createContract = new ContractCreateFlow()
        .setGas(100000)
        .setBytecode(bytecode);
    const createTx = await createContract.execute(client);
    const createRx = await createTx.getReceipt(client);
    const contractId = createRx.contractId;

    console.log(`Glinton log >>>>> Contract created with ID: ${contractId}`);
}

main();