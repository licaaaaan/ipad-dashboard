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

export interface Task {
  id: string
  title: string
  due?: string  // ISO 8601 date, e.g. "2026-06-20T00:00:00.000Z"
  notes?: string
}

export interface TaskList {
  id: string
  title: string
  tasks: Task[]
}

export interface NewsItem {
  title: string
  link: string
  source: string
  pubDate: string  // RFC 2822 or ISO 8601
}

export interface BingPhoto {
  url: string
  title: string
}
