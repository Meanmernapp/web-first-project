import React, { PureComponent } from 'react';
import axios from 'axios';
import { PieChart, Pie, Sector, ResponsiveContainer, Cell } from 'recharts';

interface User {
  username: string;
}

interface TimeEntry {
  username: string;
  [month: string]: number | string; // Index signature to allow string indexing
}

interface StaffParticipationPieChartProps {
  projectId: string;
  filteredData?: MonthlyUserHours[];
}

interface StaffParticipationPieChartState {
  activeIndex: number;
  data: { name: string; value: number }[];
  totalHours: number;
  innerRadius: number;
  outerRadius: number;
  showLegend: boolean;
}

interface MonthlyUserHours {
  username: string;
  [month: string]: number | string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1', '#d0ed57', '#a4de6c', '#d0ed57', '#ffbb28', '#8884d8'];

const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
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

export default class StaffParticipationPieChart extends PureComponent<StaffParticipationPieChartProps, StaffParticipationPieChartState> {
  constructor(props: StaffParticipationPieChartProps) {
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

  componentDidUpdate(prevProps: StaffParticipationPieChartProps) {
    if (prevProps.projectId !== this.props.projectId) {
      this.fetchData();
    }
    if (prevProps.filteredData !== this.props.filteredData) {
      this.processData(this.props.filteredData || []);
    }
  }

  fetchData = async () => {
    const { projectId } = this.props;

    try {
      const timeEntriesResponse = await axios.get(`${baseUrl}/api/processed-time-entries/${projectId}`, {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
        },
      });

      const timeEntries: TimeEntry[] = timeEntriesResponse.data.userHours;

      const userHoursMap: { [key: string]: number } = {};
      let totalHours = 0;

      timeEntries.forEach(user => {
        const username = user.username;
        let userTotal = 0;
        Object.keys(user).forEach(month => {
          if (month !== 'username' && user[month] !== '-') {
            userTotal += Number(user[month]);
          }
        });
        userHoursMap[username] = userTotal;
        totalHours += userTotal;
      });

      const data = Object.entries(userHoursMap).map(([name, value]) => ({
        name,
        value,
      }));

      this.setState({ data, totalHours });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  processData = (filteredData: MonthlyUserHours[]) => {
    const userHoursMap: { [key: string]: number } = {};
    let totalHours = 0;

    filteredData.forEach((user: MonthlyUserHours) => {
      Object.keys(user).forEach((key) => {
        if (key !== 'username') {
          const hours = Number(user[key] ?? 0);
          if (userHoursMap[user.username]) {
            userHoursMap[user.username] += hours;
          } else {
            userHoursMap[user.username] = hours;
          }
          totalHours += hours;
        }
      });
    });

    const data = Object.entries(userHoursMap).map(([name, value]) => ({
      name,
      value,
    }));

    this.setState({ data, totalHours });
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
    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Staff Participation</h2>

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
