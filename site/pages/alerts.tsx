import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../components/Header';
import { ToastContainer, toast } from 'react-toastify';
import Link from 'next/link';
import 'react-toastify/dist/ReactToastify.css';

interface Project {
  name: string;
  description: string;
  status?: string;
  pm?: string;
}

interface User {
  username: string;
  email: string;
}

interface AlertConfig {
  projectName: string;
  managerEmail: string;
  customEmails: string[];
  lowAlert: number;
  highAlert: number;
  lastLowAlert?: string;
  lastHighAlert?: string;
}

type SortKey = keyof Project | keyof AlertConfig | 'selected';

const ProjectAlerts: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [showActive, setShowActive] = useState<boolean>(true);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
  const [alertConfigsState, setAlertConfigsState] = useState<AlertConfig[]>([]);

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
          axios.get(`${baseUrl}/api/project-alerts`, {
            headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY! },
          }),
        ]);

        const sortedProjects = projectsRes.data.sort((a: Project, b: Project) => a.name.localeCompare(b.name));
        setProjects(sortedProjects);
        setUsers(usersRes.data);
        setAlertConfigs(alertConfigsRes.data);
        setAlertConfigsState(alertConfigsRes.data);
        setSelectedProjects(new Set(alertConfigsRes.data.map((config: AlertConfig) => config.projectName)));
      } catch (error) {
        console.error('Error fetching data:', error);
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

  const updateAlertConfig = async (alertConfig: AlertConfig) => {
    const url = `/api/projects/${alertConfig.projectName}/alerts`;
    const headers = {
      'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
      'Content-Type': 'application/json',
    };

    try {
      await axios.post(url, alertConfig, { headers });
      toast.success(`Alerts updated for project ${alertConfig.projectName}`);
    } catch (error) {
      console.error('Error updating alerts:', error);
      toast.error('Error updating alerts');
    }
  };

  const removeAlertConfig = async (projectName: string) => {
    const url = `/api/projects/${projectName}/alerts`;
    const headers = {
      'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
      'Content-Type': 'application/json',
    };

    try {
      await axios.delete(url, { headers });
      toast.success(`Alerts removed for project ${projectName}`);
    } catch (error) {
      console.error(`Error removing alerts for project ${projectName}:`, error);
      toast.error('Error removing alerts');
    }
  };

  const fetchUpdatedAlertConfigs = async () => {
    try {
      const alertConfigsRes = await axios.get(`/api/project-alerts`, {
        headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY! },
      });
      setAlertConfigsState(alertConfigsRes.data);
    } catch (error) {
      console.error('Error fetching updated alert configs:', error);
      toast.error('Error fetching updated alert configs');
    }
  };

  const toggleProjectSelection = async (projectName: string) => {
    const newSelectedProjects = new Set(selectedProjects);
    const isSelected = newSelectedProjects.has(projectName);

    if (isSelected) {
      newSelectedProjects.delete(projectName);
      await removeAlertConfig(projectName);
    } else {
      const managerEmail = getManagerEmail(projectName);
      const alertConfig = {
        projectName,
        managerEmail: managerEmail,
        customEmails: ['jscott@webfirst.com', 'spatel@webfirst.com', 'kdriskell@webfirst.com'],
        lowAlert: 0.5,
        highAlert: 0.8,
      };
      newSelectedProjects.add(projectName);
      await updateAlertConfig(alertConfig);
    }

    await fetchUpdatedAlertConfigs();
    setSelectedProjects(newSelectedProjects);
  };

  const handleInputChange = (projectName: string, field: keyof AlertConfig, value: string | number | string[]) => {
    setAlertConfigsState(prevConfigs =>
      prevConfigs.map(config =>
        config.projectName === projectName ? { ...config, [field]: value } : config
      )
    );
  };

  const handleEmailCheckboxChange = async (projectName: string, email: string, isChecked: boolean) => {
    setAlertConfigsState(prevConfigs => {
      const updatedConfigs = prevConfigs.map(config =>
        config.projectName === projectName
          ? {
              ...config,
              customEmails: isChecked
                ? [...config.customEmails, email]
                : config.customEmails.filter(e => e !== email),
            }
          : config
      );
      const updatedConfig = updatedConfigs.find(config => config.projectName === projectName);
      if (updatedConfig) {
        updateAlertConfig(updatedConfig);
      }
      return updatedConfigs;
    });
  };

  const handleAlertThresholdChange = (projectName: string, field: keyof AlertConfig, value: number) => {
    if (!selectedProjects.has(projectName)) {
      toast.error('You must select the project before setting an alert value.');
      return;
    }

    setAlertConfigsState(prevConfigs =>
      prevConfigs.map(config =>
        config.projectName === projectName ? { ...config, [field]: value / 100 } : config
      )
    );

    const updatedConfig = alertConfigsState.find(config => config.projectName === projectName);
    if (updatedConfig) {
      updateAlertConfig({ ...updatedConfig, [field]: value / 100 });
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
    } else if (key === 'lastLowAlert' || key === 'lastHighAlert') {
      const aConfig = alertConfigsState.find(config => config.projectName === a.name);
      const bConfig = alertConfigsState.find(config => config.projectName === b.name);
      aValue = aConfig ? !!aConfig[key] : false;
      bValue = bConfig ? !!bConfig[key] : false;
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

  const getEmailStatus = (threshold: '50' | '80', alertConfig?: AlertConfig) => {
    if (!alertConfig) return 'Not Sent';
  
    const statusField = threshold === '50' ? 'lastLowAlert' : 'lastHighAlert';
    if (!alertConfig[statusField]) {
      return 'Not Sent';
    }
    return 'Sent'; // If the field exists, the email was sent
  };
  

  const th =
    'cursor-pointer select-none px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted transition-colors hover:text-fg md:px-4';

  return (
    <div className="min-h-screen bg-surface">
      <Header
        pageTitle="Budget alerts"
        description="Configure email notifications when projects approach low and high budget thresholds."
      />
      <ToastContainer theme="dark" />
      <div className="app-shell">
        <div className="ui-card mb-6 border-accent/25 bg-accent-dim/40 px-4 py-3 text-center text-sm text-fg">
          This page allows you to set notifications for projects reaching low and high budget alert levels.
        </div>
        <div className="mb-6 flex flex-wrap items-center justify-end gap-4">
          <div
            className="inline-flex rounded-xl border border-line bg-surface-inset p-1 shadow-inner"
            role="group"
            aria-label="Project status filter"
          >
            <button
              type="button"
              className={showActive ? 'btn-segment btn-segment-active' : 'btn-segment btn-segment-inactive'}
              onClick={() => setShowActive(true)}
            >
              Active projects
            </button>
            <button
              type="button"
              className={!showActive ? 'btn-segment btn-segment-active' : 'btn-segment btn-segment-inactive'}
              onClick={() => setShowActive(false)}
            >
              Inactive projects
            </button>
          </div>
        </div>
        <div className="table-shell max-h-[min(75vh,900px)] overflow-auto">
          <form>
            <table className="table-data min-w-full border-collapse divide-y divide-line text-left">
              <thead className="sticky top-0 z-10 border-b border-line bg-surface-inset">
                <tr>
                  <th scope="col" className={th} onClick={() => handleSort('selected')}>
                    Select
                  </th>
                  <th scope="col" onClick={() => handleSort('name')} className={th}>
                    Project name
                  </th>
                  <th scope="col" onClick={() => handleSort('description')} className={th}>
                    Description
                  </th>
                  <th scope="col" onClick={() => handleSort('pm')} className={th}>
                    Project manager
                  </th>
                  <th scope="col" onClick={() => handleSort('customEmails')} className={th}>
                    Custom emails
                  </th>
                  <th scope="col" onClick={() => handleSort('lastLowAlert')} className={th}>
                    Status low
                  </th>
                  <th scope="col" onClick={() => handleSort('lastHighAlert')} className={th}>
                    Status high
                  </th>
                  <th scope="col" onClick={() => handleSort('lowAlert')} className={th}>
                    Low alert %
                  </th>
                  <th scope="col" onClick={() => handleSort('highAlert')} className={th}>
                    High alert %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface-elevated">
                {sortedProjects.map((project) => {
                  const alertConfig = alertConfigsState.find((config) => config.projectName === project.name);
                  const isSelected = selectedProjects.has(project.name);

                  return (
                    <tr key={project.name}>
                      <td className="whitespace-nowrap px-2 py-3 md:px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProjectSelection(project.name)}
                          className="h-4 w-4 rounded border-line bg-surface-inset text-accent focus:ring-2 focus:ring-accent"
                          aria-label={`Select ${project.name}`}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-sm font-medium md:px-4">
                        <Link
                          href={`/project/${encodeURIComponent(project.name)}`}
                          className="text-accent hover:text-accent-hover hover:underline"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="max-w-xs px-2 py-3 text-sm text-fg md:px-4">
                        <div className="whitespace-pre-wrap break-words">{project.description}</div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-sm text-fg-muted md:px-4">{project.pm}</td>
                      <td className="whitespace-nowrap px-2 py-3 md:px-4">
                        <div className="flex flex-col gap-1.5">
                          {['jscott@webfirst.com', 'spatel@webfirst.com', 'kdriskell@webfirst.com'].map((email) => (
                            <label key={email} className="flex cursor-pointer items-center gap-2 text-sm text-fg">
                              <input
                                type="checkbox"
                                checked={alertConfig?.customEmails.includes(email) || false}
                                onChange={(e) => handleEmailCheckboxChange(project.name, email, e.target.checked)}
                                className="h-4 w-4 rounded border-line bg-surface-inset text-accent focus:ring-2 focus:ring-accent"
                              />
                              <span className="break-all">{email}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td
                        className={`whitespace-nowrap px-2 py-3 text-sm md:px-4 ${
                          alertConfig?.lastLowAlert ? 'text-amber-300' : 'text-fg-muted'
                        }`}
                      >
                        {getEmailStatus('50', alertConfig)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-2 py-3 text-sm md:px-4 ${
                          alertConfig?.lastHighAlert ? 'text-rose-300' : 'text-fg-muted'
                        }`}
                      >
                        {getEmailStatus('80', alertConfig)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 md:px-4">
                        <input
                          type="number"
                          value={alertConfig?.lowAlert ? Math.round(alertConfig.lowAlert * 100) : 0}
                          onChange={(e) => handleAlertThresholdChange(project.name, 'lowAlert', Number(e.target.value))}
                          className="input-dark w-16 py-1.5 text-sm tabular-nums md:w-20"
                        />
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 md:px-4">
                        <input
                          type="number"
                          value={alertConfig?.highAlert ? Math.round(alertConfig.highAlert * 100) : 0}
                          onChange={(e) => handleAlertThresholdChange(project.name, 'highAlert', Number(e.target.value))}
                          className="input-dark w-16 py-1.5 text-sm tabular-nums md:w-20"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProjectAlerts;
