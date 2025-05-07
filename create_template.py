import pandas as pd

# Read the Excel file
df = pd.read_excel('exam_place_rooms.xlsx')

# Print original columns and data
print("Original columns:", list(df.columns))
print("\nOriginal data sample:")
print(df.head().to_string())

# Rename columns to match expected format if needed
if 'Exam ID' not in df.columns:
    df = df.rename(columns={
        'Building Name': 'Building',
        'Classroom Code': 'Room Number',
        'Classroom Capacity': 'Capacity'
    })

# Add empty Exam ID column for manual filling
df['Exam ID'] = ''

# Reorder columns to match expected order
df = df[['Exam ID', 'Building', 'Room Number', 'Capacity']]

# Print the new structure
print("\nNew columns:", list(df.columns))
print("\nTemplate data (fill in Exam ID column):")
print(df.head().to_string())

# Save to a new Excel file
df.to_excel('exam_placement_template.xlsx', index=False)
print("\nTemplate Excel file saved as 'exam_placement_template.xlsx'")
print("""
INSTRUCTIONS:
1. Open 'exam_placement_template.xlsx' in Excel
2. Fill in the 'Exam ID' column with the actual exam IDs from your system
   (You can find these IDs on the Exam Management page)
3. For each exam that needs a room, create a row with the exam's ID
4. Save the file and upload it to the system
""") 