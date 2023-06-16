import torch
import copy
import matplotlib.pyplot as plt

def calculate_loss(model, device, loss_function, batch):
  x_batch, y_batch = batch
  batch_len = torch.Tensor([elem.shape[-2] for elem in x_batch]).int()
  batch_raw_output = model(x_batch,batch_len, device)
  
  loss = torch.sqrt(loss_function(batch_raw_output, y_batch))
  return loss, y_batch, batch_raw_output

def print_metrics(epoch, batch_loss, val_loss):
  print(f"Epoch {epoch:3}: Loss = {batch_loss:.5f} , Validation Loss = {val_loss:.5f}")

def plot_learning_curves(train_loss, validation_loss, logs_dir):
    plt.plot(train_loss, color = 'r')
    plt.plot(validation_loss, color = 'b')
    # plt.show()
    plt.savefig(f'{logs_dir}learning_curves.png')

def train(device, model, epochs, optimizer, loss_function, data_iterators, patience, gradient_clipping):
  train_loader, validation_loader = data_iterators
  previous_val_loss = float('inf')
  notimprovedtimes = 0                      # for early stopping
  validation_loss = []                      # list of storing validation loss of each epoch
  train_loss = []                           # list of storing train loss of each epoch

  for epoch in range(epochs):
    model.train()
    train_batch_losses = []
    val_batch_losses = []
    epoch_val_loss = 0

    for x_batch, y_batch in train_loader:
      x_batch, y_batch = x_batch.to(device), y_batch.to(device)
      loss, _, _  = calculate_loss(model, device, loss_function, (x_batch, y_batch))
      train_batch_losses.append(loss.item())

      optimizer.zero_grad()             #Delete previously stored gradients
      loss.backward()                   #Perform backpropagation starting from the loss calculated in this epoch
      if gradient_clipping:
        torch.nn.utils.clip_grad_norm_(model.parameters(),2.0) #gradient clipping
      optimizer.step()                  #Update model's weights based on the gradients calculated during backprop
    
    model.eval()
    with torch.no_grad():
      for x_val_batch,y_val_batch in validation_loader:
        x_val_batch, y_val_batch = x_val_batch.to(device), y_val_batch.to(device)

        val_loss, val_actual_labels, val_raw_output = calculate_loss(model, device, loss_function, (x_val_batch, y_val_batch))
        val_batch_losses.append(val_loss.item())
        epoch_val_loss += val_loss
    
    epoch_train_loss = sum(train_batch_losses) / len(train_batch_losses)
    epoch_val_loss = sum(val_batch_losses) / len(val_batch_losses)

    # Early stopping
    if epoch_val_loss > previous_val_loss:
      notimprovedtimes += 1
      if notimprovedtimes >= patience:
        print("Earling stopping, patience=" + str(patience))
        
        print_metrics(epoch, epoch_train_loss, epoch_val_loss)
        break;
    else:
      best_model = copy.deepcopy(model)  # save best model
      torch.save(best_model.state_dict(), '../trained_models/best_model.pt')

      # best_model_metrics = (epoch_val_loss, val_pred_labels, val_actual_labels)
      notimprovedtimes = 0
      previous_val_loss = epoch_val_loss
        
    train_loss.append(epoch_train_loss)
    validation_loss.append(epoch_val_loss)
    print_metrics(epoch,epoch_train_loss, epoch_val_loss)
  return best_model, train_loss, validation_loss, val_raw_output
