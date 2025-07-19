'use client'

import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  Sheet,
  SheetContent,
  SheetTrigger,
  cloudinaryFetchLoader,
  useBreakpoint,
} from '@sushiswap/ui'
import { ArrowLeftOnRectangleIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import { ClipboardController } from '@sushiswap/ui'
import Image from 'next/image'
import { type FC, type ReactNode } from 'react'
import { ChainId, shortenAddress } from 'sushi'
import { useAccount, useEnsAvatar, useEnsName, useDisconnect } from 'wagmi'
import { ConnectButton } from '../connect-button'

const ResponsiveWalletWrapper: FC<{
  content: ReactNode
  trigger: ReactNode
  isSm: boolean
}> = ({ content, trigger, isSm }) => {
  return isSm ? (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="!p-0 !w-80">
        {content}
      </SheetContent>
    </Sheet>
  ) : (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="!p-0 !w-80 !max-w-80">
        {content}
      </DialogContent>
    </Dialog>
  )
}

export const UserPortfolio = () => {
  const { isSm } = useBreakpoint('sm')
  const { address } = useAccount()
  const { disconnect } = useDisconnect()

  const { data: ensName, isLoading: isENSNameLoading } = useEnsName({
    chainId: ChainId.ETHEREUM,
    address,
  })

  const { data: avatar } = useEnsAvatar({
    name: ensName || undefined,
    chainId: ChainId.ETHEREUM,
  })

if (!address) return <ConnectButton variant="secondary" />

  const content = (
    <div className="p-6">
      <VisuallyHidden>
        <DialogTitle>Wallet Actions</DialogTitle>
      </VisuallyHidden>
      
      {/* User Info */}
      <div className="flex items-center gap-3 mb-6">
        {avatar ? (
          <Image
            alt="ens-avatar"
            src={avatar}
            width={40}
            height={40}
            className="rounded-full"
            loader={cloudinaryFetchLoader}
          />
        ) : (
          <Image
            alt="ens-avatar"
            src={"/assets/avatar.svg"}
            width={40}
            height={40}
            className="rounded-full"
          />
        )}
        <div>
          {isENSNameLoading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-24 mb-1"></div>
              <div className="h-3 bg-gray-300 rounded w-20"></div>
            </div>
          ) : ensName ? (
            <div>
              <div className="font-semibold text-white">{ensName}</div>
              <div className="text-sm text-gray-400">
                {shortenAddress(address)}
              </div>
            </div>
          ) : (
            <div className="font-semibold text-white">
              {shortenAddress(address)}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {/* Copy Address */}
        <ClipboardController hideTooltip>
          {({ setCopied, isCopied }) => (
            <Button
              variant="ghost"
              onClick={() => setCopied(address!)}
              className="w-full justify-start !text-white hover:bg-gray-800"
            >
              <DocumentDuplicateIcon className="w-4 h-4 mr-3" />
              {isCopied ? 'Address Copied!' : 'Copy Address'}
            </Button>
          )}
        </ClipboardController>

        {/* Disconnect */}
        <Button
          variant="ghost"
          onClick={() => disconnect()}
          className="w-full justify-start !text-red-400 hover:text-red-300 hover:bg-red-900/20 "
        >
          <ArrowLeftOnRectangleIcon className="w-4 h-4 mr-3" />
          Disconnect Wallet
        </Button>
      </div>
    </div>
  )

  

  const trigger = (
    <Button variant="secondary" className='bg-gradient-to-r from-[#00F5E0] to-[#00FAFF] !text-black !rounded-md !text-[14px] !font-semibold'>
      {avatar ? (
        <Image
          alt="ens-avatar"
          src={avatar}
          width={20}
          height={20}
          className="rounded-full"
          loader={cloudinaryFetchLoader}
        />
      ) : (
        <Image
          alt="ens-avatar"
          src={"/assets/avatar.svg"}
          width={20}
          height={20}
          className="rounded-full"
        />
      )}
      <span className="hidden sm:block !text-black">{shortenAddress(address)}</span>
    </Button>
  )

  

  return (
    <ResponsiveWalletWrapper
      content={content}
      trigger={trigger}
      isSm={isSm}
    />
  )
}