import sys
sys.path.insert(0,'../')
from src.water_consumption_prediction.utils import read_arguments
import torch
import torch.nn as nn
import pandas as pd
import datetime
from tqdm import tqdm
import argparse
from pydash import at
from src.water_consumption_prediction.dataset.load_dataset import get_dataset, create_dataloader
from src.water_consumption_prediction.model.create_model import create_model
from src.water_consumption_prediction.model.train_model import train, plot_learning_curves
from src.water_consumption_prediction.model.evaluate_model import evaluation

device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

init_parser = argparse.ArgumentParser(add_help=False)

read_arguments.collect_default_arguments(init_parser)
default_arguments_dictionary, curr_dict = read_arguments.create_group_dictionary({}, init_parser)

read_arguments.collect_rnn_arguments(init_parser)
rnn_arguments_dictionary ,curr_dict = read_arguments.create_group_dictionary(curr_dict, init_parser)

parser = argparse.ArgumentParser(parents=[init_parser])
args = parser.parse_args()


data_path, logs_dir, random_seed_number = at(default_arguments_dictionary, 'data_dir', 'logs_dir', 'random_seed_number')
torch.manual_seed(random_seed_number)

X_train, y_train, X_valid, y_valid, X_test, y_test = get_dataset(data_path, default_arguments_dictionary)

D_in = X_train.shape[-1]
D_out = 1

time_steps, learning_rate, batch_size, epochs, early_stopping_epochs, loss_type, reduction, gradient_clipping, data_type, target_norm, norm_technique, attention = at(default_arguments_dictionary, 'time_steps', 'learning_rate', 'batch_size', 'epochs', 'early_stopping_epochs', 'loss_type', 'reduction', 'gradient_clipping', 'data_type', 'normalize_target', 'target_normalization', 'attention')

rnn_model, optimizer, criterion = create_model(D_in, D_out, time_steps, learning_rate, loss_type, reduction, rnn_arguments_dictionary, device)

train_dataloader = create_dataloader(X_train, y_train, batch_size=batch_size, shuffle=True)
valid_dataloader = create_dataloader(X_valid, y_valid, batch_size=batch_size, shuffle=True)

dataloaders = (train_dataloader, valid_dataloader)

best_model, train_loss, validation_loss, val_raw_output = train(device, rnn_model, epochs, optimizer, criterion, dataloaders, early_stopping_epochs, gradient_clipping)
import os
print(os.getcwd())

plot_learning_curves(train_loss, validation_loss, logs_dir)
evaluation(best_model, criterion, X_test, y_test, device, logs_dir, target_norm, norm_technique, data_type)