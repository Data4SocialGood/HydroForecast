import os 
import numpy as np
import torch

def z_score_normalization(input_data, m, s):

  return (input_data - m) / s

def minmax_normalization(input_data, minval, maxval, scale_range = (0,1)):
  minrange, maxrange = scale_range
  return ((input_data - minval) / (maxval - minval)) * (maxrange - minrange)
  

def inverse_z_score(input_data, m, s):
    return input_data * s + m

def inverse_minmax(input_data, min_value, max_value, scale_range = (0,1)):
    minrange, maxrange = scale_range
    return ((input_data / (maxrange - minrange)) * (max_value - min_value)) + min_value

def set_scaling_factors(torch_data, filename, rescale_method):
    if torch_data.dim() > 2:
        torch_data = torch_data.flatten(end_dim=-2)
    if rescale_method == 'minmax':
        minval, maxval = torch.min(torch_data).numpy(), torch.max(torch_data).numpy()
        to_save = [minval, maxval]
    elif rescale_method == 'z_score':
        m, s = torch_data.mean(axis=0).numpy() , torch_data.std(axis=0).numpy()
        to_save = [m, s]       
    
    np.savetxt(filename, to_save, delimiter=', ')
    
    return to_save[0], to_save[1]            # saved_vector[0] is min or mean , saved_vector[1] is max or std deviation

def get_normalization_factors(filename):        
    if os.path.isfile(filename):
        saved_vector = np.genfromtxt(filename, dtype='float32', delimiter=', ')
    else:
        return None
    return saved_vector

def rescale_data(input_data, rescale_method, scaler_save_name):
    scalers = {'minmax': minmax_normalization, 'z_score': z_score_normalization}
    saved_vector =  return_saved_vector(scaler_save_name)
    if saved_vector is None:
        a_val, b_val = set_scaling_factors(input_data, scaler_save_name, rescale_method)
    else:
        a_val, b_val = saved_vector

    a_val, b_val = torch.from_numpy(np.asarray(a_val, dtype='float32')), torch.from_numpy(np.asarray(b_val, dtype='float32'))
    data_rescaled = scalers[rescale_method](input_data, a_val, b_val)
    return data_rescaled

def return_saved_vector(filename):        
    if os.path.isfile(filename):
        saved_vector = np.genfromtxt(filename, dtype='float', delimiter=', ')
    else:
        return None
    return saved_vector

def inverse_normalized_data(input_data, rescale_method, scaler_save_name):
    inverse_scalers = {'minmax': inverse_minmax, 'z_score': inverse_z_score}
    saved_vector = return_saved_vector(scaler_save_name)
    a_val, b_val = saved_vector
    a_val, b_val = torch.from_numpy(np.asarray(a_val, dtype='float32')), torch.from_numpy(np.asarray(b_val, dtype='float32'))
    data_inversed = inverse_scalers[rescale_method](input_data, a_val, b_val)
    return data_inversed