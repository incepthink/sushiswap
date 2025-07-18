'use client'

import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { useIsMounted } from '@sushiswap/hooks'
import {
  Badge,
  Button,
  SelectIcon,
  SelectPrimitive,
  TextField,
  classNames,
} from '@sushiswap/ui'
import { Currency } from '@sushiswap/ui'
import { SkeletonBox } from '@sushiswap/ui'
import { NetworkIcon } from '@sushiswap/ui/icons/NetworkIcon'
import {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react'
import { EvmChain, type EvmChainId } from 'sushi/chain'
import { type Token, type Type, tryParseAmount } from 'sushi/currency'
import type { Percent } from 'sushi/math'
import { useAccount } from 'wagmi'
import { useAmountBalance } from '~evm/_common/ui/balance-provider/use-balance'
import { usePrice } from '~evm/_common/ui/price-provider/price-provider/use-price'
import { TokenSelector } from '../../token-selector/token-selector'
import { BalancePanel } from './BalancePanel'
import { PricePanel } from './PricePanel'
import { usePriceBackend } from './usePriceBackend'
import { SimpleTokenSelector } from '../../token-selector/token-lists/SimpleTokenSelector'

interface CurrencyInputProps {
  id?: string
  disabled?: boolean
  value: string
  onChange?(value: string): void
  currency: Type | undefined
  onSelect?(currency: Type): void
  chainId: EvmChainId
  currencyClassName?: string
  className?: string
  loading?: boolean
  priceImpact?: Percent | undefined
  disableMaxButton?: boolean
  type: 'INPUT' | 'OUTPUT'
  fetching?: boolean
  currencyLoading?: boolean
  currencies?: Record<string, Token>
  allowNative?: boolean
  error?: string
  hidePinnedTokens?: boolean
  disableInsufficientBalanceError?: boolean
  hideSearch?: boolean
  hidePricing?: boolean
  hideIcon?: boolean
  label?: string
  networks?: readonly EvmChainId[]
  selectedNetwork?: EvmChainId
  onNetworkChange?: (network: number) => void
}

const CurrencyInput: FC<CurrencyInputProps> = ({
  id,
  disabled,
  value,
  onChange,
  currency,
  onSelect,
  chainId,
  currencyClassName,
  className,
  loading,
  priceImpact,
  disableMaxButton = false,
  type,
  fetching,
  currencyLoading,
  currencies,
  allowNative = true,
  error,
  hidePinnedTokens = false,
  disableInsufficientBalanceError = false,
  hideSearch = false,
  hidePricing = false,
  hideIcon = false,
  label,
  networks,
  selectedNetwork,
  onNetworkChange,
}) => {
  const isMounted = useIsMounted()

  const [localValue, setLocalValue] = useState<string>('')
  const { address } = useAccount()
  const [pending, startTransition] = useTransition()

  const { data: balance, isLoading: isBalanceLoading } =
    useAmountBalance(currency)

  // const { data: price, isLoading: isPriceLoading } = usePrice({
  //   chainId: currency?.chainId,
  //   address: currency?.wrapped?.address,
  //   enabled: !hidePricing,
  // })

  const { tokenPrice: price, isLoading: isPriceLoading } = usePriceBackend(
  currency?.wrapped?.address,
  undefined,
  { 
    enabled: !hidePricing 
  }
)

  console.log("PRICE::", price);
  

  const _value = useMemo(
    () => tryParseAmount(value, currency),
    [value, currency],
  )
  const insufficientBalance =
    address &&
    type === 'INPUT' &&
    balance &&
    _value &&
    balance.lessThan(_value) &&
    !disableInsufficientBalanceError

  // If currency changes, trim input to decimals
  useEffect(() => {
    if (currency && onChange && value && value.includes('.')) {
      const [, decimals] = value.split('.')
      if (decimals.length > currency.decimals) {
        onChange(Number(value).toFixed(currency.decimals))
      }
    }
  }, [onChange, currency, value])

  const isLoading = !isMounted || loading || currencyLoading || isBalanceLoading
  const _error = error
    ? error
    : insufficientBalance
      ? 'Exceeds Balance'
      : undefined

  const _onChange = useCallback(
    (value: string) => {
      setLocalValue(value)
      startTransition(() => {
        onChange?.(value)
      })
    },
    [onChange],
  )

  useEffect(() => {
    if (currency && chainId && currency?.chainId !== chainId) {
      console.error(
        `Selected token chainId not equal to passed chainId, impossible state. Currency chainId: ${currency.chainId}, chainId: ${chainId}`,
      )
    }
  }, [currency, chainId])

  const selector = useMemo(() => {
  if (!onSelect) return null

  return (
    <SimpleTokenSelector
      selected={currency}
      chainId={chainId}
      onSelect={onSelect}
      includeNative={allowNative}
    >
      <Button
        data-state={currencyLoading ? 'inactive' : 'active'}
        size="lg"
        variant={currency ? 'secondary' : 'default'}
        id={id}
        type="button"
        className={classNames(
          currency ? 'pl-2 pr-3' : '',
          networks ? '!h-11' : '',
          currencyClassName,
          '!rounded-full data-[state=inactive]:hidden data-[state=active]:flex',
        )}
      >
        {currency ? (
          networks ? (
            <>
              <div className="w-[28px] h-[28px] mr-1.5">
                <Badge
                  className="border border-slate-900 rounded-full z-[11]"
                  position="bottom-right"
                  badgeContent={
                    <NetworkIcon
                      chainId={currency.chainId}
                      width={16}
                      height={16}
                    />
                  }
                >
                  <Currency.Icon
                    disableLink
                    currency={currency}
                    width={28}
                    height={28}
                  />
                </Badge>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xl leading-5">{currency.symbol}</span>
                <span className="text-xs leading-3 text-muted-foreground">
                  {EvmChain.from(currency.chainId)?.name}
                </span>
              </div>
              <SelectPrimitive.Icon asChild>
                <ChevronRightIcon strokeWidth={2} width={16} height={16} />
              </SelectPrimitive.Icon>
            </>
          ) : (
            <>
              <div className="w-[28px] h-[28px] mr-0.5">
                <Currency.Icon
                  disableLink
                  currency={currency}
                  width={28}
                  height={28}
                />
              </div>
              <span className="text-xl">{currency.symbol}</span>
              <SelectIcon />
            </>
          )
        ) : (
          'Select token'
        )}
      </Button>
    </SimpleTokenSelector>
  )
}, [
  currencyClassName,
  currencyLoading,
  id,
  onSelect,
  currency,
  chainId,
  allowNative,
  networks,
  selectedNetwork,
  onNetworkChange,
])

  return (
    <div
      className={classNames(
        _error ? '!bg-red-500/20 !dark:bg-red-900/30' : '',
        'relative space-y-2 overflow-hidden pb-2',
        className,
      )}
    >
      <div
        data-state={fetching ? 'active' : 'inactive'}
        className="transition-all data-[state=inactive]:hidden data-[state=active]:block absolute inset-0 overflow-hidden p-4 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_.5s_infinite] before:bg-gradient-to-r before:from-transparent dark:before:via-slate-50/10 before:via-gray-900/[0.07] before:to-transparent"
      />
      {label ? (
        <span className="text-sm text-muted-foreground">{label}</span>
      ) : null}
      <div className="relative flex items-center gap-4">
        <div
          data-state={isLoading ? 'active' : 'inactive'}
          className={classNames(
            'data-[state=inactive]:hidden data-[state=active]:flex',
            'gap-4 items-center justify-between flex-grow h-[44px]',
          )}
        >
          <SkeletonBox className="w-2/3 h-[32px] rounded-lg" />
          {currencyLoading ? (
            <SkeletonBox className="w-1/3 h-[32px] rounded-lg" />
          ) : null}
        </div>
        <div
          data-state={isLoading ? 'inactive' : 'active'}
          className="data-[state=inactive]:hidden data-[state=active]:flex flex-1 items-center"
        >
          <TextField
            testdata-id={`${id}-input`}
            type="number"
            variant="naked"
            disabled={disabled}
            onValueChange={_onChange}
            value={pending ? localValue : value}
            readOnly={disabled}
            maxDecimals={currency?.decimals}
            data-state={isLoading ? 'inactive' : 'active'}
            className={classNames('p-0 py-1 !text-3xl font-medium')}
          />
        </div>

        {selector}
        {!onSelect ? (
          <div
            id={`${id}-button`}
            className={classNames(
              currencyClassName,
              'flex items-center gap-1 text-xl py-2 pl-2 pr-2 rounded-full font-medium whitespace-nowrap',
            )}
          >
            {currency ? (
              <>
                {!hideIcon && (
                  <div className="w-[28px] h-[28px] mr-0.5">
                    <Currency.Icon
                      disableLink
                      currency={currency}
                      width={28}
                      height={28}
                    />
                  </div>
                )}
                {currency.symbol}
              </>
            ) : (
              <span className="text-gray-400 dark:text-slate-500">
                No token selected
              </span>
            )}
          </div>
        ) : null}
      </div>
      <div className="flex flex-row items-center justify-between h-[36px]">
        {hidePricing ? (
          <div />
        ) : (
          <PricePanel
            value={value}
            currency={currency}
            priceImpact={priceImpact}
            error={_error}
            loading={isPriceLoading}
            price={price}
          />
        )}
        <BalancePanel
          id={id}
          loading={isBalanceLoading}
          chainId={chainId}
          account={address}
          onChange={onChange}
          currency={currency}
          disableMaxButton={disableMaxButton}
          balance={balance}
          type={type}
        />
      </div>
    </div>
  )
}

export { CurrencyInput, type CurrencyInputProps }
