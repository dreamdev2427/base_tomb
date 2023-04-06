import { useCallback } from 'react';
import useTombFinance from './useTombFinance';
import { Bank } from '../tomb-finance';
import useHandleTransactionReceipt from './useHandleTransactionReceipt';
import { parseUnits } from 'ethers/lib/utils';
import { useAddPopup } from '../state/application/hooks';

const useStake = (bank: Bank) => {
  const tombFinance = useTombFinance();
  const handleTransactionReceipt = useHandleTransactionReceipt();
  const addPopup = useAddPopup();

  const handleStake = useCallback(
    async (amount: string) => {
      const amountBn = parseUnits(amount, bank.depositToken.decimal);
      let approving = await tombFinance.approve(bank.depositToken, bank.address, amountBn);
      if (approving.success === true && approving.allowance.gt(amountBn)) {
        handleTransactionReceipt(
          tombFinance.stake(bank.contract, bank.poolId, amountBn),
          `Stake ${amount} ${bank.depositTokenName} to ${bank.contract}`,
        );
      } else {
        addPopup({ error: { message: 'Insufficient allownace!', stack: 'Insufficient allownace!' } });
      }
    },
    [bank, tombFinance, handleTransactionReceipt],
  );
  return { onStake: handleStake };
};

export default useStake;
