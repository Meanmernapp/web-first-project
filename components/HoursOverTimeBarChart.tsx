import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import * as echarts from 'echarts';
import { parseISO, isWithinInterval, format } from 'date-fns';

interface HoursOverTimeBarChartProps {
  username: string;
  dateRange: { startDate: Date; endDate: Date; key: string }[];
}

interface MonthlyUserHours {
  projectName: string;
  [month: string]: number | string;
}

interface BarChartData {
  [key: string]: number | string;
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

const HoursOverTimeBarChart: React.FC<HoursOverTimeBarChartProps> = ({ username, dateRange }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<BarChartData[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [projectNames, setProjectNames] = useState<string[]>([]);
  const [avgHours, setAvgHours] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      const { startDate, endDate } = dateRange[0];

      try {
        const response = await axios.get(`${baseUrl}/api/user-time-entries/${encodeURIComponent(username)}`, {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
          },
        });

        const { userProjects, months } = response.data;

        const filteredMonths = months.filter((month: string) => {
          const date = parseISO(month);
          return isWithinInterval(date, { start: startDate, end: endDate });
        });

        const transformedData = filteredMonths.map((month: string) => {
          const monthData: BarChartData = { name: month };
          userProjects.forEach((project: MonthlyUserHours) => {
            monthData[project.projectName] = Number(project[month] !== '-' ? project[month] : 0);
          });
          return monthData;
        });

        const uniqueProjectNames = userProjects.map((project: MonthlyUserHours) => project.projectName);

        const totalHours = filteredMonths.reduce((acc: number, month: string) => {
          const monthTotal = userProjects.reduce((sum: number, project: MonthlyUserHours) => {
            return sum + (project[month] !== '-' ? Number(project[month]) : 0);
          }, 0);
          return acc + monthTotal;
        }, 0);

        const avgHours = totalHours / filteredMonths.length;

        setData(transformedData);
        setMonths(filteredMonths);
        setProjectNames(uniqueProjectNames);
        setAvgHours(avgHours);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (username && dateRange.length > 0) {
      fetchData();
    }
  }, [username, dateRange]);

  useEffect(() => {
    if (chartRef.current && data.length > 0) {
      const chartInstance = echarts.init(chartRef.current, null, { renderer: 'svg' });

      const seriesData = projectNames.map(projectName => ({
        name: projectName,
        type: 'bar',
        stack: 'total',
        emphasis: {
          focus: 'series'
        },
        data: data.map(d => d[projectName]),
      }));

      const totalSeriesData = data.map(monthData => {
        const total = projectNames.reduce((sum, projectName) => sum + (monthData[projectName] as number), 0);
        return {
          name: monthData.name as string,
          value: total
        };
      });

      const option = {
        tooltip: {
          trigger: 'item',
          formatter: (params: any) => {
            if (params.seriesType === 'bar') {
              return `${params.seriesName}<br/>${params.name}: ${params.value.toFixed(2)} hours`;
            }
            return `${params.name}: ${params.value.toFixed(2)} hours`;
          }
        },
        grid: {
          left: '5%',
          right: '5%',
          bottom: '15%',
          top: '10%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: months,
          axisLine: {
            lineStyle: {
              color: 'var(--axis-line-color)',
            }
          },
          axisLabel: {
            color: 'var(--axis-label-color)',
            interval: 0,
            rotate: 45,
            formatter: function (value: string) {
              const date = parseISO(value);
              const options: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
              return format(date, 'MMM yyyy');
            },
            fontSize: 12,
          }
        },
        yAxis: {
          type: 'value',
          axisLine: {
            lineStyle: {
              color: 'var(--axis-line-color)',
            }
          },
          axisLabel: {
            color: 'var(--axis-label-color)',
            fontSize: 12,
            formatter: function (value: number) {
              return value.toString();
            }
          },
          splitLine: {
            show: false // Remove the horizontal grid lines
          }
        },
        series: [
          ...seriesData,
          {
            name: 'Total',
            type: 'line',
            label: {
              show: true,
              position: 'top',
              formatter: (params: any) => `${params.value.toFixed(2)}`,
              color: 'var(--total-label-color)',
              fontSize: 12,
            },
            data: totalSeriesData.map(d => d.value),
            itemStyle: {
              color: 'transparent'
            },
            lineStyle: {
              color: 'transparent'
            },
            emphasis: {
              focus: 'none'
            }
          },
          {
            name: 'Average',
            type: 'line',
            markLine: {
              silent: true,
              data: [
                {
                  yAxis: avgHours,
                  lineStyle: {
                    type: 'dashed',
                    color: '#ff0000'
                  },
                  label: {
                    formatter: `${avgHours.toFixed(2)}`,
                    position: 'start',
                    distance: 35, // Move the label outside the Y-axis
                    color: '#ff0000',
                    fontSize: 12,
                  }
                }
              ],
              symbol: 'none'
            },
            itemStyle: {
              opacity: 0, // Hide the line data points
            },
            lineStyle: {
              color: 'transparent', // Hide the actual line
            },
          }
        ]
      };

      chartInstance.setOption(option);

      const resizeObserver = new ResizeObserver(() => {
        chartInstance.resize();
      });

      resizeObserver.observe(chartRef.current);

      return () => {
        resizeObserver.disconnect();
        chartInstance.dispose();
      };
    }
  }, [data, months, projectNames, avgHours]);

  useEffect(() => {
    const setTheme = () => {
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const isDarkMode = darkModeMediaQuery.matches;
      document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    };

    setTheme();

    window.matchMedia('(prefers-color-scheme: dark)').addListener(setTheme);

    return () => {
      window.matchMedia('(prefers-color-scheme: dark)').removeListener(setTheme);
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="chart-header mb-4">
        <h3 className="text-gray-900 dark:text-gray-100">Hours Over Time</h3>
      </div>
      <div className="chart-area w-full h-[40rem]" ref={chartRef} />
      <style jsx global>{`
        :root {
          --axis-line-color: #000;
          --axis-label-color: #000;
          --total-label-color: #000;
          --average-label-color: #000;
        }
        [data-theme="dark"] {
          --axis-line-color: #fff;
          --axis-label-color: #fff;
          --total-label-color: #fff;
          --average-label-color: #fff;
        }
      `}</style>
    </div>
  );
};

export default HoursOverTimeBarChart;
