'use client'

import { Cog6ToothIcon, XMarkIcon } from '@heroicons/react/24/outline'
import {
  type SlippageToleranceStorageKey,
  type TTLStorageKey,
  useSlippageTolerance,
} from '@sushiswap/hooks'
import React, { type FC, type ReactNode, useState } from 'react'

import { DEFAULT_SLIPPAGE } from 'sushi/config'
import { Button } from '../button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../dialog'
import { List } from '../list'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../tooltip'
import { CarbonOffset } from './CarbonOffset'
import { ExpertMode } from './ExpertMode'
import { SlippageTolerance } from './SlippageTolerance'
import { TransactionDeadline } from './TransactionDeadline'

export enum SettingsModule {
  CarbonOffset = 'CarbonOffset',
  CustomTokens = 'CustomTokens',
  SlippageTolerance = 'SlippageTolerance',
  ExpertMode = 'ExpertMode',
  TransactionDeadline = 'TransactionDeadline',
}

interface SettingsOverlayProps {
  children?: ReactNode
  modules: SettingsModule[]
  externalModules?: FC[]
  options?: {
    slippageTolerance?: {
      storageKey?: SlippageToleranceStorageKey
      defaultValue?: string
      title?: string
    }
    transactionDeadline?: {
      storageKey: TTLStorageKey
      defaultValue?: string
      title?: string
    }
  }
}

export const SettingsOverlay: FC<SettingsOverlayProps> = ({
  modules,
  externalModules,
  children,
  options,
}) => {
  const [_open, setOpen] = useState(false)
  const [slippageTolerance, setSlippageTolerance] = useSlippageTolerance(
    options?.slippageTolerance?.storageKey,
  )
  return (
    <Dialog>
      <DialogTrigger asChild style={{color: 'white'}}>
        {children ? (
          children
        ) : (
          <Button
            size="sm"
            className="!rounded-full"
            variant="secondary"
            icon={Cog6ToothIcon}
            onClick={() => setOpen(true)}
            style={{color: "white"}}
          >
            {Number(slippageTolerance) > 0.5 &&
            modules.includes(SettingsModule.SlippageTolerance) ? (
              <TooltipProvider>
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSlippageTolerance(DEFAULT_SLIPPAGE)
                      }}
                      className="!rounded-full -mr-1.5 !bg-opacity-50"
                      iconPosition="end"
                      variant={
                        Number(slippageTolerance) > 20
                          ? 'destructive'
                          : Number(slippageTolerance) > 2
                            ? 'warning'
                            : 'secondary'
                      }
                      size="xs"
                      asChild
                      icon={XMarkIcon}
                    >
                      {slippageTolerance}%
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset slippage tolerance</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Adjust to your personal preferences.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {modules.includes(SettingsModule.SlippageTolerance) && (
            <List className="!pt-0">
              <List.Control>
                <SlippageTolerance options={options?.slippageTolerance} />
              </List.Control>
            </List>
          )}
          {modules.includes(SettingsModule.ExpertMode) ||
            modules.includes(SettingsModule.TransactionDeadline) ||
            (modules.includes(SettingsModule.CarbonOffset) && (
              <List className="!pt-0">
                <List.Control>
                  {modules.includes(SettingsModule.ExpertMode) && (
                    <ExpertMode />
                  )}
                  {modules.includes(SettingsModule.CarbonOffset) && (
                    <CarbonOffset />
                  )}
                  {modules.includes(SettingsModule.TransactionDeadline) &&
                    options?.transactionDeadline && (
                      <TransactionDeadline
                        options={options.transactionDeadline}
                      />
                    )}
                </List.Control>
              </List>
            ))}
          {externalModules?.map((Module, index) => (
            <List className="!pt-0" key={index}>
              <List.Control>
                <Module />
              </List.Control>
            </List>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
