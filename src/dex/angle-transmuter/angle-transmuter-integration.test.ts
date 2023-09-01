/* eslint-disable no-console */
import dotenv from 'dotenv';
dotenv.config();

import { Interface, Result } from '@ethersproject/abi';
import { DummyDexHelper } from '../../dex-helper/index';
import { Network, SwapSide } from '../../constants';
import { BI_POWS } from '../../bigint-constants';
import { AngleTransmuter } from './angle-transmuter';
import {
  checkPoolPrices,
  checkPoolsLiquidity,
  checkConstantPoolPrices,
} from '../../../tests/utils';
import { Tokens } from '../../../tests/constants-e2e';
import { AngleTransmuterEventPool } from './angle-transmuter-pool';
import { Address } from '../../types';

/*
  README
  ======

  This test script adds tests for AngleTransmuter general integration
  with the DEX interface. The test cases below are example tests.
  It is recommended to add tests which cover AngleTransmuter specific
  logic.

  You can run this individual test script by running:
  `npx jest src/dex/angle-transmuter/angle-transmuter-integration.test.ts`

  (This comment should be removed from the final implementation)
*/

function getReaderCalldata(
  exchangeAddress: string,
  readerIface: Interface,
  amounts: bigint[],
  funcName: string,
  // TODO: Put here additional arguments you need
  tokenIn: Address,
  tokenOut: Address,
) {
  return amounts.map(amount => ({
    target: exchangeAddress,
    callData: readerIface.encodeFunctionData(funcName, [
      // TODO: Put here additional arguments to encode them
      amount,
      tokenIn,
      tokenOut,
    ]),
  }));
}

function decodeReaderResult(
  results: Result,
  readerIface: Interface,
  funcName: string,
) {
  // TODO: Adapt this function for your needs
  return results.map(result => {
    const parsed = readerIface.decodeFunctionResult(funcName, result);
    return BigInt(parsed[0]._hex);
  });
}

async function checkOnChainPricing(
  angleTransmuter: AngleTransmuter,
  funcName: string,
  blockNumber: number,
  prices: bigint[],
  amounts: bigint[],
  tokenIn: Address,
  tokenOut: Address,
) {
  const exchangeAddress = '0x00253582b2a3FE112feEC532221d9708c64cEFAb'; // TODO: Put here the real exchange address

  // TODO: Replace dummy interface with the real one
  // Normally you can get it from angleTransmuter.Iface or from eventPool.
  // It depends on your implementation
  const readerIface = AngleTransmuterEventPool.angleTransmuterIface;

  const readerCallData = getReaderCalldata(
    exchangeAddress,
    readerIface,
    amounts.slice(1),
    funcName,
    tokenIn,
    tokenOut,
  );
  const readerResult = (
    await angleTransmuter.dexHelper.multiContract.methods
      .aggregate(readerCallData)
      .call({}, blockNumber)
  ).returnData;

  const expectedPrices = [0n].concat(
    decodeReaderResult(readerResult, readerIface, funcName),
  );

  expect(prices).toEqual(expectedPrices);
}

async function testPricingOnNetwork(
  angleTransmuter: AngleTransmuter,
  network: Network,
  dexKey: string,
  blockNumber: number,
  srcTokenSymbol: string,
  destTokenSymbol: string,
  side: SwapSide,
  amounts: bigint[],
  funcNameToCheck: string,
) {
  const networkTokens = Tokens[network];

  const pools = await angleTransmuter.getPoolIdentifiers(
    networkTokens[srcTokenSymbol],
    networkTokens[destTokenSymbol],
    side,
    blockNumber,
  );
  console.log(
    `${srcTokenSymbol} <> ${destTokenSymbol} Pool Identifiers: `,
    pools,
  );

  expect(pools.length).toBeGreaterThan(0);

  const poolPrices = await angleTransmuter.getPricesVolume(
    networkTokens[srcTokenSymbol],
    networkTokens[destTokenSymbol],
    amounts,
    side,
    blockNumber,
    pools,
  );
  console.log(
    `${srcTokenSymbol} <> ${destTokenSymbol} Pool Prices: `,
    poolPrices,
  );

  expect(poolPrices).not.toBeNull();
  if (angleTransmuter.hasConstantPriceLargeAmounts) {
    checkConstantPoolPrices(poolPrices!, amounts, dexKey);
  } else {
    checkPoolPrices(poolPrices!, amounts, side, dexKey);
  }

  // Check if onchain pricing equals to calculated ones
  await checkOnChainPricing(
    angleTransmuter,
    funcNameToCheck,
    blockNumber,
    poolPrices![0].prices,
    amounts,
    networkTokens[srcTokenSymbol].address,
    networkTokens[destTokenSymbol].address,
  );
}

describe('AngleTransmuter', function () {
  const dexKey = 'AngleTransmuter';
  let blockNumber: number;
  let angleTransmuter: AngleTransmuter;

  describe('Mainnet', () => {
    const network = Network.MAINNET;
    const dexHelper = new DummyDexHelper(network);

    const tokens = Tokens[network];

    // TODO: Put here token Symbol to check against
    // Don't forget to update relevant tokens in constant-e2e.ts
    const srcTokenSymbol = 'EUROC';
    const destTokenSymbol = 'agEUR';

    const amountsForSell = [
      0n,
      1n * BI_POWS[tokens[srcTokenSymbol].decimals],
      2n * BI_POWS[tokens[srcTokenSymbol].decimals],
      3n * BI_POWS[tokens[srcTokenSymbol].decimals],
      4n * BI_POWS[tokens[srcTokenSymbol].decimals],
      5n * BI_POWS[tokens[srcTokenSymbol].decimals],
      6n * BI_POWS[tokens[srcTokenSymbol].decimals],
      7n * BI_POWS[tokens[srcTokenSymbol].decimals],
      8n * BI_POWS[tokens[srcTokenSymbol].decimals],
      9n * BI_POWS[tokens[srcTokenSymbol].decimals],
      10n * BI_POWS[tokens[srcTokenSymbol].decimals],
    ];

    const amountsForBuy = [
      0n,
      1n * BI_POWS[tokens[destTokenSymbol].decimals],
      2n * BI_POWS[tokens[destTokenSymbol].decimals],
      3n * BI_POWS[tokens[destTokenSymbol].decimals],
      4n * BI_POWS[tokens[destTokenSymbol].decimals],
      5n * BI_POWS[tokens[destTokenSymbol].decimals],
      6n * BI_POWS[tokens[destTokenSymbol].decimals],
      7n * BI_POWS[tokens[destTokenSymbol].decimals],
      8n * BI_POWS[tokens[destTokenSymbol].decimals],
      9n * BI_POWS[tokens[destTokenSymbol].decimals],
      10n * BI_POWS[tokens[destTokenSymbol].decimals],
    ];

    beforeAll(async () => {
      blockNumber = await dexHelper.web3Provider.eth.getBlockNumber();
      angleTransmuter = new AngleTransmuter(network, dexKey, dexHelper);
      if (angleTransmuter.initializePricing) {
        await angleTransmuter.initializePricing(blockNumber);
      }
    });

    it('getPoolIdentifiers and getPricesVolume SELL', async function () {
      await testPricingOnNetwork(
        angleTransmuter,
        network,
        dexKey,
        blockNumber,
        srcTokenSymbol,
        destTokenSymbol,
        SwapSide.SELL,
        amountsForSell,
        'quoteIn', // TODO: Put here proper function name to check pricing
      );
    });

    // it('getPoolIdentifiers and getPricesVolume BUY', async function () {
    //   await testPricingOnNetwork(
    //     angleTransmuter,
    //     network,
    //     dexKey,
    //     blockNumber,
    //     srcTokenSymbol,
    //     destTokenSymbol,
    //     SwapSide.BUY,
    //     amountsForBuy,
    //     'quoteOut', // TODO: Put here proper function name to check pricing
    //   );
    // });

    // it('getTopPoolsForToken', async function () {
    //   // We have to check without calling initializePricing, because
    //   // pool-tracker is not calling that function
    //   const newAngleTransmuter = new AngleTransmuter(
    //     network,
    //     dexKey,
    //     dexHelper,
    //   );
    //   if (newAngleTransmuter.updatePoolState) {
    //     await newAngleTransmuter.updatePoolState();
    //   }
    //   const poolLiquidity = await newAngleTransmuter.getTopPoolsForToken(
    //     tokens[srcTokenSymbol].address,
    //     10,
    //   );
    //   console.log(`${srcTokenSymbol} Top Pools:`, poolLiquidity);

    //   if (!newAngleTransmuter.hasConstantPriceLargeAmounts) {
    //     checkPoolsLiquidity(
    //       poolLiquidity,
    //       Tokens[network][srcTokenSymbol].address,
    //       dexKey,
    //     );
    //   }
    // });
  });
});
