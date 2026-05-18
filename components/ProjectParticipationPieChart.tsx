import React, { PureComponent } from 'react';
import axios from 'axios';
import { PieChart, Pie, Sector, ResponsiveContainer, Cell } from 'recharts';
import { parseISO, isWithinInterval } from 'date-fns';

interface TimeEntry {
  projectName: string;
  [month: string]: number | string;
}

interface ProjectParticipationPieChartProps {
  username: string;
  dateRange: { startDate: Date; endDate: Date; key: string }[];
}

interface ProjectParticipationPieChartState {
  activeIndex: number;
  data: { name: string; value: number }[];
  totalHours: number;
  innerRadius: number;
  outerRadius: number;
  showLegend: boolean;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1', '#d0ed57', '#a4de6c', '#d0ed57', '#ffbb28', '#8884d8'];

const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    value,
    percent,
  } = props;

  return (
    <g>
      <text x={cx} y={cy} dy={-10} textAnchor="middle" fill={fill}>
        {payload.name}
      </text>
      <text x={cx} y={cy} dy={10} textAnchor="middle" fill="#999">
        {`Hours ${value.toFixed(2)}`}
      </text>
      <text x={cx} y={cy} dy={30} textAnchor="middle" fill="#999">
        {`Rate ${(percent * 100).toFixed(2)}%`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
    </g>
  );
};

const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

export default class ProjectParticipationPieChart extends PureComponent<ProjectParticipationPieChartProps, ProjectParticipationPieChartState> {
  constructor(props: ProjectParticipationPieChartProps) {
    super(props);
    this.state = {
      activeIndex: 0,
      data: [],
      totalHours: 0,
      innerRadius: 100,
      outerRadius: 190,
      showLegend: false,
    };
  }

  componentDidMount() {
    this.fetchData();
    this.updateChartSize();
    window.addEventListener('resize', this.updateChartSize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateChartSize);
  }

  componentDidUpdate(prevProps: ProjectParticipationPieChartProps) {
    if (prevProps.username !== this.props.username || prevProps.dateRange !== this.props.dateRange) {
      this.fetchData();
    }
  }

  fetchData = async () => {
    const { username, dateRange } = this.props;
    const { startDate, endDate } = dateRange[0];

    try {
      const timeEntriesResponse = await axios.get(`${baseUrl}/api/user-time-entries/${encodeURIComponent(username)}`, {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
        },
      });

      const timeEntries: TimeEntry[] = timeEntriesResponse.data.userProjects;

      const projectHours: { [key: string]: number } = {};
      let totalHours = 0;

      timeEntries.forEach((entry: TimeEntry) => {
        const projectName = entry.projectName;
        const months = Object.keys(entry).filter(key => key !== 'projectName' && isWithinInterval(parseISO(key), { start: startDate, end: endDate }));
        const hours = months.reduce((sum, month) => sum + (entry[month] !== '-' ? Number(entry[month]) : 0), 0);

        if (projectHours[projectName]) {
          projectHours[projectName] += hours;
        } else {
          projectHours[projectName] = hours;
        }

        totalHours += hours;
      });

      const data = Object.entries(projectHours)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({
          name,
          value,
        }));

      this.setState({ data, totalHours });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  onPieEnter = (_: any, index: number) => {
    this.setState({
      activeIndex: index,
    });
  };

  updateChartSize = () => {
    const width = window.innerWidth;
    if (width > 1200) {
      this.setState({ innerRadius: 150, outerRadius: 240 });
    } else if (width > 1000) {
      this.setState({ innerRadius: 120, outerRadius: 200 });
    } else if (width > 700) {
      this.setState({ innerRadius: 100, outerRadius: 160 });
    } else {
      this.setState({ innerRadius: 80, outerRadius: 160 });
    }
  };

  toggleLegend = () => {
    this.setState((prevState) => ({
      showLegend: !prevState.showLegend,
    }));
  };

  render() {
    const { data, totalHours, innerRadius, outerRadius, showLegend } = this.state;

    return (
      <div className="w-full h-full flex flex-col items-center bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Project Participation</h2>
        <ResponsiveContainer width="100%" height={500}>
          <PieChart>
            <Pie
              activeIndex={this.state.activeIndex}
              activeShape={renderActiveShape}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              fill="#8884d8"
              dataKey="value"
              onMouseEnter={this.onPieEnter}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <button
          onClick={this.toggleLegend}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showLegend ? 'Hide Legend' : 'Show Legend'}
        </button>
        {showLegend && (
          <div className="mt-4 text-gray-900 dark:text-gray-100 w-full flex flex-col items-center">
            {data.map((entry, index) => {
              const percentage = ((entry.value / totalHours) * 100).toFixed(2);
              return (
                <div key={`legend-${index}`} className="flex items-center mb-1">
                  <div className="w-3 h-3 mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span>{`${entry.name} (${percentage}%)`}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}
