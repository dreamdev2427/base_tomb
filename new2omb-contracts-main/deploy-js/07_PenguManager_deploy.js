require("dotenv").config();
const {
    AccountId,
    PrivateKey,
    Client,
    ContractCreateFlow,
    TokenId,
    ContractFunctionParameters
} = require('@hashgraph/sdk');

const accountId = AccountId.fromString(process.env.ACCOUNT_ID);
const privateKey = PrivateKey.fromString(process.env.PRIVATE_KEY);

const client = Client.forTestnet().setOperator(accountId, privateKey);

const main = async () => {

    let jsonFile = require("../smart-contracts/artifacts/contracts/PenguManager.sol/PenguManager.json");
    const bytecode = jsonFile.bytecode;

    let penguPalTokenId = TokenId.fromString("0.0.48071424");
    let penguNFTTokenId = TokenId.fromString("0.0.48003194");
    let penguNFTGoldTokenId = TokenId.fromString("0.0.48064822");

    // Create contract using ContractCreateFlow
    const createContract = new ContractCreateFlow()
        .setGas(500000)
        .setConstructorParameters(new ContractFunctionParameters()
        .addAddress(penguPalTokenId.toSolidityAddress())
        .addAddress(penguNFTTokenId.toSolidityAddress())
        .addAddress(penguNFTGoldTokenId.toSolidityAddress()))
        .setBytecode(bytecode);
    const createTx = await createContract.execute(client);
    const createRx = await createTx.getReceipt(client);
    const contractId = createRx.contractId;

    console.log(`Glinton log >>>>> Contract created with ID: ${contractId}`);
}

main();