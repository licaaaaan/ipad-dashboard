export interface OAuthToken {
  access_token: string
  refresh_token: string
  expires_at: number  // Unix timestamp in ms
}

export interface AppleCredentials {
  email: string
  app_password: string
}

export interface WeatherData {
  temp: number
  feels_like: number
  condition: string
  icon: string
  city: string
  forecast: Array<{ date: string; icon: string; high: number; low: number }>
}

export interface CalendarEvent {
  id: string
  title: string
  start: string   // ISO 8601
  end: string
  allDay: boolean
  calendarName?: string
}

export interface NowPlaying {
  isPlaying: boolean
  trackName: string
  artistName: string
  albumName: string
  albumArtUrl: string
  progressMs: number
  durationMs: number
}
