# Dark Theme System Guide

This guide explains how to use the centralized dark theme system for the Interactor application.

## Overview

The dark theme system uses a combination of:
1. **CSS Variables** - For consistent color values
2. **Tailwind CSS Custom Classes** - For reusable component styles
3. **Utility Classes** - For common patterns

## CSS Variables

All dark theme colors are defined as CSS variables in `src/index.css`:

```css
:root {
  --dark-bg: #111827;           /* Main background */
  --dark-surface: #1f2937;      /* Card/component backgrounds */
  --dark-surface-light: #374151; /* Lighter surfaces */
  --dark-border: #4b5563;       /* Borders */
  --dark-border-light: #6b7280; /* Lighter borders */
  --dark-text: #ffffff;         /* Primary text */
  --dark-text-secondary: #d1d5db; /* Secondary text */
  --dark-text-muted: #9ca3af;   /* Muted text */
  --dark-accent: #3b82f6;       /* Blue accent */
  --dark-accent-hover: #2563eb; /* Blue accent hover */
  --dark-success: #10b981;      /* Green */
  --dark-warning: #f59e0b;      /* Amber */
  --dark-error: #ef4444;        /* Red */
}
```

## Available Classes

### Layout Classes

```css
.dark-app          /* Main application container */
.dark-header       /* Header/top bar */
.dark-content      /* Main content area */
```

### Card and Panel Classes

```css
.dark-card         /* Standard card with border and shadow */
.dark-card-hover   /* Card with hover effects */
.dark-panel        /* Panel/header sections */
```

### Text Classes

```css
.dark-text-primary     /* Primary text (white) */
.dark-text-secondary   /* Secondary text (light gray) */
.dark-text-muted       /* Muted text (darker gray) */
```

### Button Classes

```css
.dark-btn-primary      /* Primary button (blue) */
.dark-btn-secondary    /* Secondary button (gray) */
.dark-btn-success      /* Success button (green) */
.dark-btn-warning      /* Warning button (amber) */
.dark-btn-error        /* Error button (red) */
```

### Form Elements

```css
.dark-input            /* Input fields */
.dark-select           /* Select dropdowns */
```

### Navigation

```css
.dark-nav-item         /* Navigation item (inactive) */
.dark-nav-item-active  /* Navigation item (active) */
```

### Status Indicators

```css
.dark-status-online    /* Online status badge */
.dark-status-offline   /* Offline status badge */
```

### Log Levels

```css
.dark-log-error        /* Error log level */
.dark-log-warning      /* Warning log level */
.dark-log-info         /* Info log level */
.dark-log-debug        /* Debug log level */
```

### Module Badges

```css
.dark-badge-documentation  /* Documentation badge */
.dark-badge-wiki          /* Wiki badge */
```

## Usage Examples

### Basic Layout

```tsx
function MyComponent() {
  return (
    <div className="dark-app">
      <header className="dark-header">
        <h1 className="dark-text-primary">My App</h1>
      </header>
      <main className="dark-content">
        <div className="dark-card">
          <p className="dark-text-secondary">Content here</p>
        </div>
      </main>
    </div>
  );
}
```

### Cards with Content

```tsx
function CardExample() {
  return (
    <div className="dark-card dark-card-hover p-6">
      <h2 className="dark-text-primary text-xl font-bold mb-4">Card Title</h2>
      <p className="dark-text-secondary mb-4">Card description</p>
      <div className="flex space-x-2">
        <button className="dark-btn-primary px-4 py-2">Primary Action</button>
        <button className="dark-btn-secondary px-4 py-2">Secondary Action</button>
      </div>
    </div>
  );
}
```

### Form Elements

```tsx
function FormExample() {
  return (
    <form className="space-y-4">
      <div>
        <label className="dark-text-secondary text-sm font-medium">Name</label>
        <input 
          type="text" 
          className="dark-input w-full px-3 py-2 rounded-lg"
          placeholder="Enter your name"
        />
      </div>
      <div>
        <label className="dark-text-secondary text-sm font-medium">Category</label>
        <select className="dark-select w-full px-3 py-2 rounded-lg">
          <option>Select category</option>
          <option>Option 1</option>
          <option>Option 2</option>
        </select>
      </div>
    </form>
  );
}
```

### Navigation

```tsx
function NavigationExample() {
  const [activeTab, setActiveTab] = useState('home');
  
  return (
    <nav className="flex space-x-2">
      <button 
        className={`px-4 py-2 rounded-lg ${
          activeTab === 'home' ? 'dark-nav-item-active' : 'dark-nav-item'
        }`}
        onClick={() => setActiveTab('home')}
      >
        Home
      </button>
      <button 
        className={`px-4 py-2 rounded-lg ${
          activeTab === 'about' ? 'dark-nav-item-active' : 'dark-nav-item'
        }`}
        onClick={() => setActiveTab('about')}
      >
        About
      </button>
    </nav>
  );
}
```

### Log Entries

```tsx
function LogEntry({ level, message, timestamp }) {
  const getLogClass = (level) => {
    switch (level) {
      case 'error': return 'dark-log-error';
      case 'warn': return 'dark-log-warning';
      case 'info': return 'dark-log-info';
      default: return 'dark-log-debug';
    }
  };

  return (
    <div className="dark-card dark-card-hover p-4">
      <div className="flex items-center space-x-4">
        <span className="text-sm font-mono dark-text-muted">{timestamp}</span>
        <span className={`px-2 py-1 rounded-full text-sm font-bold ${getLogClass(level)}`}>
          {level.toUpperCase()}
        </span>
        <span className="dark-text-secondary flex-1">{message}</span>
      </div>
    </div>
  );
}
```

## Benefits

1. **Consistency** - All components use the same color palette
2. **Maintainability** - Change colors in one place
3. **Reusability** - Classes can be used across components
4. **Semantic** - Class names describe their purpose
5. **Performance** - CSS variables are efficient

## Migration Guide

To migrate existing components:

1. Replace hardcoded colors with appropriate classes:
   ```tsx
   // Before
   className="bg-gray-800 text-white border border-gray-600"
   
   // After
   className="dark-card"
   ```

2. Replace text colors:
   ```tsx
   // Before
   className="text-white"
   
   // After
   className="dark-text-primary"
   ```

3. Replace button styles:
   ```tsx
   // Before
   className="bg-blue-500 text-white hover:bg-blue-600"
   
   // After
   className="dark-btn-primary"
   ```

## Customization

To customize the theme:

1. **Change Colors**: Modify CSS variables in `src/index.css`
2. **Add New Classes**: Add to the `@layer components` section
3. **Extend Tailwind**: Add to `tailwind.config.js` if needed

## Best Practices

1. **Use Semantic Classes**: Choose classes that describe purpose, not appearance
2. **Combine with Tailwind**: Use utility classes for spacing, layout, etc.
3. **Keep Consistent**: Use the same classes for similar elements
4. **Test Accessibility**: Ensure sufficient contrast ratios
5. **Document Changes**: Update this guide when adding new classes 