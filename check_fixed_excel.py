import pandas as pd

# Read the fixed Excel file
df = pd.read_excel('fixed_exam_place_rooms.xlsx')

# Print column names
print("Columns in fixed Excel file:", list(df.columns))

# Print first 5 rows
print("\nFirst 5 rows of data:")
print(df.head().to_string()) 