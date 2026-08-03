CREATE TYPE priority_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE status_enum AS ENUM ('PENDING', 'COMPLETED');

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(100) NOT NULL,
    task_name TEXT NOT NULL,
    priority priority_enum NOT NULL,
    status status_enum NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: In a real app, RLS policies would be added here.
