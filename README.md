# DC Crime Data Visualization

## Essential Question
"How do crime patterns in Washington DC vary across different neighborhoods and time periods, and what insights can we gain about public safety trends when correlated with demographic factors?"

## Project Overview
This interactive data visualization project explores the relationship between crime patterns and demographic characteristics in Washington DC. By combining crime incident data with demographic information, the project aims to uncover meaningful insights about public safety trends and their potential correlations with socioeconomic factors.

## Data Sources

### 1. DC Metropolitan Police Department Crime Data (2024)
- **Source**: [DC Open Data Portal - Crime Incidents](https://catalog.data.gov/dataset/crime-incidents-in-2024)
- **Format**: CSV
- **Key Fields**:
  - Crime type and method
  - Location (latitude/longitude)
  - Date and time
  - Neighborhood clusters
  - Police district and PSA

### 2. Washington DC Census Demographics (Planned Implementation)
- **Source**: [Census Reporter - Washington DC Profile](https://censusreporter.org/profiles/16000US1150000-washington-dc/)
- **Key Demographics**:
  - Population: 678,972
  - Median age: 34.9
  - Median household income: $108,210
  - Educational attainment
  - Housing characteristics
  - Language and place of birth
- **Status**: Integration planned
- **Purpose**: Correlation analysis with crime patterns

## Current Visualizations

### 1. Crime Distribution Map
- Interactive heat map showing crime concentration
- Risk score calculations by area
- Color-coded crime type markers
- Detailed tooltips with incident information

### 2. Temporal Analysis
- Daily crime trend charts
- Time-of-day pattern analysis
- Peak activity period identification

### 3. Neighborhood Analysis
- Crime distribution by cluster
- Top 5 neighborhood comparisons
- Crime type breakdown by area
- Risk level indicators

### 4. Crime Type Distribution
- Interactive stacked bar charts
- Crime severity weighting
- Category-based filtering
- Percentage breakdowns

## Planned Visualizations (Phase 2)

### 1. Demographic Correlation Analysis
- Crime rates vs. median income
- Educational attainment impact
- Housing characteristics correlation
- Population density effects

### 2. Socioeconomic Impact Study
- Multi-factor analysis charts
- Income-crime relationship scatter plots
- Educational attainment heat maps
- Housing value impact analysis

## Technical Implementation

### Built With
- React (Frontend framework)
- Vite (Build tool)
- TailwindCSS (Styling)
- Recharts (Chart components)
- Leaflet (Mapping)
- Date-fns (Date handling)

### Key Features
- Real-time data filtering
- Interactive visualizations
- Responsive design
- Cross-dataset analysis (planned)
- Dynamic insights generation

## Local Development

### Prerequisites
- Node.js (v14 or higher)
- npm
- Git

### Installation
```bash
# Clone repository
git clone https://github.com/dhanesh-kh/IS-219.git
cd IS-219

# Clean install (if you've previously installed)
rm -rf node_modules package-lock.json

# Install dependencies (using legacy peer deps due to React version requirements)
npm install --legacy-peer-deps

# Start development server
npm run dev

```

> **Note**: We use `--legacy-peer-deps` flag during installation due to peer dependency requirements of the react-leaflet-heatmap-layer-v3 package, which requires React 17. If you encounter any issues, try removing the node_modules directory and package-lock.json file before reinstalling.

## Project Structure
```
dc-crime-visualization/
├── src/
│   ├── components/
│   │   ├── shared/              # Reusable components
│   │   │   ├── ChartCard.jsx    # Wrapper for chart components
│   │   │   ├── ErrorBoundary.jsx# Error handling component
│   │   │   └── LoadingSpinner.jsx# Loading state component
│   │   ├── CrimeTypeChart.jsx   # Crime category visualization
│   │   ├── Dashboard.jsx        # Main container component
│   │   ├── Filters.jsx         # Data filtering interface
│   │   ├── HeatMap.jsx         # Geographic visualization
│   │   ├── NeighborhoodAnalysis.jsx # Area-based analysis
│   │   └── TemporalAnalysis.jsx # Time-based patterns
│   ├── utils/
│   │   ├── CrimeDataContext.jsx # Data context provider
│   │   ├── dataProcessing.js    # Data transformation logic
│   │   └── useChartData.js     # Chart data hook
│   ├── styles/
│   │   └── main.css            # Global styles and Tailwind
│   ├── App.jsx                 # Root application component
│   └── main.jsx               # Application entry point
├── public/                    # Static assets
│   └── Crime Incidents in 2024.csv # Crime dataset
├── index.html                # HTML entry point
├── package.json              # Dependencies and scripts
├── postcss.config.js         # PostCSS configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── vite.config.js           # Vite build configuration
```
