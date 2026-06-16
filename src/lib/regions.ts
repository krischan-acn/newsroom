export interface SubRegion {
  name: string
  countries: string[]
}

export interface RegionGroup {
  continent: string
  subRegions: SubRegion[]
}

export const REGIONS: RegionGroup[] = [
  {
    continent: 'Asia',
    subRegions: [
      { name: 'Greater China', countries: ['China', 'Hong Kong', 'Taiwan'] },
      { name: 'East Asia', countries: ['Japan', 'Korea'] },
      { name: 'South Asia', countries: ['India'] },
      { name: 'Southeast Asia', countries: ['Indonesia', 'Malaysia', 'Philippines', 'Singapore', 'Thailand', 'Vietnam'] },
    ]
  },
  {
    continent: 'Greater Asia',
    subRegions: [
      { name: 'Australasia', countries: ['Australia', 'New Zealand'] }
    ]
  },
  {
    continent: 'Middle East',
    subRegions: [
      { name: 'UAE', countries: ['Abu Dhabi', 'Bahrain', 'Dubai'] },
      { name: 'MENA', countries: ['Egypt', 'Israel', 'Jordan', 'Lebanon'] }
    ]
  },
  {
    continent: 'Africa',
    subRegions: [
      { name: 'Northern Africa', countries: ['Algeria', 'Jordan'] },
      { name: 'Central Africa', countries: ['Nigeria', 'Kenya'] },
      { name: 'Southern Africa', countries: ['South Africa'] }
    ]
  },
  {
    continent: 'Europe',
    subRegions: [
      { name: 'Western Europe', countries: ['France', 'Germany', 'Italy', 'Spain', 'UK'] },
      { name: 'Central Europe', countries: ['Slovakia'] },
      { name: 'Eastern Europe', countries: ['Estonia', 'Lithuania'] }
    ]
  },
  {
    continent: 'Americas',
    subRegions: [
      { name: 'North America', countries: ['Canada', 'United States', 'Bahamas'] },
      { name: 'Central America', countries: ['Mexico', 'Belize', 'Panama'] },
      { name: 'South America', countries: ['Argentina', 'Brazil', 'Colombia'] }
    ]
  }
]
