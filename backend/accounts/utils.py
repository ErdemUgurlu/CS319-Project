import pandas as pd
import os
import logging

logger = logging.getLogger(__name__)

def process_student_list_file(file_path):
    """
    Process an Excel file containing student information for an exam.
    
    Expected format:
    - Column for student IDs (e.g., "Student ID", "ID", "Number")
    - Optional columns for name, surname, department, etc.
    
    Returns:
        dict: Dictionary containing:
            - student_count: Number of students in the file
            - student_data: List of dictionaries with student information
            - error: Error message if any
    """
    try:
        if not os.path.exists(file_path):
            return {"error": f"File not found: {file_path}", "student_count": 0, "student_data": []}
        
        # Get file extension
        _, ext = os.path.splitext(file_path)
        if ext.lower() not in ['.xlsx', '.xls', '.csv']:
            return {"error": f"Unsupported file format: {ext}", "student_count": 0, "student_data": []}
        
        # Read the Excel file
        if ext.lower() == '.csv':
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
        
        # Check if the dataframe is empty
        if df.empty:
            return {"error": "The file is empty", "student_count": 0, "student_data": []}
        
        # Try to identify the student ID column
        potential_id_columns = ["student id", "id", "number", "student no", "student number", "studentid"]
        student_id_column = None
        
        for col in df.columns:
            if col.lower().strip() in potential_id_columns:
                student_id_column = col
                break
        
        if not student_id_column:
            # If no explicit ID column, use the first column
            student_id_column = df.columns[0]
            logger.warning(f"No explicit student ID column found, using first column: {student_id_column}")
        
        # Extract student data
        student_data = []
        for _, row in df.iterrows():
            student_id = str(row[student_id_column]).strip()
            if student_id and student_id != 'nan':
                student_info = {"student_id": student_id}
                
                # Add other columns if available
                for col in df.columns:
                    if col != student_id_column:
                        value = row[col]
                        if pd.notna(value):  # Skip NaN values
                            student_info[col.lower().replace(' ', '_')] = str(value)
                
                student_data.append(student_info)
        
        # Count unique student IDs
        unique_student_ids = set(s["student_id"] for s in student_data)
        student_count = len(unique_student_ids)
        
        return {
            "student_count": student_count,
            "student_data": student_data,
            "error": None
        }
        
    except Exception as e:
        logger.error(f"Error processing student list file: {str(e)}")
        return {"error": str(e), "student_count": 0, "student_data": []} 