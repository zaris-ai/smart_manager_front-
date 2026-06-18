'use client';

import React from 'react';
import { TaskResponsibility, TaskRole } from '@/types/project-task';

type User = {
  _id: string;
  fullName: string;
};

type Props = {
  users: User[];
  value: TaskResponsibility[];
  onChange: (value: TaskResponsibility[]) => void;
};

const ROLE_OPTIONS: TaskRole[] = [
  'NEGOTIATOR',
  'IMPLEMENTER',
  'REVIEWER',
  'APPROVER',
];

export default function TaskResponsibilityMatrix({
  users,
  value,
  onChange,
}: Props) {
  const updateRow = (index: number, patch: Partial<TaskResponsibility>) => {
    const next = [...value];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const addRow = () => {
    onChange([
      ...value,
      {
        userId: '',
        role: 'IMPLEMENTER',
        responsibilityType: 'primary',
        order: value.length + 1,
      },
    ]);
  };

  const removeRow = (index: number) => {
    const next = value.filter((_, i) => i !== index).map((r, i) => ({
      ...r,
      order: i + 1,
    }));

    onChange(next);
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">Task Workflow</h3>

        <button
          type="button"
          onClick={addRow}
          className="px-3 py-1 bg-black text-white rounded"
        >
          Add Step
        </button>
      </div>

      <div className="space-y-2">
        {value.map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-4 gap-2 items-center border rounded p-2"
          >
            {/* USER */}
            <select
              className="border p-2 rounded"
              value={row.userId}
              onChange={(e) =>
                updateRow(index, { userId: e.target.value })
              }
            >
              <option value="">Select user</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.fullName}
                </option>
              ))}
            </select>

            {/* ROLE */}
            <select
              className="border p-2 rounded"
              value={row.role}
              onChange={(e) =>
                updateRow(index, { role: e.target.value as TaskRole })
              }
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {/* ORDER */}
            <input
              type="number"
              className="border p-2 rounded"
              value={row.order}
              onChange={(e) =>
                updateRow(index, { order: Number(e.target.value) })
              }
            />

            {/* REMOVE */}
            <button
              type="button"
              className="text-red-600"
              onClick={() => removeRow(index)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}