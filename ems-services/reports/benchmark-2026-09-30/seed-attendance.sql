-- Synthetic benchmark data only: 50 employees, 14 completed eight-hour entries each.
INSERT INTO time_entries(employee_id,clock_in,clock_out,source,status,worked_minutes,worked_seconds)
SELECT employee_id, timestamptz '2026-09-25 15:00:00+00' + day * interval '1 day',
 timestamptz '2026-09-25 23:00:00+00' + day * interval '1 day', 'MANUAL','APPROVED',480,28800
FROM generate_series(1,50) employee_id CROSS JOIN generate_series(0,13) day;
