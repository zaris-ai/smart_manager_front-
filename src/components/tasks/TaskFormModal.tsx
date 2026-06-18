'use client';

import React, { useState } from 'react';
import TaskResponsibilityMatrix from './TaskResponsibilityMatrix';
import { ProjectTask, TaskResponsibility } from '@/types/project-task';

type User = {
  _id: string;
  fullName: string;
};

type Props = {
  users: User[];
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function TaskFormModal({
  users,
  projectId,
  onClose,
  onSuccess,
}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [responsibilities, setResponsibilities] = useState<
    TaskResponsibility[]
  >([
    {
      userId: '',
      role: 'IMPLEMENTER',
      responsibilityType: 'primary',
      order: 1,
    },
  ]);

  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);

    try {
      const payload: ProjectTask = {
        projectId,
        title,
        description,
        responsibilities: responsibilities.filter((r) => r.userId),
      };

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to create task');
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error creating task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-[720px] rounded-lg p-5">
        <h2 className="text-xl font-bold mb-4">Create Task</h2>

        {/* TITLE */}
        <input
          className="w-full border p-2 rounded mb-3"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* DESCRIPTION */}
        <textarea
          className="w-full border p-2 rounded mb-3"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* RESPONSIBILITIES */}
        <TaskResponsibilityMatrix
          users={users}
          value={responsibilities}
          onChange={setResponsibilities}
        />

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            className="px-4 py-2 border rounded"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="px-4 py-2 bg-black text-white rounded"
            onClick={submit}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}