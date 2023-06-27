import React, {useState} from 'react';
import {IDataset} from "app/shared/model/dataset.model";
import {Button, Checkbox, Container, Dropdown, Label, Popup, Segment, Statistic} from "semantic-ui-react";
import {IRectStats} from "app/shared/model/rect-stats.model";
import './visualizer.scss';
import {updateMapType, updateSelectedMeasure} from "app/modules/visualizer/visualizer.reducer";
import {ISingleRectStats} from "app/shared/model/single-rect-stats.model";

export interface IStatsPanelProps {
  dataset: IDataset,
  singleStats : ISingleRectStats,
  rectStats: IRectStats,
  updateMapType: typeof updateMapType,
  updateSelectedMeasure: typeof updateSelectedMeasure,
  timeSeriesDataToggle: boolean,
}


export const StatsPanel = (props: IStatsPanelProps) => {
  const {dataset, singleStats, rectStats} = props;
  const [selectedMeasure, setSelectedMeasure] = useState(0);

  const formatStat = (stat) => stat !== null ? stat.toFixed(2) : 'N/A';
  const [mapType, setMapType] = useState('map');

  const handleMapTypeChange = (newMapType) => () => {
    if (newMapType !== mapType) {
      props.updateMapType(newMapType);
    }
    setMapType(newMapType);
  };


  const handleSelectedMeasureChange = (newSelectedMeasure) => {
    // if(selectedMeasure !== newSelectedMeasure){
    //   if(newSelectedMeasure === 1)  props.updateSelectedMeasure(dataset.measure0);
    //   else if(newSelectedMeasure === 2) props.updateSelectedMeasure(dataset.measure1);
    // }
    props.updateSelectedMeasure(newSelectedMeasure);
    setSelectedMeasure(newSelectedMeasure);
  };

  return <Segment id='stats-panel' textAlign='left' raised padded>
    <Label attached='top' size='large'>Statistics for <i>{rectStats.count}</i> objects</Label>
    <Button.Group floated='right' basic size='mini'>
      <Popup content="Map" trigger={
        <Button icon='map' active={mapType === 'map'} onClick={handleMapTypeChange('map')}/>
      }/>
      <Popup content="Heatmap" trigger={
        <Button icon='th' active={mapType === 'heatmap'} onClick={handleMapTypeChange('heatmap')}/>
      }/>
    </Button.Group>
    <h5>Statistics for field: <Label><Dropdown
      options={[
        {text: 'ΚΑΤΑΝΑΛΩΣΗ', value: 0},
        {text: dataset.headers[dataset.measure0], value: 1},
        {text: dataset.headers[dataset.measure1], value: 2}
      ]}
      inline
      value={selectedMeasure}
      onChange={(event, data) => handleSelectedMeasureChange(data.value as number)}/></Label>
    </h5>
    <Statistic.Group widths='five' className='field-stats'>
      <Statistic>
        <Statistic.Value>{selectedMeasure === 0 ? formatStat(singleStats['min']) : formatStat(rectStats['min' + (selectedMeasure - 1)])}</Statistic.Value>
        <Statistic.Label>Min</Statistic.Label>
      </Statistic>
      <Statistic>
        <Statistic.Value>{selectedMeasure === 0 ? formatStat(singleStats['max']) : formatStat(rectStats['max' + (selectedMeasure - 1)])}</Statistic.Value>
        <Statistic.Label>Max</Statistic.Label>
      </Statistic>
      <Statistic>
        <Statistic.Value>{selectedMeasure === 0 ? formatStat(singleStats['mean']) : formatStat(rectStats['mean' + (selectedMeasure - 1)])}</Statistic.Value>
        <Statistic.Label>Mean</Statistic.Label>
      </Statistic>
      <Statistic>
        <Statistic.Value>{selectedMeasure === 0 ? formatStat(singleStats['standardDeviation']) : formatStat(rectStats['standardDeviation' + (selectedMeasure - 1)])}</Statistic.Value>
        <Statistic.Label>SD</Statistic.Label>
      </Statistic>
      <Statistic>
        <Statistic.Value>{selectedMeasure === 0 ? formatStat(singleStats['variance']) : formatStat(rectStats['variance' + (selectedMeasure - 1)])}</Statistic.Value>
        <Statistic.Label>Var</Statistic.Label>
      </Statistic>
    </Statistic.Group>
    <h5>Statistics between fields: <Label><Dropdown
      options={[{text: dataset.headers[dataset.measure0] + ' ~ ' + dataset.headers[dataset.measure1], value: 0}]}
      inline
      value={0}/>
    </Label></h5>
    <Statistic.Group widths='two' className='field-stats'>
      <Statistic>
        <Statistic.Value>{formatStat(rectStats.pearsonCorrelation)}</Statistic.Value>
        <Statistic.Label>Pearson Correlation</Statistic.Label>
      </Statistic>
      <Statistic>
        <Statistic.Value>{formatStat(rectStats.covariance)}</Statistic.Value>
        <Statistic.Label>Covariance</Statistic.Label>
      </Statistic>
    </Statistic.Group>
  </Segment>
};


export default StatsPanel;
