import { useCallback } from 'react';
import useTombFinance from './useTombFinance';
import useHandleTransactionReceipt from './useHandleTransactionReceipt';
import { parseUnits } from 'ethers/lib/utils';
import { TAX_OFFICE_ADDR } from './../utils/constants'

const useProvideTombEthLP = () => {
  const tombFinance = useTombFinance();
  const handleTransactionReceipt = useHandleTransactionReceipt();

  const handleProvideTombEthLP = useCallback(
    (ethAmount: string, tombAmount: string) => {
      const tombAmountBn = parseUnits(tombAmount);
      handleTransactionReceipt(
        tombFinance.provideTombEthLP(ethAmount, tombAmountBn),
        `Provide Tomb-ETH LP ${tombAmount} ${ethAmount} using ${TAX_OFFICE_ADDR}`,
      );
    },
    [tombFinance, handleTransactionReceipt],
  );
  return { onProvideTombEthLP: handleProvideTombEthLP };
};

export default useProvideTombEthLP;
