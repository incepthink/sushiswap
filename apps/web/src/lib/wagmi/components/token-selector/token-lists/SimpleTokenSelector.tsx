'use client'

import React, { type FC, type ReactNode, useCallback, useState, useMemo, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Alert,
  Chip
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { Currency } from '@sushiswap/ui'
import type { EvmChainId } from 'sushi/chain'
import type { Type } from 'sushi/currency'
import { useFixedTokens } from './common/use-fixed-tokens'
import { useTokensBackend } from './common/useTokensBackend'

// Common chain options for cross-chain
const CHAIN_OPTIONS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH' },
  { id: 137, name: 'Polygon', symbol: 'MATIC' },
  { id: 56, name: 'BSC', symbol: 'BNB' },
  { id: 42161, name: 'Arbitrum', symbol: 'ARB' },
  { id: 10, name: 'Optimism', symbol: 'OP' },
  { id: 747474, name: 'Katana', symbol: 'ETH' },
]

// Priority tokens that should appear first
const PRIORITY_TOKENS = ['ETH', 'WETH', 'USDC', 'USDT', 'WBTC', 'BNB', 'MATIC']

interface SimpleTokenSelectorProps {
  selected: Type | undefined
  chainId: EvmChainId
  onSelect(currency: Type): void
  children: ReactNode
  includeNative?: boolean
  crossChain?: boolean
  onNetworkChange?:  (network: number) => void
}

export const SimpleTokenSelector: FC<SimpleTokenSelectorProps> = ({
  selected,
  chainId,
  onSelect,
  children,
  includeNative = true,
  crossChain = false,
  onNetworkChange
}) => {
  const [open, setOpen] = useState(false)
  const [selectedChainId, setSelectedChainId] = useState<EvmChainId>(chainId)

  useEffect(() => {
    if (onNetworkChange) {
      onNetworkChange(selectedChainId)
    }
  }, [selectedChainId])
  
  // Use different hooks based on crossChain prop
  const fixedTokensResult = useFixedTokens({
    chainId: selectedChainId,
    includeNative,
  })
  
  const backendTokensResult = useTokensBackend(selectedChainId)
  
  // Choose which token source to use
  const { tokens: rawTokens, isLoading, isError } = crossChain ? backendTokensResult : fixedTokensResult

  // Sort tokens with priority tokens first
  const tokens = useMemo(() => {
    if (!rawTokens || rawTokens.length === 0) return []
    
    const priorityTokens: Type[] = []
    const regularTokens: Type[] = []
    
    rawTokens.forEach(token => {
      if (PRIORITY_TOKENS.includes(token.symbol?.toUpperCase() || '')) {
        priorityTokens.push(token)
      } else {
        regularTokens.push(token)
      }
    })
    
    // Sort priority tokens by their order in PRIORITY_TOKENS array
    priorityTokens.sort((a, b) => {
      const aIndex = PRIORITY_TOKENS.indexOf(a.symbol?.toUpperCase() || '')
      const bIndex = PRIORITY_TOKENS.indexOf(b.symbol?.toUpperCase() || '')
      return aIndex - bIndex
    })
    
    // Sort regular tokens alphabetically
    regularTokens.sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''))
    
    return [...priorityTokens, ...regularTokens]
  }, [rawTokens])

  const handleSelect = useCallback(
    (currency: Type) => {
      console.log('SimpleTokenSelector: Selecting token', currency.symbol)
      onSelect(currency)
      setOpen(false)
    },
    [onSelect],
  )

  const handleChainSelect = useCallback(
    (newChainId: EvmChainId) => {
      setSelectedChainId(newChainId)
    },
    []
  )

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  // Check if selected token exists in our tokens list
  const isSelectedTokenAvailable = selected ? 
    tokens.some(token => token.id === selected.id) : 
    true

  if (isError) {
    console.error('Error loading tokens')
    return null
  }

  const selectedChain = CHAIN_OPTIONS.find(chain => chain.id === selectedChainId)

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {children}
      </div>
      
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 2,
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          color: 'white',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <Typography variant="h6" component="div">
            Select a token
          </Typography>
          <IconButton 
            onClick={handleClose}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {/* Chain Selector - only show in cross-chain mode */}
          {crossChain && (
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Network
              </InputLabel>
              <Select
                value={selectedChainId}
                label="Network"
                onChange={(e) => handleChainSelect(Number(e.target.value) as EvmChainId)}
                sx={{
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00F5E0',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00F5E0',
                  },
                  '& .MuiSelect-icon': {
                    color: 'rgba(255, 255, 255, 0.7)',
                  }
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: 'rgba(30, 41, 59, 0.95)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }
                  }
                }}
              >
                {CHAIN_OPTIONS.map((chain) => (
                  <MenuItem 
                    key={chain.id} 
                    value={chain.id}
                    sx={{ color: 'white' }}
                  >
                    {chain.name} ({chain.symbol})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          
          {!isSelectedTokenAvailable && selected && (
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 3,
                bgcolor: 'rgba(255, 193, 7, 0.1)',
                color: '#ffc107',
                border: '1px solid rgba(255, 193, 7, 0.3)'
              }}
            >
              Currently selected token ({selected.symbol}) is not available in the token list.
            </Alert>
          )}
          
          {isLoading ? (
            <Box display="flex" flexDirection="column" alignItems="center" py={4}>
              <CircularProgress sx={{ color: '#00F5E0', mb: 2 }} />
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Loading tokens...
              </Typography>
            </Box>
          ) : (
            <Box>
              {tokens.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    No tokens available for {selectedChain?.name || 'this network'}
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {tokens.length} tokens available on {selectedChain?.name}
                    </Typography>
                  </Box>
                  
                  <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {tokens.map((token: Type, index) => {
                      const isPriority = PRIORITY_TOKENS.includes(token.symbol?.toUpperCase() || '')
                      
                      return (
                        <ListItem 
                          key={token.id} 
                          disablePadding
                          sx={{
                            borderRadius: 1,
                            mb: 0.5,
                            bgcolor: selected?.id === token.id ? 'rgba(0, 245, 224, 0.1)' : 'transparent',
                            border: selected?.id === token.id ? '1px solid rgba(0, 245, 224, 0.3)' : '1px solid transparent',
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 0.05)'
                            }
                          }}
                        >
                          <ListItemButton 
                            onClick={() => handleSelect(token)}
                            sx={{ 
                              borderRadius: 1,
                              py: 1.5,
                              px: 2
                            }}
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ width: 32, height: 32 }}>
                                <Currency.Icon
                                  currency={token}
                                  width={32}
                                  height={32}
                                />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Typography 
                                    variant="body1" 
                                    sx={{ 
                                      color: 'white', 
                                      fontWeight: isPriority ? 600 : 400 
                                    }}
                                  >
                                    {token.symbol}
                                  </Typography>
                                  {isPriority && (
                                    <Chip 
                                      label="Popular" 
                                      size="small" 
                                      sx={{ 
                                        bgcolor: 'rgba(0, 245, 224, 0.2)', 
                                        color: '#00F5E0',
                                        fontSize: '0.7rem',
                                        height: 20
                                      }} 
                                    />
                                  )}
                                </Box>
                              }
                              secondary={
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {token.name}
                                </Typography>
                              }
                            />
                            {crossChain && (
                              <Chip
                                label={`Chain ${token.chainId}`}
                                size="small"
                                variant="outlined"
                                sx={{ 
                                  color: 'rgba(255, 255, 255, 0.5)',
                                  borderColor: 'rgba(255, 255, 255, 0.3)',
                                  fontSize: '0.7rem'
                                }}
                              />
                            )}
                          </ListItemButton>
                        </ListItem>
                      )
                    })}
                  </List>
                </>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}