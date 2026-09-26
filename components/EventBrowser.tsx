'use client'

import { useState } from 'react'
import {
  CampusEvent,
  EVENT_CATEGORIES,
  EventCategory,
  EventSort,
  filterEventsByCategory,
  searchEventsByName,
  sortEvents,
} from '@/data/events'
import EventCard from './EventCard'
import EmptyState from './EmptyState'

const CATEGORIES: (EventCategory | 'All')[] = ['All', ...EVENT_CATEGORIES]

const controlStyle = {
  padding: '10px 14px',
  border: '1.5px solid var(--line)',
  borderRadius: 'var(--radius)',
  fontSize: 14.5,
  background: 'var(--paper-raised)',
}

/** Search, category filter and sort over the events the server sent down. */
export default function EventBrowser({ events }: { events: CampusEvent[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<EventCategory | 'All'>('All')
  const [sort, setSort] = useState<EventSort>('date')

  const visible = sortEvents(
    filterEventsByCategory(searchEventsByName(events, query), category),
    sort,
  )
  const filtering = query.trim() !== '' || category !== 'All'

  function clearFilters() {
    setQuery('')
    setCategory('All')
  }

  return (
    <>
      <div
        style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}
      >
        <input
          type="search"
          aria-label="Search events by name"
          placeholder="Search events by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ ...controlStyle, flex: '1 1 240px' }}
        />
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(e) => setCategory(e.target.value as EventCategory | 'All')}
          style={controlStyle}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === 'All' ? 'All categories' : c}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort events"
          value={sort}
          onChange={(e) => setSort(e.target.value as EventSort)}
          style={controlStyle}
        >
          <option value="date">Soonest first</option>
          <option value="popularity">Most popular</option>
        </select>
      </div>

      <p style={{ fontSize: 13.5, marginBottom: 20 }} aria-live="polite">
        {filtering
          ? `${visible.length} of ${events.length} upcoming events match`
          : `${events.length} upcoming events`}
      </p>

      {visible.length === 0 ? (
        <EmptyState
          title={filtering ? 'No events match' : 'Nothing on the board yet'}
          description={
            filtering
              ? 'Try a shorter search or a different category.'
              : 'There are no upcoming events right now. Check back soon.'
          }
          action={
            filtering ? (
              <button className="btn btn-secondary" onClick={clearFilters}>
                Clear search and filter
              </button>
            ) : undefined
          }
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {visible.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </>
  )
}
