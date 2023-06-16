from typing import List
import torch
import torch.nn as nn
from pydash import at

def masked_flip(padded_sequence: torch.Tensor, sequence_lengths: List[int], max_length) -> torch.Tensor:
    """
    Flips a padded tensor along the time dimension without affecting masked entries.
    # Parameters
    padded_sequence : `torch.Tensor`
        The tensor to flip along the time dimension.
        Assumed to be of dimensions (batch size, num timesteps, ...)
    sequence_lengths : `torch.Tensor`
        A list containing the lengths of each unpadded sequence in the batch.
    # Returns
    `torch.Tensor`
        A `torch.Tensor` of the same shape as padded_sequence.
    """
    assert padded_sequence.size(0) == len(
        sequence_lengths
    ), f"sequence_lengths length ${len(sequence_lengths)} does not match batch size ${padded_sequence.size(0)}"
    num_timesteps = padded_sequence.size(1)
    flipped_padded_sequence = torch.flip(padded_sequence, [1])
    sequences = []
    for i, length in enumerate(sequence_lengths):
      if length > max_length:
        length = max_length
      sequences.append(flipped_padded_sequence[i, num_timesteps - length :])
    return torch.nn.utils.rnn.pad_sequence(sequences, batch_first=True,padding_value=1)

class attention_layer(nn.Module):
  def __init__(self):
    super().__init__()

  def forward(self, hidden_n, lstm_outputs):
    unpacked_output,len = nn.utils.rnn.pad_packed_sequence(lstm_outputs,batch_first=True)
    hidden_attention = torch.bmm(unpacked_output, hidden_n[...,None])
    hidden_attention = torch.squeeze(hidden_attention,dim=-1)
    softmax_module = nn.Softmax(dim = 1)
    softmax_score = softmax_module(hidden_attention)
    output = torch.bmm(softmax_score[:,None,:],unpacked_output)
    output = torch.squeeze(output,dim=1)
    return output  

class gruRNN(nn.Module):
  def __init__(self, input_size, hidden_size, num_layers, dropout,skip_connections):
    super().__init__()

    self.num_layers = num_layers                      # number of stacked GRUs
    self.hidden_dimension = hidden_size               # hidden size of each GRU
    self.skip_connections = skip_connections          # apply skip connections output = GRU(input) + input
    self.dropout = dropout                            # dropout rate after each GRU

    self.gru_rnns = nn.ModuleList()
    for i in range(num_layers):
      input_size = input_size if i == 0 else hidden_size
      self.gru_rnns.append(nn.GRU(input_size=input_size, hidden_size=hidden_size, num_layers=1, dropout=0.0, bidirectional=False, batch_first=True))


  def forward(self, input_data, input_shape, device):
    sent_variable = input_data
    for i in range(self.num_layers):          # for each GRU
      if i != 0: 
        sent_variable,len = nn.utils.rnn.pad_packed_sequence(sent_variable,batch_first=True)     # R ^ (B x T x * input)
        if self.skip_connections:                             # save input for skip connection
          unpacked_skip = sent_variable                       
          hidden_skip = hidden_n
        sent_variable = nn.functional.dropout(sent_variable, p=self.dropout, training=True)     # dropout layer
        sent_variable = nn.utils.rnn.pack_padded_sequence(sent_variable, len, batch_first=True, enforce_sorted=False)

      hidden_0 = torch.zeros(1, input_shape, self.hidden_dimension).to(device)

      self.gru_rnns[i].flatten_parameters()
      gru_out,hidden_n = self.gru_rnns[i](sent_variable, hidden_0)

      if self.skip_connections==True and i != 0:
        unpacked_gru_out,len = nn.utils.rnn.pad_packed_sequence(gru_out,batch_first=True)
        sent_variable = torch.add(unpacked_gru_out,unpacked_skip)
        sent_variable = nn.utils.rnn.pack_padded_sequence(sent_variable,len,batch_first=True,enforce_sorted=False)
        if i == self.num_layers - 1:
          hidden_n = torch.add(hidden_n, hidden_skip)
      else:
        sent_variable = gru_out

    return sent_variable, hidden_n


class lstmRNN(nn.Module):
  def __init__(self, input_size, hidden_size, num_layers, dropout,skip_connections):
    super().__init__()

    self.num_layers = num_layers
    self.hidden_dimension = hidden_size
    self.skip_connections = skip_connections
    self.dropout = dropout
    self.lstm_rnns = nn.ModuleList()
    for i in range(num_layers):
      input_size = input_size if i == 0 else hidden_size
      self.lstm_rnns.append(nn.LSTM(input_size=input_size, hidden_size=hidden_size, num_layers=1, dropout=0.0, bidirectional=False, batch_first=True))
        

  def forward(self,padded_input, input_shape, device):
    sent_variable = padded_input
    for i in range(self.num_layers):
      if i != 0:
        sent_variable,len = nn.utils.rnn.pad_packed_sequence(sent_variable,batch_first=True)
        if self.skip_connections:
          unpacked_skip = sent_variable
          hidden_skip = hidden_n
        sent_variable = nn.functional.dropout(sent_variable, p=self.dropout, training=True)
        sent_variable = nn.utils.rnn.pack_padded_sequence(sent_variable,len,batch_first=True,enforce_sorted=False)

      hidden_0 = torch.zeros(1, input_shape, self.hidden_dimension).to(device)
      cell_0 = torch.zeros(1, input_shape, self.hidden_dimension).to(device)

      self.lstm_rnns[i].flatten_parameters()
      lstm_out,(hidden_n,cell_n) = self.lstm_rnns[i](sent_variable, (hidden_0, cell_0))

      if self.skip_connections==True and i != 0:
        unpacked_lstm_out,len = nn.utils.rnn.pad_packed_sequence(lstm_out,batch_first=True)
        sent_variable = torch.add(unpacked_lstm_out,unpacked_skip)
        sent_variable = nn.utils.rnn.pack_padded_sequence(sent_variable,len,batch_first=True,enforce_sorted=False)
        if i == self.num_layers - 1:
          hidden_n = torch.add(hidden_n, hidden_skip)
      else:
        sent_variable = lstm_out

    return sent_variable, hidden_n


class RNN(nn.Module):
  cells = {
    'LSTM' : lstmRNN ,
    'GRU'  : gruRNN
  }
  def __init__(self, input_size, hidden_size, num_layers, dropout, bidirectional, output_size, max_seq_length, attention, cell_type='LSTM', skip_connections=False):
    super().__init__()
    self.max_seq_length = max_seq_length
    self.bidirectional = bidirectional
    self.attention = attention
    self.bidirectionality = 2 if bidirectional else 1
    self.attention_num = 2 if attention else 1
    self.cell = RNN.cells[cell_type](input_size, hidden_size, num_layers, dropout, skip_connections)

    if bidirectional:
      self.cell_bi = RNN.cells[cell_type](input_size, hidden_size, num_layers, dropout, skip_connections)
    if attention:
      self.attention_layer = attention_layer()
    self.output_layer = nn.Linear(in_features=hidden_size * self.bidirectionality * self.attention_num ,out_features=output_size)


  def forward(self,input_vec,batch_len, device):

    padded_input = nn.utils.rnn.pack_padded_sequence(input_vec, batch_len, batch_first=True, enforce_sorted=False)
    rnn_out, hidden_n = self.cell(padded_input, input_vec.shape[0], device)
    hidden_n = torch.squeeze(hidden_n,dim=0)
    if self.attention:
      attention_out = self.attention_layer(hidden_n, rnn_out)
      hidden_n = torch.cat((attention_out, hidden_n), dim=1)
    if self.bidirectional:
      flipped_input = masked_flip(input_vec, batch_len, self.max_seq_length)
      flipped_padded_input = nn.utils.rnn.pack_padded_sequence(flipped_input,batch_len.cpu(),batch_first=True,enforce_sorted=False)
      rnn_out_bi, hidden_n_bi = self.cell(flipped_padded_input, input_vec.shape[0], device)
      hidden_n_bi = torch.squeeze(hidden_n_bi,dim=0)
      if self.attention:
        attention_out_bi = self.attention_layer(hidden_n_bi,rnn_out_bi)
        hidden_n_bi = torch.cat((attention_out_bi, hidden_n_bi), dim=1)
      hidden_n = torch.cat((hidden_n,hidden_n_bi),dim=1)
    output = self.output_layer(hidden_n).to(device)
    return output


def create_model(D_in, D_out, time_steps, learning_rate, loss_type, reduction, rnn_dictionary, device):
  model_type, is_bidirectional, skip_connections, graddient_clipping, hidden_size, num_layers, dropout_p, attention = at(rnn_dictionary, 'model_type', 'bidirectional', 'skip_connections', 'gradient_clipping', 'hidden_size', 'num_layers', 'dropout_p', 'attention')
  #Initialize model, loss, optimizer
  model = RNN(D_in, hidden_size, num_layers, dropout_p, is_bidirectional, D_out, time_steps, attention, model_type, skip_connections).to(device)
  optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate, weight_decay=1e-5)
  print(loss_type)
  if loss_type == 'l1_norm':
    criterion = nn.L1Loss(reduction=reduction)
  else:
    criterion = nn.MSELoss(reduction=reduction)
  return model, optimizer, criterion

