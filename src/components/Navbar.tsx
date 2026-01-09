import React, { useState } from 'react';
import { Menu, X, Laptop, Home, Info, Mail, LogIn } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { Link as ScrollLink } from 'react-scroll';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 h-[80px] flex justify-between items-center px-6 md:px-10 sticky top-0 left-0 w-full z-50 shadow-lg">
      <div className="flex items-center space-x-2">
        <Laptop className="w-8 h-8 text-yellow-400" />
        <span className="text-white text-xl font-bold">SiteCrafter</span>
      </div>

      <div className="nav-items hidden md:flex items-center space-x-8">
        <ul className="flex items-center space-x-8">
          {[
            { icon: <Home className="w-4 h-4" />, text: 'Home', to: 'home' },
            { icon: <Info className="w-4 h-4" />, text: 'About', to: 'about' },
            { icon: <Mail className="w-4 h-4" />, text: 'Contact', to: 'contact' },
          ].map((item) => (
            <ScrollLink
              key={item.to}
              to={item.to}
              smooth={true}
              duration={500}
              className="cursor-pointer group"
            >
              <li className="text-gray-300 hover:text-yellow-400 transition-colors duration-300 flex items-center space-x-2">
                {item.icon}
                <span>{item.text}</span>
              </li>
            </ScrollLink>
          ))}
        </ul>
        <RouterLink to="/login">
          <button className="flex items-center space-x-2 text-white bg-yellow-500 hover:bg-yellow-400 transition-colors duration-300 rounded-full px-6 py-2 text-sm font-semibold">
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>
        </RouterLink>
      </div>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden text-white"
      >
        <Menu className="w-6 h-6" />
      </button>

      <div
        className={`fixed top-0 left-0 h-full w-full bg-gray-900/95 backdrop-blur-sm transition-all duration-300 ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        } md:hidden`}
      >
        <div className="h-full w-64 bg-gray-900 p-6">
          <div className="flex justify-between items-center mb-8">
            <Laptop className="w-8 h-8 text-yellow-400" />
            <button onClick={() => setIsOpen(false)}>
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          <ul className="space-y-6">
            {[
              { icon: <Home className="w-5 h-5" />, text: 'Home', to: 'home' },
              { icon: <Info className="w-5 h-5" />, text: 'About', to: 'about' },
              { icon: <Mail className="w-5 h-5" />, text: 'Contact', to: 'contact' },
            ].map((item) => (
              <li key={item.text} className="text-gray-300 hover:text-yellow-400 transition-colors duration-300">
                <ScrollLink
                  to={item.to}
                  smooth={true}
                  duration={500}
                  className="flex items-center space-x-3 cursor-pointer"
                  onClick={() => setIsOpen(false)}
                >
                  {item.icon}
                  <span>{item.text}</span>
                </ScrollLink>
              </li>
            ))}
            <li className="text-gray-300 hover:text-yellow-400 transition-colors duration-300">
              <RouterLink
                to="/login"
                className="flex items-center space-x-3 cursor-pointer"
                onClick={() => setIsOpen(false)}
              >
                <LogIn className="w-5 h-5" />
                <span>Sign In</span>
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Navbar;