// components/Footer.tsx
import React from 'react'
import Link from 'next/link'
import { Facebook, Twitter, Instagram, Mail } from 'lucide-react'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  const companyLinks = [
    { href: '/about', label: 'About Us' },
  ]

  const customerServiceLinks = [
    { href: '/help-center', label: 'Help Center' },
    { href: '/contact-us', label: 'Contact Us' }
  ]

  const policyLinks = [
    { href: '/privacy-policy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
  ]

  const socialLinks = [
    { icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
    { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
    { icon: Mail, href: '', label: 'Email' }
  ]

  return (
    <footer className="bg-[#111] text-white border-t border-[#333]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          
          {/* Brand Section (Wider on LG) */}
          <div className="lg:col-span-4 text-center sm:text-left">
            <Link href="/" className="flex items-center justify-center sm:justify-start space-x-3 mb-6">
              <span className="text-2xl font-serif font-bold tracking-tight">Cloud <span className="text-[#d4af37] italic">PerfumeBD</span></span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-sm mx-auto sm:mx-0">
              The premier destination for fragrance enthusiasts to discover, exchange, 
              and experience the world&apos;s finest perfumes.
            </p>
            
            {/* Newsletter */}
            <div className="max-w-sm mx-auto sm:mx-0">
               <h4 className="text-xs font-bold uppercase tracking-widest text-[#d4af37] mb-3">Subscribe</h4>
               <div className="flex gap-2">
                 <input 
                   type="email" 
                   placeholder="Email address" 
                   className="flex-1 bg-white/5 border border-white/10 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-[#d4af37] transition-colors"
                 />
                 <button className="bg-[#d4af37] text-[#111] px-4 py-2 rounded-md text-sm font-bold hover:bg-[#b8941f] transition-colors">
                   Join
                 </button>
               </div>
            </div>
          </div>

          {/* Links Section */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* Marketplace */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4">Marketplace</h3>
              <ul className="space-y-3">
                <li><Link href="/perfumes" className="text-gray-400 hover:text-[#d4af37] transition-colors text-sm">Explore Fragrances</Link></li>
                <li><Link href="/dashboard/listings" className="text-gray-400 hover:text-[#d4af37] transition-colors text-sm">Sell Perfume</Link></li>
                <li><Link href="/new-arrivals" className="text-gray-400 hover:text-[#d4af37] transition-colors text-sm">New Arrivals</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4">Support</h3>
              <ul className="space-y-3">
                 {customerServiceLinks.map(link => (
                   <li key={link.href}><Link href={link.href} className="text-gray-400 hover:text-[#d4af37] transition-colors text-sm">{link.label}</Link></li>
                 ))}
                 {companyLinks.map(link => (
                   <li key={link.href}><Link href={link.href} className="text-gray-400 hover:text-[#d4af37] transition-colors text-sm">{link.label}</Link></li>
                 ))}
              </ul>
            </div>

            {/* Socials */}
            <div>
               <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4">Follow Us</h3>
               <div className="flex gap-4">
                 {socialLinks.map((social) => {
                   const Icon = social.icon;
                   return (
                     <a key={social.label} href={social.href} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#d4af37] hover:text-[#111] transition-all duration-300">
                       <Icon size={18} />
                     </a>
                   )
                 })}
               </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-[#222] bg-[#0d0d0d]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-500">© {currentYear} Cloud PerfumeBD. All rights reserved.</p>
            <div className="flex gap-6">
               {policyLinks.map(link => (
                 <Link key={link.href} href={link.href} className="text-xs text-gray-500 hover:text-white transition-colors">{link.label}</Link>
               ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer