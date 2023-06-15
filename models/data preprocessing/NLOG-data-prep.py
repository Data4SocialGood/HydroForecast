import pandas as pd
import os

directory = "C:/Users/Nikolas/Desktop/NLOG_Data_clean/NLOG_Data_clean"

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

for i, filename in enumerate(os.listdir(directory)):
    if filename.endswith(".csv"):
        filepath = os.path.join(directory, filename)
        df = pd.read_csv(filepath)
        df = fixData(df)
        df.to_csv(filepath, index=False)