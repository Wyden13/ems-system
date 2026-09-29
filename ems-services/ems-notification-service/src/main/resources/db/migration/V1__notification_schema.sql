CREATE TABLE notifications (id BIGSERIAL PRIMARY KEY,employee_id BIGINT NOT NULL,type VARCHAR(40) NOT NULL,title VARCHAR(200) NOT NULL,body VARCHAR(4000) NOT NULL,read_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL);
CREATE INDEX idx_notification_employee_created ON notifications(employee_id,created_at);
