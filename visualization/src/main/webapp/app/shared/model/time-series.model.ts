import {IDatapoint} from "app/shared/model/datapoint.model";

export interface ITimeSeries {
   name: string,
   id: number,
   dataPoints: IDatapoint[],
   digital: boolean,
}
