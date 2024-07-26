import React, { useState } from 'react';
import { useRouter } from 'next/router';

const Menu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  return (
    <nav className="relative">
      <div className="flex justify-between items-center p-4">
        <div className="lg:hidden">
          <button onClick={toggleMenu} className="focus:outline-none">
            <svg className="w-10 h-10 text-black dark:text-gray-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16m-7 6h7'}></path>
            </svg>
          </button>
        </div>
        <div className={`hidden lg:flex flex-col lg:flex-row lg:items-center lg:space-x-4 mx-auto`}>
          <button onClick={() => handleNavigation('/dashboard')} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition duration-300">
            Dashboard
          </button>
          <button onClick={() => handleNavigation('/staff')} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition duration-300">
            Staff List
          </button>
          <button onClick={() => handleNavigation('/alerts')} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition duration-300">
            Alerts
          </button>
          <button onClick={() => handleNavigation('/project-end-alerts')} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition duration-300">
            Project End Alerts
          </button>
          <button onClick={() => handleNavigation('/admin/dashboard')} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 transition duration-300">
            Admin Dashboard
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="lg:hidden p-4">
          <button onClick={() => handleNavigation('/dashboard')} className="block w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 mb-2 transition duration-300">
            Dashboard
          </button>
          <button onClick={() => handleNavigation('/staff')} className="block w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 mb-2 transition duration-300">
            Staff List
          </button>
          <button onClick={() => handleNavigation('/alerts')} className="block w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 mb-2 transition duration-300">
            Alerts
          </button>
          <button onClick={() => handleNavigation('/project-end-alerts')} className="block w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 mb-2 transition duration-300">
            Project End Alerts
          </button>
          <button onClick={() => handleNavigation('/admin/dashboard')} className="block w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 mb-2 transition duration-300">
            Admin Dashboard
          </button>
        </div>
      )}
    </nav>
  );
};

export default Menu;
