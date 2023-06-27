# HydroForecast: An app for visualization and predictions over water consumption data for schools in Attica

## Configuration
This app runs on Java version 11. Make sure you have it installed.
Make sure the port 8080 of the localhost is not blocked by any other application.

## Datasets
The final, post-processing datasets can be found in the data folder. The raw data was provided by ΕΥΔΑΠ and contained metrics by both analog and digital meters. 

### Analog Meters
For the extraction of data from conventional meters, we performed the following actions:

1. We deleted the consumption values where T1 was equal to "Τεκμ." meaning the data were fabricated.
2. We deleted the consumption values where the ΔΙΑΜΕΤΡΟΣ (DIAMETER) was invalid.
3. Since the time data from ΑΠΟ-ΕΩΣ (FROM-TO) did not determine a fixed time interval, we calculated the average consumption of each meter within the time span of each row in the file. Then, we divided this number by the number of months within that time span to approximate the average monthly consumption. 
4. We added certain BOOLEAN values to each interval indicating whether that period fell during interruptions, holidays (Christmas, Easter), or the period of the pandemic.

### Digital Meters
For each file in the NLOG data folder, we performed the following actions:

1. Since the time data did not determine a fixed time interval, we filled in the missing intervals to represent 15-minute intervals for each row.
2. We added certain BOOLEAN values to each interval indicating whether that period fell during interruptions, holidays (Christmas, Easter), or the period of the pandemic.
3. Since 15-minute-interval and hourly cardinalities proved to not produce great results, we made use of the total daily values by keeping only the rows where the Daily Consumption was not null.

### Open Data
In order to aid the learning process and generate more possibly relevant features, we experimented with the following datasets:

1. **historical meteo data**: Meteorological data in Attica. Taken from: https://open-meteo.com
2. **student population**: Data on the number of students in each school for the years 2018 - 2019. The names of the schools were matched to the ones in our dataset. Taken from: https://www.data.gov.gr/datasets/minedu_students_school
3. **regional financial allocation**: Data on the financial allocation per municipality. Taken from: https://www.ypes.gr/apokentromeni-dioikisi-aytodioikisi/oikonomika-stoicheia-ota/deltia-oikonomikon-stoicheion-ota
4. **populations.xslx**: Data on population per municipality. Taken from: https://fourtounis.gr/2022/07/25/%CE%BF-%CF%80%CE%BB%CE%B7%CE%B8%CF%85%CF%83%CE%BC%CF%8C%CF%82-%CF%84%CF%89%CE%BD-%CE%B4%CE%AE%CE%BC%CF%89%CE%BD-%CF%84%CE%B7%CF%82-%CE%B1%CF%84%CF%84%CE%B9%CE%BA%CE%AE-%CF%83%CF%8D%CE%BC%CF%86%CF%89/#prettyPhoto based on the population census of 2021.

For the mapping of schools to real-life coordinates we made use of the Google Maps API.

## Results
The application makes use of two fine-tuned LSTM and XGBoost models to make predictions for schools using digital meters and one LSTM model to make predictions on the schools with analog meters.

## Run
1.**Move to the visualization folder**: cd visualization
2.**Package the app:** mvn clean package
3.**Run the app:** java -jar target/hydroforecast-0.0.1.jar
