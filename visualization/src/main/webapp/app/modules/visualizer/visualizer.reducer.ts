import axios from 'axios';
import { FAILURE, REQUEST, SUCCESS } from 'app/shared/reducers/action-type.util';
import { IDataset } from 'app/shared/model/dataset.model';
import { IQuery } from 'app/shared/model/query.model';
import { LatLngBounds } from 'leaflet';
import Supercluster from 'supercluster';
import { IRectangle } from 'app/shared/model/rectangle.model';
import { AggregateFunctionType } from 'app/shared/model/enumerations/aggregate-function-type.model';
import { IRectStats } from 'app/shared/model/rect-stats.model';
import { IDedupStats } from 'app/shared/model/rect-dedup-stats.model';
import { IGroupedStats } from 'app/shared/model/grouped-stats.model';
import { defaultValue, IIndexStatus } from 'app/shared/model/index-status.model';
import { MAX_ZOOM, MIN_DEDUP_ZOOM_LEVEL } from 'app/config/constants';
import {act} from "react-dom/test-utils";
import {ISingleRectStats} from "app/shared/model/single-rect-stats.model";
import {ITimeRange} from "app/shared/model/time-range";

export const ACTION_TYPES = {
  FETCH_DATASET: 'visualizer/FETCH_DATASET',
  FETCH_DATASET_LIST: 'dataset/FETCH_DATASET_LIST',
  RESET: 'visualizer/RESET',
  UPDATE_MAP_BOUNDS: 'visualizer/UPDATE_MAP_BOUNDS',
  UPDATE_CLUSTERS: 'visualizer/UPDATE_CLUSTERS',
  UPDATE_FACETS: 'visualizer/UPDATE_FACETS',
  UPDATE_GROUP_BY: 'visualizer/UPDATE_GROUP_BY',
  UPDATE_MEASURE: 'visualizer/UPDATE_MEASURE',
  UPDATE_AGG_TYPE: 'visualizer/UPDATE_AGG_TYPE',
  UPDATE_CHART_TYPE: 'visualizer/UPDATE_CHART_TYPE',
  UPDATE_DRAWN_RECT: 'visualizer/UPDATE_DRAWN_RECT',
  UPDATE_ANALYSIS_RESULTS: 'visualizer/UPDATE_ANALYSIS_RESULTS',
  UPDATE_FILTERS: 'visualizer/UPDATE_FILTERS',
  UPDATE_QUERY_INFO: 'visualizer/UPDATE_QUERY_INFO',
  FETCH_INDEX_STATUS: 'visualizer/FETCH_INDEX_STATUS',
  UPDATE_CLUSTER_STATS: 'visualizer/UPDATE_CLUSTER_STATS',
  UPDATE_EXPANDED_CLUSTER_INDEX: 'visualizer/UPDATE_EXPANDED_CLUSTER_INDEX',
  UPDATE_MAP_TYPE: 'visualizer/UPDATE_MAP_TYPE',
  UPDATE_SELECTED_MEASURE: 'visualizer/UPDATE_SELECTED_MEASURE',
  UPDATE_TIME_RANGE: 'visualizer/UPDATE_TIME_RANGE',
  TOGGLE_TIMESERIES_DATA: 'visualizer/TOGGLE_TIMESERIES_DATA',
  UPDATE_TIMESERIES_DATA_TOGGLE: 'visualizer/UPDATE_TIMESERIES_DATA_TOGGLE',
  UPDATE_SELECTED_TIME_SERIES: 'visualizer/UPDATE_SELECTED_TIME_SERIES',
  FETCH_ROW: 'visualizer/FETCH_ROW',
  FORECAST: 'visualizer/FORECAST'
};

const initialState = {
  indexStatus: defaultValue,
  loading: true,
  loadingDups: false,
  firstDupLoad: true,
  errorMessage: null,
  dataset: null,
  datasets: null,
  zoom: 14,
  categoricalFilters: {},
  disabledTimeSeriesDataToggle: true,
  timeSeriesDataToggle: false,
  groupByCols: null,
  measureCol: null,
  aggType: AggregateFunctionType.AVG,
  viewRect: null as IRectangle,
  drawnRect: null as IRectangle,
  series: [] as IGroupedStats[],
  otherSeries: [] as IGroupedStats[],
  cleanedSeries: [] as IGroupedStats[],
  timeRange: {from: 0, to: Date.now()},
  facets: {},
  rectStats: null as IRectStats,
  singleStats: null as ISingleRectStats,
  dedupStats: null as IDedupStats,
  cleanedRectStats: null as IRectStats,
  clusters: [],
  fullyContainedTileCount: 0,
  tileCount: 0,
  pointCount: 0,
  ioCount: 0,
  totalTileCount: 0,
  totalPointCount: 0,
  executionTime: 0,
  totalTime: 0,
  bounds: null,
  expandedClusterIndex: null,
  row: null,
  selectedPointId: null,
  mapType: 'map',
  selectedMeasure: 0,
  timeSeries: [],
  selectedTimeSeries: null,
};

export type VisualizerState = Readonly<typeof initialState>;

// Reducer

export default (state: VisualizerState = initialState, action): VisualizerState => {
  switch (action.type) {
    case REQUEST(ACTION_TYPES.FETCH_DATASET):
      return {
        ...initialState,
        errorMessage: null,
        loading: true,
      };
    case FAILURE(ACTION_TYPES.FETCH_DATASET):
      return {
        ...state,
        loading: false,
        errorMessage: action.payload,
      };
    case SUCCESS(ACTION_TYPES.FETCH_DATASET):
      return {
        ...state,
        loading: false,
        dataset: action.payload.data,
        groupByCols: [action.payload.data.dimensions[0]],
        measureCol: action.payload.data.measure0 && action.payload.data.measure0,
      };
    case SUCCESS(ACTION_TYPES.FETCH_DATASET_LIST):
      return {
        ...state,
        datasets: action.payload.data,
      };
    case SUCCESS(ACTION_TYPES.UPDATE_CLUSTERS):
      return {
        ...state,
        clusters: action.payload,
        expandedClusterIndex: null,
        totalTime: new Date().getTime() - action.meta.requestTime,
      };
    case  ACTION_TYPES.UPDATE_MAP_TYPE:
      return{
        ...state,
        mapType: action.payload,
      };
    case ACTION_TYPES.UPDATE_TIMESERIES_DATA_TOGGLE:
      return{
        ...state,
        timeSeriesDataToggle: action.payload,
      };
    case ACTION_TYPES.UPDATE_FACETS:
      return {
        ...state,
        facets: action.payload,
      };
    case ACTION_TYPES.UPDATE_GROUP_BY:
      return {
        ...state,
        groupByCols: action.payload,
        series: action.payload.length !== state.groupByCols.length ? [] : state.series,
      };
    case ACTION_TYPES.UPDATE_MEASURE:
      return {
        ...state,
        measureCol: action.payload,
      };
    case ACTION_TYPES.UPDATE_FILTERS:
      return {
        ...state,
        categoricalFilters: action.payload,
      };
    case ACTION_TYPES.UPDATE_AGG_TYPE:
      return {
        ...state,
        aggType: action.payload,
      };
    case ACTION_TYPES.UPDATE_DRAWN_RECT:
      return {
        ...state,
        drawnRect: action.payload,
      };
    case ACTION_TYPES.UPDATE_MAP_BOUNDS:
      return {
        ...state,
        zoom: action.payload.zoom,
        viewRect: action.payload.viewRect,
      };
    case SUCCESS(ACTION_TYPES.UPDATE_ANALYSIS_RESULTS):
      return {
        ...state,
        series: action.payload.data.series,
        otherSeries: action.payload.data.otherSeries,
        rectStats: action.payload.data.rectStats,
        singleStats: action.payload.data.singleStats,
        cleanedSeries: action.payload.data.cleanedSeries,
        cleanedRectStats: action.payload.data.cleanedRectStats,
        selectedTimeSeries: null,
      };
    case ACTION_TYPES.UPDATE_ANALYSIS_RESULTS:
      return {
        ...state,
        series: action.payload.data.series,
        otherSeries: action.payload.data.otherSeries,
        rectStats: action.payload.data.rectStats,
        singleStats: action.payload.data.singleStats,
        cleanedSeries: action.payload.data.cleanedSeries,
        cleanedRectStats: action.payload.data.cleanedRectStats,
        timeSeries: action.payload.data.timeSeries,
      };
    case ACTION_TYPES.UPDATE_QUERY_INFO:
      return {
        ...state,
        fullyContainedTileCount: action.payload.fullyContainedTileCount,
        tileCount: action.payload.tileCount,
        pointCount: action.payload.pointCount,
        ioCount: action.payload.ioCount,
        totalTileCount: action.payload.totalTileCount,
        totalPointCount: action.payload.totalPointCount,
        executionTime: action.payload.executionTime,
      };
    case SUCCESS(ACTION_TYPES.RESET):
      return {
        ...state,
        drawnRect: null,
        indexStatus: defaultValue,
      };
    case ACTION_TYPES.TOGGLE_TIMESERIES_DATA:
      return {
        ...state,
        disabledTimeSeriesDataToggle: action.payload,
      };
    case SUCCESS(ACTION_TYPES.FETCH_INDEX_STATUS):
      return {
        ...state,
        indexStatus: action.payload.data,
      };
    case ACTION_TYPES.UPDATE_EXPANDED_CLUSTER_INDEX:
      return {
        ...state,
        expandedClusterIndex: action.payload,
      };
    case SUCCESS(ACTION_TYPES.UPDATE_TIME_RANGE):
      return {
        ...state,
        timeRange: action.payload.data,
      };
    case REQUEST(ACTION_TYPES.FETCH_ROW):
      return {
        ...state,
        selectedPointId: action.meta,
        row: null,
      };
    case SUCCESS(ACTION_TYPES.FETCH_ROW):
      return {
        ...state,
        row: action.payload.data,
      };
    case SUCCESS(ACTION_TYPES.UPDATE_SELECTED_MEASURE):
      return {
        ...state,
        selectedMeasure: action.payload.data,
      };
    case SUCCESS(ACTION_TYPES.UPDATE_SELECTED_TIME_SERIES):
      return {
        ...state,
        selectedTimeSeries: action.payload.data,
      };
    case SUCCESS(ACTION_TYPES.FORECAST):
      return {
        ...state,
      }
    default:
      return state;
  }
};

// Actions
export const getDataset = id => {
  const requestUrl = `api/datasets/${id}`;
  return {
    type: ACTION_TYPES.FETCH_DATASET,
    payload: axios.get<IDataset>(requestUrl),
  };
};

export const getDatasets = () => {
  const requestUrl = `api/datasets/`;
  return {
    type: ACTION_TYPES.FETCH_DATASET_LIST,
    payload: axios.get<IDataset>(requestUrl),
  };
};

export const getRow = (datasetId, rowId) => {
  const requestUrl = `api/datasets/${datasetId}/objects/${rowId}`;
  return {
    type: ACTION_TYPES.FETCH_ROW,
    payload: axios.get(requestUrl),
    meta: rowId,
  };
};

const prepareSupercluster = points => {
  const geoJsonPoints = points.map(point => ({
    type: 'Feature',
    properties: { totalCount: 1, points: [point], digital: point[5]},
    geometry: {
      type: 'Point',
      coordinates: [point[1], point[0]],
    },
  }));
  const supercluster = new Supercluster({
    log: false,
    radius: 60,
    extent: 256,
    maxZoom: MAX_ZOOM,
    minPoints: 3,
    reduce(accumulated, props) {
      accumulated.totalCount += props.totalCount;
      accumulated.digital = accumulated.points.some((point) => point[5] === true);
      accumulated.points = accumulated.points.concat(props.points);
    },
  });
  supercluster.load(geoJsonPoints);
  return supercluster;
};

const updateAnalysisResults = id => (dispatch, getState) => {
  const { categoricalFilters, drawnRect, groupByCols, measureCol, aggType, viewRect, timeRange, timeSeriesDataToggle} = getState().visualizer;
  const from = timeRange.from;
  const to = timeRange.to;
  // eslint-disable-next-line no-console
  const analysisQuery = { categoricalFilters, rect: drawnRect || viewRect, groupByCols, measureCol, aggType, timeSeriesDataToggle, from, to} as IQuery;
  dispatch({
    type: ACTION_TYPES.UPDATE_ANALYSIS_RESULTS,
    payload: axios.post(`api/datasets/${id}/query`, analysisQuery),
  });
};

export const updateClusters = id => (dispatch, getState) => {
  const {
    categoricalFilters,
    viewRect,
    zoom,
    timeRange,
    groupByCols,
    measureCol,
    aggType,
    drawnRect,
    timeSeriesDataToggle,
    dataset,
  } = getState().visualizer;
  let from;
  let to;
  if (timeRange) {
    from = timeRange.from;
    to = timeRange.to;
  }
  const requestTime = new Date().getTime();
  if (viewRect == null) {
    return;
  }
  dispatch({
    type: ACTION_TYPES.UPDATE_CLUSTERS,
    meta: { requestTime },
    payload: axios
      .post(`api/datasets/${id}/query`, {
        rect: viewRect,
        zoom,
        categoricalFilters,
        groupByCols,
        measureCol,
        aggType,
        timeSeriesDataToggle,
        from,
        to,
      })
      .then(res => {
        dispatch({ type: ACTION_TYPES.UPDATE_FACETS, payload: res.data.facets });
        const responseTime = new Date().getTime();
        dispatch({
          type: ACTION_TYPES.UPDATE_QUERY_INFO,
          payload: { ...res.data, executionTime: responseTime - requestTime },
        });

        const points = res.data.points || [];

        if (drawnRect == null) {
          dispatch({
            type: ACTION_TYPES.UPDATE_ANALYSIS_RESULTS,
            payload: res,
          });
        }
        const supercluster = prepareSupercluster(points);
        return supercluster.getClusters([-180, -85, 180, 85], zoom);
      }),
  });
};



export const updateClustersWTime = (id, timeRange) => (dispatch, getState) => {
  const {
    categoricalFilters,
    viewRect,
    zoom,
    groupByCols,
    measureCol,
    aggType,
    drawnRect,
    timeSeriesDataToggle,
    dataset,
  } = getState().visualizer;
  let from;
  let to;
  if (timeRange) {
    from = timeRange.from;
    to = timeRange.to;
  }
  const requestTime = new Date().getTime();
  if (viewRect == null) {
    return;
  }
  dispatch({
    type: ACTION_TYPES.UPDATE_CLUSTERS,
    meta: { requestTime },
    payload: axios
      .post(`api/datasets/${id}/query`, {
        rect: viewRect,
        zoom,
        categoricalFilters,
        groupByCols,
        measureCol,
        aggType,
        timeSeriesDataToggle,
        from,
        to,
      })
      .then(res => {
        dispatch({ type: ACTION_TYPES.UPDATE_FACETS, payload: res.data.facets });
        const responseTime = new Date().getTime();
        dispatch({
          type: ACTION_TYPES.UPDATE_QUERY_INFO,
          payload: { ...res.data, executionTime: responseTime - requestTime },
        });

        const points = res.data.points || [];

        if (drawnRect == null) {
          dispatch({
            type: ACTION_TYPES.UPDATE_ANALYSIS_RESULTS,
            payload: res,
          });
        }

        const supercluster = prepareSupercluster(points);
        return supercluster.getClusters([-180, -85, 180, 85], zoom);
      }),
  });
};

export const updateFilters = (id, filters) => dispatch => {
  dispatch({
    type: ACTION_TYPES.UPDATE_FILTERS,
    payload: filters,
  });
  dispatch(updateAnalysisResults(id));
  dispatch(updateClusters(id));
};

export const updateGroupBy = (id, groupByCols) => (dispatch, getState) => {
  const { categoricalFilters } = getState().visualizer;

  dispatch({
    type: ACTION_TYPES.UPDATE_GROUP_BY,
    payload: groupByCols,
  });
  const newCategoricalFilters = { ...categoricalFilters };
  groupByCols.forEach(groupByCol => {
    delete newCategoricalFilters[groupByCol];
  });
  dispatch(updateFilters(id, newCategoricalFilters));
};

export const updateMeasure = (id, measureCol) => dispatch => {
  dispatch({
    type: ACTION_TYPES.UPDATE_MEASURE,
    payload: measureCol,
  });
  dispatch(updateAnalysisResults(id));
};

export const updateAggType = (id, aggType) => dispatch => {
  dispatch({
    type: ACTION_TYPES.UPDATE_AGG_TYPE,
    payload: aggType,
  });
  dispatch(updateAnalysisResults(id));
};


export const updateDrawnRect = (id, drawnRectBounds: LatLngBounds) => dispatch => {
  const drawnRect = drawnRectBounds && {
    lat: [drawnRectBounds.getSouth(), drawnRectBounds.getNorth()],
    lon: [drawnRectBounds.getWest(), drawnRectBounds.getEast()],
  };
  dispatch({
    type: ACTION_TYPES.UPDATE_DRAWN_RECT,
    payload: drawnRect,
  });
  dispatch(updateAnalysisResults(id));
};

export const updateMapBounds = (id, bounds: LatLngBounds, zoom: number) => dispatch => {
  const viewRect = {
    lat: [bounds.getSouth(), bounds.getNorth()],
    lon: [bounds.getWest(), bounds.getEast()],
  };
  dispatch({
    type: ACTION_TYPES.UPDATE_MAP_BOUNDS,
    payload: { zoom, viewRect },
  });
  dispatch(updateClusters(id));
};

export const reset = id => async dispatch => {
  const requestUrl = `api/datasets/${id}/reset-index`;
  await dispatch({
    type: ACTION_TYPES.RESET,
    payload: axios.post(requestUrl),
  });
  dispatch(updateClusters(id));
};

export const resetWTime = (id, t) => async dispatch => {
  const requestUrl = `api/datasets/${id}/reset-index`;
  await dispatch({
    type: ACTION_TYPES.RESET,
    payload: axios.post(requestUrl),
  });
  dispatch(updateClustersWTime(id, t));
};

export const updateMapType = mapType => dispatch  => {
  dispatch({
    type: ACTION_TYPES.UPDATE_MAP_TYPE,
    payload: mapType,
  });
}

export const getIndexStatus = id => {
  const requestUrl = `api/datasets/${id}/status`;
  return {
    type: ACTION_TYPES.FETCH_INDEX_STATUS,
    payload: axios.get<IIndexStatus>(requestUrl),
  };
};

export const updateExpandedClusterIndex = index => ({
  type: ACTION_TYPES.UPDATE_EXPANDED_CLUSTER_INDEX,
  payload: index,
});

export const updateSelectedMeasure = id  => dispatch => {
  dispatch({
    type: ACTION_TYPES.UPDATE_SELECTED_MEASURE,
    payload: id,
  });
}

export const updateTimeRange = (timeRange, id) => async dispatch => {
  await dispatch({
    type: SUCCESS(ACTION_TYPES.UPDATE_TIME_RANGE),
    payload: timeRange,
  });
  dispatch(resetWTime(id, timeRange));
}

export const toggleTimeSeriesData = (toggle) => dispatch =>{
  dispatch({
    type: ACTION_TYPES.TOGGLE_TIMESERIES_DATA,
    payload: toggle,
  });
}

export const updateTimeSeriesDataToggle = (toggle) => dispatch =>{
  dispatch({
    type: ACTION_TYPES.UPDATE_TIMESERIES_DATA_TOGGLE,
    payload: toggle,
  });
}

export const updateSelectedTimeSeries = (id) => dispatch =>{
  dispatch({
    type: ACTION_TYPES.UPDATE_SELECTED_TIME_SERIES,
    payload: id,
  });

}

export const forecast = (id, predictions) => dispatch => {
  axios.defaults.headers.post['Content-Type'] ='application/x-www-form-urlencoded';

  dispatch({
    type: ACTION_TYPES.FORECAST,
    payload: axios
      .post(`api/predict/${id}/${predictions}`,
        {headers: {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers" : "Origin, X-Requested-With, Content-Type, Accept"}})
      .then(response => {
        // Handle the response
      })
  })
}



