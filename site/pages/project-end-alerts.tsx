import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import axios from 'axios';
import Link from 'next/link';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Project {
  name: string;
  status?: string;
  pm?: string;
  periodOfPerformance?: {
    startDate: string;
    endDate: string;
  };
}

interface User {
  username: string;
  email: string;
}

interface AlertConfig {
  projectName: string;
  managerEmail: string;
  customEmails: string[];
  lastAlertSent?: string;
}

type SortKey = keyof Project | keyof AlertConfig | 'selected' | 'daysRemaining';

const ProjectEndAlerts: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [showActive, setShowActive] = useState<boolean>(true);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

        const [projectsRes, usersRes, alertConfigsRes] = await Promise.all([
          axios.get(`${baseUrl}/api/projects`, {
            headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY! },
          }),
          axios.get(`${baseUrl}/api/users`, {
            headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY! },
          }),
          axios.get(`${baseUrl}/api/project-end-alerts`, {
            headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY! },
          }),
        ]);

        setProjects(projectsRes.data);
        setUsers(usersRes.data);
        setAlertConfigs(alertConfigsRes.data);
        setSelectedProjects(new Set(alertConfigsRes.data.map((config: AlertConfig) => config.projectName)));
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to fetch data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getManagerEmail = (projectName: string) => {
    const project = projects.find(proj => proj.name === projectName);
    if (project) {
      const user = users.find(user => user.username === project.pm);
      return user ? user.email : '';
    }
    return '';
  };

  const calculateDaysRemaining = (endDate: string): number => {
    const today = new Date();
    const end = new Date(endDate);
    const timeDiff = end.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const updateAlertConfig = async (alertConfig: AlertConfig) => {
    const url = `/api/project-end-alerts/${alertConfig.projectName}`;
    const headers = {
      'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
      'Content-Type': 'application/json',
    };

    try {
      await axios.post(url, alertConfig, { headers });
      toast.success(`Alerts updated for project ${alertConfig.projectName}`);
    } catch (error) {
      console.error('Error updating alerts:', error);
      if (axios.isAxiosError(error) && error.response) {
        toast.error(`Error updating alerts: ${error.response.data.message}`);
      } else {
        toast.error('Error updating alerts: An unknown error occurred');
      }
    }
  };

  const removeAlertConfig = async (projectName: string) => {
    const url = `/api/project-end-alerts/${projectName}`;
    const headers = {
      'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
      'Content-Type': 'application/json',
    };

    try {
      await axios.delete(url, { headers });
      setAlertConfigs(prevConfigs => prevConfigs.filter(config => config.projectName !== projectName));
      toast.success(`Alerts removed for project ${projectName}`);
    } catch (error) {
      console.error(`Error removing alerts for project ${projectName}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        toast.error(`Error removing alerts: ${error.response.data.message}`);
      } else {
        toast.error('Error removing alerts: An unknown error occurred');
      }
    }
  };

  const toggleProjectSelection = async (projectName: string) => {
    const newSelectedProjects = new Set(selectedProjects);
    const isSelected = newSelectedProjects.has(projectName);

    if (isSelected) {
      newSelectedProjects.delete(projectName);
      await removeAlertConfig(projectName);
    } else {
      const projectManagerEmail = getManagerEmail(projectName);

      const alertConfig = {
        projectName,
        managerEmail: projectManagerEmail,
        customEmails: ['joema@example.com', 'sanjay@example.com'],
      };
      newSelectedProjects.add(projectName);
      setAlertConfigs([...alertConfigs, alertConfig]);
      await updateAlertConfig(alertConfig);
    }

    setSelectedProjects(newSelectedProjects);
  };

  const toggleSelectAllProjects = async () => {
    const filteredProjects = projects.filter(project =>
      showActive ? project.status?.toLowerCase() === 'active' : project.status?.toLowerCase() !== 'active'
    );

    if (selectedProjects.size === filteredProjects.length) {
      setSelectedProjects(new Set());
      await Promise.all(
        filteredProjects.map(project => removeAlertConfig(project.name))
      );
    } else {
      const newSelectedProjects = new Set(filteredProjects.map(project => project.name));
      setSelectedProjects(newSelectedProjects);

      await Promise.all(
        filteredProjects.map(async project => {
          const projectManagerEmail = getManagerEmail(project.name);

          const alertConfig = {
            projectName: project.name,
            managerEmail: projectManagerEmail,
            customEmails: ['joema@example.com', 'sanjay@example.com'],
          };

          await updateAlertConfig(alertConfig);
        })
      );
    }
  };

  const handleInputChange = (projectName: string, field: keyof AlertConfig, value: string | number | string[]) => {
    setAlertConfigs(prevConfigs =>
      prevConfigs.map(config =>
        config.projectName === projectName ? { ...config, [field]: value } : config
      )
    );
  };

  const handleEmailCheckboxChange = async (projectName: string, email: string, isChecked: boolean) => {
    const updatedConfigs = alertConfigs.map(config =>
      config.projectName === projectName
        ? {
            ...config,
            customEmails: isChecked
              ? [...config.customEmails, email]
              : config.customEmails.filter(e => e !== email),
          }
        : config
    );
    setAlertConfigs(updatedConfigs);
    const updatedConfig = updatedConfigs.find(config => config.projectName === projectName);
    if (updatedConfig) {
      await updateAlertConfig(updatedConfig);
    }
  };

  const filteredProjects = projects.filter(project =>
    showActive ? project.status?.toLowerCase() === 'active' : project.status?.toLowerCase() !== 'active'
  );

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (!sortConfig) return 0;
    const key = sortConfig.key as SortKey;

    let aValue: any, bValue: any;

    if (key === 'selected') {
      aValue = selectedProjects.has(a.name);
      bValue = selectedProjects.has(b.name);
    } else if (key === 'daysRemaining') {
      aValue = a.periodOfPerformance ? calculateDaysRemaining(a.periodOfPerformance.endDate) : 0;
      bValue = b.periodOfPerformance ? calculateDaysRemaining(b.periodOfPerformance.endDate) : 0;
    } else {
      aValue = (a[key as keyof Project] || '').toString();
      bValue = (b[key as keyof Project] || '').toString();
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  if (loading) {
    return <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (error) {
    return <div className="bg-red-500 text-white p-4">Error: {error}</div>;
  }

  return (
    <>
      <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
        <Header pageTitle="Project End Alerts" />
        <ToastContainer />
        <div className="mb-4 flex flex-col md:flex-row justify-between">
          <button
            onClick={toggleSelectAllProjects}
            className="mb-2 md:mb-0 py-2 px-4 bg-gray-500 dark:bg-indigo-600 hover:bg-gray-600 dark:hover:bg-indigo-700 text-white font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {selectedProjects.size === filteredProjects.length ? 'Deselect All' : 'Select All'}
          </button>
          <button
            onClick={() => setShowActive(!showActive)}
            className="py-2 px-4 bg-gray-500 dark:bg-indigo-600 hover:bg-gray-600 dark:hover:bg-indigo-700 text-white font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {showActive ? 'Show Inactive Projects' : 'Show Active Projects'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <form>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    scope="col"
                    className="px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('selected')}
                  >
                    Select
                  </th>
                  <th
                    scope="col"
                    className="px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    Project Name
                  </th>
                  <th
                    scope="col"
                    className="px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('managerEmail')}
                  >
                    Manager Email
                  </th>
                  <th
                    scope="col"
                    className="px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('customEmails')}
                  >
                    Custom Emails
                  </th>
                  <th
                    scope="col"
                    className="px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('daysRemaining')}
                  >
                    Days Remaining
                  </th>
                  <th
                    scope="col"
                    className="px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('lastAlertSent')}
                  >
                    Last Alert Sent
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedProjects.map(project => {
                  const alertConfig = alertConfigs.find(config => config.projectName === project.name) || {
                    projectName: project.name,
                    managerEmail: getManagerEmail(project.name),
                    customEmails: ['joema@example.com', 'sanjay@example.com'],
                  };
                  const isSelected = selectedProjects.has(project.name);
                  const daysRemaining = project.periodOfPerformance ? calculateDaysRemaining(project.periodOfPerformance.endDate) : 'N/A';
                  const lastAlertSent = alertConfig.lastAlertSent ? new Date(alertConfig.lastAlertSent).toLocaleDateString() : 'N/A';
                  const alertSentStyle = alertConfig.lastAlertSent ? 'text-green-500' : 'text-gray-500 dark:text-gray-200';

                  return (
                    <tr key={project.name}>
                      <td className="px-2 md:px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProjectSelection(project.name)}
                          className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                        />
                      </td>
                      <td className="px-2 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        <Link href={`/project/${encodeURIComponent(project.name)}`} legacyBehavior>
                          <a className="text-blue-500 hover:underline">{project.name}</a>
                        </Link>
                      </td>
                      <td className="px-2 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                        {alertConfig.managerEmail}
                      </td>
                      <td className="px-2 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                        <div>
                          <label className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={alertConfig.customEmails.includes('joema@example.com')}
                              onChange={(e) => handleEmailCheckboxChange(project.name, 'joema@example.com', e.target.checked)}
                              className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                            />
                            <span className="ml-2">joema@example.com</span>
                          </label>
                        </div>
                        <div>
                          <label className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={alertConfig.customEmails.includes('sanjay@example.com')}
                              onChange={(e) => handleEmailCheckboxChange(project.name, 'sanjay@example.com', e.target.checked)}
                              className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                            />
                            <span className="ml-2">sanjay@example.com</span>
                          </label>
                        </div>
                      </td>
                      <td className="px-2 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                        {daysRemaining}
                      </td>
                      <td className={`px-2 md:px-6 py-4 whitespace-nowrap text-sm ${alertSentStyle}`}>
                        {lastAlertSent}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </form>
        </div>
      </div>
    </>
  );
};

export default ProjectEndAlerts;
