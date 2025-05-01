import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#003366', // Bilkent University Blue
      light: '#004d99',
      dark: '#002244',
    },
    secondary: {
      main: '#d32f2f', // Bilkent University Red
      light: '#ff6659',
      dark: '#9a0007',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      color: '#003366',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      color: '#003366',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      color: '#003366',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      color: '#003366',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      color: '#003366',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      color: '#003366',
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 400,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 400,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '8px 16px',
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },
});

export default theme; 