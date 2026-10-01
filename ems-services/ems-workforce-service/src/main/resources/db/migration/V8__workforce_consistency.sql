CREATE TABLE workforce_lock (id INTEGER PRIMARY KEY CHECK (id=1));
INSERT INTO workforce_lock VALUES (1);
DROP TABLE scheduling_lock;
DROP TABLE leave_lock;
ALTER TABLE leave_holds ADD CONSTRAINT fk_leave_hold_request FOREIGN KEY(request_id) REFERENCES pto_requests(id);
ALTER TABLE shifts ALTER COLUMN department_id SET NOT NULL;
