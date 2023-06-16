def tuple_type(strings):
    strings = strings.replace("(", "").replace(")", "")
    mapped_int = map(int, strings.split(","))
    return tuple(mapped_int)

def create_group_dictionary(current_dictionary, parser):
    args,unknown = parser.parse_known_args()
    args_dictionary = vars(args)
    group_dictionary = {k: v for k, v in args_dictionary.items() if k not in current_dictionary}
    return group_dictionary, args_dictionary


def collect_default_arguments(parser):     
    parser.add_argument("--random_seed_number", type=int, default=17)
    parser.add_argument("--data_type", default='daily')
    parser.add_argument("--data_dir", help='Directory where csv data is saved', default='../data/NLOG_Data_clean/')
    parser.add_argument("--logs_dir", default='../logs/')
    parser.add_argument("--create_data", action='store_true')
    parser.add_argument("--time_steps", type=int, help='number of timesteps of the training vectors', default=6)
    parser.add_argument("--batch_size", type=int, default=128)
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--early_stopping_epochs", type=int, default=7)
    parser.add_argument("--learning_rate", type=float, default=1e-4)
    parser.add_argument("--normalize_input", action='store_true', help='Normalize input data')
    parser.add_argument("--input_normalization", default='z_score')
    parser.add_argument("--normalize_target", action='store_true', help='Normalize target data')
    parser.add_argument("--target_normalization", default='minmax')
    parser.add_argument("--val_ptg", type=float, default=0.1)
    parser.add_argument("--test_ptg", type=float, default=0.2)
    parser.add_argument("--loss_type", default="rmse")
    parser.add_argument("--reduction", default='mean')
    parser.add_argument("--random_seed", type=int, default=17)
    parser.add_argument("--include_students", action='store_true')
    parser.add_argument('--extra_column', action='store_true')


def collect_rnn_arguments(parser):
    rnn_group = parser.add_argument_group('RNN group', 'Arguments group that describes the RNN networks we will be using')
    rnn_group.add_argument("--model_type", help = 'Type of RNN, LSTM/GRU', default='LSTM')
    rnn_group.add_argument("--num_layers", type=int, help = 'number of stacked lstms', default=1)
    rnn_group.add_argument("--hidden_size", type=int, help = 'define hidden size of lstm', default=64)
    rnn_group.add_argument('--bidirectional', action='store_true')
    rnn_group.add_argument('--skip_connections', action='store_true')
    rnn_group.add_argument('--gradient_clipping', action='store_true')
    rnn_group.add_argument('--dropout_p', type=float, default=0.0)
    rnn_group.add_argument('--attention', action='store_true')