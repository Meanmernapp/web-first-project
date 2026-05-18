import React, { useEffect, useState } from 'react';
import axios from 'axios';
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

  const thClass = 'cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted transition-colors hover:text-fg';
  const tdClass = 'border-b border-line px-4 py-2.5 text-sm text-fg';

  const renderTable = (userType: 'Full Time' | 'Contractor', showType: 'Active' | 'Terminated') => {
    const filteredUsers = sortedUsers.filter(user => user.employeeType === userType && user.status === showType);

    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-01-01`;
    const endDate = `${currentYear}-12-31`;

    const setShow =
      userType === 'Full Time'
        ? (v: 'Active' | 'Terminated') => setShowFullTime(v)
        : (v: 'Active' | 'Terminated') => setShowContractors(v);

    return (
      <section className="mb-10">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-fg">{userType} employees</h2>
          <div
            className="inline-flex w-fit rounded-xl border border-line bg-surface-inset p-1 shadow-inner"
            role="group"
            aria-label={`${userType} status filter`}
          >
            <button
              type="button"
              className={showType === 'Active' ? 'btn-segment btn-segment-active' : 'btn-segment btn-segment-inactive'}
              onClick={() => setShow('Active')}
            >
              Active
            </button>
            <button
              type="button"
              className={showType === 'Terminated' ? 'btn-segment btn-segment-active' : 'btn-segment btn-segment-inactive'}
              onClick={() => setShow('Terminated')}
            >
              Inactive
            </button>
          </div>
        </div>
        <div className="table-shell max-h-[70vh] overflow-auto">
          <table className="table-data min-w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 border-b border-line bg-surface-inset">
              <tr>
                <th scope="col" onClick={() => requestSort('username')} className={thClass}>Username</th>
                <th scope="col" onClick={() => requestSort('employeeType')} className={thClass}>Employee type</th>
                <th scope="col" onClick={() => requestSort('title')} className={thClass}>Title</th>
                <th scope="col" onClick={() => requestSort('supervisor')} className={thClass}>Supervisor</th>
                <th scope="col" onClick={() => requestSort('utilization')} className={`${thClass} whitespace-nowrap`}>
                  <span className="inline-flex items-center gap-2">
                    Utilization (%)
                    <Tippy
                      content="Utilization % = non-WebFirst hours (all hours except WEBFIRST-*) ÷ total hours for 2024 months in the dataset."
                      theme="dark"
                      placement="top"
                    >
                      <span className="text-accent hover:text-accent-hover" tabIndex={0} role="button" aria-label="Utilization help">
                        <FaInfoCircle />
                      </span>
                    </Tippy>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface-elevated">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`${tdClass} py-8 text-center text-fg-muted`}>
                    {fetchError || 'No data available.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.username}>
                    <td className={tdClass}>
                      <Link
                        href={`/users/${user.username}?startDate=${startDate}&endDate=${endDate}`}
                        className="font-medium text-accent hover:text-accent-hover hover:underline"
                      >
                        {user.username}
                      </Link>
                    </td>
                    <td className={`${tdClass} text-fg-muted`}>{user.employeeType}</td>
                    <td className={tdClass}>{user.title}</td>
                    <td className={`${tdClass} text-fg-muted`}>{user.supervisor}</td>
                    <td className={`${tdClass} tabular-nums text-fg`}>{userUtilizations[user.username]?.toFixed(2) ?? 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-surface-inset">
                <td colSpan={5} className="px-4 py-2 text-center text-xs text-fg-subtle">
                  End of {userType} employees
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-surface">
      <Header pageTitle={`Staff list — ${new Date().getFullYear()}`} />
      <div className="app-shell">
        {fetchError && (
          <div className="ui-card mb-6 border-rose-500/40 bg-rose-950/25 px-4 py-3 text-sm text-rose-100">
            {fetchError}
          </div>
        )}
        {loading && (
          <div className="ui-card mb-6 px-4 py-8 text-center text-fg-muted">
            Loading utilization…
          </div>
        )}
        {renderTable('Full Time', showFullTime)}
        {renderTable('Contractor', showContractors)}
      </div>
      <ToastContainer theme="dark" />
    </div>
  );
};

export default Staff;
