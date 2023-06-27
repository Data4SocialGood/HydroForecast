import { LatLngTuple } from 'leaflet';
import { IRectStats } from 'app/shared/model/rect-stats.model';
import { IGroupedStats } from 'app/shared/model/grouped-stats.model';
import {ISingleRectStats} from "app/shared/model/single-rect-stats.model";
import {ITimeSeries} from "app/shared/model/time-series.model";

export interface IQueryResults {
  rectStats?: IRectStats;
  singleStats?: ISingleRectStats;
  series?: IGroupedStats[];
  otherSeries?: IGroupedStats[];
  cleanedRectStats?: IRectStats;
  cleanedSeries?: IGroupedStats[];
  points?: [][];
  facets?: any;
  fullyContainedTileCount?: number;
  tileCount?: number;
  pointCount?: number;
  ioCount?: number;
  totalTileCount?: number;
  totalPointCount?: number;
  timeSeries?: ITimeSeries[];
}

export const defaultValue: Readonly<IQueryResults> = { series: [], points: [] };
