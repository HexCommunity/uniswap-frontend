import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect } from 'react'

import { useWeb3React } from '../hooks'
import {
  isAddress,
  getTokenName,
  getTokenSymbol,
  getTokenDecimals,
  getTokenExchangeAddressFromFactory,
  safeAccess
} from '../utils'

const NAME = 'name'
const SYMBOL = 'symbol'
const DECIMALS = 'decimals'
const EXCHANGE_ADDRESS = 'exchangeAddress'

const UPDATE = 'UPDATE'

const ETH = {
  ETH: {
    [NAME]: 'Ethereum',
    [SYMBOL]: 'ETH',
    [DECIMALS]: 18,
    [EXCHANGE_ADDRESS]: null
  }
}

export const INITIAL_TOKENS_CONTEXT = {
  1: {
    
    '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39': {
      [NAME]: 'HEX',
      [SYMBOL]: 'HEX',
      [DECIMALS]: 8,
      [EXCHANGE_ADDRESS]: '0x05cDe89cCfa0adA8C88D5A23caaa79Ef129E7883'
    },
    '0x6B175474E89094C44Da98b954EedeAC495271d0F': {
      [NAME]: 'Dai Stablecoin',
      [SYMBOL]: 'DAI',
      [DECIMALS]: 18,
      [EXCHANGE_ADDRESS]: '0x2a1530C4C41db0B0b2bB646CB5Eb1A67b7158667'
    },    
    '0x0000000000085d4780B73119b644AE5ecd22b376': {
      [NAME]: 'TrueUSD',
      [SYMBOL]: 'TUSD',
      [DECIMALS]: 18,
      [EXCHANGE_ADDRESS]: '0x5048b9d01097498Fd72F3F14bC9Bc74A5aAc8fA7'
    },
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
      [NAME]: 'USD//C',
      [SYMBOL]: 'USDC',
      [DECIMALS]: 6,
      [EXCHANGE_ADDRESS]: '0x97deC872013f6B5fB443861090ad931542878126'
    },
    '0xA4Bdb11dc0a2bEC88d24A3aa1E6Bb17201112eBe': {
      [NAME]: 'StableUSD',
      [SYMBOL]: 'USDS',
      [DECIMALS]: 6,
      [EXCHANGE_ADDRESS]: '0x7Ef7191AB91dDB4D7cC347fbFA170355acbaf02D'
    }
    
  },
  4: {
    '0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa': {
      [NAME]: 'Dai',
      [SYMBOL]: 'DAI',
      [DECIMALS]: 18,
      [EXCHANGE_ADDRESS]: '0xaF51BaAA766b65E8B3Ee0C2c33186325ED01eBD5'
    }
  }
}

const TokensContext = createContext()

function useTokensContext() {
  return useContext(TokensContext)
}

function reducer(state, { type, payload }) {
  switch (type) {
    case UPDATE: {
      const { networkId, tokenAddress, name, symbol, decimals, exchangeAddress } = payload
      return {
        ...state,
        [networkId]: {
          ...(safeAccess(state, [networkId]) || {}),
          [tokenAddress]: {
            [NAME]: name,
            [SYMBOL]: symbol,
            [DECIMALS]: decimals,
            [EXCHANGE_ADDRESS]: exchangeAddress
          }
        }
      }
    }
    default: {
      throw Error(`Unexpected action type in TokensContext reducer: '${type}'.`)
    }
  }
}

export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_TOKENS_CONTEXT)

  const update = useCallback((networkId, tokenAddress, name, symbol, decimals, exchangeAddress) => {
    dispatch({ type: UPDATE, payload: { networkId, tokenAddress, name, symbol, decimals, exchangeAddress } })
  }, [])

  return (
    <TokensContext.Provider value={useMemo(() => [state, { update }], [state, update])}>
      {children}
    </TokensContext.Provider>
  )
}

export function useTokenDetails(tokenAddress) {
  const { library, chainId } = useWeb3React()

  const [state, { update }] = useTokensContext()
  const allTokensInNetwork = { ...ETH, ...(safeAccess(state, [chainId]) || {}) }
  const { [NAME]: name, [SYMBOL]: symbol, [DECIMALS]: decimals, [EXCHANGE_ADDRESS]: exchangeAddress } =
    safeAccess(allTokensInNetwork, [tokenAddress]) || {}

  useEffect(() => {
    if (
      isAddress(tokenAddress) &&
      (name === undefined || symbol === undefined || decimals === undefined || exchangeAddress === undefined) &&
      (chainId || chainId === 0) &&
      library
    ) {
      let stale = false
      const namePromise = getTokenName(tokenAddress, library).catch(() => null)
      const symbolPromise = getTokenSymbol(tokenAddress, library).catch(() => null)
      const decimalsPromise = getTokenDecimals(tokenAddress, library).catch(() => null)
      const exchangeAddressPromise = getTokenExchangeAddressFromFactory(tokenAddress, chainId, library).catch(
        () => null
      )

      Promise.all([namePromise, symbolPromise, decimalsPromise, exchangeAddressPromise]).then(
        ([resolvedName, resolvedSymbol, resolvedDecimals, resolvedExchangeAddress]) => {
          if (!stale) {
            update(chainId, tokenAddress, resolvedName, resolvedSymbol, resolvedDecimals, resolvedExchangeAddress)
          }
        }
      )
      return () => {
        stale = true
      }
    }
  }, [tokenAddress, name, symbol, decimals, exchangeAddress, chainId, library, update])

  return { name, symbol, decimals, exchangeAddress }
}

export function useAllTokenDetails() {
  const { chainId } = useWeb3React()

  const [state] = useTokensContext()

  return useMemo(() => ({ ...ETH, ...(safeAccess(state, [chainId]) || {}) }), [state, chainId])
}
