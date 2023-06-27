import React, {useEffect, useState, useRef} from 'react';
import L from 'leaflet';
import {
  getRow,
  updateDrawnRect,
  updateExpandedClusterIndex,
  updateMapBounds,
  updateSelectedTimeSeries,
  updateMapType,
} from 'app/modules/visualizer/visualizer.reducer';
import { MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl } from 'react-leaflet';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import {IDataset} from "app/shared/model/dataset.model";
import {MAX_ZOOM} from "app/config/constants";
import {BeautifyIcon} from "app/modules/visualizer/beautify-marker/leaflet-beautify-marker-icon";
import MapSearch from './map-search';
import {HeatmapLayer} from "react-leaflet-heatmap-layer-v3/lib";


export interface IMapProps {
  id: any,
  clusters: any,
  dataset: IDataset,
  zoom: any,
  viewRect: any,
  updateMapBounds: typeof updateMapBounds,
  updateDrawnRect: typeof updateDrawnRect,
  updateExpandedClusterIndex: typeof updateExpandedClusterIndex,
  getRow: typeof getRow,
  row: string[],
  expandedClusterIndex: number,
  mapType: string,
  selectedMeasure: number,
  updateSelectedTimeSeries: typeof updateSelectedTimeSeries,
}

const fetchIcon = (count, clickable, digital) => {
  if (count === 1) {
    if(!digital)
      return BeautifyIcon.icon({
        isAlphaNumericIcon: false,
        backgroundColor: digital ? "rgba(0,212,0)" : "rgba(212,0,0)",
        borderColor: "#ffffff",
        borderWidth: 2,
        iconSize: [18, 18],
        // hasBadge: digital,
        // badgeText: "!",
        iconStyle: clickable && 'cursor: pointer',
      });
    else {
      return BeautifyIcon.icon({
        icon: 'star',
        // isAlphaNumericIcon: false,
        // backgroundColor: digital ? "rgba(0,212,0)" : "rgba(212,0,0)",
        // borderColor: "#ffffff",
        borderWidth: 2,
        iconSize: [18, 18],
        // // hasBadge: digital,
        // // badgeText: "!",
        iconStyle: clickable && 'cursor: pointer',
      });
    }
  }
  const backgroundColor = count < 100 ? 'rgba(102, 194, 164, 0.8)' :
    count < 1000 ? 'rgba(44, 162, 95, 0.8)' : 'rgba(0, 109, 44, 0.8)';

  const borderColor = count < 100 ? 'rgba(102, 194, 164, 0.5)' :
    count < 1000 ? 'rgba(44, 162, 95, 0.5)' : 'rgba(0, 109, 44, 0.5)';

  return BeautifyIcon.icon({
    customClasses: 'cluster',
    isAlphaNumericIcon: true,
    textColor: "black",
    text: count,
    backgroundColor,
    borderColor,
    hasBadge: digital,
    badgeText: "!",
    borderWidth: 5,
    iconSize: [40, 40],
    iconStyle: clickable && 'cursor: pointer',
  });
};

const SinglePoint = (props: any) => {
  const {dataset, point, coordinates, row} = props;
  return (
    <Marker key={point[4]} icon={fetchIcon(1,  true, point[5])}
            position={[coordinates[1], coordinates[0]]}>
      <Popup onOpen={() => {
        props.getRow(dataset.id, point[4]);
      }}>
        {/* <div style={{color:"black", cursor:'pointer', marginBottom:"2pt"}}><u>View Time Series</u></div> */}
        <div style={{
          maxHeight: "200px",
          overflowY: "scroll"
        }}>{row && dataset.headers && dataset.headers.map((colName, colIndex) => {
          let val = row[colIndex];

          if (val == null) val = "";
          return (
            <div key={colIndex}>
                    <span>
                    <b>{colName}: </b>{val}
                    </span>
              <br></br>
            </div>
          )
        })}</div>
      </Popup>
    </Marker>);
};

const SpiderfyCluster = (props: any) => {
  const { points, coordinates, dataset, row } = props;
  const angleStep = (Math.PI * 2) / points.length;
  const legLength = 0.0003;
  return <>{points.map((point, i) => {
      const angle = i * angleStep;
      const newCoords = [coordinates[0] + legLength * Math.cos(angle), coordinates[1] + legLength * Math.sin(angle)];
      return <>
        <SinglePoint dataset={dataset}
                     point={point} row={row}
                     getRow={props.getRow}
                     coordinates={newCoords} selectDuplicateCluster={props.selectDuplicateCluster}
                     selectedDuplicate={props.selectedDuplicate}/>
        <Polyline pathOptions={{color: 'gray'}}
                  positions={[[coordinates[1], coordinates[0]], [newCoords[1], newCoords[0]]]}/>
      </>;
    }
  )}</>;
};

export const Map = (props: IMapProps) => {

  const {clusters, dataset, row, expandedClusterIndex, selectedMeasure, mapType} = props;

  const [map, setMap] = useState(null);
  const [p, setP] = useState(null);
  const [measure, setMeasure] = useState(selectedMeasure);

  useEffect(() => {
    setMeasure(selectedMeasure)
  }, [selectedMeasure]);

  useEffect(() => {
    if (!map) return;

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    // @ts-ignore
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polyline: false,
        polygon: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
        edit: false,
        remove: true,
      },
    });
    map.addControl(drawControl);

    // @ts-ignore
    map.on(L.Draw.Event.CREATED, e => {
      const type = e.layerType;
      const layer = e.layer;
      drawnItems.clearLayers();
      drawnItems.addLayer(layer);
      props.updateDrawnRect(props.id, layer._bounds);
    });
    // @ts-ignore
    map.on(L.Draw.Event.DELETED, e => {
      props.updateDrawnRect(props.id, null);
    });

    map.on('moveend', e => {
      props.updateMapBounds(props.id, e.target.getBounds(), e.target.getZoom());
    });

    map.on('click', e => {
      props.updateExpandedClusterIndex(null);
    });

    map.fitBounds([[dataset.queryYMin, dataset.queryXMin], [dataset.queryYMax, dataset.queryXMax]]);
  }, [map])


  const getPoints = (c) => {
    return c.map(cluster => {
      return cluster.properties.points.map(point=> {
        return [point[0], point[1], point[3]];
      })
    }).flat(1);}


  useEffect(() => {
    setP(getPoints(clusters));
  }, [clusters]);

  return <><MapContainer scrollWheelZoom={true} whenCreated={setMap} zoomControl={false} maxZoom={MAX_ZOOM}>
    <TileLayer
      attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
    {map && p && mapType==='heatmap'  &&
      <HeatmapLayer
        fitBoundsOnLoad
        fitBoundsOnUpdate
        points={p}
        latitudeExtractor={r => r[0]}
        longitudeExtractor={r => r[1]}
        intensityExtractor={r => {
          return r[2][measure]
        }}
      />
    }
    {map && clusters && clusters.map((cluster, index) => {
      // every cluster point has coordinates
      // the point may be either a cluster or a single point
      const {
        totalCount, points
      } = cluster.properties;
      if (totalCount === 1) {
        return <SinglePoint dataset={dataset} point={points[0]} row={row} getRow={props.getRow}
                            coordinates={cluster.geometry.coordinates} />
      } else if (expandedClusterIndex === index) {
        return <SpiderfyCluster dataset={dataset} points={points} coordinates={cluster.geometry.coordinates} row={row}
                                getRow={props.getRow}/>
      }
      return <Marker key={"cluster" + index}
                     position={[cluster.geometry.coordinates[1], cluster.geometry.coordinates[0]]}
                     icon={fetchIcon(totalCount,map.getZoom() === MAX_ZOOM, cluster.properties.digital)}
                     eventHandlers={{
                       click(e) {
                         map.getZoom() === MAX_ZOOM && props.updateExpandedClusterIndex(index);
                         e.originalEvent.stopPropagation();
                       },
                     }}> </Marker>;
    })}
    <ZoomControl position="topright"/>
  </MapContainer>;
  <div className="search-bar-ui">
  <MapSearch map={map} />
</div>
</>

};

export default Map;
