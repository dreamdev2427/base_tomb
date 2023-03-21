import React, { useState } from 'react';
import { Button } from '@material-ui/core';
import { useWallet } from 'use-wallet';
import useModal from '../../hooks/useModal';
import WalletProviderModal from '../WalletProviderModal';
import AccountModal from './AccountModal';
import Davatar from '@davatar/react';
import { useENS } from '../../hooks/useENS';

function shorten(str: string) {
  if (str.length < 10) return str;
  return `${str.slice(0, 6)}...${str.slice(str.length - 4)}`;
}

interface AccountButtonProps {
  text?: string;
  onOpen?: () => void;
}

const AccountButton: React.FC<AccountButtonProps> = ({ text, onOpen }) => {
  const { account } = useWallet();
  const [onPresentAccountModal] = useModal(<AccountModal />);
  const { ensName } = useENS(account);

  const [isWalletProviderOpen, setWalletProviderOpen] = useState(false);

  const handleWalletProviderOpen = () => {
    setWalletProviderOpen(true);
    onOpen && onOpen();
  };

  const handleWalletProviderClose = () => {
    setWalletProviderOpen(false);
  };

  const handleAccountModalOpen = () => {
    onPresentAccountModal();
    onOpen && onOpen();
  };

  const buttonText = text ? text : 'Unlock';

  return (
    <div>
      {!account ? (
        <Button onClick={handleWalletProviderOpen} color="primary" variant="contained">
          {buttonText}
        </Button>
      ) : (
        <Button variant="contained" onClick={handleAccountModalOpen}>
          <div className="account">
            <Davatar size={20} address={account} />
            <span>{ensName || shorten(account)}</span>
          </div>
        </Button>
      )}

      <WalletProviderModal open={isWalletProviderOpen} handleClose={handleWalletProviderClose} />
      {/* <AccountModal open={isAccountModalOpen} handleClose={handleAccountModalClose}/> */}
    </div>
  );
};

export default AccountButton;
