import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes — cached data shown while offline
      gcTime: 1000 * 60 * 30, // 30 minutes — keep cache for offline resilience
      retry: 2, // retry 2 times before showing error
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // 1s, 2s, 4s... max 30s
      refetchOnWindowFocus: false, // mobile: no window focus events
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
)
