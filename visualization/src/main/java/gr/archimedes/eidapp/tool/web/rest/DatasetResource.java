package gr.archimedes.eidapp.tool.web.rest;

import static gr.athenarc.imsi.visualfacts.config.IndexConfig.DELIMITER;

import com.univocity.parsers.csv.CsvParser;
import com.univocity.parsers.csv.CsvParserSettings;

import gr.athenarc.imsi.visualfacts.TimeSeries;
import gr.athenarc.imsi.visualfacts.Veti;
import gr.archimedes.eidapp.tool.domain.Dataset;
import gr.archimedes.eidapp.tool.domain.VisQuery;
import gr.archimedes.eidapp.tool.domain.VisQueryResults;
import gr.archimedes.eidapp.tool.repository.DatasetRepository;
import gr.archimedes.eidapp.tool.service.RawDataService;
import gr.archimedes.eidapp.tool.web.rest.errors.BadRequestAlertException;
import io.github.jhipster.web.util.HeaderUtil;
import io.github.jhipster.web.util.ResponseUtil;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.*;
import javax.validation.Valid;
import javax.ws.rs.Path;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * REST controller for managing {@link gr.archimedes.eidapp.tool.domain.Dataset}.
 */
@RestController
@RequestMapping("/api")
public class DatasetResource {
  private static final String ENTITY_NAME = "dataset";
  private final Logger log = LoggerFactory.getLogger(DatasetResource.class);
  private final DatasetRepository datasetRepository;
  private final RawDataService rawDataService;

  @Value("${jhipster.clientApp.name}")
  private String applicationName;

  @Value("${application.workspacePath}")
  private String workspacePath;

  public DatasetResource(DatasetRepository datasetRepository, RawDataService rawDataService) {
    this.datasetRepository = datasetRepository;
    this.rawDataService = rawDataService;
  }

  /**
   * {@code POST  /datasets} : Create a new dataset.
   *
   * @param dataset the dataset to create.
   * @return the {@link ResponseEntity} with status {@code 201 (Created)} and with body the new dataset, or with status {@code 400 (Bad Request)} if the dataset has already an ID.
   * @throws URISyntaxException if the Location URI syntax is incorrect.
   */
  @PostMapping("/datasets")
  public ResponseEntity<Dataset> createDataset(@Valid @RequestBody Dataset dataset) throws URISyntaxException, IOException {
    log.debug("REST request to save Dataset : {}", dataset);
    if (dataset.getId() != null) {
      throw new BadRequestAlertException("A new dataset cannot already have an ID", ENTITY_NAME, "idexists");
    }
    Dataset result = datasetRepository.save(dataset);
    return ResponseEntity
      .created(new URI("/api/datasets/" + result.getName()))
      .headers(HeaderUtil.createEntityCreationAlert(applicationName, false, ENTITY_NAME, result.getName().toString()))
      .body(result);
  }

  /**
   * {@code POST  /datasets} : Create a new dataset.
   *
   * @return the {@link ResponseEntity} with status {@code 201 (Created)} and with body the new dataset, or with status {@code 400 (Bad Request)} if the dataset has already an ID.
   * @throws URISyntaxException if the Location URI syntax is incorrect.
   */
  @PostMapping("/importData")
  public String createDataFile(@RequestParam("file") MultipartFile file) throws URISyntaxException, IOException {
    log.debug("Post request to create DataFile : {}", file);
    datasetRepository.saveFile(file);
    return "Creation Complete";
  }

  /**
   * {@code PUT  /datasets} : Updates an existing dataset.
   *
   * @param dataset the dataset to update.
   * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated dataset,
   * or with status {@code 400 (Bad Request)} if the dataset is not valid,
   * or with status {@code 500 (Internal Server Error)} if the dataset couldn't be updated.
   * @throws URISyntaxException if the Location URI syntax is incorrect.
   */
  @PutMapping("/datasets")
  public ResponseEntity<Dataset> updateDataset(@Valid @RequestBody Dataset dataset) throws URISyntaxException, IOException {
    log.debug("REST request to update Dataset : {}", dataset);
    if (dataset.getId() == null) {
      throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
    }
    Dataset result = datasetRepository.save(dataset);
    return ResponseEntity
      .ok()
      .headers(HeaderUtil.createEntityUpdateAlert(applicationName, false, ENTITY_NAME, dataset.getId().toString()))
      .body(result);
  }

  /**
   * {@code GET  /datasets} : get all the datasets.
   *
   * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the list of datasets in body.
   */
  @GetMapping("/datasets")
  public List<Dataset> getAllDatasets() throws IOException {
    log.debug("REST request to get all Datasets");
    List<Dataset> datasets = datasetRepository.findAll();
    datasets
      .stream()
      .forEach(
        dataset -> {
          try {
            fillHeader(dataset);
          } catch (Exception e) {
            log.error(e.getMessage());
          }
        }
      );
    return datasets;
  }

  @GetMapping("/readData/{id}")
  public String getFileDataset(@PathVariable String id) throws IOException {
    log.debug("REST request to get FILE Dataset");
    return datasetRepository.findFile(id);
  }

  /**
   * {@code GET  /datasets/:id} : get the "id" dataset.
   *
   * @param id the id of the dataset to retrieve.
   * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the dataset, or with status {@code 404 (Not Found)}.
   */
  @GetMapping("/datasets/{id}")
  public ResponseEntity<Dataset> getDataset(@PathVariable String id) throws IOException {
    log.debug("REST request to get Dataset : {}", id);
    Optional<Dataset> dataset = datasetRepository.findById(id);
    dataset.ifPresent(
      d -> {
        try {
          fillHeader(d);
        } catch (Exception e) {
          log.error(e.getMessage());
        }
      }
    );
    log.debug(dataset.toString());
    return ResponseUtil.wrapOrNotFound(dataset);
  }

  /**
   * {@code DELETE  /datasets/:id} : delete the "id" dataset.
   *
   * @param id the id of the dataset to delete.
   * @return the {@link ResponseEntity} with status {@code 204 (NO_CONTENT)}.
   */
  @DeleteMapping("/datasets/{id}")
  public ResponseEntity<Void> deleteDataset(@PathVariable String id) throws IOException {
    log.debug("REST request to delete Dataset : {}", id);
    String result = id.substring(0, id.indexOf("."));
    System.out.println(result);
    datasetRepository.findById(result).ifPresent(dataset -> {
      try {
        rawDataService.destroyIndex(dataset);
      } catch (IOException e) {
        e.printStackTrace();
      }
    });
    datasetRepository.deleteById(id);
    return ResponseEntity
      .noContent()
      .headers(HeaderUtil.createEntityDeletionAlert(applicationName, false, ENTITY_NAME, id.toString()))
      .build();
  }

  /**
   * POST executeQuery
   */
  @PostMapping("/datasets/{id}/query")
  public ResponseEntity<VisQueryResults> executeQuery(@PathVariable String id, @Valid @RequestBody VisQuery query) throws IOException {
    log.debug("REST request to execute Query: {}", query);
    Optional<VisQueryResults> queryResultsOptional = datasetRepository
      .findById(id)
      .map(dataset -> rawDataService.executeQuery(dataset, query));
    return ResponseUtil.wrapOrNotFound(queryResultsOptional);
  }

  @GetMapping("/datasets/{datasetId}/objects/{objectId}")
  public ResponseEntity<String[]> getObject(@PathVariable String datasetId, @PathVariable Long objectId) throws IOException {
    log.debug("REST request to retrieve object {} from dataset {}", objectId, datasetId);
    Optional<String[]> optional = datasetRepository.findById(datasetId).map(dataset -> rawDataService.getObject(dataset, objectId));
    return ResponseUtil.wrapOrNotFound(optional);
  }

  @PostMapping(path = "/datasets/{id}/reset-index")
  public void resetIndex(@PathVariable String id) throws IOException {
    log.debug("REST request to reset index for dataset: {}", id);
    datasetRepository.findById(id).ifPresent(dataset -> rawDataService.removeIndex(dataset));
  }

  @GetMapping("/datasets/{id}/status")
  public IndexStatus getIndexStatus(@PathVariable String id) {
    return new IndexStatus(rawDataService.isIndexInitialized(id), rawDataService.getObjectsIndexed(id));
  }

    /**
     * POST executeQuery
     */

    @PostMapping("/predict/{id}/{predictions}")
    public TimeSeries getPrediction(@PathVariable String id, @PathVariable Integer predictions) throws IOException {
        log.debug("REST request to predict for dataset: {}, {}", id, predictions);
        URI uri = URI.create("http://localhost:5001/predict?id=" + id  +"&num_predictions="+ predictions);
        HttpURLConnection connection = (HttpURLConnection) uri.toURL().openConnection();
        connection.setRequestMethod("POST");
        Map<String, String> postData = new HashMap<>();
        // Enable input and output streams for the connection
        connection.setDoInput(true);
        connection.setDoOutput(true);

        // Set the content type of the request
        connection.setRequestProperty("Content-Type", "text/plain; charset=UTF-8");

        // Convert the message to bytes using the UTF-8 encoding

        // Get the response code from the connection
        int responseCode = connection.getResponseCode();

        // If the response code indicates a successful request (HTTP 2xx)
        if (responseCode >= 200 && responseCode < 300) {
            // Read the response from the connection
            BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
            String line;
            StringBuilder response = new StringBuilder();
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            reader.close();

            // Print the response
            log.debug("Predict Response: " + response.toString());
        } else {
            log.debug("Failed to post message. Response code: " + responseCode);
        }

        // Disconnect the connection
        connection.disconnect();

        return new TimeSeries(null, null, null, false);
    }

  private void fillHeader(Dataset dataset) {
    CsvParserSettings parserSettings = new CsvParserSettings();
//    parserSettings.getFormat().setDelimiter(DELIMITER);
      parserSettings.setIgnoreLeadingWhitespaces(false);
      parserSettings.detectFormatAutomatically();
      parserSettings.setIgnoreTrailingWhitespaces(false);
    CsvParser parser = new CsvParser(parserSettings);
    if (dataset.getHasHeader() == true) {
      parser.beginParsing(new File(workspacePath, dataset.getName()), StandardCharsets.UTF_8);
      parser.parseNext();
      dataset.setHeaders(parser.getContext().parsedHeaders());
      log.debug("Headers: " + Arrays.toString(dataset.getHeaders()));
      parser.stopParsing();
    } else {
      List<String> headers = new ArrayList<String>();
      parser.beginParsing(new File(workspacePath, dataset.getName()), StandardCharsets.UTF_8);
      parser.parseNext();
      for (int i = 0; i <= parser.getContext().parsedHeaders().length; i++) {
        headers.add("col(" + i + ")");
      }
      dataset.setHeaders(headers.toArray(new String[0]));
      log.debug("Headers: " + Arrays.toString(dataset.getHeaders()));
      parser.stopParsing();
    }
  }
}

class IndexStatus {
  boolean isInitialized = false;
  int objectsIndexed = 0;

  public IndexStatus(boolean isInitialized, int objectsIndexed) {
    this.isInitialized = isInitialized;
    this.objectsIndexed = objectsIndexed;
  }

  public boolean getIsInitialized() {
    return isInitialized;
  }

  public void setInitialized(boolean initialized) {
    isInitialized = initialized;
  }

  public int getObjectsIndexed() {
    return objectsIndexed;
  }

  public void setObjectsIndexed(int objectsIndexed) {
    this.objectsIndexed = objectsIndexed;
  }
}
