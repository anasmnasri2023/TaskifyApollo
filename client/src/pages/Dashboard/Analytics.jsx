import React from "react";
import DefaultLayout from "../../layout/DefaultLayout";
import CardOne from "../../components/CardOne";
import CardTwo from "../../components/CardTwo";
import CardThree from "../../components/CardThree";
import CardFour from "../../components/CardFour";
import ChatCard from "../../components/ChatCard";
import TableOne from "../../components/TableOne";
import ChartOne from "../../components/ChartOne";
import ChartTwo from "../../components/ChartTwo";
import ChartThree from "../../components/ChartThree";
import PieChart from "../../components/PieChart";
import Courbe from "../../components/courbe"; // Import the new Courbe component
import { UseAuth } from "../../hooks/useAuth";
import { ROLES } from "../../data/roles";

const Analytics = () => {
  return (
    <DefaultLayout>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 2xl:gap-7.5">
        <CardThree />
        <CardFour />
      </div>

      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5">
        <div className="col-span-12 xl:col-span-7">
          <ChartThree />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <ChatCard />
        </div>
        <div className="col-span-12 xl:col-span-7">
          <PieChart />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <Courbe /> {/* Replaced PieChart with Courbe */}
        </div>
      </div>
    </DefaultLayout>
  );
};

export default UseAuth(
  Analytics,
  ROLES.filter((r) => r.title != "ENGINEER").map((i) => i.title)
);