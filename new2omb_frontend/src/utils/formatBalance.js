import { BigNumber } from 'ethers';
import config, { ETHER_UNITS } from '../config';
import Web3 from 'web3';
import { web3ProviderFrom } from '../tomb-finance/ether-utils';

const DefaultWeb3 = new Web3(web3ProviderFrom(config.defaultProvider));

export const getDisplayBalance = (balance, decimals = 18, fractionDigits = 4, isTruncated = false) => {
  if (decimals === 0) {
    fractionDigits = 0;
  }
  const ethunitname = Object.keys(ETHER_UNITS).find((key) => Math.pow(10, decimals).toString() === ETHER_UNITS[key]);
  let amountFromWei = DefaultWeb3.utils.fromWei(balance.toString(), ethunitname.toString());
  return Number(amountFromWei).toFixed(fractionDigits);
};

export const getFullDisplayBalance = (balance, decimals = 18, isTruncated = false) => {
  return getDisplayBalance(balance, decimals, 4, isTruncated);
};

export function getBalance(balance, decimals = 18) {
  return Number(balance.div(BigNumber.from(10).pow(decimals)));
}
