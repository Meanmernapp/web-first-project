import React, { useEffect, useState } from "react";
import { FaInfoCircle } from "react-icons/fa";
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

interface ProjectInfoProps {
  checked: boolean;
  projectId: string;
  totalHours: number;
  setDescription: (description: string) => void;
  setProjectFlag: (projectFlag: boolean) => void;
  setGroupProjects: (groupProjects: string[]) => void;

}

interface ProjectDetails {
  name: string;
  status: string;
  contractType: string;
  periodOfPerformance: {
    startDate: string;
    endDate: string;
  };
  budgetHours: number;
  description: string;
  pm: string;
  showHrs?: boolean;
}

const ProjectInfo: React.FC<ProjectInfoProps> = ({ projectId, totalHours, setDescription, setProjectFlag, setGroupProjects, checked }) => {
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [projectHours, setProjectsHour] = useState<number>(0);


  useEffect(() => {
    if (!projectId) return;
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch project info');
        }

        const { project, projects }: { project: ProjectDetails, projects: any } = await response.json();
        if (projects) {
          const projectHours = projects.reduce((acc: number, project: any) => acc + (project.projectTotalHours || 0), 0);
          console.log(projects.map((item: any) => item.name))
          setProjectFlag(projects.every((item: any) => item.budgetHours == projects[0].budgetHours)
          )
          setGroupProjects(projects.map((item: any) => item.name))
          setProjectsHour(projectHours);
        }

        // const project = data.find(proj => proj.name === projectId);
        if (project) {
          let contractType = project.contractType || "";
          if (contractType.toLowerCase() === "time and materials") {
            contractType = "T&M";
          } else if (contractType.toLowerCase() === "fixed price") {
            contractType = "FFP";
          }

          setProjectDetails({
            name: project.name || "N/A",
            status: project.status || "N/A",
            contractType: contractType || "N/A",
            periodOfPerformance: project.periodOfPerformance || { startDate: "N/A", endDate: "N/A" },
            budgetHours: project.budgetHours !== undefined ? parseFloat(project.budgetHours.toString()) : 0,
            description: project.description || "N/A",
            pm: project.pm || "N/A",
          });

          setDescription(project.description || "N/A");
        } else {
          setProjectDetails({
            name: projectId,
            status: "N/A",
            contractType: "N/A",
            periodOfPerformance: { startDate: "N/A", endDate: "N/A" },
            budgetHours: 0,
            description: "N/A",
            pm: "N/A",
          });

          setDescription("N/A");
        }
      } catch (error) {
        console.error('Error fetching project info:', error);
        setProjectDetails({
          name: projectId,
          status: "N/A",
          contractType: "N/A",
          periodOfPerformance: { startDate: "N/A", endDate: "N/A" },
          budgetHours: 0,
          description: "N/A",
          pm: "N/A",
        });

        setDescription("N/A");
      }
    };

    fetchData();

  }, [projectId, setDescription, checked]);

  const calculateRemainingMonths = (startDate: string, endDate: string) => {
    if (!endDate || endDate === "N/A") return 0;  // Check for missing end date

    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (today > end) return 0;
    if (today < start) return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));

    let remainingMonths = (end.getFullYear() - today.getFullYear()) * 12 + end.getMonth() - today.getMonth();
    if (start.getDate() > today.getDate()) remainingMonths--;

    return remainingMonths;
  };

  const calculateAdjustedRemainingMonths = (startDate: string, endDate: string) => {
    if (!endDate || endDate === "N/A") return 0;  // Check for missing end date

    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (today > end) return 0;
    if (today < start) return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));

    let remainingMonths = (end.getFullYear() - today.getFullYear()) * 12 + end.getMonth() - today.getMonth();
    if (start.getDate() > today.getDate()) remainingMonths--;

    if (today.getDate() <= 15) {
      return remainingMonths + 1;
    }

    return remainingMonths;
  };

  const getRemainingMonthNames = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let remainingMonths: string[] = [];

    while (today <= end) {
      remainingMonths.push(monthNames[today.getMonth()]);
      today.setMonth(today.getMonth() + 1);
    }

    return remainingMonths.length > 0 ? remainingMonths.join(", ") : "No months remaining";
  };
  const budgetHours = projectDetails?.budgetHours ?? 0;

  const hrsRemain = budgetHours !== 0 && projectHours !== 0 ? budgetHours - projectHours : !projectHours ? budgetHours - totalHours : 0; // Prevent negative hrsRemain if no budget hours
  const remainingMonths = projectDetails ? calculateAdjustedRemainingMonths(projectDetails.periodOfPerformance.startDate, projectDetails.periodOfPerformance.endDate) : 0;

  let hoursRemainPerMonth = remainingMonths > 0 ? (hrsRemain / remainingMonths) : 0; // Show 0 if remainingMonths is 0 or negative
  hoursRemainPerMonth = hoursRemainPerMonth < 0 ? 0 : hoursRemainPerMonth;

  const remainingMonthNames = projectDetails && projectDetails.periodOfPerformance.endDate && projectDetails.periodOfPerformance.endDate !== "N/A"
    ? getRemainingMonthNames(projectDetails.periodOfPerformance.endDate)
    : "N/A";

  const formatDateString = (dateString: string) => {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "Date not available" : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getIconColorClass = () => 'text-accent';

  if (!projectDetails) {
    return (
      <div className="ui-card mt-4 px-4 py-8 text-center text-sm text-fg-muted">Loading project…</div>
    );
  }

  const periodOfPerformanceDisplay = projectDetails.periodOfPerformance.startDate && projectDetails.periodOfPerformance.endDate
    ? `${formatDateString(projectDetails.periodOfPerformance.startDate)} - ${formatDateString(projectDetails.periodOfPerformance.endDate)}`
    : "Period of Performance data not available";

  return (
    <div className="w-full">
      <div className="ui-card mt-4 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-center text-sm text-fg">
            <div>
              <span className="text-fg-subtle">Status</span>
              <div className="font-medium text-fg">{projectDetails.status || 'N/A'}</div>
            </div>
            <div>
              <span className="text-fg-subtle">Contract</span>
              <div className="font-medium text-fg">{projectDetails.contractType || 'N/A'}</div>
            </div>
            <div className="max-w-md">
              <span className="text-fg-subtle">POP</span>
              <div className="font-medium text-fg">{periodOfPerformanceDisplay}</div>
            </div>
            <div>
              <span className="text-fg-subtle">Budget hrs</span>
              <div className="font-medium tabular-nums text-fg">{budgetHours.toFixed(2) || '0'}</div>
            </div>
            <div>
              <span className="text-fg-subtle">Hrs remain</span>
              <div className="font-medium tabular-nums text-fg">
                {hrsRemain.toFixed(2) || '0'}{' '}
                <span className="text-fg-muted">
                  ({budgetHours ? (((hrsRemain / budgetHours) * 100).toFixed(1) + '%') : '—'})
                </span>
              </div>
            </div>
            <div>
              <Tippy
                content={`Remaining hours ÷ months left in POP (current month included if today is before the 15th). If under a month or negative, shows 0. Remaining months: ${remainingMonthNames}`}
                theme="dark"
                placement="top"
              >
                <span className="flex cursor-default items-center justify-center gap-1.5">
                  <span className="text-fg-subtle">Hrs / month</span>
                  <span className="font-medium tabular-nums text-fg">{hoursRemainPerMonth.toFixed(2) || '0'}</span>
                  <FaInfoCircle className={`shrink-0 ${getIconColorClass()}`} aria-hidden />
                </span>
              </Tippy>
            </div>
            <div>
              <span className="text-fg-subtle">PM</span>
              <div className="font-medium text-fg">{projectDetails.pm || 'N/A'}</div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectInfo;