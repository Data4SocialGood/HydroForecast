import React, {useState} from 'react';
import {IDataset} from "app/shared/model/dataset.model";
import {
  Accordion,
  Checkbox,
  Divider,
  Dropdown,
  DropdownDivider,
  DropdownItem,
  Icon,
  Image,
  List,
  Message,
  Popup,
  Radio,
  Segment
} from "semantic-ui-react";
import {reset, updateFilters, updateTimeRange, updateTimeSeriesDataToggle, updateClusters} from "app/modules/visualizer/visualizer.reducer";
import {NavLink as Link} from 'react-router-dom';
import _ from 'lodash';
import {ITimeRange} from "app/shared/model/time-range";
import {
  DatesRangeInput
} from 'semantic-ui-calendar-react';
import {Slide} from "react-toastify";

export interface IVisControlProps {
  dataset: IDataset,
  datasets: IDataset[],
  facets: any,
  groupByCols: number[],
  categoricalFilters: any,
  updateFilters: typeof updateFilters,
  reset: typeof reset,
  timeRange: ITimeRange,
  updateTimeRange: typeof updateTimeRange,
  updateClusters: typeof updateClusters,
  disabledTimeSeriesDataToggle: boolean,
  timeSeriesDataToggle: boolean,
  updateTimeSeriesDataToggle: typeof updateTimeSeriesDataToggle,
}


export const VisControl = (props: IVisControlProps) => {
  const {dataset, datasets, categoricalFilters, facets,
    timeSeriesDataToggle, disabledTimeSeriesDataToggle, timeRange} = props;

  const [expandedFilter, setExpandedFilter] = useState(null);

  const [dateRange, setDateRange] = useState('');

  const [activeDate, setActiveDate] = useState(0);

  const onChangeCheckbox = (evt, data) => {
    if(!disabledTimeSeriesDataToggle)
      props.updateTimeSeriesDataToggle(data.checked);
  }

  const handleChange = (event, {name, value}) => {
    setDateRange(value);
    const dates = (value.split(" - "));
    if (dates.length === 2 && dates[1] !== ""){
      const parts1 = dates[0].split('-');
      const parts2 = dates[1].split('-');
      const dates1 = new Date(parts1[2], parts1[1], parts1[0]);
      const dates2 = new Date(parts2[2], parts2[1], parts2[0]);
      const t = {from: dates1.getTime(), to: dates2.getTime()}
      props.updateTimeRange(t, dataset.id);
    }
  }

  const handleAccordionClick = (e, data) => {
    e.stopPropagation();
    const {index} = data;
    const newIndex = expandedFilter === index ? null : index;
    setExpandedFilter(newIndex);
  };

  const handleFilterChange = (dimIndex) => (e, {value}) => {
    e.stopPropagation();
    const filters = {...categoricalFilters};
    filters[dimIndex] = value === "" ? null : value;
    props.updateFilters(dataset.id, filters);
  };

  const removeFilter = (dimIndex) => () => {
    const filters = {...categoricalFilters};
    props.updateFilters(dataset.id, _.omit(filters, dimIndex));
  };


  const filterDropdowns = facets &&
    <div className='filters'>
      <Dropdown scrolling style={{padding: '10px', marginTop: '0'}}
                className='icon left' text='Select one or more filters'
                icon='filter' fluid
                floating
                labeled
                button>
        <Accordion fluid as={Dropdown.Menu}>
          {dataset.dimensions
            .map((dimension, i) => (
              facets[dimension] && <Dropdown.Item
                key={i}
                onClick={handleAccordionClick}
                index={dimension} className='dimension-filter'>
                <Accordion.Title
                  onClick={handleAccordionClick}
                  index={dimension}
                  className="filter-accordion-title"
                  active={expandedFilter === dimension}
                  content={dataset.headers[dimension]}
                  icon="sort down"
                />
                <Accordion.Content active={expandedFilter === dimension}>
                  <List relaxed verticalAlign="middle">
                    {facets[dimension].map((value, index) => (
                      <List.Item onClick={handleFilterChange(dimension)} value={value} key={index}>
                        <List.Icon
                          name={value === categoricalFilters[dimension] ? 'dot circle outline' : 'circle outline'}
                        />
                        <List.Content>
                          <List.Description
                            className="dropdown-description">{value}</List.Description>
                        </List.Content>
                      </List.Item>
                    ))}
                  </List>
                </Accordion.Content>
              </Dropdown.Item>
            ))}
        </Accordion></Dropdown></div>;


  const removeFilters =
    <div className="remove-filters">
      {categoricalFilters && _.map(categoricalFilters, (value, dim) => {
        return (
          <div className="remove-filter" key={dim}>
            <Icon link name='close' onClick={removeFilter(dim)}/>
            <span className="remove-filter-dim-label">{dataset.headers[dim]} / </span>
            <span className="remove-filter-value">
                    {value}
                  </span>
          </div>
        );
      })}
    </div>;


  const handleRangeListClick = (id) => {
    setActiveDate(id);
    const now = (Date.now());
    let t;
    const start = 2 * 365 * 24 * 60 * 60 * 1000;
    switch(id){
      case 0:
        t = {from: 0, to: now};
        break;
      case 1:
        t = {from: 0, to: now - start};
        break;
      case 2:
        t = {from: 0, to: now - (start /2)};
        break;
      case 3:
        t = {from: 0, to: now - (start /4)};
        break;

        case 4:
        t = {from: 0, to: now - (start /8)};
        break;
      case 5:
        t = {from: 0, to: now - (start / 24)};
        break;
      default:
        t = {from: 0, to: now};
    }
    props.updateTimeRange(t, dataset.id);
  }

  return datasets && <Segment id='vis-control' padded='very' raised>
    {/* <Image href='/' src='./content/images/vf_logo.png' style={{width: 300, paddingBottom: "10px"}}/> */}
    <h4>
      Dataset
    </h4>
    <Dropdown scrolling style={{padding: '10px', marginBottom: '20px'}}
              className='icon left' text={dataset.name}
              fluid
              floating
              labeled
              button>
      <Dropdown.Menu>
        {datasets.map((d, index) => <Dropdown.Item key={index} as={Link} to={`/visualize/${d.id}`}
                                                   text={d.name}/>)}
         <DropdownDivider />
         <DropdownItem key="addNew" as={Link} to={'/upload'} text="New Dataset" icon="plus" />
      </Dropdown.Menu>
    </Dropdown>
    <h4>
      Filtering
    </h4>
    {filterDropdowns}
    {removeFilters}
    <h4>
      Time Range
    </h4>
    <List className="ui horizontal link list">
      <List.Item  as='a' active={activeDate === 0} onClick={(e) => handleRangeListClick(0)}>All</List.Item>
      <List.Item  as='a' active={activeDate === 1} onClick={(e) => handleRangeListClick(1)} >2Y</List.Item>
      <List.Item  as='a' active={activeDate === 2} onClick={(e) => handleRangeListClick(2)} >1Y</List.Item>
      <List.Item  as='a' active={activeDate === 3} onClick={(e) => handleRangeListClick(3)}>6M</List.Item>
      <List.Item  as='a' active={activeDate === 4} onClick={(e) => handleRangeListClick(4)}>3M</List.Item>
      <List.Item  as='a' active={activeDate === 5} onClick={(e) => handleRangeListClick(5)}>1M</List.Item>
    </List>
    <div style={{width:'100%'}}>
      <DatesRangeInput
        name="datesRange"
        placeholder="Custom Date Range"
        value={dateRange}
        closable
        style={{padding:0, width:'100%'}}
        iconPosition="left"
        onChange={handleChange}
      />
    </div>
    <h4>
      <div style={{width:'100%', display:"flex",
        alignItems:"left", justifyContent:"left",
        margin:"0 auto"}} className={"inline fields"}>
        <span>Time Series Data </span>
        <Checkbox style={{paddingLeft:"15px"}}
                  onClick={(evt, data)=> onChangeCheckbox(evt, data)}
                  toggle
                  checked={timeSeriesDataToggle}
                  disabled={disabledTimeSeriesDataToggle} />
      </div>
    </h4>
  </Segment>
};


export default VisControl;
