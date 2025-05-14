import React, { useEffect, useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { useDispatch, useSelector } from 'react-redux';
import { GetAllTeamsAction } from '../../redux/actions/teams';

export default function TeamsCount() {
  const dispatch = useDispatch();
  const teamsState = useSelector((state) => state.teams);
  const { _ALL: teams = [] } = teamsState || {};
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);

  // Couleurs personnalisées pour les équipes
  const colors = ['#0FADCF', '#80CAEE', '#3C50E0', '#845EC2', '#FFC75F', '#F9F871'];

  // Fetch teams on mount
  useEffect(() => {
    const fetchTeams = async () => {
      await dispatch(GetAllTeamsAction());
    };
    fetchTeams();
  }, [dispatch]);

  // Met à jour les données
  useEffect(() => {
    const newData = teams.map((t) => ({
      name: t.Name,
      count: t.members?.length || 0,
    }));
    setData(newData);
    const totalMembers = newData.reduce((sum, team) => sum + team.count, 0);
    setTotal(totalMembers);
  }, [teams]);

  // Calcule le pourcentage
  function countPourcentage(count) {
    if (total === 0) return 0;
    return ((count * 100) / total).toFixed(2);
  }

  const series = data.map((d) => d.count);
  const labels = data.map((d) => d.name);

  const chartState = useMemo(
    () => ({
      series,
      options: {
        chart: {
          type: 'donut',
        },
        colors: colors.slice(0, data.length),
        labels,
        legend: {
          show: false,
          position: 'bottom',
        },
        plotOptions: {
          pie: {
            donut: {
              size: '75%',
              background: 'transparent',
            },
          },
        },
        dataLabels: {
          enabled: false,
        },
        responsive: [
          {
            breakpoint: 2600,
            options: {
              chart: {
                width: 380,
              },
            },
          },
          {
            breakpoint: 640,
            options: {
              chart: {
                width: 250,
              },
            },
          },
        ],
      },
    }),
    [series, labels, data.length]
  );

  return (
    <div className='rounded-sm border border-stroke bg-white px-5 pt-7.5 pb-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5'>
      <div className='mb-3 justify-between gap-4 sm:flex'>
        <div>
          <h4 className='text-title-sm2 font-bold text-black dark:text-white'>
            User team Partition 
          </h4>
        </div>
      </div>

      <div className='mb-2'>
        <div id='chartEight' className='mx-auto flex justify-center'>
          <ReactApexChart
            options={chartState.options}
            series={chartState.series}
            type='donut'
          />
        </div>
        <div className='mt-4 text-center text-sm text-gray-600 dark:text-gray-300'>
          Total membres : <strong>{total}</strong>
        </div>
      </div>

      <div className='flex flex-col gap-4 mt-5'>
        {data.map((d, key) => (
          <div className='flex items-center justify-between' key={key}>
            <div className='flex items-center gap-2'>
              <span
                className='block h-4 w-4 rounded-full border-4'
                style={{ borderColor: colors[key % colors.length] }}
              ></span>
              <span className='font-medium text-black-2 dark:text-white'>
                {d.name}
              </span>
            </div>

            <span className='inline-block rounded-md bg-primary py-0.5 px-1.5 text-xs font-medium text-white'>
              {countPourcentage(d.count)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
