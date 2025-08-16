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
  Chip,
  TextField,
  InputAdornment,
  Tabs,
  Tab
} from '@mui/material'
import { Close as CloseIcon, Search as SearchIcon } from '@mui/icons-material'
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
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"popular" | "all">("popular")

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
  const { tokens: rawTokens, isLoading, isError } = backendTokensResult

  // Get priority tokens (popular tokens)
  const priorityTokens = useMemo(() => {
    if (!rawTokens || rawTokens.length === 0) return []
    
    const priority: Type[] = []
    rawTokens.forEach(token => {
      if (PRIORITY_TOKENS.includes(token.symbol?.toUpperCase() || '')) {
        priority.push(token)
      }
    })
    
    // Sort priority tokens by their order in PRIORITY_TOKENS array
    priority.sort((a, b) => {
      const aIndex = PRIORITY_TOKENS.indexOf(a.symbol?.toUpperCase() || '')
      const bIndex = PRIORITY_TOKENS.indexOf(b.symbol?.toUpperCase() || '')
      return aIndex - bIndex
    })
    
    return priority
  }, [rawTokens])

  // Sort all tokens with priority tokens first
  const allTokens = useMemo(() => {
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

  // Determine which tokens to show based on active tab
  const tokensToShow = useMemo(() => {
    return activeTab === "popular" ? priorityTokens : allTokens
  }, [activeTab, priorityTokens, allTokens])

  // Filter tokens based on search query
  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return tokensToShow
    
    const query = searchQuery.toLowerCase()
    return tokensToShow.filter(token =>
      token.symbol?.toLowerCase().includes(query) ||
      token.name?.toLowerCase().includes(query)
    )
  }, [tokensToShow, searchQuery])

  const handleSelect = useCallback(
    (currency: Type) => {
      console.log('SimpleTokenSelector: Selecting token', currency.symbol)
      onSelect(currency)
      setOpen(false)
      setSearchQuery("") // Reset search on close
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
    setSearchQuery("") // Reset search on close
  }, [])

  const handleTabChange = useCallback((
    event: React.SyntheticEvent,
    newValue: "popular" | "all"
  ) => {
    setActiveTab(newValue)
  }, [])

  // Check if selected token exists in our tokens list
  const isSelectedTokenAvailable = selected ? 
    allTokens.some(token => token.id === selected.id) : 
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
            color: 'white',
            minHeight: '600px',
            maxHeight: '80vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          color: 'white',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          py: 2
        }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            Select a token
          </Typography>
          <IconButton 
            onClick={handleClose}
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Chain Selector - only show in cross-chain mode */}
            {crossChain && (
              <FormControl fullWidth>
                <InputLabel sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-focused': {
                    color: '#00F5E0',
                  }
                }}>
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
                        '& .MuiMenuItem-root': {
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 245, 224, 0.1)',
                          },
                          '&.Mui-selected': {
                            backgroundColor: 'rgba(0, 245, 224, 0.2)',
                          },
                        }
                      }
                    }
                  }}
                >
                  {CHAIN_OPTIONS.map((chain) => (
                    <MenuItem 
                      key={chain.id} 
                      value={chain.id}
                    >
                      {chain.name} ({chain.symbol})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Search Input */}
            <TextField
              fullWidth
              placeholder="Search by name or symbol"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                  </InputAdornment>
                ),
                sx: {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00F5E0',
                  },
                },
              }}
              sx={{
                '& .MuiInputBase-input::placeholder': {
                  color: 'rgba(255, 255, 255, 0.5)',
                  opacity: 1,
                },
              }}
            />

            {/* Token Type Tabs */}
            <Box
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                p: 0.5,
                '& .MuiTabs-root': {
                  minHeight: 'auto',
                },
                '& .MuiTab-root': {
                  minHeight: 'auto',
                  padding: '8px 16px',
                  margin: 0,
                  borderRadius: '8px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '14px',
                  fontWeight: 500,
                  textTransform: 'none',
                  transition: 'all 0.2s',
                  '&:hover': {
                    color: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  },
                  '&.Mui-selected': {
                    backgroundColor: '#00F5E0',
                    color: '#000',
                    '&:hover': {
                      backgroundColor: '#00F5E0',
                      color: '#000',
                    },
                  },
                },
                '& .MuiTabs-indicator': {
                  display: 'none',
                },
              }}
            >
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="fullWidth"
              >
                <Tab 
                  value="popular" 
                  label={`Popular (${priorityTokens.length})`} 
                />
                <Tab
                  value="all"
                  label={`All Tokens (${allTokens.length})`}
                />
              </Tabs>
            </Box>

            {!isSelectedTokenAvailable && selected && (
              <Alert 
                severity="warning" 
                sx={{ 
                  bgcolor: 'rgba(255, 193, 7, 0.1)',
                  color: '#ffc107',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                  '& .MuiAlert-icon': {
                    color: '#ffc107',
                  }
                }}
              >
                Currently selected token ({selected.symbol}) is not available in the token list.
              </Alert>
            )}
          </Box>
          
          {isLoading ? (
            <Box display="flex" flexDirection="column" alignItems="center" py={4}>
              <CircularProgress sx={{ color: '#00F5E0', mb: 2 }} />
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Loading tokens...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ flex: 1, overflowY: 'auto', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              {filteredTokens.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    {searchQuery ? 'No tokens found matching your search' : `No ${activeTab} tokens available for ${selectedChain?.name || 'this network'}`}
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box display="flex" justifyContent="space-between" alignItems="center" p={2} pb={0}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {searchQuery ? 
                        `${filteredTokens.length} tokens found` : 
                        `${filteredTokens.length} ${activeTab} tokens on ${selectedChain?.name}`
                      }
                    </Typography>
                  </Box>
                  
                  <List sx={{ p: 0 }}>
                    {filteredTokens.map((token: Type, index) => {
                      const isPriority = PRIORITY_TOKENS.includes(token.symbol?.toUpperCase() || '')
                      
                      return (
                        <ListItem 
                          key={`${token.id}-${index}`} 
                          disablePadding
                          sx={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            '&:last-child': {
                              borderBottom: 'none',
                            }
                          }}
                        >
                          <ListItemButton 
                            onClick={() => handleSelect(token)}
                            sx={{ 
                              py: 1.5,
                              px: 2,
                              bgcolor: selected?.id === token.id ? 'rgba(0, 245, 224, 0.1)' : 'transparent',
                              border: selected?.id === token.id ? '1px solid rgba(0, 245, 224, 0.3)' : 'none',
                              '&:hover': {
                                bgcolor: selected?.id === token.id ? 'rgba(0, 245, 224, 0.15)' : 'rgba(255, 255, 255, 0.05)'
                              }
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
                                  {isPriority && activeTab === 'all' && (
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
                                  {selected?.id === token.id && (
                                    <Chip 
                                      label="Selected" 
                                      size="small" 
                                      sx={{ 
                                        bgcolor: 'rgba(0, 245, 224, 0.3)', 
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

          {/* Footer info */}
          <Box
            sx={{
              p: 2,
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
            >
              {searchQuery ? 
                `Showing ${filteredTokens.length} results for "${searchQuery}"` :
                `${activeTab === 'popular' ? priorityTokens.length : allTokens.length} ${activeTab} tokens available${crossChain ? ` on ${selectedChain?.name}` : ''}`
              }
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  )
}