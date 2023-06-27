import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';

import { IRootState } from 'app/shared/reducers';
import {
  getDataset,
  getIndexStatus,
  getRow,
  reset,
  updateAggType,
  updateClusters,
  updateDrawnRect,
  updateFilters,
  updateGroupBy,
  updateMapBounds,
  updateMeasure,
  updateSelectedMeasure,
  updateMapType,
  updateTimeRange,
  updateTimeSeriesDataToggle,
  updateExpandedClusterIndex,
  toggleTimeSeriesData,
  updateSelectedTimeSeries,
  forecast,
  getDatasets,
} from './visualizer.reducer';
import Map from 'app/modules/visualizer/map';
import './visualizer.scss';
import StatsPanel from 'app/modules/visualizer/stats-panel';
import Chart from 'app/modules/visualizer/chart';
import VisControl from 'app/modules/visualizer/vis-control';
import { Header, Modal, Progress } from 'semantic-ui-react';
import QueryInfoPanel from 'app/modules/visualizer/query-info-panel';
import ChartTS from "app/modules/visualizer/chart-ts";

export interface IVisPageProps extends StateProps, DispatchProps, RouteComponentProps<{ id: string }> {}

export const VisPage = (props: IVisPageProps) => {
  const {
    dataset,
    datasets,
    loading,
    indexStatus,
    clusters,
    viewRect,
    series,
    otherSeries,
    singleStats,
    rectStats,
    groupByCols,
    aggType,
    measureCol,
    timeSeriesDataToggle,
    categoricalFilters,
    disabledTimeSeriesDataToggle,
    facets, ioCount, pointCount, tileCount, fullyContainedTileCount,
    totalPointCount, zoom, totalTileCount, totalTime, executionTime,
    row, mapType, selectedMeasure, timeRange, timeSeries,selectedTimeSeries,
  } = props;

  useEffect(() => {
    props.getDataset(props.match.params.id);
    props.getDatasets();
    props.getIndexStatus(props.match.params.id);
  }, [props.match.params.id]);

  useEffect(() => {
    if(zoom >= 16) props.toggleTimeSeriesData(false);
    else {
      props.toggleTimeSeriesData(true);
      props.updateTimeSeriesDataToggle(false);
    }
  }, [zoom]);

  useEffect(() => {
    if (!indexStatus.isInitialized) {
      setTimeout(() => {
        props.getIndexStatus(props.match.params.id);
      }, 1000);
    }
  }, [indexStatus]);

  return !loading && <div>
    <div className='left-panel-group'>
    <VisControl dataset={dataset} datasets={datasets} groupByCols={groupByCols}
                timeRange={timeRange} updateTimeRange = {props.updateTimeRange}
                updateClusters = {props.updateClusters} disabledTimeSeriesDataToggle={disabledTimeSeriesDataToggle}
                updateTimeSeriesDataToggle = {props.updateTimeSeriesDataToggle} timeSeriesDataToggle={timeSeriesDataToggle}
                categoricalFilters={categoricalFilters} facets={facets}
                updateFilters={props.updateFilters} reset={props.reset}
    />
    </div>
    <Map id={props.match.params.id} clusters={clusters} updateMapBounds={props.updateMapBounds}
         updateDrawnRect={props.updateDrawnRect} dataset={dataset}
         viewRect={viewRect} zoom={zoom}
         updateExpandedClusterIndex={props.updateExpandedClusterIndex}
         row={row} getRow={props.getRow}
         mapType = {mapType}
         updateSelectedTimeSeries={props.updateSelectedTimeSeries}
         selectedMeasure={selectedMeasure}
         expandedClusterIndex={props.expandedClusterIndex} />
    <div className='bottom-panel-group'>
      <QueryInfoPanel dataset={dataset}
                      fullyContainedTileCount={fullyContainedTileCount}
                      ioCount={ioCount}
                      pointCount={pointCount} tileCount={tileCount} totalPointCount={totalPointCount}
                      totalTileCount={totalTileCount} totalTime={totalTime} executionTime={executionTime}/>
    </div>

    <div className='right-panel-group'>
      {rectStats && <>
        {(dataset.measure0 != null ) &&
          timeSeriesDataToggle ?
          <ChartTS dataset={dataset} series={series} otherSeries={otherSeries}
                   updateGroupBy={props.updateGroupBy} groupByCols={groupByCols}
                   aggType={aggType} measureCol={measureCol} updateAggType={props.updateAggType}
                   updateMeasure={props.updateMeasure} dataSource = {dataset.dataSource} timeSeries={timeSeries}
                   forecast = {props.forecast}
                   updateSelectedTimeSeries = {props.updateSelectedTimeSeries} selectedTimeSeries={selectedTimeSeries}/>
          :
          <>
          <StatsPanel dataset={dataset} rectStats={rectStats} singleStats={singleStats}
          updateMapType={props.updateMapType} updateSelectedMeasure={props.updateSelectedMeasure}
          timeSeriesDataToggle={timeSeriesDataToggle}/>
          <Chart dataset={dataset} series={series} otherSeries={otherSeries}
                 updateGroupBy={props.updateGroupBy} groupByCols={groupByCols}
                 aggType={aggType} measureCol={measureCol} updateAggType={props.updateAggType}
                 updateMeasure={props.updateMeasure} dataSource = {dataset.dataSource} />
          </>}
      </>}
    </div>
    <Modal
      basic
      open={!indexStatus.isInitialized}
      size='small'>
      <Header textAlign='center'>
        Parsing and indexing dataset {dataset.name}
      </Header>
      <Modal.Content>
        <Progress inverted value={indexStatus.objectsIndexed} total={dataset.objectCount} label={"Objects indexed: " + indexStatus.objectsIndexed} autoSuccess />
      </Modal.Content>
    </Modal>
      </div>
};

const mapStateToProps = ({ visualizer }: IRootState) => ({
  loading: visualizer.loading,
  dataset: visualizer.dataset,
  datasets: visualizer.datasets,
  timeRange: visualizer.timeRange,
  viewRect: visualizer.viewRect,
  drawnRect: visualizer.drawnRect,
  timeSeries: visualizer.timeSeries,
  series: visualizer.series,
  timeSeriesDataToggle: visualizer.timeSeriesDataToggle,
  disabledTimeSeriesDataToggle: visualizer.disabledTimeSeriesDataToggle,
  otherSeries: visualizer.otherSeries,
  cleanedSeries: visualizer.cleanedSeries,
  singleStats: visualizer.singleStats,
  rectStats: visualizer.rectStats,
  clusters: visualizer.clusters,
  groupByCols: visualizer.groupByCols,
  aggType: visualizer.aggType,
  measureCol: visualizer.measureCol,
  zoom: visualizer.zoom,
  categoricalFilters: visualizer.categoricalFilters,
  facets: visualizer.facets,
  indexStatus: visualizer.indexStatus,
  fullyContainedTileCount: visualizer.fullyContainedTileCount,
  tileCount: visualizer.tileCount,
  pointCount: visualizer.pointCount,
  ioCount: visualizer.ioCount,
  totalTileCount: visualizer.totalTileCount,
  totalPointCount: visualizer.totalPointCount,
  totalTime: visualizer.totalTime,
  executionTime: visualizer.executionTime,
  row: visualizer.row,
  expandedClusterIndex: visualizer.expandedClusterIndex,
  cleanedRectStats: visualizer.cleanedRectStats,
  mapType: visualizer.mapType,
  selectedMeasure: visualizer.selectedMeasure,
  selectedTimeSeries: visualizer.selectedTimeSeries,
});

const mapDispatchToProps = {
  getDataset,
  getDatasets,
  updateMapBounds,
  updateAggType,
  updateDrawnRect,
  updateGroupBy,
  updateMeasure,
  updateFilters,
  reset,
  updateTimeRange,
  getIndexStatus,
  updateClusters,
  getRow,
  updateTimeSeriesDataToggle,
  updateMapType,
  updateExpandedClusterIndex,
  updateSelectedMeasure,
  toggleTimeSeriesData,
  updateSelectedTimeSeries,
  forecast,
};

type StateProps = ReturnType<typeof mapStateToProps>;
type DispatchProps = typeof mapDispatchToProps;

// @ts-ignore
export default connect(mapStateToProps, mapDispatchToProps)(VisPage);
