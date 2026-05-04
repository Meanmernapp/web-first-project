import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '../../components/Header';
import DateRangePickerModal from '../../components/DateRangePickerModal';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import UserInfo from '../../components/UserInfo';
import ProjectParticipationPieChart from '../../components/ProjectParticipationPieChart';
import HoursOverTimeBarChart from '../../components/HoursOverTimeBarChart';
import { parseISO, isValid, format, isWithinInterval, startOfYear, endOfYear } from 'date-fns';
import { RangeKeyDict } from 'react-date-range';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

interface MonthlyUserHours {
  projectName: string;
  [month: string]: number | string;
}

interface Totals {
  [month: string]: number;
}

interface Utilizations {
  [month: string]: number;
}

interface User {
  username: string;
  employeeType: string;
  firstName: string;
  lastName: string;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
  key: string;
}
interface LatestDates {
  createdAt: string;
  updatedAt: string;
}

const UserPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProjects, setUserProjects] = useState<MonthlyUserHours[]>([]);
  const [allUserProjects, setAllUserProjects] = useState<MonthlyUserHours[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [allMonths, setAllMonths] = useState<string[]>([]);
  const [totals, setTotals] = useState<Totals>({});
  const [allTotals, setAllTotals] = useState<Totals>({});
  const [utilizations, setUtilizations] = useState<Utilizations>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<LatestDates>({
    createdAt: new Date().toDateString(),
    updatedAt: new Date().toDateString()
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange[]>([
    {
      startDate: new Date('2023-01-01'),
      endDate: new Date(),
      key: 'selection'
    }
  ]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'projectName', direction: 'asc' });
  const [totalUtilization, setTotalUtilization] = useState<number>(0);
  const router = useRouter();
  const { username, startDate, endDate, filter } = router.query as { username: string; startDate?: string; endDate?: string; filter?: string };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userResponse = await axios.get(`${baseUrl}/api/users/${username}`, {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
          },
        });
        
        setUser(userResponse.data);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setUser({ username, employeeType: 'Unknown', firstName: '', lastName: '' });
        } else {
          setError('Failed to fetch user data.');
        }
      }
    };

    const fetchTimeEntries = async () => {
      try {
        // Fetch user time entries and recent time entry in parallel
        const [entriesResponse, recentEntryResponse] = await Promise.all([
          axios.get(`${baseUrl}/api/user-time-entries/${encodeURIComponent(username)}`, {
            headers: {
              'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
            },
          }),
          axios.get(`${baseUrl}/api/getRecentTimeEntry`, {
            headers: {
              'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
            },
          }),
        ]);
    
        // Destructure the responses
        const { userProjects, months } = entriesResponse.data;
    
        // Get the recent entry date from the response
        const recentEntryDate = recentEntryResponse.data;
    
        // Format the recent entry date using toLocaleDateString
        const formattedRecentDate = new Date(recentEntryDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          timeZone: 'UTC',  // Ensures the date is interpreted in UTC
        });
    
        // Set the "Data as of" field
        setLastUpdated({ createdAt: formattedRecentDate, updatedAt: formattedRecentDate });
    
        // Filter valid months (from 1970 onwards)
        let validMonths = months.filter((month: string) => {
          const date = parseISO(month);
          return isValid(date) && date.getFullYear() > 1970;
        });
    
        // Handle filtering by start and end date or by a specific year (e.g., 2024)
        if (startDate && endDate) {
          const start = parseISO(startDate);
          const end = parseISO(endDate);
          validMonths = validMonths.filter((month: string) => {
            const date = parseISO(month);
            return isWithinInterval(date, { start, end });
          });
          setDateRange([{ startDate: start, endDate: end, key: 'selection' }]);
        } else if (filter === '2024') {
          validMonths = validMonths.filter((month: string) => {
            const date = parseISO(month);
            return isValid(date) && date.getFullYear() === 2024;
          });
          setDateRange([{ startDate: startOfYear(new Date('2024-01-01')), endDate: endOfYear(new Date('2024-12-31')), key: 'selection' }]);
        }
    
        // Filter user projects based on valid months
        const filteredUserProjects = userProjects
          .map((project: MonthlyUserHours) => {
            const filteredProject: MonthlyUserHours = {
              projectName: project.projectName,
              contractType: project.contractType,
            };
            validMonths.forEach((month: string) => {
              if (project[month] !== undefined) {
                filteredProject[month] = project[month];
              }
            });
            return filteredProject;
          })
          .filter((project: MonthlyUserHours) => {
            return validMonths.some((month: string) => project[month] !== undefined && project[month] !== 0 && project[month] !== '-');
          });
    
        // If no valid projects, reset the state and return
        if (filteredUserProjects.length === 0) {
          setError(null); // Reset the error since no data is different from a fetch error
          setLoading(false);
          setUserProjects([]);
          setMonths(validMonths);
          return;
        }
    
        // Calculate totals for each month
        const filteredTotals: Totals = {};
        validMonths.forEach((month: string) => {
          if (entriesResponse.data.totals[month] !== undefined) {
            filteredTotals[month] = entriesResponse.data.totals[month];
          }
        });
    
        // Calculate monthly utilization for each valid month
        const calculateMonthlyUtilization = (month: string): number => {
          let webFirstMonthHours = 0;
          let totalMonthHours = 0;
    
          filteredUserProjects.forEach((project: MonthlyUserHours) => {
            if (project[month] !== undefined && project[month] !== '-') {
              const hours = Number(project[month]);
              totalMonthHours += hours;
              if (project.projectName.startsWith('WEBFIRST')) {
                webFirstMonthHours += hours;
              }
            }
          });
    
          return totalMonthHours > 0 ? ((totalMonthHours - webFirstMonthHours) / totalMonthHours) * 100 : 0;
        };
    
        // Calculate utilization for each valid month
        const filteredUtilizations: Utilizations = {};
        validMonths.forEach((month: string) => {
          filteredUtilizations[month] = calculateMonthlyUtilization(month);
        });
    
        // Update the state with the fetched data
        setAllUserProjects(filteredUserProjects);
        setAllMonths(validMonths);
        setAllTotals(filteredTotals);
        setUserProjects(filteredUserProjects);
        setMonths(validMonths);
        setTotals(filteredTotals);
        setUtilizations(filteredUtilizations);
        setLoading(false);
    
        // Calculate the total utilization
        const totalUtilization = (() => {
          let totalHours = 0;
          let totalWebFirstHours = 0;
    
          validMonths.forEach((month: string) => {
            totalHours += filteredTotals[month] ?? 0;
            filteredUserProjects.forEach((project: MonthlyUserHours) => {
              if (project.projectName.startsWith('WEBFIRST') && project[month] !== '-' && project[month] !== undefined) {
                totalWebFirstHours += Number(project[month]);
              }
            });
          });
    
          return totalHours > 0 ? ((totalHours - totalWebFirstHours) / totalHours) * 100 : 0;
        })();
    
        // Set the total utilization
        setTotalUtilization(totalUtilization);
    
      } catch (error) {
        setError('Failed to fetch time entries.');
        setLoading(false);
      }
    };
    
    

    if (username) {
      fetchUserData();
      fetchTimeEntries();
    }
  }, [username, filter, startDate, endDate]);

  const applyFilter = (startDate: Date, endDate: Date) => {
    const filteredMonths = allMonths.filter((month: string) => {
      const date = parseISO(month);
      return isWithinInterval(date, { start: startDate, end: endDate });
    });

    const filteredUserProjects = allUserProjects.map((user: MonthlyUserHours) => {
      const filteredUser: MonthlyUserHours = { projectName: user.projectName };
      filteredMonths.forEach((month: string) => {
        filteredUser[month] = user[month] ?? 0;
      });
      return filteredUser;
    }).filter((project: MonthlyUserHours) => {
      return filteredMonths.some((month: string) => project[month] !== undefined && project[month] !== 0 && project[month] !== '-');
    });

    const filteredTotals = filteredMonths.reduce((acc, month: string) => {
      acc[month] = allTotals[month] ?? 0;
      return acc;
    }, {} as { [month: string]: number });

    const filteredUtilizations = filteredMonths.reduce((acc: Utilizations, month: string) => {
      acc[month] = utilizations[month];
      return acc;
    }, {} as Utilizations);

    const totalUtilization = (() => {
      let totalHours = 0;
      let totalWebFirstHours = 0;

      filteredMonths.forEach((month: string) => {
        totalHours += filteredTotals[month] ?? 0;
        filteredUserProjects.forEach((project: MonthlyUserHours) => {
          if (project.projectName.startsWith('WEBFIRST') && project[month] !== '-' && project[month] !== undefined) {
            totalWebFirstHours += Number(project[month]);
          }
        });
      });

      return totalHours > 0
        ? ((totalHours - totalWebFirstHours) / totalHours) * 100
        : 0;
    })();

    setMonths(filteredMonths);
    setUserProjects(filteredUserProjects);
    setTotals(filteredTotals);
    setTotalUtilization(totalUtilization);
  };

  const handleApplyDateRange = (ranges: RangeKeyDict) => {
    const selection = ranges.selection;
    if (selection.startDate && selection.endDate) {
      const start = selection.startDate.toISOString().split('T')[0];
      const end = selection.endDate.toISOString().split('T')[0];
      setDateRange([{ startDate: selection.startDate, endDate: selection.endDate, key: 'selection' }]);
      applyFilter(selection.startDate, selection.endDate);
      router.push({
        pathname: router.pathname,
        query: { username, startDate: start, endDate: end },
      });
      setIsModalOpen(false);
    }
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedUserProjects = [...userProjects].sort((a, b) => {
    if (sortConfig.key === 'total') {
      const aTotal = months.reduce((total, month) => total + (a[month] !== '-' ? Number(a[month] ?? 0) : 0), 0);
      const bTotal = months.reduce((total, month) => total + (b[month] !== '-' ? Number(b[month] ?? 0) : 0), 0);
      return sortConfig.direction === 'asc' ? aTotal - bTotal : bTotal - aTotal;
    } else {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    }
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-fg-muted">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface p-6">
        <div className="ui-card border-rose-500/40 bg-rose-950/25 p-4 text-rose-100">{error}</div>
      </div>
    );
  }

  const totalHours = Object.values(totals).reduce((total, monthTotal) => total + monthTotal, 0);
  const displayName = user?.employeeType === 'Contractor' ? `${user?.username} (C)` : user?.username;

  const contractLabel = (p: MonthlyUserHours) =>
    (p as { contractType?: string }).contractType === 'Time and Materials' ? '(T&M)' : '(FFP)';

  return (
    <div className="min-h-screen w-full bg-surface">
      <Header pageTitle={`User report: ${displayName}`} />

      <ToastContainer theme="dark" />
      <div className="app-shell">
        <UserInfo username={username} totalUtilization={totalUtilization} />
        <div className="ui-card mt-8 overflow-hidden p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-fg">Hours by project</h2>
              <p className="mt-1 text-sm text-fg-muted">Data as of: {lastUpdated.createdAt}</p>
            </div>
            <button type="button" className="btn-primary shrink-0" onClick={() => setIsModalOpen(true)}>
              Date range
            </button>
          </div>
          <div className="table-shell max-h-[min(70vh,880px)] overflow-auto">
        <table className="table-data min-w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-line bg-surface-inset">
            <tr>
              <th
                scope="col"
                className="cursor-pointer px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted hover:text-fg"
                onClick={() => requestSort('projectName')}
              >
                Project
              </th>
              {months.map((month: string) => (
                <th
                  key={month}
                  scope="col"
                  className="cursor-pointer whitespace-nowrap px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-fg-muted hover:text-fg"
                  onClick={() => requestSort(month)}
                >
                  {format(parseISO(month), 'MMMM yyyy')}
                </th>
              ))}
              <th
                scope="col"
                className="cursor-pointer px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-fg-muted hover:text-fg"
                onClick={() => requestSort('total')}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-surface-elevated">
            {sortedUserProjects.length === 0 ? (
              <tr>
                <td colSpan={months.length + 2} className="border-b border-line px-3 py-8 text-center text-fg-muted">
                  No data available for this user.
                </td>
              </tr>
            ) : (
              sortedUserProjects.map((project: MonthlyUserHours) => (
                <tr key={project.projectName}>
                  <td className="border-b border-line px-3 py-2 text-left">
                    <Link
                      href={`/project/${project.projectName}`}
                      className="font-medium text-accent hover:text-accent-hover hover:underline"
                    >
                      {project.projectName}{' '}
                      <span className="font-normal text-fg-muted">{contractLabel(project)}</span>
                    </Link>
                  </td>
                  {months.map((month: string) => (
                    <td key={month} className="border-b border-line px-3 py-2 text-center tabular-nums text-fg-muted">
                      {project[month] !== '-' ? Number(project[month] ?? 0).toFixed(2) : project[month]}
                    </td>
                  ))}
                  <td className="border-b border-line px-3 py-2 text-center tabular-nums text-fg">
                    {months.reduce((total, month: string) => total + (project[month] !== '-' ? Number(project[month] ?? 0) : 0), 0).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>

          <tfoot className="border-t border-line bg-surface-inset text-xs">
            <tr className="font-semibold uppercase tracking-wide text-fg-muted">
              <th className="px-3 py-2.5 text-left">Total</th>
              {months.map((month: string) => (
                <th key={month} className="px-3 py-2.5 text-center tabular-nums text-fg">
                  {(totals[month] ?? 0).toFixed(2)}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center tabular-nums text-fg">
                {totalHours.toFixed(2)}
              </th>
            </tr>
            <tr className="text-fg-muted">
              <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide">Utilization</th>
              {months.map((month: string) => (
                <th
                  key={month}
                  className={`px-3 py-2.5 text-center tabular-nums font-medium ${
                    utilizations[month] >= 80 ? 'text-emerald-400' : utilizations[month] >= 60 ? 'text-amber-300' : 'text-rose-400'
                  }`}
                >
                  {utilizations[month].toFixed(2)}%
                </th>
              ))}
              <th className="px-3 py-2.5 text-center tabular-nums font-medium text-accent">{totalUtilization.toFixed(2)}%</th>
            </tr>
          </tfoot>
        </table>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-4 md:flex-row">
          <div className="ui-card w-full p-4 md:w-1/2">
            <ProjectParticipationPieChart username={username} dateRange={dateRange} />
          </div>
          <div className="ui-card w-full p-4 md:w-1/2">
            <HoursOverTimeBarChart username={username} dateRange={dateRange} />
          </div>
        </div>
        <DateRangePickerModal
          isOpen={isModalOpen}
          onRequestClose={() => setIsModalOpen(false)}
          initialRanges={dateRange}
          onApply={handleApplyDateRange}
          overallStartDate={new Date('2023-01-01')}
          overallEndDate={new Date()}
        />
      </div>
    </div>
  );
};

export default UserPage;