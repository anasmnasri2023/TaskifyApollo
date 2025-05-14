import React from 'react';
import Breadcrumb from '../../components/Breadcrumb';
import DefaultLayout from '../../layout/DefaultLayout';
import ChartSeven from '../../components/ChartSeven';
import ChartSix from '../../components/ChartSix';
import ChartNine from '../../components/ChartNine';
import DataStatsTwo from '../../components/DataStatsTwo';
import UsersChartSkills from './UsersChartSkills';
import TeamsCount from './TeamsCount';
import TaskCompletionPredictor from '../../components/TaskCompletionPredictor'; // Import the new component
import { UseAuth } from "../../hooks/useAuth";

const AdvancedChart = () => {
  return (
    <DefaultLayout>
      <Breadcrumb pageName='User Chart Infographics' />
      
      <br />
      <div className="grid grid-cols-12 gap-4 md:gap-6 2xl:gap-7.5">
        {/* Add the Task Completion Predictor at the top */}
        <div className="col-span-12">
          <TaskCompletionPredictor />
        </div>
        
        {/* Your existing components */}
        <div className="col-span-12">
          <UsersChartSkills />
        </div>
        <div className="col-span-12 xl:col-span-7">
       
        </div>
        <div className="col-span-12 xl:col-span-5">
          <TeamsCount />
        </div>
        <div className="col-span-12 xl:col-span-7">
    
        </div>
        <div className="col-span-12 xl:col-span-5">
      
        </div>
      </div>
    </DefaultLayout>
  );
};

export default UseAuth(AdvancedChart, ["ADMIN"]);