import React, { useEffect } from 'react'
import ReactApexChart from 'react-apexcharts'
import { FetchSkillsOfUsers } from '../../redux/actions/users'
import { useDispatch, useSelector } from 'react-redux'

export default function UsersChartSkills() {
  const dispatch = useDispatch()
  const { _skills } = useSelector((state) => state.users)

  useEffect(() => {
    dispatch(FetchSkillsOfUsers())
  }, [dispatch])
   // Sécurité : si _skills est un objet
  const categories = _skills ? Object.keys(_skills) : []
  const dataValues = _skills ? Object.values(_skills) : []
 

  const state = {
    series: [
      {
        name: 'Skills',
        data: dataValues,
      },
    ],
    options: {
      colors: ['#3C50E0'],
      chart: {
        fontFamily: 'Satoshi, sans-serif',
        type: 'bar',
        height: 350,
        toolbar: {
          show: false,
        },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          endingShape: 'rounded',
          borderRadius: 2,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        width: 4,
        colors: ['transparent'],
      },
      xaxis: {
        categories: categories,
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'left',
        fontFamily: 'inter',
        markers: {
          radius: 99,
        },
      },
      yaxis: {
        title: false,
      },
      grid: {
        yaxis: {
          lines: {
            show: false,
          },
        },
      },
      fill: {
        opacity: 1,
      },
      tooltip: {
        x: {
          show: true,
        },
        y: {
          formatter: function (val) {
            return val
          },
        },
      },
    },
  }

  return (
    <div className='col-span-12 rounded-sm border border-stroke bg-white px-5 pt-7.5 pb-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5'>
      <div>
        <h3 className='text-xl font-semibold text-black dark:text-white'>
        Top Skills Distribution Among Users</h3>
      </div>

      <div className='mb-2'>
        <div id='chartFour' className='-ml-5'>
          <ReactApexChart
            options={state.options}
            series={state.series}
            type='bar'
            height={350}
          />
        </div>
      </div>
    </div>
  )
}
