import pandas as pd

# Read the original Excel file
df = pd.read_excel('exam_place_rooms.xlsx')

# Print original columns
print("Original columns:", list(df.columns))

# Rename columns to match expected format
df = df.rename(columns={
    'Building Name': 'Building',
    'Classroom Code': 'Room Number',
    'Classroom Capacity': 'Capacity'
})

# Add Exam ID column with default values (the user should update these as needed)
# Using a placeholder value of 1 for all rows
df['Exam ID'] = 1

# Reorder columns to match expected order
df = df[['Exam ID', 'Building', 'Room Number', 'Capacity']]

# Print new columns
print("\nNew columns:", list(df.columns))
print("\nFixed data sample:")
print(df.head().to_string())

# Save to a new Excel file
df.to_excel('fixed_exam_place_rooms.xlsx', index=False)
print("\nFixed Excel file saved as 'fixed_exam_place_rooms.xlsx'")
print("Please update the 'Exam ID' column with your actual exam IDs before uploading.") 