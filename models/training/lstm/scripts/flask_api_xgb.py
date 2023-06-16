import sys
sys.path.insert(0,'../')
import argparse
from flask import Flask, request, jsonify
from urllib.parse import urlparse, parse_qs
import pandas as pd
import pickle
import numpy as np
import torch
import matplotlib.pyplot as plt
import holidays
import os
from pydash import at
from src.water_consumption_prediction.utils import read_arguments
from src.water_consumption_prediction.model.create_model import create_model
from src.water_consumption_prediction.dataset.normalization_utilites import rescale_data, inverse_normalized_data



app = Flask(__name__)

def fixData(df):
    df = df[df['Valid'] == True]
    df = df.rename(columns={df.columns[0]: 'Date'})
    df['Date'] = pd.to_datetime(df['Date'])
    df['Vol'] = df['Net Vol. (m³)'].diff().fillna(df['Net Vol. (m³)'])
    df = df.iloc[2:]
    df = df.reset_index()
    #drop all rows from bottom that Vol = 0
    vol_nonzero = df['Vol'] != 0
    if vol_nonzero.any():
        last_nonzero_index = df.iloc[::-1].loc[vol_nonzero].index[0]
        df = df.iloc[:last_nonzero_index + 1]
    df = df[['Date', 'Daily Consumption (m³)', 'isCovid', 'isHoliday', 'isChristmas', 'isWeekday', 'isSummer']]
    df = df.set_index('Date')
    for col in ['isCovid', 'isHoliday', 'isChristmas', 'isWeekday', 'isSummer']:
      df[col] = df[col].astype(int)
    df = df[df['Daily Consumption (m³)'].notna()]
    df = df.rename(columns={"Daily Consumption (m³)": "Value"})
    df["Date"] = df.index
    return df

def create_features(df):
    df['Value'] = df['Value'].clip(lower=0)
    print(df)
    covid_months = ['2020-03', '2020-04', '2020-05', '2020-11', '2020-12', '2021-02', '2021-03', '2021-04']
    is_covid_mask = df['Date'].dt.strftime('%Y-%m').isin(covid_months)
    df['isCovid'] = is_covid_mask
    df['isChristmas'] = ((df['Date'].dt.month == 12) & ((df['Date'].dt.day >= 24) | (df['Date'].dt.day <= 31))) | ((df['Date'].dt.month == 1) & ((df['Date'].dt.day >= 1) & (df['Date'].dt.day <= 7)))
    df['isWeekday'] = df['Date'].dt.weekday < 5
    greek_holidays = holidays.GR(years=df['Date'].dt.year.unique())
    df['isHoliday'] = df['Date'].dt.date.astype('datetime64[ns]').isin(greek_holidays.keys())
    df['isSummer'] = ((df['Date'].dt.month == 6) & (df['Date'].dt.day >= 16)) | ((df['Date'].dt.month > 6) & (df['Date'].dt.month < 9)) | ((df['Date'].dt.month == 9) & (df['Date'].dt.day <= 10))
    for col in ['isCovid', 'isHoliday', 'isChristmas', 'isWeekday', 'isSummer']:
      df[col] = df[col].astype('float32')

    print(df)
    return df

@app.route('/predict', methods=['POST'])
def predict():
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    time_steps = 7
    file = request.files['file']
    
    df = pd.read_csv(file)
    print(df)
    df = fixData(df)
    print(df)

    FEATURES = ['Date', 'Value', 'isCovid', 'isHoliday', 'isChristmas', 'isWeekday', 'isSummer']  #'index'
    
    end_date = df.index.max() + pd.DateOffset(days=1)
    parsed_url = urlparse(request.url)
    query_params = parse_qs(parsed_url.query)
    num_predictions = int(query_params.get('num_predictions', [90])[0])
    prediction_period = pd.date_range(start=end_date, periods=num_predictions, freq='D')
    df = df[FEATURES] 

    D_in = len(FEATURES) - 1
    D_out = 1

    time_steps, learning_rate, batch_size, epochs, early_stopping_epochs, loss_type, reduction, gradient_clipping, data_type, target_norm, norm_technique, attention = at(default_arguments_dictionary, 'time_steps', 'learning_rate', 'batch_size', 'epochs', 'early_stopping_epochs', 'loss_type', 'reduction', 'gradient_clipping', 'data_type', 'normalize_target', 'target_normalization', 'attention')
    rnn_model, optimizer, criterion = create_model(D_in, D_out, time_steps, learning_rate, loss_type, reduction, rnn_arguments_dictionary, device)
    print(rnn_arguments_dictionary)
    rnn_model.load_state_dict(torch.load("../trained_models/best_model.pt", map_location=device))


    for date in prediction_period:
        df.loc[date, "Value"] = float('nan')
        df.loc[date, "Date"] = date

        timesteps_sequence = df.iloc[-time_steps-1 : -1]
        timesteps_sequence = create_features(timesteps_sequence)
        timesteps_sequence = timesteps_sequence[FEATURES[1:]]
        print(timesteps_sequence)
        X = torch.from_numpy(timesteps_sequence.to_numpy(dtype='float32'))[None, : , :]
        batch_len = torch.Tensor([elem.shape[-2] for elem in X]).int()

        normalize_input, normalize_target = at(default_arguments_dictionary, 'normalize_input', 'normalize_target')
        if normalize_input:
            inp_norm_technique, data_type = at(default_arguments_dictionary, 'input_normalization', 'data_type')
            X = rescale_data(X, inp_norm_technique, f'{data_type}_{inp_norm_technique}_input_scaler')
        rnn_model.eval()
        X = X.to(device)
        predicted_value = rnn_model(X, batch_len, device=device)
        if normalize_target:
            targ_data_technique, data_type = at(default_arguments_dictionary, 'target_normalization', 'data_type')
            predicted_value = inverse_normalized_data(predicted_value, norm_technique, f'{data_type}_{targ_data_technique}_target_scaler')

        df.loc[date, "Value"] = predicted_value.item()
        predictions = df['Value'][-num_predictions:]

        print(predicted_value.item())
        
    # Create response JSON
    response = {
        'predictions': predictions.tolist()
    }
    
    return jsonify(response)


if __name__ == '__main__':
    init_parser = argparse.ArgumentParser(add_help=False)
    read_arguments.collect_default_arguments(init_parser)
    default_arguments_dictionary, curr_dict = read_arguments.create_group_dictionary({}, init_parser)

    read_arguments.collect_rnn_arguments(init_parser)
    rnn_arguments_dictionary ,curr_dict = read_arguments.create_group_dictionary(curr_dict, init_parser)

    parser = argparse.ArgumentParser(parents=[init_parser])
    args = parser.parse_args()

    app.run()