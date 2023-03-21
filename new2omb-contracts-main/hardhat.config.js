require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
module.exports = {
    networks: {
        hardhat: {},
        ropsten: {
            url: "https://ropsten.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
        },
        fantom: {
            url: "https://rpc.ftm.tools",
            gasMultiplier: 2
        }
    },
    solidity: {
        compilers: [{
            version: "0.6.12",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                }
            }
        }, {
            version: "0.8.7",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                }
            }
        }]
    },
    etherscan: {
        apiKey: "3EBCSRPNAX3BNVPMWSG8F1XEHA9ANI3M5E"
    }
}