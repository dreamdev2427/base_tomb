import React, { useMemo } from 'react';
import Page from '../../components/Page';
import HomeImage from '../../assets/img/home.png';
import CashHomeImage from '../../assets/img/ARBOMB.svg';
import CashImage from '../../assets/img/title.png';
import CashImage2 from '../../assets/img/title2.png';
import Image from 'material-ui-image';
import styled from 'styled-components';
import { Alert } from '@material-ui/lab';
import { createGlobalStyle } from 'styled-components';
import CountUp from 'react-countup';
import CardIcon from '../../components/CardIcon';
import TokenSymbol from '../../components/TokenSymbol';
import useTombStats from '../../hooks/useTombStats';
import useLpStats from '../../hooks/useLpStats';
import useModal from '../../hooks/useModal';
import useZap from '../../hooks/useZap';
import useBondStats from '../../hooks/useBondStats';
import usetShareStats from '../../hooks/usetShareStats';
import useTotalValueLocked from '../../hooks/useTotalValueLocked';
import useFantomPrice from '../../hooks/useFantomPrice';
import { tomb as tombTesting, tShare as tShareTesting } from '../../tomb-finance/deployments/deployments.testing.json';
import { tomb as tombProd, tShare as tShareProd } from '../../tomb-finance/deployments/deployments.mainnet.json';

import useTotalTreasuryBalance from '../../hooks/useTotalTreasuryBalance.js';

import { Box, Button, Card, CardContent, Grid, Paper } from '@material-ui/core';
import ZapModal from '../Bank/components/ZapModal';

import { makeStyles } from '@material-ui/core/styles';
import useTombFinance from '../../hooks/useTombFinance';

const BackgroundImage = createGlobalStyle`
  body {
    background-color: var(--black);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='32' viewBox='0 0 16 32'%3E%3Cg fill='%231D1E1F' fill-opacity='0.4'%3E%3Cpath fill-rule='evenodd' d='M0 24h4v2H0v-2zm0 4h6v2H0v-2zm0-8h2v2H0v-2zM0 0h4v2H0V0zm0 4h2v2H0V4zm16 20h-6v2h6v-2zm0 4H8v2h8v-2zm0-8h-4v2h4v-2zm0-20h-6v2h6V0zm0 4h-4v2h4V4zm-2 12h2v2h-2v-2zm0-8h2v2h-2V8zM2 8h10v2H2V8zm0 8h10v2H2v-2zm-2-4h14v2H0v-2zm4-8h6v2H4V4zm0 16h6v2H4v-2zM6 0h2v2H6V0zm0 24h2v2H6v-2z'/%3E%3C/g%3E%3C/svg%3E");
}

`;

const useStyles = makeStyles((theme) => ({
  button: {
    [theme.breakpoints.down('415')]: {
      marginTop: '10px',
    },
  },
}));

const Home = () => {
  const classes = useStyles();
  const TVL = useTotalValueLocked();
  const tombEthLpStats = useLpStats('ARBOMB-ETH-LP');
  const tShareEthLpStats = useLpStats('ARBSHARE-ETH-LP');
  const tombStats = useTombStats();
  const tShareStats = usetShareStats();
  const tBondStats = useBondStats();
  const tombFinance = useTombFinance();
  const { price: ethPrice, marketCap: ethMarketCap, priceChange: ethPriceChange } = useFantomPrice();
  const { balance: rebatesTVL } = useTotalTreasuryBalance();
  const totalTVL = TVL + rebatesTVL;

  let tomb;
  let tShare;
  // if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  //   tomb = tombTesting;
  //   tShare = tShareTesting;
  // } else {
  tomb = tombProd;
  tShare = tShareProd;
  // }

  const buyTombAddress = 'https://app.camelot.exchange/';
  const buyTShareAddress = 'https://app.camelot.exchange/';

  const tombLPStats = useMemo(() => (tombEthLpStats ? tombEthLpStats : null), [tombEthLpStats]);
  const tshareLPStats = useMemo(() => (tShareEthLpStats ? tShareEthLpStats : null), [tShareEthLpStats]);
  const tombPriceInDollars = useMemo(
    () => (tombStats ? Number(tombStats.priceInDollars).toFixed(2) : null),
    [tombStats],
  );
  const tombPriceInETH = useMemo(() => (tombStats ? Number(tombStats.tokenInEth).toFixed(4) : null), [tombStats]);
  const tombCirculatingSupply = useMemo(() => (tombStats ? String(tombStats.circulatingSupply) : null), [tombStats]);
  const tombTotalSupply = useMemo(() => (tombStats ? String(tombStats.totalSupply) : null), [tombStats]);

  const tSharePriceInDollars = useMemo(
    () => (tShareStats ? Number(tShareStats.priceInDollars).toFixed(2) : null),
    [tShareStats],
  );
  const tSharePriceInETH = useMemo(
    () => (tShareStats ? Number(tShareStats.tokenInEth).toFixed(4) : null),
    [tShareStats],
  );
  const tShareCirculatingSupply = useMemo(
    () => (tShareStats ? String(tShareStats.circulatingSupply) : null),
    [tShareStats],
  );
  const tShareTotalSupply = useMemo(() => (tShareStats ? String(tShareStats.totalSupply) : null), [tShareStats]);

  const tBondPriceInDollars = useMemo(
    () => (tBondStats ? Number(tBondStats.priceInDollars).toFixed(2) : null),
    [tBondStats],
  );
  const tBondPriceInETH = useMemo(() => (tBondStats ? Number(tBondStats.tokenInEth).toFixed(4) : null), [tBondStats]);
  const tBondCirculatingSupply = useMemo(
    () => (tBondStats ? String(tBondStats.circulatingSupply) : null),
    [tBondStats],
  );
  const tBondTotalSupply = useMemo(() => (tBondStats ? String(tBondStats.totalSupply) : null), [tBondStats]);

  const tombLpZap = useZap({ depositTokenName: 'ARBOMB-ETH-LP' });
  const tshareLpZap = useZap({ depositTokenName: 'ARBSHARE-ETH-LP' });

  const StyledLink = styled.a`
    font-weight: 700;
    text-decoration: none;
    color: var(--accent-light);
  `;

  const [onPresentTombZap, onDissmissTombZap] = useModal(
    <ZapModal
      decimals={18}
      onConfirm={(zappingToken, tokenName, amount) => {
        if (Number(amount) <= 0 || isNaN(Number(amount))) return;
        tombLpZap.onZap(zappingToken, tokenName, amount);
        onDissmissTombZap();
      }}
      tokenName={'ARBOMB-ETH-LP'}
    />,
  );

  const [onPresentTshareZap, onDissmissTshareZap] = useModal(
    <ZapModal
      decimals={18}
      onConfirm={(zappingToken, tokenName, amount) => {
        if (Number(amount) <= 0 || isNaN(Number(amount))) return;
        tshareLpZap.onZap(zappingToken, tokenName, amount);
        onDissmissTshareZap();
      }}
      tokenName={'ARBSHARE-ETH-LP'}
    />,
  );

  return (
    <Page>
      <BackgroundImage />
      <Grid container spacing={3}>
        {/* Logo */}
        <div className="home-header">
          <img className="ombImg-home-header" src={CashHomeImage} alt="" />
          <img className="ombImg-header" src={CashImage} alt="" />
          <img className="ombImg-header2" src={CashImage2} alt="" />
        </div>
        {/* <Grid container item xs={12} sm={6} justify="center">
          <Image className="ombImg-home" color="none" style={{ width: '100%', height: '140px', paddingTop: '0px' }} src={CashHomeImage} />
        </Grid>
        <Grid container item xs={12} sm={6} justify="center">
          <Image className="ombImg-home" color="none" style={{ width: '100%', height: '140px', paddingTop: '0px' }} src={CashImage} />
        </Grid> */}
        {/* Explanation text */}
        {/*<Grid item xs={12} sm={6}>
          <Paper style={{ backgroundColor: 'transparent', boxShadow: 'none', border: '1px solid var(--white)' }}>
            <Box p={4}>
              <h2>Welcome to ARBOMB Finance!</h2>
              <p>An algorithmic stablecoin on the Arbitrum blockchain, pegged to the price of 1 ETH</p>
               <p>ARBOMB utilizes multiple bonding mechanisms at the <StyledLink href="/">3DAO</StyledLink> as well as seigniorage.</p>
              <p>Built on top of <StyledLink target="_blank" href="https://2omb.finance">2omb.finance</StyledLink>.</p> 
              <p>
                Stake your ARBOMB-WETH LP in the <StyledLink href="/farms">Farms</StyledLink> to earn ARBSHARE rewards.
                Then stake your earned ARBSHARE in the <StyledLink href="/">Room</StyledLink> to maximize profits!
              </p>
            </Box> 
          </Paper>
        </Grid> */}
        {/* <Grid container justify="center">
          <Box mt={3} style={{ width: '1000px' }}>
            <Alert variant="filled" severity="warning">
              Do your own research before investing. Investing is risky and may result in monetary loss. ARBOMB is beta software and may contain bugs. By using ARBOMB, you agree that the 2omb and ARBOMB team is not responsible for any financial losses from investing in 2omb or ARBOMB.
            </Alert>
          </Box>
        </Grid> */}

        {/* <Grid container spacing={3}>
    <Grid item  xs={12} sm={12} justify="center"  style={{ margin: '12px', display: 'flex' }}>
            <Alert severity="warning" style={{ backgroundColor: "transparent", border: "1px solid var(--white)" }}>
              <b>
      Please visit our <StyledLink target="_blank" href="https://docs.tomb.finance">documentation</StyledLink> before purchasing TOMB or TSHARE!</b>
            </Alert>
        </Grid>
        </Grid> */}

        {/* TVL */}
        <Grid item xs={12} sm={4}>
          <Card style={{ backgroundColor: 'transparent', boxShadow: 'none', border: '1px solid var(--white)' }}>
            <CardContent align="center">
              <h2>Total Value Locked</h2>
              <CountUp style={{ fontSize: '25px' }} end={totalTVL} separator="," prefix="$" />
            </CardContent>
          </Card>
        </Grid>

        {/* Wallet */}
        <Grid item xs={12} sm={8}>
          <Card
            style={{
              height: '100%',
              backgroundColor: 'transparent',
              boxShadow: 'none',
              border: '1px solid var(--white)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <CardContent align="center">
              {/* <h2 style={{ marginBottom: '20px' }}>Wallet Balance</h2> */}
              <Button color="primary" href="/farms" variant="contained" style={{ marginRight: '10px' }}>
                Farms
              </Button>
              <Button color="primary" href="/boardroom" variant="contained" style={{ marginRight: '25px' }}>
                Stake
              </Button>
              {/* <Button color="primary" href="/masonry" variant="contained" style={{ marginRight: '10px' }}>
                Stake Now
              </Button> */}
              {/* <Button href="/cemetery" variant="contained" style={{ marginRight: '10px' }}>
                Farm Now
              </Button> */}
              <Button
                target="_blank"
                href="https://app.camelot.exchange/swap?outputCurrency=0x14def7584a6c52f470ca4f4b9671056b22f4ffde"
                variant="contained"
                style={{ marginRight: '10px' }}
                className={classes.button}
              >
                Buy ARBOMB
              </Button>
              <Button
                variant="contained"
                target="_blank"
                href="https://app.camelot.exchange/swap?outputCurrency=0x6437adac543583c4b31bf0323a0870430f5cc2e7"
                style={{ marginRight: '10px' }}
                className={classes.button}
              >
                Buy ARBSHARE
              </Button>
              <Button
                variant="contained"
                target="_blank"
                href="https://dexscreener.com/arbitrum/0x83a52eff2e9d112e9b022399a9fd22a9db7d33ae"
                style={{ marginRight: '10px' }}
                className={classes.button}
              >
                ARBOMB Chart
              </Button>
              <Button
                variant="contained"
                target="_blank"
                href="https://dexscreener.com/arbitrum/0xd352dac95a91afefb112dbbb3463ccfa5ec15b65"
                className={classes.button}
              >
                ARBSHARE Chart
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* TOMB */}
        <Grid item xs={12} sm={3}>
          <Card style={{ backgroundColor: 'transparent', boxShadow: 'none', border: '1px solid var(--white)' }}>
            <CardContent align="center" style={{ position: 'relative' }}>
              <h2>ETH</h2>
              <Box mt={2} style={{ backgroundColor: 'transparent !important' }}>
                <CardIcon style={{ backgroundColor: 'transparent !important' }}>
                  <TokenSymbol symbol="wETH" style={{ backgroundColor: 'transparent !important' }} />
                </CardIcon>
              </Box>
              Current Price
              <Box>
                <span style={{ fontSize: '30px' }}>${ethPrice ? Number(ethPrice).toLocaleString() : '-.----'} USD</span>
              </Box>
              <span style={{ fontSize: '14px' }}>
                Market Cap: ${Number(ethMarketCap).toLocaleString()} <br />
                Price Change 24h: {ethPriceChange.toFixed(2)}% <br />
                <br />
                <br />
              </span>
            </CardContent>
          </Card>
        </Grid>

        {/* TOMB */}
        <Grid item xs={12} sm={3}>
          <Card style={{ backgroundColor: 'transparent', boxShadow: 'none', border: '1px solid var(--white)' }}>
            <CardContent align="center" style={{ position: 'relative' }}>
              <h2>ARBOMB</h2>
              {/* <Button
                onClick={() => {
                  tombFinance.watchAssetInMetamask('TOMB');
                }}
                color="secondary"
                variant="outlined"
                style={{ position: 'absolute', top: '10px', right: '10px', borderColor: "var(--accent-light)" }}
              >
                +&nbsp;
                <img alt="metamask fox" style={{ width: '20px' }} src={MetamaskFox} />
              </Button> */}
              <Box mt={2} style={{ backgroundColor: 'transparent !important' }}>
                <CardIcon style={{ backgroundColor: 'transparent !important' }}>
                  <TokenSymbol symbol="TOMB" style={{ backgroundColor: 'transparent !important' }} />
                </CardIcon>
              </Box>
              Current Price
              <Box>
                <span style={{ fontSize: '30px' }}>{tombPriceInETH ? tombPriceInETH : '-.----'} ETH</span>
              </Box>
              <Box>
                <span style={{ fontSize: '18px', alignContent: 'flex-start' }}>
                  ${tombPriceInDollars ? tombPriceInDollars : '-.--'}
                </span>
              </Box>
              <span style={{ fontSize: '14px' }}>
                Market Cap: ${(tombCirculatingSupply * tombPriceInDollars).toFixed(2)} <br />
                Circulating Supply: {tombCirculatingSupply} <br />
                Total Supply: {tombTotalSupply}
              </span>
            </CardContent>
          </Card>
        </Grid>

        {/* TSHARE */}
        <Grid item xs={12} sm={3}>
          <Card style={{ backgroundColor: 'transparent', boxShadow: 'none', border: '1px solid var(--white)' }}>
            <CardContent align="center" style={{ position: 'relative' }}>
              <h2>ARBSHARE</h2>
              {/* <Button
                onClick={() => {
                  tombFinance.watchAssetInMetamask('TSHARE');
                }}
                color="secondary"
                variant="outlined"
                style={{ position: 'absolute', top: '10px', right: '10px', borderColor: "var(--accent-light)" }}
              >
                +&nbsp;
                <img alt="metamask fox" style={{ width: '20px' }} src={MetamaskFox} />
              </Button> */}
              <Box mt={2}>
                <CardIcon>
                  <TokenSymbol symbol="TSHARE" />
                </CardIcon>
              </Box>
              Current Price
              <Box>
                <span style={{ fontSize: '30px' }}>{tSharePriceInETH ? tSharePriceInETH : '-.----'} ETH</span>
              </Box>
              <Box>
                <span style={{ fontSize: '18px' }}>${tSharePriceInDollars ? tSharePriceInDollars : '-.--'}</span>
              </Box>
              <span style={{ fontSize: '14px' }}>
                Market Cap: ${(tShareCirculatingSupply * tSharePriceInDollars).toFixed(2)} <br />
                Circulating Supply: {tShareCirculatingSupply} <br />
                Total Supply: {tShareTotalSupply}
              </span>
            </CardContent>
          </Card>
        </Grid>

        {/* TBOND https://openapi.debank.com/v1/user/chain_balance?id=0x8f555E00ea0FAc871b3Aa70C015915dB094E7f88&chain_id=eth */}
        {/* https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=fantom  */}
        <Grid item xs={12} sm={3}>
          <Card style={{ backgroundColor: 'transparent', boxShadow: 'none', border: '1px solid var(--white)' }}>
            <CardContent align="center" style={{ position: 'relative' }}>
              <h2>ARBOND</h2>
              {/* <Button
                onClick={() => {
                  tombFinance.watchAssetInMetamask('TBOND');
                }}
                color="secondary"
                variant="outlined"
                style={{ position: 'absolute', top: '10px', right: '10px', borderColor: "var(--accent-light)" }}
              >
                +&nbsp;
                <img alt="metamask fox" style={{ width: '20px' }} src={MetamaskFox} />
              </Button> */}
              <Box mt={2}>
                <CardIcon>
                  <TokenSymbol symbol="TBOND" />
                </CardIcon>
              </Box>
              Current Price
              <Box>
                <span style={{ fontSize: '30px' }}>{tBondPriceInETH ? tBondPriceInETH : '-.----'} ETH</span>
              </Box>
              <Box>
                <span style={{ fontSize: '18px' }}>${tBondPriceInDollars ? tBondPriceInDollars : '-.--'}</span>
              </Box>
              <span style={{ fontSize: '14px' }}>
                Market Cap: ${(tBondCirculatingSupply * tBondPriceInDollars).toFixed(2)} <br />
                Circulating Supply: {tBondCirculatingSupply} <br />
                Total Supply: {tBondTotalSupply}
              </span>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card style={{ backgroundColor: 'transparent', boxShadow: 'none', border: '1px solid var(--white)' }}>
            <CardContent align="center">
              <h2>ARBOMB-WETH Camelot LP</h2>
              <Box mt={2}>
                <CardIcon>
                  <TokenSymbol symbol="ARBOMB-ETH-LP" />
                </CardIcon>
              </Box>
              {/*
              <Box mt={2}>
                <Button color="primary" disabled={true} onClick={onPresentTombZap} variant="contained">
                  Zap In
                </Button>
              </Box>*/}
              <Box mt={2}>
                <span style={{ fontSize: '26px' }}>
                  {tombLPStats?.tokenAmount ? tombLPStats?.tokenAmount : '-.--'} ARBOMB /{' '}
                  {tombLPStats?.ethAmount ? tombLPStats?.ethAmount : '-.--'} ETH
                </span>
              </Box>
              <Box style={{ fontSize: '18px' }}>${tombLPStats?.priceOfOne ? tombLPStats.priceOfOne : '-.--'}</Box>
              <span style={{ fontSize: '14px' }}>
                Liquidity: ${tombLPStats?.totalLiquidity ? tombLPStats.totalLiquidity : '-.--'} <br />
                Total supply: {tombLPStats?.totalSupply ? tombLPStats.totalSupply : '-.--'}
              </span>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card style={{ backgroundColor: 'transparent', boxShadow: 'none', border: '1px solid var(--white)' }}>
            <CardContent align="center">
              <h2>ARBSHARE-WETH Camelot LP</h2>
              <Box mt={2}>
                <CardIcon>
                  <TokenSymbol symbol="ARBSHARE-ETH-LP" />
                </CardIcon>
              </Box>
              {/*<Box mt={2}>
                <Button color="primary" onClick={onPresentTshareZap} variant="contained">
                  Zap In
                </Button>
            </Box>*/}
              <Box mt={2}>
                <span style={{ fontSize: '26px' }}>
                  {tshareLPStats?.tokenAmount ? tshareLPStats?.tokenAmount : '-.--'} ARBSHARE /{' '}
                  {tshareLPStats?.ethAmount ? tshareLPStats?.ethAmount : '-.--'} ETH
                </span>
              </Box>
              <Box style={{ fontSize: '18px' }}>${tshareLPStats?.priceOfOne ? tshareLPStats.priceOfOne : '-.--'}</Box>
              <span style={{ fontSize: '14px' }}>
                Liquidity: ${tshareLPStats?.totalLiquidity ? tshareLPStats.totalLiquidity : '-.--'}
                <br />
                Total supply: {tshareLPStats?.totalSupply ? tshareLPStats.totalSupply : '-.--'}
              </span>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Page>
  );
};

export default Home;
