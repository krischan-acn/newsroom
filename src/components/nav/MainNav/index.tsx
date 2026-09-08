// components/nav/MainNav.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import logo from '../../../app/logo.svg';
import "./MainNav.css";
import MegaMenuNav from './MegaMenuNav';

// No About / Contact / Login / Register items here for now.
//
// They used to link to /about, /contact, /login and /register - none of which
// exist as routes in this app, so all four 404'd on click and Next's <Link>
// prefetch 404'd them in the console on every page load as well.
//
// Briefly repointed at www.acnnewswire.com/aboutus/, /contactus/ and
// /client/login.aspx, then pulled entirely: the portal has no About or Contact
// page of its own yet, and "Login" here is misleading. There is no public
// login. The only sign-in on this site is the employee A/B panel, which is
// deliberately hidden - F2, or the unlabelled dot in TopNav (AbHiddenTrigger).
// Putting a Login button in the header would advertise it, which is the exact
// opposite of what it is for.
//
// Restore by re-adding a NAV_ITEMS array and a map in the two places marked
// "Desktop Actions" and "Mobile Nav Items" below.


export default function MainNav() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null)
  const [isContainerClosing, setIsContainerClosing] = useState(false) // For final close
  const [isSwitching, setIsSwitching] = useState(false) // For menu transitions
  const [isScrolled, setIsScrolled] = useState(false)
  const megaMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const closeMenu = () => {
    // Start closing the container
    setIsContainerClosing(true)
    
    setTimeout(() => {
      // Remove the menu entirely
      setActiveMegaMenu(null)
      // Reset both states
      setIsContainerClosing(false)
      setIsSwitching(false)
    }, 150) // Match animation duration
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (megaMenuRef.current && !megaMenuRef.current.contains(event.target as Node)) {
        closeMenu()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-99">
      <div
        className={`mx-auto w-full transition-[max-width,padding] duration-200 ${
          isScrolled ? 'max-w-[1920px] px-4' : 'max-w-[1920px] px-[60px]'
        }`}
      >

        <div className="flex flex-row items-center h-16 lg:flex-col lg:h-auto">
          <div
            className="flex flex-row justify-between gap-4 py-3 w-full"
            onMouseEnter={() => { if (activeMegaMenu) closeMenu() }}
          >
            {/* Logo - always visible */}
            <Link href="/" className="flex-shrink-0" aria-label="ACN Newswire homepage">
              <Image
                src={logo}
                alt=""
                width={100}
                height={32}
                className="h-8 w-[250px] lg:h-10"
                priority
              />
            </Link>

          
            {/* Desktop Search - lg and up */}
            <div className="hidden lg:flex flex-1 max-w-xl xl:max-w-2xl mx-6 self-center">
              <form action="/search" method="GET" className="relative w-full">
                <input
                  type="search"
                  name="q"
                  placeholder="News releases by Company, Region, Sector, Industry, Language & Event"
                  className="w-full px-4 py-2 pr-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Search"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Submit search"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </form>
            </div>
            {/* Desktop Actions - lg and up: intentionally empty, see NAV_ITEMS note above */}
          </div>

          {/* Desktop Mega Menu - second row on lg */}
          <div ref={megaMenuRef} className="hidden lg:block border-t border-gray-200 w-full">
            <MegaMenuNav
              activeMenu={activeMegaMenu}
              isScrolled={isScrolled}
              onMenuHover={(menu) => {
                if (menu) {
                  if (activeMegaMenu && activeMegaMenu !== menu) {
                    setIsSwitching(true)
                    setTimeout(() => {
                      setActiveMegaMenu(menu)
                      setTimeout(() => setIsSwitching(false), 75)
                    }, 75)
                  } else {
                    setActiveMegaMenu(menu)
                  }
                } else {
                  setIsContainerClosing(true)
                  setTimeout(() => {
                    setActiveMegaMenu(null)
                    setIsContainerClosing(false)
                  }, 150)
                }
              }}
              isContainerClosing={isContainerClosing}
              isSwitching={isSwitching}
            />
          </div>

          {/* Mobile Menu Button - below lg */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 -mr-2 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            aria-expanded={isOpen}
            aria-label="Menu"
          >
            {isOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

        </div> {/* End of main flex row */}

        {/* Mobile Menu - full screen overlay */}
              {isOpen && (
                <div className="lg:hidden fixed inset-0 bg-white z-999 overflow-y-auto mt-9">
                  <div className="p-4">
                    {/* Mobile header with close */}
                    <div className="flex justify-end mb-4">
                      <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                        aria-label="Close menu"
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Mobile Search */}
                    <div className="mb-6">
                      <form 
                        action="/search" 
                        method="GET"
                        className="relative"
                        onSubmit={() => setIsOpen(false)}
                      >
                        <input
                          type="search"
                          name="q"
                          placeholder="Search..."
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button 
                          type="submit"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </button>
                      </form>
                    </div>

                    {/* Mobile Nav Items: intentionally empty, see NAV_ITEMS note above */}

                    {/* Optional: Add language selector or other mobile-only items here */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <p className="text-sm text-gray-500 text-center">
                        © {new Date().getFullYear()} ACN Newswire
                      </p>
                    </div>
                  </div>
                </div>
              )}

        {activeMegaMenu && (
          <div
            className={`fixed bottom-9 left-1/2 -translate-x-1/2 z-[100] transition-all duration-200 ${
              isContainerClosing ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
            }`}
          >
            <button onClick={closeMenu} className="button alt flex gap-3">
              <span className="font-bold">✕</span> Close Menu
            </button>
          </div>
        )}

      </div>
    </nav>
  )
}