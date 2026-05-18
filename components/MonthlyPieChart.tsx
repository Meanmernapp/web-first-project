import React, { PureComponent } from 'react';
import axios from 'axios';
import { PieChart, Pie, Sector, ResponsiveContainer, Cell } from 'recharts';

interface User {
  username: string;
  title: string;
}

interface TimeEntry {
  username: string;
  projectName: string;
  hours: number;
}

interface MonthlyUserHours {
  username: string;
  [month: string]: number | string;
}

interface MonthlyPieChartProps {
  projectId: string;
  filteredData?: MonthlyUserHours[];
  userDetails: { [key: string]: User };
}

interface MonthlyPieChartState {
  activeIndex: number;
  data: { name: string; value: number }[];
  totalHours: number;
  innerRadius: number;
  outerRadius: number;
  showLegend: boolean;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1', '#d0ed57', '#a4de6c', '#d0ed57', '#ffbb28', '#8884d8'];

const categorizeJobTitle = (title: string): string => {
  if (!title || typeof title !== "string") {
    return "Other";
  }

  const categories = [
    { name: "Project Management", keywords: ["Manager"] },
    { name: "Director", keywords: ["director", "VP"] },
    { name: "Application Development", keywords: ["developer", "architect"] },
    { name: "Business Analyst", keywords: ["analyst"] },
    { name: "Testing/QA", keywords: ["QA", "testing", "508"] },
    { name: "UX/CX", keywords: ["Designer", "UX", "CX"] },
    { name: "Content Strategy", keywords: ["Content"] },
    { name: "DevOps", keywords: ["DevOps", "DevSecOps", "administrator"] },
  ];

  for (let category of categories) {
    for (let keyword of category.keywords) {
      if (title.toLowerCase().includes(keyword.toLowerCase())) {
        return category.name;
      }
    }
  }

  const words = title.split(" ");
  for (let word of words) {
    for (let category of categories) {
      for (let keyword of category.keywords) {
        if (word.toLowerCase() === keyword.toLowerCase()) {
          return category.name;
        }
      }
    }
  }

  return "Other";
};

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

export default class MonthlyPieChart extends PureComponent<MonthlyPieChartProps, MonthlyPieChartState> {
  constructor(props: MonthlyPieChartProps) {
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

  componentDidUpdate(prevProps: MonthlyPieChartProps) {
    if (prevProps.projectId !== this.props.projectId) {
      this.fetchData();
    }
    if (prevProps.filteredData !== this.props.filteredData) {
      this.processFilteredData(this.props.filteredData || []);
    }
  }

  fetchData = async () => {
    const { projectId } = this.props;

    try {
      const [usersResponse, timeEntriesResponse] = await Promise.all([
        axios.get(`${baseUrl}/api/users`, {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
          },
        }),
        axios.get(`${baseUrl}/api/time`, {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
          },
        }),
      ]);

      const users: User[] = usersResponse.data;
      const timeEntries: TimeEntry[] = timeEntriesResponse.data.filter((entry: TimeEntry) => entry.projectName === projectId);

      const userTitleMap: { [key: string]: string } = {};
      users.forEach(user => {
        userTitleMap[user.username] = user.title;
      });

      const categoryHours: { [key: string]: number } = {};
      let totalHours = 0;

      timeEntries.forEach((entry: TimeEntry) => {
        const title = userTitleMap[entry.username] || "";
        const category = categorizeJobTitle(title);
        const hours = parseFloat(entry.hours as any) || 0;

        if (isNaN(hours)) {
          console.warn(`Invalid hours for entry:`, entry);
        }

        if (categoryHours[category]) {
          categoryHours[category] += hours;
        } else {
          categoryHours[category] = hours;
        }

        totalHours += hours;
      });

      const data = Object.entries(categoryHours).map(([name, value]) => ({
        name,
        value,
      }));

      this.setState({ data, totalHours });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  processFilteredData = (filteredData: MonthlyUserHours[]) => {
    const { userDetails } = this.props;
    const categoryHours: { [key: string]: number } = {};
    let totalHours = 0;

    filteredData.forEach((user: MonthlyUserHours) => {
      const title = userDetails[user.username]?.title || "";
      const category = categorizeJobTitle(title);

      Object.keys(user).forEach((key) => {
        if (key !== 'username') {
          const hours = parseFloat(user[key] as any) || 0;

          if (isNaN(hours)) {
            console.warn(`Invalid hours for user:`, user);
          }

          if (categoryHours[category]) {
            categoryHours[category] += hours;
          } else {
            categoryHours[category] = hours;
          }

          totalHours += hours;
        }
      });
    });

    const data = Object.entries(categoryHours).map(([name, value]) => ({
      name,
      value,
    }));

    this.setState({ data, totalHours });
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

  onPieEnter = (data: any, index: number) => {
    this.setState({ activeIndex: index });
  };

  render() {
    const { data, innerRadius, outerRadius, showLegend } = this.state;

    const categoryDescriptions: { [key: string]: string } = {
      "Project Management": "Manager",
      "Director": "Director, VP",
      "Application Development": "Developer, Architect",
      "Business Analyst": "Analyst",
      "Testing/QA": "QA, Testing, 508",
      "UX/CX": "Designer, UX, CX",
      "Content Strategy": "Content",
      "DevOps": "DevOps, DevSecOps, Administrator",
      "Other": "Everything else",
    };

    return (
      <div className="w-full h-full flex flex-col items-center bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Monthly Hours Distribution by Job Title</h2>
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
          className="mt-4 py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Toggle Legend
        </button>
        {showLegend && (
          <ul className="mt-4 list-disc pl-5 text-gray-900 dark:text-gray-100">
            {data.map((entry, index) => (
              <li key={index} className="flex items-center">
                <span
                  className="inline-block w-4 h-4 mr-2"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                {categoryDescriptions[entry.name] ? `${entry.name} (${categoryDescriptions[entry.name]})` : entry.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
}
