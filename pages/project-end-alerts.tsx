import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import axios from "axios";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Project {
  name: string;
  description: string;
  status?: string;
  pm?: string; // Project manager username
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
  managerEmail?: string; // Make this optional
  customEmails: string[];
  lastAlertSent?: string;
}

type SortKey = keyof Project | keyof AlertConfig | "selected" | "daysRemaining";

const ProjectEndAlerts: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(
    new Set(),
  );
  const [showActive, setShowActive] = useState<boolean>(true);
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: "ascending" | "descending";
  }>({ key: "name", direction: "ascending" });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

  //       const [projectsRes, usersRes, alertConfigsRes] = await Promise.all([
  //         axios.get(`${baseUrl}/api/projects`, {
  //           headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY! },
  //         }),
  //         axios.get(`${baseUrl}/api/users`, {
  //           headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY! },
  //         }),
  //         axios.get(`${baseUrl}/api/project-end-alerts`, {
  //           headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY! },
  //         }),
  //       ]);

  //       const sortedProjects = projectsRes.data.sort((a: Project, b: Project) => a.name.localeCompare(b.name));
  //       setProjects(sortedProjects);
  //       setUsers(usersRes.data);

  //       const alertConfigsWithManagerEmails = alertConfigsRes.data.map((config: AlertConfig) => ({
  //         ...config,
  //         managerEmail: config.managerEmail ?? getManagerEmail(config.projectName, sortedProjects, usersRes.data),
  //       }));

  //       setAlertConfigs(alertConfigsWithManagerEmails);
  //       setSelectedProjects(new Set(alertConfigsWithManagerEmails.map((config: AlertConfig) => config.projectName)));
  //     } catch (error) {
  //       console.error('Error fetching data:', error);
  //       setError('Failed to fetch data.');
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchData();
  // }, []);

  const getManagerEmail = (
    projectName: string,
    projects: Project[],
    users: User[],
  ): string => {
    const project = projects.find((proj) => proj.name === projectName);
    if (project) {
      const user = users.find((user) => user.username === project.pm);
      return user ? user.email : "";
    }
    return "";
  };

  const calculateDaysRemaining = (endDate: string): number => {
    const today = new Date();
    const end = new Date(endDate);
    const timeDiff = end.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const updateAlertConfig = async (alertConfig: AlertConfig) => {
    const url = `/api/project-end-alerts/${encodeURIComponent(alertConfig.projectName)}`;
    const headers = {
      "x-api-key": process.env.NEXT_PUBLIC_API_KEY!,
      "Content-Type": "application/json",
    };

    try {
      await axios.post(url, alertConfig, { headers });
      setAlertConfigs((prevConfigs) =>
        prevConfigs.map((config) =>
          config.projectName === alertConfig.projectName ? alertConfig : config,
        ),
      );
      toast.success(`Alerts updated for project ${alertConfig.projectName}`);
    } catch (error) {
      console.error("Error updating alerts:", error);
      toast.error("Error updating alerts.");
    }
  };

  const removeAlertConfig = async (projectName: string) => {
    const url = `/api/project-end-alerts/${encodeURIComponent(projectName)}`;
    const headers = {
      "x-api-key": process.env.NEXT_PUBLIC_API_KEY!,
      "Content-Type": "application/json",
    };

    try {
      await axios.delete(url, { headers });
      setAlertConfigs((prevConfigs) =>
        prevConfigs.filter((config) => config.projectName !== projectName),
      );
      toast.success(`Alerts removed for project ${projectName}`);
    } catch (error) {
      console.error("Error removing alerts:", error);
      toast.error("Error removing alerts.");
    }
  };

  const toggleProjectSelection = async (projectName: string) => {
    const newSelectedProjects = new Set(selectedProjects);
    const isSelected = newSelectedProjects.has(projectName);

    if (isSelected) {
      newSelectedProjects.delete(projectName);
      await removeAlertConfig(projectName);
    } else {
      const projectManagerEmail = getManagerEmail(projectName, projects, users);
      const alertConfig = {
        projectName,
        managerEmail: projectManagerEmail,
        customEmails: [
          "jscott@webfirst.com",
          "spatel@webfirst.com",
          "kdriskell@webfirst.com",
        ],
      };
      newSelectedProjects.add(projectName);
      await updateAlertConfig(alertConfig);
    }

    setSelectedProjects(newSelectedProjects);
  };

  const handleEmailCheckboxChange = async (
    projectName: string,
    email: string,
    isChecked: boolean,
  ) => {
    const updatedConfigs = alertConfigs.map((config) =>
      config.projectName === projectName
        ? {
            ...config,
            customEmails: isChecked
              ? [...config.customEmails, email]
              : config.customEmails.filter((e) => e !== email),
          }
        : config,
    );

    const updatedConfig = updatedConfigs.find(
      (config) => config.projectName === projectName,
    );
    if (updatedConfig) {
      await updateAlertConfig(updatedConfig);
    }
  };

  const handleManagerEmailCheckboxChange = async (
    projectName: string,
    isChecked: boolean,
  ) => {
    const updatedConfigs = alertConfigs.map((config) =>
      config.projectName === projectName
        ? {
            ...config,
            managerEmail: isChecked
              ? getManagerEmail(projectName, projects, users)
              : "",
          }
        : config,
    );

    const updatedConfig = updatedConfigs.find(
      (config) => config.projectName === projectName,
    );
    if (updatedConfig) {
      await updateAlertConfig(updatedConfig);
    }
  };

  const filteredProjects = projects.filter((project) =>
    showActive
      ? project.status?.toLowerCase() === "active"
      : project.status?.toLowerCase() !== "active",
  );

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (!sortConfig) return 0;
    const key = sortConfig.key as SortKey;

    let aValue: any, bValue: any;

    if (key === "selected") {
      aValue = selectedProjects.has(a.name);
      bValue = selectedProjects.has(b.name);
    } else if (key === "daysRemaining") {
      aValue = a.periodOfPerformance
        ? calculateDaysRemaining(a.periodOfPerformance.endDate)
        : 0;
      bValue = b.periodOfPerformance
        ? calculateDaysRemaining(b.periodOfPerformance.endDate)
        : 0;
    } else {
      aValue = (a[key as keyof Project] || "").toString();
      bValue = (b[key as keyof Project] || "").toString();
    }

    if (aValue < bValue) {
      return sortConfig.direction === "ascending" ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === "ascending" ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (key: SortKey) => {
    let direction: "ascending" | "descending" = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const projectsEndingSoon = projects.filter((project) => {
    if (project.periodOfPerformance?.endDate) {
      const daysRemaining = calculateDaysRemaining(
        project.periodOfPerformance.endDate,
      );
      return daysRemaining <= 37 && daysRemaining > 0;
    }
    return false;
  });

  // if (loading) {
  //   return <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">Loading...</div>;
  // }

  if (error) {
    return (
      <div className="min-h-screen bg-surface p-6">
        <div className="ui-card border-rose-500/40 bg-rose-950/25 p-4 text-rose-100">
          Error: {error}
        </div>
      </div>
    );
  }

  const th =
    "cursor-pointer select-none px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted transition-colors hover:text-fg md:px-4";

  return (
    <div className="min-h-screen bg-surface">
      <Header
        pageTitle="Contract ending (POP) alerts"
        description="Enable alerts before period of performance ends; recipients include project managers and custom distribution lists."
      />
      <ToastContainer theme="dark" />
      <div className="app-shell">
        {projectsEndingSoon.length > 0 && (
          <div className="ui-card mb-6 border-amber-500/30 bg-amber-950/20 p-4">
            <h2 className="mb-3 text-base font-semibold text-fg">
              Projects ending in the next 37 days
            </h2>
            <ul className="space-y-2 text-sm">
              {projectsEndingSoon.map((project) => (
                <li key={project.name} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <Link
                    href={`/project/${encodeURIComponent(project.name)}`}
                    className="font-medium text-accent hover:text-accent-hover hover:underline"
                  >
                    {project.name}
                  </Link>
                  <span className="text-fg-muted">
                    —{" "}
                    {calculateDaysRemaining(
                      project.periodOfPerformance?.endDate!,
                    )}{" "}
                    days remaining
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="ui-card mb-6 border-accent/25 bg-accent-dim/40 px-4 py-3 text-center text-sm text-fg">
          Add projects here to notify the project manager and Joema 30 days before the contract (POP) ends.
        </div>

        <div className="mb-6 flex flex-wrap justify-end">
          <div
            className="inline-flex rounded-xl border border-line bg-surface-inset p-1 shadow-inner"
            role="group"
            aria-label="Project status filter"
          >
            <button
              type="button"
              className={showActive ? "btn-segment btn-segment-active" : "btn-segment btn-segment-inactive"}
              onClick={() => setShowActive(true)}
            >
              Active projects
            </button>
            <button
              type="button"
              className={!showActive ? "btn-segment btn-segment-active" : "btn-segment btn-segment-inactive"}
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
                  <th scope="col" className={th} onClick={() => handleSort("selected")}>
                    Select
                  </th>
                  <th scope="col" className={th} onClick={() => handleSort("name")}>
                    Project name
                  </th>
                  <th scope="col" className={th} onClick={() => handleSort("description")}>
                    Description
                  </th>
                  <th scope="col" className={th} onClick={() => handleSort("managerEmail")}>
                    Manager email
                  </th>
                  <th scope="col" className={th} onClick={() => handleSort("customEmails")}>
                    Custom emails
                  </th>
                  <th scope="col" className={th} onClick={() => handleSort("daysRemaining")}>
                    Days remaining
                  </th>
                  <th scope="col" className={th} onClick={() => handleSort("lastAlertSent")}>
                    Last alert sent
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface-elevated">
                {sortedProjects.map((project) => {
                  const alertConfig =
                    alertConfigs.find((config) => config.projectName === project.name) || {
                      projectName: project.name,
                      managerEmail: getManagerEmail(project.name, projects, users),
                      customEmails: [
                        "jscott@webfirst.com",
                        "spatel@webfirst.com",
                        "kdriskell@webfirst.com",
                      ],
                    };

                  const isSelected = selectedProjects.has(project.name);
                  const daysRemaining = project.periodOfPerformance
                    ? calculateDaysRemaining(project.periodOfPerformance.endDate)
                    : "N/A";
                  const lastAlertSent = alertConfig.lastAlertSent
                    ? new Date(alertConfig.lastAlertSent).toLocaleDateString()
                    : "N/A";
                  const alertSentStyle = alertConfig.lastAlertSent
                    ? "text-emerald-400"
                    : "text-fg-muted";

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
                      <td className="whitespace-nowrap px-2 py-3 text-sm md:px-4">
                        <label className="flex cursor-pointer items-start gap-2 text-fg">
                          <input
                            type="checkbox"
                            checked={!!alertConfig.managerEmail}
                            onChange={(e) =>
                              handleManagerEmailCheckboxChange(project.name, e.target.checked)
                            }
                            className="mt-1 h-4 w-4 shrink-0 rounded border-line bg-surface-inset text-accent focus:ring-2 focus:ring-accent"
                          />
                          <span className="break-all text-fg-muted">
                            {alertConfig.managerEmail ||
                              getManagerEmail(project.name, projects, users)}
                          </span>
                        </label>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-sm md:px-4">
                        <div className="flex flex-col gap-1.5">
                          {["jscott@webfirst.com", "spatel@webfirst.com", "kdriskell@webfirst.com"].map((email) => (
                            <label key={email} className="flex cursor-pointer items-center gap-2 text-fg">
                              <input
                                type="checkbox"
                                checked={alertConfig.customEmails.includes(email)}
                                onChange={(e) =>
                                  handleEmailCheckboxChange(project.name, email, e.target.checked)
                                }
                                className="h-4 w-4 rounded border-line bg-surface-inset text-accent focus:ring-2 focus:ring-accent"
                              />
                              <span className="break-all">{email}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-sm tabular-nums text-fg-muted md:px-4">
                        {daysRemaining}
                      </td>
                      <td className={`whitespace-nowrap px-2 py-3 text-sm md:px-4 ${alertSentStyle}`}>
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
    </div>
  );
};

export default ProjectEndAlerts;
