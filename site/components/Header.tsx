import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { FiBarChart2 } from 'react-icons/fi';
import { FaBell } from 'react-icons/fa';
import { IoIosPeople } from 'react-icons/io';

interface HeaderProps {
  pageTitle: string;
  description?: string;
  customElement?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ pageTitle, description, customElement }) => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogoClick = () => {
    router.push('/dashboard');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsMenuOpen(false);
    setIsDropdownOpen(false);
  };

  return (
    <header className="relative flex flex-wrap items-center justify-between py-4 mb-2 border-b border-gray-300 dark:border-gray-700 px-2">
      <div className="flex items-center space-x-4">
        <div className="cursor-pointer dark:hidden" onClick={handleLogoClick}>
          <Image src="/logo-color.svg" alt="Logo" width={150} height={50} />
        </div>
        <div className="cursor-pointer hidden dark:block" onClick={handleLogoClick}>
          <Image src="/logo-white.svg" alt="Logo" width={150} height={50} />
        </div>
      </div>
      <div className="flex-grow flex flex-col items-center sm:items-center text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pageTitle}</h1>
        {description && (
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{description}</p>
        )}
        <div className="hidden lg:flex space-x-4 mt-4">
          <button
            onClick={() => handleNavigation('/dashboard')}
            title="Dashboard"
            className="flex items-center space-x-2 p-2 border border-gray-300 rounded-full text-gray-900 dark:text-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 transition duration-300"
          >
            <FiBarChart2 className="text-xl" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => handleNavigation('/staff')}
            title="Staff List"
            className="flex items-center space-x-2 p-2 border border-gray-300 rounded-full text-gray-900 dark:text-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 transition duration-300"
          >
            <IoIosPeople className="text-xl" />
            <span>Staff List</span>
          </button>
          <div className="relative">
            <button
              onClick={toggleDropdown}
              title="Notifications"
              className="flex items-center space-x-2 p-2 border border-gray-300 rounded-full text-gray-900 dark:text-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900"
            >
              <FaBell className="text-xl" />
              <span>Notifications</span>
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded shadow-lg z-50">
                <button
                  onClick={() => handleNavigation('/alerts')}
                  className="block w-full px-4 py-2 text-left text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Budget Alerts
                </button>
                <button
                  onClick={() => handleNavigation('/project-end-alerts')}
                  className="block w-full px-4 py-2 text-left text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Contract Ending (POP) Alerts
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="lg:hidden flex items-center">
        <button onClick={toggleMenu} className="focus:outline-none">
          <svg className="w-10 h-10 text-gray-900 dark:text-gray-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16m-7 6h7'}></path>
          </svg>
        </button>
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 shadow-lg z-50">
            <button
              onClick={() => handleNavigation('/dashboard')}
              title="Dashboard"
              className="w-full flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 mb-2 transition duration-300"
            >
              <FiBarChart2 className="text-xl" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => handleNavigation('/staff')}
              title="Staff List"
              className="w-full flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 mb-2 transition duration-300"
            >
              <IoIosPeople className="text-xl" />
              <span>Staff List</span>
            </button>
            <button
              onClick={() => handleNavigation('/alerts')}
              title="Budget Alerts"
              className="w-full flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 mb-2 transition duration-300"
            >
              <FaBell className="text-xl" />
              <span>Budget Alerts</span>
            </button>
            <button
              onClick={() => handleNavigation('/project-end-alerts')}
              title="Project Completion Alerts"
              className="w-full flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 mb-2 transition duration-300"
            >
              <FaBell className="text-xl" />
              <span>Contract Ending (POP) Alerts</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
