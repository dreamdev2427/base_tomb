import { useCallback } from 'react';
import useTombFinance from './useTombFinance';
import useHandleTransactionReceipt from './useHandleTransactionReceipt';

const useHarvestFromMasonry = () => {
  const tombFinance = useTombFinance();
  const handleTransactionReceipt = useHandleTransactionReceipt();

  const handleReward = useCallback(() => {
    handleTransactionReceipt(tombFinance.harvestCashFromMasonry(), 'Claim BOMB from the Room ');
  }, [tombFinance, handleTransactionReceipt]);

  return { onReward: handleReward };
};

export default useHarvestFromMasonry;
