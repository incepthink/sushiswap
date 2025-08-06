'use client'

import React, { useState, type FC } from 'react'
import { useChainId } from 'wagmi'
import { ChainId, type EvmChainId } from 'sushi/chain'
import { type NonStandardChainId } from 'src/config'
import { WagmiHeaderComponents } from 'src/lib/wagmi/components/wagmi-header-components'
import { SUPPORTED_NETWORKS } from 'src/config'

// Import your NavLink component (you'll need to create this)
const NavLink: FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => {
  const isExternal = href.startsWith('http')
  
  if (isExternal) {
    return (
      <a
        href={href}
        rel="noopener noreferrer"
        className="text-white hover:text-[#00F5E0] transition-colors duration-200 py-2 text-xl"
      >
        {children}
      </a>
    )
  }
  
  return (
    <a
      href={href}
      className="text-[#00F5E0] transition-colors duration-200 py-2 text-xl"
    >
      {children}
    </a>
  )
}

// Menu and Close icons (since you're using @mui/icons-material)
const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

// Update your nav items to work with SushiSwap routes
const navItems = [
  {
    href: "/ethereum/swap", // SushiSwap swap route
    label: "Spot",
  },
  { 
    href: "https://preview.aggtrade.xyz/lend/earn", 
    label: "Lend/Borrow" 
  },
  { 
    href: "https://preview.aggtrade.xyz/profile", 
    label: "Account" 
  },
]

export function GradientConnectButton() {
  const connectedChainId = useChainId()

  return (
    <div className="flex items-center">
      <WagmiHeaderComponents
        networks={SUPPORTED_NETWORKS}
        selectedNetwork={connectedChainId as EvmChainId}
        supportedNetworks={SUPPORTED_NETWORKS}
      />
    </div>
  )
}

interface HeaderProps {
  chainId?: ChainId
  supportedNetworks?: readonly (EvmChainId | NonStandardChainId)[]
}

export const Header: FC<HeaderProps> = ({ 
  chainId: _chainId, 
  supportedNetworks = SUPPORTED_NETWORKS 
}) => {
  const connectedChainId = useChainId()
  const chainId = _chainId ?? connectedChainId
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <>
      <nav className="sticky top-0 bg-transparent shadow flex justify-between items-center p-2 px-4 lg:px-10 z-50 backdrop-blur-2xl border-b border-gray-800/20">
        {/* Logo */}
        <a href="/" className="flex gap-2 items-center">
          <div className="w-10 h-10">
            <img
              src="/assets/aggtrade.png"
              alt="AggTrade Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to a simple colored div if image fails
                e.currentTarget.style.display = 'none'
                e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-gradient-to-r from-[#00F5E0] to-[#00FAFF] rounded"></div>'
              }}
            />
          </div>
          <h2 className="text-xl md:text-2xl font-semibold text-white cursor-pointer">
            AggTrade
          </h2>
        </a>

        {/* Desktop Navigation */}
        <ul className="hidden lg:flex list-none gap-8 m-0 p-4">
          {navItems.map(({ href, label }) => (
            <li key={href}>
              <NavLink href={href}>{label}</NavLink>
            </li>
          ))}
        </ul>

        {/* Desktop Connect Button */}
        <div className="hidden lg:block">
          <GradientConnectButton />
        </div>

        {/* Mobile Menu Button and Connect Button */}
        <div className="lg:hidden flex items-center gap-2">
          <GradientConnectButton />
          <button
            onClick={toggleMenu}
            className="text-white p-2 hover:bg-gray-800 rounded-md transition-colors duration-200 flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Mobile Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-gray-900 transform transition-transform duration-300 ease-in-out z-50 lg:hidden ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-white font-semibold">Menu</h3>
          <button
            onClick={closeMenu}
            className="text-white p-2 hover:bg-gray-800 rounded-md transition-colors duration-200"
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>
        <ul className="flex flex-col p-4 gap-4">
          {navItems.map(({ href, label }) => (
            <li key={href}>
              <a
                href={href}
                onClick={closeMenu}
                className="block text-white hover:text-[#00F5E0] transition-colors duration-200 py-2"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}