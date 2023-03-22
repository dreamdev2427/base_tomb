import React, { useState } from 'react';
import { Button } from '@material-ui/core';
import { useWallet } from 'use-wallet';
import useModal from '../../hooks/useModal';
import WalletProviderModal from '../WalletProviderModal';
import AccountModal from './AccountModal';
import Davatar from '@davatar/react';
import { useENS } from '../../hooks/useENS';

const Wallet = () => {
  return <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none" /><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" /></svg>
}

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
            {/* <Davatar size={20} address={account} /> */}
            <Wallet />
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
