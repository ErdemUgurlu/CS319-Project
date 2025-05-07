import pandas as pd
import json
import requests
import os

# First, let's get all exams that are waiting for places
TOKEN_FILE = os.path.join(os.path.expanduser('~'), '.ta_management_token')

def get_auth_token():
    """Get authentication token from file or env var"""
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, 'r') as f:
            return f.read().strip()
    return os.getenv('TA_MANAGEMENT_TOKEN', '')

# Setup API headers with auth token
headers = {
    'Authorization': f'Token {get_auth_token()}',
    'Content-Type': 'application/json'
}

# Get the base URL from the backend URL
BASE_URL = 'http://127.0.0.1:8000'  # Adjust if your backend runs on a different URL

print("Fetching exams waiting for places...")

try:
    # Get all exams waiting for places
    response = requests.get(f"{BASE_URL}/api/accounts/exams/?status=WAITING_FOR_PLACES", headers=headers)
    
    if response.status_code != 200:
        print(f"Error fetching exams: {response.status_code} - {response.text}")
        exams = []
    else:
        exams = response.json()
        print(f"Found {len(exams)} exams waiting for places.")
except Exception as e:
    print(f"Error connecting to API: {str(e)}")
    exams = []

# Read the Excel file
df = pd.read_excel('exam_place_rooms.xlsx')

# Print original columns and data
print("\nOriginal columns:", list(df.columns))
print("\nOriginal data sample:")
print(df.head().to_string())

# If columns need renaming (which we already did in the previous script)
if 'Exam ID' not in df.columns:
    # Rename columns to match expected format
    df = df.rename(columns={
        'Building Name': 'Building',
        'Classroom Code': 'Room Number',
        'Classroom Capacity': 'Capacity'
    })

# Create a new dataframe with the required format
new_rows = []

# If we have exams waiting for places, we can create entries for each
if exams:
    # For each exam waiting for places
    for exam in exams:
        exam_id = exam['id']
        
        # For each room in our Excel file, create a row for this exam
        for _, room_row in df.iterrows():
            new_rows.append({
                'Exam ID': exam_id,
                'Building': room_row['Building'] if 'Building' in room_row else room_row['Building Name'],
                'Room Number': room_row['Room Number'] if 'Room Number' in room_row else room_row['Classroom Code'],
                'Capacity': room_row['Capacity'] if 'Capacity' in room_row else room_row['Classroom Capacity']
            })
    
    # Create new dataframe from the rows
    new_df = pd.DataFrame(new_rows)
    
    # Save the new Excel file
    new_df.to_excel('exam_placements_with_ids.xlsx', index=False)
    
    print("\nNew Excel file created: 'exam_placements_with_ids.xlsx'")
    print(f"Created {len(new_rows)} room assignments for {len(exams)} exams")
    print("\nSample of the new file:")
    print(new_df.head().to_string())
    
    print("\nPlease upload the 'exam_placements_with_ids.xlsx' file to assign classrooms to exams.")
else:
    # If we couldn't get exams from the API, just create a template
    df['Exam ID'] = ''  # Empty column for user to fill in
    
    # Reorder columns
    if 'Capacity' not in df.columns and 'Classroom Capacity' in df.columns:
        df = df.rename(columns={'Classroom Capacity': 'Capacity'})
    
    df = df[['Exam ID', 'Building', 'Room Number', 'Capacity']]
    
    # Save to Excel
    df.to_excel('exam_placements_template.xlsx', index=False)
    
    print("\nNew template file created: 'exam_placements_template.xlsx'")
    print("ERROR: Could not fetch exams from the API. Please manually fill in the exam IDs.")
    print("You need to get the exam IDs from the system and update the 'Exam ID' column.")
    print("Visit the Exam Management page and find the IDs of exams waiting for places.") 