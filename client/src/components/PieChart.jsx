import React, { useState, useEffect } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import axios from "axios";

ChartJS.register(ArcElement, Tooltip, Legend);

const PieChart = () => {
  const [chartData, setChartData] = useState(null);
  const [budgetStats, setBudgetStats] = useState([]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get("/api/projects");
        const projects = response.data.data || [];

        // Categorize projects by budget ranges
        const budgetRanges = {
          "≤ 500": 0,
          "> 500 & ≤ 2500": 0,
          "> 2500": 0,
        };

        projects.forEach((project) => {
          const budget = parseFloat(project.budget) || 0;
          if (budget <= 500) budgetRanges["≤ 500"]++;
          else if (budget <= 2500) budgetRanges["> 500 & ≤ 2500"]++;
          else budgetRanges["> 2500"]++;
        });

        // Prepare stats for display
        const total = projects.length;
        const stats = Object.entries(budgetRanges).map(([range, count]) => ({
          range,
          count,
          percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0,
        }));

        setBudgetStats(stats);

        // Determine colors based on budget range labels
        const colors = stats.map(({ range }) => {
          if (range === "≤ 500") return "#EF4444"; // Red
          if (range === "> 500 & ≤ 2500") return "#3B82F6"; // Blue
          if (range === "> 2500") return "#10B981"; // Green
          return "#EF4444"; // Default to red as fallback
        });

        // Chart.js data
        setChartData({
          labels: stats.map((s) => s.range),
          datasets: [
            {
              data: stats.map((s) => s.count),
              backgroundColor: colors,
              borderColor: "#ffffff",
              borderWidth: 2,
            },
          ],
        });
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };

    fetchProjects();
  }, []);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#1f2937", // text-black
          font: {
            size: 14,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || "";
            const value = context.raw || 0;
            const stat = budgetStats[context.dataIndex];
            return `${label}: ${value} (${stat?.percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <h4 className="mb-6 text-xl font-semibold text-black dark:text-white">
        Project Budget Distribution
      </h4>
      <div className="flex flex-col">
        {chartData ? (
          <>
            <div className="h-80">
              <Pie data={chartData} options={options} />
            </div>
            <div className="mt-4">
              {budgetStats.map((stat) => (
                <div
                  key={stat.range}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-black dark:text-white">
                    {stat.range}
                  </span>
                  <span className="text-black dark:text-white">
                    {stat.count} ({stat.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-black dark:text-white">Loading...</p>
        )}
      </div>
    </div>
  );
};

export default PieChart;