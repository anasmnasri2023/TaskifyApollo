import React, { Component } from 'react';
import ReactApexChart from 'react-apexcharts'

class ChartOne extends Component {
  constructor(props) {
    super(props)

    this.state = {
      series: [
        {
          name: 'Tasks',
          data: [0, 0, 0, 0]
        }
      ],
      options: {
        chart: {
          fontFamily: 'Satoshi, sans-serif',
          type: 'bar',
          height: 335,
          stacked: false,
          toolbar: {
            show: false,
          },
          zoom: {
            enabled: false
          }
        },
        colors: ['#3C50E0', '#80CAEE', '#F2994A', '#FF0000'],
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: '45%',
            borderRadius: 5,
            dataLabels: {
              position: 'top'
            }
          },
        },
        dataLabels: {
          enabled: true,
          formatter: function (val) {
            return val + ' tasks'
          },
          offsetY: -20,
          style: {
            fontSize: '12px',
            colors: ["#304758"]
          }
        },
        stroke: {
          show: true,
          width: 2,
          colors: ['transparent']
        },
        xaxis: {
          categories: ['Low', 'Medium', 'High', 'Urgent'],
          axisBorder: {
            show: false
          },
          axisTicks: {
            show: false
          },
          title: {
            text: 'Priority Levels',
            style: {
              fontSize: '14px',
              fontWeight: 600
            }
          }
        },
        yaxis: {
          title: {
            text: 'Number of Tasks',
            style: {
              fontSize: '14px',
              fontWeight: 600
            }
          },
          min: 0,
          tickAmount: 4,
          labels: {
            formatter: function(val) {
              return val.toFixed(0)
            }
          }
        },
        grid: {
          borderColor: '#E5E7EB',
          strokeDashArray: 4,
          xaxis: {
            lines: {
              show: false
            }
          },
          yaxis: {
            lines: {
              show: true
            }
          },
          padding: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          }
        },
        legend: {
          show: true,
          position: 'top',
          horizontalAlign: 'left',
          floating: true,
          offsetY: -10,
          markers: {
            width: 10,
            height: 10,
            radius: 12
          }
        },
        fill: {
          opacity: 1
        },
        tooltip: {
          y: {
            formatter: function(val) {
              return val + ' tasks'
            }
          }
        }
      }
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.taskStats !== prevProps.taskStats) {
      this.setState({
        series: [{
          name: 'Tasks',
          data: [
            this.props.taskStats.byPriority['1'] || 0,
            this.props.taskStats.byPriority['2'] || 0,
            this.props.taskStats.byPriority['3'] || 0,
            this.props.taskStats.byPriority['4'] || 0
          ]
        }]
      });
    }
  }

  render() {
    return (
      <div className='col-span-12 rounded-sm border border-stroke bg-white px-5 pt-7.5 pb-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5'>
        <div className='flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap'>
          <div className='flex flex-wrap gap-3 sm:gap-5'>
            <div className='flex min-w-47.5'>
              <h4 className='text-xl font-bold text-black dark:text-white'>
                Tasks by Priority
              </h4>
            </div>
          </div>
        </div>

        <div className='mt-4'>
          <div id='chartOne' className='-ml-5 -mb-9'>
            <ReactApexChart
              options={this.state.options}
              series={this.state.series}
              type='bar'
              height={350}
            />
          </div>
        </div>
      </div>
    )
  }
}

export default ChartOne;
