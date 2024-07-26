import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

interface MonthlyBarChartProps {
  projectId: string;
  filteredData: {
    userHours: MonthlyUserHours[];
    months: string[];
  };
}

interface MonthlyUserHours {
  username: string;
  [month: string]: number | string;
}

interface BarChartData {
  [key: string]: number | string;
}

const MonthlyBarChart: React.FC<MonthlyBarChartProps> = ({ projectId, filteredData }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<BarChartData[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [usernames, setUsernames] = useState<string[]>([]);
  const [avgHours, setAvgHours] = useState<number>(0);

  const monthOrder = [
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const sortMonths = (months: string[]) => {
    return months.sort((a, b) => {
      const aIndex = monthOrder.indexOf(a);
      const bIndex = monthOrder.indexOf(b);
      return aIndex - bIndex;
    });
  };

  useEffect(() => {
    const processFilteredData = () => {
      const { userHours, months } = filteredData;

      console.log('Filtered data:', filteredData);

      const sortedMonths = sortMonths([...months]);

      const transformedData = sortedMonths.map((month: string) => {
        const monthData: BarChartData = { name: month };
        userHours.forEach((user: MonthlyUserHours) => {
          monthData[user.username] = Number(user[month] !== '-' ? user[month] : 0);
        });
        return monthData;
      });

      console.log('Transformed data:', transformedData);

      const uniqueUsernames = userHours.map((user: MonthlyUserHours) => user.username);

      const totalHours = sortedMonths.reduce((acc: number, month: string) => {
        const monthTotal = userHours.reduce((sum: number, user: MonthlyUserHours) => {
          return sum + (user[month] !== '-' ? Number(user[month]) : 0);
        }, 0);
        return acc + monthTotal;
      }, 0);

      const avgHours = totalHours / sortedMonths.length;

      setData(transformedData);
      setMonths(sortedMonths);
      setUsernames(uniqueUsernames);
      setAvgHours(avgHours);
    };

    if (filteredData.userHours.length && filteredData.months.length) {
      processFilteredData();
    }
  }, [filteredData]);

  useEffect(() => {
    if (chartRef.current && data.length > 0) {
      const chartInstance = echarts.init(chartRef.current, null, { renderer: 'svg' });

      const seriesData = usernames.map(username => ({
        name: username,
        type: 'bar',
        stack: 'total',
        emphasis: {
          focus: 'series'
        },
        data: data.map(d => d[username]),
      }));

      const totalSeriesData = data.map(monthData => {
        const total = usernames.reduce((sum, username) => sum + (monthData[username] as number), 0);
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
          bottom: '10%',
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
              return value;
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
  }, [data, months, usernames, avgHours]);

  useEffect(() => {
    // Function to set theme based on system preference
    const setTheme = () => {
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const isDarkMode = darkModeMediaQuery.matches;
      document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    };

    // Initially set the theme
    setTheme();

    // Listen for changes in system theme preference
    window.matchMedia('(prefers-color-scheme: dark)').addListener(setTheme);

    // Clean up listener on component unmount
    return () => {
      window.matchMedia('(prefers-color-scheme: dark)').removeListener(setTheme);
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="chart-header mb-4">
        <h3 className="text-gray-900 dark:text-gray-100">Monthly - Bar Graph</h3>
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

export default MonthlyBarChart;
