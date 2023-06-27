package gr.archimedes.eidapp.tool.service;

import gr.archimedes.eidapp.tool.domain.*;
import gr.archimedes.eidapp.tool.config.ApplicationProperties;
import com.google.common.collect.Range;
import gr.athenarc.imsi.visualfacts.*;
import gr.athenarc.imsi.visualfacts.query.QueryResults;
import gr.archimedes.eidapp.tool.domain.enumeration.AggregateFunctionType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;

import static gr.athenarc.imsi.visualfacts.config.IndexConfig.DELIMITER;

@Service
public class RawDataService {

    private final Logger log = LoggerFactory.getLogger(RawDataService.class);
    private final ApplicationProperties applicationProperties;
    private HashMap<String, Veti> indexes = new HashMap<>();

    public RawDataService(ApplicationProperties applicationProperties) {
        this.applicationProperties = applicationProperties;
    }

    public void removeIndex(Dataset dataset) {
        indexes.remove(dataset.getId());
    }

    public void destroyIndex(Dataset dataset) throws IOException {
        if(indexes.containsKey(dataset.getId())){
        Veti veti = indexes.get(dataset.getId());
        veti.destroy();
        }
    }

    private synchronized Veti getIndex(Dataset dataset) throws IOException {
        Veti veti = indexes.get(dataset.getId());
        if (veti != null) {
            return veti;
        }
        Integer measureCol0 = null;
        Integer measureCol1 = null;
        if (dataset.getMeasure0() != null) {
            measureCol0 = dataset.getMeasure0();
        }
        if (dataset.getMeasure1() != null) {
            measureCol1 = dataset.getMeasure1();
        }
        Schema schema = new Schema(new File(applicationProperties.getWorkspacePath(), dataset.getName()).getAbsolutePath(), DELIMITER,
            dataset.getLon(), dataset.getLat(), measureCol0, measureCol1,
            new Rectangle(Range.open(dataset.getxMin(), dataset.getxMax()), Range.open(dataset.getyMin(), dataset.getyMax())), dataset.getObjectCount(), dataset.getIdCol(), dataset.getTimePaths());
        List<CategoricalColumn> categoricalColumns = dataset.getDimensions().stream().map(field -> new CategoricalColumn(field)).collect(Collectors.toList());
        schema.setCategoricalColumns(categoricalColumns);
        schema.setHasHeader(dataset.getHasHeader());
        veti = new Veti(schema, 100000000, "binn", 100);
        this.indexes.put(dataset.getId(), veti);
        return veti;
    }

    public Integer getObjectsIndexed(String id) {
        Veti index = indexes.get(id);
        return index == null ? 0 : index.getObjectsIndexed();
    }

    public boolean isIndexInitialized(String id) {
        Veti index = indexes.get(id);
        return index != null && index.isInitialized();
    }

    public String[] getObject(Dataset dataset, long objectId) {
        try {
            Veti veti = this.getIndex(dataset);
            return veti.getObject(objectId);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

    }

    public VisQueryResults executeQuery(Dataset dataset, VisQuery query) {
        log.debug(query.toString());
        try {
            Veti veti = this.getIndex(dataset);
            Schema schema = veti.getSchema();
            QueryResults results = veti.executeQuery(query);
            VisQueryResults visQueryResults = new VisQueryResults();
            visQueryResults.setFullyContainedTileCount(results.getFullyContainedTileCount());
            visQueryResults.setIoCount(results.getIoCount());
            visQueryResults.setPointCount(results.getPoints().size());
            visQueryResults.setTileCount(results.getTileCount());
            visQueryResults.setTotalPointCount(veti.getObjectsIndexed());
            visQueryResults.setTotalTileCount(veti.getLeafTileCount());
            visQueryResults.setTimeSeries(results.getTimeSeries());

            if (results.getStats() != null) {
                visQueryResults.setRectStats(new RectStats(results.getStats().getRectStats().snapshot()));
                visQueryResults.setSingleStats(new SingleRectStats(results.getStats().getSingleRectStats().snapshot()));
                visQueryResults.setOtherSeries(results.getStats().getSingleStats().entrySet().stream().map(e ->
                    new GroupedStats(e.getKey(), AggregateFunctionType.getAggValue(query.getAggType(),
                        e.getValue()))).collect(Collectors.toList()));

                visQueryResults.setSeries(results.getStats().getGroupStats().entrySet().stream().map(e ->
                    new GroupedStats(e.getKey(), AggregateFunctionType.getAggValue(query.getAggType(),
                        query.getMeasureCol().equals(schema.getMeasureCol0()) ? e.getValue().xStats() : e.getValue().yStats()))).collect(Collectors.toList()));
            }
            List<Point> points;

            if (results.getPoints() != null) {
                points = results.getPoints();
            } else {
                points = new ArrayList<>();
            }
            visQueryResults.setPoints(points.stream().map(point -> new Object[]{point.getY(), point.getX(), point.getMeasureCols(), point.getValues(), point.getFileOffset(), point.isDigital()}).collect(Collectors.toList()));
            visQueryResults.setFacets(schema.getCategoricalColumns().stream().collect(Collectors.toMap(CategoricalColumn::getIndex, CategoricalColumn::getNonNullValues)));
            return visQueryResults;
        } catch (IOException | ClassNotFoundException e) {
            e.printStackTrace();
            throw new RuntimeException(e);
        }
    }
}
