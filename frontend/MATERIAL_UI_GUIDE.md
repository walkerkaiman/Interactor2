# Material-UI Migration Guide

This guide explains the migration from Tailwind CSS to Material-UI (MUI) and how to use the new design system.

## 🎨 **What Changed**

### **Removed:**
- ❌ Tailwind CSS
- ❌ Custom dark theme classes
- ❌ Complex CSS variables
- ❌ Manual styling

### **Added:**
- ✅ Material-UI (MUI) components
- ✅ Professional design system
- ✅ Consistent theming
- ✅ Built-in accessibility
- ✅ TypeScript support

## 📦 **Installed Packages**

```bash
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material @mui/x-data-grid
```

## 🎯 **Key Benefits**

1. **Professional Design** - Google's Material Design
2. **Consistency** - All components follow the same design language
3. **Accessibility** - Built-in ARIA support and keyboard navigation
4. **TypeScript** - Full type safety
5. **Theming** - Easy customization
6. **Performance** - Optimized components

## 🎨 **Theme Configuration**

The app uses a custom dark theme defined in `src/App.tsx`:

```tsx
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2',    // Blue
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#9c27b0',    // Purple
      light: '#ba68c8',
      dark: '#7b1fa2',
    },
    background: {
      default: '#121212', // Dark background
      paper: '#1e1e1e',   // Card background
    },
    text: {
      primary: '#ffffff',   // White text
      secondary: '#b3b3b3', // Gray text
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});
```

## 🧩 **Available Components**

### **Layout Components**
```tsx
import { Box, Container, Grid, Paper } from '@mui/material';

// Box - Flexible container
<Box sx={{ display: 'flex', gap: 2, p: 2 }}>

// Container - Responsive wrapper
<Container maxWidth="lg">

// Grid - Responsive grid system
<Grid container spacing={2}>
  <Grid item xs={12} md={6}>

// Paper - Elevated surface
<Paper elevation={2} sx={{ p: 2 }}>
```

### **Navigation Components**
```tsx
import { AppBar, Toolbar, Button, Tabs, Tab } from '@mui/material';

// AppBar - Top navigation
<AppBar position="static">
  <Toolbar>
    <Button variant="contained">Action</Button>
  </Toolbar>
</AppBar>

// Tabs - Tab navigation
<Tabs value={activeTab} onChange={handleChange}>
  <Tab label="Tab 1" />
  <Tab label="Tab 2" />
</Tabs>
```

### **Form Components**
```tsx
import { TextField, Select, MenuItem, Checkbox, Switch } from '@mui/material';

// Text input
<TextField 
  label="Name" 
  variant="outlined" 
  fullWidth 
/>

// Select dropdown
<Select value={value} onChange={handleChange}>
  <MenuItem value="option1">Option 1</MenuItem>
  <MenuItem value="option2">Option 2</MenuItem>
</Select>

// Checkbox
<Checkbox checked={checked} onChange={handleChange} />

// Switch
<Switch checked={checked} onChange={handleChange} />
```

### **Data Display**
```tsx
import { Card, CardContent, Typography, Chip, Avatar } from '@mui/material';

// Card
<Card>
  <CardContent>
    <Typography variant="h5">Title</Typography>
    <Typography variant="body2">Content</Typography>
  </CardContent>
</Card>

// Chip
<Chip label="Label" color="primary" />

// Avatar
<Avatar>U</Avatar>
```

### **Feedback Components**
```tsx
import { Button, IconButton, Fab, Alert, Snackbar } from '@mui/material';

// Button variants
<Button variant="contained" color="primary">Primary</Button>
<Button variant="outlined" color="secondary">Secondary</Button>
<Button variant="text">Text</Button>

// Icon button
<IconButton>
  <DeleteIcon />
</IconButton>

// Alert
<Alert severity="success">Success message</Alert>

// Snackbar
<Snackbar open={open} message="Message" />
```

## 🎨 **Styling with MUI**

### **Using `sx` Prop (Recommended)**
```tsx
<Box sx={{ 
  display: 'flex',
  gap: 2,
  p: 2,
  bgcolor: 'background.paper',
  borderRadius: 1
}}>
```

### **Using Theme Values**
```tsx
<Box sx={{ 
  color: 'text.primary',
  bgcolor: 'background.default',
  border: 1,
  borderColor: 'divider'
}}>
```

### **Responsive Design**
```tsx
<Box sx={{ 
  width: { xs: '100%', md: '50%' },
  p: { xs: 1, sm: 2, md: 3 }
}}>
```

### **Custom Styles**
```tsx
<Button sx={{
  borderRadius: 2,
  textTransform: 'none',
  fontWeight: 'bold',
  '&:hover': {
    transform: 'scale(1.05)',
  }
}}>
```

## 🔄 **Migration Examples**

### **Before (Tailwind)**
```tsx
<div className="flex items-center space-x-4 p-6 bg-gray-800 text-white rounded-lg">
  <h1 className="text-2xl font-bold">Title</h1>
  <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded">
    Action
  </button>
</div>
```

### **After (Material-UI)**
```tsx
<Box sx={{ 
  display: 'flex', 
  alignItems: 'center', 
  gap: 2, 
  p: 3, 
  bgcolor: 'background.paper',
  borderRadius: 2
}}>
  <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
    Title
  </Typography>
  <Button variant="contained" color="primary">
    Action
  </Button>
</Box>
```

## 🎯 **Best Practices**

### **1. Use Semantic Components**
```tsx
// Good
<Typography variant="h5" component="h1">Title</Typography>
<Button variant="contained" color="primary">Action</Button>

// Avoid
<div style={{ fontSize: '24px', fontWeight: 'bold' }}>Title</div>
<button style={{ background: 'blue' }}>Action</button>
```

### **2. Leverage Theme Colors**
```tsx
// Good
<Box sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>

// Avoid
<Box sx={{ bgcolor: '#1e1e1e', color: '#ffffff' }}>
```

### **3. Use Responsive Design**
```tsx
<Grid container spacing={2}>
  <Grid item xs={12} md={6} lg={4}>
    <Card>Content</Card>
  </Grid>
</Grid>
```

### **4. Consistent Spacing**
```tsx
// Use theme spacing
<Box sx={{ p: 2, m: 1, gap: 2 }}>

// Avoid hardcoded values
<Box sx={{ padding: '16px', margin: '8px' }}>
```

## 🚀 **Next Steps**

### **1. Update Remaining Components**
- Convert `WikiTab.tsx` to use Material-UI
- Convert `PerformanceDashboardTab.tsx` to use Material-UI
- Convert `NodeEditor.tsx` to use Material-UI

### **2. Add More Components**
```bash
# Install additional MUI packages
npm install @mui/x-charts @mui/x-date-pickers @mui/lab
```

### **3. Customize Theme**
- Add custom colors
- Modify component styles
- Create theme variants

### **4. Add Animations**
```tsx
import { Fade, Slide, Grow } from '@mui/material';

<Fade in={true}>
  <Box>Animated content</Box>
</Fade>
```

## 📚 **Resources**

- [Material-UI Documentation](https://mui.com/)
- [Material Design Guidelines](https://material.io/design)
- [MUI Theme Customization](https://mui.com/material-ui/customization/theming/)
- [MUI Component API](https://mui.com/material-ui/api/)

## 🎉 **Benefits Achieved**

✅ **Professional Design** - Consistent with Material Design  
✅ **Better UX** - Improved accessibility and interactions  
✅ **Easier Maintenance** - Centralized theming system  
✅ **Type Safety** - Full TypeScript support  
✅ **Performance** - Optimized component library  
✅ **Scalability** - Easy to extend and customize 