import React, {useEffect, useRef, useState} from 'react';
import Highcharts from "highcharts/highcharts";
import HighchartsReact from 'highcharts-react-official';
import {IDataset} from "app/shared/model/dataset.model";
import {Button, Checkbox, Dropdown, Label, Popup, Search, Segment} from "semantic-ui-react";
import {updateAggType, updateGroupBy, updateMeasure, updateSelectedTimeSeries, forecast} from './visualizer.reducer';
import {AggregateFunctionType} from "app/shared/model/enumerations/aggregate-function-type.model";
import {IGroupedStats} from "app/shared/model/grouped-stats.model";
import _, {filter} from 'lodash';
import HighchartsMore from 'highcharts/highcharts-more';
import {ITimeSeries} from "app/shared/model/time-series.model";

HighchartsMore(Highcharts);

export interface IChartTSProps {
  dataset: IDataset,
  series: IGroupedStats[],
  otherSeries: IGroupedStats[],
  groupByCols: number[],
  measureCol: number,
  aggType: AggregateFunctionType,
  dataSource: number,
  timeSeries: ITimeSeries[],
  updateGroupBy: typeof updateGroupBy,
  updateAggType: typeof updateAggType,
  updateMeasure: typeof updateMeasure,
  updateSelectedTimeSeries: typeof updateSelectedTimeSeries,
  selectedTimeSeries: number,
  forecast: typeof forecast,
}


export const ChartTS = (props: IChartTSProps) => {
  const {timeSeries, selectedTimeSeries} = props;
  const [seriesData, setSeriesData] = useState([{data: [], name: "", id: null, digital: null}]);

  const [selectedId, setSelectedId] = useState(selectedTimeSeries);
  const [selectedResult, setSelectedResult] = useState();

  const [selectedForecast, setSelectedForecast] = useState("3 months");
  const [names, setNames] = useState([]);

  useEffect(() => {
    const data = [];
    const n = [];
    for(let i = 0; i < timeSeries.length; i += 1){
      const s = [];
      if(timeSeries[i].dataPoints) {
        for (let j = 0; j < timeSeries[i].dataPoints.length; j += 1) {
          s.push({x:(timeSeries[i].dataPoints[j].timestamp * 1000), y:timeSeries[i].dataPoints[j].value});
        }
        data.push({name: timeSeries[i].name, data: s, id: timeSeries[i].id})
        n.push(timeSeries[i].name)
      }
    }
    setNames(n);
    setSeriesData(data);
  }, [timeSeries]);


  useEffect(() => {
    setSeriesData(seriesData.filter((s) => s.id === selectedId));
  }, [selectedId]);

  const handleUpdateTimeSeries = (id) => {
    props.updateSelectedTimeSeries(id);
    setSelectedId(id);
  }

  // const handleForecast = () => {
  //   props.forecast(selectedId)
  // }

  const isLoading = false;
  const forecastValues = ["3 months", "6 months", "year"]
  const forecastOptions = forecastValues.map(dim => ({key: dim, value: dim, text: dim}));
  const searchRef = useRef();

  const handleForecastChange = (e, {value}) => {
    setSelectedForecast(value);
  }

  const handleForecast = () => {
    const d = seriesData[0];
    //if(d.digital) {
      props.forecast("lsn_960696", 30)
    //}
    let n;
    switch(selectedForecast){
      case("3 months"):
        n = d.data.slice(-3);
        n = n.map(s => {return {x: s.x + 3 * 2629800000, y: s.y + 10}});
        break;
      case("6 months"):
        n = d.data.slice(-6);
        n = n.map(s => {return {x: s.x + 6* 2629800000, y: s.y + 10}});
        break;
      case("year"):
        n = d.data.slice(-12);
        n = n.map(s => {return {x: s.x + 12* 2629800000, y: s.y + 10}});
        break;
      default:
        break;
    }
    setSeriesData([{data: n, name: d.name, id: d.id, digital: d.digital}])
  }

  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const resultRenderer = ({name}) => {
    return (
      <div>
        <p>{name}</p>
      </div>
    );
  }

  const handleResultSelect = (e, { result }) => {
    setSelectedResult(result.name);
    setSelectedId(result.id);
  };

  const handleSearchChange = (e, { value }) => {
    setSearchValue(value);
    const d = seriesData;
    // Filter the combined array based on the search value
    const filteredResults = d.filter(item =>{
      if(item.name != null)
        return item.name.toLowerCase().includes(value.toLowerCase())}
    );
    setSearchResults(filteredResults)
    // setSearchResults(filteredResults.map(f => f.name));
    setSeriesData(d);
  };


  const handleKeyDown = (e) => {
    // @ts-ignore
    if (e.keyCode === 8) {
      // Backspace key is pressed and search input is empty
      setSelectedResult(null);
      setSelectedId(null);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return <Segment id='chart-container' raised textAlign='center'>
    <Search
      input={{ fluid: true }}
      onSearchChange={handleSearchChange}
      onResultSelect={handleResultSelect}
      value={selectedResult ? selectedResult : searchValue}
      results={searchResults}
      // resultRenderer = {resultRenderer}
      className={"ui black"}
      ref={searchRef}
    />
    <h4>
      <div style={{width:'100%', display:"flex",
        alignItems:"center", justifyContent:"left",
        margin:"0 auto"}} className={"inline fields"}>
        <span style={{width:"50%"}}> Forecast next:  <Dropdown scrolling={true} options={forecastOptions} inline
                             value={selectedForecast}
                                         onChange={handleForecastChange}/></span>
          <Button style={{marginLeft:"30px"}}
                  disabled={selectedId === null}
                  onClick={() => handleForecast()}
                  content = {selectedId === null ? "Click on a time series to enable" : ""}
                  basic loading = {isLoading}>
          APPLY
        </Button>
      </div>
    </h4>
    <HighchartsReact
      highcharts={Highcharts}
      // constructorType={"stockChart"}
      containerProps={{className: "chartContainer"}}
      allowChartUpdate={true}
      immutable={false}
      updateArgs={[true, true, true]}
      options= {{
        chart: {
          type: 'line',
          height: '300px',
          marginTop: 10,
          paddingTop: 0,
          marginBottom: 50,
          plotBorderWidth: 1,
        },
        xAxis: {
          ordinal: false,
          type: "datetime",
          title: {
            text: 'Time',
            style: {
              fontSize: "1.1em"
            },
          },
        },
        yAxis: {
          title: {
            text: 'Consumption',
            style: {
              fontSize: "1.1em"
            }
          },
        },
        colorAxis: {
          min: 0,
          minColor: '#FFFFFF',
          maxColor: '#2185d0'
        },
        plotOptions: {
          line: {
            cursor: 'pointer',
          },
          series: {
            events: {
              click() {
                handleUpdateTimeSeries(this.options.id);
             },
            }
          }
        },
        legend: {
          enabled: false
        },
        title: null,
        series: seriesData,
      }}
    />
  </Segment>
};


export default ChartTS;
