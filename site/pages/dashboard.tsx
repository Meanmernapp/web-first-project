import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "../components/Header";
interface ProjectProps {
  name: string;
  status?: string;
  contractType?: string;
  budgetHours: number;
  projectTotalHours?: number;
}
interface Project {
  name: string;
  status?: string;
  contractType?: string;
  budgetHours: number;
  projectTotalHours?: number;
  groupProjects?: ProjectProps[];
}

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("Date not available");
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";

  // useEffect(() => {
  //   const fetchProjects = async () => {
  //     try {
  //       const projectsRes = await fetch(`${baseUrl}/api/projects`, {
  //         headers: {
  //           'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
  //         },
  //       });

  //       if (!projectsRes.ok) {
  //         throw new Error(`Failed to fetch projects: ${projectsRes.statusText}`);
  //       }

  //       const projectsData: Project[] = await projectsRes.json();
  //       console.log(projectsData);
  //       setProjects(projectsData);

  //       // New API call to get the most recent date from timeEntries
  //       const recentDateRes = await fetch(`${baseUrl}/api/getRecentTimeEntry`, {
  //         headers: {
  //           'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
  //         },
  //       });

  //       if (!recentDateRes.ok) {
  //         throw new Error(`Failed to fetch recent date: ${recentDateRes.statusText}`);
  //       }

  //       const recentDate = await recentDateRes.json();

  //       // Format the date using toLocaleDateString to MM/DD/YYYY
  //       const formattedDate = new Date(recentDate).toLocaleDateString('en-US', {
  //         year: 'numeric',
  //         month: 'numeric',
  //         day: 'numeric',
  //         timeZone: 'UTC',  // Ensures the date is interpreted in UTC
  //       });

  //       setLastUpdated(formattedDate || 'Date not available');
  //     } catch (error) {
  //       console.error('Error fetching data:', error);
  //       setError((error as Error).message);
  //     }
  //   };

  //   fetchProjects();
  // }, [baseUrl]);

  useEffect(() => {
    const updatedProjects = projects.map((project) => ({
      ...project,
      status:
        project.status === "Unknown" ||
        project.status === "Inactive" ||
        !project.status
          ? "Inactive"
          : project.status,
    }));

    let filtered = updatedProjects;
    if (showInactive) {
      filtered = updatedProjects.filter(
        (project) => project.status === "Inactive",
      );
    } else {
      filtered = updatedProjects.filter(
        (project) => project.status === "Active",
      );
    }

    setFilteredProjects(filtered);
  }, [showInactive, projects]);

  const handleProjectSelect = (project: Project) => {
    router.push(`/project/${project.name}`);
  };

  const groupProjectsByPrefix = (projects: Project[]) => {
    const sortedProjects = projects.sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    const grouped = sortedProjects.reduce(
      (acc, project) => {
        const [prefix] = project.name.split("-");
        if (!acc[prefix]) {
          acc[prefix] = [];
        }
        acc[prefix].push(project);
        return acc;
      },
      {} as { [key: string]: Project[] },
    );

    Object.keys(grouped).forEach((prefix) => {
      grouped[prefix].sort((a, b) => {
        const numA = parseInt(a.name.split("-")[1]);
        const numB = parseInt(b.name.split("-")[1]);
        return numA - numB;
      });
    });

    return grouped;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-surface p-6">
        <div className="ui-card border-red-500/40 bg-red-950/30 p-4 text-red-100">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Header pageTitle="Project Timesheets" />

      <ToastContainer theme="dark" />
      <div className="app-shell">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-fg sm:text-xl">
              {showInactive ? "Inactive projects" : "Active projects"}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">Data as of: {lastUpdated}</p>
          </div>
          <div
            className="inline-flex rounded-xl border border-line bg-surface-inset p-1 shadow-inner"
            role="group"
            aria-label="Project list filter"
          >
            <button
              type="button"
              className={showInactive ? "btn-segment btn-segment-inactive flex-1 md:flex-none" : "btn-segment btn-segment-active flex-1 md:flex-none"}
              onClick={() => setShowInactive(false)}
            >
              Active
            </button>
            <button
              type="button"
              className={showInactive ? "btn-segment btn-segment-active flex-1 md:flex-none" : "btn-segment btn-segment-inactive flex-1 md:flex-none"}
              onClick={() => setShowInactive(true)}
            >
              Inactive
            </button>
          </div>
        </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Object.keys(groupProjectsByPrefix(filteredProjects)).map((prefix) => (
          <div key={prefix} className="ui-card p-4">
            <h3 className="mb-3 border-b border-line pb-2 text-base font-semibold tracking-tight text-fg">
              {prefix}
            </h3>
            <div className="space-y-2">
              {groupProjectsByPrefix(filteredProjects)[prefix].map(
                (project) => {
                  let hrsRemain =
                    project.budgetHours && project.groupProjects?.length
                      ? project.budgetHours -
                        project.groupProjects.reduce(
                          (acc: number, groupProject: any) =>
                            acc + (groupProject.projectTotalHours || 0),
                          0,
                        )
                      : project.budgetHours - (project.projectTotalHours || 0);

                  let progress =
                    hrsRemain && project.budgetHours
                      ? Math.round((hrsRemain / project.budgetHours) * 100)
                      : 0;

                  let hrsUsed =
                    project.budgetHours && project.groupProjects?.length
                      ? project.groupProjects.reduce(
                          (acc: number, groupProject: any) =>
                            acc + (groupProject.projectTotalHours || 0),
                          0,
                        )
                      : project.projectTotalHours || 0;

                  let progressUsed =
                    hrsUsed && project.budgetHours
                      ? Math.round((hrsUsed / project.budgetHours) * 100)
                      : 0;

                  // if (project.name == 'CIA-01' || project.name == 'CIA-04'
                  // ) {

                  //   console.log(project.name, hrsRemain, progress, hrsUsed, progressUsed)
                  // }
                  let tierClass =
                    "border-line bg-surface-inset text-fg hover:border-line-strong hover:bg-surface-elevated";
                  if (progressUsed && progress) {
                    if (progress < 0 || progressUsed > 85) {
                      tierClass =
                        "border-red-500/50 bg-red-950/35 text-red-50 hover:border-red-400/70 hover:bg-red-950/50";
                    } else if (progressUsed >= 70 && progressUsed <= 85) {
                      tierClass =
                        "border-amber-500/45 bg-amber-950/30 text-amber-50 hover:border-amber-400/60 hover:bg-amber-950/45";
                    }
                  }

                  return (
                    <button
                      key={project.name}
                      type="button"
                      className={`w-full rounded-lg border p-2.5 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${tierClass}`}
                      onClick={() => handleProjectSelect(project)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                          <span className="break-words font-medium">{project.name}</span>
                          <span className="break-words text-fg-muted">
                            {project.contractType
                              ? project.contractType === "Time and Materials"
                                ? "(T&M)"
                                : "(FFP)"
                              : ""}{" "}
                            {project.groupProjects?.length ? "(G)" : null}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 text-xs font-medium uppercase tracking-wide ${project.status === "Active" ? "text-emerald-400" : "text-rose-400"}`}
                        >
                          {project.status}
                        </span>
                      </div>
                    </button>
                  );
                },
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="ui-card mt-8 p-5">
        <h3 className="mb-4 text-base font-semibold text-fg">Budget usage indicators</h3>
        <ul className="flex flex-col gap-3 text-sm text-fg-muted">
          <li className="flex items-center gap-3">
            <span className="h-4 w-4 shrink-0 rounded-md bg-surface-inset ring-1 ring-line" />
            <span>0–70% of budget used</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="h-4 w-4 shrink-0 rounded-md bg-amber-500/80" />
            <span>70–85% of budget used</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="h-4 w-4 shrink-0 rounded-md bg-red-500/90" />
            <span>Greater than 85% or negative remaining</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-rose-500/70 text-[10px] font-bold text-rose-200">
              G
            </span>
            <span>Group projects are indicated with (G)</span>
          </li>
        </ul>
      </div>
      </div>
    </div>
  );
};

export default Dashboard;
