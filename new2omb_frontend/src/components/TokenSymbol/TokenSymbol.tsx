import React from 'react';

//Graveyard ecosystem logos
import tombLogo from '../../assets/img/ARBOMB.png';
import tShareLogo from '../../assets/img/ARBSHARE.png';
import tombLogoPNG from '../../assets/img/ARBOMB.png';
import tShareLogoPNG from '../../assets/img/ARBSHARE.png';
import tBondLogo from '../../assets/img/ARBOND-01.png';

import tombEthLpLogo from '../../assets/img/tomb_weth_lp.png';
import tshareEthLpLogo from '../../assets/img/tshare_weth_lp.png';

import wethLogo from '../../assets/img/weth-logo.png';
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

import ThreeombLPLogo from '../../assets/img/ARBOMB-WETH.png';
import ThreesharesLPLogo from '../../assets/img/ARBSHARE-WETH.png';

const logosBySymbol: { [title: string]: string } = {
  //Real tokens
  //=====================
  ARBOMB: tombLogo,
  ARBOND: tBondLogo,
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
  'ARBOMB-WETH LP': ThreeombLPLogo,
  'ARBSHARE-WETH LP': ThreesharesLPLogo,

  wETH: wethLogo,
  'ARBOMB-ETH-LP': tombEthLpLogo,
  'ARBSHARE-ETH-LP': tshareEthLpLogo,
};

type LogoProps = {
  symbol: string;
  size?: number;
};

const TokenSymbol: React.FC<LogoProps> = ({ symbol, size = 64 }) => {
  if (!logosBySymbol[symbol]) {
    return <img src={logosBySymbol['ARBOMB']} alt={`${symbol} Logo`} width={size} height={size} />;
    // throw new Error(`Invalid Token Logo symbol: ${symbol}`);
  }
  return <img src={logosBySymbol[symbol]} alt={`${symbol} Logo`} width={size} height={size} />;
};

export default TokenSymbol;
