# Freshness window

PR #7 defines the stale threshold as three missed source intervals. A 60-minute watch becomes stale after roughly three hours without a successful sync; a 24-hour watch becomes stale after roughly three days. This scales freshness expectations with the user's chosen cadence.
