import math
import pandas as pd
from pydash import at
from tqdm import tqdm
import datetime
import numpy as np
import torch
import pickle
from torch.utils.data import DataLoader, TensorDataset
from src.water_consumption_prediction.dataset.normalization_utilites import rescale_data

def save_to_pkl(input_data, target_data, dir_to_save, set_name):
  with open(dir_to_save + f'{set_name}_input_data.pkl','wb') as f: pickle.dump(input_data, f)
  with open(dir_to_save + f'{set_name}_target_data.pkl','wb') as f: pickle.dump(target_data, f)

def load_pkl(dir_to_load, set_name):
    with open(dir_to_load + f'{set_name}_input_data.pkl','rb') as f: input_data = pickle.load(f)
    with open(dir_to_load + f'{set_name}_target_data.pkl','rb') as f: target_data = pickle.load(f)
    return input_data, target_data


def replace_month(x):
  if x.month == 1:
    x = x.replace(month=12)
    return x.replace(year=x.year-1)

  else:
    return x.replace(month=x.month-1)
  
  
def add_extra_feature(daily_consumptions, monthly_consumptions):
  monthly_consumptions['Month'] = pd.to_datetime(monthly_consumptions['Month'], format="%Y-%m")
  daily_consumptions['Date'] = pd.to_datetime(daily_consumptions['Date'], format="%Y-%m")
  print(daily_consumptions)
  daily_consumptions['concat_date'] = daily_consumptions['Date'].apply(replace_month)
  daily_consumptions = pd.merge(daily_consumptions, monthly_consumptions, how='inner', left_on='concat_date', right_on='Month')
  daily_consumptions = daily_consumptions.drop(['Month', 'concat_date'], axis=1)
  return daily_consumptions


def create_timesteps_data(input_data, num_timesteps, data_type):
  smashed_data = []
  smashed_data_schools = []
  target_labels = []
  smashed_data_targets = []


  if data_type == 'monthly':
    input_data['Date'] = pd.to_datetime(input_data['Month'], format = "%Y-%m")
    interval = datetime.timedelta(days=31)
  elif data_type == 'daily':
    input_data['Date'] = pd.to_datetime(input_data['Date'], format = "%Y-%m-%d %H:%M:%S")
    interval = datetime.timedelta(days=1)
  print(input_data)

  ids = input_data.ID.unique()

  for school_id in tqdm(ids):
    school_smashed = []
    school_smashed_target = []

    school_consumption = input_data.loc[input_data['ID'] == school_id]
    starting_index = school_consumption.index[0]
    for ind in school_consumption.index:
      if ind - starting_index - num_timesteps < 0:
        continue
      rows = input_data.iloc[ind - num_timesteps : ind]
      dates = rows.Date.reset_index(drop=True)

      target_row = input_data.iloc[ind]
      target_date = target_row.Date

      missing = False
      for i in range (1, len(dates) - 1):
        if dates[i] - dates[i - 1] > interval:
          missing = True
      if target_date - dates[len(dates) - 1] > interval:
        missing = True

      if missing:
        missing = False 
        continue
      
      if data_type == 'monthly':
        append_row = rows[['ID', 'Monthly Consumption', 'isCovid', 'isSummer', 'isHalfSummer']].to_numpy()      
        append_target = target_row['Monthly Consumption']
      if data_type == 'daily':
        append_row = rows[['ID', 'Value', 'isCovid', 'isHoliday', 'isChristmas', 'isWeekday', 'isSummer', 'Monthly Consumption']].to_numpy()
        append_target = target_row['Value']

      smashed_data.append(append_row[: , 1 :])
      school_smashed.append(append_row[:, 1 :])
      
      target_labels.append(append_target)
      school_smashed_target.append(append_target)

    smashed_data_schools.append(school_smashed)
    smashed_data_targets.append(school_smashed_target)
    
  return smashed_data, target_labels, smashed_data_schools, smashed_data_targets


def create_validation_test(smashed_data_schools, target_labels, val_ptg, test_ptg):
  train_data, train_targets = [], []
  validation_data, validation_targets = [] , []
  test_data, test_targets = [] , []
  for school_id, school_targets in tqdm(zip(smashed_data_schools, target_labels)):
    test_samples = math.ceil(test_ptg * len(school_id))
    test_data.extend(school_id[-test_samples:])
    test_targets.extend(school_targets[-test_samples:])

    validation_samples = math.ceil(val_ptg * len(school_id))
    validation_data.extend(school_id[- validation_samples - test_samples : -test_samples])
    validation_targets.extend(school_targets[ -validation_samples - test_samples : -test_samples])

    train_data.extend(school_id[:-validation_samples - test_samples])
    train_targets.extend(school_targets[:-validation_samples - test_samples])
    
  return train_data, train_targets, test_data, test_targets, validation_data, validation_targets

def create_np_array(input_list, target_list):
  input_data = np.array(input_list, dtype='float32')
  target_data = np.array(target_list, dtype='float32')
  return input_data, target_data

def create_dataloader(input_data, input_targets, batch_size=128, shuffle=True):
  input_dataset = TensorDataset(input_data, input_targets)
  input_dataloader = DataLoader(input_dataset, batch_size=batch_size, shuffle=shuffle)
  return input_dataloader



def get_dataset(path_to_data, default_dict):
  data_type, number_timesteps, val_ptg, test_ptg, normalize_input, normalize_target = at(default_dict, 'data_type', 'time_steps', 'val_ptg', 'test_ptg', 'normalize_input', 'normalize_target')
  create_data, include_students = at(default_dict, 'create_data', 'include_students')
  data_split = 'split_data/'  

  if data_type == 'monthly':
    school_consumptions = pd.read_csv(path_to_data + 'monthly_consumptions.csv')
    school_consumptions = school_consumptions.rename(columns={"Month": "Date"})
    categorical_school = pd.read_csv(path_to_data + "categorical_clean.csv", sep=';')

    if include_students:
      school_consumptions = pd.merge(monthly_school_consumptions, categorical_school, how='inner', left_on='ID', right_on='ΑΑ')
      school_consumptions = monthly_school_consumptions.dropna().reset_index(drop=True)
      data_split = 'split_data_2/'

    monthly_school_consumptions = monthly_school_consumptions.drop(['School'], axis=1)
    monthly_school_consumptions["isCovid"] = monthly_school_consumptions["isCovid"].astype(int)
    monthly_school_consumptions["isSummer"] = monthly_school_consumptions["isSummer"].astype(int)
    monthly_school_consumptions["isHalfSummer"] = monthly_school_consumptions["isHalfSummer"].astype(int)

  elif data_type == 'daily':
    extra_column = default_dict['extra_column']
    school_consumptions = pd.read_csv(path_to_data + 'concat_data.csv')
    if extra_column:
      data_split = 'split_data_2/'
      monthly_consumptions = pd.read_csv(path_to_data + '../Monthly_data/monthly_consumptions.csv')
      monthly_consumptions = monthly_consumptions.groupby('Month')['Monthly Consumption'].mean()
      school_consumptions['Date'] = ['-'.join(x.split('-')[:2]) for x in school_consumptions['Date']]
      monthly_consumptions = pd.DataFrame({'Month':monthly_consumptions.index, 'Monthly Consumption':monthly_consumptions.values})
      school_consumptions = add_extra_feature(school_consumptions, monthly_consumptions)
      print(school_consumptions)
    school_consumptions['Value'] = school_consumptions['Value'].clip(lower=0)
    school_consumptions = school_consumptions.rename(columns={"index": "ID"})

  if create_data:
    input_data_list, target_labels_list, smashed_data_schools, smashed_data_targets = create_timesteps_data(school_consumptions, number_timesteps, data_type)
    train_data, train_targets, test_data, test_targets, validation_data, validation_targets = create_validation_test(smashed_data_schools, smashed_data_targets, val_ptg, test_ptg)
    save_to_pkl(train_data, train_targets, path_to_data + data_split, 'train')
    save_to_pkl(validation_data, validation_targets, path_to_data + data_split, 'validation')
    save_to_pkl(test_data, test_targets, path_to_data + data_split, 'test')
  else:
    train_data, train_targets = load_pkl(path_to_data + data_split, 'train')
    validation_data, validation_targets = load_pkl(path_to_data + data_split, 'validation')
    test_data, test_targets = load_pkl(path_to_data + data_split, 'test')


  train_data, train_targets = create_np_array(train_data, train_targets)
  validation_data, validation_targets = create_np_array(validation_data, validation_targets)
  test_data, test_targets = create_np_array(test_data, test_targets)

  print(train_data.shape)
  print(validation_data.shape)
  print(test_data.shape)
  train_data, train_targets = torch.from_numpy(train_data), torch.from_numpy(train_targets)
  validation_data, validation_targets = torch.from_numpy(validation_data), torch.from_numpy(validation_targets)
  test_data, test_targets = torch.from_numpy(test_data), torch.from_numpy(test_targets)

  if normalize_input:
    inp_norm_technique = default_dict.get('input_normalization')

    train_data = rescale_data(train_data, inp_norm_technique, f'{data_type}_{inp_norm_technique}_input_scaler')
    validation_data = rescale_data(validation_data, inp_norm_technique, f'{data_type}_{inp_norm_technique}_input_scaler')
    test_data = rescale_data(test_data, inp_norm_technique, f'{data_type}_{inp_norm_technique}_input_scaler')

  if normalize_target:
    targ_norm_technique = default_dict.get('target_normalization')

    train_targets = rescale_data(train_targets, targ_norm_technique, f'{data_type}_{targ_norm_technique}_target_scaler')
    validation_targets = rescale_data(validation_targets, targ_norm_technique, f'{data_type}_{targ_norm_technique}_target_scaler')
    test_targets = rescale_data(test_targets, targ_norm_technique, f'{data_type}_{targ_norm_technique}_target_scaler')

  train_targets = torch.unsqueeze(train_targets, 1)
  test_targets = torch.unsqueeze(test_targets, 1)
  validation_targets = torch.unsqueeze(validation_targets, 1)

  return train_data, train_targets, validation_data, validation_targets, test_data, test_targets