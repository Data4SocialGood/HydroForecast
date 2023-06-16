from src.water_consumption_prediction.model.train_model import calculate_loss
from src.water_consumption_prediction.dataset.normalization_utilites import inverse_normalized_data 
import matplotlib
# matplotlib.use('Webagg')
import matplotlib.pyplot as plt
import torch
import torch.nn as nn
import numpy as np


def load_model():
  model = torch.load('../trained_models/best_model.pt')
  return model
  
def plot_ground_truth_prediction(input_targets, target_predictions, device, logs_dir):
  fig,ax = plt.subplots()
  title = 'Prediction vs ground truth plot'
  plt.title(title ,fontsize=18)
  plt.xlabel('Months',fontsize=18)
  plt.ylabel('Consumption',fontsize=18)
  days = [i for i in range(0, len(input_targets))]
  ax.plot()
  ax.plot(days, input_targets.detach().cpu(), label='Water Consumption')
  ax.plot(days, target_predictions.detach().cpu(), label='Water Prediction')
  plt.legend(loc='upper right')
  # plt.show()
  fig.savefig(f'{logs_dir}ground_prediction_plot.png')   # save the figure to file, high resolution



def rmse_evaluation(output, target):
    rmse = nn.MSELoss(reduction='mean')
    return torch.sqrt(rmse(output, target))


def mape_evaluation(output, target):
    # MAPE loss
    return torch.mean(torch.abs((target - output) / target))

#https://medium.com/@davide.sarra/how-to-interpret-smape-just-like-mape-bf799ba03bdc
def smape_evaluation(output, target):
  # SMAPE loss
    return  torch.mean(2 * (output - target).abs() / (output.abs() + target.abs() + 1e-8))


def evaluation(model, criterion, input_data, input_targets, device, logs_dir, target_norm, norm_technique, data_type):
  loss, _ , target_predictions = calculate_loss(model, device, criterion, (input_data.to(device), input_targets.to(device)))

  # max_value = torch.max(input_targets)
  # eval_metric = (max_value - loss) / max_value
  if target_norm:
    input_targets = inverse_normalized_data(input_targets, norm_technique, f'{data_type}_{norm_technique}_target_scaler')
    target_predictions = inverse_normalized_data(target_predictions, norm_technique, f'{data_type}_{norm_technique}_target_scaler')
  
  print(loss.item())
  rmse_evaluation(target_predictions.to(device), input_targets.to(device))
  rmse = np.array([rmse_evaluation(target_predictions.to(device), input_targets.to(device)).item()])
  smape = np.array([smape_evaluation(target_predictions.to(device), input_targets.to(device)).item()])

  print('Root mean squared error = ', rmse[0])
  print('Symmetric mean absolute percentage error = ', smape[0])
  with open(f"{logs_dir}rmse", "a") as f:
    np.savetxt(f, rmse)

  # print('Evaluation metric: ', eval_metric.item())
  plot_ground_truth_prediction(input_targets, target_predictions, device, logs_dir)