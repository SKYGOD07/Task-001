"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";

type Priority = "LOW" | "MEDIUM" | "HIGH";
type Status = "PENDING" | "COMPLETED";
type Filter = "ALL" | Status;

type Task = {
  id: string;
  employee_id: string;
  employee_name: string;
  task_name: string;
  priority: Priority;
  status: Status;
  created_at: string;
};

type FormState = {
  employee_name: string;
  task_name: string;
  priority: Priority | "";
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH"];

const initialForm: FormState = {
  employee_name: "",
  task_name: "",
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
  const employee_name = normalizeText(form.employee_name);
  const task_name = normalizeText(form.task_name);

  if (!employee_name) {
    errors.employee_name = "Employee name is required.";
  }

  if (!task_name) {
    errors.task_name = "Task name is required.";
  }

  if (!form.priority || !isPriority(form.priority)) {
    errors.priority = "Select a valid priority.";
  }

  return {
    errors,
    values: {
      employee_name,
      task_name,
      priority: form.priority,
    },
  };
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [filter, setFilter] = useState<Filter>("ALL");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const loaderRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const heroVisualRef = useRef<HTMLDivElement>(null);

  // Fetch tasks from API
  useEffect(() => {
    async function fetchTasks() {
      try {
        const response = await fetch("/api/tasks");
        const data = await response.json();
        if (response.ok && Array.isArray(data.tasks)) {
          setTasks(data.tasks);
        } else {
          console.error("Failed to fetch tasks:", data.error);
        }
      } catch (err) {
        console.error("Error fetching tasks:", err);
      }
    }
    fetchTasks();
  }, []);

  useEffect(() => {
    if (!loaderRef.current || !logoRef.current) {
      return;
    }

    const timeline = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: () => setLoading(false),
    });

    timeline
      .fromTo(
        logoRef.current,
        { scale: 0.82, rotate: -14, opacity: 0 },
        { scale: 1, rotate: 0, opacity: 1, duration: 0.55 },
      )
      .to(logoRef.current, {
        scale: 1.08,
        yoyo: true,
        repeat: 1,
        duration: 0.25,
      })
      .to(loaderRef.current, {
        opacity: 0,
        pointerEvents: "none",
        duration: 0.45,
        delay: 0.25,
      });

    return () => {
      timeline.kill();
    };
  }, []);

  useEffect(() => {
    if (!heroVisualRef.current || loading) {
      return;
    }

    const cards = heroVisualRef.current.querySelectorAll(".hero-mini-card");
    const context = gsap.context(() => {
      gsap.fromTo(
        cards,
        { y: 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          stagger: 0.12,
          ease: "back.out(1.5)",
        },
      );
    }, heroVisualRef);

    return () => context.revert();
  }, [loading]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = validateForm(form);
    if (Object.keys(result.errors).length > 0) {
      setErrors(result.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.values),
      });
      const data = await response.json();
      if (response.ok && data.task) {
        setTasks((current) => [data.task, ...current]);
        setForm(initialForm);
        setErrors({});
      } else {
        alert("Error creating task: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function markCompleted(taskId: string) {
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      const data = await response.json();
      if (response.ok && data.task) {
        setTasks((current) =>
          current.map((task) => (task.id === taskId ? data.task : task))
        );
      } else {
        alert("Error updating task: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update task");
    }
  }

  async function deleteTask(taskId: string) {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setTasks((current) => current.filter((task) => task.id !== taskId));
      } else {
        const data = await response.json();
        alert("Error deleting task: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete task");
    }
  }

  return (
    <>
      {loading ? (
        <div className="loading-screen" ref={loaderRef}>
          <img
            alt="Employee Task Tracker logo"
            className="loading-logo"
            ref={logoRef}
            src="/task-logo.png"
          />
          <p>Preparing dashboard</p>
        </div>
      ) : null}

      <main className="page-shell">
        <header className="topbar">
          <a className="brand" href="#dashboard" aria-label="Employee Task Tracker home">
            <img alt="" src="/task-logo.png" />
            <span>NeraVoult Tasks</span>
          </a>
          <button
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            className="theme-toggle"
            onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
            type="button"
          >
            <span className="toggle-track">
              <span className="toggle-thumb" />
            </span>
            {theme === "light" ? "Dark" : "Light"}
          </button>
        </header>

        <section className="hero">
          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <p className="eyebrow">Employee Task Tracker</p>
            <h1>Plan, prioritize, and close work without losing task state.</h1>
            <p className="hero-text">
              This project manages employee tasks with validation, generated employee
              IDs, status rules, live dashboard counts, filters, and local persistence.
            </p>
            <div className="hero-actions">
              <a className="primary-link" href="#dashboard">
                Open Dashboard
              </a>
              <span>{counts.pending} pending tasks</span>
            </div>
          </motion.div>

          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
            ref={heroVisualRef}
          >
            <div className="hero-logo-ring">
              <img alt="Task tracker logo" src="/task-logo.png" />
            </div>
            <div className="hero-mini-card high">
              <span>High Priority</span>
              <strong>{tasks.filter((task) => task.priority === "HIGH").length}</strong>
            </div>
            <div className="hero-mini-card pending">
              <span>Pending</span>
              <strong>{counts.pending}</strong>
            </div>
            <div className="hero-mini-card done">
              <span>Completed</span>
              <strong>{counts.completed}</strong>
            </div>
          </motion.div>
        </section>

        <section className="heading" id="dashboard">
          <div>
            <p className="eyebrow">Live Overview</p>
            <h2>Task dashboard</h2>
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
              error={errors.employee_name}
              id="employee_name"
              label="Employee Name"
            >
              <input
                id="employee_name"
                name="employee_name"
                onChange={(event) => updateField("employee_name", event.target.value)}
                placeholder="e.g. Priya Sharma"
                value={form.employee_name}
                disabled={isSubmitting}
              />
            </Field>

            <Field error={errors.task_name} id="task_name" label="Task Name">
              <input
                id="task_name"
                name="task_name"
                onChange={(event) => updateField("task_name", event.target.value)}
                placeholder="e.g. Prepare weekly report"
                value={form.task_name}
                disabled={isSubmitting}
              />
            </Field>

            <Field error={errors.priority} id="priority" label="Priority">
              <select
                id="priority"
                name="priority"
                onChange={(event) => updateField("priority", event.target.value as Priority)}
                value={form.priority}
                disabled={isSubmitting}
              >
                <option value="">Select priority</option>
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </Field>

            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Task"}
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
                      <td className="mono">{task.employee_id}</td>
                      <td>{task.employee_name}</td>
                      <td>{task.task_name}</td>
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
    </>
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
