import React, { Component } from 'react';
import ReactApexChart from 'react-apexcharts'

class ChartTen extends Component {
  constructor(props) {
    super(props)

    this.state = {
      series: [{
        name: 'Tasks',
        data: [] // Will be updated in componentDidUpdate
      }],
      options: {
        colors: ['#3C50E0'],
        chart: {
          fontFamily: 'Satoshi, sans-serif',
          type: 'bar',
          height: 318,
          toolbar: {
            show: false,
          }
        },
        plotOptions: {
          bar: {
            horizontal: true,
            columnWidth: '35%',
            borderRadius: 1,
          }
        },
        dataLabels: {
          enabled: true
        },
        xaxis: {
          categories: [], // Will be updated in componentDidUpdate
          title: {
            text: 'Number of Tasks'
          }
        },
        yaxis: {
          title: {
            text: 'Task Types'
          }
        }
      }
    }
  }

  getTaskTypeName(type) {
    const typeNames = {
      1: 'Feature Development',
      2: 'Bug Fix',
      3: 'Documentation',
      4: 'Testing',
      5: 'Design',
      6: 'Research',
      7: 'Maintenance',
      8: 'Infrastructure',
      9: 'Code Review',
      10: 'Other'
    };
    return typeNames[type] || `Type ${type}`;
  }

  componentDidUpdate(prevProps) {
    if (this.props.taskStats !== prevProps.taskStats) {
      const types = Object.keys(this.props.taskStats.byType);
      const data = Object.values(this.props.taskStats.byType);
      
      this.setState({
        series: [{
          name: 'Tasks',
          data: data
        }],
        options: {
          ...this.state.options,
          xaxis: {
            ...this.state.options.xaxis,
            categories: types.map(type => this.getTaskTypeName(type))
          }
        }
      });
    }
  }

  render() {
    return (
      <div className='rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark'>
        <div className='p-4 md:p-6 xl:p-7.5'>
          <div>
            <h2 className='text-xl font-bold text-black dark:text-white'>
              Tasks by Type
            </h2>
          </div>
          <div className='mt-4'>
            <div id='chartTen'>
              <ReactApexChart
                options={this.state.options}
                series={this.state.series}
                type='bar'
                height={318}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default ChartTen;
