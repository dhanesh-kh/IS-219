# DC Crime Data Visualization

## Essential Question
"How do crime patterns in Washington DC vary across different neighborhoods and time periods, and what insights can we gain about public safety trends when correlated with demographic factors?"

## Project Overview
This interactive data visualization project explores the relationship between crime patterns and demographic characteristics in Washington DC. By integrating crime incident data with census demographic information, the project provides comprehensive visualizations that reveal patterns, trends, and correlations between crime occurrences and socioeconomic factors across the city.

## Data Sources

### 1. DC Metropolitan Police Department Crime Data (2024)
- **Source**: [DC Open Data Portal - Crime Incidents](https://catalog.data.gov/dataset/crime-incidents-in-2024)
- **Format**: CSV
- **Key Fields**:
  - Crime type (HOMICIDE, ROBBERY, ASSAULT W/DANGEROUS WEAPON, etc.)
  - Location (latitude/longitude, block-level address)
  - Date and time
  - Neighborhood clusters (Districts 1-25)
  - Police district and PSA (Police Service Area)

### 2. Washington DC Census Demographics
- **Source**: [Census Reporter - Washington DC Profile](https://censusreporter.org/profiles/16000US1150000-washington-dc/)
- **Key Demographics**:
  - Higher education rate: 65.9% (Bachelor's degree or higher)
  - Poverty rate: 14.0% (Population below poverty line)
  - Median housing value: $715,500
  - Diversity index: 68.5%
  - Income distribution by neighborhood
  - Educational attainment by area

## Current Visualizations

### 1. Heat Map
- Interactive geographical heat map showing crime concentration
- Risk score calculations by area with intensity-based coloring
- Color-coded crime type markers for individual incidents
- Detailed tooltips with incident information
- Togglable census demographic overlays
- Cluster analysis identifying high-risk areas

### 2. Temporal Analysis
This visualization includes three interactive views:

#### Daily Trends
- Line chart showing crime incidents over time
- 7-day moving average trend line
- Daily crime count statistics
- Peak day identification
- Total incidents counter

#### Time Patterns
- Bar chart showing crime distribution by time of day
- Time block analysis (4-hour segments)
- Shift-based patterns (Day, Evening, Midnight)
- Risk weighting by time period
- Percentage distribution calculations

#### Demographic Shifts
- Multi-line chart correlating demographic factors with crime rates over time
- Tracks changes in income, education, poverty, and diversity metrics
- Shows how demographic shifts correlate with crime fluctuations
- Quarterly sampling points with detailed tooltips

### 3. Area & Crime Analysis
This section combines two visualization modes:

#### Area Distribution
- Stacked bar chart showing crime distribution by neighborhood
- Color-coded by crime type
- Top areas identification
- Percentage analysis by district
- Correlation with census demographic data

#### Crime Breakdown
- Bar chart showing distribution of crime types
- Severity weighting calculations
- Percentage analysis of each crime category
- Filtering capabilities by crime type

## Key Statistics & Calculations Explained

### Crime Distribution Statistics

#### Risk Score
- **Calculation**: Combines crime count, severity weight, and population density
- **Formula**: `(crimeCount * severityWeight) / areaSqKm`
- **Purpose**: Identifies areas with highest risk-weighted crime concentration
- **Displayed**: In the Heat Map as intensity colors and in Area Distribution statistics

#### Crime Type Percentage
- **Calculation**: `(specificCrimeTypeCount / totalCrimes) * 100`
- **Purpose**: Shows which crime types are most prevalent
- **Displayed**: In Crime Breakdown charts and tooltips

#### Top 5 Neighborhoods Percentage
- **Calculation**: `(sumOfTop5NeighborhoodCrimes / totalCrimes) * 100`
- **Purpose**: Measures concentration of crime in hotspot areas
- **Displayed**: In Area Distribution insights

### Temporal Pattern Statistics

#### Daily Average
- **Calculation**: `totalCrimes / numberOfDays`
- **Purpose**: Shows average daily crime rate
- **Displayed**: In Daily Trends as a summary statistic

#### Peak Time Range
- **Calculation**: Time block with highest crime count
- **Formula**: `max(crimeCountByTimeBlock)`
- **Purpose**: Identifies when most crimes occur
- **Displayed**: In Time Patterns section

#### Night Violent Crime Percentage
- **Calculation**: `(violentCrimesBetween8PMand6AM / totalViolentCrimes) * 100`
- **Purpose**: Shows proportion of violent crimes occurring at night
- **Displayed**: In Time Patterns insights

#### Weekend Difference
- **Calculation**: `(weekendCrimeRate / weekdayCrimeRate) - 1) * 100`
- **Purpose**: Compares weekend vs. weekday crime rates (positive = higher on weekends)
- **Displayed**: In Temporal Analysis insights

### Demographic Correlations

#### Income Correlation
- **Calculation**: Statistical correlation between neighborhood median income and crime rates
- **Scale**: -1 to 1, where negative values show inverse relationship
- **Insight**: Areas with median household income below $85,000 show 2.3x higher violent crime rates compared to areas with income above $125,000
- **Displayed**: In demographic correlation cards

#### Education Impact
- **Calculation**: Statistical correlation between higher education rates and violent crime
- **Insight**: Neighborhoods with higher education rates (75%+ with Bachelor's degrees) experience 40% fewer violent crimes
- **Displayed**: In demographic correlation cards

#### Property Crime Percentage
- **Calculation**: `(propertyRelatedCrimes / totalCrimes) * 100`
- **Purpose**: Shows what proportion of crimes are property-related vs. violent
- **Displayed**: In Area & Crime Analysis insights

#### Poverty Impact
- **Calculation**: Statistical correlation between poverty rates and violent crime
- **Insight**: High poverty areas (>17%) experience 2.8x more violent crime than areas with poverty rates below 7%
- **Displayed**: In demographic correlation section

## Technical Implementation

### Built With
- React 17 (Frontend framework)
- Vite 4.5 (Build tool)
- TailwindCSS 3.4 (Styling)
- Recharts 2.12 (Chart components)
- Leaflet 1.9 with react-leaflet 3.2 (Mapping)
- Date-fns 3.3 (Date handling)
- HeadlessUI 1.7 (UI components)

### Key Features
- Real-time data filtering (date range, crime type, shifts)
- Interactive visualizations with hover effects and tooltips
- Cross-dataset analysis between crime and census data
- Dynamic insights generation based on filtered data
- Toggle views within visualization tabs

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
│   │   ├── shared/                # Reusable components
│   │   │   ├── ChartCard.jsx      # Wrapper for chart components
│   │   │   ├── CensusControls.jsx # Demographics overlay controls
│   │   │   ├── ErrorBoundary.jsx  # Error handling component
│   │   │   └── LoadingSpinner.jsx # Loading state component
│   │   ├── CrimeTypeChart.jsx     # Crime category visualization
│   │   ├── Dashboard.jsx          # Main container component
│   │   ├── HeatMap.jsx            # Geographic visualization
│   │   ├── MainContentTabs.jsx    # Tab navigation controller
│   │   ├── NeighborhoodAnalysis.jsx # Area & crime-based analysis
│   │   └── TemporalAnalysis.jsx   # Time-based patterns
│   ├── utils/
│   │   ├── CrimeDataContext.jsx   # Data context provider
│   │   ├── dataProcessing.js      # Crime data transformation
│   │   ├── censusDataProcessing.js # Census data handling
│   │   └── useChartData.js        # Chart data hook
│   ├── styles/
│   │   └── main.css               # Global styles and Tailwind
│   ├── App.jsx                    # Root application component
│   └── main.jsx                   # Application entry point
├── public/                        # Static assets
│   ├── Crime Incidents in 2024.csv # Main crime dataset
│   └── dc_*.csv                   # Census demographic files
├── index.html                     # HTML entry point
├── package.json                   # Dependencies and scripts
├── postcss.config.js              # PostCSS configuration
├── tailwind.config.js             # Tailwind CSS configuration
└── vite.config.js                 # Vite build configuration
```

## Implementation Notes

### Data Processing Flow
1. Raw CSV data is loaded via fetch API
2. Data is processed through the CrimeDataContext provider
3. Specialized hooks and utility functions transform raw data into visualization-ready formats
4. Components receive filtered data based on user selections
5. Statistics and insights are dynamically calculated based on the current data view

### Statistical Calculations
Statistical formulas used throughout the application are based on standard statistical methods:
- Correlations use Pearson's correlation coefficient
- Risk scores use weighted severity calculations
- Time patterns use frequency distribution analysis
- Demographic correlations use multivariate analysis techniques
