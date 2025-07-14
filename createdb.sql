-- Create polls table with UUID id
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  dates TEXT[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create votes table with UUID poll_id
CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  voter TEXT NOT NULL,
  selected_dates TEXT[] NOT NULL
);
-- Table for count for each date in a poll
SELECT
  p.title AS poll_title,
  unnest(v.selected_dates) AS date,
  COUNT(*) AS vote_count
FROM votes v
JOIN polls p ON v.poll_id = p.id
WHERE v.poll_id = $1
GROUP BY p.title, date
ORDER BY vote_count DESC;
