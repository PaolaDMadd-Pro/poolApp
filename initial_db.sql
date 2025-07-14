INSERT INTO polls (title, description, dates)
VALUES (
  
  'date pool, for second meeting',
  'Professional Advancement Circle montly meeting',
  ARRAY[
    '2025-07-22T13:30',
    '2025-07-23T13:30',
    '2025-07-24T13:30',
    '2025-07-25T13:30'
  ]::text[]
);
INSERT INTO votes (poll_id, voter, selected_dates)
VALUES (
  '392e8ee4-aebb-4ded-ad44-631e5bbfd54c',
  'paola',
  ARRAY[
    '2025-07-22T12:30',
    '2025-07-23T12:30',
    '2025-07-24T12:30',
    '2025-07-25T12:30'
  ]::text[]
);

SELECT
  unnest(selected_dates) AS date,
  COUNT(*) AS vote_count
FROM votes
WHERE poll_id = '392e8ee4-aebb-4ded-ad44-631e5bbfd54c'
GROUP BY date
ORDER BY vote_count DESC;
