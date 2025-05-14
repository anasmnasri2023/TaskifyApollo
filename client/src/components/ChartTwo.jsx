import React, { Component } from 'react'
import ReactApexChart from 'react-apexcharts'

class ChartTwo extends Component {
  constructor(props) {
    super(props)

    this.state = {
      series: [0, 0, 0, 0, 0],
      options: {
        colors: ['#3C50E0', '#80CAEE', '#F2994A', '#13C296', '#FF0000'],
        chart: {
          fontFamily: 'Satoshi, sans-serif',
          type: 'donut',
          height: 335
        },
        labels: ['To Do', 'In Progress', 'Review', 'Completed', 'Blocked'],
        legend: {
          show: true,
          position: 'bottom'
        },
        plotOptions: {
          pie: {
            donut: {
              size: '65%',
              background: 'transparent'
            }
          }
        },
        dataLabels: {
          enabled: true,
          formatter: function(val) {
            return Math.round(val) + '%';
          }
        },
        tooltip: {
          y: {
            formatter: function(val) {
              return val + ' tasks';
            }
          }
        }
      }
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.taskStats !== prevProps.taskStats) {
      // Map status values to match the order of labels
      const statusMapping = {
        '0': 0,  // To Do
        '1': 1,  // In Progress
        '2': 2,  // Review
        '3': 3,  // Completed
        '4': 4   // Blocked
      };
      
      const series = [0, 0, 0, 0, 0]; // Initialize with zeros for all statuses
      
      // Fill in the values from taskStats
      Object.entries(this.props.taskStats.byStatus).forEach(([status, count]) => {
        const index = statusMapping[status];
        if (index !== undefined) {
          series[index] = count;
        }
      });
      
      this.setState({ series });
    }
  }

  render() {
    return (
      <div className='rounded-sm border border-stroke bg-white px-5 pt-7.5 pb-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5'>
        <div className='mb-3'>
          <h4 className='text-xl font-bold text-black dark:text-white'>
            Tasks by Status
          </h4>
        </div>
        <div className='mb-2'>
          <div id='chartTwo' className='mx-auto flex justify-center'>
            <ReactApexChart
              options={this.state.options}
              series={this.state.series}
              type='donut'
              height={335}
            />
          </div>
        </div>
      </div>
    )
  }
}

export default ChartTwo;
