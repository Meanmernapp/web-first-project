import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '../components/Header';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { FaInfoCircle } from 'react-icons/fa';

type User = {
  username: string;
  firstName: string;
  lastName: string;
  employeeType: string;
  title: string;
  supervisor: string;
  status: 'Active' | 'Terminated';
};

type UserTimeEntriesResponse = {
  userProjects: { projectName: string;[month: string]: number | string }[];
  months: string[];
  totals: { [month: string]: number };
};

const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
const Staff: React.FC = () => {
  const router = useRouter();
  const [sortConfig, setSortConfig] = useState<{ key: keyof User | 'utilization'; direction: 'ascending' | 'descending' } | null>(null);
  const [showContractors, setShowContractors] = useState<'Active' | 'Terminated'>('Active');
  const [showFullTime, setShowFullTime] = useState<'Active' | 'Terminated'>('Active');
  const [users, setUsers] = useState<User[]>([]);
  const [userUtilizations, setUserUtilizations] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);



  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userRes = await axios.get(`${baseUrl}/api/users`, {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
          },
        });
        setUsers(userRes.data);
      } catch (error) {
        setFetchError('Error fetching users.');
      }
    };

    fetchUsers();
  }, [baseUrl]);

  const fetchUserTimeEntries = async (username: string) => {
    try {
      const res = await axios.get(`${baseUrl}/api/user-time-entries/${encodeURIComponent(username)}`, {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
        },
      });
      console.log(res.data)
      return res.data as UserTimeEntriesResponse;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      } else {
        return null;
      }
    }
  };
  useEffect(() => {
    const calculateUtilization = async () => {
      setLoading(true);
      setFetchError(null);

      try {
        const utilizationPromises = users.map(async (user) => {
          const timeEntries = await fetchUserTimeEntries(user.username);
          if (!timeEntries) return [user.username, 0];

          const { totalHours, webFirstHours } = timeEntries.userProjects.reduce(
            (acc, project) => {
              Object.entries(project).forEach(([month, value]) => {
                if (month !== 'projectName' && month.startsWith('2024')) {
                  const hours = Number(value);
                  if (!isNaN(hours)) {
                    acc.totalHours += hours;
                    if (project.projectName.startsWith('WEBFIRST')) {
                      acc.webFirstHours += hours;
                    }
                  }
                }
              });
              return acc;
            },
            { totalHours: 0, webFirstHours: 0 }
          );

          const utilizationPercentage = totalHours ? ((totalHours - webFirstHours) / totalHours) * 100 : 0;
          return [user.username, utilizationPercentage];
        });

        const settledResults = await Promise.allSettled(utilizationPromises);
        const successfulResults = settledResults
          .filter((result) => result.status === 'fulfilled')
          .map((result) => (result as PromiseFulfilledResult<[string, number]>).value);

        const utilization = Object.fromEntries(successfulResults);
        setUserUtilizations(utilization);
      } catch (error) {
        console.error('Error calculating utilization:', error);
        setFetchError('Error calculating utilization.');
      } finally {
        setLoading(false);
      }
    };

    if (users.length > 0) {
      calculateUtilization();
    }
  }, [baseUrl, users]);
  const sortedUsers = React.useMemo(() => {
    if (!users) return [];
    let sortableUsers = [...users];
    if (sortConfig !== null) {
      sortableUsers.sort((a, b) => {
        if (sortConfig.key === 'utilization') {
          const aUtilization = userUtilizations[a.username] ?? 0;
          const bUtilization = userUtilizations[b.username] ?? 0;
          if (aUtilization < bUtilization) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (aUtilization > bUtilization) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
          return 0;
        } else {
          if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
          return 0;
        }
      });
    }
    return sortableUsers;
  }, [users, sortConfig, userUtilizations]);

  const requestSort = (key: keyof User | 'utilization') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const renderTable = (userType: 'Full Time' | 'Contractor', showType: 'Active' | 'Terminated') => {
    const filteredUsers = sortedUsers.filter(user => user.employeeType === userType && user.status === showType);

    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-01-01`;
    const endDate = `${currentYear}-12-31`;

    return (
      <div className="overflow-x-auto shadow-lg rounded-lg mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-black dark:text-white">{userType} Employees</h2>
          <div>
            <button
              className={`px-4 py-2 rounded ${showType === 'Active' ? 'bg-blue-500 text-white' : 'bg-gray-300 dark:bg-gray-600 dark:text-gray-300'}`}
              onClick={() => userType === 'Full Time' ? setShowFullTime('Active') : setShowContractors('Active')}
            >
              Active
            </button>
            <button
              className={`ml-2 px-4 py-2 rounded ${showType === 'Terminated' ? 'bg-blue-500 text-white' : 'bg-gray-300 dark:bg-gray-600 dark:text-gray-300'}`}
              onClick={() => userType === 'Full Time' ? setShowFullTime('Terminated') : setShowContractors('Terminated')}
            >
              Inactive
            </button>
          </div>
        </div>
        <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 text-left">
            <tr>
              <th onClick={() => requestSort('username')} className="py-2 px-4 border-b border-gray-300 dark:border-gray-600 cursor-pointer">Username</th>
              <th onClick={() => requestSort('employeeType')} className="py-2 px-4 border-b border-gray-300 dark:border-gray-600 cursor-pointer">Employee Type</th>
              <th onClick={() => requestSort('title')} className="py-2 px-4 border-b border-gray-300 dark:border-gray-600 cursor-pointer">Title</th>
              <th onClick={() => requestSort('supervisor')} className="py-2 px-4 border-b border-gray-300 dark:border-gray-600 cursor-pointer">Supervisor</th>
              <th onClick={() => requestSort('utilization')} className="py-2 px-4 border-b border-gray-300 dark:border-gray-600 cursor-pointer flex items-center">
                Utilization (%)
                <Tippy content="Utilization data is calculated based on the selected date range.">
                  <span className="ml-2 text-blue-500 cursor-pointer"><FaInfoCircle /></span>
                </Tippy>
              </th>
            </tr>
          </thead>
          <tbody className="text-black dark:text-white">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-2 px-4 text-center">{fetchError || 'No data available.'}</td>
              </tr>
            ) : (
              filteredUsers.map((user, index) => (
                <tr key={user.username} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}>
                  <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">
                    <Link href={`/users/${user.username}?startDate=${startDate}&endDate=${endDate}`} legacyBehavior>
                      <a className="text-blue-500 hover:underline">{user.username}</a>
                    </Link>
                  </td>
                  <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">{user.employeeType}</td>
                  <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">{user.title}</td>
                  <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">{user.supervisor}</td>
                  <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">{userUtilizations[user.username]?.toFixed(2) ?? 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="py-2 px-4 text-center text-black dark:text-white">
                End of {userType} Employees
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
      <Header pageTitle={`Staff List ${new Date().getFullYear()}`} />
      <div className="p-4">
        {fetchError && (
          <div className="text-red-500 dark:text-red-400 mb-4">{fetchError}</div>
        )}
        {loading && <div>Loading...</div>}
        {renderTable('Full Time', showFullTime)}
        {renderTable('Contractor', showContractors)}
      </div>
      <ToastContainer />
    </div>
  );
};

export default Staff;
