import React from 'react';

//Graveyard ecosystem logos
import tombLogo from '../../assets/img/ARBTOMB.png';
import tShareLogo from '../../assets/img/ARBSHARES.png';
import tombLogoPNG from '../../assets/img/ARBTOMB.png';
import tShareLogoPNG from '../../assets/img/ARBSHARES.png';
import tBondLogo from '../../assets/img/ARBBOND-01.png';

import tombEthLpLogo from '../../assets/img/tomb_eth_lp.png';
import tshareEthLpLogo from '../../assets/img/tshare_eth_lp.png';

import wethLogo from '../../assets/img/fantom-eth-logo.png';
import booLogo from '../../assets/img/spooky.png';
import belugaLogo from '../../assets/img/BELUGA.png';
import twoshareLogo from '../../assets/img/t_2SHARE-01.png';
import twoombLogo from '../../assets/img/t_2OMB-01.png';
import zooLogo from '../../assets/img/zoo_logo.svg';
import shibaLogo from '../../assets/img/shiba_logo.svg';
import bifiLogo from '../../assets/img/COW.svg';
import mimLogo from '../../assets/img/mimlogopng.png';
import bloomLogo from '../../assets/img/BLOOM.jpg';
import TwoombLPLogo from '../../assets/img/2OMB-WETH.png';
import TwosharesLPLogo from '../../assets/img/2SHARES-WETH.png';
import TwoombTwosharesLPLogo from '../../assets/img/2OMB-2SHARES.png';

import UsdcLogo from '../../assets/img/USDC.png';

import ThreeombLPLogo from '../../assets/img/ARBTOMB-WETH.png';
import ThreesharesLPLogo from '../../assets/img/ARBSHARES-WETH.png';

const logosBySymbol: { [title: string]: string } = {
  //Real tokens
  //=====================
  TOMB: tombLogo,
  TOMBPNG: tombLogoPNG,
  TSHAREPNG: tShareLogoPNG,
  TSHARE: tShareLogo,
  TBOND: tBondLogo,
  WETH: wethLogo,
  BOO: booLogo,
  SHIBA: shibaLogo,
  ZOO: zooLogo,
  BELUGA: belugaLogo,
  BIFI: bifiLogo,
  MIM: mimLogo,
  USDC: UsdcLogo,
  BLOOM: bloomLogo,
  '2OMB-WETH LP': TwoombLPLogo,
  '2SHARES-WETH LP': TwosharesLPLogo,
  '2OMB-2SHARES LP': TwoombTwosharesLPLogo,

  'ARBTOMB-WETH LP': ThreeombLPLogo,
  'RRBSHARE-WETH LP': ThreesharesLPLogo,

  wETH: wethLogo,
  '2OMB': twoombLogo,
  '2SHARES': twoshareLogo,
  'RRBOMB-ETH-LP': tombEthLpLogo,
  'RRBSHARE-ETH-LP': tshareEthLpLogo,
};

type LogoProps = {
  symbol: string;
  size?: number;
};

const TokenSymbol: React.FC<LogoProps> = ({ symbol, size = 64 }) => {
  if (!logosBySymbol[symbol]) {
    return <img src={logosBySymbol['TOMB']} alt={`${symbol} Logo`} width={size} height={size} />;
    // throw new Error(`Invalid Token Logo symbol: ${symbol}`);
  }
  return <img src={logosBySymbol[symbol]} alt={`${symbol} Logo`} width={size} height={size} />;
};

export default TokenSymbol;
