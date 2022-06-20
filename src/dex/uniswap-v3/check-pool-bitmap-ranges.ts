/*
 * It is just standalone helper script to estimate how wide bitMap range can be.
 * We need it in order to cover all possible state variations
 */
import * as dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import Web3 from 'web3';
import { Interface } from '@ethersproject/abi';
import _ from 'lodash';
import MulticallABI from '../../abi/multi-v2.json';
import UniswapV3PoolABI from '../../abi/uniswap-v3/UniswapV3Pool.abi.json';
import { UNISWAPV3_SUBGRAPH_URL } from './constants';
import { MULTI_V2, Network, ProviderURL } from '../../constants';
import { BI_MAX_INT16, BI_MIN_INT16 } from '../../bigint-constants';

type SubgraphResult = { id: string; totalValueLockedUSD: string };

const network = Network.MAINNET;

const web3Provider = new Web3(ProviderURL[network]);
const multicallContract = new web3Provider.eth.Contract(
  MulticallABI as any,
  MULTI_V2[network],
);

const poolIface = new Interface(UniswapV3PoolABI);

async function getBitmap(
  pool: string,
  blockNumber: number,
  indexes: number[],
): Promise<Record<number, bigint>> {
  const callData = indexes.map(ind => ({
    target: pool,
    callData: poolIface.encodeFunctionData('tickBitmap', [ind]),
  }));

  try {
    // console.log(
    //   `Start fetching bitMaps for ${pool}. Indexes from ${indexes[0]} to ${
    //     indexes.slice(-1)[0]
    //   }`,
    // );
    // const start = Date.now();
    const result = await multicallContract.methods
      .aggregate(callData)
      .call({}, blockNumber);

    // console.log(
    //   `Done fetching bitMaps for ${pool}. Indexes from ${indexes[0]} to ${
    //     indexes.slice(-1)[0]
    //   } took ${Math.floor((Date.now() - start) / 1000)} sec.`,
    // );

    const decoded = result.returnData.map((d: string): bigint =>
      BigInt(poolIface.decodeFunctionResult('tickBitmap', d)[0]),
    ) as bigint[];

    return decoded.reduce<Record<number, bigint>>((acc, curr, i) => {
      if (curr !== 0n) {
        acc[indexes[i]] = curr;
      }
      return acc;
    }, {});
  } catch (e) {
    console.log(
      `Can not fetch bitMaps for ${pool}. Indexes from ${indexes[0]} to ${
        indexes.slice(-1)[0]
      }. Pool state is not full`,
      e,
    );
    return [];
  }
}

async function getBitmaps(
  pool: string,
  blockNumber: number,
  start: number,
  end: number,
  chunks: number,
): Promise<Record<number, bigint>> {
  const total = Math.abs(start) + end + 1;
  const indexes = _.range(start, end + 1);

  const chunked = _.chunk(indexes, Math.ceil(total / chunks));

  const bitMapArrays = await Promise.all(
    chunked.map(async chunk => getBitmap(pool, blockNumber, chunk)),
  );

  // if (bitMapArrays.some(bitMapArray => Object.keys(bitMapArray).length === 0)) {
  //   return {};
  // }

  const bitMapsReduced = bitMapArrays.reduce<Record<number, bigint>>(
    (acc, curr) => ({ ...acc, ...curr }),
    {},
  );

  return bitMapsReduced;
}

async function getPools(): Promise<SubgraphResult[]> {
  const query = `
    {
      pools(first: 1000, orderBy: totalValueLockedUSD, orderDirection: desc) {
        id
        totalValueLockedUSD
        }
    }
  `;
  try {
    const res = await axios.post<{ data: { pools: SubgraphResult[] } }>(
      UNISWAPV3_SUBGRAPH_URL,
      { query },
    );
    return res.data.data.pools;
  } catch (e) {
    console.log(e);
    return [];
  }
}

(async function main() {
  const blockNumber = await web3Provider.eth.getBlockNumber();
  const pools = await getPools();
  const lowerTickBitmap = Number(BI_MIN_INT16);
  const upperTickBitmap = Number(BI_MAX_INT16);
  const chunks = 20;
  const poolsNumToProcess = 1;
  const poolStartToProcess = 23;

  // Calculated from 18 first pools
  let globalMin = {
    index: -3466,
    value: 16777216n,
    pool: '0x5777d92f208679db4b9778590fa3cab3ac9e2168',
  };

  let globalMax = {
    index: 3465,
    value:
      6901746346790563787434755862277025452451108972170386555162524223799296n,
    pool: '0x5777d92f208679db4b9778590fa3cab3ac9e2168',
  };

  const indexesCounter: Record<number, number> = JSON.parse(
    // Last result for 18
    `{"0":8,"1":2,"2":4,"3":5,"4":5,"5":6,"6":2,"7":2,"8":3,"9":3,"10":2,"11":3,"12":1,"13":2,"14":2,"15":3,"16":2,"17":3,"18":2,"19":3,"20":2,"21":2,"22":1,"23":2,"24":1,"25":2,"26":1,"28":2,"31":1,"37":1,"38":1,"39":1,"42":1,"44":2,"53":2,"57":6,"62":1,"67":1,"68":1,"69":1,"70":1,"71":1,"72":2,"73":1,"74":1,"75":2,"76":1,"77":1,"78":2,"79":1,"80":1,"81":1,"82":1,"83":1,"84":1,"85":1,"86":1,"87":1,"89":2,"90":1,"91":1,"92":1,"93":2,"94":1,"96":1,"97":1,"98":1,"99":1,"100":1,"101":1,"102":1,"103":1,"104":1,"105":2,"106":1,"107":2,"110":1,"113":1,"114":1,"116":1,"123":1,"124":1,"125":2,"134":1,"136":1,"137":1,"138":1,"139":1,"140":1,"143":2,"152":1,"161":1,"177":1,"296":1,"346":6,"1076":1,"1077":1,"3465":1,"-3466":1,"-1080":1,"-1079":1,"-347":6,"-120":1,"-119":1,"-117":2,"-110":2,"-109":2,"-108":4,"-106":2,"-97":1,"-96":1,"-78":2,"-1":6,"-58":6,"-20":2,"-36":2,"-18":3,"-107":1,"-2":3,"-6":3,"-27":1,"-26":1,"-24":1,"-23":1,"-22":1,"-21":1,"-17":1,"-16":1,"-15":2,"-14":1,"-13":2,"-12":2,"-11":1,"-10":3,"-9":2,"-8":3,"-5":3,"-3":3,"-7":1,"-4":1,"-162":1,"-153":1,"-144":1,"-135":1,"-126":1,"-104":1,"-100":1,"-99":1,"-90":1,"-86":1,"-85":1,"-83":1,"-82":1,"-81":1,"-80":1,"-79":1,"-77":1,"-76":1,"-75":1,"-74":1,"-73":1,"-72":1,"-71":1,"-70":1,"-68":1,"-67":1,"-66":1,"-63":1,"-61":1,"-54":1,"-45":1}`,
  );

  const chunkedPools = _.chunk(pools, poolsNumToProcess);

  for (const [index, chunkedPool] of chunkedPools
    .slice(poolStartToProcess)
    .entries()) {
    console.log(
      `\nStart processing batch #${poolStartToProcess + index} pools...`,
    );
    const start = Date.now();
    await Promise.all(
      chunkedPool.map(async pool => {
        const bitMaps = await getBitmaps(
          pool.id,
          blockNumber,
          lowerTickBitmap,
          upperTickBitmap,
          chunks,
        );

        let newGlobalMinPosition = {
          index: globalMin.index,
          value: globalMin.value,
        };
        let newGlobalMaxPosition = {
          index: globalMax.index,
          value: globalMax.value,
        };

        Object.keys(bitMaps).map(v => {
          const parsed = Number(v);
          indexesCounter[parsed] =
            indexesCounter[parsed] === undefined
              ? 1
              : indexesCounter[parsed] + 1;

          if (parsed < newGlobalMinPosition.index) {
            newGlobalMinPosition.index = parsed;
            newGlobalMinPosition.value = bitMaps[parsed];
          }
          if (parsed > newGlobalMaxPosition.index) {
            newGlobalMaxPosition.index = parsed;
            newGlobalMaxPosition.value = bitMaps[parsed];
          }

          return parsed;
        });

        if (newGlobalMinPosition.index !== globalMin.index) {
          console.log(
            `Found new globalMin=${newGlobalMinPosition.index} in pool ${pool.id} and value=${newGlobalMinPosition.value}`,
          );
          globalMin.index = newGlobalMinPosition.index;
          globalMin.value = newGlobalMinPosition.value;
          globalMin.pool = pool.id;
        }
        if (newGlobalMaxPosition.index !== globalMax.index) {
          console.log(
            `Found new globalMax=${newGlobalMaxPosition.index} in pool ${pool.id} and value=${newGlobalMaxPosition.value}`,
          );
          globalMax.index = newGlobalMaxPosition.index;
          globalMax.value = newGlobalMaxPosition.value;
          globalMax.pool = pool.id;
        }
      }),
    );

    console.log(
      `Done processing batch #${
        poolStartToProcess + index
      } pools Took ${Math.floor(
        (Date.now() - start) / 1000,
      )} sec. Current indexesCounter state is:`,
    );
    console.log(JSON.stringify(indexesCounter));
    console.log('\nCurrent globalMin:');
    console.log(
      JSON.stringify(
        globalMin,
        (key, value) => (typeof value === 'bigint' ? value.toString() : value), // return everything else unchanged
      ),
    );
    console.log('\nCurrent globalMax:');
    console.log(
      JSON.stringify(
        globalMax,
        (key, value) => (typeof value === 'bigint' ? value.toString() : value), // return everything else unchanged
      ),
    );
  }
})();
