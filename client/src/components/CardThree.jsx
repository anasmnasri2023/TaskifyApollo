import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const CardThree = () => {
  const [projectCount, setProjectCount] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch projects data from API
    const fetchProjects = async () => {
      try {
        const response = await axios.get("/api/projects");
        const projects = response.data.data;
        setProjectCount(projects.length);
        
        // Calculate growth rate (example: could be based on new projects in the past month)
        // This is a placeholder - you would implement actual growth calculation based on your data
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        const newProjects = projects.filter(project => 
          new Date(project.start_date) >= oneMonthAgo
        );
        
        const growthPercentage = projects.length > 0 
          ? ((newProjects.length / projects.length) * 100).toFixed(2)
          : 0;
          
        setGrowthRate(growthPercentage);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };

    fetchProjects();
  }, []);

  const handleCardClick = () => {
    navigate("/projects/project-list"); // Navigate to TASKIFY page
  };

  return (
    <div 
      className="rounded-sm border border-stroke bg-white px-7.5 py-6 shadow-default dark:border-strokedark dark:bg-boxdark cursor-pointer hover:bg-gray-50 dark:hover:bg-boxdark-hover transition-all duration-300"
      onClick={handleCardClick}
    >
      <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
        <svg
          className="fill-primary dark:fill-white"
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M21.1063 18.0469L19.3875 3.23126C19.2157 1.71876 17.9438 0.584381 16.3969 0.584381H5.56878C4.05628 0.584381 2.78441 1.71876 2.57816 3.23126L0.859406 18.0469C0.756281 18.9063 1.03128 19.7313 1.61566 20.3844C2.20003 21.0375 2.99066 21.3813 3.85003 21.3813H18.1157C18.975 21.3813 19.8 21.0031 20.35 20.3844C20.9 19.7656 21.2094 18.9063 21.1063 18.0469ZM19.2157 19.3531C18.9407 19.6625 18.5625 19.8344 18.15 19.8344H3.85003C3.43753 19.8344 3.05941 19.6625 2.78441 19.3531C2.50941 19.0438 2.37191 18.6313 2.44066 18.2188L4.12503 3.43751C4.19378 2.71563 4.81253 2.16563 5.56878 2.16563H16.4313C17.1532 2.16563 17.7719 2.71563 17.875 3.43751L19.5938 18.2531C19.6282 18.6656 19.4907 19.0438 19.2157 19.3531Z"
            fill=""
          />
          <path
            d="M14.3345 5.29375C13.922 5.39688 13.647 5.80938 13.7501 6.22188C13.7845 6.42813 13.8189 6.63438 13.8189 6.80625C13.8189 8.35313 12.547 9.625 11.0001 9.625C9.45327 9.625 8.1814 8.35313 8.1814 6.80625C8.1814 6.6 8.21577 6.42813 8.25015 6.22188C8.35327 5.80938 8.07827 5.39688 7.66577 5.29375C7.25327 5.19063 6.84077 5.46563 6.73765 5.87813C6.6689 6.1875 6.63452 6.49688 6.63452 6.80625C6.63452 9.2125 8.5939 11.1719 11.0001 11.1719C13.4064 11.1719 15.3658 9.2125 15.3658 6.80625C15.3658 6.49688 15.3314 6.1875 15.2626 5.87813C15.1595 5.46563 14.747 5.225 14.3345 5.29375Z"
            fill=""
          />
        </svg>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <h4 className="text-title-md font-bold text-black dark:text-white">
            {projectCount}
          </h4>
          <span className="text-sm font-medium">Total Projects</span>
        </div>

        <span className={`flex items-center gap-1 text-sm font-medium ${parseFloat(growthRate) > 0 ? 'text-meta-3' : parseFloat(growthRate) < 0 ? 'text-meta-1' : 'text-body'}`}>
          {growthRate}%
          {parseFloat(growthRate) > 0 ? (
            <svg
              className="fill-meta-3"
              width="10"
              height="11"
              viewBox="0 0 10 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.35716 2.47737L0.908974 5.82987L5.0443e-07 4.94612L5 0.0848689L10 4.94612L9.09103 5.82987L5.64284 2.47737L5.64284 10.0849L4.35716 10.0849L4.35716 2.47737Z"
                fill=""
              />
            </svg>
          ) : parseFloat(growthRate) < 0 ? (
            <svg
              className="fill-meta-1"
              width="10"
              height="11"
              viewBox="0 0 10 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.64284 7.69237L9.09102 4.33987L10 5.22362L5 10.0849L-8.98488e-07 5.22362L0.908973 4.33987L4.35716 7.69237L4.35716 0.0848701L5.64284 0.0848704L5.64284 7.69237Z"
                fill=""
              />
            </svg>
          ) : null}
        </span>
      </div>
    </div>
  );
};

export default CardThree;