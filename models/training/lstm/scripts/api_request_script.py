import requests

url = 'http://127.0.0.1:5000/predict?num_predictions=20'
file_path = '../data/NLOG_Data_clean/lsn_960696.csv'

files = {'file': open(file_path, 'rb')}
response = requests.post(url, files=files)

if response.status_code == 200:
    predictions = response.json()['predictions']
    # Process the predictions
    print(predictions)
else:
    print('Prediction request failed.')