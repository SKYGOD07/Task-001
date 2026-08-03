"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Priority = "LOW" | "MEDIUM" | "HIGH";
type Status = "PENDING" | "COMPLETED";
type Filter = "ALL" | Status;

type Task = {
  id: string;
  employeeId: string;
  employeeName: string;
  taskName: string;
  priority: Priority;
  status: Status;
  createdAt: string;
};

type FormState = {
  employeeName: string;
  taskName: string;
  priority: Priority | "";
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH"];
const storageKey = "employee-task-tracker.tasks";

const initialForm: FormState = {
  employeeName: "",
  taskName: "",
  priority: "",
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isPriority(value: string): value is Priority {
  return priorities.includes(value as Priority);
}

function validateForm(form: FormState) {
  const errors: FormErrors = {};
  const employeeName = normalizeText(form.employeeName);
  const taskName = normalizeText(form.taskName);

  if (!employeeName) {
    errors.employeeName = "Employee name is required.";
  }

  if (!taskName) {
    errors.taskName = "Task name is required.";
  }

  if (!form.priority || !isPriority(form.priority)) {
    errors.priority = "Select a valid priority.";
  }

  return {
    errors,
    values: {
      employeeName,
      taskName,
      priority: form.priority,
    },
  };
}

function nextEmployeeId(tasks: Task[]) {
  const nextNumber =
    tasks.reduce((max, task) => {
      const match = task.employeeId.match(/^EMP(\d+)$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;

  return `EMP${String(nextNumber).padStart(3, "0")}`;
}

function createTask(form: FormState, existingTasks: Task[]): Task {
  const { values } = validateForm(form);

  if (!isPriority(values.priority)) {
    throw new Error("Cannot create task with invalid priority.");
  }

  return {
    id: crypto.randomUUID(),
    employeeId: nextEmployeeId(existingTasks),
    employeeName: values.employeeName,
    taskName: values.taskName,
    priority: values.priority,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [filter, setFilter] = useState<Filter>("ALL");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const storedTasks = window.localStorage.getItem(storageKey);
    if (storedTasks) {
      try {
        const parsed = JSON.parse(storedTasks) as Task[];
        if (Array.isArray(parsed)) {
          setTasks(parsed);
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(storageKey, JSON.stringify(tasks));
    }
  }, [loaded, tasks]);

  const counts = useMemo(
    () => ({
      total: tasks.length,
      pending: tasks.filter((task) => task.status === "PENDING").length,
      completed: tasks.filter((task) => task.status === "COMPLETED").length,
    }),
    [tasks],
  );

  const filteredTasks = useMemo(() => {
    if (filter === "ALL") {
      return tasks;
    }

    return tasks.filter((task) => task.status === filter);
  }, [filter, tasks]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = validateForm(form);
    if (Object.keys(result.errors).length > 0) {
      setErrors(result.errors);
      return;
    }

    setTasks((current) => [createTask(form, current), ...current]);
    setForm(initialForm);
    setErrors({});
  }

  function markCompleted(taskId: string) {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId || task.status === "COMPLETED") {
          return task;
        }

        return { ...task, status: "COMPLETED" };
      }),
    );
  }

  function deleteTask(taskId: string) {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  }

  return (
    <main className="page-shell">
      <section className="heading">
        <div>
          <p className="eyebrow">Employee Task Tracker</p>
          <h1>Task dashboard</h1>
        </div>
        <div className="summary-grid" aria-label="Task summary">
          <SummaryCard label="Total Tasks" value={counts.total} />
          <SummaryCard label="Pending" value={counts.pending} />
          <SummaryCard label="Completed" value={counts.completed} />
        </div>
      </section>

      <section className="workspace">
        <form className="task-form" onSubmit={handleSubmit} noValidate>
          <h2>Create task</h2>
          <Field
            error={errors.employeeName}
            id="employeeName"
            label="Employee Name"
          >
            <input
              id="employeeName"
              name="employeeName"
              onChange={(event) => updateField("employeeName", event.target.value)}
              placeholder="e.g. Priya Sharma"
              value={form.employeeName}
            />
          </Field>

          <Field error={errors.taskName} id="taskName" label="Task Name">
            <input
              id="taskName"
              name="taskName"
              onChange={(event) => updateField("taskName", event.target.value)}
              placeholder="e.g. Prepare weekly report"
              value={form.taskName}
            />
          </Field>

          <Field error={errors.priority} id="priority" label="Priority">
            <select
              id="priority"
              name="priority"
              onChange={(event) => updateField("priority", event.target.value as Priority)}
              value={form.priority}
            >
              <option value="">Select priority</option>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </Field>

          <button className="primary-button" type="submit">
            Add Task
          </button>
        </form>

        <section className="task-panel" aria-labelledby="task-list-title">
          <div className="panel-header">
            <h2 id="task-list-title">Tasks</h2>
            <div className="filters" aria-label="Filter tasks">
              {(["ALL", "PENDING", "COMPLETED"] as Filter[]).map((item) => (
                <button
                  aria-pressed={filter === item}
                  className={filter === item ? "filter active" : "filter"}
                  key={item}
                  onClick={() => setFilter(item)}
                  type="button"
                >
                  {item === "ALL" ? "All" : titleCase(item)}
                </button>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Employee Name</th>
                  <th>Task Name</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id}>
                    <td className="mono">{task.employeeId}</td>
                    <td>{task.employeeName}</td>
                    <td>{task.taskName}</td>
                    <td>
                      <span className={`badge priority-${task.priority.toLowerCase()}`}>
                        {titleCase(task.priority)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge status-${task.status.toLowerCase()}`}>
                        {titleCase(task.status)}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          disabled={task.status === "COMPLETED"}
                          onClick={() => markCompleted(task.id)}
                          type="button"
                        >
                          Mark Completed
                        </button>
                        <button
                          className="danger"
                          onClick={() => deleteTask(task.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTasks.length === 0 ? (
            <p className="empty-state">No tasks match the selected filter.</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Field({
  children,
  error,
  id,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  id: string;
  label: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
