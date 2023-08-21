import { BigNumber } from 'ethers';
import { Address, Token } from '../../types';

export type PoolState = {
  // TODO: poolState is the state of event
  // subscriber. This should be the minimum
  // set of parameters required to compute
  // pool prices. Complete me!
  stablecoin: Token;
  collaterals: {
    [token: string]: {
      fees: Fees;
      stablecoinsIssued: number;
      oracles: {
        collateralMintPrice: Number; // Mint oracle collat --> EUR
        collateralBurnPrice: Number; // Burn oracle EUR --> collat
        config: Oracle;
      };
    };
  };
  xRedemptionCurve: BigInt[];
  yRedemptionCurve: BigInt[];
  totalStablecoinIssued: number;
};

export type ChainlinkState = {
  // TODO: ChainlinkState is the state of event
  // subscriber. This should be the minimum
  // set of parameters required to compute
  // oracle prices. Complete me!
  oracle: Address;
  aggregator: Address;
  value: number;
};

export type PythState = {
  // TODO: PythState is the state of event
  // subscriber. This should be the minimum
  // set of parameters required to compute
  // oracle prices. Complete me!
  value: number;
};

export type AngleTransmuterData = {
  // TODO: AngleTransmuterData is the dex data that is
  // returned by the API that can be used for
  // tx building. The data structure should be minimal.
  // Complete me!
  exchange: Address;
};

export type DexParams = {
  // TODO: DexParams is set of parameters the can
  // be used to initiate a DEX fork.
  // Complete me!
  agEUR: Token;
  transmuter: Address;
};

export enum QuoteType {
  MintExactInput,
  MintExactOutput,
  BurnExactInput,
  BurnExactOutput,
}

export enum OracleReadType {
  CHAINLINK_FEEDS,
  EXTERNAL,
  NO_ORACLE,
  STABLE,
  WSTETH,
  CBETH,
  RETH,
  SFRXETH,
  PYTH,
}

export enum OracleQuoteType {
  UNIT,
  TARGET,
}

export type Fees = {
  xFeeMint: number[];
  yFeeMint: number[];
  xFeeBurn: number[];
  yFeeBurn: number[];
};

export type Pyth = {
  pyth: Address;
  feedIds: string[];
  stalePeriods: number[];
  isMultiplied: number[];
  quoteType: OracleQuoteType;
};

export type Chainlink = {
  circuitChainlink: Address[];
  stalePeriods: number[];
  circuitChainIsMultiplied: number[];
  chainlinkDecimals: number[];
  quoteType: OracleQuoteType;
};

export type OracleFeed = {
  isChainlink: boolean;
  isPyth: boolean;
  chainlink?: Chainlink;
  pyth?: Pyth;
  otherContract?: Address;
};

export type Oracle = {
  oracleType: OracleReadType;
  targetType: OracleReadType;
  externalOracle?: Address;
  oracleFeed: OracleFeed;
  targetFeed: OracleFeed;
};

export type DecodedOracleConfig = {
  oracleType: OracleReadType;
  targetType: OracleReadType;
  oracleData: string;
  targetData: string;
};

export type DecodedStateMultiCallResultPythOracle = {
  price: BigNumber;
  conf: number;
  expo: number;
  publishTime: number;
};

export const BASE_9 = 1; // 1e9
export const BASE_12 = 1e3; // 1e12

export const MAX_BURN_FEE = 0.999; // 999_000_000
