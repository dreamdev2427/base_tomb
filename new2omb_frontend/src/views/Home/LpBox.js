import React, { useMemo } from 'react';
import CardIcon from '../../components/CardIcon';
import { Box, Card, CardContent, Grid } from '@material-ui/core';
import TokenSymbol from '../../components/TokenSymbol';
import useLpStats from '../../hooks/useLpStats';

const LpBox = ({ tombLp, tShareLp, pairSymbol }) => {
  const tombEthLpStats = useLpStats(tombLp);
  const tShareEthLpStats = useLpStats(tShareLp);

  const tombLPStats = useMemo(() => (tombEthLpStats ? tombEthLpStats : null), [tombEthLpStats]);
  const tshareLPStats = useMemo(() => (tShareEthLpStats ? tShareEthLpStats : null), [tShareEthLpStats]);

  return (
    <>
      <Grid item xs={12} sm={6}>
        <Card style={{ backgroundColor: 'transparent', boxShadow: 'none', border: '1px solid var(--white)' }}>
          <CardContent align="center">
            <h2>BOMB-{pairSymbol} Camelot LP</h2>
            <Box mt={2}>
              <CardIcon>
                <TokenSymbol symbol={tombLp} />
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
                {tombLPStats?.tokenAmount ? tombLPStats?.tokenAmount : '-.--'} BOMB /{' '}
                {tombLPStats?.ethAmount ? tombLPStats?.ethAmount : '-.--'} {pairSymbol}
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
            <h2>BSHARE-{pairSymbol} Camelot LP</h2>
            <Box mt={2}>
              <CardIcon>
                <TokenSymbol symbol={tShareLp} />
              </CardIcon>
            </Box>
            {/*<Box mt={2}>
                <Button color="primary" onClick={onPresentTshareZap} variant="contained">
                  Zap In
                </Button>
            </Box>*/}
            <Box mt={2}>
              <span style={{ fontSize: '26px' }}>
                {tshareLPStats?.tokenAmount ? tshareLPStats?.tokenAmount : '-.--'} BSHARE /{' '}
                {tshareLPStats?.ethAmount ? tshareLPStats?.ethAmount : '-.--'} {pairSymbol}
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
    </>
  );
};

export default LpBox;
