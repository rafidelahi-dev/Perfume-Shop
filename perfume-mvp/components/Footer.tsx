import React from 'react'
import Link from 'next/link'
import { Facebook, Twitter, Instagram, Mail } from 'lucide-react'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  const companyLinks = [
    { href: '/about', label: 'About Us' },
    { href: '/careers', label: 'Careers' },
    { href: '/press', label: 'Press' },
    { href: '/sustainability', label: 'Sustainability' }
  ]

  const customerServiceLinks = [
    { href: '/help-center', label: 'Help Center' },
    { href: '/shipping-info', label: 'Shipping Information' },
    { href: '/returns', label: 'Returns & Exchanges' },
    { href: '/contact', label: 'Contact Us' }
  ]

  const policyLinks = [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
    { href: '/cookie-policy', label: 'Cookie Policy' },
    { href: '/accessibility', label: 'Accessibility' }
  ]

  const socialLinks = [
    { icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
    { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
    { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
    { icon: Mail, href: 'mailto:hello@perfumeshare.com', label: 'Email' }
  ]

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">PS</span>
              </div>
              <span className="text-xl font-serif font-semibold">PerfumeShare</span>
            </Link>
            <p className="text-gray-300 text-sm leading-relaxed mb-6">
              The premier destination for fragrance enthusiasts to discover, exchange, 
              and experience the world&apos;s finest perfumes. Connect with a community 
              that shares your passion for exquisite scents.
            </p>
            
            {/* Newsletter Signup */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Stay in the Scent Loop
              </h4>
              <div className="flex space-x-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 text-sm font-medium">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Marketplace
            </h3>
            <nav className="space-y-3">
              <Link href="/perfumes" className="block text-gray-300 hover:text-white transition-colors duration-200 text-sm">
                Explore Fragrances
              </Link>
              <Link href="/dashboard/listings" className="block text-gray-300 hover:text-white transition-colors duration-200 text-sm">
                Sell Your Perfume
              </Link>
              <Link href="/new-arrivals" className="block text-gray-300 hover:text-white transition-colors duration-200 text-sm">
                New Arrivals
              </Link>
              <Link href="/rare-finds" className="block text-gray-300 hover:text-white transition-colors duration-200 text-sm">
                Rare Finds
              </Link>
              <Link href="/brands" className="block text-gray-300 hover:text-white transition-colors duration-200 text-sm">
                Shop by Brand
              </Link>
            </nav>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Customer Service
            </h3>
            <nav className="space-y-3">
              {customerServiceLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-gray-300 hover:text-white transition-colors duration-200 text-sm"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Company & Legal */}
          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
                Company
              </h3>
              <nav className="space-y-3">
                {companyLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block text-gray-300 hover:text-white transition-colors duration-200 text-sm"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Social Links */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
                Connect With Us
              </h3>
              <div className="flex space-x-4">
                {socialLinks.map((social) => {
                  const Icon = social.icon
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      className="text-gray-400 hover:text-white transition-colors duration-200"
                      aria-label={social.label}
                    >
                      <Icon size={20} />
                    </a>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-gray-400">
              © {currentYear} PerfumeShare. All rights reserved.
            </p>
            
            <nav className="flex flex-wrap justify-center gap-6 text-sm">
              {policyLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Secure Transactions</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer