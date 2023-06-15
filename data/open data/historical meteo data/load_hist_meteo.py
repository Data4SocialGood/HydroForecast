import json
import pandas as pd
import os.path
import requests
from pydash import at
import argparse
from datetime import datetime,date


def collect_config_arguments(parser):     
    parser.add_argument("--longitude", help="Choose the longitude coordinate you want", default='23.80') ## default values for Marousi, Athens
    parser.add_argument("--latitude", help="Choose the latitude coordinate you want", default='38.05')
    parser.add_argument("--start_date", help='Start date of data returned', default='2021-01-01')
    parser.add_argument('--end_date', help = 'End date of data returned', default='2021-12-31')
    parser.add_argument('--interval', help = 'The interval of meteo data. Options [hourly , daily]', default='hourly')
    parser.add_argument('--timezone', default='auto')
    parser.add_argument('--features', help = 'The meteorological features of the data returned', nargs="+", default=['temperature_2m','relativehumidity_2m','windspeed_10m'])
    parser.add_argument('--monthly_pred', action='store_true')
    parser.add_argument('--SAVE', help= 'export the data on csv file', action='store_true')
    parser.add_argument('--export_folder', default='./output/')

def get_historical_data(longitude, latitude, start_date, end_date, interval, features_string, timezone):
    url = 'https://archive-api.open-meteo.com/v1/archive?'
    payload = {'latitude':latitude, 'longitude':longitude, 'start_date':start_date, 'end_date':end_date, interval:features_string, 'timezone':timezone}
    r = requests.get(url, params = payload)
    y = json.loads(r.content.decode('utf-8'))
    df = pd.DataFrame.from_dict(y[interval],orient='index').transpose()       
    # print(df) 
    return df

def save_historical_data(save_df, export_folder):
    print(os.path.isdir(export_folder))
    if not os.path.isdir(export_folder) :
        os.mkdir(export_folder)
    save_df.to_csv(export_folder + start_date + '_' + end_date + '_meteo')

def hourly_to_daily(input_file, features):
    hourly_data = pd.read_csv(input_file)
    daily_data = pd.DataFrame()
    for i in features:
        daily_data[f'avg_{i}'] = [hourly_data[i].mean()]
        
    print(daily_data)
    print(hourly_data)

def cut_data(x, split_token):
    x = x.split(split_token)[0]
    return x

def grouped_monthly(grouped, monthly_data, method, features_list, df_columns):
    method_cols = [m for m in features_list if m in df_columns]
    if method == 'mean':
        for col in method_cols:
            monthly_data[col] = grouped[col].mean(numeric_only=False).round(1)
    elif method == 'sum':
        for col in method_cols:
            monthly_data[col] = grouped[col].sum(numeric_only=False).round(1)
    elif method =='min':
        for col in method_cols:
            monthly_data[col] = grouped[col].min(numeric_only=False).round(1)
    elif method == 'max':
        for col in method_cols:
            monthly_data[col] = grouped[col].max(numeric_only=False).round(1)
    return monthly_data

parser = argparse.ArgumentParser(add_help=True)
collect_config_arguments(parser)
args,unknown = parser.parse_known_args()
args_dictionary = vars(args)
longitude, latitude, start_date, end_date, interval, timezone, features_list, monthly_pred, SAVE, export_folder = at(args_dictionary, 'longitude', 'latitude', 'start_date', 'end_date', 'interval', 'timezone', 'features', 'monthly_pred', 'SAVE', 'export_folder')
features_string = ','.join(features_list)
df =  get_historical_data(longitude, latitude, start_date, end_date, interval, features_string, timezone)
if interval == 'daily':
    df_hourly = get_historical_data(longitude, latitude, start_date, end_date, 'hourly','relativehumidity_2m,windspeed_10m', timezone)
    df_hourly['time'] = df_hourly['time'].apply(cut_data, args=('T'))
    df_daily_mean = df_hourly.groupby(by=["time"]).mean().round(1)
    df = pd.merge(df, df_daily_mean, on='time', how='inner')

if monthly_pred:
    df['time']= df['time'].apply(lambda x: x[:-3])
    grouped = df.groupby(by=['time'])

    method = ['mean', 'sum', 'min', 'max']
    mean_columns = ['temperature_2m_mean', 'apparent_temperature_mean']
    sum_columns = ['shortwave_radiation_sum', 'precipitation_sum', 'rain_sum', 'snowfall_sum']
    min_columns = ['temperature_2m_min', 'apparent_temperature_min']
    max_columns = ['temperature_2m_max', 'apparent_temperature_max', 'windspeed_10m_max', 'windgusts_10m_max']

    columns = {'min':min_columns, 'max':max_columns, 'mean':mean_columns, 'sum':sum_columns}
    monthly_data = pd.DataFrame()

    for m in method:
        monthly_data = grouped_monthly(grouped, monthly_data, m, columns[m], df.columns)
    df = monthly_data
print(df)
if SAVE:
    save_historical_data(df, export_folder)



