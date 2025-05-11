import React, { useState, useEffect } from 'react';
import { 
  Box,
  TextField,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Typography,
  Stack,
  Alert,
  Switch,
  FormControlLabel
} from '@mui/material';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { Task, CompleteTaskData, ReviewTaskData, EnhancedTA } from '../services/taskService';
import { useAuth } from '../context/AuthContext';
import taskService from '../services/taskService';

interface TaskFormProps {
  task: Task | null;
  onSave: (task: Task) => void;
  onCancel: () => void;
  onComplete?: (taskId: number, data: CompleteTaskData) => void;
  onReview?: (taskId: number, data: ReviewTaskData) => void;
}

// Task status options - This will be removed
/*
const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' }
];
*/

const TaskForm: React.FC<TaskFormProps> = ({ 
  task, 
  onSave, 
  onCancel,
  onComplete,
  onReview 
}) => {
  const { authState } = useAuth();
  const { user } = authState;
  
  // Get role for conditional rendering
  const userRole = (user?.role || '').toUpperCase();
  
  // State for available TAs
  const [availableTAs, setAvailableTAs] = useState<EnhancedTA[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Task>({
    title: task?.title || '',
    description: task?.description || '',
    deadline: task?.deadline || new Date().toISOString().slice(0, 16), // Format as YYYY-MM-DDTHH:MM
    status: task?.status || 'PENDING',
    assigned_to: task?.assigned_to || null,
    credit_hours: task?.credit_hours || 0
  });
  
  // State for task completion form
  const [completionData, setCompletionData] = useState<CompleteTaskData>({
    completion_note: '',
    hours_spent: 0
  });
  
  // State for task review form
  const [reviewData, setReviewData] = useState<ReviewTaskData>({
    is_approved: true,
    feedback: ''
  });
  
  // Load available TAs on component mount
  useEffect(() => {
    if (userRole === 'INSTRUCTOR' || userRole === 'ADMIN' || userRole === 'STAFF') {
      fetchAvailableTAs();
    }
  }, [userRole]);
  
  const fetchAvailableTAs = async () => {
    setLoading(true);
    try {
      const response = await taskService.getAvailableTAs();
      console.log("TA response from service:", response);
      
      if (response.data && Array.isArray(response.data)) {
        // Process TA data objects to ensure they have required properties
        const tasData = response.data
          .filter(item => item && typeof item === 'object') // Ensure item is an object
          .map(item => {
            // Log each TA for debugging
            console.log("Processing TA item:", item);
            
            // Handle case where item might have a nested TA object
            // Use type assertion to tell TypeScript this might have different structure
            const itemWithPossibleTA = item as any; // Type assertion for flexibility
            
            if (itemWithPossibleTA.ta && typeof itemWithPossibleTA.ta === 'object') {
              return itemWithPossibleTA.ta;
            }
            
            // Ensure TA item has required ID property
            if (item.id) {
              // Ensure full_name exists or create it from available fields
              if (!item.full_name && (item.first_name || item.last_name)) {
                item.full_name = `${item.first_name || ''} ${item.last_name || ''}`.trim();
              } else if (!item.full_name) {
                item.full_name = `TA ID: ${item.id}`;
              }
              return item;
            }
            
            return null;
          })
          .filter(item => item !== null) as EnhancedTA[]; // Final type assertion to EnhancedTA[]
        
        console.log("Processed TAs for dropdown:", tasData);
        setAvailableTAs(tasData);
      } else {
        console.warn("Unexpected TA data format:", response);
        setAvailableTAs([]);
      }
    } catch (err) {
      console.error('Error fetching TAs:', err);
      setAvailableTAs([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle text input changes
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Handle number input changes
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setFormData({
        ...formData,
        [name]: numValue
      });
    }
  };
  
  // Handle completion note change
  const handleCompletionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'hours_spent') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        setCompletionData({
          ...completionData,
          hours_spent: numValue
        });
      }
    } else {
      setCompletionData({
        ...completionData,
        [name]: value
      });
    }
  };
  
  // Handle review data change
  const handleReviewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    
    if (name === 'is_approved') {
      setReviewData({
        ...reviewData,
        is_approved: checked
      });
    } else {
      setReviewData({
        ...reviewData,
        [name]: value
      });
    }
  };
  
  // Handle select changes - handleStatusChange will be removed
  /*
  const handleStatusChange = (e: SelectChangeEvent) => {
    setFormData({
      ...formData,
      status: e.target.value
    });
  };
  */
  
  const handleAssignedToChange = (e: SelectChangeEvent) => {
    setFormData({
      ...formData,
      assigned_to: e.target.value === '' ? null : Number(e.target.value)
    });
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Add ID if editing
    const taskToSave: Task = {
      ...formData,
      id: task?.id
    };
    
    onSave(taskToSave);
  };
  
  // Handle complete task
  const handleCompleteTask = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (task?.id && onComplete) {
      onComplete(task.id, completionData);
    }
  };
  
  // Handle review task
  const handleReviewTask = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (task?.id && onReview) {
      onReview(task.id, reviewData);
    }
  };
  
  // Determine which form to show based on user role and task status
  const renderTaskUpdateForm = () => (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Stack spacing={2}>
        <Box>
          <TextField
            required
            fullWidth
            label="Title"
            name="title"
            value={formData.title}
            onChange={handleTextChange}
            disabled={userRole === 'TA'}
          />
        </Box>
        
        <Box>
          <TextField
            required
            fullWidth
            multiline
            rows={4}
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleTextChange}
            disabled={userRole === 'TA'}
          />
        </Box>
        
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box sx={{ width: '100%' }}>
            <TextField
              required
              fullWidth
              type="datetime-local"
              label="Deadline"
              name="deadline"
              value={formData.deadline}
              onChange={handleTextChange}
              InputLabelProps={{ shrink: true }}
              disabled={userRole === 'TA'}
              helperText="Include both date and time"
            />
          </Box>
        </Stack>
        
        {userRole === 'INSTRUCTOR' && (
          <Box>
            <TextField
              fullWidth
              type="number"
              label="Credit Hours"
              name="credit_hours"
              value={formData.credit_hours || ''}
              onChange={handleNumberChange}
              helperText="The number of credit hours this task is worth"
              inputProps={{ step: 0.5, min: 0 }}
            />
          </Box>
        )}
        
        {(userRole === 'INSTRUCTOR' || userRole === 'ADMIN' || userRole === 'STAFF') && (
          <Box>
            <FormControl fullWidth>
              <InputLabel id="assigned-to-label">Assigned To</InputLabel>
              <Select
                labelId="assigned-to-label"
                name="assigned_to"
                value={formData.assigned_to !== null && formData.assigned_to !== undefined ? formData.assigned_to.toString() : ''}
                onChange={handleAssignedToChange}
                label="Assigned To"
              >
                <MenuItem value="">Not Assigned</MenuItem>
                
                {loading ? (
                  <MenuItem disabled>Loading TAs...</MenuItem>
                ) : availableTAs && availableTAs.length > 0 ? (
                  availableTAs.map((ta, index) => (
                    ta && ta.id ? (
                      <MenuItem key={ta.id} value={ta.id.toString()}>
                        {ta.ta_full_name || ta.full_name || `${ta.first_name || ''} ${ta.last_name || ''}`.trim() || `TA #${index + 1}`}
                        {(ta.employment_type_display || ta.employment_type || ta.ta_employment_type) && 
                          ` (${(ta.employment_type_display || ta.employment_type || ta.ta_employment_type || '').replace('_', ' ')})`}
                      </MenuItem>
                    ) : null
                  ))
                ) : (
                  <MenuItem disabled value="">No TAs assigned to you</MenuItem>
                )}
              </Select>
              {availableTAs && availableTAs.length > 0 ? (
                <Typography variant="caption" color="textSecondary">
                  {availableTAs.length} TA(s) available for assignment
                </Typography>
              ) : (
                <Typography variant="caption" color="error">
                  No TAs assigned to you. Please assign TAs in Manage Teaching Assistants page first.
                </Typography>
              )}
            </FormControl>
            
            {/* TA List with Details */}
            {availableTAs && availableTAs.length > 0 && (
              <Box sx={{ mt: 2, p: 2, border: '1px solid #eee', borderRadius: 1, bgcolor: '#fafafa' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Your Assigned Teaching Assistants:
                </Typography>
                <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                  {availableTAs.map((ta, index) => (
                    <Box component="li" key={ta.id || index} sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        <strong>
                          {ta.ta_full_name || ta.full_name || `${ta.first_name || ''} ${ta.last_name || ''}`.trim() || `TA #${ta.id}`}
                        </strong>
                        {ta.ta_email && ` (${ta.ta_email})`}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', ml: 2 }}>
                        • Employment: <strong>{ta.employment_type_display || ta.employment_type || 'Not specified'}</strong>
                        {ta.current_workload && ` • Current Workload: ${ta.current_workload} hours`}
                        {ta.workload_cap && ` • Workload Cap: ${ta.workload_cap} hours`}
                        {ta.department && ` • Department: ${ta.department}`}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} sx={{ mr: 1 }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained">
            Save
          </Button>
        </Box>
      </Stack>
    </Box>
  );
  
  // Form for TA to complete a task
  const renderTaskCompletionForm = () => (
    <Box component="form" onSubmit={handleCompleteTask} sx={{ mt: 2 }}>
      <Alert severity="info" sx={{ mb: 2 }}>
        Fill in the details below to mark this task as completed.
      </Alert>
      
      <Stack spacing={2}>
        <TextField
          required
          fullWidth
          multiline
          rows={4}
          label="Completion Notes"
          name="completion_note"
          value={completionData.completion_note}
          onChange={handleCompletionChange}
          placeholder="Describe how you completed this task..."
        />
        
        <TextField
          required
          fullWidth
          type="number"
          label="Hours Spent"
          name="hours_spent"
          value={completionData.hours_spent}
          onChange={handleCompletionChange}
          helperText="The number of hours you spent on this task"
          inputProps={{ step: 0.5, min: 0 }}
        />
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} sx={{ mr: 1 }}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="success"
            disabled={!completionData.completion_note || completionData.hours_spent <= 0}
          >
            Mark as Completed
          </Button>
        </Box>
      </Stack>
    </Box>
  );
  
  // Form for instructor to review a completed task
  const renderTaskReviewForm = () => (
    <Box component="form" onSubmit={handleReviewTask} sx={{ mt: 2 }}>
      <Alert severity="info" sx={{ mb: 2 }}>
        Evaluate the submitted task and provide feedback.
      </Alert>
      
      {task && task.completion && (
        <Box sx={{ mb: 2, p: 2, border: '1px dashed grey', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>TA Submission Details:</Typography>
          <TextField
            label="Completion Note"
            fullWidth
            multiline
            rows={3}
            value={task.completion.completion_note || 'No note provided.'}
            InputProps={{ readOnly: true }}
            variant="outlined"
            sx={{ mb: 1 }}
          />
          <TextField
            label="Reported Hours Spent"
            fullWidth
            type="number"
            value={task.completion.hours_spent || 0}
            InputProps={{ readOnly: true }}
            variant="outlined"
          />
        </Box>
      )}
      
      <Stack spacing={2}>
        {/* Removing the switch and replacing with hidden state field */}
        <input type="hidden" name="is_approved" value={reviewData.is_approved.toString()} />
        
        <TextField
          required
          fullWidth
          multiline
          rows={4}
          label="Feedback"
          name="feedback"
          value={reviewData.feedback}
          onChange={handleReviewChange}
          placeholder="Provide feedback for the TA..."
        />
        
        {task?.credit_hours && (
          <Alert severity="info">
            Upon approval, the TA will receive {task.credit_hours} credit hours.
          </Alert>
        )}
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={onCancel}>
            Cancel
          </Button>
          
          <Box>
            <Button 
              variant="contained" 
              color="error"
              sx={{ mr: 1 }}
              disabled={!reviewData.feedback}
              onClick={(e) => {
                // Set to false (reject) and submit
                setReviewData({...reviewData, is_approved: false});
                // Wait for state update and then submit
                setTimeout(() => handleReviewTask(e), 0);
              }}
            >
              Reject
            </Button>
            
            <Button 
              variant="contained" 
              color="success"
              disabled={!reviewData.feedback}
              onClick={(e) => {
                // Set to true (approve) and submit
                setReviewData({...reviewData, is_approved: true});
                // Wait for state update and then submit
                setTimeout(() => handleReviewTask(e), 0);
              }}
            >
              Approve
            </Button>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
  
  // Determine which form to render based on context
  if (userRole === 'TA' && task?.status === 'IN_PROGRESS' && onComplete) {
    return renderTaskCompletionForm();
  } else if (userRole === 'INSTRUCTOR' && task?.status === 'WAITING_FOR_APPROVAL' && onReview) {
    return renderTaskReviewForm();
  } else {
    return renderTaskUpdateForm();
  }
};

export default TaskForm; 